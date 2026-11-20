import {decisionIntelligenceEnabled,analyzeDecision,renderDecision,type DecisionProfile,type DecisionEvidence} from './decisionIntelligence.js';
import {normalizeVietnamese} from './vietnameseNormalizer.js';
import {ASPECT_LABELS} from './reviewAspects.js';
import {groundedFacts} from './naturalGrounding.js';
import type {QualityOverride} from './personalizedGrounding.js';

export type AdvisoryGoal='START'|'DESTINATION'|'SEARCH'|'FIT'|'COMPARE'|'WHY'|'WHY_NOT'|'REPLACE'|'COMMENT'|'PLAN'|'REVIEWS'|'DECIDE'|'PRICE'|'DETAILS';
export type AdvisoryClaim={kind:'MATCH'|'STRENGTH'|'LIMIT'|'UNKNOWN'|'CONDITION';text:string;factIds:string[];reviewIds?:string[];criterion?:string};
export type AdvisoryOption={index:number;id:string;name:string;price:number|null;claims:AdvisoryClaim[];fit:'SUPPORTED'|'CONFLICTING'|'MIXED'|'UNKNOWN';reviewCount:number;sourceHref?:string;address?:string};
export type AdvisoryDecision={decisionProfile?:DecisionProfile;decisionEvidence?:DecisionEvidence;version:'ADVISORY_V51';goal:AdvisoryGoal;options:AdvisoryOption[];recommendationIndex:number|null;preferenceSource:'CURRENT_TRIP'|'SAVED_MEMORY'|'NONE';quality:string[];tradeoffs:AdvisoryClaim[];question?:string;warnings:string[];mutationAuthority:false};
/** Surface speech is classified separately from a tool operation. No IDs or prices come from this reader. */
export function advisoryGoal(message:string,hasShown=false):AdvisoryGoal{
 const s=normalizeVietnamese(message).normalized;
 if(/\b(?:vi sao|tai sao|sao ban)\b/.test(s))return /\bkhong (?:goi y|de xuat)\b/.test(s)?'WHY_NOT':'WHY';
 if(/\b(?:khach cu|binh luan|danh gia|diem manh|diem yeu|uu diem|nhuoc diem)\b/.test(s))return'REVIEWS';
 if(/\b(?:van chua biet chon|phan van|do du|chua quyet duoc)\b/.test(s))return'DECIDE';
 if(/\b(?:so sanh|dang tien|tot hon|nen chon|chon cho nao)\b/.test(s)||hasShown&&/\b(?:yen tinh|sach se) hon\b/.test(s))return'COMPARE';
 if(/\b(?:qua mac|mac qua|qua dat|gia cao|dat qua)\b/.test(s)&&!/\b(?:doi|tim|re hon)\b/.test(s))return'COMMENT';
 if(hasShown&&/\bgia\b/.test(s)&&!/\b(?:tim|kiem|doi|re hon|tiet kiem)\b/.test(s))return'PRICE';
 if(hasShown&&/\b(?:phu hop|sach khong|yen tinh khong|co sach|co yen tinh|co chac.*(?:yen tinh|sach se)|chac chan.*(?:yen tinh|sach se))\b/.test(s))return'FIT';
 if(/\b(?:doi|thay)\b.*\b(?:khach san|nha hang|cho o)\b|\bre hon\b/.test(s))return'REPLACE';
 if(/\b(?:chua (?:biet|ro).*(?:bat dau|chuan bi)|chang biet.*chuan bi|bat dau tu dau)\b/.test(s))return'START';
 if(/\b(?:nen di dau|goi y diem den|di dau|cho nao)\b/.test(s)&&!hasShown)return'DESTINATION';
 if(/\b(?:lap|len|tao)(?: lai)? lich trinh\b/.test(s))return'PLAN';
 if(/\b(?:tim|kiem|goi y)\b/.test(s))return'SEARCH';
 return'DETAILS';
}
const qualityAspect:Record<string,string>={quiet:'noise',clean:'cleanliness',value:'price'};
const qualityLabel:Record<string,string>={quiet:'yên tĩnh',clean:'sạch sẽ',value:'giá hợp lý theo nhận xét'};
/** Qualitative evidence relations, not a new scoring/ranking model. Catalog order/weights stay intact. */
export function advisoryDecision(message:string,result:any,allowedPreferences:any[]=[],qualityOverride?:QualityOverride,priority?:'quiet'|'price',profile?:DecisionProfile):AdvisoryDecision{
 const items=(result?.items||(result?.listing?[result.listing]:[])).slice(0,3),facts=groundedFacts(result),speechGoal=advisoryGoal(message,true),goal=result?.type==='comparison'?(speechGoal==='DECIDE'?'DECIDE':'COMPARE'):speechGoal;
 const quality=qualityOverride?qualityOverride.preferred:allowedPreferences.filter(p=>p.type==='quality'&&Object.hasOwn(qualityAspect,p.value)).map(p=>p.value);
 const preferenceSource=qualityOverride?'CURRENT_TRIP':quality.length?'SAVED_MEMORY':'NONE';
 const options:AdvisoryOption[]=items.map((p:any,index:number)=>{
  const claims:AdvisoryClaim[]=[],insight=p.reviewInsights,aspects=insight?.aspects||{},outcomes:Record<string,string>={};
  for(const key of Object.keys(ASPECT_LABELS)){
   const a=aspects[key];if(!a||!Number.isSafeInteger(a.supportCount)||a.supportCount<1)continue;
   const counts=a.counts;if(!counts||!['POSITIVE','NEGATIVE','MIXED','NEUTRAL','UNKNOWN'].every(k=>Number.isSafeInteger(counts[k])&&counts[k]>=0))continue;
   const mixed=counts.MIXED>0||counts.POSITIVE>0&&counts.NEGATIVE>0,negative=counts.NEGATIVE>0,positive=counts.POSITIVE>0;
   const status=mixed?'MIXED':negative?'CONFLICTING':positive&&counts.UNKNOWN===0?'SUPPORTED':'UNKNOWN';outcomes[key]=status;
   const sample=a.supportCount===1?'Chỉ một đánh giá, chưa đủ để nói là xu hướng.':a.supportCount<5?'Mẫu còn ít, chưa đủ kết luận chắc chắn.':'Nhận xét lặp lại trong mẫu; chưa bảo đảm tính đại diện.';
   claims.push({kind:mixed||negative?'LIMIT':positive?'STRENGTH':'UNKNOWN',criterion:key,text:`${ASPECT_LABELS[key]}: ${counts.POSITIVE} tích cực, ${counts.NEGATIVE} tiêu cực${counts.UNKNOWN?', '+counts.UNKNOWN+' chưa rõ':''}${counts.NEUTRAL?', '+counts.NEUTRAL+' trung tính':''}${mixed?', Ý kiến trái chiều':''} trong ${a.supportCount} đánh giá đề cập. ${sample}`,factIds:['reviews.'+index,'reviewEvidence.'+index],reviewIds:(a.evidence||[]).map((e:any)=>e.reviewId).filter((id:any)=>typeof id==='string'&&/^[0-9a-f-]{36}$/i.test(id))});
  }
  for(const q of quality){const key=qualityAspect[q];if(outcomes[key]==='SUPPORTED')claims.push({kind:'MATCH',criterion:key,text:`Có tín hiệu phù hợp ưu tiên ${qualityLabel[q]} từ các nhận xét đang được phép dùng.`,factIds:['reviews.'+index]});else if(!outcomes[key])claims.push({kind:'UNKNOWN',criterion:key,text:`Chưa có nhận xét để đối chiếu ưu tiên ${qualityLabel[q]}.`,factIds:['reviews.'+index]});}
  if(!Object.keys(outcomes).length)claims.push({kind:'UNKNOWN',text:'Chưa có đủ bình luận công khai được cho phép phân tích để nêu ưu/nhược điểm; mình không tự tạo nhận xét.',factIds:['reviews.'+index]});
  const price=typeof p.priceFrom==='number'&&Number.isFinite(p.priceFrom)&&p.priceFrom>=0?p.priceFrom:null;
  if(price===null)claims.push({kind:'UNKNOWN',text:'TravelGo chưa có giá cho lựa chọn này; cần xác minh giá, đơn vị và tình trạng còn chỗ.',factIds:['unknownPrice.'+index]});
  for(const amenity of result.filters?.amenities||[])if(p.amenities?.includes(amenity))claims.push({kind:'CONDITION',text:'Catalog ghi nhận '+amenity+'.',factIds:['details.'+index]});
  const statuses=quality.map(q=>outcomes[qualityAspect[q]]||'UNKNOWN'),fit=statuses.length&&statuses.every(s=>s==='SUPPORTED')?'SUPPORTED':statuses.includes('CONFLICTING')?'CONFLICTING':statuses.includes('MIXED')?'MIXED':'UNKNOWN';
  return{index,id:p.id,name:p.name,price,claims,fit,reviewCount:insight?.analyzedReviewCount||0,sourceHref:p.href,address:typeof p.address==='string'?p.address.slice(0,220):undefined};
 });
 const supported=options.filter(o=>o.fit==='SUPPORTED'),recommendationIndex=supported.length===1?supported[0].index:null,tradeoffs:AdvisoryClaim[]=[];
 if(options.length>=2){const priced=options.filter(o=>o.price!==null),sameCategory=new Set(items.map((p:any)=>p.category)).size===1,sameCurrency=new Set(items.map((p:any)=>p.currency||'VND')).size===1;if(priced.length>=2&&sameCategory&&sameCurrency){const low=priced.reduce((a,b)=>a.price!<=b.price!?a:b),high=priced.reduce((a,b)=>a.price!>=b.price!?a:b);if(low.price!==high.price)tradeoffs.push({kind:'CONDITION',text:`${low.name} có giá tham khảo catalog thấp nhất trong các lựa chọn có giá, thấp hơn ${high.name}. TravelGo chưa xác minh đơn vị giá nên chưa thể kết luận lựa chọn nào đáng tiền hơn hoặc tổng chi phí thấp hơn.`,factIds:['price.'+low.index,'price.'+high.index]});}
  if(!sameCategory||!sameCurrency)tradeoffs.push({kind:'UNKNOWN',text:'Các lựa chọn không cùng loại dịch vụ hoặc tiền tệ; mình chưa có căn cứ so sánh mức giá hay kết luận nơi nào đáng tiền hơn.',factIds:priced.map(o=>'price.'+o.index)});
  if(new Set(options.map(o=>o.reviewCount)).size>1)tradeoffs.push({kind:'LIMIT',text:'Quy mô mẫu nhận xét khác nhau: '+options.map(o=>`${o.name} có ${o.reviewCount} đánh giá phân tích được`).join('; ')+'. Không so số sao hay coi mẫu nhỏ là chất lượng chắc chắn.',factIds:options.map(o=>'reviews.'+o.index)});
 }
 const decision:AdvisoryDecision={version:'ADVISORY_V51',goal,options,recommendationIndex,preferenceSource,quality,tradeoffs,warnings:['Đây là ý kiến khách hàng, không phải cam kết chất lượng hoặc tiện ích do cơ sở xác minh.','Giá được ghi từ TravelGo; đơn vị giá và tình trạng còn chỗ chưa được xác minh.'],mutationAuthority:false};
 if(['COMPARE','DECIDE','FIT'].includes(goal)&&options.length>1&&!quality.length&&!priority)decision.question=options.some(o=>o.claims.some(c=>c.criterion==='noise'))?'Bạn ưu tiên mức giá tham khảo thấp hơn hay tín hiệu yên tĩnh hơn?':'Bạn muốn ưu tiên mức giá tham khảo hay một tiện ích cụ thể nào?';
 // Claims refer to complete server facts, even when the model only sees a bounded subset.
 for(const o of options)for(const claim of o.claims)claim.factIds=claim.factIds.filter(id=>Object.hasOwn(facts,id));
 if(decisionIntelligenceEnabled()&&profile){decision.decisionProfile=profile;decision.decisionEvidence=analyzeDecision(decision,result,profile);decision.recommendationIndex=decision.decisionEvidence.recommendationIndex;if(!profile.soft.length&&decision.options.length>1)decision.question='Bạn muốn ưu tiên giá tham khảo, tiện ích bắt buộc hay tín hiệu từ nhận xét?';else if(decision.recommendationIndex!==null)decision.question=undefined;}
 return decision;
}
/** Server sentence planning: every variable claim originates in typed catalog/review/context evidence. */
export function composeAdvisory(decision:AdvisoryDecision,result:any,selectedFactIds:string[]=[]){
 if(decisionIntelligenceEnabled()&&decision.decisionProfile&&decision.decisionEvidence&&decision.goal!=='PRICE')return renderDecision(decision,result,decision.decisionProfile,decision.decisionEvidence);
 const facts=groundedFacts(result),picked=[...new Set(selectedFactIds.map(id=>id.match(/\.(\d+)$/)?.[1]).filter(x=>x!==undefined).map(Number))];
 const options=decision.options,mode=decision.goal;
 if(!options.length)return 'Chưa có lựa chọn đủ điều kiện trong dữ liệu TravelGo để mình tư vấn.';
 if(mode==='PRICE'){const o=options[picked[0]??0]||options[0];return o.name+': '+(facts['price.'+o.index]||facts['unknownPrice.'+o.index]);}
 const relevant=['COMPARE','DECIDE'].includes(mode)?[...options]:picked.length?picked.map(i=>options[i]).filter(Boolean):[...options];
 if(decision.recommendationIndex!==null&&!relevant.some(o=>o.index===decision.recommendationIndex))relevant.unshift(options[decision.recommendationIndex]);
 const parts:string[]=[];
 if(mode==='WHY_NOT')parts.push('Mình chưa có căn cứ để nói lựa chọn này bị loại hoặc chắc chắn không phù hợp. Đây là các thông tin có thể đối chiếu từ nguồn TravelGo.');
 if(decision.recommendationIndex!==null&&['COMPARE','DECIDE','SEARCH','WHY'].includes(mode)){const o=options[decision.recommendationIndex];parts.push(`Nếu ưu tiên ${decision.quality.map(q=>qualityLabel[q]).join(', ')}, ${o.name} có tín hiệu phù hợp${options.length>1?' hơn':''} trong mẫu nhận xét đang có; đây là gợi ý có điều kiện, không phải nơi tốt nhất tuyệt đối.`);}
 else if(['COMPARE','DECIDE'].includes(mode))parts.push('Chưa có đủ căn cứ để chọn một nơi tốt hơn tuyệt đối. Mình đối chiếu các điểm đánh đổi đang có.');
 if(decision.preferenceSource==='SAVED_MEMORY'&&decision.quality.length)parts.push('Mình đang đối chiếu những sở thích bạn đã cho phép lưu: '+decision.quality.map(q=>qualityLabel[q]).join(', ')+'.');
 if(decision.preferenceSource==='CURRENT_TRIP')parts.push('Mình ưu tiên yêu cầu của chuyến này; sở thích dài hạn của bạn vẫn giữ nguyên.');
 for(const o of relevant){
  const claims=o.claims.filter(c=>mode==='REVIEWS'?c.kind!=='CONDITION':!c.factIds.some(id=>id.startsWith('unknownPrice.'))),focus=claims;
  const body=[o.name+'.'];
  if(!['REVIEWS','FIT'].includes(mode))body.push(o.price===null?'TravelGo chưa có giá cho lựa chọn này.':`Giá tham khảo từ nguồn TravelGo: ${o.price.toLocaleString('vi-VN')} VND.`);
  if(mode==='SEARCH'&&o.address)body.push('Địa chỉ ghi trong TravelGo: '+o.address+'.');
  if(focus.length)body.push(focus.map(c=>c.text).join(' '));
  if(mode==='DETAILS'&&facts['details.'+o.index])body.push(facts['details.'+o.index]);
  if(!o.claims.some(c=>c.kind==='MATCH')&&mode==='WHY')body.push('Chưa có bằng chứng để nói nơi này phù hợp với sở thích cá nhân hơn các nơi khác; nó xuất hiện từ truy vấn catalog hiện tại.');
  parts.push(body.filter(Boolean).join(' '));
 }
 if(['COMPARE','DECIDE'].includes(mode))parts.push(...decision.tradeoffs.map(c=>c.text));
 if(relevant.some(o=>o.claims.some(c=>c.reviewIds?.length)))parts.push(decision.warnings[0]);
 if(!['REVIEWS','FIT'].includes(mode)&&!(['COMPARE','DECIDE'].includes(mode)&&decision.tradeoffs.some(c=>c.text.includes('chưa xác minh đơn vị'))))parts.push(decision.warnings[1]);
 if((result.items||[result.listing]).some((p:any)=>p?.isDemo))parts.push('Dữ liệu DEMO để kiểm thử, không phải cơ sở hoặc báo giá Booking thật.');
 if(decision.question)parts.push(decision.question);
 return [...new Set(parts)].join('\n\n').replace(/\bcatalog\b/gi,'TravelGo');
}
