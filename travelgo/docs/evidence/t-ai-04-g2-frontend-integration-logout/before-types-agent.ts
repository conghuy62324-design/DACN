import type { GeneratedItinerary } from './index';

export interface AgentMessage { role: 'user' | 'assistant'; content: string }
export interface AgentChatRequest { message: string; history?: AgentMessage[]; externalProcessingConsent?: string }
export interface AgentPrivacy { version: string; text: string }
export interface AgentError { status: number; code?: string; canceled?: boolean }
export interface AgentPlace {
  id: string; name: string; category?: string; city?: string; province?: string;
  priceFrom: number | null; catalogPriceAvailable: boolean;
}
export type AgentItinerary = Omit<GeneratedItinerary, 'hotelSuggestion'> & { hotelSuggestion?: AgentPlace };
export type AgentResult = {
  type: 'places'; source: 'RecommendationService'; places: AgentPlace[]; warnings: string[];
} | {
  type: 'itinerary'; source: 'TourPlannerService'; itinerary: AgentItinerary; warnings: string[];
  cost: { currency: 'VND'; basis: 'GROUP_VND_V1'; estimated: number; budget: number;
    budgetStatus: 'within_budget' | 'over_budget'; overBudget: number };
};
interface AgentBase {
  reply: string; history: AgentMessage[]; historyTruncated: boolean;
  context: { mode: 'STATELESS'; personalizationEnabled: boolean; behavioralDataUsed: false; persisted: false };
}
export type AgentResponse = AgentBase & (
  { status: 'completed'; result: AgentResult } |
  { status: 'needs_input'; missingFields: string[] } |
  { status: 'unsupported' } |
  { status: 'tool_unavailable'; warningCode: 'AGENT_CATALOG_INSUFFICIENT' }
);
