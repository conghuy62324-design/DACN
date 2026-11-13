import type { BookingModalData } from '../context/BookingContext';
import type { BookingService } from '../services/bookingService';

export interface PendingBookingIntent {
  userId: string;
  modalData: BookingModalData;
  payload: Parameters<typeof BookingService.createBooking>[0];
  keys: [string, string][];
}
const storageKey = (userId: string) => `hugo_pending_booking_v1:${userId}`;
export function readBookingIntent(userId?: string): PendingBookingIntent | undefined {
  if (!userId) return undefined;
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(userId)) ?? 'null');
    if (value?.userId === userId && value?.modalData?.serviceId && value?.payload?.serviceId && Array.isArray(value.keys)) return value;
  } catch { /* Storage may be unavailable; the mounted form still retains keys. */ }
}
export function rememberBookingIntent(value: PendingBookingIntent) {
  try { sessionStorage.setItem(storageKey(value.userId), JSON.stringify(value)); } catch { /* Keep the in-memory intent. */ }
}
export function clearBookingIntent(userId?: string) {
  if (userId && readBookingIntent(userId)) { try { sessionStorage.removeItem(storageKey(userId)); } catch { /* optional storage */ } }
}
