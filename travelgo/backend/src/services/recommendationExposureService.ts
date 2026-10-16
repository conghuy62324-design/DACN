import { randomUUID } from 'node:crypto';
import { Transaction, UniqueConstraintError } from 'sequelize';
import {
  Business, Place, RecommendationCandidate, RecommendationRequest, RecommendationVisibleImpression,
  TelemetryConsent,
} from '../models/index.js';
import { RecommendedPlaceResult, RecommendationService } from './recommendationService.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { serverTelemetryEnvironment, TELEMETRY_RETENTION_DAYS } from './telemetryService.js';
import { validateTravelPreferences } from '../utils/travelPreferences.js';
import { HttpError } from '../utils/httpError.js';

export const RECOMMENDATION_CONTRACT_VERSION = '1.0' as const;
export const RECOMMENDATION_ALGORITHM_VERSION = 'weighted-hybrid-v2' as const;
export const RECOMMENDATION_POLICY_VERSION = 'approved-active-business-eligibility-v2' as const;
export const RECOMMENDATION_MODEL_VERSION = 'heuristic-content-bayesian-v1' as const;
export const RECOMMENDATION_CONFIG_VERSION = 'weights-q35-p25-b25-d15-precision6-v2' as const;
export const VISIBILITY_RULE_VERSION = 'viewport-50pct-2000ms-v1' as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const RECOMMENDATION_SURFACES = new Set(['home_featured', 'explore_results', 'tour_planner']);
const PLACE_ITEM_TYPES = new Set(['place', 'hotel', 'restaurant']);
const SENSITIVE_FIELDS = new Set([
  'userId', 'role', 'roles', 'businessId', 'environment', 'algorithmVersion', 'policyVersion',
  'modelVersion', 'configVersion', 'score', 'rank', 'rankPosition', 'eligibility', 'experimentVariant',
]);
const REQUEST_KEYS = new Set(['contractVersion', 'sessionId', 'uiSurface', 'filters', 'explicitPreferences', 'dailyBudgetPerPerson', 'limit']);
const ACK_KEYS = new Set([
  'contractVersion', 'clientAckId', 'requestId', 'sessionId', 'itemId', 'itemType', 'uiSurface',
  'visibilityRuleVersion', 'visibleRatio', 'dwellMs', 'visibleAt',
]);
const FILTER_KEYS = new Set(['destinationCity', 'category', 'search', 'minRating']);

type PlaceItemType = 'place' | 'hotel' | 'restaurant';

export interface RecommendationInput {
  sessionId: string;
  uiSurface: string;
  filters: { destinationCity?: string; category?: string; search?: string; minRating?: number };
  explicitPreferences: string[];
  dailyBudgetPerPerson: number;
  limit: number;
}

interface VisibilityInput {
  clientAckId: string;
  requestId: string;
  sessionId: string;
  itemId: string;
  itemType: PlaceItemType;
  uiSurface: string;
  visibilityRuleVersion: typeof VISIBILITY_RULE_VERSION;
  visibleRatio: number;
  dwellMs: number;
  visibleAt: Date;
}

function assertPlainObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, `${label} phải là JSON object`, 'INVALID_RECOMMENDATION_REQUEST');
  }
  return value as Record<string, unknown>;
}

function assertAllowedKeys(body: Record<string, unknown>, allowed: Set<string>): void {
  const spoofed = Object.keys(body).find((key) => SENSITIVE_FIELDS.has(key));
  if (spoofed) throw new HttpError(400, `Client không được gửi trường ${spoofed}`, 'SPOOFED_SERVER_FIELD');
  const unknown = Object.keys(body).filter((key) => !allowed.has(key));
  if (unknown.length) throw new HttpError(400, `Payload chứa trường không được phép: ${unknown.join(', ')}`, 'INVALID_RECOMMENDATION_REQUEST');
}

function boundedText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new HttpError(400, `${field} không hợp lệ`, 'INVALID_RECOMMENDATION_REQUEST');
  const text = value.trim();
  if (!text || text.length > maxLength) throw new HttpError(400, `${field} không hợp lệ`, 'INVALID_RECOMMENDATION_REQUEST');
  return text;
}

export function validateRecommendationRequest(raw: unknown): RecommendationInput {
  const body = assertPlainObject(raw, 'Payload');
  assertAllowedKeys(body, REQUEST_KEYS);
  if (body.contractVersion !== RECOMMENDATION_CONTRACT_VERSION) {
    throw new HttpError(400, 'contractVersion không được hỗ trợ', 'INVALID_CONTRACT_VERSION');
  }
  const sessionId = String(body.sessionId || '');
  if (!SESSION_PATTERN.test(sessionId)) throw new HttpError(400, 'sessionId không hợp lệ', 'INVALID_SESSION_ID');
  const uiSurface = String(body.uiSurface || '');
  if (!RECOMMENDATION_SURFACES.has(uiSurface)) throw new HttpError(400, 'uiSurface không hợp lệ', 'INVALID_UI_SURFACE');
  const filtersBody = body.filters === undefined ? {} : assertPlainObject(body.filters, 'filters');
  const unknownFilters = Object.keys(filtersBody).filter((key) => !FILTER_KEYS.has(key));
  if (unknownFilters.length) throw new HttpError(400, `Filter không được hỗ trợ: ${unknownFilters.join(', ')}`, 'INVALID_RECOMMENDATION_FILTER');
  const category = boundedText(filtersBody.category, 'category', 30);
  if (category && !['all', 'attraction', 'hotel', 'restaurant', 'tour'].includes(category)) {
    throw new HttpError(400, 'category không hợp lệ', 'INVALID_RECOMMENDATION_FILTER');
  }
  const minRating = filtersBody.minRating === undefined ? undefined : Number(filtersBody.minRating);
  if (minRating !== undefined && (!Number.isFinite(minRating) || minRating < 0 || minRating > 5)) {
    throw new HttpError(400, 'minRating không hợp lệ', 'INVALID_RECOMMENDATION_FILTER');
  }
  const dailyBudgetPerPerson = body.dailyBudgetPerPerson === undefined ? 0 : Number(body.dailyBudgetPerPerson);
  if (!Number.isFinite(dailyBudgetPerPerson) || dailyBudgetPerPerson < 0 || dailyBudgetPerPerson > 1_000_000_000) {
    throw new HttpError(400, 'dailyBudgetPerPerson không hợp lệ', 'INVALID_RECOMMENDATION_BUDGET');
  }
  const limit = body.limit === undefined ? 20 : Number(body.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new HttpError(400, 'limit phải từ 1 đến 20', 'INVALID_RECOMMENDATION_LIMIT');
  }
  const filters = {
    destinationCity: boundedText(filtersBody.destinationCity, 'destinationCity', 100),
    category,
    search: boundedText(filtersBody.search, 'search', 120),
    minRating,
  };
  return {
    sessionId, uiSurface, filters: Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined)),
    explicitPreferences: validateTravelPreferences(body.explicitPreferences), dailyBudgetPerPerson, limit,
  };
}

export function validateVisibilityAcknowledgement(raw: unknown): VisibilityInput {
  const body = assertPlainObject(raw, 'Payload');
  assertAllowedKeys(body, ACK_KEYS);
  if (body.contractVersion !== RECOMMENDATION_CONTRACT_VERSION) throw new HttpError(400, 'contractVersion không được hỗ trợ', 'INVALID_CONTRACT_VERSION');
  const clientAckId = String(body.clientAckId || '');
  const requestId = String(body.requestId || '');
  if (!UUID_PATTERN.test(clientAckId)) throw new HttpError(400, 'clientAckId phải là UUID', 'INVALID_ACK_ID');
  if (!UUID_PATTERN.test(requestId)) throw new HttpError(400, 'requestId không hợp lệ', 'INVALID_REQUEST_ID');
  const sessionId = String(body.sessionId || '');
  if (!SESSION_PATTERN.test(sessionId)) throw new HttpError(400, 'sessionId không hợp lệ', 'INVALID_SESSION_ID');
  const itemId = String(body.itemId || '');
  if (!UUID_PATTERN.test(itemId)) throw new HttpError(400, 'itemId không hợp lệ', 'INVALID_ITEM_ID');
  const itemType = String(body.itemType || '') as PlaceItemType;
  if (!PLACE_ITEM_TYPES.has(itemType)) throw new HttpError(400, 'itemType không hợp lệ', 'INVALID_ITEM_TYPE');
  const uiSurface = String(body.uiSurface || '');
  if (!RECOMMENDATION_SURFACES.has(uiSurface)) throw new HttpError(400, 'uiSurface không hợp lệ', 'INVALID_UI_SURFACE');
  if (body.visibilityRuleVersion !== VISIBILITY_RULE_VERSION) {
    throw new HttpError(400, 'visibilityRuleVersion không được hỗ trợ', 'INVALID_VISIBILITY_RULE');
  }
  const visibleRatio = Number(body.visibleRatio);
  const dwellMs = Number(body.dwellMs);
  if (!Number.isFinite(visibleRatio) || visibleRatio < 0.5 || visibleRatio > 1) throw new HttpError(400, 'visibleRatio phải từ 0.5 đến 1', 'INVALID_VISIBILITY');
  if (!Number.isInteger(dwellMs) || dwellMs < 2_000 || dwellMs > 3_600_000) throw new HttpError(400, 'dwellMs không hợp lệ', 'INVALID_VISIBILITY');
  const visibleAt = new Date(String(body.visibleAt || ''));
  const now = Date.now();
  if (Number.isNaN(visibleAt.getTime()) || visibleAt.getTime() < now - 15 * 60_000 || visibleAt.getTime() > now + 60_000) {
    throw new HttpError(400, 'visibleAt nằm ngoài cửa sổ cho phép', 'VISIBILITY_REPLAY_REJECTED');
  }
  return { clientAckId, requestId, sessionId, itemId, itemType, uiSurface, visibilityRuleVersion: VISIBILITY_RULE_VERSION, visibleRatio, dwellMs, visibleAt };
}

function itemTypeFor(result: RecommendedPlaceResult): PlaceItemType {
  if (result.place.category === 'hotel' || result.place.category === 'restaurant') return result.place.category;
  return 'place';
}

function reasonCodes(
  result: RecommendedPlaceResult,
  distanceBasis: 'PROVIDED_CENTER_AERIAL' | 'FILTERED_CANDIDATE_CENTROID_AERIAL' | 'DISABLED',
  hasBudgetInput: boolean,
): string[] {
  const codes: string[] = [];
  if (result.matchedPreferences.length) codes.push('PREFERENCE_MATCH');
  if (result.place.reviewCount > 0 && result.breakdown.qualityScore >= 0.88) codes.push('HIGH_BAYESIAN_QUALITY');
  if (hasBudgetInput && result.breakdown.budgetScore >= 0.85) codes.push('ESTIMATED_PRICE_FROM_BUDGET_FIT');
  if (distanceBasis === 'PROVIDED_CENTER_AERIAL' && result.breakdown.distanceScore >= 0.8) codes.push('NEAR_PROVIDED_CENTER_AERIAL');
  if (distanceBasis === 'FILTERED_CANDIDATE_CENTROID_AERIAL' && result.breakdown.distanceScore >= 0.8) codes.push('NEAR_FILTERED_CANDIDATE_CENTROID_AERIAL');
  return codes.length ? codes : ['BALANCED_BASELINE'];
}

async function assertPublicCandidate(itemId: string, itemType: string, transaction?: Transaction): Promise<void> {
  const place = await Place.findByPk(itemId, {
    transaction,
    attributes: ['id', 'businessId', 'category', 'status'],
    include: [{ model: Business, as: 'business', attributes: ['id', 'status'], required: false }],
  });
  const business = (place as Place & { business?: Business } | null)?.business;
  const categoryMatches = itemType === 'place'
    ? !!place && !['hotel', 'restaurant'].includes(place.category)
    : place?.category === itemType;
  const businessEligible = !place?.businessId || business?.status === 'ACTIVE';
  if (!place || place.status !== 'APPROVED' || !categoryMatches || !businessEligible) {
    throw new HttpError(400, 'Item không còn đủ điều kiện hiển thị công khai', 'RECOMMENDATION_ITEM_NOT_ELIGIBLE');
  }
}

export class RecommendationExposureService {
  static resolveConsentAwareInputs(
    input: Pick<RecommendationInput, 'filters' | 'explicitPreferences' | 'dailyBudgetPerPerson'>,
    personalizationEnabled: boolean,
  ) {
    return {
      scoringPreferences: input.explicitPreferences,
      scoringDailyBudgetPerPerson: input.dailyBudgetPerPerson,
      persistedPreferences: personalizationEnabled ? input.explicitPreferences : [],
      persistedFilters: personalizationEnabled && input.dailyBudgetPerPerson > 0
        ? { ...input.filters, dailyBudgetPerPerson: input.dailyBudgetPerPerson }
        : { ...input.filters },
    };
  }

  static async createRequest(userId: string, raw: unknown) {
    const input = validateRecommendationRequest(raw);
    const consent = await TelemetryConsent.findByPk(userId);
    const environment = serverTelemetryEnvironment();
    const consentAware = this.resolveConsentAwareInputs(input, consent?.personalizationEnabled ?? false);
    const catalog = await RecommendationRepository.getApprovedPlaces();
    const batch = RecommendationService.recommendForRequest(catalog, {
      filters: input.filters,
      preferences: consentAware.scoringPreferences,
      dailyBudgetPerPerson: consentAware.scoringDailyBudgetPerPerson,
      limit: input.limit,
    });
    const filtered = batch.items;
    const requestId = randomUUID();
    const expiresAt = new Date(Date.now() + TELEMETRY_RETENTION_DAYS * 86_400_000);
    await RecommendationRequest.sequelize!.transaction(async (transaction) => {
      await RecommendationRequest.create({
        requestId, userId, sessionId: input.sessionId, uiSurface: input.uiSurface,
        filters: consentAware.persistedFilters, explicitPreferences: consentAware.persistedPreferences,
        algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION, policyVersion: RECOMMENDATION_POLICY_VERSION,
        modelVersion: RECOMMENDATION_MODEL_VERSION, configVersion: RECOMMENDATION_CONFIG_VERSION,
        environment, analyticsConsent: consent?.analyticsEnabled ?? false,
        personalizationConsent: consent?.personalizationEnabled ?? false,
        experimentVariant: 'CONTROL', expiresAt,
      }, { transaction });
      if (filtered.length) await RecommendationCandidate.bulkCreate(filtered.map((result, index) => ({
        requestId, itemId: result.place.id, itemType: itemTypeFor(result), eligible: true,
        eligibilityCode: 'APPROVED_PUBLIC', returned: true, rankPosition: index + 1, score: result.score,
        scoreBreakdown: result.breakdown,
        reasonCodes: reasonCodes(result, batch.rankingContext.distanceBasis, input.dailyBudgetPerPerson > 0),
        policyVersion: RECOMMENDATION_POLICY_VERSION, modelVersion: RECOMMENDATION_MODEL_VERSION,
      })), { transaction });
    });
    const dataUpdatedAt = filtered.reduce<Date | undefined>((latest, result) => {
      const value = result.place.updatedAt ? new Date(result.place.updatedAt) : undefined;
      return value && (!latest || value > latest) ? value : latest;
    }, undefined);
    return {
      requestId, contractVersion: RECOMMENDATION_CONTRACT_VERSION,
      algorithmVersion: RECOMMENDATION_ALGORITHM_VERSION, policyVersion: RECOMMENDATION_POLICY_VERSION,
      modelVersion: RECOMMENDATION_MODEL_VERSION, configVersion: RECOMMENDATION_CONFIG_VERSION,
      experiment: { key: null, variant: 'CONTROL' }, dataUpdatedAt: dataUpdatedAt?.toISOString(),
      consent: { analytics: consent?.analyticsEnabled ?? false, personalization: consent?.personalizationEnabled ?? false },
      items: filtered.map((result, index) => ({
        ...result.place, rank: index + 1, score: result.score, scoreBreakdown: result.breakdown,
        reasonCodes: reasonCodes(result, batch.rankingContext.distanceBasis, input.dailyBudgetPerPerson > 0), why: result.explanation,
      })),
      fallback: batch.fallback,
      rankingContext: batch.rankingContext,
      limitations: [
        'Baseline heuristic; chưa phải Learning-to-Rank.',
        'Candidate trả về chưa được tính là visible impression.',
        'Khoảng cách là Haversine theo đường chim bay tới tâm tập candidate đã lọc; không phải quãng đường hoặc thời gian di chuyển thực.',
        ...(batch.fallback.applied ? ['Không có kết quả khớp thành phố; items là fallback ngoài thành phố và được gắn nhãn rõ ràng.'] : []),
        ...(!(consent?.personalizationEnabled ?? false) && (input.explicitPreferences.length > 0 || input.dailyBudgetPerPerson > 0)
          ? ['Sở thích/ngân sách chỉ dùng cho request hiện tại và không được lưu chi tiết do personalization opt-out.']
          : []),
      ],
    };
  }

  static async assertVisibleAttribution(input: {
    userId: string; requestId: string; sessionId: string; itemId: string; itemType: string; transaction?: Transaction;
  }) {
    const environment = serverTelemetryEnvironment();
    const request = await RecommendationRequest.findByPk(input.requestId, { transaction: input.transaction });
    if (!request || request.userId !== input.userId || request.sessionId !== input.sessionId ||
        request.environment !== environment || request.expiresAt <= new Date()) {
      throw new HttpError(400, 'requestId không thuộc user/session/môi trường hiện tại', 'INVALID_RECOMMENDATION_ATTRIBUTION');
    }
    const candidate = await RecommendationCandidate.findOne({
      where: { requestId: input.requestId, itemId: input.itemId, itemType: input.itemType, eligible: true, returned: true },
      transaction: input.transaction,
    });
    if (!candidate) throw new HttpError(400, 'Item không thuộc candidate set của request', 'INVALID_RECOMMENDATION_CANDIDATE');
    await assertPublicCandidate(input.itemId, input.itemType, input.transaction);
    const impression = await RecommendationVisibleImpression.findOne({
      where: { requestId: input.requestId, itemId: input.itemId, itemType: input.itemType, userId: input.userId, sessionId: input.sessionId },
      transaction: input.transaction,
    });
    if (!impression) throw new HttpError(400, 'Item chưa có visible impression hợp lệ', 'MISSING_VISIBLE_IMPRESSION');
    return { request, candidate, impression };
  }

  static async acknowledgeVisible(userId: string, raw: unknown) {
    const input = validateVisibilityAcknowledgement(raw);
    const existingAck = await RecommendationVisibleImpression.findOne({ where: { clientAckId: input.clientAckId } });
    if (existingAck) {
      const same = existingAck.userId === userId && existingAck.requestId === input.requestId &&
        existingAck.itemId === input.itemId && existingAck.itemType === input.itemType &&
        existingAck.sessionId === input.sessionId && existingAck.uiSurface === input.uiSurface &&
        existingAck.visibilityRuleVersion === input.visibilityRuleVersion &&
        Number(existingAck.visibleRatio) === input.visibleRatio && existingAck.dwellMs === input.dwellMs &&
        existingAck.visibleAt.getTime() === input.visibleAt.getTime();
      if (!same) throw new HttpError(409, 'clientAckId đã được dùng cho acknowledgement khác', 'CLIENT_ACK_ID_CONFLICT');
      return { impression: existingAck, recorded: false, duplicate: true };
    }
    const environment = serverTelemetryEnvironment();
    const request = await RecommendationRequest.findByPk(input.requestId);
    if (!request || request.userId !== userId || request.sessionId !== input.sessionId ||
        request.uiSurface !== input.uiSurface || request.environment !== environment || request.expiresAt <= new Date()) {
      throw new HttpError(400, 'requestId không thuộc user/session/surface/môi trường hiện tại', 'INVALID_RECOMMENDATION_ATTRIBUTION');
    }
    const candidate = await RecommendationCandidate.findOne({
      where: { requestId: input.requestId, itemId: input.itemId, itemType: input.itemType, eligible: true, returned: true },
    });
    if (!candidate) throw new HttpError(400, 'Item không thuộc candidate set của request', 'INVALID_RECOMMENDATION_CANDIDATE');
    await assertPublicCandidate(input.itemId, input.itemType);
    const consent = await TelemetryConsent.findByPk(userId);
    if (!consent?.analyticsEnabled) return { recorded: false, duplicate: false, reason: 'ANALYTICS_OPT_OUT' as const };
    try {
      const impression = await RecommendationVisibleImpression.create({
        ...input, candidateId: candidate.id, userId, environment,
        personalizationAllowed: consent.personalizationEnabled,
        expiresAt: new Date(Date.now() + TELEMETRY_RETENTION_DAYS * 86_400_000),
      });
      return { impression, recorded: true, duplicate: false };
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const duplicate = await RecommendationVisibleImpression.findOne({
          where: { requestId: input.requestId, itemId: input.itemId, itemType: input.itemType, visibilityRuleVersion: input.visibilityRuleVersion },
        });
        if (duplicate && duplicate.userId === userId) return { impression: duplicate, recorded: false, duplicate: true };
      }
      throw error;
    }
  }
}
