import { createHash, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { sequelize } from '../config/database.js';
import { ImageStorageService, prepareSafeImage } from '../services/imageStorageService.js';
import { fail, only, sql, text, uuid } from './common.js';

export const storage=()=>new ImageStorageService(process.env.WEB_MEDIA_DIR||'');
export async function upload(actor:string,admin:boolean,body:Buffer,q:any,contentType?:string) {
  only(q,['kind','rights','rightsEvidence','altText']);
  if(!['CMS','AVATAR'].includes(q.kind)||q.kind==='CMS'&&!admin)fail('MEDIA_SCOPE','Không có quyền tải ảnh CMS.',403);
  if(contentType!=='application/octet-stream')fail('MEDIA_MIME','Gửi file nhị phân application/octet-stream; server sẽ kiểm signature.');
  if(!['OWNED','LICENSED'].includes(q.rights))fail('MEDIA_RIGHTS','Cần xác nhận quyền sử dụng.');
  const evidence=text(q.rightsEvidence,2000),alt=text(q.altText,300);
  const safe=await prepareSafeImage(body),meta=await sharp(safe).metadata(),id=randomUUID(),key=(q.kind==='CMS'?'cms':'avatars')+'/'+actor+'/'+id+'.webp';
  const store=storage();await store.put(key,safe);
  try {await sequelize.transaction(async t=>{
    await sql('INSERT INTO web_media(id,owner_user_id,kind,storage_key,bytes,sha256,width,height,rights,rights_evidence,alt_text) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[id,actor,q.kind,key,safe.length,createHash('sha256').update(safe).digest('hex'),meta.width,meta.height,q.rights,evidence,alt],t);
  });}catch(e){await store.remove(key);throw e;}
  return{id,url:'/api/web-media/'+id,kind:q.kind,mime:'image/webp',width:meta.width,height:meta.height,altText:alt,rights:q.rights};
}
export async function publicMedia(id:string) {
  const url='/api/web-media/'+uuid(id),r=(await sql(`SELECT m.storage_key FROM web_media m WHERE m.id=$1 AND (
    (m.kind='AVATAR' AND EXISTS(SELECT 1 FROM users u WHERE u.id=m.owner_user_id AND u.avatar_url=$2)) OR
    (m.kind='CMS' AND EXISTS(SELECT 1 FROM cms_documents d JOIN cms_revisions r ON r.document_id=d.id AND r.version=d.published_version
      WHERE d.kind='BANNER' AND d.status IN ('PUBLISHED','SCHEDULED') AND COALESCE((r.content->>'enabled')::boolean,true)
      AND ((r.content->>'startsAt') IS NULL OR (r.content->>'startsAt')::timestamptz<=now())
      AND ((r.content->>'endsAt') IS NULL OR (r.content->>'endsAt')::timestamptz>now())
      AND (r.content->>'imageDesktop'=$2 OR r.content->>'imageMobile'=$2))))`,[id,url]))[0];
  if(!r)fail('MEDIA_NOT_PUBLIC','Không tìm thấy ảnh công khai.',404);return storage().resolve(r.storage_key);
}
export async function privateMedia(actor:string,admin:boolean,id:string) {
  const r=(await sql('SELECT storage_key,owner_user_id,kind FROM web_media WHERE id=$1',[uuid(id)]))[0];
  if(!r||r.owner_user_id!==actor&&!(admin&&r.kind==='CMS'))fail('MEDIA_NOT_FOUND','Không tìm thấy ảnh trong phạm vi tài khoản.',404);return storage().resolve(r.storage_key);
}
