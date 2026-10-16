import { Place } from '../types';
import { api } from './api';
import { getTelemetrySessionId, TelemetrySurface } from './telemetryService';

export interface FavoriteRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  place: Place;
}

interface FavoriteMutationResult {
  changed: boolean;
  favorite: FavoriteRecord | null;
  telemetry: { recorded: boolean; eventId?: string; reason?: string };
}

function mutationPayload(uiSurface: TelemetrySurface, requestId?: string) {
  return {
    contractVersion: '1.0',
    sessionId: getTelemetrySessionId(),
    uiSurface,
    ...(requestId ? { requestId } : {}),
  };
}

export const FavoriteApi = {
  async list(): Promise<FavoriteRecord[]> {
    const response: any = await api.get('/favorites');
    return response.data.items;
  },

  async add(placeId: string, uiSurface: TelemetrySurface, requestId?: string): Promise<FavoriteMutationResult> {
    const response: any = await api.post(`/favorites/${placeId}`, mutationPayload(uiSurface, requestId));
    return response.data;
  },

  async remove(placeId: string, uiSurface: TelemetrySurface, requestId?: string): Promise<FavoriteMutationResult> {
    const response: any = await api.delete(`/favorites/${placeId}`, { data: mutationPayload(uiSurface, requestId) });
    return response.data;
  },
};
