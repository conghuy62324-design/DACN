import { Place } from '../types';
import { api } from './api';
import { getTelemetrySessionId, TelemetryItemType, TelemetrySurface } from './telemetryService';

export interface RecommendedPlace extends Place {
  rank: number;
  score: number;
  scoreBreakdown: {
    qualityScore: number;
    preferenceScore: number;
    budgetScore: number;
    distanceScore: number;
  };
  reasonCodes: string[];
  why: string;
}

export interface RecommendationResponse {
  requestId: string;
  contractVersion: '1.0';
  algorithmVersion: string;
  policyVersion: string;
  modelVersion: string;
  configVersion: string;
  experiment: { key: string | null; variant: 'CONTROL' };
  dataUpdatedAt?: string;
  consent: { analytics: boolean; personalization: boolean };
  items: RecommendedPlace[];
  fallback?: {
    applied: boolean;
    code: 'NO_DESTINATION_MATCH' | null;
    requestedDestination?: string;
  };
  rankingContext?: {
    candidateCount: number;
    distanceBasis: 'PROVIDED_CENTER_AERIAL' | 'FILTERED_CANDIDATE_CENTROID_AERIAL' | 'DISABLED';
  };
  limitations: string[];
}

export const RecommendationApi = {
  async recommendPlaces(input: {
    uiSurface: 'home_featured' | 'explore_results' | 'tour_planner';
    filters?: { destinationCity?: string; category?: string; search?: string; minRating?: number };
    explicitPreferences?: string[];
    dailyBudgetPerPerson?: number;
    limit?: number;
  }): Promise<RecommendationResponse> {
    const response: any = await api.post('/intelligence/recommendations', {
      contractVersion: '1.0', sessionId: getTelemetrySessionId(), ...input,
    });
    return response.data;
  },

  async acknowledgeVisible(input: {
    requestId: string;
    itemId: string;
    itemType: Extract<TelemetryItemType, 'place' | 'hotel' | 'restaurant'>;
    uiSurface: Extract<TelemetrySurface, 'home_featured' | 'explore_results' | 'tour_planner'>;
    visibleRatio: number;
    dwellMs: number;
  }): Promise<{ recorded: boolean; duplicate: boolean; reason?: string }> {
    const response: any = await api.post('/intelligence/recommendations/visible', {
      contractVersion: '1.0', clientAckId: crypto.randomUUID(), requestId: input.requestId,
      sessionId: getTelemetrySessionId(), itemId: input.itemId, itemType: input.itemType,
      uiSurface: input.uiSurface, visibilityRuleVersion: 'viewport-50pct-2000ms-v1',
      visibleRatio: input.visibleRatio, dwellMs: input.dwellMs, visibleAt: new Date().toISOString(),
    });
    return response.data;
  },
};
