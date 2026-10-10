import { api } from './api';
import { Booking } from '../types';

export const BookingService = {
  async createBooking(payload: {
    serviceType: 'tour' | 'hotel' | 'restaurant' | 'ticket';
    serviceId: string;
    serviceName: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    bookingDate: string;
    returnDate?: string;
    adultsCount: number;
    childrenCount: number;
    unitPrice: number;
    totalAmount: number;
    notes?: string;
  }): Promise<Booking> {
    const res: any = await api.post('/bookings', payload);
    return res.data;
  },

  async getBookings(email?: string): Promise<Booking[]> {
    const res: any = await api.get('/bookings', { params: { email } });
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
};
