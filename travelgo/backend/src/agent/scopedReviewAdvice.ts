import type {ScopedReviewEvidence} from '../services/reviewProcessingService.js';
import {reviewEvidenceText} from './customerPersonalization.js';
export function renderScopedReview(e:ScopedReviewEvidence|null|undefined,roomLabel?:string){
 if(!e)return'';
 if(!['READY','INSUFFICIENT'].includes(e.status))return 'Đánh giá vừa thay đổi, chưa xử lý hoặc không còn đủ quyền sử dụng; mình chưa dùng insight cũ để tư vấn.';
 const parts:string[]=[];
 if(e.hotel?.analyzedReviewCount)parts.push('Nhận xét cấp khách sạn, không quy cho hạng phòng: '+reviewEvidenceText(e.hotel));
 if(e.room?.analyzedReviewCount)parts.push('Nhận xét đúng '+(roomLabel||'hạng phòng đã chọn')+' từ kỳ lưu trú có attribution xác minh: '+reviewEvidenceText(e.room));
 else if(e.roomTypeId)parts.push('Chưa đủ review được phép dùng cho đúng hạng phòng này; nhận xét cấp khách sạn không chứng minh trải nghiệm của phòng.');
 if(!e.hotel?.analyzedReviewCount&&!e.room?.analyzedReviewCount)parts.unshift('Chưa có đủ đánh giá công khai được phép phân tích.');
 return (e.isDemo?'Review SYNTHETIC phục vụ kiểm thử. ':'')+parts.join('\n')+'\nĐây là ý kiến trong kỳ quan sát, không phải tiện nghi, khoảng cách hoặc giá hiện hành được xác minh. Giá và tồn phòng vẫn theo HotelReadService.';
}
const preferencesByAspect:Record<string,RegExp>={
 cleanliness:/\b(?:phong sach|sach se|ve sinh|sach hon|(?<!ngan |doc |quyen )sach)\b/,
 noise:/\b(?:yen tinh|khong (?:(?:qua|muon) )?on|it on|tieng on|cach am)\b/,
 room_view:/\b(?:view dep|huong nhin dep|canh dep)\b/,
 price:/\b(?:dang tien|gia hop ly|gia tri|xung dang)\b/,
 staff:/\b(?:nhan vien|phuc vu tot)\b/,
 beach_access:/\bgan bien\b/,
 food_access:/\bgan (?:cho an|khu an uong|nha hang|quan an)\b/,
 family_suitability:/\b(?:phu hop (?:cho )?gia dinh|than thien voi tre)\b/,
 wifi:/\bwi\s*-?\s*fi\s*(?:tot|manh|on dinh)\b/,
 parking:/\b(?:bai (?:do |dau )?xe)\b/,
 bathroom:/\bphong tam (?:thuan tien|tot|sach)\b/,
};
const aliases:Record<string,string>={clean:'cleanliness',quiet:'noise',value:'price'};
export const validReviewPreference=(key:string)=>Object.hasOwn(preferencesByAspect,aliases[key]??key);

export function readHotelReviewPreferences(normalized:string,previous:string[]=[]){
 const next=new Set(previous);
 for(const [key,re] of Object.entries(preferencesByAspect)){
  const hit=re.exec(normalized);
  if(!hit)continue;
  const left=normalized.slice(Math.max(0,hit.index-35),hit.index);
  if(/\b(?:bo|khong can|khoi can|khong uu tien)(?: uu tien| yeu cau)?\s*$/.test(left))next.delete(key);
  // Budget words and generic catalog amenities are not statements about review quality.
  else if((key!=='cleanliness'||!/\b(?:ngan|doc|quyen)\s*$/.test(left))&&
    (key!=='parking'||/\b(?:uu tien|danh gia|thuan tien|tot)\b/.test(normalized)))next.add(key);
 }
 return [...next];
}

function matchingAspect(e:ScopedReviewEvidence|null|undefined,key:string){
 if(e?.status!=='READY')return;
 const aspect=aliases[key]??key;
 const room=e.room?.aspects[aspect];
 if(room?.supportCount)return {aspect:room,scope:'đúng hạng phòng'};
 const hotel=e.hotel?.aspects[aspect];
 if(hotel?.supportCount)return {aspect:hotel,scope:'cấp khách sạn'};
}
export function reviewPreferenceScore(e:ScopedReviewEvidence|null|undefined,preferences:string[]=[]){
 return [...new Set(preferences.map(key=>aliases[key]??key))].reduce((score,key)=>{
  const match=matchingAspect(e,key);
  if(!match)return score;
  const {counts,supportCount}=match.aspect;
  return score+(counts.POSITIVE-counts.NEGATIVE)/Math.max(supportCount,3);
 },0);
}
export function renderReviewTradeoffs(e:ScopedReviewEvidence|null|undefined,preferences:string[]){
 if(!preferences.length)return '';
 const notes=[...new Set(preferences.map(key=>aliases[key]??key))].map(key=>{
  const match=matchingAspect(e,key);
  if(!match)return undefined;
  const {label,supportCount,counts}=match.aspect;
  return label.toLowerCase()+' ('+match.scope+'): '+supportCount+' nhận xét, '+counts.POSITIVE+' tích cực, '+counts.NEGATIVE+' tiêu cực, '+counts.MIXED+' trái chiều'+(supportCount<5?' (mẫu ít)':'');
 }).filter(Boolean);
 return notes.length?'Theo ưu tiên của bạn: '+notes.join('. ')+'.':'Chưa đủ nhận xét được phép dùng để đối chiếu các ưu tiên này.';
}
