import { api } from './api';
import { TourPackage, PlannerInput, GeneratedItinerary } from '../types';

export const TourService = {
  async getTours(params?: {
    city?: string;
    category?: string;
    maxPrice?: number;
    durationDays?: number;
    sortBy?: string;
    search?: string;
  }): Promise<TourPackage[]> {
    const res: any = await api.get('/tours', { params });
    return res.data || [];
  },

  async getTourById(id: string): Promise<TourPackage> {
    const res: any = await api.get(`/tours/${id}`);
    return res.data;
  },

  async planItinerary(input: PlannerInput): Promise<GeneratedItinerary> {
    const res: any = await api.post('/tours/plan', input);
    return res.data;
  },

  async createTour(data: Partial<TourPackage>): Promise<TourPackage> {
    const res: any = await api.post('/tours', data);
    return res.data;
  },

  async updateTour(id: string, data: Partial<TourPackage>): Promise<TourPackage> {
    const res: any = await api.put(`/tours/${id}`, data);
    return res.data;
  },

  async deleteTour(id: string): Promise<boolean> {
    const res: any = await api.delete(`/tours/${id}`);
    return res.success;
  },
};
