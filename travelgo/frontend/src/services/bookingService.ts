import { api } from './api';
import { Booking } from '../types';

export const BookingService = {
  async createBooking(payload: {
    serviceType: 'tour' | 'hotel' | 'restaurant' | 'ticket';
    serviceId: string;
    customerPhone: string;
    bookingDate: string;
    returnDate?: string;
    adultsCount: number;
    childrenCount: number;
    quantity?: number;
    notes?: string;
  }): Promise<Booking> {
    const res: any = await api.post('/bookings', payload, { headers: { 'Idempotency-Key': crypto.randomUUID() } });
    return res.data;
  },

  async getBookings(): Promise<Booking[]> {
    const res: any = await api.get('/bookings/my');
    return res.data || [];
  },

  async getBookingByCode(code: string): Promise<Booking> {
    const res: any = await api.get(`/bookings/${code}`);
    return res.data;
  },

  async updateBookingStatus(id: string, status: string): Promise<Booking> {
    const res: any = await api.patch(`/bookings/${id}/status`, { status });
    return res.data;
  },

  async cancelBooking(id: string): Promise<Booking> {
    const res: any = await api.post(`/bookings/${id}/cancel`);
    return res.data;
  },
};
