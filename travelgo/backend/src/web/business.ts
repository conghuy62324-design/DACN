import { sequelize } from '../config/database.js';
import { BusinessAccessService } from '../services/businessAccessService.js';
import * as hotels from '../hotels/management.js';
import { audit, fail, integer, only, page, sql, text, uuid, version } from './common.js';

export async function partnerPromotions(actor:string,id:string,q:any) {
  only(q,['status','effective']);if(q.status&&!['DRAFT','ACTIVE','ARCHIVED'].includes(q.status)||q.effective&&!['true','false'].includes(q.effective))fail('PROMOTION_FILTER','Bộ lọc không hợp lệ.');
  const s=await hotels.managed(actor,uuid(id)),now=Date.now();
  const items=s.promotions.filter(p=>(!q.status||p.status===q.status)&&(!q.effective||(q.effective==='true')===(p.status==='ACTIVE'&&Date.parse(p.bookingStartsAt)<=now&&Date.parse(p.bookingEndsAt)>now)));
  return{items,total:items.length,revision:s.revision,asOf:s.asOf,source:'HOTEL_AUTHORITATIVE_SNAPSHOT'};
}
export async function adminPromotions(q:any) {
  only(q,['page','limit','status','businessId','placeId','effective']);const p=page(q);
  if(q.status&&!['DRAFT','ACTIVE','ARCHIVED'].includes(q.status))fail('PROMOTION_FILTER','Trạng thái không hợp lệ.');
  if(q.effective&&!['UPCOMING','RUNNING','EXPIRED','INACTIVE'].includes(q.effective))fail('PROMOTION_FILTER','Hiệu lực không hợp lệ.');
  const effective="CASE WHEN x.status<>'ACTIVE' THEN 'INACTIVE' WHEN x.booking_starts_at>transaction_timestamp() THEN 'UPCOMING' WHEN x.booking_ends_at<=transaction_timestamp() THEN 'EXPIRED' ELSE 'RUNNING' END";
  const bind=[q.status??null,q.businessId?uuid(q.businessId):null,q.placeId?uuid(q.placeId):null,q.effective??null];
  const where=`WHERE ($1::text IS NULL OR x.status=$1) AND ($2::uuid IS NULL OR h.business_id=$2) AND ($3::uuid IS NULL OR x.place_id=$3) AND ($4::text IS NULL OR (${effective})=$4)`;
  const total=(await sql(`SELECT count(*)::int n FROM hotel_promotions x JOIN hotel_profiles h ON h.place_id=x.place_id ${where}`,bind))[0].n;
  const items=await sql(`SELECT x.*,p.name "hotelName",h.business_id "businessId",(h.content_version+h.commercial_version)::int revision,transaction_timestamp() "asOf",${effective} effective FROM hotel_promotions x JOIN hotel_profiles h ON h.place_id=x.place_id JOIN places p ON p.id=x.place_id ${where} ORDER BY x.id LIMIT $5 OFFSET $6`,[...bind,p.limit,p.offset]);
  // Reuse the same camel conversion as the authoritative Hotel store; no price calculation here.
  const {camel}=await import('../hotels/postgresStore.js');
  return{items:items.map(r=>({...camel(r),value:Number(r.value),version:Number(r.version),maxDiscountVnd:r.max_discount_vnd===null?null:Number(r.max_discount_vnd)})),total,page:p.page,limit:p.limit,pages:Math.ceil(total/p.limit)};
}
export async function suspendPromotion(actor:string,id:string,body:any,expected:any) {
  only(body,['reason']);const reason=text(body.reason,1000,3);
  const row=(await sql('SELECT place_id FROM hotel_promotions WHERE id=$1',[uuid(id)]))[0];if(!row)fail('PROMOTION_NOT_FOUND','Không tìm thấy ưu đãi.',404);
  return hotels.mutation(actor,row.place_id,expected,async t=>{
    const old=(await sql('SELECT status FROM hotel_promotions WHERE id=$1 AND place_id=$2 FOR UPDATE',[id,row.place_id],t))[0];
    if(!old)fail('PROMOTION_NOT_FOUND','Không tìm thấy ưu đãi.',404);
    await sql("UPDATE hotel_promotions SET status='ARCHIVED' WHERE id=$1 AND place_id=$2",[id,row.place_id],t);
    await audit(actor,'PROMOTION_SUSPEND','HotelPromotion',id,reason,{status:old.status},{status:'ARCHIVED'},t);
  },true);
}
export async function partnerReviews(actor:string,q:any) {
  only(q,['businessId','placeId','replied','minRating','page','limit']);const business=uuid(q.businessId);await BusinessAccessService.assert(actor,business,'MANAGE_BUSINESS');const p=page(q);
  if(q.replied&&!['true','false'].includes(q.replied))fail('REVIEW_FILTER','Bộ lọc không hợp lệ.');
  const rating=q.minRating===undefined?null:typeof q.minRating==='string'&&/^[1-5]$/.test(q.minRating)?Number(q.minRating):fail('REVIEW_FILTER','Rating phải từ1 đến5.');
  const bind=[business,q.placeId?uuid(q.placeId):null,q.replied===undefined?null:q.replied==='true',rating];
  const from=`FROM reviews r JOIN places p ON r.target_id=p.id::text AND r.target_type IN ('place','hotel','restaurant') LEFT JOIN partner_review_replies x ON x.review_id=r.id AND x.business_id=p.business_id WHERE p.business_id=$1 AND r.moderation_status='PUBLISHED' AND ($2::uuid IS NULL OR p.id=$2) AND ($3::boolean IS NULL OR (x.text IS NOT NULL)=$3) AND ($4::int IS NULL OR r.rating>=$4)`;
  const total=(await sql(`SELECT count(*)::int n ${from}`,bind))[0].n;
  const rows=await sql(`SELECT r.id,r.target_type "targetType",r.target_id "targetId",p.name "placeName",r.user_name "userName",r.rating::float rating,r.comment,r.verification_status "verificationStatus",r.created_at "createdAt",COALESCE(x.version,0)::int "replyVersion",CASE WHEN x.text IS NULL THEN NULL ELSE jsonb_build_object('text',x.text,'version',x.version,'repliedAt',x.updated_at) END reply ${from} ORDER BY r.created_at DESC,r.id LIMIT $5 OFFSET $6`,[...bind,p.limit,p.offset]);
  return{items:rows,total,page:p.page,limit:p.limit,pages:Math.ceil(total/p.limit)};
}
export async function reply(actor:string,id:string,body:any,remove=false) {
  only(body,remove?['version']:['text','version']);uuid(id);integer(body.version,0);const value=remove?null:text(body.text,2000);
  await sequelize.transaction(async t=>{
    const row=(await sql("SELECT r.id,p.business_id FROM reviews r JOIN places p ON r.target_id=p.id::text AND r.target_type IN ('place','hotel','restaurant') WHERE r.id=$1 AND r.moderation_status='PUBLISHED' FOR UPDATE OF r",[id],t))[0];if(!row)fail('REVIEW_NOT_FOUND','Không tìm thấy đánh giá công khai.',404);
    await BusinessAccessService.assert(actor,row.business_id,'MANAGE_BUSINESS');
    const old=(await sql('SELECT text,version::int FROM partner_review_replies WHERE review_id=$1 FOR UPDATE',[id],t))[0];
    if((old?.version??0)!==body.version)fail('WEB_VERSION_CONFLICT','Phản hồi đã thay đổi. Hãy tải lại.',409);
    if(remove) {if(!old?.text)fail('REPLY_NOT_FOUND','Chưa có phản hồi.',404);await sql('UPDATE partner_review_replies SET text=NULL,deleted_at=now(),version=version+1,updated_at=now() WHERE review_id=$1',[id],t);}
    else await sql('INSERT INTO partner_review_replies(review_id,business_id,actor_user_id,text,version) VALUES($1,$2,$3,$4,1) ON CONFLICT(review_id) DO UPDATE SET actor_user_id=EXCLUDED.actor_user_id,text=EXCLUDED.text,deleted_at=NULL,version=partner_review_replies.version+1,updated_at=now()',[id,row.business_id,actor,value],t);
    await audit(actor,remove?'REPLY_DELETE':'REPLY_SAVE','PartnerReviewReply',id,'Partner reply to published review',old?{version:old.version}:null,{version:(old?.version??0)+1,removed:remove},t);
  });const row=(await sql('SELECT text,version,updated_at "repliedAt" FROM partner_review_replies WHERE review_id=$1',[id]))[0];return{id,reply:row.text===null?null:row,replyVersion:row.version};
}
export async function publicReply(id:string) {
  const row=(await sql("SELECT x.text,x.version,x.updated_at \"repliedAt\" FROM partner_review_replies x JOIN reviews r ON r.id=x.review_id JOIN places p ON p.id::text=r.target_id JOIN businesses b ON b.id=p.business_id LEFT JOIN hotel_profiles h ON h.place_id=p.id WHERE r.id=$1 AND x.deleted_at IS NULL AND r.moderation_status='PUBLISHED' AND p.status='APPROVED' AND b.status='ACTIVE' AND x.business_id=p.business_id AND (h.place_id IS NULL OR h.approved_content_version=h.content_version)"+(process.env.NODE_ENV==='test'?'':" AND COALESCE(p.catalog_metadata->>'source','')<>'DEMO' AND COALESCE(p.catalog_metadata->>'testOnly','false')<>'true'"),[uuid(id)]))[0];return row??null;
}
