import { api } from './api';
import { TripSession, GeneratedItinerary, TripCheckin } from '../types';

export const TripService = {
  async getTrips(userId?: string): Promise<TripSession[]> {
    const res: any = await api.get('/trips', { params: { userId } });
    return res.data || [];
  },

  async getTripById(id: string): Promise<TripSession> {
    const res: any = await api.get(`/trips/${id}`);
    return res.data;
  },

  async saveTripFromPlanner(
    itinerary: GeneratedItinerary,
    userId?: string,
    userName?: string
  ): Promise<TripSession> {
    const res: any = await api.post('/trips', { itinerary, userId, userName });
    return res.data;
  },

  async updateTrip(id: string, updates: Partial<TripSession>): Promise<TripSession> {
    const res: any = await api.put(`/trips/${id}`, updates);
    return res.data;
  },

  async deleteTrip(id: string): Promise<boolean> {
    const res: any = await api.delete(`/trips/${id}`);
    return res.success;
  },

  async checkinPlace(
    tripId: string,
    placeId: string,
    placeName: string,
    geo?: { latitude: number; longitude: number; accuracyMeters?: number },
    notes?: string
  ): Promise<{ success: boolean; trip: TripSession; checkin: TripCheckin; message: string }> {
    const res: any = await api.post(`/trips/${tripId}/checkin`, {
      placeId,
      placeName,
      geo,
      notes,
    });
    return res;
  },

  async completeTrip(tripId: string): Promise<TripSession> {
    const res: any = await api.post(`/trips/${tripId}/complete`);
    return res.data;
  },

  async convertToBlogDraft(tripId: string): Promise<{
    success: boolean;
    blogDraft: {
      title: string;
      destination: string;
      summary: string;
      content: string;
      visitedPlaces: string[];
      totalCostVND: number;
      durationText: string;
      suggestedTags: string[];
      sourceTripId: string;
    };
    message: string;
  }> {
    const res: any = await api.post(`/trips/${tripId}/convert-to-blog`);
    return res;
  },
};
