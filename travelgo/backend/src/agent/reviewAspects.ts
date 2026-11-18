import {fold} from '../services/registeredCatalogService.js';
export const REVIEW_ANALYSIS_METHOD='BOUNDED_VI_ASPECT_RULES_V3';
export const ASPECT_LABELS:Record<string,string>={cleanliness:'Vệ sinh',price:'Giá cả',location:'Vị trí theo nhận xét',staff:'Nhân viên/phục vụ',amenities:'Tiện ích',room:'Chất lượng phòng',noise:'Tiếng ồn/cách âm',food:'Món ăn',space:'Không gian',wait:'Thời gian chờ',overall:'Trải nghiệm tổng thể'};
export type Sentiment='POSITIVE'|'NEGATIVE'|'NEUTRAL'|'MIXED'|'UNKNOWN';
const aspects:Record<string,RegExp>={cleanliness:/\b(?:sach se|khong sach|ve sinh|ban thiu|do ban|(?:phong|khach san|ks) (?:rat )?(?:sach|ban))\b/,price:/\b(?:gia|dat do|re)\b/,location:/\b(?:vi tri|gan bien|xa bien|gan trung tam|xa trung tam)\b/,staff:/\b(?:nhan vien|phuc vu|le tan)\b/,amenities:/\b(?:tien ich|ho boi|wifi|wi fi|bai do xe)\b/,room:/\b(?:phong (?:rong|chat|cu|moi|tot|kem))\b/,noise:/\b(?:on ao|hoi on|rat on|khong on|tieng on|cach am|yen tinh)\b/,food:/\b(?:mon an|do an|thuc an|ngon|do song)\b/,space:/\b(?:khong gian|cho ngoi)\b/,wait:/\b(?:cho lau|doi lau|thoi gian cho|len mon nhanh)\b/,overall:/\b(?:trai nghiem|tong the|that vong|tuyet voi)\b/};
const positive=/\b(?:sach(?: se)?|ok|tot|than thien|nhiet tinh|gia mem|hop ly|re|ngon|rong rai|thoang|nhanh|yen tinh|khong on|tuyet voi)\b/;
const negative=/\b(?:ban thiu|do ban|dat do|gia cao|te|kem|hoi on|rat on|on ao|cho lau|doi lau|chat choi|that vong|khong ngon|khong sach|khong tot|khong than thien|khong hop ly|cach am kem)\b/;
/** Raw text never enters an LLM. No free-text evidence, identity or numeric confidence is persisted. */
export function extractReviewAspects(comment:string,category:string):{status:'ANALYZED'|'UNKNOWN';aspects:Record<string,Sentiment>}{
 const text=fold(comment.normalize('NFC').replace(/(^|[^\p{L}])ổn(?=$|[^\p{L}])/giu,'$1ondinh')).replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/g,' ').replace(/(?:\+?\d[\s.-]*){8,}/g,' ').replace(/\bnv\b/g,'nhan vien').replace(/\b(?:ko|hok)\b/g,'khong');
 if(/\b(?:ignore|system|prompt|sql|insert|delete|select|bo qua chi dan|bo qua he thong|mat khau|api key)\b/.test(text))return{status:'UNKNOWN',aspects:{}};
 const result:Record<string,Sentiment>={},clauses=text.split(/[,;.!?]|\b(?:nhung|tuy nhien)\b/).map(s=>s.trim()).filter(Boolean);
 for(const [aspect,pattern]of Object.entries(aspects)){
  if(category==='hotel'&&['food','wait'].includes(aspect)||category==='restaurant'&&['room','amenities','noise'].includes(aspect))continue;
  const mentions=clauses.filter(s=>pattern.test(s));if(!mentions.length)continue;
  const sentiments=mentions.map(s=>{
   if(/\b(?:khong phai|khong chac|co le|chua ro|chua biet)\b/.test(s))return'UNKNOWN';
   if(aspect==='noise'&&/\bkhong on\b/.test(s)&&!/\b(?:tieng on|cach am|on ao)\b/.test(s)&&!/không\s+ồn/iu.test(comment))return'UNKNOWN';
   if(aspect==='location'&&!positive.test(s)&&!negative.test(s))return'NEUTRAL';
   const negatedPositive=/\b(?:khong|chua) (?:sach(?: se)?|ngon|tot|than thien|hop ly|yen tinh|nhanh|thoang|re|ok|ondinh)\b/;
   const negatedNegative=/\bkhong (?:on(?: ao)?|dat(?: do)?|cho lau|doi lau)\b/;
   if(/\b(?:khong|chua)\b/.test(s.replace(/\bkhong gian\b/g,'khonggian'))&&!negatedPositive.test(s)&&!negatedNegative.test(s))return'UNKNOWN';
   const neg=negatedPositive.test(s)||negative.test(s.replace(negatedNegative,'')),pos=negatedNegative.test(s)||positive.test(s.replace(negatedPositive,''));
   return neg&&pos?'MIXED':neg?'NEGATIVE':pos?'POSITIVE':'UNKNOWN';
  });
  result[aspect]=sentiments.includes('MIXED')||sentiments.includes('POSITIVE')&&sentiments.includes('NEGATIVE')?'MIXED':sentiments.includes('POSITIVE')?'POSITIVE':sentiments.includes('NEGATIVE')?'NEGATIVE':sentiments.includes('NEUTRAL')?'NEUTRAL':'UNKNOWN';
 }
 return{status:Object.keys(result).length?'ANALYZED':'UNKNOWN',aspects:result};
}
export function summarizeReviewEvidence(rows:{id:string;comment:string;rating:number;verificationStatus:string;aiUsageAllowed:boolean}[],category:string){
 const aggregate:Record<string,any>={};let analyzed=0,unknown=0;
 for(const row of rows){if(!row.aiUsageAllowed)continue;const analysis=extractReviewAspects(row.comment,category);if(analysis.status==='UNKNOWN'){unknown++;continue;}analyzed++;
  for(const [aspect,sentiment]of Object.entries(analysis.aspects)){const entry=aggregate[aspect]||={label:ASPECT_LABELS[aspect],counts:{POSITIVE:0,NEGATIVE:0,NEUTRAL:0,MIXED:0,UNKNOWN:0},evidence:[]};entry.counts[sentiment]++;entry.evidence.push({reviewId:row.id,sentiment});}
 }
 for(const entry of Object.values(aggregate) as any[]){const c=entry.counts;entry.supportCount=entry.evidence.length;entry.sentiment=c.MIXED||c.POSITIVE&&c.NEGATIVE?'MIXED':c.POSITIVE?'POSITIVE':c.NEGATIVE?'NEGATIVE':c.NEUTRAL?'NEUTRAL':'UNKNOWN';entry.strength=entry.supportCount>=5?'REPEATED_REPORTS':entry.supportCount>=2?'LIMITED_REPORTS':'SINGLE_REVIEW';entry.evidenceBasis='EXPLICIT_LEXICAL_RULES_NOT_CALIBRATED_MODEL_CONFIDENCE';}
 return{method:REVIEW_ANALYSIS_METHOD,validReviewCount:rows.length,analyzedReviewCount:analyzed,unknownReviewCount:unknown,rating:rows.length?rows.reduce((s,r)=>s+Number(r.rating),0)/rows.length:null,verifiedBookingCount:rows.filter(r=>r.verificationStatus==='VERIFIED').length,aspects:aggregate,opinionOnly:true};
}
