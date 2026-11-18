import {extractCostObservations,unitLabel,reportedCostLabel,type CostObservation,type CostDocumentSegment} from './costIntelligence.js';
export type {CostObservation} from './costIntelligence.js';
import {createHash} from 'node:crypto';
import {resolveLocation} from '../geography/vietnam.js';
import {normalizeVietnamese,literalVietnamese,travelLocations} from './vietnameseNormalizer.js';
import {safeKnowledgeText} from './travelKnowledge.js';
import {webUrl,webFailure} from '../services/travelWebHttp.js';
export const evidenceHash=(v:string)=>createHash('sha256').update(v).digest('hex');
export type SourceClass='OFFICIAL'|'EDITORIAL'|'COMMUNITY_EXPERIENCE'|'COMMERCIAL'|'UNKNOWN';
export type ReviewSelection={observationIds:string[];factHashes:string[]};
export type WebExtraction={reviewSelection?:ReviewSelection;title:string;canonicalUrl:string;publisher:string;sourceClass:SourceClass;publishedAt:string|null;updatedAt:string|null;retrievedAt:string;travelPeriod:string|null;locationId:string;days:number|null;nights:number|null;party:number|null;rooms?:number|null;origin:string|null;transportation:string|null;accommodationType:string|null;travelStyle:string|null;contentHash:string;nearHash:string[];originatingUrl:string|null;facts:Array<{kind:string;summary:string;evidenceHash:string;evidence?:{locator:string;quote:string;headings:string[]}}>;costs:CostObservation[];quality:'UNREVIEWED'|'INCOMPLETE'|'STALE';synthetic?:boolean;originatingTripId?:string|null;reviewRevisions?:unknown[];manualCorrection?:unknown};
const decode=(s:string)=>s.replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g,m=>({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '}[m]!)).replace(/&#(x[0-9a-f]+|\d{1,7});/gi,(_,n)=>{const v=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):+n;return v>=32&&v<=0x10ffff?String.fromCodePoint(v):' ';});
/** Quote-aware tags: attribute values are never article text, even when they contain >. */
const htmlTag=/<(?:[^"'<>]|"[^"]*"|'[^']*')*>/g;
function stripTags(html:string){return html.replace(htmlTag,' ');}
function canonicalTags(html:string){return html.replace(htmlTag,tag=>{if(tag.length>10000)throw webFailure('WEB_DOCUMENT_UNSAFE');const name=/^<\/?([a-z][a-z0-9-]*)\b/i.exec(tag)?.[1];if(!name)return ' ';const attrs=attributes(tag);return '<'+(tag.startsWith('</')?'/':'')+name.toLowerCase()+(attrs.class?.split(/\s+/).includes('mw-parser-output')?' class="mw-parser-output"':'')+(attrs['data-cost-row']==='true'?' data-cost-row="true"':'')+'>';});}
/** Bounded tokenizer, never executes HTML. Only article/main text is used; raw HTML is not stored. */
export function articleParts(html:string){
 if(Buffer.byteLength(html)>524288||/<!ENTITY|<!DOCTYPE[^>]*(?:SYSTEM|PUBLIC)/i.test(html))throw webFailure('WEB_DOCUMENT_UNSAFE');
 const tags=html.match(htmlTag)||[];const metadata:Record<string,string>={};for(const tag of tags.filter(t=>/^<meta\b/i.test(t))){const a=attributes(tag),key=a.property||a.name;if(key&&a.content)metadata[key.toLowerCase()]=decode(a.content).trim();}
 const canonical=tags.filter(t=>/^<link\b/i.test(t)).map(attributes).find(a=>a.rel?.toLowerCase()==='canonical')?.href;
 const title=metadata['og:title']||decode(/<title[^>]*>([\s\S]{0,1000}?)<\/title>/i.exec(html)?.[1]||'').replace(/<[^>]*>/g,'').trim();
 html=canonicalTags(html);
 const main=/<article\b[^>]*>([\s\S]*?)<\/article>/i.exec(html)?.[1]||/<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html)?.[1]||/<div[^>]*class=["'][^"']*mw-parser-output[^"']*["'][^>]*>([\s\S]*)/i.exec(html)?.[1];
 if(!main)throw webFailure('WEB_ARTICLE_BODY_MISSING');
 const tabular=main.replace(/<table\b[^>]*>([\s\S]*?)<\/table>/gi,(_,table)=>{let headers:string[]=[];return[...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(row=>{const cells=[...row[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(c=>decode(stripTags(c[1])).trim());if(/<th\b/i.test(row[1])){headers=cells;return '';}return '<p data-cost-row="true">'+cells.map((v,i)=>(headers[i]||'')+': '+v).join('; ')+'</p>';}).join('');});
 const rawText=decode(stripTags(tabular.replace(/<!--[^]*?-->/g,' ').replace(/<(script|style|nav|footer|form|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<\/(?:p|div|li|tr|h[1-6]|section)>/gi,'\n')));
 if(/ignore\s+(?:all|previous|system)|system\s*prompt|bypass|bo qua (?:he thong|chi dan)|\b(?:insert|delete|drop|truncate)\s+(?:table|from|into)/i.test(normalizeVietnamese(rawText).normalized))throw webFailure('WEB_UNTRUSTED_CONTENT');
 // Contact/credential paragraphs are not travel facts. Reject instructions, discard PII; never persist raw text.
 const segments=rawText.split(/\n/).map(s=>s.replace(/\s+/g,' ').trim()).filter(s=>safeKnowledgeText(s,6000)).slice(0,400);const text=segments.join(' ').slice(0,120000);
 if(!text||!safeKnowledgeText(text,120000))throw webFailure('WEB_UNTRUSTED_CONTENT');
 return{title,canonical,metadata,text,segments,contextSegments:structuredArticleSegments(tabular)};
}﻿/** Structural context stays in the source section; no arbitrary previous-paragraph inheritance. */
function structuredArticleSegments(html:string):CostDocumentSegment[]{
 const clean=html.replace(/<!--[^]*?-->/g,' ').replace(/<(script|style|nav|footer|form|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi,' '),out:CostDocumentSegment[]=[],headings:Array<{level:number;text:string;locator:string}>=[];let buffer='',headingLevel=0,kind:CostDocumentSegment['kind']='PARAGRAPH',block=0,heading=0;
 const flush=()=>{const text=decode(buffer).replace(/\s+/g,' ').trim();buffer='';if(!text)return;const locator='body:block:'+block++;if(headingLevel){headings.splice(headings.findIndex(h=>h.level>=headingLevel)<0?headings.length:headings.findIndex(h=>h.level>=headingLevel));if(safeKnowledgeText(text,90))headings.push({level:headingLevel,text,locator:'body:heading:'+heading++});else headings.length=0;return;}if(out.length<400&&safeKnowledgeText(text,6000))out.push({text,locator,kind,headings:headings.map(({text,locator})=>({text,locator})),...(kind==='TABLE_ROW'?{tableHeaders:text.split(';').slice(0,12).map(c=>c.split(':')[0].trim()).filter(c=>safeKnowledgeText(c,90))}:{})});};
 for(const token of clean.match(/<(?:[^"'<>]|"[^"]*"|'[^']*')*>|[^<]+/g)||[]){if(token[0]!=='<'){buffer+=' '+token;continue;}const open=/^<(h[1-6]|p|li|tr|div|section|table)\b/i.exec(token),close=/^<\/(h[1-6]|p|li|tr|div|section|table)\b/i.exec(token);if(open){flush();headingLevel=/^h/i.test(open[1])?Number(open[1][1]):0;kind=open[1].toLowerCase()==='tr'||/data-cost-row="true"/.test(token)?'TABLE_ROW':open[1].toLowerCase()==='li'?'LIST_ITEM':'PARAGRAPH';}else if(close){flush();headingLevel=0;kind='PARAGRAPH';}else if(/^<br\b/i.test(token))buffer+=' ';}flush();return out;
}

function attributes(tag:string){const out:Record<string,string>={};for(const m of tag.matchAll(/([a-z-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi))out[m[1].toLowerCase()]=decode(m[2]??m[3]);return out;}
function date(v:string|undefined){if(!v||!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(v)||!Number.isFinite(Date.parse(v)))return null;return new Date(v).toISOString();}
export function extractTravelArticle(html:string,url:string,source:{domain:string;publisher:string;sourceClass:SourceClass},retrievedAt=new Date().toISOString()):WebExtraction{
 const p=articleParts(html),canonical=webUrl(new URL(p.canonical||url,url).href,new Set([source.domain])).href,title=p.title.slice(0,160),normalized=literalVietnamese(p.text);
 if(!safeKnowledgeText(title,160))throw webFailure('WEB_TITLE_UNSAFE');
 const titleLocations=travelLocations(normalizeVietnamese(title).normalized),locations=titleLocations.length?titleLocations:travelLocations(normalizeVietnamese(p.text.slice(0,800)).normalized),ids=[...new Set(locations.map(l=>l.geo.id).filter(id=>id.startsWith('destination:')))];
 if(ids.length!==1)throw webFailure('WEB_LOCATION_AMBIGUOUS');
 const duration=/\b(\d{1,2})\s*(?:n|ngay)\s*(\d{1,2})\s*(?:d|dem)\b/.exec(normalized),party=/\b(?:nhom|doan|gom|chung toi co)\s*(\d{1,2})\s*nguoi\b/.exec(normalized),travelPeriod=/\b(?:chuyen di|da di|di vao|thuc hien)\s*(?:thang\s*)?(\d{1,2}\/\d{4}|\d{4}-\d{2}(?:-\d{2})?)\b/.exec(normalized)?.[1]||null;
 const costs=extractCostObservations(p.contextSegments,travelPeriod);
 const publishedAt=date(p.metadata['article:published_time']||p.metadata['date']),updatedAt=date(p.metadata['article:modified_time']),days=duration?+duration[1]:null,nights=duration?+duration[2]:Number(/\b(\d{1,2})\s*dem\b/.exec(normalized)?.[1])||null;
 const facts:WebExtraction['facts']=costs.slice(0,3).map(c=>({kind:'REPORTED_COST',summary:`Nguồn ghi nhận ${reportedCostLabel(c)}; thời điểm, phạm vi và khoản thiếu phải đối chiếu nguồn.`,evidenceHash:c.evidenceHash}));
 for(const sentence of normalized.split(/[!?;]|\.(?!\d)/).slice(0,400)){
  if(facts.length>=8)break;
  const hours=/\bmo cua\s*(?:tu\s*)?(\d{1,2})[:h](\d{2})\s*(?:den|[-–])\s*(\d{1,2})[:h](\d{2})\b/.exec(sentence);
  if(hours&&+hours[1]<24&&+hours[3]<24&&+hours[2]<60&&+hours[4]<60)facts.push({kind:'REPORTED_HOURS',summary:`Bài viết nêu khung giờ ${hours[1]}:${hours[2]}–${hours[3]}:${hours[4]}; cần xác nhận điểm áp dụng và ngày hiệu lực với đơn vị quản lý.`,evidenceHash:evidenceHash(sentence)});
  if(/\b(?:can|nen) mang ao am\b/.test(sentence))facts.push({kind:'PREPARATION',summary:'Nguồn khuyến nghị mang áo ấm; không thay cho dự báo thời tiết hoặc điều kiện chuyến đi thực tế.',evidenceHash:evidenceHash(sentence)});
  if(/\b(?:nen|can) dat (?:ve|phong) truoc\b/.test(sentence))facts.push({kind:'TRAVEL_TIP',summary:'Nguồn khuyến nghị kiểm tra và đặt dịch vụ trước; chưa xác nhận giá, chính sách hoặc còn chỗ.',evidenceHash:evidenceHash(sentence)});
 }
 if(!facts.length)facts.push({kind:'ARTICLE_METADATA',summary:`Bài viết liên quan ${resolveLocation(ids[0])!.name}; chưa trích xuất được chi phí có đơn vị rõ ràng.`,evidenceHash:evidenceHash(p.text)});
 // Preserve small, source-attributed non-price facts; no generated quality/availability claims.
 for(const segment of p.contextSegments){if(facts.length>=8)break;for(const quote of segment.text.split(/[!?;]|\.(?!\d)/).map(s=>s.trim())){if(facts.length>=8)break;if(quote.length<18||!safeKnowledgeText(quote,240)||/\d/.test(quote))continue;const text=literalVietnamese(quote),kind=/\b(?:dac san|am thuc dia phuong|local specialit(?:y|ies)|local cuisine)\b/.test(text)?'LOCAL_CUISINE':/\b(?:hoat dong|di bo|leo nui|tham quan|activities|hiking|walking trail)\b/.test(text)?'ACTIVITY':/\b(?:di san|van hoa|heritage|culture)\b/.test(text)?'CULTURE':null;if(kind&&!facts.some(f=>f.evidenceHash===evidenceHash(quote)))facts.push({kind,summary:'Nguồn mô tả: '+quote+'. Cần đối chiếu điều kiện áp dụng trước chuyến đi.',evidenceHash:evidenceHash(quote),evidence:{locator:segment.locator,quote,headings:(segment.headings||[]).map(h=>h.text).slice(-3)}});}}
 const words=normalized.split(/\s+/),nearHash=[...new Set(words.slice(0,2000).map((_,i)=>evidenceHash(words.slice(i,i+5).join(' ')).slice(0,12)))].slice(0,256);
 const origin=travelLocations(normalized).find(l=>l.role==='departureCity')?.geo.catalogName||null;
 return{title,canonicalUrl:canonical,publisher:source.publisher,sourceClass:source.sourceClass,publishedAt,updatedAt,retrievedAt,travelPeriod,locationId:ids[0],days,nights,party:party?+party[1]:null,rooms:Number(/\b(?:thue|dat|su dung)\s*(\d{1,2})\s*phong\b/.exec(normalized)?.[1])||null,origin,transportation:/\b(?:di chuyen|chung toi di|phuong tien) (?:bang |la )?xe may\b/.test(normalized)?'motorbike':/\b(?:di chuyen|chung toi di|phuong tien) (?:bang |la )?may bay\b/.test(normalized)?'plane':null,accommodationType:/\b(?:luu tru|o) (?:tai |o )?homestay\b/.test(normalized)?'homestay':null,travelStyle:/\bphong cach (?:nghi duong|thu gian)\b/.test(normalized)?'relaxed':/\bphong cach (?:kham pha|trai nghiem)\b/.test(normalized)?'packed':null,contentHash:evidenceHash(p.text),nearHash,originatingUrl:p.metadata['article:source']&&p.metadata['article:source'].length<600?p.metadata['article:source']:null,facts,costs,quality:publishedAt&&Date.parse(retrievedAt)-Date.parse(updatedAt||publishedAt)>180*86400000?'STALE':!publishedAt||costs.some(c=>c.unit==='UNKNOWN_UNIT')?'INCOMPLETE':'UNREVIEWED'};
}
export function duplicateArticle(a:WebExtraction,b:WebExtraction){if(a.canonicalUrl===b.canonicalUrl&&a.contentHash===b.contentHash||a.contentHash===b.contentHash||a.originatingUrl&&a.originatingUrl===b.originatingUrl)return true;const common=a.nearHash.filter(h=>b.nearHash.includes(h)).length;return Math.min(a.nearHash.length,b.nearHash.length)>20&&common/Math.max(a.nearHash.length,b.nearHash.length)>.85;}
/** An unchanged refresh is scoped to the exact source/version/article, never another publisher. */
/** Compare typed evidence, never a page hash, timestamp or navigation caption alone. */
export function diffKnowledge(previous:WebExtraction|undefined,next:WebExtraction){
 const changes:Array<{field:string;previous:unknown;proposed:unknown}>=[],clean=(v:any)=>typeof v==='string'?literalVietnamese(v).replace(/\s+/g,' ').trim():v??null;
 const add=(field:string,a:any,b:any)=>{if(JSON.stringify(a)!==JSON.stringify(b))changes.push({field,previous:a??null,proposed:b??null});};
 for(const key of ['canonicalUrl','locationId','travelPeriod','days','nights','party','rooms','origin','transportation','accommodationType','travelStyle'] as const)add(key,clean(previous?.[key]),clean(next[key]));
 const prices=(x?:WebExtraction)=>x?.costs.slice(0,12)||[];
 const a=prices(previous),b=prices(next);
 for(let i=0;i<Math.max(a.length,b.length);i++){
  if(!a[i]||!b[i]){add('costs.'+i,a[i]||null,b[i]||null);continue;}
  for(const key of ['amount','amountMin','amountMax','priceBound','currency','unit','costCategory','pricedObject','included','excluded','inclusionStatus','promotion','validFrom','validUntil','validityKind'] as const){const value=(o:CostObservation)=>Array.isArray(o[key])?[...(o[key] as string[])].map(clean).sort():clean(o[key]);add('costs.'+i+'.'+key,value(a[i]),value(b[i]));}
  add('costs.'+i+'.transportKind',a[i].sourceContext?.transportKind??null,b[i].sourceContext?.transportKind??null);
 }
 const facts=(x?:WebExtraction)=>x?.facts.filter(f=>!['ARTICLE_METADATA','REPORTED_COST'].includes(f.kind)).map(f=>({kind:f.kind,summary:clean(f.summary),quote:clean(f.evidence?.quote)})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))||[];
 add('facts',facts(previous),facts(next));
 const bounded:typeof changes=[];for(const change of changes.slice(0,80)){if(Buffer.byteLength(JSON.stringify([...bounded,change]))>16000)break;bounded.push(change);}
 return{kind:!previous?'NEW':!changes.length?'UNCHANGED':previous.costs.length&&!next.costs.length?'REMOVED':'CHANGED',changes:bounded,truncated:bounded.length<changes.length,approvalRequired:changes.length>0,publishedAt:next.publishedAt,observedPeriod:next.travelPeriod,retrievedAt:next.retrievedAt};
}
export function classifyRefresh(prior:Array<{source_id:string;source_version:number;canonical_url:string;content_hash:string;status:string;extraction?:WebExtraction}>,sourceId:string,version:number,x:WebExtraction){return prior.some(r=>r.source_id===sourceId&&r.source_version===version&&r.canonical_url===x.canonicalUrl&&!['REJECTED','STALE'].includes(r.status)&&(r.content_hash===x.contentHash||r.extraction&&diffKnowledge(r.extraction,x).kind==='UNCHANGED'))?'UNCHANGED':'NEW_DRAFT';}
export function conflictingCosts(a:WebExtraction,b:WebExtraction){return a.locationId===b.locationId&&a.days===b.days&&a.party===b.party&&a.travelPeriod!==null&&a.travelPeriod===b.travelPeriod&&a.transportation===b.transportation&&a.costs.some(x=>x.unit!=='UNKNOWN_UNIT'&&x.pricedObject&&x.pricedObject!=='UNKNOWN'&&b.costs.some(y=>x.category===y.category&&x.pricedObject===y.pricedObject&&x.sourceContext?.transportKind===y.sourceContext?.transportKind&&x.currency===y.currency&&x.unit===y.unit&&JSON.stringify([x.included,x.excluded])===JSON.stringify([y.included,y.excluded])&&x.amount!==null&&y.amount!==null&&x.amount!==y.amount));}
export function discoverLinks(xml:string,domain:string){if(Buffer.byteLength(xml)>524288||/<!DOCTYPE|<!ENTITY/i.test(xml))throw webFailure('WEB_XML_UNSAFE');if(/^\s*\{/.test(xml)){let data:any;try{data=JSON.parse(xml);}catch{throw webFailure('WEB_FEED_INVALID');}if(!Array.isArray(data.items)||data.items.length>100)throw webFailure('WEB_FEED_INVALID');return[...new Set<string>(data.items.slice(0,20).flatMap((item:any)=>{try{return[webUrl(item.url,new Set([domain])).href];}catch{return[];}}))].slice(0,3);}return[...new Set([...(xml.matchAll(/<(?:link|loc)(?:\s[^>]*)?>\s*(?:<!\[CDATA\[)?([^<\]]+)/gi))].map(m=>decode(m[1].trim())).concat([...xml.matchAll(/<link\s[^>]*href=["']([^"']+)["']/gi)].map(m=>decode(m[1])))).values()].filter(s=>{try{webUrl(s,new Set([domain]));return true;}catch{return false;}}).slice(0,3);}

/** Selection is an explicit human decision; retained source snapshots stay complete and immutable. */
export function reviewSelection(x:WebExtraction,raw:unknown):ReviewSelection {
 const s=raw as ReviewSelection;
 if(!s||typeof s!=='object'||Array.isArray(s)||Object.keys(s).some(k=>!['observationIds','factHashes'].includes(k))||!Array.isArray(s.observationIds)||!Array.isArray(s.factHashes)||s.observationIds.length>12||s.factHashes.length>8||!s.observationIds.length&&!s.factHashes.length||new Set(s.observationIds).size!==s.observationIds.length||new Set(s.factHashes).size!==s.factHashes.length||s.observationIds.some(id=>typeof id!=='string'||!x.costs.some(o=>o.observationId===id))||s.factHashes.some(id=>typeof id!=='string'||!x.facts.some(f=>f.kind!=='REPORTED_COST'&&f.evidenceHash===id)))throw webFailure('WEB_FACT_SELECTION_REQUIRED');
 return{observationIds:[...s.observationIds],factHashes:[...s.factHashes]};
}
export function reviewedExtraction(x:WebExtraction):WebExtraction|undefined {
 if(!x.reviewSelection)return x.synthetic===true?x:undefined;
 let selected:ReviewSelection;try{selected=reviewSelection(x,x.reviewSelection);}catch{return;}
 const costs=x.costs.filter(o=>selected.observationIds.includes(o.observationId!)),facts=x.facts.filter(f=>f.kind!=='REPORTED_COST'&&selected.factHashes.includes(f.evidenceHash));
 // Rebuild each cost fact by observation ID. A paragraph hash may cover both selected and rejected amounts.
 return{...x,costs,facts:[...costs.map(o=>({kind:'REPORTED_COST',summary:'Nguồn ghi nhận '+reportedCostLabel(o)+'; thời điểm và phạm vi cần đối chiếu nguồn.',evidenceHash:o.evidenceHash})),...facts]};
}
