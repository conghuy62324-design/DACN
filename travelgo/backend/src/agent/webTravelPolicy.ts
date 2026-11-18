import {safeKnowledgeText,safeKnowledgeUrl,usableKnowledge,type KnowledgeItem} from './travelKnowledge.js';
import {eligibleCostEvidence,independentCostSources} from './costIntelligence.js';
import {reviewedExtraction} from './webTravelExtraction.js';
import {resolveLocation} from '../geography/vietnam.js';
import {webFailure,robotsAllowed,webUrl} from '../services/travelWebHttp.js';
import type {SourceClass,WebExtraction} from './webTravelExtraction.js';
export type WebSource={domain:string;publisher:string;sourceClass:SourceClass;homepage:string;method:'RSS'|'API'|'SITEMAP'|'ARTICLE';endpoint?:string;articleUrls:string[];permissionUrl:string;license:string;identityEvidence:string;robotsText:string;robotsReviewedAt:string;intervalHours:number;rateSeconds:number;retentionDays:number;independenceGroup?:string;independenceEvidenceUrl?:string};
export type SourceRecord=WebSource&{id:string;version:number;permission:'UNKNOWN'|'ALLOWED'|'DENIED';reviewStatus:'UNREVIEWED'|'APPROVED'|'REVOKED';enabled:boolean};
const classes=['OFFICIAL','EDITORIAL','COMMUNITY_EXPERIENCE','COMMERCIAL','UNKNOWN'];
export function sourceDraft(raw:any):WebSource{
 const fields=['domain','publisher','sourceClass','homepage','method','endpoint','articleUrls','permissionUrl','license','identityEvidence','robotsText','robotsReviewedAt','intervalHours','rateSeconds','retentionDays','independenceGroup','independenceEvidenceUrl'];
 if(!raw||Array.isArray(raw)||Object.keys(raw).some(k=>!fields.includes(k))||typeof raw.domain!=='string'||!/^(?=.{1,253}$)[a-z0-9]+(?:[.-][a-z0-9]+)*\.[a-z]{2,}$/.test(raw.domain)||!safeKnowledgeText(raw.publisher,100)||!classes.includes(raw.sourceClass)||!['RSS','API','SITEMAP','ARTICLE'].includes(raw.method)||!Array.isArray(raw.articleUrls)||raw.articleUrls.length>3||!safeKnowledgeText(raw.license,120)||!safeKnowledgeUrl(raw.permissionUrl)||!safeKnowledgeUrl(raw.identityEvidence)||typeof raw.robotsText!=='string'||raw.robotsText.length>131072||!Number.isFinite(Date.parse(raw.robotsReviewedAt))||Date.parse(raw.robotsReviewedAt)>Date.now()||!Number.isInteger(raw.intervalHours)||raw.intervalHours<6||raw.intervalHours>168||!Number.isInteger(raw.rateSeconds)||raw.rateSeconds<5||raw.rateSeconds>86400||!Number.isInteger(raw.retentionDays)||raw.retentionDays<1||raw.retentionDays>90)throw webFailure('WEB_SOURCE_INVALID');
 if(raw.sourceClass==='OFFICIAL'&&new URL(raw.identityEvidence).hostname===raw.domain)throw webFailure('WEB_INDEPENDENT_IDENTITY_REQUIRED');
 if(raw.independenceGroup!==undefined&&(!safeKnowledgeText(raw.independenceGroup,100)||!safeKnowledgeUrl(raw.independenceEvidenceUrl))||raw.independenceEvidenceUrl!==undefined&&!raw.independenceGroup)throw webFailure('WEB_INDEPENDENCE_EVIDENCE_REQUIRED');
 const domains=new Set<string>([raw.domain]);webUrl(raw.homepage,domains);if(raw.endpoint)webUrl(raw.endpoint,domains,true);raw.articleUrls.forEach((u:any)=>{if(typeof u!=='string')throw webFailure('WEB_SOURCE_INVALID');webUrl(u,domains);});if(raw.method!=='ARTICLE'&&!raw.endpoint||raw.method==='ARTICLE'&&!raw.articleUrls.length)throw webFailure('WEB_SOURCE_INVALID');return{...raw};
}
/** Discovery and permission never grant customer approval. License pages are not travel evidence. */
export function publisherFamily(url:string):string|null{try{const h=new URL(url).hostname.toLowerCase().replace(/^www\./,'');if(h==='creativecommons.org')return null;if(h==='wikivoyage.org'||h.endsWith('.wikivoyage.org'))return 'wikivoyage';if(h==='wikitravel.org'||h.endsWith('.wikitravel.org'))return 'wikitravel';if(h==='unesco.org'||h.endsWith('.unesco.org'))return 'unesco';return h;}catch{return null;}}
export function sourceCapabilities(s:SourceRecord,now=Date.now()){
 const permission=s.permission==='ALLOWED'&&s.reviewStatus==='APPROVED'&&s.license!=='UNVERIFIED'&&safeKnowledgeText(s.license,120)&&safeKnowledgeUrl(s.permissionUrl),robots=Number.isFinite(Date.parse(s.robotsReviewedAt))&&now-Date.parse(s.robotsReviewedAt)<7*86400000&&Date.parse(s.robotsReviewedAt)<=now;
 const fetchAllowed=!!(permission&&robots&&s.enabled&&s.sourceClass!=='UNKNOWN');
 return{discovered:true,permissionPending:s.permission==='UNKNOWN'||s.reviewStatus==='UNREVIEWED',fetchAllowed,extractionAllowed:fetchAllowed&&publisherFamily(s.homepage)!==null,retentionAllowed:!!permission&&Number.isInteger(s.retentionDays)&&s.retentionDays>=1&&s.retentionDays<=90,customerApproved:false as const};
}
export function sourceUsable(s:SourceRecord,now=Date.now()){return s.enabled&&s.permission==='ALLOWED'&&s.reviewStatus==='APPROVED'&&s.sourceClass!=='UNKNOWN'&&now-Date.parse(s.robotsReviewedAt)<7*86400000&&Date.parse(s.robotsReviewedAt)<=now;}
export function boundedSourceIds(ids?:string[]){if(ids===undefined)return undefined;if(!Array.isArray(ids)||!ids.length||ids.length>4||new Set(ids).size!==ids.length||ids.some(id=>typeof id!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)))throw webFailure('WEB_SCOPE_INVALID');return[...ids];}
export function allowedSourceUrl(s:SourceRecord,url:string,now=Date.now()){
 if(!sourceUsable(s,now)||!sourceCapabilities(s,now).extractionAllowed)throw webFailure('WEB_SOURCE_NOT_APPROVED');const u=webUrl(url,new Set([s.domain]),s.endpoint===url);if(!robotsAllowed(s.robotsText,u.pathname+u.search))throw webFailure('WEB_ROBOTS_DENIED');return u.href;
}
export function publicSearchQuery(raw:{locationId:string;topic:string;days?:number}){
 const geo=resolveLocation(raw.locationId);if(!geo||geo.id!==raw.locationId||raw.locationId==='all'||!['cost','visit','hours','preparation','overview','experience','culture','rules','family'].includes(raw.topic)||raw.days!==undefined&&(!Number.isInteger(raw.days)||raw.days<1||raw.days>10))throw webFailure('WEB_QUERY_INVALID');const topics:Record<string,string>={cost:'chi phí du lịch tham khảo',visit:'kinh nghiệm du lịch',hours:'giờ mở cửa du lịch',preparation:'chuẩn bị du lịch',overview:'thông tin du lịch',experience:'trải nghiệm du lịch',culture:'văn hóa du lịch',rules:'quy định du lịch',family:'du lịch gia đình'};return`${topics[raw.topic]} ${geo.name}${raw.days?' '+raw.days+' ngày':''}`;
}
export function candidateSummary(x:WebExtraction){return`${x.title}. ${x.facts.map(f=>f.summary).join(' ')} Nguồn bên ngoài phản ánh thời điểm bài viết; chưa phải báo giá hiện tại hoặc giá Booking.`.slice(0,900);}
export function observationMatches(x:WebExtraction,filters:{locationId:string;days?:number;party?:number;origin?:string;travelPeriod?:string;category?:string;unit?:string}){return x.locationId===filters.locationId&&(filters.days===undefined||x.days===filters.days)&&(filters.party===undefined||x.party===filters.party)&&(filters.origin===undefined||x.origin===filters.origin)&&(filters.travelPeriod===undefined||x.travelPeriod===filters.travelPeriod)&&x.costs.some(c=>(!filters.category||(c.costCategory||c.category)===filters.category||c.category===filters.category)&&(!filters.unit||c.unit===filters.unit));}

export const COVERAGE_DIMENSIONS=['DESTINATION','ACCOMMODATION','FOOD','TRANSPORT','ATTRACTION','ADMISSION','TOUR_ACTIVITY','LOCAL_SPECIALTY','SEASON','TIP','HISTORICAL_COST','OFFICIAL_RULES'] as const;
const GAP_REASONS=['MISSING_COVERAGE','INDEPENDENT_SOURCE_MISSING','OBSERVATION_PERIOD_MISSING','EXPIRING_KNOWLEDGE','CONFLICTING_EVIDENCE'] as const;
/** A proposal is public canonical metadata, never a fetch grant or customer transcript. */
export function publicGapProposal(raw:{locationId:string;topic:string;dimension:string;reason:string}){
 if(!raw||Object.keys(raw).some(k=>!['locationId','topic','dimension','reason'].includes(k))||![...COVERAGE_DIMENSIONS,'INDEPENDENT_SOURCES','OBSERVATION_PERIOD'].includes(raw.dimension as any)||!GAP_REASONS.includes(raw.reason as any))throw webFailure('WEB_QUERY_INVALID');
 return{...raw,query:publicSearchQuery({locationId:raw.locationId,topic:raw.topic}),approvalRequired:true as const,externalRequestDispatched:false as const,mutationAuthority:false as const};
}
/** Bounded admin projection over existing repositories. It grants no retrieval or review authority. */
export function knowledgeCoverage(input:{approved:KnowledgeItem[];sources:SourceRecord[];candidates:any[];jobs:any[]},now=Date.now()){
 const sources=input.sources.slice(0,50),candidates=input.candidates.slice(0,50),eligibleIds=new Set(input.approved.map(k=>k.placeId).filter(Boolean) as string[]);
 const active=input.approved.slice(0,100).filter(k=>usableKnowledge(k,now,eligibleIds)).filter(k=>{
  if(k.sourceType!=='EXTERNAL_REVIEWED')return true;
  const s=sources.find(s=>s.id===k.provenance.webSourceId),c=candidates.find(c=>c.id===k.provenance.webCandidateId);
  return !!s&&sourceUsable(s,now)&&s.version===k.provenance.webSourceVersion&&!!c&&c.status==='APPROVED'&&c.knowledge_id===k.id&&c.source_version===s.version&&c.version===Number(k.provenance.webCandidateVersion)+1&&c.content_hash===k.provenance.evidenceHash;
 });
 const ids=[...new Set([...input.approved.map(k=>k.locationId),...candidates.map(c=>c.extraction?.locationId)])].filter(id=>resolveLocation(id)?.id===id&&id!=='all').slice(0,10);
 const locations=ids.map(locationId=>{
  const items=active.filter(k=>k.locationId===locationId),rows=eligibleCostEvidence(items,now),facts=items.flatMap(k=>{const x=k.provenance.external as WebExtraction|undefined;return x?reviewedExtraction(x)?.facts||[]:[];}),dimensions=Object.fromEntries(COVERAGE_DIMENSIONS.map(d=>[d,{count:0}]));
  for(const r of rows){const category=r.observation.costCategory!;if(dimensions[category])dimensions[category].count++;if(r.observation.pricedObject==='ATTRACTION_ADMISSION')dimensions.ADMISSION.count++;if(r.trip.travelPeriod)dimensions.HISTORICAL_COST.count++;}
  for(const f of facts){if(f.kind==='ACTIVITY')dimensions.TOUR_ACTIVITY.count++;if(f.kind==='LOCAL_CUISINE')dimensions.LOCAL_SPECIALTY.count++;if(['TRAVEL_TIP','PREPARATION'].includes(f.kind))dimensions.TIP.count++;if(f.kind==='TRAVEL_SEASON')dimensions.SEASON.count++;}
  dimensions.DESTINATION.count=facts.filter(f=>f.kind==='DESTINATION').length;
  dimensions.OFFICIAL_RULES.count=items.filter(k=>(k.provenance.external as WebExtraction)?.sourceClass==='OFFICIAL').flatMap(k=>reviewedExtraction(k.provenance.external as WebExtraction)?.facts||[]).filter(f=>f.kind==='REGULATION').length;
  const authorities=new Set<string>();for(const k of items){const cls=(k.provenance.external as WebExtraction)?.sourceClass;authorities.add(cls==='OFFICIAL'?'OFFICIAL_INFORMATION':cls==='COMMERCIAL'?'PROVIDER_PUBLISHED_INFORMATION':cls==='EDITORIAL'?'EDITORIAL_ARTICLE':cls==='COMMUNITY_EXPERIENCE'?'PERSONAL_TRAVEL_EXPERIENCE':'UNKNOWN_CLAIM');}
  for(const r of rows){const o=r.observation;authorities.add(o.validityKind==='CURRENT_TARIFF'&&['OFFICIAL','COMMERCIAL'].includes(r.sourceClass)&&o.validFrom&&o.validUntil&&Date.parse(o.validFrom)<=now&&Date.parse(o.validUntil)>now?'CURRENT_VERIFIED_TARIFF':r.trip.travelPeriod?'HISTORICAL_PRICE_OBSERVATION':'UNKNOWN_PERIOD_OBSERVATION');}
  const expiringKnowledgeIds=items.filter(k=>k.expiresAt&&Date.parse(k.expiresAt)-now<=7*86400000).map(k=>k.id),independentPublishers=independentCostSources(rows),publisherFamilies=new Set(items.map(k=>k.sourceUrl&&publisherFamily(k.sourceUrl)).filter(Boolean)).size;
  const gaps:ReturnType<typeof publicGapProposal>[]=[],push=(dimension:string,reason:string,topic='cost')=>gaps.push(publicGapProposal({locationId,topic,dimension,reason}));
  if(expiringKnowledgeIds.length)push('HISTORICAL_COST','EXPIRING_KNOWLEDGE');if(independentPublishers<3)push('INDEPENDENT_SOURCES','INDEPENDENT_SOURCE_MISSING');if(rows.some(r=>!r.trip.travelPeriod))push('OBSERVATION_PERIOD','OBSERVATION_PERIOD_MISSING');if(candidates.some(c=>c.extraction?.locationId===locationId&&c.quality==='CONFLICTING'))push('HISTORICAL_COST','CONFLICTING_EVIDENCE');
  for(const d of COVERAGE_DIMENSIONS)if(!dimensions[d].count)push(d,'MISSING_COVERAGE',['DESTINATION','TOUR_ACTIVITY','LOCAL_SPECIALTY','SEASON','TIP'].includes(d)?'visit':d==='OFFICIAL_RULES'?'rules':'cost');
  return{locationId,name:resolveLocation(locationId)!.name,activeKnowledge:items.length,dimensions,authorities:[...authorities],publisherFamilies,independentPublishers,expiringKnowledgeIds,gaps:gaps.slice(0,12)};
 });
 const jobs=input.jobs.slice(0,50),leased=(j:any)=>j.lease_until&&Date.parse(j.lease_until)>now;
 return{status:'READ_ONLY_PUBLIC_KNOWLEDGE_PROJECTION',locations,jobs:{total:jobs.length,due:jobs.filter(j=>j.attempts<12&&Date.parse(j.next_due)<=now&&!leased(j)).length,leased:jobs.filter(leased).length,recoverableLeases:jobs.filter(j=>j.lease_until&&Date.parse(j.lease_until)<=now).length,failed:jobs.filter(j=>j.last_error).length,exhausted:jobs.filter(j=>j.attempts>=12).length},externalRequests:0,mutationAuthority:false,reviewRequired:true};
}
