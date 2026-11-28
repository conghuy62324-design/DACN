import express,{ Router } from 'express';
import { sequelize } from '../config/database.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';
import * as c from '../web/cms.js';
import * as a from '../web/accountSecurity.js';
import * as b from '../web/business.js';
import * as m from '../web/media.js';
import { enabled, fail, only, page, sql, uuid } from '../web/common.js';
import { AdminService } from '../services/adminService.js';
import { Business } from '../models/Business.js';

const router=Router();
const gate=(_req:any,_res:any,next:any)=>enabled()?next():next(Object.assign(new Error('Web foundation chưa được bật.'),{statusCode:404,code:'WEB_FOUNDATION_DISABLED'}));
const wrap=(fn:any)=>(req:any,res:any,next:any)=>Promise.resolve().then(()=>fn(req,res)).then(data=>{if(!res.headersSent)res.json({success:true,data});}).catch((e:any)=>{
  if(['23503','23505','23514'].includes(e.parent?.code||e.code))return next(Object.assign(new Error('Dữ liệu xung đột hoặc không hợp lệ. Hãy tải lại.'),{statusCode:409,code:'WEB_DATA_CONFLICT'}));next(e);
});
const auth=[gate,authenticate],admin=[...auth,requireRoles('SUPER_ADMIN')],partner=[...auth,requireRoles('PARTNER')];
router.get('/cms/home',gate,wrap(async(_req:any,res:any)=>{res.set('Cache-Control','no-store');return c.publicHome();}));
router.get('/settings/public',gate,wrap(async(_req:any,res:any)=>{res.set('Cache-Control','no-store');const home=await c.publicHome();return{...(home.settings??{}),asOf:home.asOf,source:home.source};}));
router.get('/admin/users',...admin,wrap((r:any)=>a.listUsers(r.query)));
router.get('/admin/users/:id',...admin,wrap((r:any)=>a.userDetail(r.params.id)));
router.patch('/admin/users/:id/status',...admin,wrap((r:any)=>a.manageUser(r.user.id,r.params.id,r.body,'status')));
router.patch('/admin/users/:id/roles',...admin,wrap((r:any)=>a.manageUser(r.user.id,r.params.id,r.body,'roles')));
router.get('/admin/bookings',...admin,wrap((r:any)=>{only(r.query,['page','limit','status','search','businessId','placeId','from','to']);const p=page(r.query),{page:_,limit:__,...filters}=r.query;return AdminService.getBookings(p.page,p.limit,filters);}));
router.get('/admin/businesses/:id',...admin,wrap(async(r:any)=>{const id=uuid(r.params.id),business=await Business.findByPk(id);if(!business)fail('BUSINESS_NOT_FOUND','Không tìm thấy doanh nghiệp.',404);return{...business.toJSON(),members:await sql('SELECT m.id,m.user_id "userId",u.full_name "fullName",u.email,m.permissions FROM business_members m JOIN users u ON u.id=m.user_id WHERE m.business_id=$1 ORDER BY m.id LIMIT 100',[id]),hotels:await sql("SELECT p.id,p.name,p.status,h.content_version::int \"contentVersion\",h.commercial_version::int \"commercialVersion\" FROM hotel_profiles h JOIN places p ON p.id=h.place_id WHERE h.business_id=$1 ORDER BY p.id LIMIT 100",[id])};}));
router.get('/admin/businesses/:id/bookings',...admin,wrap(async(r:any)=>{only(r.query,['page','limit']);const id=uuid(r.params.id);if(!await Business.findByPk(id))fail('BUSINESS_NOT_FOUND','Không tìm thấy doanh nghiệp.',404);const p=page(r.query);return AdminService.getBookings(p.page,p.limit,{businessId:id});}));
router.patch('/auth/profile',...auth,wrap((r:any)=>a.updateProfile(r.user.id,r.body)));
router.post('/auth/change-password',...auth,wrap((r:any)=>a.changePassword(r.user.id,r.body)));

router.get('/admin/cms/banners',...admin,wrap((r:any)=>{only(r.query,['status']);return c.listDocuments('BANNER',r.query.status);}));
router.post('/admin/cms/banners',...admin,wrap((r:any)=>c.createDocument(r.user.id,'BANNER','',r.body)));
router.put('/admin/cms/banners/order',...admin,wrap((r:any)=>c.orderDocuments(r.user.id,'BANNER',r.body)));
router.get('/admin/cms/banners/:id',...admin,wrap((r:any)=>c.document('BANNER',uuid(r.params.id))));
router.put('/admin/cms/banners/:id',...admin,wrap((r:any)=>c.editDocument(r.user.id,'BANNER',uuid(r.params.id),r.body)));
for(const op of ['publish','unpublish','restore'] as const)router.post('/admin/cms/banners/:id/'+op,...admin,wrap((r:any)=>c.publication(r.user.id,'BANNER',uuid(r.params.id),op,r.body)));
router.delete('/admin/cms/banners/:id',...admin,wrap((r:any)=>c.publication(r.user.id,'BANNER',uuid(r.params.id),'archive',r.body)));
router.get('/admin/cms/sections',...admin,wrap(()=>c.listDocuments('SECTION')));
router.post('/admin/cms/sections/:key',...admin,wrap((r:any)=>c.createDocument(r.user.id,'SECTION',r.params.key,r.body)));
router.put('/admin/cms/sections/order',...admin,wrap((r:any)=>c.orderDocuments(r.user.id,'SECTION',r.body)));
router.patch('/admin/cms/sections/:key',...admin,wrap((r:any)=>c.editDocument(r.user.id,'SECTION',r.params.key,r.body)));
router.post('/admin/cms/sections/:key/publish',...admin,wrap((r:any)=>c.publication(r.user.id,'SECTION',r.params.key,'publish',r.body)));
router.get('/admin/cms/preview',...admin,wrap(async()=>({banners:(await c.listDocuments('BANNER')).items,sections:(await c.listDocuments('SECTION')).items,mode:'ADMIN_DRAFT_PREVIEW_NOT_PUBLIC'})));
router.get('/admin/cms/featured-hotels',...admin,wrap(async()=>{const doc=await c.document('SECTION','featured_hotels');return{items:doc.config?.placeIds?.map((id:string)=>({id}))??[],placeIds:doc.config?.placeIds??[],version:doc.version,publishedVersion:doc.publishedVersion};}));
router.put('/admin/cms/featured-hotels',...admin,wrap(async(r:any)=>{only(r.body,['placeIds','version']);const doc=await c.document('SECTION','featured_hotels');return c.editDocument(r.user.id,'SECTION','featured_hotels',{version:r.body.version,config:{...doc.config,placeIds:r.body.placeIds}});}));
router.get('/admin/settings',...admin,wrap(()=>c.document('SETTINGS','public')));
router.post('/admin/settings',...admin,wrap((r:any)=>c.createDocument(r.user.id,'SETTINGS','public',r.body)));
router.patch('/admin/settings',...admin,wrap((r:any)=>c.editDocument(r.user.id,'SETTINGS','public',r.body)));
router.post('/admin/settings/publish',...admin,wrap((r:any)=>c.publication(r.user.id,'SETTINGS','public','publish',r.body)));

router.post('/web-media',...auth,express.raw({type:'application/octet-stream',limit:'10mb'}),wrap((r:any)=>m.upload(r.user.id,r.user.roles.includes('SUPER_ADMIN'),r.body,r.query,r.headers['content-type'])));
router.get('/web-media/:id',gate,wrap(async(r:any,res:any)=>{res.set('Cache-Control','no-store');await new Promise<void>((resolve,reject)=>{m.publicMedia(r.params.id).then(file=>res.type('image/webp').sendFile(file,(e:any)=>e?reject(e):resolve())).catch(reject);});}));
router.get('/web-media/:id/preview',...auth,wrap(async(r:any,res:any)=>{res.set('Cache-Control','no-store');const file=await m.privateMedia(r.user.id,r.user.roles.includes('SUPER_ADMIN'),r.params.id);await new Promise<void>((resolve,reject)=>res.type('image/webp').sendFile(file,(e:any)=>e?reject(e):resolve()));}));

router.get('/notifications',...auth,wrap(async(r:any)=>{only(r.query,['page','limit','unread']);if(r.query.unread!==undefined&&!['true','false'].includes(r.query.unread))fail('NOTIFICATION_FILTER','Bộ lọc không hợp lệ.');const p=page(r.query),unread=r.query.unread===undefined?null:r.query.unread==='true';return sequelize.transaction({readOnly:true},async t=>{
  const total=(await sql('SELECT count(*)::int n FROM web_notifications WHERE user_id=$1 AND ($2::boolean IS NULL OR (read_at IS NULL)=$2)',[r.user.id,unread],t))[0].n;
  const unreadCount=(await sql('SELECT count(*)::int n FROM web_notifications WHERE user_id=$1 AND read_at IS NULL',[r.user.id],t))[0].n;
  const items=await sql('SELECT id,type,title,body,href,read_at "readAt",created_at "createdAt" FROM web_notifications WHERE user_id=$1 AND ($2::boolean IS NULL OR (read_at IS NULL)=$2) ORDER BY created_at DESC,id LIMIT $3 OFFSET $4',[r.user.id,unread,p.limit,p.offset],t);return{items,total,unreadCount,page:p.page,limit:p.limit,pages:Math.ceil(total/p.limit)};});}));
router.get('/notifications/unread-count',...auth,wrap(async(r:any)=>({count:(await sql('SELECT count(*)::int n FROM web_notifications WHERE user_id=$1 AND read_at IS NULL',[r.user.id]))[0].n})));
router.patch('/notifications/:id/read',...auth,wrap(async(r:any)=>{only(r.body,[]);const rows=await sql('UPDATE web_notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND user_id=$2 RETURNING id,read_at "readAt"',[uuid(r.params.id),r.user.id]);if(!rows.length)fail('NOTIFICATION_NOT_FOUND','Không tìm thấy thông báo.',404);return rows[0];}));
router.post('/notifications/read-all',...auth,wrap(async(r:any)=>{only(r.body,[]);return{updated:(await sql('UPDATE web_notifications SET read_at=now() WHERE user_id=$1 AND read_at IS NULL RETURNING id',[r.user.id])).length};}));
router.get('/partner/hotels/:id/promotions',...partner,wrap((r:any)=>b.partnerPromotions(r.user.id,r.params.id,r.query)));
router.get('/admin/promotions',...admin,wrap((r:any)=>b.adminPromotions(r.query)));
router.post('/admin/promotions/:id/suspend',...admin,wrap((r:any)=>b.suspendPromotion(r.user.id,r.params.id,r.body,r.headers['if-match'])));
router.get('/partner/reviews',...partner,wrap((r:any)=>b.partnerReviews(r.user.id,r.query)));
router.put('/partner/reviews/:id/reply',...partner,wrap((r:any)=>b.reply(r.user.id,r.params.id,r.body)));
router.delete('/partner/reviews/:id/reply',...partner,wrap((r:any)=>b.reply(r.user.id,r.params.id,r.body,true)));
router.get('/reviews/:id/reply',gate,wrap(async(r:any,res:any)=>{res.set('Cache-Control','no-store');return b.publicReply(r.params.id);}));
export default router;
