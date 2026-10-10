import { api } from './api';
import { Place, Review } from '../types';

export const PlaceService = {
  async getPlaces(params?: {
    category?: string;
    city?: string;
    search?: string;
    minRating?: number;
    sortBy?: string;
  }): Promise<Place[]> {
    const res: any = await api.get('/places', { params });
    return res.data || [];
  },

  async getPlaceById(id: string): Promise<Place> {
    const res: any = await api.get(`/places/${id}`);
    return res.data;
  },

  async getReviews(id: string): Promise<Review[]> {
    const res: any = await api.get(`/places/${id}/reviews`);
    return res.data || [];
  },

  async addReview(id: string, data: {
    userName: string;
    rating: number;
    criteria?: { service?: number; price?: number; location?: number; experience?: number };
    comment: string;
  }): Promise<Review> {
    const res: any = await api.post(`/places/${id}/reviews`, data);
    return res.data;
  },

  async createPlace(data: Partial<Place>): Promise<Place> {
    const res: any = await api.post('/places', data);
    return res.data;
  },

  async deletePlace(id: string): Promise<boolean> {
    const res: any = await api.delete(`/places/${id}`);
    return res.success;
  },
};
