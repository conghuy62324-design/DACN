import { randomUUID } from 'node:crypto';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AuditLog, Booking, BookingStatusHistory, Business, Place, Ticket, Tour, User } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { bookingRequestFingerprint, BookingPayload, normalizeBookingPayload, validateIdempotencyKey } from '../utils/bookingValidation.js';
import { BusinessAccessService } from './businessAccessService.js';
import { TelemetryService } from './telemetryService.js';
import { RecommendationExposureService } from './recommendationExposureService.js';
export type { BookingPayload } from '../utils/bookingValidation.js';

export type BookingStatus = 'PENDING'|'CONFIRMED'|'CANCELLED'|'COMPLETED'|'REJECTED';
const transitions:Record<BookingStatus,BookingStatus[]>={PENDING:['CONFIRMED','REJECTED','CANCELLED'],CONFIRMED:['COMPLETED','CANCELLED'],CANCELLED:[],COMPLETED:[],REJECTED:[]};
export function assertBookingTransition(from:BookingStatus,to:BookingStatus){if(!transitions[from]?.includes(to))throw new HttpError(409,`Không thể chuyển trạng thái từ ${from} sang ${to}`,'INVALID_BOOKING_TRANSITION');}
export function calculateBookingPrice(unitPrice:number,adults:number,children:number,quantity?:number){
  const units = quantity ?? adults + children;
  if (!Number.isSafeInteger(units) || units < 1 || !Number.isFinite(unitPrice) || unitPrice < 0) throw new HttpError(400,'Số lượng hoặc giá không hợp lệ');
  const discount = quantity === undefined ? Math.round(unitPrice * children * 0.3) : 0;
  const totalAmount = unitPrice * units - discount;
  if (!Number.isFinite(totalAmount) || totalAmount > 9_999_999_999_999.99) throw new HttpError(409,'Giá dịch vụ vượt giới hạn','INVALID_SERVICE_PRICE');
  return {unitPrice,quantity:units,discountAmount:discount,totalAmount};
}
export function assertCapacity(available:number,requested:number){if(!Number.isSafeInteger(requested)||requested<=0||available<requested)throw new HttpError(409,'Dịch vụ không còn đủ số lượng','INSUFFICIENT_CAPACITY');}
const serialize=(model:any)=>{const v=model.toJSON?model.toJSON():model;const { requestFingerprint, ...publicBooking }=v;return{...publicBooking,unitPrice:Number(v.unitPrice),totalAmount:Number(v.totalAmount),discountAmount:Number(v.discountAmount ?? 0)};};
const isUuid=(value:string)=>/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

async function assertActiveBusiness(businessId:string|undefined, transaction:Transaction){
  const business = businessId ? await Business.findByPk(businessId,{transaction,lock:transaction.LOCK.SHARE}) : null;
  if(!business || business.status!=='ACTIVE') throw new HttpError(409,'Doanh nghiệp không còn nhận booking','BUSINESS_NOT_ACTIVE');
}
async function resolveService(payload:BookingPayload,transaction:Transaction){
  if(payload.serviceType==='ticket'){
    const ticket=await Ticket.findByPk(payload.serviceId,{transaction,lock:transaction.LOCK.UPDATE});
    if(!ticket||ticket.status!=='ACTIVE')throw new HttpError(404,'Vé không tồn tại hoặc đã ngừng bán');
    await assertActiveBusiness(ticket.businessId,transaction);
    const requested=payload.quantity ?? payload.adultsCount+payload.childrenCount;
    assertCapacity(ticket.availableSeats,requested);
    await ticket.update({availableSeats:ticket.availableSeats-requested},{transaction});
    return{businessId:ticket.businessId,serviceName:ticket.title,unitPrice:Number(ticket.price),ticketId:ticket.id};
  }
  if(payload.serviceType==='tour'){
    const tour=await Tour.findByPk(payload.serviceId,{transaction,lock:transaction.LOCK.UPDATE});
    if(!tour||tour.status!=='APPROVED')throw new HttpError(404,'Tour không tồn tại hoặc chưa được duyệt');
    await assertActiveBusiness(tour.businessId,transaction);
    const requested=payload.adultsCount+payload.childrenCount;
    assertCapacity(tour.availableCapacity,requested);
    await tour.update({availableCapacity:tour.availableCapacity-requested},{transaction});
    return{businessId:tour.businessId,serviceName:tour.title,unitPrice:Number(tour.priceVND),tourId:tour.id};
  }
  const place=await Place.findOne({where:{id:payload.serviceId,status:'APPROVED'},transaction,lock:transaction.LOCK.SHARE});
  if(!place)throw new HttpError(404,'Dịch vụ không tồn tại hoặc chưa được duyệt');
  if(place.category!==payload.serviceType)throw new HttpError(400,'Loại dịch vụ không khớp');
  await assertActiveBusiness(place.businessId,transaction);
  return{businessId:place.businessId,serviceName:place.name,unitPrice:Number(place.priceFrom),placeId:place.id};
}
async function restoreInventory(booking:Booking,transaction:Transaction){if(booking.ticketId){const ticket=await Ticket.findByPk(booking.ticketId,{transaction,lock:transaction.LOCK.UPDATE});if(ticket)await ticket.update({availableSeats:Math.min(ticket.capacity,ticket.availableSeats+booking.quantity)},{transaction});}if(booking.tourId){const tour=await Tour.findByPk(booking.tourId,{transaction,lock:transaction.LOCK.UPDATE});if(tour)await tour.update({availableCapacity:Math.min(tour.capacity,tour.availableCapacity+booking.quantity)},{transaction});}}

export class BookingService {
  static async createBooking(userId:string,raw:BookingPayload,idempotencyKey?:string){
    const payload = normalizeBookingPayload(raw);
    const key = validateIdempotencyKey(idempotencyKey);
    const fingerprint = bookingRequestFingerprint(payload);
    return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async transaction=>{
      if(key){
        // Serialize the intent BEFORE looking up a booking or consuming the last seat.
        // READ COMMITTED sees the first transaction's committed booking after this wait.
        await sequelize.query('SELECT pg_advisory_xact_lock(hashtextextended(:identity, 0))',{
          replacements:{identity:JSON.stringify(['booking-v1',userId,key])},transaction,
        });
        const existing=await Booking.findOne({where:{userId,idempotencyKey:key},transaction});
        if(existing){
          if(!existing.requestFingerprint)throw new HttpError(409,'Booking cũ chưa lưu định danh request; hãy xem lịch sử trước khi tạo đơn mới','LEGACY_IDEMPOTENCY_UNVERIFIABLE');
          if(existing.requestFingerprint!==fingerprint)throw new HttpError(409,'Key đã được sử dụng cho nội dung booking khác','IDEMPOTENCY_PAYLOAD_MISMATCH');
          return serialize(existing);
        }
      }
      const user=await User.findByPk(userId,{transaction});
      if(!user)throw new HttpError(401,'Tài khoản không tồn tại');
      if(payload.recommendationRequestId)await RecommendationExposureService.assertVisibleAttribution({userId,requestId:payload.recommendationRequestId,sessionId:payload.recommendationSessionId!,itemId:payload.serviceId,itemType:payload.serviceType,transaction});
      const service=await resolveService(payload,transaction);
      const price=calculateBookingPrice(service.unitPrice,payload.adultsCount,payload.childrenCount,payload.quantity);
      const booking=await Booking.create({
        bookingCode:'HG-'+randomUUID().replaceAll('-','').slice(0,24).toUpperCase(),userId,businessId:service.businessId,
        placeId:service.placeId,tourId:service.tourId,ticketId:service.ticketId,
        serviceType:payload.serviceType,serviceId:payload.serviceId,serviceName:service.serviceName,
        customerName:user.fullName,customerEmail:user.email,customerPhone:payload.customerPhone,
        bookingDate:payload.bookingDate,returnDate:payload.returnDate,adultsCount:payload.adultsCount,childrenCount:payload.childrenCount,
        ...price,paymentStatus:'unpaid',bookingStatus:'PENDING',notes:payload.notes,idempotencyKey:key,requestFingerprint:fingerprint,
        recommendationRequestId:payload.recommendationRequestId,recommendationItemId:payload.recommendationRequestId?payload.serviceId:undefined,
        recommendationItemType:payload.recommendationRequestId?payload.serviceType:undefined,
      },{transaction});
      await BookingStatusHistory.create({bookingId:booking.id,newStatus:'PENDING',actorUserId:userId,reason:'Customer created booking'},{transaction});
      await TelemetryService.recordBookingEvent({userId,bookingId:booking.id,eventType:'BOOKING_CREATED',transaction});
      return serialize(booking);
    });
  }
  static async getBookingsByUser(userId:string){return (await Booking.findAll({where:{userId},order:[['createdAt','DESC']]})).map(serialize);}
  static async getAllBookings(){return (await Booking.findAll({order:[['createdAt','DESC']]})).map(serialize);}
  static async getBookingByIdOrCode(value:string){const booking=await Booking.findOne({where:isUuid(value)?{id:value}:{bookingCode:value}});return booking?serialize(booking):null;}
  static async getOwned(userId:string,value:string){const booking=await Booking.findOne({where:isUuid(value)?{id:value,userId}:{bookingCode:value,userId}});if(!booking)throw new HttpError(404,'Không tìm thấy booking');return serialize(booking);}
  static async getForPartner(userId:string,id:string){const booking=await Booking.findByPk(id);if(!booking?.businessId)throw new HttpError(404,'Không tìm thấy booking');await BusinessAccessService.assert(userId,booking.businessId,'MANAGE_BOOKINGS');return serialize(booking);}
  static async listForPartner(userId:string,businessId:string,page=1,limit=20){await BusinessAccessService.assert(userId,businessId,'MANAGE_BOOKINGS');const safePage=Math.max(1,page),safeLimit=Math.min(100,Math.max(1,limit));const result=await Booking.findAndCountAll({where:{businessId},order:[['createdAt','DESC']],limit:safeLimit,offset:(safePage-1)*safeLimit});return{items:result.rows.map(serialize),total:result.count,page:safePage,limit:safeLimit};}
  static async changeStatus(id:string,status:BookingStatus,actor:{id:string;roles:string[]},reason?:string,partnerBusinessId?:string){return sequelize.transaction(async transaction=>{const booking=await Booking.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});if(!booking)throw new HttpError(404,'Booking không tồn tại');if(partnerBusinessId&&booking.businessId!==partnerBusinessId)throw new HttpError(403,'Booking không thuộc cơ sở này','BOOKING_ACCESS_DENIED');assertBookingTransition(booking.bookingStatus,status);if(status==='CANCELLED'||status==='REJECTED')await restoreInventory(booking,transaction);const oldStatus=booking.bookingStatus;await booking.update({bookingStatus:status},{transaction});await BookingStatusHistory.create({bookingId:id,oldStatus,newStatus:status,actorUserId:actor.id,reason},{transaction});await AuditLog.create({actorUserId:actor.id,action:`BOOKING_${status}`,entityType:'Booking',entityId:id,previousData:{status:oldStatus},newData:{status},reason},{transaction});const eventType=status==='CONFIRMED'?'BOOKING_CONFIRMED':status==='COMPLETED'?'BOOKING_COMPLETED':status==='CANCELLED'?'BOOKING_CANCELLED':undefined;if(eventType)await TelemetryService.recordBookingEvent({userId:booking.userId,bookingId:booking.id,eventType,transaction});return serialize(booking);});}
  static async cancelByCustomer(userId:string,id:string,reason?:string){const booking=await Booking.findOne({where:{id,userId}});if(!booking)throw new HttpError(404,'Không tìm thấy booking');return this.changeStatus(id,'CANCELLED',{id:userId,roles:['CUSTOMER']},reason);}
  static async updateBookingStatus(id:string,status:BookingStatus){return this.changeStatus(id,status,{id:'',roles:['SUPER_ADMIN']});}
}
