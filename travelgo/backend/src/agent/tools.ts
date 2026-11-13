import { HttpError } from '../utils/httpError.js';
import { validatePlannerInput } from '../utils/plannerValidation.js';
import { validateTravelPreferences, TRAVEL_PREFERENCE_IDS } from '../utils/travelPreferences.js';
import { RecommendationService } from '../services/recommendationService.js';
import { TourPlannerService } from '../services/tourPlannerService.js';
import { object, onlyKeys } from './conversation.js';

export const FIELD_LABELS = {
  departureCity: 'nơi xuất phát', destinationCity: 'điểm đến', startDate: 'ngày bắt đầu (YYYY-MM-DD)',
  endDate: 'ngày kết thúc (YYYY-MM-DD)', adults: 'số người lớn', totalBudget: 'ngân sách cả nhóm (VND)',
  transportation: 'phương tiện (car hoặc motorbike)', dailyBudgetPerPerson: 'ngân sách mỗi người/ngày (VND)',
} as const;
export type MissingField = keyof typeof FIELD_LABELS;
const planRequired: MissingField[] = ['departureCity', 'destinationCity', 'startDate', 'endDate', 'adults', 'totalBudget', 'transportation'];
const string = { type: 'string', minLength: 1, maxLength: 120 };
const preferences = { type: 'array', maxItems: 8, items: { type: 'string', enum: TRAVEL_PREFERENCE_IDS } };
export const AGENT_TOOLS = [
  { name: 'plan_trip', description: 'Read-only estimate using existing Planner. Never save or book.',
    parameters: { type: 'object', additionalProperties: false, required: planRequired, properties: {
      departureCity: string, destinationCity: string, startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' },
      adults: { type: 'integer', minimum: 1 }, children: { type: 'integer', minimum: 0 }, totalBudget: { type: 'number', exclusiveMinimum: 0 },
      transportation: { type: 'string', enum: ['car', 'motorbike'] }, pacing: { type: 'string', enum: ['balanced'] }, preferences,
      mandatoryPlaceIds: { type: 'array', maxItems: 10, items: { type: 'string', format: 'uuid' } },
    } } },
  { name: 'search_places', description: 'Search approved public catalog through existing recommendation engine.',
    parameters: { type: 'object', additionalProperties: false, required: ['destinationCity', 'dailyBudgetPerPerson'], properties: {
      destinationCity: string, dailyBudgetPerPerson: { type: 'number', minimum: 0 }, preferences,
      category: { type: 'string', enum: ['hotel', 'restaurant', 'attraction', 'tour'] },
    } } },
] as const;
export type ToolName = typeof AGENT_TOOLS[number]['name'];
export type ToolDecision = { kind: 'tool'; name: ToolName; arguments: Record<string, unknown> };
export type AgentDecision = ToolDecision | { kind: 'clarify'; fields: MissingField[] } | { kind: 'unsupported' };

export function parseDecision(raw: unknown): AgentDecision {
  const v = object(raw);
  if (v.kind === 'unsupported') { onlyKeys(v, ['kind']); return { kind: 'unsupported' }; }
  if (v.kind === 'clarify') {
    onlyKeys(v, ['kind', 'fields']);
    if (!Array.isArray(v.fields) || !v.fields.length || v.fields.length > 8 ||
      v.fields.some(f => typeof f !== 'string' || !Object.hasOwn(FIELD_LABELS, f))) throw new Error('Invalid clarification');
    return { kind: 'clarify', fields: [...new Set(v.fields)] as MissingField[] };
  }
  onlyKeys(v, ['kind', 'name', 'arguments']);
  if (v.kind !== 'tool' || !AGENT_TOOLS.some(t => t.name === v.name)) throw new Error('Tool is not allowed');
  return { kind: 'tool', name: v.name as ToolName, arguments: object(v.arguments) };
}

export function validateTool(decision: ToolDecision) {
  const args = decision.arguments;
  const spec = AGENT_TOOLS.find(tool => tool.name === decision.name);
  if (!spec) throw new HttpError(400, 'Công cụ không được hỗ trợ.', 'AGENT_INVALID_TOOL_INPUT');
  onlyKeys(args, Object.keys(spec.parameters.properties));
  const missing = spec.parameters.required.filter(key => args[key] === undefined) as MissingField[];
  if (missing.length) return { missing };
  if (decision.name === 'plan_trip') {
    // Reuse current modes, date limits, budget and preference semantics.
    const input = validatePlannerInput(args);
    const ids = input.mandatoryPlaceIds!;
    if (ids.length > 10 || ids.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) {
      throw new Error('Invalid mandatory IDs');
    }
    return { missing: [], input };
  }
  if (typeof args.destinationCity !== 'string' || !args.destinationCity.trim() || args.destinationCity.length > 120 ||
    typeof args.dailyBudgetPerPerson !== 'number' || !Number.isFinite(args.dailyBudgetPerPerson) || args.dailyBudgetPerPerson < 0 ||
    (args.category !== undefined && !['hotel', 'restaurant', 'attraction', 'tour'].includes(args.category as string))) {
    throw new Error('Invalid search input');
  }
  return { missing: [], input: { destinationCity: args.destinationCity.trim(), dailyBudgetPerPerson: args.dailyBudgetPerPerson,
    preferences: validateTravelPreferences(args.preferences), ...(args.category === undefined ? {} : { category: args.category as string }) } };
}

/** Deliberate public projection; do not expose moderation, member, contact or audit fields. */
function publicPlace(p: any) {
  if (!p || typeof p.id !== 'string' || typeof p.name !== 'string') throw new Error('Invalid catalog output');
  const priceAvailable = p.catalogPriceAvailable !== false && typeof p.priceFrom === 'number' && Number.isFinite(p.priceFrom) && p.priceFrom >= 0;
  return { id: p.id, name: p.name, category: p.category, city: p.city, province: p.province,
    priceFrom: priceAvailable ? p.priceFrom : null, catalogPriceAvailable: priceAvailable };
}

export interface AgentToolExecutor { execute(decision: ToolDecision): Promise<unknown> }
export const catalogPlannerTools: AgentToolExecutor = {
  async execute(decision) {
    const validated = validateTool(decision);
    if (validated.missing.length) throw new Error('Missing tool input');
    if (decision.name === 'search_places') {
      const result = await RecommendationService.recommendFromDatabase(validated.input as Parameters<typeof RecommendationService.recommendFromDatabase>[0]);
      return { type: 'places', source: 'RecommendationService', places: result.slice(0, 10).map(item => publicPlace(item.place)),
        warnings: ['Giá là dữ liệu catalog, không phải báo giá đặt dịch vụ.', ...(result.length ? [] : ['Không tìm thấy địa điểm phù hợp trong catalog.'])] };
    }
    const itinerary = await TourPlannerService.generatePersonalizedItinerary(validated.input as Parameters<typeof TourPlannerService.generatePersonalizedItinerary>[0]);
    if (!Array.isArray(itinerary.days) || !itinerary.days.length || !Number.isFinite(itinerary.totalEstimatedCostVND) ||
      itinerary.totalEstimatedCostVND < 0 || itinerary.costBasis !== 'GROUP_VND_V1') throw new Error('Invalid planner output');
    return { type: 'itinerary', source: 'TourPlannerService', itinerary: { ...itinerary,
      ...(itinerary.hotelSuggestion ? { hotelSuggestion: publicPlace(itinerary.hotelSuggestion) } : {}) },
      cost: { currency: 'VND', basis: itinerary.costBasis, estimated: itinerary.totalEstimatedCostVND,
        budget: itinerary.totalBudgetUserVND, budgetStatus: itinerary.budgetStatus, overBudget: itinerary.overBudgetVND },
      warnings: ['Đây là ước tính của Planner, chưa lưu Trip và chưa đặt dịch vụ.',
        ...itinerary.costAssumptions, ...itinerary.constraintViolations, itinerary.budgetAdvice].filter(Boolean) };
  },
};
