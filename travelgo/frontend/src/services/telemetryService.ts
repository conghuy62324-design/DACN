import { api } from './api';

export type TelemetryItemType = 'place' | 'hotel' | 'restaurant' | 'tour' | 'ticket' | 'blog' | 'trip';
export type ClientTelemetryEvent = 'VIEW' | 'CLICK' | 'ADD_TO_TRIP' | 'REMOVE_FROM_TRIP' | 'MAP_OPENED' | 'ROUTE_VIEWED';
export type TelemetrySurface = 'home_featured' | 'explore_results' | 'place_detail' | 'tour_list' | 'tour_detail' | 'favorites' | 'booking_modal' | 'tour_planner' | 'trip_detail';

export interface TelemetryConsentState {
  hasDecision: boolean;
  analyticsEnabled: boolean;
  personalizationEnabled: boolean;
  policyVersion: string;
  retentionDays: number;
}

export interface TelemetryEventInput {
  itemId: string;
  itemType: TelemetryItemType;
  eventType: ClientTelemetryEvent;
  uiSurface: TelemetrySurface;
  requestId?: string;
  context?: {
    position?: number;
    dwellMs?: number;
    deviceClass?: 'mobile' | 'tablet' | 'desktop';
    locale?: string;
  };
}

export function getTelemetrySessionId(): string {
  const key = 'hugo_telemetry_session_v1';
  let value = sessionStorage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    sessionStorage.setItem(key, value);
  }
  return value;
}

export const TelemetryApi = {
  async getConsent(): Promise<TelemetryConsentState> {
    const response: any = await api.get('/intelligence/consent');
    return response.data;
  },

  async updateConsent(input: { analyticsEnabled: boolean; personalizationEnabled: boolean; deleteExistingEvents?: boolean }): Promise<TelemetryConsentState> {
    const response: any = await api.put('/intelligence/consent', input);
    return response.data;
  },

  async track(input: TelemetryEventInput): Promise<void> {
    await api.post('/intelligence/events', {
      contractVersion: '1.0',
      clientEventId: crypto.randomUUID(),
      sessionId: getTelemetrySessionId(),
      occurredAt: new Date().toISOString(),
      ...input,
    });
  },
};
