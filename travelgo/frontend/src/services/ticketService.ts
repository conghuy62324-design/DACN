import { api } from './api';
import { Ticket } from '../types';

export const TicketService = {
  async getTickets(params?: {
    type?: string;
    fromCity?: string;
    toCity?: string;
    maxPrice?: number;
  }): Promise<Ticket[]> {
    const res: any = await api.get('/tickets', { params });
    return res.data || [];
  },

  async getTicketById(id: string): Promise<Ticket> {
    const res: any = await api.get(`/tickets/${id}`);
    return res.data;
  },
};
