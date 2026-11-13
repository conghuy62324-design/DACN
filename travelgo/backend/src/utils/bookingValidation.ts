import { createHash } from 'node:crypto';
import { HttpError } from './httpError.js';

export interface BookingPayload {
  serviceType: 'tour' | 'hotel' | 'restaurant' | 'ticket';
  serviceId: string; bookingDate: string; returnDate?: string;
  adultsCount: number; childrenCount: number; quantity?: number;
  customerPhone: string; notes?: string;
  recommendationRequestId?: string; recommendationSessionId?: string;
}
export const MAX_BOOKING_UNITS = 100;
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalid = (message: string): never => { throw new HttpError(400, message, 'INVALID_BOOKING_INPUT'); };
function date(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return invalid('Ngày phải đúng YYYY-MM-DD');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return invalid('Ngày không tồn tại trên lịch');
  return value;
}
function count(value: unknown, min: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > MAX_BOOKING_UNITS) return invalid(`Số lượng phải là số nguyên ${min}–${MAX_BOOKING_UNITS}`);
  return value;
}
export function validateIdempotencyKey(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]{1,120}$/.test(value)) return invalid('Idempotency-Key không hợp lệ');
  return value;
}
/** The one canonical request contract, used at both HTTP and service boundaries. */
export function normalizeBookingPayload(raw: unknown): BookingPayload {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return invalid('Body booking phải là object');
  const p = raw as Record<string, unknown>;
  if (!['tour', 'hotel', 'restaurant', 'ticket'].includes(p.serviceType as string)) return invalid('Loại dịch vụ không hợp lệ');
  if (typeof p.serviceId !== 'string' || !uuid.test(p.serviceId)) return invalid('Mã dịch vụ phải là UUID');
  if (typeof p.customerPhone !== 'string' || !/^[0-9+ ()-]{9,20}$/.test(p.customerPhone.trim())) return invalid('Số điện thoại không hợp lệ');
  const adultsCount = count(p.adultsCount, 1);
  const childrenCount = count(p.childrenCount === undefined ? 0 : p.childrenCount, 0);
  if (adultsCount + childrenCount > MAX_BOOKING_UNITS) return invalid('Tổng số khách tối đa 100');
  let quantity: number | undefined;
  if (p.quantity !== undefined) {
    if (p.serviceType !== 'ticket') return invalid('quantity chỉ hỗ trợ cho vé; dịch vụ khác tính theo số khách');
    quantity = count(p.quantity, 1);
  }
  const bookingDate = date(p.bookingDate);
  const returnDate = p.returnDate === undefined ? undefined : date(p.returnDate);
  if (returnDate !== undefined && returnDate < bookingDate) return invalid('Ngày kết thúc không được trước ngày sử dụng');
  if (p.notes !== undefined && (typeof p.notes !== 'string' || p.notes.length > 5000)) return invalid('Ghi chú tối đa 5000 ký tự');
  const requestId = p.recommendationRequestId;
  const sessionId = p.recommendationSessionId;
  if ((requestId === undefined) !== (sessionId === undefined) ||
      (requestId !== undefined && (typeof requestId !== 'string' || !uuid.test(requestId) || typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 120))) {
    throw new HttpError(400, 'Attribution booking không hợp lệ', 'INVALID_RECOMMENDATION_ATTRIBUTION');
  }
  return {
    serviceType: p.serviceType as BookingPayload['serviceType'], serviceId: p.serviceId.toLowerCase(), bookingDate, returnDate,
    adultsCount, childrenCount, quantity, customerPhone: p.customerPhone.trim(), notes: (p.notes as string | undefined)?.trim() || undefined,
    recommendationRequestId: (requestId as string | undefined)?.toLowerCase(), recommendationSessionId: sessionId as string | undefined,
  };
}
/** Fixed field order/version; deliberately independent of live catalog price and account profile. */
export function bookingRequestFingerprint(p: BookingPayload): string {
  return createHash('sha256').update(JSON.stringify({ v: 1, ...p })).digest('hex');
}
