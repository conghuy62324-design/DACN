import type {ModelCostFact} from './costIntelligence.js';
import { HttpError } from '../utils/httpError.js';
import {assertStructuredOutput} from './structuredOutput.js';
import {reviewEvidenceText,compactReviewEvidence} from './customerPersonalization.js';
export const GROUNDED_RESPONSE_SCHEMA = {type:'object',additionalProperties:false,required:['kind','factIds','lead'],properties:{kind:{const:'grounded'},factIds:{type:'array',maxItems:3,uniqueItems:true,items:{type:'string'}},lead:{enum:['suggestion','summary']}}};
/** Model selects/order facts; server bundles provide complete information, not model-authored claims. */
export function groundedFacts(result:any):Record<string,string>{
 const facts:Record<string,string>={};
 const items=result?.items||(result?.listing?[result.listing]:[]);
 items.slice(0,5).forEach((p:any,i:number)=>{
  facts[`option.${i}`]=`${p.name}${p.city?' ở '+p.city:''}.`;
  facts[`reason.${i}`]=Array.isArray(p.reasons)&&p.reasons.length?p.reasons.join(' '):`Lựa chọn này có trong danh mục ${p.category==='hotel'?'lưu trú':p.category==='restaurant'?'nhà hàng':'địa điểm'} TravelGo${p.city?' tại '+p.city:''}.`;
  const details=[p.address?'Địa chỉ trong TravelGo: '+String(p.address).slice(0,220)+'.':'Chưa có địa chỉ chi tiết.',p.category==='hotel'?'Dịch vụ lưu trú.':p.category==='restaurant'?'Dịch vụ ăn uống.':'Địa điểm tham quan.',p.amenities?.length?'Tiện ích ghi nhận: '+p.amenities.slice(0,8).join(', ')+'.':'Chưa có tiện ích được ghi nhận.',p.reviewCount>0&&Number.isFinite(p.rating)?`Đánh giá trong TravelGo: ${p.rating}/5 từ ${p.reviewCount} lượt.`:'Chưa có đánh giá khách hàng để kết luận chất lượng.'];
  facts[`details.${i}`]=details.join(' ');
  if(p.reviewInsights)facts[`reviews.${i}`]=reviewEvidenceText(p.reviewInsights);
  if(p.reviewInsights){facts[`reviewSummary.${i}`]=compactReviewEvidence(p.reviewInsights);
   const insight=p.reviewInsights;
   facts[`reviewEvidence.${i}`]=JSON.stringify({method:insight.method==='BOUNDED_VI_ASPECT_RULES_V3'?insight.method:'UNKNOWN',sourceRevision:/^\d{1,18}$/.test(String(insight.sourceRevision))?String(insight.sourceRevision):null,scope:insight.evidenceScope==='PUBLISHED_AND_AI_ALLOWED_ONLY'?insight.evidenceScope:'UNSPECIFIED',opinionOnly:true,aspects:['noise','cleanliness','price','staff','food','space'].filter(key=>insight.aspects?.[key]).slice(0,4).map(key=>({aspect:key,reviewIds:(insight.aspects[key].evidence||[]).slice(0,3).map((e:any)=>e.reviewId).filter((id:any)=>typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id))}))});
  }
  if(typeof p.href==='string'&&/^\/places\/[0-9a-f-]{36}$/i.test(p.href))facts[`source.${i}`]='Xem chi tiết trên TravelGo: '+p.href+'.';
  if(p.priceFrom!==null&&Number.isFinite(p.priceFrom)&&p.priceFrom>=0)facts[`price.${i}`]=`Giá tham khảo từ nguồn TravelGo${p.isDemo?' (giả định DEMO)':''}: ${p.priceFrom.toLocaleString('vi-VN')} VND; đơn vị giá và tình trạng còn chỗ chưa được xác minh.`;
  else facts[`unknownPrice.${i}`]='TravelGo chưa có giá cho lựa chọn này; cần xác minh giá, đơn vị và tình trạng còn chỗ.';
  if(p.isDemo)facts[`demo.${i}`]='Dữ liệu DEMO để kiểm thử, không phải cơ sở hoặc báo giá Booking thật.';
 });
 if(result?.type==='itinerary')facts.plan=`Lịch trình có ${result.itinerary.daysCount} ngày, ${result.itinerary.nightsCount} đêm; dự toán cả nhóm ${result.cost.estimated.toLocaleString('vi-VN')} VND. Đây chưa phải báo giá hay xác nhận dịch vụ.`;
 return facts;
}
export function renderGrounded(raw:any,facts:Record<string,string>){
 try{assertStructuredOutput(GROUNDED_RESPONSE_SCHEMA,raw);}catch{throw new HttpError(502,'Phần diễn giải AI chưa có đủ căn cứ.','AGENT_UNGROUNDED_RESPONSE');}
 if(!raw.factIds.length||raw.factIds.some((id:string)=>!Object.hasOwn(facts,id)))throw new HttpError(502,'Phần diễn giải AI chưa có đủ căn cứ.','AGENT_UNGROUNDED_RESPONSE');
 const bundles:string[]=[],seen=new Set<string>();
 for(const id of raw.factIds as string[]){const index=id.match(/^(?:option|price|unknownPrice|reason|details|source|reviews|reviewSummary|reviewEvidence|demo)\.(\d+)$/)?.[1];
  if(index!==undefined){if(seen.has(index))continue;seen.add(index);if(!Object.hasOwn(facts,'option.'+index))throw new HttpError(502,'Thiếu thông tin nhận diện lựa chọn.','AGENT_UNGROUNDED_RESPONSE');
   const values=['option.','details.','price.','unknownPrice.','reason.','reviews.','source.','demo.'].map(prefix=>facts[prefix+index]).filter(Boolean);bundles.push([...new Set(values)].join(' '));
  }else bundles.push(facts[id]);
 }
 return (raw.lead==='suggestion'?'Bạn có thể cân nhắc các lựa chọn sau từ TravelGo. ':'Mình tóm tắt các thông tin đang có trong dữ liệu TravelGo. ')+bundles.join('\n\n');
}
/** Model sees a bounded evidence subset; the server still renders complete bundles from fresh facts. */
export function boundedGroundingFacts(facts:Record<string,string>){const result:Record<string,string>={};const add=(key:string)=>{if(Object.hasOwn(facts,key)&&Buffer.byteLength(JSON.stringify({...result,[key]:facts[key]}))<=7500)result[key]=facts[key];};for(let i=0;i<3;i++)for(const p of ['option.','price.','unknownPrice.'])add(p+i);add('plan');for(let i=0;i<3;i++)add('reviewSummary.'+i);for(let i=0;i<3;i++)add('travelKnowledge.'+i);for(let i=0;i<3;i++)for(const p of ['reviewEvidence.','reason.','details.','source.','demo.'])add(p+i);return result;}

/** A catalog amount has an unknown unit; it cannot be promoted to a room/night or confirmed Booking price. */
export function catalogCostFacts(result:any):Record<string,ModelCostFact>{const out:Record<string,ModelCostFact>={};const items=result?.items||(result?.listing?[result.listing]:[]);for(const[p,index]of items.slice(0,3).map((p:any,i:number)=>[p,i])){if(typeof p.priceFrom!=='number'||!Number.isFinite(p.priceFrom)||p.priceFrom<0)continue;const id='price.'+index;out[id]={id,factType:'COST',destination:p.geography?.locationId||null,category:p.category==='hotel'?'ACCOMMODATION':p.category==='restaurant'?'FOOD':'ATTRACTION',amount:p.priceFrom,range:{min:p.priceFrom,max:p.priceFrom},currency:'VND',unit:'UNKNOWN_UNIT',classification:'REPORTED',sourceType:'TRAVELGO_CATALOG',sourceId:'option.'+index,sourceVersion:Number.isSafeInteger(p.version)?p.version:null,sourceUrl:null,period:null,included:[],excluded:[],unknownItems:['PRICE_UNIT','CURRENT_AVAILABILITY','BOOKING_PRICE'],comparability:'NOT_COMPARABLE_WITH_HISTORICAL_COMPONENT_OR_TRIP_TOTAL',freshness:{reviewedAt:p.approvedAt||null,expiresAt:null,retrievedAt:null},caveats:['TravelGo catalog from-price; unit and availability unverified.','Not an external historical observation, Planner estimate or confirmed Booking price.','Do not convert to per-person/per-room/night or add to whole-trip totals.'],synthetic:!!p.isDemo};}return out;}
