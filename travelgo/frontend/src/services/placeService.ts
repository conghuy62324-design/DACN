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
    bookingId?: string;
    rating: number;
    criteria?: { service?: number; price?: number; location?: number; experience?: number };
    comment: string;
  }): Promise<Review> {
    const res: any = await api.post(`/places/${id}/reviews`, data);
    return res.data;
  },

  async getMyReviews(): Promise<Review[]> {
    const res: any = await api.get('/reviews/me');
    return res.data || [];
  },

  async updateReview(id: string, data: {
    rating: number;
    criteria?: { service?: number; price?: number; location?: number; experience?: number };
    comment: string;
  }): Promise<Review> {
    const res: any = await api.patch(`/reviews/${id}`, data);
    return res.data;
  },

  async deleteReview(id: string): Promise<void> {
    await api.delete(`/reviews/${id}`);
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
