import {createHmac,timingSafeEqual} from 'node:crypto';
import {ENV} from '../config/env.js';
import {hotelError,normalizeStayRequest,objectOnly,text,uuid} from './validation.js';
import {hotelSourceVersion} from './pricing.js';
import {validateIdempotencyKey} from '../utils/bookingValidation.js';
import type {HotelQuote,StayRequest} from './contracts.js';

export type HotelContact={name:string;email:string;phone:string;notes?:string};
export type HotelIntent={placeId:string;ratePlanId:string;stay:StayRequest;contact:HotelContact};
export type CancellationContract={kind:'FREE_UNTIL_CUTOFF'|'NON_REFUNDABLE';deadlineAt:string|null;terms:string;payment:'SYNTHETIC_UNPAID_NO_CHARGE';automaticFeeVnd:0|null};
export type StayConfirmation={purpose:'HOTELSTAY_CONFIRMATION_V1';userId:string;key:string;intent:HotelIntent;intentHash:string;quote:HotelQuote;validUntil:string;issuedAt:string;snapshot:Record<string,any>};
export function hotelStayWritesEnabled(){return process.env.HOTEL_DOMAIN_ENABLED==='true'&&process.env.HOTEL_STAY_BOOKING_ENABLED==='true'&&ENV.NODE_ENV==='test'&&ENV.DB_HOST==='127.0.0.1'&&ENV.DB_NAME===process.env.HOTEL_STAY_APPROVED_DATABASE&&Number.isFinite(Date.parse(process.env.HOTEL_STAY_WRITE_UNTIL||''))&&Date.now()<Date.parse(process.env.HOTEL_STAY_WRITE_UNTIL!);}
export function assertHotelStayWrites(){if(!hotelStayWritesEnabled())hotelError('HOTEL_STAY_WRITE_DISABLED','Đặt phòng sandbox chưa được mở hoặc phiên thử nghiệm đã hết hạn.',503);}
export function hotelContact(raw:any):HotelContact{
 objectOnly(raw,['name','email','phone','notes']);const name=text(raw.name,120)!,email=text(raw.email,255)!,phone=text(raw.phone,20)!;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[-+0-9 ()]{9,20}$/.test(phone))hotelError('HOTEL_CONTACT_INVALID','Email hoặc số điện thoại liên hệ chưa hợp lệ.');
 const notes=raw.notes===undefined||raw.notes===''?undefined:text(raw.notes,2000)!;return{name,email,phone,...(notes?{notes}:{})};
}
export function normalizeHotelIntent(placeId:string,raw:any):HotelIntent{objectOnly(raw,['ratePlanId','stay','contact']);return{placeId:uuid(placeId),ratePlanId:uuid(raw.ratePlanId),stay:normalizeStayRequest(raw.stay),contact:hotelContact(raw.contact)};}
export const hotelIntentHash=(intent:HotelIntent)=>hotelSourceVersion({contract:'HOTELSTAY_INTENT_V1',...intent});
export function requiredHotelKey(raw:any){const key=validateIdempotencyKey(raw);if(!key)hotelError('HOTEL_IDEMPOTENCY_REQUIRED','Cần mã chống trùng cho ý định đặt phòng.');return key!;}
const signature=(value:string)=>createHmac('sha256',ENV.JWT_SECRET).update('HOTELSTAY_CONFIRMATION_V1\0'+value).digest();
export function signStayConfirmation(value:StayConfirmation){const payload=Buffer.from(JSON.stringify(value)).toString('base64url');return payload+'.'+signature(payload).toString('base64url');}
/** Signature/auth/key are checked even for idempotent replay. Expiry is checked after the existing-booking lookup. */
export function verifyStayConfirmation(raw:any,userId:string,key:string):StayConfirmation{
 if(typeof raw!=='string'||raw.length>32768||!/^[-_A-Za-z0-9]+\.[-_A-Za-z0-9]+$/.test(raw))hotelError('HOTEL_CONFIRMATION_INVALID','Xác nhận không hợp lệ.',400);
 const[payload,sig]=raw.split('.'),actual=Buffer.from(sig,'base64url'),expected=signature(payload);if(actual.length!==expected.length||!timingSafeEqual(actual,expected))hotelError('HOTEL_CONFIRMATION_INVALID','Xác nhận đã bị thay đổi.',400);
 let value:StayConfirmation;try{value=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));}catch{hotelError('HOTEL_CONFIRMATION_INVALID','Không đọc được xác nhận.');}
 if(value!.purpose!=='HOTELSTAY_CONFIRMATION_V1'||value!.userId!==userId||value!.key!==key)hotelError('HOTEL_CONFIRMATION_OWNER_OR_KEY','Xác nhận không thuộc tài khoản hoặc ý định này.',403);
 const normalized=normalizeHotelIntent(value!.intent.placeId,{ratePlanId:value!.intent.ratePlanId,stay:value!.intent.stay,contact:value!.intent.contact});if(hotelIntentHash(normalized)!==value!.intentHash)hotelError('HOTEL_CONFIRMATION_INVALID','Nội dung xác nhận không khớp.');
 if(!Number.isFinite(Date.parse(value!.validUntil))||!Number.isFinite(Date.parse(value!.issuedAt))||Date.parse(value!.validUntil)-Date.parse(value!.issuedAt)>60000)hotelError('HOTEL_CONFIRMATION_INVALID','Thời hạn xác nhận không hợp lệ.');
 return value!;
}
export function cancellationContract(quote:HotelQuote,profile:{checkInTime:string;timeSource?:string},checkIn:string):CancellationContract{
 const p=quote.cancellation;if(p.kind==='CONDITIONAL')hotelError('HOTEL_CANCELLATION_POLICY_UNSUPPORTED','Gói giá cần quy định phí hủy có cấu trúc trước khi nhận đặt phòng.',409);
 if(p.kind==='NON_REFUNDABLE')return{kind:p.kind,deadlineAt:null,terms:p.terms,payment:'SYNTHETIC_UNPAID_NO_CHARGE',automaticFeeVnd:null};
 if(profile.timeSource!=='APPROVED_CONTENT_SNAPSHOT'||p.cutoffHours===null)hotelError('HOTEL_POLICY_TIME_UNKNOWN','Chưa xác minh giờ nhận phòng để tính hạn hủy.',409);
 const date=Date.parse(checkIn+'T'+profile.checkInTime+'+07:00');if(!Number.isFinite(date))hotelError('HOTEL_POLICY_TIME_UNKNOWN','Giờ nhận phòng chưa hợp lệ.',409);
 return{kind:'FREE_UNTIL_CUTOFF',deadlineAt:new Date(date-p.cutoffHours!*3600000).toISOString(),terms:p.terms,payment:'SYNTHETIC_UNPAID_NO_CHARGE',automaticFeeVnd:0};
}
export function assertHotelCancellation(policy:CancellationContract,status:string,asOf:string){
 if(status==='CANCELLED')return;
 if(!['PENDING','CONFIRMED'].includes(status))hotelError('HOTEL_CANCEL_STATE','Trạng thái không cho phép hủy tự động.',409);
 if(policy.kind!=='FREE_UNTIL_CUTOFF'||!policy.deadlineAt||Date.parse(asOf)>=Date.parse(policy.deadlineAt))hotelError('HOTEL_CANCELLATION_POLICY_BLOCKED','Gói giá không cho phép hủy tự động miễn phí lúc này. Không tự suy nghĩa vụ hoàn tiền.',409);
}
export function assertHotelStayCompletion(checkOut:string,hotel:{checkOutTime?:string;timeSource?:string},asOf:string){
 if(hotel.timeSource!=='APPROVED_CONTENT_SNAPSHOT'||!hotel.checkOutTime)hotelError('HOTEL_CHECKOUT_TIME_UNKNOWN','Chưa có giờ trả phòng được duyệt để xác minh đã kết thúc lưu trú.',409);
 const end=Date.parse(checkOut+'T'+hotel.checkOutTime+'+07:00');if(!Number.isFinite(end)||Date.parse(asOf)<end)hotelError('HOTEL_STAY_NOT_ENDED','Chưa kết thúc kỳ lưu trú để đánh dấu hoàn thành.',409);
}
