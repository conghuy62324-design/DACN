import { HttpError } from '../utils/httpError.js';
import {assertStructuredOutput} from './structuredOutput.js';
export const GROUNDED_RESPONSE_SCHEMA = {type:'object',additionalProperties:false,required:['kind','factIds','lead'],properties:{kind:{const:'grounded'},factIds:{type:'array',maxItems:3,uniqueItems:true,items:{type:'string'}},lead:{enum:['suggestion','summary']}}};
/** Model selects/order facts; server bundles provide complete information, not model-authored claims. */
export function groundedFacts(result:any):Record<string,string>{
 const facts:Record<string,string>={};
 const items=result?.items||(result?.listing?[result.listing]:[]);
 items.slice(0,5).forEach((p:any,i:number)=>{
  facts[`option.${i}`]=`${p.name}${p.city?' ở '+p.city:''}.`;
  facts[`reason.${i}`]=Array.isArray(p.reasons)&&p.reasons.length?p.reasons.join(' '):`Lựa chọn này có trong danh mục ${p.category==='hotel'?'lưu trú':p.category==='restaurant'?'nhà hàng':'địa điểm'} TravelGo${p.city?' tại '+p.city:''}.`;
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
 for(const id of raw.factIds as string[]){const index=id.match(/^(?:option|price|unknownPrice|reason|demo)\.(\d+)$/)?.[1];
  if(index!==undefined){if(seen.has(index))continue;seen.add(index);if(!Object.hasOwn(facts,'option.'+index))throw new HttpError(502,'Thiếu thông tin nhận diện lựa chọn.','AGENT_UNGROUNDED_RESPONSE');
   const values=['option.','price.','unknownPrice.','reason.','demo.'].map(prefix=>facts[prefix+index]).filter(Boolean);bundles.push([...new Set(values)].join(' '));
  }else bundles.push(facts[id]);
 }
 return (raw.lead==='suggestion'?'Bạn có thể cân nhắc các lựa chọn sau từ TravelGo. ':'Mình tóm tắt các thông tin đang có trong dữ liệu TravelGo. ')+bundles.join('\n\n');
}
