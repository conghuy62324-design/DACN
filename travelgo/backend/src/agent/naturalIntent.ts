import {normalizeVietnamese} from './vietnameseNormalizer.js';
import {geographicEvidence,uncertainTravelEdit} from './geographicEvidence.js';
import type {CoreOperation} from './coreInput.js';

export type IntentContext={awaiting?:string;selected?:{hotel?:boolean;restaurant?:boolean;comparisonCount?:number}};
export type NaturalChange='hotel_cheaper'|'hotel_other'|'restaurant_other'|'exclude_seafood';
// Accent folding must not turn the observation "thấy" into the action "thay".
export const naturalActionText=(message:string)=>normalizeVietnamese(message.replace(/thấy/giu,'nhan_xet')).normalized;
/** Current-message evidence, distinct from inherited slots and execution authority. */
export function changeSupported(change:NaturalChange,message:string,context:IntentContext){
 const s=naturalActionText(message),selected=context.selected||{};
 if(uncertainTravelEdit(message)||/\b(?:khong|chua|dung|hay|hoac)\b/.test(change==='exclude_seafood'?s.replace(/\bkhong an hai san\b/g,''):s))return false;
 const request=/\b(?:doi|thay|tim|kiem|chon|lay|muon|goi y|loai tru|bo)\b/.test(s);
 const hotel=/\b(?:khach san|ks|noi o|cho o|phong|cai nay|cai do|cho nay|cho do)\b/.test(s),restaurant=/\b(?:nha hang|quan an|cho an)\b/.test(s);
 if(change==='hotel_cheaper')return !!selected.hotel&&request&&hotel&&/\b(?:re hon|gia thap hon|tiet kiem hon)\b/.test(s);
 if(change==='hotel_other')return !!selected.hotel&&/\b(?:doi|thay)\b/.test(s)&&hotel&&!/\bre hon\b/.test(s);
 if(change==='restaurant_other')return !!selected.restaurant&&/\b(?:doi|thay)\b/.test(s)&&restaurant;
 return !!selected.restaurant&&/\b(?:loai tru|bo|khong an) hai san\b/.test(s);
}
export function naturalIntentEvidence(message:string,verified:Record<string,any>={},context:IntentContext={}){
 const s=normalizeVietnamese(message).normalized,geography=geographicEvidence(message,context.awaiting),selected=context.selected||{};
 const blocked=uncertainTravelEdit(message)||/\b(?:bo qua he thong|sql|insert|delete)\b/.test(s);
 const hotel=/\b(?:khach san|ks|noi o|cho o|phong)\b/.test(s),dining=/\b(?:nha hang|quan an|cho an)\b/.test(s);
 const search=/\b(?:tim|kiem|goi y|nao|lua chon)\b/.test(s),comparison=/\bso sanh\b/.test(s),details=/\b(?:gia|thong tin|chi tiet|tien ich|mo cua)\b/.test(s);
 const travel=/\b(?:du lich|chuyen di|di choi|hanh trinh|lich trinh|(?:muon|tinh|dinh) (?:di|den|len)|bat dau)\b/.test(s);
 const changes=(['hotel_cheaper','hotel_other','restaurant_other','exclude_seafood'] as NaturalChange[]).filter(c=>changeSupported(c,message,context));
 const goal=blocked?'CLARIFY':comparison?'COMPARE':hotel&&/\b(?:re hon|gia thap hon)\b/.test(s)?'CHEAPER_HOTEL':details&&(hotel||dining||selected.hotel||selected.restaurant)?'LISTING_DETAILS':hotel&&search?'FIND_HOTEL':dining&&search?'FIND_RESTAURANT':travel?'TRAVEL_ADVICE':'CLARIFY';
 const permittedOperations:Array<CoreOperation|'chat'>=['chat'];
 if(!blocked){
  if(geography.candidates.length||context.awaiting||/\d|\b(?:ngan sach|nguoi|nguoi lon|ngay|them|doi|xe may|o to|lich trinh|so thich|thich|uu tien)\b/.test(s)||travel||changes.length)permittedOperations.push('plan_trip');
  if(hotel&&search)permittedOperations.push('search_registered_hotels');
  if(dining&&search)permittedOperations.push('search_registered_restaurants');
  if(/\b(?:tham quan|dia diem|cho choi)\b/.test(s)&&search)permittedOperations.push('search_places');
  if(details&&(selected.hotel||selected.restaurant||selected.comparisonCount))permittedOperations.push('get_listing_details');
  if(comparison&&(selected.comparisonCount||0)>=2)permittedOperations.push('compare_travel_options');
  if(/\b(?:xem|mo)(?: lai)? (?:trip|chuyen di da luu)\b/.test(s))permittedOperations.push('get_trip');
  if(/\b(?:luu|cap nhat) (?:trip|lich trinh|chuyen di)\b/.test(s))permittedOperations.push('save_or_update_trip');
  if(/\b(?:booking|dat phong|dat ban|dat dich vu)\b/.test(s)&&(selected.hotel||selected.restaurant||selected.comparisonCount))permittedOperations.push('booking_preview');
 }
 return {goal,permittedOperations,allowedChanges:changes,missing:['destinationCity','departureCity','adults','startDate','endDate','totalBudget','transportation'].filter(k=>verified[k]===undefined),confirmationRequired:true,blocked};
}
