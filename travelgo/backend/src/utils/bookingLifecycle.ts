import {HttpError} from './httpError.js';
export type BookingStatus='PENDING'|'CONFIRMED'|'CANCELLED'|'COMPLETED'|'REJECTED';
const transitions:Record<BookingStatus,BookingStatus[]>={PENDING:['CONFIRMED','REJECTED','CANCELLED'],CONFIRMED:['COMPLETED','CANCELLED'],CANCELLED:[],COMPLETED:[],REJECTED:[]};
export function assertBookingTransition(from:BookingStatus,to:BookingStatus){if(!transitions[from]?.includes(to))throw new HttpError(409,`Không thể chuyển trạng thái từ ${from} sang ${to}`,'INVALID_BOOKING_TRANSITION');}
