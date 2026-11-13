import type { GeneratedItinerary } from './index';

export interface AgentMessage { role: 'user' | 'assistant'; content: string }
export interface AgentConversationMetadata { id: string; revision: number; expiresAt: string; mode: 'LOCAL_DEMO'; persisted: false }
export type AgentG2Request = { action: 'start'; requestId: string; consentVersion: 'LOCAL_DEMO_SLOTS_V1' } |
  { action: 'continue'; requestId: string; consentVersion: 'LOCAL_DEMO_SLOTS_V1'; id: string; revision: number };
export interface AgentChatRequest { message: string; history?: AgentMessage[]; externalProcessingConsent?: string; conversation?: AgentG2Request }
export interface AgentPrivacy { version: string; text: string }
export interface AgentG2Privacy extends AgentPrivacy { version: 'LOCAL_DEMO_SLOTS_V1'; enabled: boolean; mode: 'LOCAL_DEMO'; ttlSeconds: 900 }
export interface AgentError { status: number; code?: string; canceled?: boolean; conversation?: AgentConversationMetadata }
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
}
type AgentModeResponse = {
  context: { mode: 'STATELESS'; personalizationEnabled: boolean; behavioralDataUsed: false; persisted: false }; conversation?: never;
} | {
  context: { mode: 'LOCAL_DEMO_VERIFIED_HISTORY'; personalizationEnabled: boolean; behavioralDataUsed: false; persisted: false };
  conversation: AgentConversationMetadata;
};
export type AgentResponse = AgentBase & AgentModeResponse & (
  { status: 'completed'; result: AgentResult } |
  { status: 'needs_input'; missingFields: string[] } |
  { status: 'unsupported' } |
  { status: 'tool_unavailable'; warningCode: 'AGENT_CATALOG_INSUFFICIENT' }
);
