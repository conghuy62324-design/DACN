import { api } from './api';
import { Place, Review } from '../types';
export type CatalogSearchParams={preferences?:string;dailyBudgetPerPerson?:number;locationId?:string;category?:string;city?:string;search?:string;minRating?:number;sortBy?:string;page?:number;limit?:number;minPriceFrom?:number;maxPriceFrom?:number;accommodationType?:string;cuisine?:string;amenities?:string;approvedSince?:string};

export const PlaceService = {
  async getPage(params:CatalogSearchParams){const res:any=await api.get('/places',{params});return {items:(res.data||[]) as Place[],meta:res.meta as {total:number;page:number;limit:number;pages:number}};},
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
