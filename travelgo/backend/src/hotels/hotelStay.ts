import type {HotelQuote} from './contracts.js';
import {Transaction} from 'sequelize';
import {randomUUID} from 'node:crypto';
import {sequelize} from '../config/database.js';
import {Booking,BookingStatusHistory,AuditLog} from '../models/index.js';
import {query,hotelSnapshot} from './postgresStore.js';
import {HotelReadService,type HotelReadSnapshot} from '../services/hotelReadService.js';
import {BusinessAccessService} from '../services/businessAccessService.js';
import {assertBookingTransition,type BookingStatus} from '../utils/bookingLifecycle.js';
import {hotelError,objectOnly,text,uuid} from './validation.js';
import {assertHotelCancellation,assertHotelStayCompletion,assertHotelStayWrites,cancellationContract,hotelIntentHash,normalizeHotelIntent,requiredHotelKey,signStayConfirmation,verifyStayConfirmation,type HotelIntent,type StayConfirmation,type CancellationContract} from './stayConfirmation.js';

const newId=()=>process.env.NODE_ENV==='test'&&(globalThis as any)[Symbol.for('hotel.test.idFactory')]?(globalThis as any)[Symbol.for('hotel.test.idFactory')]():randomUUID();
const plain=(b:any)=>{const v=b.toJSON?b.toJSON():b;const{requestFingerprint,...rest}=v;return{...rest,unitPrice:Number(v.unitPrice),totalAmount:Number(v.totalAmount),discountAmount:Number(v.discountAmount||0)};};
const now=async(t:Transaction)=>new Date((await query('SELECT clock_timestamp() now',[],t))[0].now).toISOString();
async function customer(userId:string,t:Transaction,locked=false){const rows=await query("SELECT u.id FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 AND r.role='CUSTOMER'"+(locked?' FOR SHARE OF u,r':''),[uuid(userId)],t);if(!rows.length)hotelError('HOTEL_CUSTOMER_REQUIRED','Đặt phòng cần tài khoản CUSTOMER hiện còn quyền.',403);}
const intentLock=(userId:string,key:string,t:Transaction)=>query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(['booking-v1',userId,key])],t);
async function transactionConfig(t:Transaction){await query("SET LOCAL lock_timeout='5s'",[],t);await query("SET LOCAL statement_timeout='8s'",[],t);}
async function authoritative(s:HotelReadSnapshot,intent:HotelIntent){
 if(!s.authority.isDemo)hotelError('HOTEL_PAYMENT_POLICY_REQUIRED','HotelStay hiện chỉ nhận dữ liệu SYNTHETIC sandbox; chưa có chính sách thu tiền cho dữ liệu kinh doanh thật.',409);
 const detail=await new HotelReadService({snapshot:async()=>s},true,true).detail(intent.placeId,intent.stay);
 if(!detail.address||!detail.hotelMedia.length)hotelError('HOTEL_PUBLIC_CONTENT_REQUIRED','Khách sạn chưa đủ địa chỉ và ảnh được duyệt.',409);
 const offer=detail.rooms.flatMap(r=>r.offers).find(o=>o.ratePlanId===intent.ratePlanId);
 if(!offer||!('quote'in offer))hotelError('HOTEL_QUOTE_UNAVAILABLE','Phòng/gói giá không đáp ứng đủ mọi đêm, số khách hoặc chính sách giá.',409);
 const quote=(offer as {quote:HotelQuote}).quote,room=detail.rooms.find(r=>r.id===quote.roomTypeId)!,rate=s.rates.find(r=>r.id===quote.ratePlanId)!;
 const cancellation=cancellationContract(quote,detail.profile,intent.stay.checkIn);
 const snapshot={contract:'HOTEL_ROOM_NIGHT_V1',hotel:{id:s.identity.id,name:s.identity.name,accommodationType:s.identity.accommodationType,address:s.address,checkInTime:s.profile.checkInTime,checkOutTime:s.profile.checkOutTime,timeSource:s.profile.timeSource},room:{id:room.id,name:room.name,beds:room.beds,areaM2:room.areaM2,view:room.view,maxAdults:room.maxAdults,maxChildren:room.maxChildren,maxOccupancy:room.maxOccupancy,amenities:room.amenities},rate:{id:rate.id,name:rate.name,mealPlan:rate.mealPlan,includedAdults:rate.includedAdults,extraAdultVndPerNight:rate.extraAdultVndPerNight,childPolicy:rate.childPolicy,childBands:rate.childBands,tax:rate.tax,fees:rate.fees},cancellation,contentRevision:detail.contentRevision,commercialRevision:detail.commercialRevision,sourceVersion:quote.sourceVersion,asOf:s.asOf,validUntil:new Date(Math.min(Date.parse(detail.validUntil),Date.parse(quote.expiresAt))).toISOString(),provenance:detail.provenance,isDemo:true,paymentBoundary:'SYNTHETIC_UNPAID_NO_CHARGE'};
 return{quote,snapshot};
}
export async function prepareHotelStay(userId:string,placeId:string,raw:any,keyRaw:any){
 assertHotelStayWrites();const key=requiredHotelKey(keyRaw),intent=normalizeHotelIntent(placeId,raw);
 return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ,readOnly:true},async t=>{await query('SET TRANSACTION READ ONLY',[],t);await customer(userId,t);const s=await hotelSnapshot(intent.placeId,t);if(!s)hotelError('HOTEL_NOT_FOUND','Không tìm thấy khách sạn.',404);s!.asOf=await now(t);const a=await authoritative(s!,intent);const value:StayConfirmation={purpose:'HOTELSTAY_CONFIRMATION_V1',userId,key,intent,intentHash:hotelIntentHash(intent),quote:a.quote,issuedAt:s!.asOf,validUntil:a.snapshot.validUntil,snapshot:a.snapshot};const confirmation=signStayConfirmation(value);if(confirmation.length>32768)hotelError('HOTEL_CONFIRMATION_SIZE','Nội dung chính sách quá lớn cho xác nhận hiện tại.',409);return{confirmation,snapshot:{...a.snapshot,quote:a.quote,occupancy:intent.stay.rooms},contact:intent.contact,validUntil:value.validUntil,binding:false,reserved:false,requiresExplicitConfirmation:true};});
}
export async function confirmHotelStay(userId:string,raw:any,keyRaw:any){
 assertHotelStayWrites();objectOnly(raw,['confirmation','accepted']);if(raw.accepted!==true)hotelError('HOTEL_EXPLICIT_CONFIRMATION_REQUIRED','Bạn cần chủ động xác nhận giá và điều kiện.');
 const key=requiredHotelKey(keyRaw),value=verifyStayConfirmation(raw.confirmation,userId,key),intent=value.intent;
 return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.READ_COMMITTED},async t=>{
  await transactionConfig(t);await customer(userId,t,true);await intentLock(userId,key,t);
  const existing=await Booking.findOne({where:{userId,idempotencyKey:key},transaction:t});
  if(existing){if(existing.requestFingerprint!==value.intentHash)hotelError('IDEMPOTENCY_PAYLOAD_MISMATCH','Mã ý định đã được dùng cho nội dung khác.',409);return{...plain(existing),hotelStay:(await readHotelStays([existing.id],t))[existing.id],idempotentReplay:true};}
  if(Date.parse(await now(t))>=Date.parse(value.validUntil))hotelError('HOTEL_CONFIRMATION_EXPIRED','Xác nhận đã hết hạn. Hãy xem báo giá mới rồi xác nhận lại.',409);
  const parent=await query('SELECT place_id FROM hotel_profiles WHERE place_id=$1 FOR UPDATE',[intent.placeId],t);if(!parent.length)hotelError('HOTEL_NOT_FOUND','Không tìm thấy khách sạn.',404);
  await query('SELECT p.id FROM places p JOIN businesses b ON b.id=p.business_id WHERE p.id=$1 FOR SHARE OF p,b',[intent.placeId],t);
  // Parent first, then exact room/date rows in deterministic order. The allocation trigger is the only counter writer.
  await query('SELECT room_type_id,stay_date FROM hotel_room_inventory WHERE room_type_id=$1 AND stay_date >= $2::date AND stay_date < $3::date ORDER BY room_type_id,stay_date FOR UPDATE',[value.quote.roomTypeId,intent.stay.checkIn,intent.stay.checkOut],t);
  const s=await hotelSnapshot(intent.placeId,t);s!.asOf=await now(t);if(Date.parse(s!.asOf)>=Date.parse(value.validUntil))hotelError('HOTEL_CONFIRMATION_EXPIRED','Xác nhận hết hạn trong khi chờ khóa. Hãy lấy báo giá mới.',409);
  const a=await authoritative(s!,intent);if(a.quote.sourceVersion!==value.quote.sourceVersion||a.quote.totalVnd!==value.quote.totalVnd)hotelError('HOTEL_CONFIRMATION_CHANGED','Giá, chính sách hoặc tồn phòng đã đổi. Hãy xem và xác nhận lại báo giá mới.',409);
  const bookingId=newId(),itemId=newId(),q=a.quote;
  const booking=await Booking.create({id:bookingId,bookingCode:'HG-'+randomUUID().replaceAll('-','').slice(0,24).toUpperCase(),userId,businessId:s!.authority.businessId,placeId:intent.placeId,serviceType:'hotel',serviceId:intent.placeId,serviceName:s!.identity.name,customerName:intent.contact.name,customerEmail:intent.contact.email,customerPhone:intent.contact.phone,notes:intent.contact.notes,bookingDate:intent.stay.checkIn,returnDate:intent.stay.checkOut,adultsCount:q.adults,childrenCount:q.children,quantity:q.roomCount,unitPrice:q.nightly[0].basePerRoomVnd,totalAmount:q.totalVnd,discountAmount:q.discountVnd,paymentStatus:'unpaid',bookingStatus:'PENDING',idempotencyKey:key,requestFingerprint:value.intentHash},{transaction:t});
  const snapshot={...a.snapshot,quote:q,occupancy:intent.stay.rooms,intentHash:value.intentHash,confirmedAt:s!.asOf,confirmationValidUntil:value.validUntil};
  await query('INSERT INTO hotel_booking_stays(booking_id,place_id,business_id,check_in,check_out,total_vnd,source_version,quote_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb)',[bookingId,intent.placeId,s!.authority.businessId,q.checkIn,q.checkOut,q.totalVnd,q.sourceVersion,JSON.stringify(snapshot)],t);
  await query('INSERT INTO hotel_booking_items(id,booking_id,place_id,room_type_id,rate_plan_id,quantity,occupancy,total_vnd,quote_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9::jsonb)',[itemId,bookingId,intent.placeId,q.roomTypeId,q.ratePlanId,q.roomCount,JSON.stringify(intent.stay.rooms),q.totalVnd,JSON.stringify(snapshot)],t);
  for(const night of q.nightly)await query('INSERT INTO hotel_room_allocations(id,booking_item_id,room_type_id,stay_date,quantity) VALUES($1,$2,$3,$4,$5)',[newId(),itemId,q.roomTypeId,night.stayDate,q.roomCount],t);
  await BookingStatusHistory.create({bookingId,newStatus:'PENDING',actorUserId:userId,reason:'Customer explicitly confirmed SYNTHETIC HotelStay; unpaid, no charge'},{transaction:t});
  await AuditLog.create({actorUserId:userId,action:'HOTEL_BOOKING_CREATED',entityType:'Booking',entityId:bookingId,newData:{sourceVersion:q.sourceVersion,totalVnd:q.totalVnd,paymentStatus:'unpaid'}},{transaction:t});
  return{...plain(booking),hotelStay:(await readHotelStays([bookingId],t))[bookingId],idempotentReplay:false};
 });
}
export async function hotelIntentStatus(userId:string,keyRaw:any){const key=requiredHotelKey(keyRaw);return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.READ_COMMITTED},async t=>{await transactionConfig(t);await intentLock(userId,key,t);const b=await Booking.findOne({where:{userId,idempotencyKey:key},transaction:t});return b?{...plain(b),hotelStay:(await readHotelStays([b.id],t))[b.id]}:null;});}
export async function readHotelStays(ids:string[],t?:Transaction):Promise<Record<string,any>>{
 if(process.env.HOTEL_DOMAIN_ENABLED!=='true'||!ids.length)return{};const out:Record<string,any>={};
 for(let i=0;i<ids.length;i+=100){const rows=await query('SELECT s.booking_id,s.quote_snapshot,s.check_in::text,s.check_out::text,b.booking_status,b.payment_status,clock_timestamp() as_of,(SELECT jsonb_agg(jsonb_build_object(\'id\',i.id,\'roomTypeId\',i.room_type_id,\'ratePlanId\',i.rate_plan_id,\'quantity\',i.quantity) ORDER BY i.id) FROM hotel_booking_items i WHERE i.booking_id=s.booking_id) items FROM hotel_booking_stays s JOIN bookings b ON b.id=s.booking_id WHERE s.booking_id=ANY($1::uuid[])',[ids.slice(i,i+100)],t);for(const r of rows){const s=r.quote_snapshot;let cancellationAllowed=false,blocker='';try{assertHotelCancellation(s.cancellation,r.booking_status,new Date(r.as_of).toISOString());cancellationAllowed=['PENDING','CONFIRMED'].includes(r.booking_status);}catch(e:any){blocker=e.code||'HOTEL_CANCELLATION_REVIEW_REQUIRED';}out[r.booking_id]={...s,items:r.items,checkIn:r.check_in,checkOut:r.check_out,cancellationAllowed,cancellationBlocker:blocker,paymentStatus:r.payment_status,paymentImplemented:false};}}
 return out;
}
export async function attachHotelStays(bookings:any[]){if(process.env.HOTEL_DOMAIN_ENABLED!=='true')return bookings;const ids=bookings.filter(b=>b.serviceType==='hotel').map(b=>b.id),stays=await readHotelStays(ids);return bookings.map(b=>stays[b.id]?{...b,hotelStay:stays[b.id]}:b);}
export async function isHotelStayBooking(id:string){if(process.env.HOTEL_DOMAIN_ENABLED!=='true'){const found=(await query("SELECT to_regclass('public.hotel_booking_stays') AS relation"))[0];if(!found?.relation)return false;}return(await query('SELECT booking_id FROM hotel_booking_stays WHERE booking_id=$1',[id])).length>0;}
export async function transitionHotelStay(id:string,status:BookingStatus,actor:{id:string;roles:string[]},reason?:string,businessId?:string){
 assertHotelStayWrites();if(reason!==undefined)text(reason,1000,true);
 return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.READ_COMMITTED},async t=>{
  await transactionConfig(t);const initial=(await query('SELECT place_id FROM hotel_booking_stays WHERE booking_id=$1',[uuid(id)],t))[0];if(!initial)hotelError('BOOKING_NOT_FOUND','Không tìm thấy đặt phòng.',404);
  await query('SELECT place_id FROM hotel_profiles WHERE place_id=$1 FOR UPDATE',[initial.place_id],t);
  const b=await Booking.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});if(!b)hotelError('BOOKING_NOT_FOUND','Không tìm thấy đặt phòng.',404);
  if(actor.roles.includes('PARTNER')&&!actor.roles.includes('SUPER_ADMIN')){if(businessId&&businessId!==b!.businessId)hotelError('BOOKING_ACCESS_DENIED','Đơn không thuộc cơ sở.',403);await BusinessAccessService.assert(actor.id,b!.businessId!,'MANAGE_BOOKINGS');const m=await query("SELECT id FROM business_members WHERE user_id=$1 AND business_id=$2 AND permissions @> '[\"MANAGE_BOOKINGS\"]'::jsonb FOR SHARE",[actor.id,b!.businessId],t);if(!m.length)hotelError('BUSINESS_ACCESS_DENIED','Quyền quản lý đơn đã thay đổi.',403);}
  else if(!actor.roles.includes('SUPER_ADMIN')){if(b!.userId!==actor.id||status!=='CANCELLED')hotelError('BOOKING_ACCESS_DENIED','Bạn chỉ được hủy đơn của mình.',403);await customer(actor.id,t,true);}
  const saved=(await query('SELECT quote_snapshot,check_out::text FROM hotel_booking_stays WHERE booking_id=$1',[id],t))[0],snapshot=saved.quote_snapshot;
  if(b!.bookingStatus==='CANCELLED'&&status==='CANCELLED')return{...plain(b),hotelStay:(await readHotelStays([id],t))[id],duplicateCancellation:true};
  assertBookingTransition(b!.bookingStatus,status);
  const clock=await now(t);if(status==='CANCELLED')assertHotelCancellation(snapshot.cancellation,b!.bookingStatus,clock);
  if(status==='COMPLETED')assertHotelStayCompletion(saved.check_out,snapshot.hotel,clock);
  if(b!.paymentStatus!=='unpaid')hotelError('HOTEL_PAYMENT_RECONCILIATION_REQUIRED','Cần đối soát thanh toán; sandbox không tự hoàn tiền.',409);
  const allocations=await query("SELECT a.id,a.room_type_id,a.stay_date::text FROM hotel_room_allocations a JOIN hotel_booking_items i ON i.id=a.booking_item_id WHERE i.booking_id=$1 ORDER BY a.room_type_id,a.stay_date FOR UPDATE OF a",[id],t);
  for(const a of allocations)await query('SELECT room_type_id FROM hotel_room_inventory WHERE room_type_id=$1 AND stay_date=$2 FOR UPDATE',[a.room_type_id,a.stay_date],t);
  const previous=b!.bookingStatus;await b!.update({bookingStatus:status},{transaction:t});
  if(status==='CANCELLED'||status==='REJECTED')await query("UPDATE hotel_room_allocations a SET state='RELEASED',released_at=clock_timestamp(),release_reason=$2 FROM hotel_booking_items i WHERE a.booking_item_id=i.id AND i.booking_id=$1 AND a.state='ACTIVE'",[id,'HotelStay '+status],t);
  await BookingStatusHistory.create({bookingId:id,oldStatus:previous,newStatus:status,actorUserId:actor.id,reason:reason||'HotelStay lifecycle update; no payment/refund performed'},{transaction:t});
  await AuditLog.create({actorUserId:actor.id,action:'HOTEL_BOOKING_'+status,entityType:'Booking',entityId:id,previousData:{status:previous},newData:{status,paymentStatus:'unpaid',refundPerformed:false},reason},{transaction:t});
  return{...plain(b),hotelStay:(await readHotelStays([id],t))[id],refundPerformed:false};
 });
}
