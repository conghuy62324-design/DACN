import { randomUUID } from 'node:crypto';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { GEO_LOCATIONS } from '../geography/vietnam.js';
import { ACCOMMODATION_TYPES } from '../services/catalogPolicy.js';
import { audit, fail, integer, internalLink, only, sql, text, uuid, version } from './common.js';

export const SECTION_KEYS = ['hero','search','destinations','offers','featured_hotels','stay_types','tours','blogs','ai_banner','newsletter'] as const;
type Kind = 'BANNER'|'SECTION'|'SETTINGS';
const iso = (v: any): string|null => {
  if(v===null||v===undefined||v==='') return null;
  if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT(?:[01]\d|2[0-3]):[0-5]\d/.test(v)||!Number.isFinite(Date.parse(v))) fail('CMS_DATE','Thời điểm cần có múi giờ theo ISO8601.');
  const civil=new Date(v.slice(0,10)+'T00:00:00Z');if(!Number.isFinite(civil.getTime())||civil.toISOString().slice(0,10)!==v.slice(0,10))fail('CMS_DATE','Ngày không tồn tại trên lịch.');
  if(!/(Z|[+-]\d\d:\d\d)$/.test(v)) fail('CMS_DATE','Cần múi giờ rõ ràng.'); return new Date(v).toISOString();
};
const active = (c:any,now:number) => c.enabled!==false && (!c.startsAt||Date.parse(c.startsAt)<=now) && (!c.endsAt||Date.parse(c.endsAt)>now);
function window(c:any) { if(c.startsAt&&c.endsAt&&Date.parse(c.endsAt)<=Date.parse(c.startsAt)) fail('CMS_WINDOW','Thời gian kết thúc phải sau thời gian bắt đầu.'); }
async function mediaRef(v:any,t:Transaction) {
  if(v===null||v==='') return null;
  const match=typeof v==='string'&&/^\/api\/web-media\/([a-f0-9-]{36})$/.exec(v);
  if(!match||!(await sql("SELECT id FROM web_media WHERE id=$1 AND kind='CMS'",[uuid(match[1])],t)).length) fail('CMS_IMAGE','Chỉ nhận ảnh CMS đã kiểm quyền và được lưu bởi managed media.'); return v;
}
export async function validateContent(kind:Kind,key:string,input:any,t:Transaction) {
  if(kind==='BANNER') {
    only(input,['title','subtitle','ctaLabel','ctaHref','imageDesktop','imageMobile','altText','imageCredit','enabled','startsAt','endsAt']);
    const c:any={title:text(input.title,160),subtitle:text(input.subtitle??'',500,0),ctaLabel:text(input.ctaLabel??'',80,0),ctaHref:input.ctaHref?internalLink(input.ctaHref):null,
      imageDesktop:await mediaRef(input.imageDesktop??null,t),imageMobile:await mediaRef(input.imageMobile??null,t),altText:text(input.altText??'',300,0),imageCredit:text(input.imageCredit??'',300,0),enabled:input.enabled??true,startsAt:iso(input.startsAt),endsAt:iso(input.endsAt)};
    if(typeof c.enabled!=='boolean'||!!c.ctaLabel!==!!c.ctaHref) fail('CMS_BANNER','CTA hoặc trạng thái không hợp lệ.'); window(c); return c;
  }
  if(kind==='SECTION') {
    if(!SECTION_KEYS.includes(key as any)) fail('CMS_SECTION','Khối trang chủ không được hỗ trợ.');
    only(input,['title','description','enabled','config']);
    const config=input.config??{}; only(config,['limit','destinationIds','placeIds','accommodationTypes','body','ctaLabel','ctaHref']);
    const c:any={title:text(input.title,60),description:text(input.description??'',500,0),enabled:input.enabled??true,config:{}};
    if(typeof c.enabled!=='boolean'||['hero','search'].includes(key)&&!c.enabled) fail('CMS_REQUIRED_SECTION','Không được tắt hero hoặc tìm kiếm.');
    if('limit' in config)c.config.limit=integer(config.limit,1,24);
    const array=(v:any,max:number)=>{if(!Array.isArray(v)||v.length>max||new Set(v).size!==v.length)fail('CMS_CONFIG','Danh sách cấu hình không hợp lệ.');return v;};
    if('destinationIds' in config) { if(key!=='destinations')fail('CMS_CONFIG','Điểm đến chỉ thuộc khối destinations.');c.config.destinationIds=array(config.destinationIds,12).map((id:any)=>{if(typeof id!=='string'||!GEO_LOCATIONS.some(g=>g.id===id&&g.kind!=='all'))fail('CMS_DESTINATION','Cần canonical ID từ geography hiện hành.');return id;}); }
    if('placeIds' in config) { if(key!=='featured_hotels')fail('CMS_CONFIG','Khách sạn chỉ thuộc khối featured_hotels.');c.config.placeIds=array(config.placeIds,12).map(uuid);await eligibleHotels(c.config.placeIds,t); }
    if('accommodationTypes' in config) { if(key!=='stay_types')fail('CMS_CONFIG','Loại hình chỉ thuộc stay_types.');c.config.accommodationTypes=array(config.accommodationTypes,12).map((v:any)=>{if(!ACCOMMODATION_TYPES.includes(v))fail('CMS_CONFIG','Loại lưu trú không hợp lệ.');return v;}); }
    for(const k of ['body','ctaLabel'])if(k in config)c.config[k]=text(config[k],k==='body'?2000:80,0);
    if('ctaHref' in config)c.config.ctaHref=internalLink(config.ctaHref);
    return c;
  }
  only(input,['siteName','tagline','supportEmail','supportPhone','supportHours','address','footerLinks','seo','notice']);
  const c:any={siteName:text(input.siteName,120),tagline:text(input.tagline??'',200,0),supportEmail:text(input.supportEmail??'',254,0),supportPhone:text(input.supportPhone??'',20,0),supportHours:text(input.supportHours??'',120,0),address:text(input.address??'',500,0)};
  if(c.supportEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.supportEmail)||c.supportPhone&&!/^[+0-9() .-]{6,20}$/.test(c.supportPhone))fail('CMS_CONTACT','Thông tin liên hệ không hợp lệ.');
  if(!Array.isArray(input.footerLinks??[])||(input.footerLinks??[]).length>30)fail('CMS_LINKS','Tối đa30 liên kết.');
  c.footerLinks=(input.footerLinks??[]).map((v:any)=>{only(v,['group','label','href']);const group=text(v.group,80),href=group==='Mạng xã hội'?text(v.href,500):internalLink(v.href);if(group==='Mạng xã hội'){let u:URL;try{u=new URL(href);}catch{fail('CMS_LINK','Liên kết không hợp lệ.');}if(u.protocol!=='https:'||u.username||u.password||u.hash||/^(localhost|127\.|0\.|\[)/i.test(u.hostname))fail('CMS_LINK','Chỉ nhận liên kết HTTPS công khai.');}return{group,label:text(v.label,100),href};});
  only(input.seo??{},['defaultTitle','defaultDescription']);c.seo={defaultTitle:text(input.seo?.defaultTitle??'',160,0),defaultDescription:text(input.seo?.defaultDescription??'',500,0)};
  only(input.notice??{},['enabled','message']);if(typeof(input.notice?.enabled??false)!=='boolean')fail('CMS_NOTICE','Trạng thái không hợp lệ.');c.notice={enabled:input.notice?.enabled??false,message:text(input.notice?.message??'',500,0)};return c;
}
export async function eligibleHotels(ids:string[],t?:Transaction) {
  if(!ids.length)return[];
  const rows=await sql("SELECT p.id,p.name,p.slug,h.content_version::int \"contentVersion\",h.commercial_version::int \"commercialVersion\",p.updated_at \"updatedAt\",p.catalog_metadata \"catalogMetadata\" FROM places p JOIN hotel_profiles h ON h.place_id=p.id JOIN businesses b ON b.id=h.business_id WHERE p.id=ANY($1::uuid[]) AND p.status='APPROVED' AND b.status='ACTIVE' AND h.approved_content_version=h.content_version"+(process.env.NODE_ENV==='test'?'':" AND COALESCE(p.catalog_metadata->>'source','')<>'DEMO' AND COALESCE(p.catalog_metadata->>'testOnly','false')<>'true'"),[ids],t);
  if(rows.length!==ids.length)fail('CMS_HOTEL_INELIGIBLE','Khách sạn chưa đủ điều kiện công khai.',409);return ids.map(id=>rows.find(r=>r.id===id));
}
async function get(kind:Kind,key:string,t?:Transaction,lock=false) {
  const row=(await sql(`SELECT d.*,r.content FROM cms_documents d JOIN cms_revisions r ON r.document_id=d.id AND r.version=d.version WHERE d.kind=$1 AND ${kind==='BANNER'?'d.id=$2::uuid':'d.key=$2'}${lock?' FOR UPDATE OF d':''}`,[kind,key],t))[0];
  if(!row)fail('CMS_NOT_FOUND','Không tìm thấy nội dung CMS.',404);return row;
}
const dto=(r:any)=>({...r.content,id:r.id,key:r.key,kind:r.kind,version:r.version,publishedVersion:r.published_version,hasDraft:r.published_version!==r.version,status:r.status,position:r.position,updatedAt:r.updated_at});
export async function listDocuments(kind:Kind,status?:string) {
  if(status!==undefined&&!['DRAFT','PUBLISHED','SCHEDULED','ARCHIVED'].includes(status))fail('CMS_STATUS','Trạng thái không hợp lệ.');
  const rows=await sql('SELECT d.*,r.content FROM cms_documents d JOIN cms_revisions r ON r.document_id=d.id AND r.version=d.version WHERE d.kind=$1 AND ($2::text IS NULL OR d.status=$2) ORDER BY d.position,d.id LIMIT 201',[kind,status??null]);
  if(rows.length>200)fail('CMS_LIMIT','Tối đa200 nội dung trong một loại.',409);return{items:rows.map(dto),total:rows.length};
}
export async function document(kind:Kind,key:string) {
  const r=await get(kind,key);return{...dto(r),revisions:await sql('SELECT version,content,reason,created_at "createdAt" FROM cms_revisions WHERE document_id=$1 ORDER BY version DESC LIMIT 30',[r.id])};
}
async function revision(row:any,content:any,actor:string,reason:string,t:Transaction) {
  const next=row.version+1;
  await sql('INSERT INTO cms_revisions(document_id,version,content,actor_user_id,reason) VALUES($1,$2,$3::jsonb,$4,$5)',[row.id,next,JSON.stringify(content),actor,reason],t);
  if(row.kind==='SECTION'&&row.key==='featured_hotels')for(const [position,id]of(content.config?.placeIds??[]).entries()) await sql('INSERT INTO cms_featured_hotels(document_id,version,place_id,position) VALUES($1,$2,$3,$4)',[row.id,next,id,position],t);
  await sql('UPDATE cms_documents SET version=$2,updated_at=now() WHERE id=$1',[row.id,next],t);
  await audit(actor,'CMS_DRAFT','CmsDocument',row.id,reason,{version:row.version},{version:next},t);
  return next;
}
export async function createDocument(actor:string,kind:Kind,key:string,body:any) {
  return sequelize.transaction(async t=>{
    await sql("SELECT pg_advisory_xact_lock(hashtext('web-cms-structure'))",[],t);
    if((await sql('SELECT count(*)::int n FROM cms_documents WHERE kind=$1',[kind],t))[0].n>=200)fail('CMS_LIMIT','Đã đạt giới hạn200 nội dung.',409);
    const id=randomUUID();if(kind==='BANNER')key=id;
    const content=await validateContent(kind,key,body,t);
    const pos=(await sql('SELECT COALESCE(max(position),-1)::int+1 n FROM cms_documents WHERE kind=$1',[kind],t))[0].n;
    await sql('INSERT INTO cms_documents(id,kind,key,version,position) VALUES($1,$2,$3,1,$4)',[id,kind,key,pos],t);
    await sql('INSERT INTO cms_revisions(document_id,version,content,actor_user_id,reason) VALUES($1,1,$2::jsonb,$3,$4)',[id,JSON.stringify(content),actor,'Initial draft'],t);
    if(kind==='SECTION'&&key==='featured_hotels')for(const[position,place]of(content.config?.placeIds??[]).entries())await sql('INSERT INTO cms_featured_hotels(document_id,version,place_id,position) VALUES($1,1,$2,$3)',[id,place,position],t);
    await audit(actor,'CMS_CREATE','CmsDocument',id,'Initial draft',null,{version:1,kind,key},t);return dto(await get(kind,kind==='BANNER'?id:key,t));
  });
}
export async function editDocument(actor:string,kind:Kind,key:string,body:any) {
  return sequelize.transaction(async t=>{
    const r=await get(kind,key,t,true);version(r.version,body.version);if(r.status==='ARCHIVED')fail('CMS_ARCHIVED','Nội dung đã lưu trữ.',409);
    const {version:_,...patch}=body;
    const c=await validateContent(kind,key,{...r.content,...patch},t);
    await revision(r,c,actor,'Edit draft',t);return dto(await get(kind,key,t));
  });
}
export async function publication(actor:string,kind:Kind,key:string,op:'publish'|'unpublish'|'restore'|'archive',body:any) {
  only(body,op==='restore'?['version','revision']:op==='publish'?['version','startsAt','endsAt']:['version','reason']);
  return sequelize.transaction(async t=>{
    const r=await get(kind,key,t,true);version(r.version,body.version);
    if(op==='restore') {
      const old=(await sql('SELECT content FROM cms_revisions WHERE document_id=$1 AND version=$2',[r.id,integer(body.revision)],t))[0];if(!old)fail('CMS_REVISION_NOT_FOUND','Không tìm thấy phiên bản.',404);
      await revision(r,await validateContent(kind,key,old.content,t),actor,'Restore revision '+body.revision,t);
      if(r.status==='ARCHIVED')await sql("UPDATE cms_documents SET status='DRAFT' WHERE id=$1",[r.id],t);
    } else if(op==='publish') {
      if(r.status==='ARCHIVED')fail('CMS_ARCHIVED','Cần khôi phục trước khi xuất bản.',409);
      const c=await validateContent(kind,key,r.content,t);
      if(kind==='BANNER') {
        if(!c.imageDesktop||!c.imageMobile||!c.altText||!c.enabled)fail('CMS_PUBLICATION_INCOMPLETE','Cần ảnh desktop/mobile, alt và trạng thái bật.',409);
        if('startsAt'in body)c.startsAt=iso(body.startsAt);if('endsAt'in body)c.endsAt=iso(body.endsAt);window(c);
        if(c.endsAt&&Date.parse(c.endsAt)<=Date.now())fail('CMS_EXPIRED','Không thể xuất bản banner đã hết hạn.',409);
      }
      const next=await revision(r,c,actor,'Publish reviewed revision '+r.version,t);
      await sql("UPDATE cms_documents SET published_version=$2,published_position=position,status=$3 WHERE id=$1",[r.id,next,c.startsAt&&Date.parse(c.startsAt)>Date.now()?'SCHEDULED':'PUBLISHED'],t);
    } else {
      const reason=text(body.reason,1000,3);
      await revision(r,r.content,actor,reason,t);
      await sql('UPDATE cms_documents SET published_version=NULL,status=$2 WHERE id=$1',[r.id,op==='archive'?'ARCHIVED':'DRAFT'],t);
    }
    await audit(actor,'CMS_'+op.toUpperCase(),'CmsDocument',r.id,body.reason||op,{version:r.version},{operation:op},t);
    return dto(await get(kind,key,t));
  });
}
export async function orderDocuments(actor:string,kind:Kind,body:any) {
  only(body,['items']);if(!Array.isArray(body.items)||body.items.length>200)fail('CMS_ORDER','Cần danh sách đầy đủ kèm phiên bản.');
  return sequelize.transaction(async t=>{
    await sql("SELECT pg_advisory_xact_lock(hashtext('web-cms-structure'))",[],t);
    const rows=await sql("SELECT id,key,version::int FROM cms_documents WHERE kind=$1 AND status<>'ARCHIVED' ORDER BY id FOR UPDATE",[kind],t);
    if(rows.length!==body.items.length||new Set(body.items.map((v:any)=>v.id)).size!==rows.length)fail('CMS_ORDER','Cần đủ tất cả nội dung hiện hành.',409);
    for(const [position,item]of body.items.entries()){
      only(item,['id','version']);const row=rows.find(r=>r.id===item.id);if(!row)fail('CMS_ORDER','Mã nội dung không thuộc danh sách.',409);version(row.version,item.version);
      const r=await get(kind,kind==='BANNER'?row.id:row.key,t,true);await revision(r,r.content,actor,'Reorder content',t);
      await sql('UPDATE cms_documents SET position=$2 WHERE id=$1',[row.id,position],t);
    }
    return{reordered:rows.length};
  });
}
export async function publicHome() {
  return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ,readOnly:true},async t=>{
    const asOf=(await sql('SELECT transaction_timestamp() "asOf"',[],t))[0].asOf,now=new Date(asOf).getTime();
    const rows=await sql("SELECT d.*,r.content FROM cms_documents d JOIN cms_revisions r ON r.document_id=d.id AND r.version=d.published_version WHERE d.status IN ('PUBLISHED','SCHEDULED') ORDER BY d.published_position,d.id",[],t);
    const visible=rows.filter(r=>active(r.content,now));
    const sections=visible.filter(r=>r.kind==='SECTION').map(r=>({...r.content,key:r.key,position:r.published_position,version:r.published_version}));
    const featured=sections.find(s=>s.key==='featured_hotels'),ids=featured?.config?.placeIds??[];
    // Recheck each reference now; suspension/unpublication must remove it immediately.
    const hotels=[];for(const id of ids){try{hotels.push(...await eligibleHotels([id],t));}catch(e:any){if(e.code!=='CMS_HOTEL_INELIGIBLE')throw e;}}
    if(featured)featured.config={...featured.config,placeIds:hotels.map(h=>h.id)};
    return{banners:visible.filter(r=>r.kind==='BANNER').map(r=>({...r.content,id:r.id,version:r.published_version,position:r.published_position})),sections,featuredHotels:hotels,settings:visible.find(r=>r.kind==='SETTINGS')?.content??null,asOf:new Date(asOf).toISOString(),source:'POSTGRESQL_PUBLISHED_REVISIONS'};
  });
}
