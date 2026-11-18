import {normalizeVietnamese,travelLocations,conversationalLocation} from './vietnameseNormalizer.js';
import {calculatePlannerDays} from '../utils/plannerValidation.js';
import {resolveLocation} from '../geography/vietnam.js';
import {currentGeographicRoles} from './geographicEvidence.js';
import {patchCanonical,type NaturalState,type TravelPatch} from './vietnameseConversation.js';
import type {CoreInterpretation} from './coreInput.js';
import type {CatalogFilters} from '../services/registeredCatalogService.js';
import type {LanguageResolution} from './adaptiveLanguage.js';

export const conversationalIntelligenceEnabled=()=>process.env.CONVERSATIONAL_INTELLIGENCE_ENABLED==='true';
export type ServiceScope='hotel'|'restaurant'|'places';
export type SemanticFrame={span:{start:number;end:number;quote:string};meaning:string;value:string|number;scope:ServiceScope|'trip';polarity:'POSITIVE'|'NEGATIVE';modality:'REQUEST'|'QUESTION'|'HYPOTHETICAL'|'COMMENT'|'PREFERENCE';referent?:ServiceScope;provenance:'CURRENT_MESSAGE'|'USER_CONFIRMED_MAPPING';verification:'EVIDENCED'|'CANDIDATE';ambiguity:'CLEAR'|'UNRESOLVED';temporalScope?:'CURRENT_TRIP'|'PAST_EXPERIENCE';numericScope?:'GROUP_TRIP'|'CATALOG_REFERENCE';dayNumber?:number};
export type DialogueGoal={category:ServiceScope;dependency?:'SELECT_HOTEL';locationId?:string};
export type DialogueMemory={frames:SemanticFrame[];currentGoal?:DialogueGoal;previousGoal?:DialogueGoal;completedGoal?:DialogueGoal;deferredGoals:DialogueGoal[];constraints:Partial<Record<ServiceScope,CatalogFilters>>;softPreferences:Partial<Record<ServiceScope,string[]>>;lists:Partial<Record<ServiceScope,{id:string;category:string}[]>>;pendingQuestion?:'MEANING'|'REFERENT'|'DURATION'|'CRITERIA'|'CORRECTION'|'LOCATION';proposedChanges:TravelPatch;rejectedOptions:string[];activeReferent?:{id:string;category:ServiceScope};lastAccommodationType?:string;durationDays?:number};
export const dialogueMemory=():DialogueMemory=>({frames:[],deferredGoals:[],constraints:{},softPreferences:{},lists:{},proposedChanges:{},rejectedOptions:[]});
export type ConversationComposition={memory:DialogueMemory;frames:SemanticFrame[];handled:boolean;patch:TravelPatch;filters:CatalogFilters;interpretation?:CoreInterpretation;question?:string;reference?:{category:ServiceScope;index:number}};
const operation=(c:ServiceScope)=>c==='hotel'?'search_registered_hotels':c==='restaurant'?'search_registered_restaurants':'search_places';
const serviceLexemes:[RegExp,ServiceScope][]=[[/\b(?:khach san|noi o|cho o|noi luu tru|luu tru|homestay|resort|villa)\b/g,'hotel'],[/\b(?:nha hang|quan an|cho an|an uong)\b/g,'restaurant'],[/\b(?:diem tham quan|cho di choi|cho choi|di choi|tham quan)\b/g,'places']];
/** A bounded semantic projection inside Core, never an executor. Raw spans are mapped through lexical normalization; clauses are anchored to typed service mentions, not comma splitting. */
export function composeConversation(message:string,previous:DialogueMemory|undefined,verified:TravelPatch,natural:NaturalState,resolution:LanguageResolution,contextLocation?:string):ConversationComposition{
 const memory:DialogueMemory=structuredClone(previous||dialogueMemory());
 memory.frames=[];memory.proposedChanges={};memory.pendingQuestion=undefined;
 const allTokens=[...message.matchAll(/[\p{L}\p{M}]+|\d+(?:[.,]\d+)?|[^\s\p{L}\p{M}\d]/gu)],tokens=allTokens.slice(0,180);
 let text='';const offsets:{a:number;b:number;start:number;end:number}[]=[];
 for(const token of tokens){const word=normalizeVietnamese(token[0]).normalized;if(!word)continue;if(text)text+=' ';const a=text.length;text+=word;offsets.push({a,b:text.length,start:token.index!,end:token.index!+token[0].length});}
 const span=(start:number,end:number)=>{const first=offsets.find(o=>o.b>start),last=[...offsets].reverse().find(o=>o.a<end);const a=first?.start||0,b=last?.end||0;return{start:a,end:b,quote:message.slice(a,b).slice(0,96)};};
 const whole=normalizeVietnamese(message).normalized;
 if(process.env.PERSONALIZED_DECISION_ENABLED==='true'&&message.includes(':'))return{memory,frames:[],handled:false,patch:{},filters:{}};
 const modality:SemanticFrame['modality']=/\b(?:neu|gia su|co le|chua chac|chua quyet dinh|can nhac)\b/.test(text)?'HYPOTHETICAL':/\b(?:hoi|bao nhieu|co .*khong|co .*chu|the nao|co di duoc)\b/.test(text)||/\?\s*$/.test(message)?'QUESTION':/\b(?:hoi|qua|cung duoc)\b/.test(text)&&!/\b(?:tim|kiem|doi|chon)\b/.test(text)?'COMMENT':'REQUEST';
 const anchors:{category:ServiceScope;start:number;end:number;mapped?:boolean;value?:string;negative?:boolean;kept?:boolean}[]=[];
 for(const [pattern,category]of serviceLexemes)for(const m of text.matchAll(pattern))anchors.push({category,start:m.index!,end:m.index!+m[0].length});
 for(const e of resolution.evidence.filter(e=>e.concept.type!=='location')){const offset=offsets.find(o=>o.start===e.span.start);if(offset)anchors.push({category:e.concept.domain==='travel_dining'?'restaurant':e.concept.domain==='travel_experience'?'places':'hotel',start:offset.a,end:offset.b,mapped:true,value:e.concept.value});}
 anchors.sort((a,b)=>a.start-b.start);
 for(const a of anchors){const before=text.slice(Math.max(0,a.start-24),a.start);a.negative=/\b(?:khong phai|chu khong phai|khong tim|dung tim)\s*$/.test(before);a.kept=/\bgiu\s*$/.test(before);}
 const frame=(start:number,end:number,meaning:string,value:string|number,scope:SemanticFrame['scope']='trip',extra:Partial<SemanticFrame>={})=>{if(memory.frames.length<24)memory.frames.push({span:span(start,end),meaning,value,scope,polarity:'POSITIVE',modality,provenance:'CURRENT_MESSAGE',verification:'EVIDENCED',ambiguity:'CLEAR',...extra});};
 for(const a of anchors)frame(a.start,a.end,'service',a.value||a.category,a.category,{provenance:a.mapped?'USER_CONFIRMED_MAPPING':'CURRENT_MESSAGE',polarity:a.negative?'NEGATIVE':'POSITIVE'});
 const scopeAt=(index:number):ServiceScope|'trip'=>[...anchors].reverse().find(a=>a.start<index)?.category||memory.currentGoal?.category||'trip';
 const patch:TravelPatch={};
 const roleEvidence=process.env.PERSONALIZED_DECISION_ENABLED==='true'?currentGeographicRoles(message,natural.awaiting):undefined;
 const locations=roleEvidence?roleEvidence.mentions.filter(m=>(m.role==='departureCity'||m.role==='destinationCity')&&!m.keep).map(m=>({geo:resolveLocation(m.id)!,role:m.role as 'departureCity'|'destinationCity',start:0,end:0})):travelLocations(text).filter(l=>l.role==='departureCity'||l.role==='destinationCity'||anchors.length>0);
 const dest=[...new Set(locations.filter(l=>l.role!=='departureCity').map(l=>l.geo.id))];
 const area=roleEvidence?.mentions.find(m=>m.role==='SEARCH_AREA');
 const localLocation=area?.id||(dest.length===1?dest[0]:contextLocation||verified.destinationCity);
 const location=resolveLocation(localLocation);
 const changedDestination=resolveLocation(roleEvidence?.patch.destinationCity||(!roleEvidence&&dest.length===1?dest[0]:undefined));if(changedDestination&&verified.destinationCity&&resolveLocation(verified.destinationCity)?.id!==changedDestination.id)invalidateDialogueLocation(memory);
 const filters:CatalogFilters=location?{locationId:location.id,city:location.catalogName}:{};
 const say=(question:string,pending:DialogueMemory['pendingQuestion']='CRITERIA')=>{memory.pendingQuestion=pending;return{memory,question,frames:memory.frames,handled:true,patch:{},filters};};
 const result=(interpretation?:CoreInterpretation,question?:string)=>({memory,interpretation,question,frames:memory.frames,handled:!!interpretation||!!question,patch,filters});
 if(allTokens.length>180)return say('Yêu cầu có nhiều phần vượt giới hạn xử lý trong một lượt. Bạn muốn ưu tiên phần nào trước?');
 if(/\b(?:bo (?:cai )?(?:vua noi|vua roi)|quay lai phuong an|khong phai y|minh khong co y do)\b/.test(text)&&!/\d/.test(text))return say('Mình chưa đổi chuyến đã lưu. Bạn muốn sửa cách hiểu, tiêu chí hay lựa chọn nào vừa nhắc?', 'CORRECTION');
 // Control attempts and hypothetical speech have no slot/tool authority, irrespective of learned meanings.
 if(/\b(?:system|prompt|sql|delete|insert|bo qua he thong|khong hoi)\b/.test(text))return say('Mình chỉ dùng dữ liệu TravelGo và quyền đã được xác nhận. Bạn cần tìm dịch vụ nào?', 'CORRECTION');
 if(modality==='HYPOTHETICAL')return say('Đây mới là phương án cân nhắc; mình vẫn giữ thông tin hiện tại. Bạn muốn so sánh chi phí phương tiện hay xác nhận một thay đổi cụ thể?');
 if(/\d/.test(text)&&/(?:\/|moi)\s*(?:phong|dem|nguoi|mon|phan)\b/.test(text))return say('Đơn vị giá dịch vụ chưa được xác minh. Bạn muốn lọc theo giá tham khảo catalog rồi xác nhận đơn vị trực tiếp với cơ sở không?');
 const correction=/\b(?:y (?:minh|toi) la|(?:minh|toi|nay minh) noi|khong phai y|minh hieu sai|y minh khac|khong phai vay|khong phai\s*\d+|chu khong phai)\b/.test(text)||/\b(?:la tien phong|la gia phong)\b/.test(text);
 if(correction){memory.proposedChanges={};if(!anchors.length&&!/\d/.test(text))return say('Mình chưa xác định đúng phần cần sửa. Bạn muốn sửa loại dịch vụ, số tiền hay lựa chọn đang nói tới?', 'CORRECTION');}
 if(/\b(?:dau vi|gia .*cang|hoi xa|hoi mac|hoi dat)\b/.test(text)&&!anchors.some(a=>a.mapped)&&!/\b(?:tim|kiem|doi)\b|\bco\b.{0,80}\b(?:re hon|gia thap hon)\b/.test(text))return say('Mình hiểu bạn đang cân nhắc giá hoặc khoảng cách, và vẫn giữ lựa chọn hiện tại. Bạn muốn xem lại thông tin hay tìm phương án khác?');
 if(/\b(?:khong|chua) (?:chon|muon|doi|di|quyet dinh)\b/.test(text)&&!/\bkhong can re nhat\b/.test(text)&&!roleEvidence?.patch.destinationCity){const ordinal=text.match(/\bthu\s*([1-5])\b/),category=anchors[0]?.category,id=category&&ordinal?memory.lists[category]?.[+ordinal[1]-1]?.id:undefined;if(id)memory.rejectedOptions=[...new Set([...memory.rejectedOptions,id])].slice(-10);return say('Mình chưa đổi ngân sách, phương tiện hay dịch vụ. Bạn muốn giữ lựa chọn hiện tại hay làm rõ tiêu chí nào?');}
 if(roleEvidence&&resolution.evidence.some(e=>e.concept.type==='location'&&conversationalLocation(e.span.quote,true)&&conversationalLocation(e.span.quote,true)!.id!==e.concept.value))return say('Cách gọi địa danh đã nhớ xung đột với địa danh chuẩn. Bạn muốn tìm ở địa điểm nào?', 'LOCATION');
 if(roleEvidence?.ambiguous||dest.length>1)return say('Bạn muốn dùng điểm đến nào trước trong những nơi vừa nhắc?', 'LOCATION');
 const unknownUnit=/\b(?:ngan sach|tong chuyen|tien phong|gia phong)\s*(?:(?:tam|khoang|duoi|toi da)\s*)?\d+(?:[.,]\d+)?\s+([a-z]+)\b/.exec(text);
 if(unknownUnit&&!['trieu','tr','cu','nghin','ngan','k','vnd','dong'].includes(unknownUnit[1]))return say('Đơn vị tiền bạn vừa dùng chưa có nghĩa được xác minh. Bạn ghi số tiền bằng VND, nghìn hoặc triệu giúp mình nhé; mình vẫn giữ mức cũ.');
 // Typed amounts attach to their nearest service unless an explicit trip-budget cue changes scope.
 for(const m of text.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|nghin|ngan|k|vnd|dong)\b/g)){
  const amount=Number(m[1].replace(',','.'))*(/^(?:trieu|tr|cu)$/.test(m[2])?1000000:/^(?:nghin|ngan|k)$/.test(m[2])?1000:1),i=m.index!,before=text.slice(Math.max(0,i-70),i),after=text.slice(i+m[0].length),priceCorrection=/^\s*(?:la\s+)?(?:tien|gia)\s+(?:phong|khach san)\b/.test(after),scope=priceCorrection?'hotel':scopeAt(i);
  if(!Number.isSafeInteger(amount)||amount<=0||amount>1e12)return say('Bạn xác nhận lại mức tiền cụ thể giúp mình nhé.');
  const group=!priceCorrection&&(scope==='trip'&&anchors.length===0&&/\b(?:di dau|di choi|chuyen di|du lich)\b/.test(text)||/\b(?:tong(?: cong| ngan sach| chuyen(?: di)?)?|ngan sach(?: ca nhom| chuyen di)?|ca nhom|ca chuyen)\s*(?:(?:khong|dung)\s*)?(?:(?:qua|vuot|toi da|tam|duoi)\s*)?$/.test(before)||correction&&/\b(?:noi)\s*$/.test(before));
  const cap=/\b(?:duoi|toi da|khong qua|khong vuot|den|tam)\s*$/.test(before);
  if(group){patch.totalBudget=amount;frame(i,i+m[0].length,'totalBudget',amount,'trip',{numericScope:'GROUP_TRIP'});}
  else if((cap||priceCorrection)&&scope!=='trip'){const c=memory.constraints[scope]||={};c.maxPriceFrom=amount;frame(i,i+m[0].length,'maxPriceFrom',amount,scope,{numericScope:'CATALOG_REFERENCE'});}
  else return say('Mức tiền này là ngân sách cả chuyến hay giá tham khảo tối đa của dịch vụ?');
 }
 for(const hit of locations){if(hit.role==='departureCity')patch.departureCity=hit.geo.catalogName;else if(hit.role==='destinationCity'||anchors.length)patch.destinationCity=hit.geo.catalogName;
  // Role evidence uses shared geography; recover a real lexical span, never an empty fabricated quote.
  const mention=travelLocations(text).find(l=>l.geo.id===hit.geo.id);if(mention)frame(mention.start,mention.end,hit.role||'destinationCity',hit.geo.id);}
 for(const m of text.matchAll(/\b(\d+)\s*(?:nguoi|ng|dua)\b/g)){const prefix=text.slice(Math.max(0,m.index!-18),m.index);if(correction&&/\b(?:khong phai|chu khong phai)\s*$/.test(prefix))continue;const count=+m[1];if(count>=1&&count<=100){patch.adults=count;frame(m.index!,m.index!+m[0].length,'adults',count);}}
 // Reuse the existing duration/date parser. Word deltas are converted to typed arithmetic only on a known duration.
 const delta=text.match(/\b(them|bot)\s+(mot|hai|ba|\d{1,2})\s+ngay\b/);
 if(delta){const n=({mot:1,hai:2,ba:3} as Record<string,number>)[delta[2]]||+delta[2],base=previous?.durationDays||natural.durationDays||(verified.startDate&&verified.endDate?calculatePlannerDays(verified.startDate,verified.endDate):undefined);
  if(!base)return say('Chuyến đi hiện dài bao nhiêu ngày để mình điều chỉnh đúng, đồng thời giữ các thông tin còn lại?', 'DURATION');
  const next=base+(delta[1]==='them'?n:-n);if(next<1||next>10)return say('Thời lượng cần từ1 đến10 ngày theo Planner hiện tại. Bạn muốn điều chỉnh còn bao nhiêu ngày?', 'DURATION');
  memory.durationDays=next;if(verified.startDate)patch.endDate=new Date(Date.parse(verified.startDate+'T00:00:00Z')+(next-1)*86400000).toISOString().slice(0,10);
 }
 const duration=whole.match(/\b(\d{1,2})\s*(?:n|ngay)\s*(\d{1,2})\s*(?:d|dem)\b/);if(duration&&+duration[1]>=1&&+duration[1]<=10&&+duration[2]===+duration[1]-1)memory.durationDays=+duration[1];
 for(const [pattern,label]of [[/\b(?:sach|sach se|ve sinh)\b/g,'cleanliness'],[/\b(?:yen tinh|it on)\b/g,'quiet'],[/\b(?:re|binh dan|gia mem)\b/g,'price'],[/\bban cong\b/g,'balcony'],[/\bgan trung tam\b/g,'central']] as [RegExp,string][]){for(const m of text.matchAll(pattern)){const scope=scopeAt(m.index!);if(scope==='trip')continue;const prior=text.slice(Math.max(0,m.index!-20),m.index),negative=/\b(?:khong can|khong muon)\s*$/.test(prior);const prefs=memory.softPreferences[scope]||=[];if(negative)memory.softPreferences[scope]=prefs.filter(p=>p!==label);else if(!prefs.includes(label))prefs.push(label);frame(m.index!,m.index!+m[0].length,label,label,scope,{modality:'PREFERENCE',verification:'CANDIDATE',polarity:negative?'NEGATIVE':'POSITIVE'});}}
 if(/\b(?:on|on ao|tieng on)\b/.test(text)&&/\b(?:ne|tranh)\b/.test(text)&&/\b(?:lan nay|chuyen nay)\b/.test(text)){const prefs=memory.softPreferences.hotel||=[];if(!prefs.includes('quiet'))prefs.push('quiet');const m=/\b(?:ne|tranh)\b/.exec(text)!;frame(m.index,m.index+m[0].length,'quiet','quiet','hotel',{modality:'PREFERENCE',verification:'CANDIDATE',temporalScope:'CURRENT_TRIP'});}
 for(const m of text.matchAll(/\bngay\s+(dau|thu\s*[1-9]|[1-9])\s+(?:di\s+)?(nhe|nhe nhang|thong tha|cham)\b/g)){const n=m[1]==='dau'?1:+m[1].replace('thu','').trim();frame(m.index!,m.index!+m[0].length,'dayPace','relaxed','trip',{modality:'PREFERENCE',verification:'CANDIDATE',dayNumber:n,temporalScope:'CURRENT_TRIP'});}
 for(const [pattern,label]of [[/\b(?:ho boi|be boi)\b/g,'Hồ bơi'],[/\bwi[ -]?fi\b/g,'Wi-Fi'],[/\b(?:bai (?:do |dau )?xe)\b/g,'Bãi đỗ xe']] as [RegExp,string][]){for(const m of text.matchAll(pattern)){const scope=scopeAt(m.index!);if(scope==='trip')continue;const prefix=text.slice(Math.max(0,m.index!-24),m.index),negative=/\b(?:khong can|khong muon|khong co)\s*$/.test(prefix);frame(m.index!,m.index!+m[0].length,'amenity',label,scope,{polarity:negative?'NEGATIVE':'POSITIVE'});if(!negative){const c=memory.constraints[scope]||={};c.amenities=[...new Set([...(c.amenities||[]),label])].slice(0,6);}else if(memory.constraints[scope])memory.constraints[scope]!.amenities=memory.constraints[scope]!.amenities?.filter(a=>a!==label);}}
 if(/\b(?:xa trung tam|gan trung tam)\b/.test(text))return say('TravelGo chưa có mốc trung tâm được xác minh. Bạn muốn ở gần địa điểm cụ thể nào?');
 if(anchors.some(a=>a.mapped)&&new Set(anchors.filter(a=>!a.kept&&!a.negative).map(a=>a.category)).size>1)return say('Mình nhận ra cách gọi đã nhớ nhưng câu này có nhiều loại dịch vụ. Bạn muốn tìm nơi ở hay chỗ ăn trước?');
 if(resolution.status==='AMBIGUOUS'||resolution.status==='UNSAFE_CONTEXT')return say(resolution.question||'Bạn muốn dùng nghĩa nào cho cách diễn đạt này?', 'MEANING');
 // Category-qualified ordinal references use the matching retained list, never the last unrelated list.
 const ordinal=text.match(/\b(?:thu\s*)?([1-5]|dau|nhat|hai|ba|tu|nam)\b/),index=ordinal?((({dau:1,nhat:1,hai:2,ba:3,tu:4,nam:5} as Record<string,number>)[ordinal[1]]||+ordinal[1])-1):undefined;
 if(ordinal&&/\b(?:cai|cho|thu|khach san|nha hang)\b/.test(text)&&!/\b(?:nguoi|ngay)\b/.test(text)){
  const retained=(['hotel','restaurant','places'] as ServiceScope[]).filter(k=>memory.lists[k]?.length);
  const category=anchors.find(a=>!/\bkhong phai\s*$/.test(text.slice(0,a.start)))?.category||(!anchors.length&&retained.length===1?retained[0]:undefined);
  if(!category)return say('Bạn đang nói thứ tự trong danh sách nơi ở hay nhà hàng?', 'REFERENT');
  const listing=memory.lists[category]?.[index!];if(!listing)return say('Danh sách dịch vụ đó chưa có lựa chọn tương ứng. Bạn muốn mình tìm lại danh sách nào?', 'REFERENT');
  memory.activeReferent={id:listing.id,category};return{...result(),reference:{category,index:index!},handled:true};
 }
 if(/\b(?:giu)\s+(?:khach san|noi o|cho o)/.test(text)&&!(/\b(?:doi sang|tim|kiem)\b/.test(text)))return say('Mình chưa thay lựa chọn trong phiên. Bạn muốn giữ dịch vụ cụ thể nào trong danh sách?', 'REFERENT');
 let goals=[...new Set(anchors.filter(a=>!a.negative&&!a.kept).map(a=>a.category))].map(category=>({category,locationId:location?.id} as DialogueGoal));
 if(/^tiep\s+(?:phan|muc)\b/.test(text)){
  const requested=goals[0]?.category,next=memory.deferredGoals.find(g=>g.category===requested);
  if(!next)return say('Chưa có mục tiêu tương ứng đang chờ. Bạn muốn tìm dịch vụ nào?', 'REFERENT');
  if(next.dependency==='SELECT_HOTEL'&&!memory.activeReferent)return say('Bạn muốn xem điểm tham quan gần khách sạn nào? Hãy chọn một nơi ở trước để mình dùng đúng vị trí.', 'REFERENT');
  goals=[next];memory.deferredGoals=memory.deferredGoals.filter(g=>g!==next);
 }
 const lastType=memory.lastAccommodationType;
 if(/\bloai do\b/.test(text)&&lastType){goals=[{category:'hotel',locationId:location?.id}];filters.accommodationType=lastType;}
 if(/\bso sanh\b/.test(text)&&anchors.some(a=>a.mapped))return say('Mình có thể so sánh các dịch vụ cụ thể từ catalog. Bạn muốn chọn những lựa chọn nào để so sánh?', 'REFERENT');
 const action=correction||/\b(?:tim|kiem|goi y|co|doi sang|muon (?:nghi )?o|y (?:minh|toi) la)\b/.test(text)||/^tiep\b/.test(text);
 const composed=!!roleEvidence?.mentions.some(m=>m.role==='SEARCH_AREA')||goals.length>1||anchors.some(a=>a.mapped||a.kept)||correction||/^tiep\b/.test(text)||/\bloai do\b/.test(text);
 if(action&&goals.length&&composed){const goal=goals[0];if(memory.currentGoal&&memory.currentGoal.category!==goal.category)memory.previousGoal=structuredClone(memory.currentGoal);memory.currentGoal=goal;
  if(goals.length>1)memory.deferredGoals=goals.slice(1,4).map(g=>({...g,...(g.category==='places'&&/\bgan do\b/.test(text)?{dependency:'SELECT_HOTEL' as const}:{})}));
  const mapped=resolution.evidence.find(e=>e.concept.type==='accommodation_type');if(mapped&&goal.category==='hotel'){filters.accommodationType=mapped.concept.value;memory.lastAccommodationType=mapped.concept.value;}
  const builtin=anchors.find(a=>a.category==='hotel'&&/homestay|resort|villa/.test(text.slice(a.start,a.end)));if(builtin)filters.accommodationType=text.slice(builtin.start,builtin.end);
  if(!location)return say('Bạn muốn tìm dịch vụ ở điểm đến nào?', 'LOCATION');
  const goalFilters={...filters,...memory.constraints[goal.category]};
  if(memory.softPreferences[goal.category]?.includes('price'))goalFilters.sort='priceAsc';
  return result({operation:operation(goal.category),canonical:patchCanonical(patch),filters:goalFilters});
 }
 if(correction&&Object.keys(patch).length)return result({operation:'plan_trip',canonical:patchCanonical(patch)});
 if(correction&&memory.currentGoal&&/\b(?:la tien phong|la gia phong)\b/.test(text)&&location){const category=memory.currentGoal.category;return result({operation:operation(category),canonical:'',filters:{...filters,...memory.constraints[category]}});}
 if(delta)return result({operation:'plan_trip',canonical:patchCanonical(patch)});
 if(!anchors.length&&/\bkhong can re nhat\b/.test(text)){const category=memory.currentGoal?.category;if(category){memory.softPreferences[category]=[...new Set([...(memory.softPreferences[category]||[]).filter(p=>p!=='price'),...(/\bsach\b/.test(text)?['cleanliness']:[])])];}return say('Mình giữ giới hạn giá đã ghi nhận và ưu tiên thông tin vệ sinh có nguồn. Bạn muốn đối chiếu những lựa chọn nào?', 'REFERENT');}
 if(roleEvidence&&Object.keys(roleEvidence.patch).length)return result({operation:'plan_trip',canonical:patchCanonical({...patch,...roleEvidence.patch})});
 if(Object.keys(patch).length&&duration||/\b(?:lan nay|a thoi)\b/.test(text)&&patch.destinationCity)return result({operation:'plan_trip',canonical:patchCanonical(patch)});
 return result();
}

export function recordDialogueResult(memory:DialogueMemory,result:any){
 const items=result?.items||[];
 for(const category of ['hotel','restaurant','places'] as ServiceScope[]){const list=items.filter((p:any)=>category==='places'?!['hotel','restaurant'].includes(p.category):p.category===category);if(list.length){memory.lists[category]=list.slice(0,5).map((p:any)=>({id:p.id,category:p.category}));memory.completedGoal={category,locationId:memory.currentGoal?.locationId};}}
 if(result?.filters?.accommodationType)memory.lastAccommodationType=result.filters.accommodationType;
}
export function invalidateDialogueLocation(memory:DialogueMemory){memory.lists={};memory.activeReferent=undefined;memory.deferredGoals=[];memory.constraints={};memory.frames=[];memory.currentGoal=undefined;memory.previousGoal=undefined;memory.completedGoal=undefined;memory.rejectedOptions=[];}
export function dialogueSummary(memory:DialogueMemory){return{currentGoal:memory.currentGoal?.category,previousGoal:memory.previousGoal?.category,completedGoal:memory.completedGoal?.category,deferredGoals:memory.deferredGoals,activeConstraints:memory.constraints,softPreferences:memory.softPreferences,pendingQuestion:memory.pendingQuestion,durationDays:memory.durationDays,hotelMaxPriceFrom:memory.constraints.hotel?.maxPriceFrom,mutationAuthority:false};}
/** No transcript, private identifiers or raw quotes in the future model context. This projection grants no execution authority. */
export function controlledDialogue(memory:DialogueMemory){const context={goal:memory.currentGoal?.category,deferred:memory.deferredGoals.slice(0,3).map(g=>({category:g.category,dependency:g.dependency})),pending:memory.pendingQuestion,meanings:memory.frames.slice(0,6).map(f=>({meaning:f.meaning,value:f.value,scope:f.scope,polarity:f.polarity,modality:f.modality,verification:f.verification})),executionAuthority:false};if(Buffer.byteLength(JSON.stringify(context),'utf8')>1200)context.meanings=context.meanings.slice(0,2);return context;}
