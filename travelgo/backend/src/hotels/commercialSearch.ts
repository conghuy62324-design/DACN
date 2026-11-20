import { Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { query, hotelSnapshots } from './postgresStore.js';
import { HotelReadService, type HotelReadSnapshot } from '../services/hotelReadService.js';
import { hotelIdentitySearchQuery } from './readModel.js';
import { hotelError, int, normalizeStayRequest, objectOnly, text } from './validation.js';
import { eligiblePromotion, hotelSourceVersion, quoteHotelStay } from './pricing.js';
import { ROOM_AMENITIES, ROOM_VIEWS, type StayRequest, type HotelQuote } from './contracts.js';
import { resolveLocation } from '../geography/vietnam.js';

export type HotelSearch = {
  locationId?: string; nameOrAddress?: string; streetName?: string; wardOrCommune?: string; accommodationType?: string;
  checkIn?: string; checkOut?: string; rooms?: StayRequest['rooms'];
  minPrice?: number; maxPrice?: number; priceBasis?: 'STAY_TOTAL'; stars?: number; minRating?: number;
  propertyAmenities?: string[]; roomAmenities?: string[]; view?: string; bedrooms?: number; bathrooms?: number;
  breakfast?: boolean; refundable?: boolean; promotion?: boolean;
  sort?: 'relevance'|'price_asc'|'price_desc'|'rating'|'recent'; page?: number; limit?: number;
};
const keys = ['locationId','nameOrAddress','streetName','wardOrCommune','accommodationType','checkIn','checkOut','rooms','minPrice','maxPrice','priceBasis','stars','minRating','propertyAmenities','roomAmenities','view','bedrooms','bathrooms','breakfast','refundable','promotion','sort','page','limit'] as const;
/** HTTP query parsing is explicit; typed domain validation never coerces invalid values. */
export function parseHotelSearch(raw: any): HotelSearch {
  objectOnly(raw, keys); const q: any = { ...raw };
  for (const [k,v] of Object.entries(q)) if (typeof v !== 'string') hotelError('HOTEL_QUERY_TYPE','Mỗi tiêu chí chỉ nhận một giá trị.');
  for (const k of ['minPrice','maxPrice','stars','minRating','bedrooms','bathrooms','page','limit']) if(q[k]!==undefined){if(!/^\d+(?:\.\d+)?$/.test(q[k]))hotelError('HOTEL_QUERY_NUMBER','Tiêu chí số không hợp lệ.');q[k]=Number(q[k]);}
  for(const k of ['breakfast','refundable','promotion'])if(q[k]!==undefined){if(!['true','false'].includes(q[k]))hotelError('HOTEL_QUERY_BOOLEAN','Tiêu chí lựa chọn không hợp lệ.');q[k]=q[k]==='true';}
  for(const k of ['rooms','propertyAmenities','roomAmenities'])if(q[k]!==undefined){try{q[k]=JSON.parse(q[k]);}catch{hotelError('HOTEL_QUERY_JSON','Tiêu chí có cấu trúc không hợp lệ.');}}
  if(q.sort==='name')q.sort='relevance'; // Phase-B API compatibility, identical stable name ordering.
  return validateHotelSearch(q);
}
export function validateHotelSearch(q: HotelSearch): HotelSearch {
  objectOnly(q, keys);
  hotelIdentitySearchQuery({locationId:q.locationId,streetName:q.streetName,wardOrCommune:q.wardOrCommune,nameOrAddress:q.nameOrAddress,accommodationType:q.accommodationType});
  for(const k of ['checkIn','checkOut','priceBasis','view','sort'] as const)if(q[k]!==undefined)text(q[k],80);
  for(const k of ['minPrice','maxPrice'] as const)if(q[k]!==undefined)int(q[k],0,9999999999999,k);
  if(q.minPrice!==undefined&&q.maxPrice!==undefined&&q.minPrice>q.maxPrice)hotelError('HOTEL_PRICE_RANGE','Giá tối thiểu không được lớn hơn tối đa.');
  if(q.priceBasis!==undefined&&q.priceBasis!=='STAY_TOTAL')hotelError('HOTEL_PRICE_BASIS','Khoảng giá được tính theo tổng kỳ lưu trú.');
  for(const k of ['breakfast','refundable','promotion'] as const)if(q[k]!==undefined&&typeof q[k]!=='boolean')hotelError('HOTEL_QUERY_BOOLEAN','Tiêu chí cần là boolean.');
  if(q.stars!==undefined)int(q.stars,1,5,'Hạng sao');
  if(q.minRating!==undefined&&(typeof q.minRating!=='number'||!Number.isFinite(q.minRating)||q.minRating<0||q.minRating>5))hotelError('HOTEL_RATING','Điểm đánh giá nằm trong thang 0–5.');
  for(const k of ['bedrooms','bathrooms'] as const)if(q[k]!==undefined)int(q[k],0,20,k);
  int(q.page??1,1,10000,'Trang');int(q.limit??12,1,24,'Số kết quả');
  if(q.view!==undefined&&!ROOM_VIEWS.includes(q.view as any))hotelError('HOTEL_VIEW','Hướng nhìn không được hỗ trợ.');
  for(const k of ['propertyAmenities','roomAmenities'] as const)if(q[k]!==undefined){if(!Array.isArray(q[k])||q[k]!.length>15||q[k]!.some(x=>typeof x!=='string'||!x||x.length>60))hotelError('HOTEL_AMENITIES','Tiện nghi không hợp lệ.');if(k==='roomAmenities'&&q[k]!.some(x=>!ROOM_AMENITIES.includes(x as any)))hotelError('HOTEL_AMENITIES','Tiện nghi phòng chưa được hỗ trợ.');}
  if(q.sort!==undefined&&!['relevance','price_asc','price_desc','rating','recent'].includes(q.sort))hotelError('HOTEL_SORT','Cách sắp xếp không được hỗ trợ.');
  if(!!q.checkIn!==!!q.checkOut)hotelError('HOTEL_SEARCH_DATES','Chọn đủ ngày nhận và trả phòng.');
  if(q.rooms)normalizeStayRequest({checkIn:q.checkIn||'2099-01-01',checkOut:q.checkOut||'2099-01-02',rooms:q.rooms});
  if(q.checkIn)normalizeStayRequest({checkIn:q.checkIn,checkOut:q.checkOut,rooms:q.rooms||[{adults:2,childAges:[]}]});
  if(!q.checkIn&&(q.minPrice!==undefined||q.maxPrice!==undefined||q.sort?.startsWith('price')))hotelError('HOTEL_PRICE_REQUIRES_DATES','Chọn ngày để so sánh tổng giá cùng kỳ lưu trú.');
  return q;
}
export function roomMatches(room: HotelReadSnapshot['rooms'][number], q: HotelSearch) {
  return room.status==='ACTIVE'&&(!q.view||room.view===q.view)&&(q.bedrooms===undefined||room.bedrooms!==null&&room.bedrooms>=q.bedrooms)&&(q.bathrooms===undefined||room.bathrooms!==null&&room.bathrooms>=q.bathrooms)&&
    (q.roomAmenities||[]).every(a=>room.amenities.includes(a as any))&&(q.rooms||[]).every(r=>r.adults<=room.maxAdults&&r.childAges.length<=room.maxChildren&&r.adults+r.childAges.length<=room.maxOccupancy);
}
export async function projectHotelSearch(s: HotelReadSnapshot, q: HotelSearch, review: {count:number;rating:number|null}, allowSynthetic: boolean) {
  if(!s.address||s.address.latitude===null||s.address.longitude===null)return null;
  if(q.stars!==undefined&&(!s.profile.starVerified||s.profile.starRating!==q.stars))return null;
  if(q.minRating!==undefined&&(!review.count||review.rating===null||review.rating<q.minRating))return null;
  if(!(q.propertyAmenities||[]).every(a=>s.identity.amenities.includes(a)))return null;
  if(s.rates.filter(r=>r.status==='ACTIVE').length>80)hotelError('HOTEL_SEARCH_COMPLEXITY_LIMIT','Quá nhiều gói giá cho một khách sạn.',422);
  const stay=q.checkIn?normalizeStayRequest({checkIn:q.checkIn,checkOut:q.checkOut,rooms:q.rooms||[{adults:2,childAges:[]}]}):undefined;
  const detail=await new HotelReadService({snapshot:async()=>s},true,allowSynthetic).detail(s.identity.id,stay);
  if(!detail.hotelMedia.length)return null;
  const matches: {room:any;rate:any;quote:HotelQuote|null;reference:number|null;promotion:any}[]=[];
  let evaluations=0;
  for(const room of s.rooms.filter(r=>roomMatches(r,q)))for(const rate of s.rates.filter(r=>r.roomTypeId===room.id&&r.status==='ACTIVE')){
    if(++evaluations>80)hotelError('HOTEL_SEARCH_COMPLEXITY_LIMIT','Quá nhiều gói giá; cần thu hẹp tìm kiếm.',422);
    if(q.breakfast!==undefined&&(rate.mealPlan==='BREAKFAST_INCLUDED')!==q.breakfast)continue;
    if(q.refundable!==undefined&&(rate.cancellation.kind==='FREE_UNTIL_CUTOFF')!==q.refundable)continue;
    const now=Date.parse(s.asOf),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(now));
    const promos=detail.promotions.filter(p=>(!p.roomTypeId||p.roomTypeId===room.id)&&(!p.ratePlanId||p.ratePlanId===rate.id));
    if(promos.length>8)hotelError('HOTEL_SEARCH_COMPLEXITY_LIMIT','Quá nhiều ưu đãi cho một gói giá.',422);
    if(!stay){if(!(rate.validFrom<=today&&today<rate.validUntil))continue;if(q.promotion&&!promos.length)continue;matches.push({room,rate,quote:null,reference:rate.baseAmountVnd,promotion:promos[0]||null});continue;}
    const input={authority:s.authority,room,rate,nightly:s.nightly.filter(n=>n.ratePlanId===rate.id),inventory:s.inventory.filter(n=>n.roomTypeId===room.id),promotions:s.promotions,request:stay,asOf:s.asOf};
    const dates=Array.from({length:(Date.parse(stay.checkOut)-Date.parse(stay.checkIn))/86400000},(_,i)=>new Date(Date.parse(stay.checkIn)+i*86400000).toISOString().slice(0,10));
    const eligible=promos.filter(p=>eligiblePromotion(p,input,dates));
    for(const p of [null,...eligible]){if(q.promotion&&!p)continue;try{const quote=quoteHotelStay({...input,request:{...stay,...(p?{promotionId:p.id}:{})}});if(q.minPrice!==undefined&&quote.totalVnd<q.minPrice||q.maxPrice!==undefined&&quote.totalVnd>q.maxPrice)continue;matches.push({room,rate,quote,reference:null,promotion:p});}catch(e:any){if(!e.code?.startsWith('HOTEL_'))throw e;}}
  }
  matches.sort((a,b)=>(a.quote?.totalVnd??a.reference??Infinity)-(b.quote?.totalVnd??b.reference??Infinity)||a.room.id.localeCompare(b.room.id)||a.rate.id.localeCompare(b.rate.id));
  const selected=matches[0];
  const commercialRequired=!!stay||!!q.view||!!q.roomAmenities?.length||q.bedrooms!==undefined||q.bathrooms!==undefined||q.breakfast!==undefined||q.refundable!==undefined||!!q.promotion||!!q.rooms;
  if(!selected&&commercialRequired)return null;
  return {...detail,rooms:undefined,destination:resolveLocation(s.address.tourismDestinationId||s.address.provinceCode),review:{count:review.count,rating:review.count?review.rating:null,source:'PUBLISHED_PLACE_REVIEWS'},selected:selected?{room:selected.room,rate:{id:selected.rate.id,name:selected.rate.name,mealPlan:selected.rate.mealPlan,cancellation:selected.rate.cancellation,tax:selected.rate.tax,fees:selected.rate.fees},quote:selected.quote,referenceVnd:selected.reference,promotion:selected.promotion}:null,promotions:matches.map(m=>m.promotion).filter((p,i,a)=>p&&a.findIndex(x=>x?.id===p.id)===i),availability:stay?'VERIFIED_SNAPSHOT':'UNKNOWN',priceBasis:stay?'STAY_TOTAL':'UNDATED_PER_ROOM_NIGHT_REFERENCE'};
}
/** Fixed query count, capped candidate scope and rate evaluation; never returns a truncated filtered total. */
export async function searchHotels(q: HotelSearch, allowSynthetic=false) {
  validateHotelSearch(q);
  return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ,readOnly:true},async t=>{
    await query('SET TRANSACTION READ ONLY',[],t);await query("SET LOCAL statement_timeout='5000ms'",[],t);
    const clock=(await query('SELECT transaction_timestamp() now',[],t))[0].now;
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date(clock));
    if(q.checkIn&&q.checkIn<today)hotelError('HOTEL_STAY_IN_PAST','Ngày nhận phòng đã qua.');
    const identity=hotelIdentitySearchQuery({locationId:q.locationId,streetName:q.streetName,wardOrCommune:q.wardOrCommune,nameOrAddress:q.nameOrAddress,accommodationType:q.accommodationType});
    const from=identity.sql.slice(identity.sql.indexOf(' FROM hotel_profiles'),identity.sql.lastIndexOf(' ORDER BY '));
    const params=identity.params.slice(0,-2);
    const ids=await query('SELECT p.id,p.approved_at'+from+(!allowSynthetic?" AND COALESCE(p.catalog_metadata->>'testOnly','false')<>'true'":'')+" AND EXISTS(SELECT 1 FROM hotel_media m WHERE m.place_id=p.id AND m.room_type_id IS NULL AND m.status='APPROVED' AND m.rights<>'UNVERIFIED') ORDER BY p.id LIMIT 61",params,t);
    if(ids.length>60)hotelError('HOTEL_SEARCH_SCOPE_LIMIT','Hãy chọn địa điểm hoặc nhập thêm tên khách sạn để thu hẹp tìm kiếm.',422);
    const stay=q.checkIn?normalizeStayRequest({checkIn:q.checkIn,checkOut:q.checkOut,rooms:q.rooms||[{adults:2,childAges:[]}]}):undefined;
    const snapshots=await hotelSnapshots(ids.map(r=>r.id),t,stay);
    if(snapshots.reduce((n,s)=>n+s.rates.filter(r=>r.status==='ACTIVE').length,0)>600)hotelError('HOTEL_SEARCH_COMPLEXITY_LIMIT','Phạm vi có quá nhiều gói giá; hãy thu hẹp địa điểm.',422);
    const reviews=ids.length?await query("SELECT target_id,count(*)::int count,avg(rating)::float rating FROM reviews WHERE target_type='place' AND moderation_status='PUBLISHED' AND target_id=ANY($1::text[]) GROUP BY target_id",[ids.map(r=>r.id)],t):[];
    const items=[];for(const s of snapshots){const r=reviews.find(r=>r.target_id===s.identity.id);const item=await projectHotelSearch(s,q,{count:r?.count||0,rating:r?.rating??null},allowSynthetic);if(item)items.push({...item,approvedAt:ids.find(r=>r.id===s.identity.id).approved_at});}
    items.sort((a,b)=>{const pa=a.selected?.quote?.totalVnd,pb=b.selected?.quote?.totalVnd;let diff=0;if(q.sort?.startsWith('price'))diff=pa===undefined?(pb===undefined?0:1):pb===undefined?-1:q.sort==='price_desc'?pb-pa:pa-pb;else if(q.sort==='rating')diff=(b.review.rating??-1)-(a.review.rating??-1);else if(q.sort==='recent')diff=Date.parse(b.approvedAt||'1970-01-01')-Date.parse(a.approvedAt||'1970-01-01');return diff||a.identity.name.localeCompare(b.identity.name,'vi')||a.identity.id.localeCompare(b.identity.id);});
    const page=q.page??1,limit=q.limit??12;const asOf=(await query('SELECT transaction_timestamp() now',[],t))[0].now;
    return {items:items.slice((page-1)*limit,page*limit),total:items.length,page,limit,asOf:new Date(asOf).toISOString(),validUntil:new Date(Math.min(Date.parse(asOf)+60000,...items.map(i=>Date.parse(i.validUntil)))).toISOString(),sourceVersion:hotelSourceVersion(items.map(i=>i.sourceVersion)),cacheControl:'no-store',bookingEnabled:false,scope:allowSynthetic?'ISOLATED_SYNTHETIC_PREVIEW':'PUBLIC',capabilities:{priceBasis:'STAY_TOTAL',roomCombination:'SAME_ROOM_TYPE_AND_RATE_FOR_ALL_REQUESTED_ROOMS',maxCandidateHotels:60,unsupportedMixedRoomTypes:true}};
  });
}
