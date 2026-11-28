import {assertStructuredOutput} from './structuredOutput.js';
import {ReviewInsightService} from '../services/reviewInsightService.js';
import {persistentReviewsEnabled,ReviewProcessingService} from '../services/reviewProcessingService.js';
import {renderScopedReview,reviewPreferenceScore,validReviewPreference} from './scopedReviewAdvice.js';
import {searchHotels,validateHotelSearch,type HotelSearch} from '../hotels/commercialSearch.js';
import {HotelReadService} from '../services/hotelReadService.js';
import {PostgresHotelStore} from '../hotels/postgresStore.js';
import {AgentHotelReadAdapter} from './hotelReadAdapter.js';
import {normalizeStayRequest,objectOnly,uuid} from '../hotels/validation.js';
import {HttpError} from '../utils/httpError.js';
import {withinDeadline} from './provider.js';
import type {AuthUser} from '../types/auth.js';
import type {StayRequest} from '../hotels/contracts.js';

const ID={type:'string',pattern:'^[0-9a-fA-F]{8}(?:-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$'};
const STAY={type:'object',additionalProperties:false,required:['checkIn','checkOut','rooms'],properties:{checkIn:{type:'string'},checkOut:{type:'string'},promotionId:ID,rooms:{type:'array',minItems:1,maxItems:10,items:{type:'object',additionalProperties:false,required:['adults','childAges'],properties:{adults:{type:'integer',minimum:1},childAges:{type:'array',items:{type:'integer',minimum:0,maximum:17}}}}}}};
const SEARCH_OUTPUT={type:'object',additionalProperties:false,required:['contract','tool','criteria','items','total','asOf','validUntil','sourceVersion','scope','mutationAuthority','bookingAuthority'],properties:{contract:{const:'AGENT_NATIVE_HOTEL_READ_V1'},tool:{const:'native_hotel_search'},criteria:{type:'object'},items:{type:'array',maxItems:5,items:{type:'object'}},total:{type:'integer',minimum:0},asOf:{type:'string'},validUntil:{type:'string'},sourceVersion:{type:'string'},scope:{enum:['ISOLATED_SYNTHETIC_PREVIEW','PUBLIC']},mutationAuthority:{const:false},bookingAuthority:{const:false}}};
const DETAIL_OUTPUT={type:'object',additionalProperties:false,required:['status','executed','placeId','rooms','sourceVersion','asOf','validUntil','mutationAuthority','bookingAuthority'],properties:{status:{const:'READ'},executed:{const:true},placeId:ID,name:{type:'string'},dataClass:{enum:['DEMO','AUTHORIZED_BUSINESS_SNAPSHOT']},address:{type:['object','null']},services:{type:'array'},propertyAmenities:{type:'array'},rooms:{type:'array'},stay:{type:'object',additionalProperties:false,required:['checkIn','checkOut','rooms'],properties:{checkIn:{type:'string'},checkOut:{type:'string'},rooms:{type:'array',items:{type:'object',additionalProperties:false,required:['adults','childAges'],properties:{adults:{type:'integer'},childAges:{type:'array',items:{type:'integer'}}}}}}},reviewEvidence:{type:['object','null']},roomReviewEvidence:{type:'object'},asOf:{type:'string'},validUntil:{type:'string'},sourceVersion:{type:'string'},mutationAuthority:{const:false},bookingAuthority:{const:false},caveats:{type:'array'}}};
const QUOTE_OUTPUT={type:'object',additionalProperties:false,required:['contract','tool','placeId','roomTypeId','ratePlanId','offer','asOf','validUntil','sourceVersion','mutationAuthority','bookingAuthority'],properties:{contract:{const:'AGENT_NATIVE_HOTEL_QUOTE_V1'},tool:{const:'native_hotel_quote'},placeId:ID,roomTypeId:ID,ratePlanId:ID,offer:{type:'object'},dataClass:{type:'string'},sourceVersion:{type:'string'},asOf:{type:'string'},validUntil:{type:'string'},mutationAuthority:{const:false},bookingAuthority:{const:false}}};
const searchProperties:any={};
for(const k of ['locationId','streetName','nameOrAddress','accommodationType','checkIn','checkOut','view','sort','priceBasis'])searchProperties[k]={type:'string'};
for(const k of ['minPrice','maxPrice','bedrooms','bathrooms','page','limit'])searchProperties[k]={type:'integer'};
for(const k of ['rooms','propertyAmenities','roomAmenities'])searchProperties[k]={type:'array'};
searchProperties.rooms=STAY.properties.rooms;
for(const k of ['promotion','breakfast','refundable'])searchProperties[k]={type:'boolean'};
export const NATIVE_HOTEL_TOOLS={
 native_hotel_search:{input:{type:'object',additionalProperties:false,properties:searchProperties},output:SEARCH_OUTPUT,readOnly:true},
 native_hotel_detail:{input:{type:'object',additionalProperties:false,required:['placeId'],properties:{placeId:ID,stay:STAY}},output:DETAIL_OUTPUT,readOnly:true},
 native_hotel_quote:{input:{type:'object',additionalProperties:false,required:['placeId','roomTypeId','ratePlanId','stay'],properties:{placeId:ID,roomTypeId:ID,ratePlanId:ID,stay:STAY}},output:QUOTE_OUTPUT,readOnly:true}
} as const;
type HotelSearchScope={placeIds?:readonly string[];tripLimit?:number;includeReviews?:boolean};

/** Same domain readers as /api/hotels. No cache, SQL interpreter or mutation port. */
export class NativeHotelTools {
 readonly registry=NATIVE_HOTEL_TOOLS;
 constructor(private readonly allowSynthetic=false,private readonly clock=Date.now){}
 private authorize(user:AuthUser){if(!user?.id||!Array.isArray(user.roles)||!user.roles.includes('CUSTOMER'))throw new HttpError(403,'Cần tài khoản khách hàng.','AGENT_NATIVE_HOTEL_FORBIDDEN');}
 async search(user:AuthUser,criteria:HotelSearch,preferences:string[]=[],scope:HotelSearchScope={}){
  const {placeIds,tripLimit,includeReviews=true}=scope;
  if(preferences.some(p=>!validReviewPreference(p))||preferences.length>11)throw new HttpError(400,'Tiêu chí review chưa hợp lệ.','REVIEW_PREFERENCE_INVALID');
  this.authorize(user);assertStructuredOutput(NATIVE_HOTEL_TOOLS.native_hotel_search.input,criteria);validateHotelSearch(criteria);const q={...criteria,limit:Math.min(criteria.limit??5,5)};
  if(q.checkIn&&!q.rooms?.length)throw new HttpError(400,'Cần cơ cấu khách mỗi phòng để báo giá.','AGENT_NATIVE_STAY_REQUIRED');
  if(placeIds){if(!placeIds.length||placeIds.length>5)throw new HttpError(400,'Chọn tối đa năm khách sạn để đối chiếu.','AGENT_NATIVE_HOTEL_SCOPE');placeIds.forEach(id=>uuid(id));}
  const effective=q.checkIn&&tripLimit!==undefined?{...q,maxPrice:Math.min(tripLimit,q.maxPrice??Infinity),priceBasis:'STAY_TOTAL' as const}:q;
  const d=await withinDeadline(()=>searchHotels(effective,this.allowSynthetic,placeIds),7000);this.fresh(d);
  const items=await withinDeadline(()=>Promise.all(d.items.map(async p=>({placeId:p.identity.id,name:p.identity.name,address:p.address,propertyAmenities:p.identity.amenities,services:p.profile.services,isDemo:p.isDemo,selected:p.selected,availability:p.availability,priceBasis:p.priceBasis,asOf:p.asOf,validUntil:p.validUntil,sourceVersion:p.sourceVersion,provenance:p.provenance,caveats:p.caveats,...(includeReviews&&persistentReviewsEnabled()?{reviewEvidence:await ReviewInsightService.scoped(p.identity.id,p.selected?.room.id)}:{})}))),7000);
  if(preferences.length&&!criteria.sort)items.sort((a,b)=>reviewPreferenceScore(b.reviewEvidence,preferences)-reviewPreferenceScore(a.reviewEvidence,preferences));
  for(const p of items){this.fresh(p);const s=p.selected;if(!s)continue;const {room,rate,quote}=s;if(room.placeId!==p.placeId||quote&&(quote.roomTypeId!==room.id||quote.ratePlanId!==rate.id||quote.placeId!==p.placeId||quote.isDemo!==p.isDemo))throw new HttpError(409,'Room/rate không cùng phạm vi.','AGENT_NATIVE_HOTEL_SCOPE');if(quote&&Date.parse(quote.expiresAt)<=this.clock())throw new HttpError(409,'Báo giá đã hết hạn.','AGENT_NATIVE_QUOTE_EXPIRED');}
  const result={contract:'AGENT_NATIVE_HOTEL_READ_V1' as const,tool:'native_hotel_search' as const,criteria:q,items,total:d.total,asOf:d.asOf,validUntil:d.validUntil,sourceVersion:d.sourceVersion,scope:d.scope,mutationAuthority:false,bookingAuthority:false};assertStructuredOutput(SEARCH_OUTPUT,result);return result;
 }
 async detail(user:AuthUser,input:{placeId:string;stay?:StayRequest},quote=false,compareRooms=false){
  this.authorize(user);assertStructuredOutput(NATIVE_HOTEL_TOOLS.native_hotel_detail.input,input);objectOnly(input,['placeId','stay']);uuid(input.placeId);if(quote&&!input.stay)throw new HttpError(400,'Cần ngày và khách từng phòng.','AGENT_NATIVE_STAY_REQUIRED');
  const stay=input.stay?normalizeStayRequest(input.stay):undefined;
  const result=await withinDeadline(()=>new AgentHotelReadAdapter(new HotelReadService(new PostgresHotelStore(),true,this.allowSynthetic),this.clock,this.allowSynthetic).detail(input.placeId,stay,compareRooms),7000);
  const enriched=result.status==='READ'&&!quote&&persistentReviewsEnabled()
   ?await withinDeadline(async()=>{
     const evidence=await ReviewProcessingService.readRooms(input.placeId,result.rooms.slice(0,10).map(r=>r.id));
     return {...result,reviewEvidence:evidence.hotel,roomReviewEvidence:evidence.rooms};
    },7000)
   :{...result,reviewEvidence:null,roomReviewEvidence:{}};
  if(enriched.status==='READ')assertStructuredOutput(DETAIL_OUTPUT,enriched);
  return enriched;
 }
 async quote(user:AuthUser,input:{placeId:string;roomTypeId:string;ratePlanId:string;stay:StayRequest}){
  this.authorize(user);assertStructuredOutput(NATIVE_HOTEL_TOOLS.native_hotel_quote.input,input);objectOnly(input,['placeId','roomTypeId','ratePlanId','stay']);uuid(input.roomTypeId);uuid(input.ratePlanId);
  const d=await this.detail(user,{placeId:input.placeId,stay:input.stay},true);if(d.status!=='READ')throw new HttpError(503,'Chưa bind reader.','AGENT_NATIVE_UNBOUND');
  const room=d.rooms.find(r=>r.id===input.roomTypeId),offer=room?.offers.find(o=>o.ratePlanId===input.ratePlanId);if(!offer||offer.kind!=='STAY_QUOTE_SNAPSHOT')throw new HttpError(409,'Không có quote hợp lệ cho đúng phòng/gói.','AGENT_NATIVE_QUOTE_UNAVAILABLE');
  const result={contract:'AGENT_NATIVE_HOTEL_QUOTE_V1',tool:'native_hotel_quote',placeId:input.placeId,roomTypeId:room!.id,ratePlanId:input.ratePlanId,offer,dataClass:d.dataClass,sourceVersion:d.sourceVersion,asOf:d.asOf,validUntil:d.validUntil,mutationAuthority:false,bookingAuthority:false};assertStructuredOutput(QUOTE_OUTPUT,result);return result;
 }
 private fresh(d:{asOf:string;validUntil:string;sourceVersion:string}){const now=this.clock(),a=Date.parse(d.asOf),u=Date.parse(d.validUntil);if(!Number.isFinite(a)||!Number.isFinite(u)||a>now||now-a>60000||u<=now||!d.sourceVersion)throw new HttpError(409,'Snapshot đã cũ; cần đọc lại.','AGENT_NATIVE_HOTEL_STALE');}
}
export type NativeHotelSearchResult=Awaited<ReturnType<NativeHotelTools['search']>>;
export type NativeHotelDetailResult=Awaited<ReturnType<NativeHotelTools['detail']>>;
type DetailOffer=Extract<NativeHotelDetailResult,{status:'READ'}>['rooms'][number]['offers'][number];
export function currentDetailQuote(offer:DetailOffer,now:number):offer is Extract<DetailOffer,{kind:'STAY_QUOTE_SNAPSHOT'}>{
 return offer.kind==='STAY_QUOTE_SNAPSHOT'&&Date.parse(offer.expiresAt)>now;
}
export function currentHotelQuote(d:NativeHotelSearchResult,p:NativeHotelSearchResult['items'][number],now=Date.now()){
 const q=p.selected?.quote,rooms=d.criteria.rooms;
 if(!q||!d.criteria.checkIn||!d.criteria.checkOut||!rooms?.length||
    q.checkIn!==undefined&&q.checkIn!==d.criteria.checkIn||q.checkOut!==undefined&&q.checkOut!==d.criteria.checkOut||
    q.roomCount!==rooms.length||q.adults!==undefined&&q.adults!==rooms.reduce((n,r)=>n+r.adults,0)||
    q.children!==undefined&&q.children!==rooms.reduce((n,r)=>n+r.childAges.length,0)||
    !(Date.parse(q.expiresAt)>now)||!(Date.parse(p.validUntil)>now)||d.validUntil!==undefined&&!(Date.parse(d.validUntil)>now))return;
 return q;
}
/** Quotes are rendered only from the already validated HotelReadService snapshot. */
export function renderNativeHotelDetailPrices(d:NativeHotelDetailResult,roomTypeId?:string,now=Date.now()):string{
 if(d.status!=='READ')return '';
 if(!d.stay||!Number.isFinite(Date.parse(d.validUntil))||Date.parse(d.validUntil)<=now)return 'Chưa có báo giá kỳ lưu trú còn hiệu lực với ngày và cơ cấu khách đã xác minh.';
 const rooms=roomTypeId?d.rooms.filter(r=>r.id===roomTypeId):d.rooms;
 const guests=d.stay.rooms.map((guest,i)=>
  'phòng '+(i+1)+': '+guest.adults+' người lớn, '+guest.childAges.length+' trẻ'+
  (guest.childAges.length?' '+guest.childAges.map(age=>age+' tuổi').join(', '):'')).join('; ');
 const lines=rooms.flatMap(r=>r.offers.filter(o=>currentDetailQuote(o,now)).map(o=>{
  const discount=o.promotionId?'Ưu đãi đã áp dụng'+(o.promotionName?' ('+o.promotionName+')':'')+': giảm '+o.discountVnd.toLocaleString('vi-VN')+' VND. ':'';
  return r.name+': tổng tiền kỳ lưu trú '+o.totalStayVnd.toLocaleString('vi-VN')+' VND cho '+o.nights+' đêm / '+o.roomCount+' phòng ('+
   d.stay!.checkIn+' đến '+d.stay!.checkOut+'; '+guests+'). '+discount+
   'Tồn phòng snapshot tối thiểu '+o.minimumAvailableRooms+' phòng; chưa giữ phòng. Báo giá chỉ có hiệu lực đến '+o.expiresAt+'.';
 }));
 return lines.length?lines.join('\n')+`\nĐây là tổng tiền kỳ lưu trú, không phải giá mỗi đêm. Nguồn HotelReadService/pricing TravelGo, đọc lúc ${d.asOf}. ${d.dataClass==='DEMO'?'SYNTHETIC, không phải giá kinh doanh thật. ':''}Giá và tồn phòng cần kiểm tra lại khi đặt; chưa tạo Booking.`:'Chưa có báo giá kỳ lưu trú đã xác minh cho hạng phòng đang hỏi.';
}
export function renderNativeHotel(d:NativeHotelSearchResult,now=Date.now(),priceOnly=false):string{
 if(!d.items.length)return 'Không có phòng phù hợp với toàn bộ điều kiện hiện tại. Mình giữ nguyên ngân sách, địa điểm và tiện nghi; chưa tự nới điều kiện.';
 return d.items.map((p,i)=>{
  const s=p.selected,q=s?.quote,quoteCurrent=!!currentHotelQuote(d,p,now);
  const guests=d.criteria.rooms?.map((room,index)=>`phòng ${index+1}: ${room.adults} người lớn, ${room.childAges.length} trẻ${room.childAges.length?' '+room.childAges.map(age=>age+' tuổi').join(', '):''}`).join('; ');
  const stay=q&&quoteCurrent?` (${d.criteria.checkIn} đến ${d.criteria.checkOut}; ${guests||'cơ cấu khách chưa xác minh'})`:'';
  const price=quoteCurrent&&q?`Tổng kỳ lưu trú ${q.totalVnd.toLocaleString('vi-VN')} VND / ${q.nights} đêm / ${q.roomCount} phòng${stay}. Đây là tổng tiền kỳ lưu trú, không phải giá mỗi đêm. Thuế ${q.taxVnd.toLocaleString('vi-VN')}, phí ${q.feesVnd.toLocaleString('vi-VN')} VND; giảm ${q.discountVnd.toLocaleString('vi-VN')} VND. Tồn phòng snapshot tối thiểu ${q.minimumAvailableRooms} phòng; chỉ hợp lệ đến ${q.expiresAt}.`:q?'Báo giá kỳ lưu trú vừa hết hiệu lực; cần tra lại.':s?.referenceVnd!==null&&s?.referenceVnd!==undefined?`Giá tham khảo ${s.referenceVnd.toLocaleString('vi-VN')} VND/phòng/đêm, chưa có ngày, chưa xác nhận còn phòng.`:'Giá và tồn phòng chưa xác minh.';
  if(priceOnly)return p.name+(s?' · '+s.room.name:'')+(p.isDemo?' · SYNTHETIC':'')+'\n'+price+' Nguồn HotelReadService, đọc lúc '+p.asOf+'.';
  return `${i+1}. ${p.name}${p.isDemo?' — SYNTHETIC, không phải cơ sở/giá kinh doanh thật':''}\n${p.address?.fullAddress||'Địa chỉ chưa xác minh'}.\n${s?'Hạng phòng: '+s.room.name+'; hướng '+s.room.view+'; sức chứa '+(s.room.maxOccupancy??'chưa rõ')+' khách; tiện nghi phòng: '+(s.room.amenities.join(', ')||'chưa có dữ liệu')+'.'+(p.propertyAmenities?.length?' Tiện nghi khách sạn: '+p.propertyAmenities.join(', ')+'.':''):'Thông tin hạng phòng chưa có.'}\n${price}\n${quoteCurrent&&s?.promotion?'Ưu đãi: '+s.promotion.name+'. ':''}Nguồn: HotelReadService/pricing TravelGo, đọc lúc ${p.asOf}. Không giữ phòng hoặc tạo Booking; phải kiểm tra lại khi đặt.`;
 }).join('\n\n')+(priceOnly?'':'\n'+d.items.map(p=>p.name+': '+(renderScopedReview(p.reviewEvidence,p.selected?.room.name)||'Chưa có dữ liệu đánh giá được phép dùng.')).join('\n'));
}
