import { randomUUID } from 'node:crypto';
import { Op, Transaction, UniqueConstraintError } from 'sequelize';
import {
  BlogPost, Booking, Place, RecommendationRequest, RecommendationVisibleImpression,
  Review, TelemetryConsent, Ticket, Tour, TripSession, UserEvent,
} from '../models/index.js';
import { AiEventType, AiItemType } from '../models/UserEvent.js';
import { ENV } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export const TELEMETRY_CONTRACT_VERSION = '1.0' as const;
export const TELEMETRY_POLICY_VERSION = '1.0' as const;
export const TELEMETRY_RETENTION_DAYS = 90;

const CLIENT_EVENT_TYPES = new Set<AiEventType>([
  'VIEW', 'CLICK', 'ADD_TO_TRIP', 'REMOVE_FROM_TRIP', 'MAP_OPENED', 'ROUTE_VIEWED',
]);
const UI_SURFACES = new Set([
  'home_featured', 'explore_results', 'place_detail', 'tour_list', 'tour_detail', 'favorites',
  'booking_modal', 'tour_planner', 'trip_detail',
]);
const SESSION_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SENSITIVE_CLIENT_FIELDS = ['userId', 'role', 'roles', 'businessId', 'environment', 'source', 'origin', 'personalizationAllowed', 'expiresAt'];
const ALLOWED_CONTEXT_FIELDS = new Set(['position', 'dwellMs', 'deviceClass', 'locale']);

export interface ClientTelemetryInput {
  contractVersion: string;
  clientEventId: string;
  sessionId: string;
  requestId?: string;
  itemId: string;
  itemType: AiItemType;
  eventType: AiEventType;
  occurredAt: string;
  uiSurface: string;
  context?: Record<string, unknown>;
}

interface ValidatedClientTelemetry extends Omit<ClientTelemetryInput, 'contractVersion' | 'occurredAt' | 'context'> {
  contractVersion: typeof TELEMETRY_CONTRACT_VERSION;
  occurredAt: Date;
  context: Record<string, unknown>;
}

type RateBucket = { startedAt: number; count: number };
const rateBuckets = new Map<string, RateBucket>();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 120;

export function serverTelemetryEnvironment(): 'production' | 'development' | 'test' {
  if (ENV.NODE_ENV === 'production') return 'production';
  if (ENV.NODE_ENV === 'test') return 'test';
  return 'development';
}

function sanitizeContext(raw: unknown, eventType: AiEventType): Record<string, unknown> {
  if (raw === undefined) return {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpError(400, 'context phải là JSON object', 'INVALID_CONTEXT');
  }
  const source = raw as Record<string, unknown>;
  const unknown = Object.keys(source).filter((key) => !ALLOWED_CONTEXT_FIELDS.has(key));
  if (unknown.length) throw new HttpError(400, `context chứa trường không được phép: ${unknown.join(', ')}`, 'INVALID_CONTEXT');
  const result: Record<string, unknown> = {};
  if (source.position !== undefined) {
    if (!Number.isInteger(source.position) || Number(source.position) < 1 || Number(source.position) > 1000) {
      throw new HttpError(400, 'context.position không hợp lệ', 'INVALID_CONTEXT');
    }
    result.position = Number(source.position);
  }
  if (source.dwellMs !== undefined) {
    if (!Number.isInteger(source.dwellMs) || Number(source.dwellMs) < 0 || Number(source.dwellMs) > 3_600_000) {
      throw new HttpError(400, 'context.dwellMs không hợp lệ', 'INVALID_CONTEXT');
    }
    result.dwellMs = Number(source.dwellMs);
  }
  if (eventType === 'VIEW' && Number(result.dwellMs || 0) < 2_000) {
    throw new HttpError(400, 'VIEW chỉ được ghi sau tối thiểu 2 giây hiển thị', 'VIEW_DWELL_TOO_SHORT');
  }
  if (source.deviceClass !== undefined) {
    if (!['mobile', 'tablet', 'desktop'].includes(String(source.deviceClass))) throw new HttpError(400, 'deviceClass không hợp lệ', 'INVALID_CONTEXT');
    result.deviceClass = String(source.deviceClass);
  }
  if (source.locale !== undefined) {
    const locale = String(source.locale);
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z]{2,4})?$/.test(locale)) throw new HttpError(400, 'locale không hợp lệ', 'INVALID_CONTEXT');
    result.locale = locale;
  }
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 2_048) throw new HttpError(413, 'context vượt quá giới hạn 2 KB', 'CONTEXT_TOO_LARGE');
  return result;
}

export function validateClientTelemetry(raw: unknown): ValidatedClientTelemetry {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new HttpError(400, 'Payload không hợp lệ', 'INVALID_EVENT');
  const body = raw as Record<string, unknown>;
  const spoofed = SENSITIVE_CLIENT_FIELDS.find((field) => Object.prototype.hasOwnProperty.call(body, field));
  if (spoofed) throw new HttpError(400, `Client không được gửi trường ${spoofed}`, 'SPOOFED_SERVER_FIELD');
  if (body.contractVersion !== TELEMETRY_CONTRACT_VERSION) throw new HttpError(400, 'contractVersion không được hỗ trợ', 'INVALID_CONTRACT_VERSION');
  const clientEventId = String(body.clientEventId || '');
  if (!UUID_PATTERN.test(clientEventId)) throw new HttpError(400, 'clientEventId phải là UUID', 'INVALID_CLIENT_EVENT_ID');
  const sessionId = String(body.sessionId || '');
  if (!SESSION_PATTERN.test(sessionId)) throw new HttpError(400, 'sessionId không hợp lệ', 'INVALID_SESSION_ID');
  const itemId = String(body.itemId || '');
  if (!UUID_PATTERN.test(itemId)) throw new HttpError(400, 'itemId phải là UUID chuẩn của tài nguyên', 'INVALID_ITEM_ID');
  const itemType = String(body.itemType || '') as AiItemType;
  if (!['place', 'hotel', 'restaurant', 'tour', 'ticket', 'blog', 'trip'].includes(itemType)) {
    throw new HttpError(400, 'itemType không hỗ trợ cho client event', 'INVALID_ITEM_TYPE');
  }
  const eventType = String(body.eventType || '') as AiEventType;
  if (eventType === 'FAVORITE' || eventType === 'UNFAVORITE') {
    throw new HttpError(400, 'Favorite outcome chỉ được tạo bởi API /favorites sau khi trạng thái server thay đổi', 'USE_FAVORITES_API');
  }
  if (!CLIENT_EVENT_TYPES.has(eventType)) throw new HttpError(400, 'eventType không hỗ trợ cho client event', 'INVALID_EVENT_TYPE');
  const uiSurface = String(body.uiSurface || '');
  if (!UI_SURFACES.has(uiSurface)) throw new HttpError(400, 'uiSurface không hợp lệ', 'INVALID_UI_SURFACE');
  const requestId = body.requestId === undefined || body.requestId === null || body.requestId === '' ? undefined : String(body.requestId);
  if (requestId && !UUID_PATTERN.test(requestId)) throw new HttpError(400, 'requestId không hợp lệ', 'INVALID_REQUEST_ID');
  const occurredAt = new Date(String(body.occurredAt || ''));
  const now = Date.now();
  if (Number.isNaN(occurredAt.getTime()) || occurredAt.getTime() > now + 60_000 || occurredAt.getTime() < now - 15 * 60_000) {
    throw new HttpError(400, 'occurredAt nằm ngoài cửa sổ chống replay', 'INVALID_EVENT_TIME');
  }
  return {
    contractVersion: TELEMETRY_CONTRACT_VERSION, clientEventId, sessionId, requestId, itemId, itemType,
    eventType, occurredAt, uiSurface, context: sanitizeContext(body.context, eventType),
  };
}

async function assertVisibleItem(itemType: AiItemType, itemId: string, userId: string): Promise<void> {
  let exists = false;
  if (itemType === 'place') exists = !!await Place.findOne({ where: { id: itemId, status: 'APPROVED' }, attributes: ['id'] });
  if (itemType === 'hotel' || itemType === 'restaurant') {
    exists = !!await Place.findOne({ where: { id: itemId, category: itemType, status: 'APPROVED' }, attributes: ['id'] });
  }
  if (itemType === 'tour') exists = !!await Tour.findOne({ where: { id: itemId, status: 'APPROVED' }, attributes: ['id'] });
  if (itemType === 'ticket') exists = !!await Ticket.findOne({ where: { id: itemId, status: 'ACTIVE' }, attributes: ['id'] });
  if (itemType === 'blog') exists = !!await BlogPost.findOne({ where: { id: itemId, status: 'APPROVED' }, attributes: ['id'] });
  if (itemType === 'trip') exists = !!await TripSession.findOne({ where: { id: itemId, userId }, attributes: ['id'] });
  if (!exists) throw new HttpError(404, 'Tài nguyên không tồn tại hoặc không được phép hiển thị', 'EVENT_ITEM_NOT_VISIBLE');
}

async function assertRecommendationAttribution(input: ValidatedClientTelemetry, userId: string): Promise<void> {
  if (!input.requestId) return;
  const request = await RecommendationRequest.findByPk(input.requestId);
  const impression = await RecommendationVisibleImpression.findOne({
    where: { requestId: input.requestId, itemId: input.itemId, itemType: input.itemType, userId, sessionId: input.sessionId },
  });
  if (!request || request.userId !== userId || request.sessionId !== input.sessionId ||
      request.environment !== serverTelemetryEnvironment() || request.expiresAt <= new Date() || !impression) {
    throw new HttpError(400, 'requestId không khớp visible impression đã ghi nhận', 'INVALID_RECOMMENDATION_ATTRIBUTION');
  }
}

export function enforceTelemetryRateLimit(userId: string, now = Date.now()): void {
  const current = rateBuckets.get(userId);
  if (!current || now - current.startedAt >= RATE_WINDOW_MS) {
    rateBuckets.set(userId, { startedAt: now, count: 1 });
    return;
  }
  current.count += 1;
  if (current.count > RATE_LIMIT) throw new HttpError(429, 'Đã vượt giới hạn telemetry 120 event/phút', 'TELEMETRY_RATE_LIMIT');
}

export function resetTelemetryRateLimitState(): void { rateBuckets.clear(); }

export class TelemetryService {
  static async getConsent(userId: string) {
    const row = await TelemetryConsent.findByPk(userId);
    return {
      hasDecision: !!row,
      analyticsEnabled: row?.analyticsEnabled ?? false,
      personalizationEnabled: row?.personalizationEnabled ?? false,
      policyVersion: TELEMETRY_POLICY_VERSION,
      retentionDays: TELEMETRY_RETENTION_DAYS,
    };
  }

  static async updateConsent(userId: string, input: { analyticsEnabled: unknown; personalizationEnabled: unknown; deleteExistingEvents?: unknown }) {
    if (typeof input.analyticsEnabled !== 'boolean' || typeof input.personalizationEnabled !== 'boolean') {
      throw new HttpError(400, 'Consent phải là boolean', 'INVALID_CONSENT');
    }
    if (input.personalizationEnabled && !input.analyticsEnabled) {
      throw new HttpError(400, 'Cá nhân hóa yêu cầu analytics được bật', 'INVALID_CONSENT');
    }
    if (input.deleteExistingEvents !== undefined && typeof input.deleteExistingEvents !== 'boolean') {
      throw new HttpError(400, 'deleteExistingEvents phải là boolean', 'INVALID_CONSENT');
    }
    await UserEvent.sequelize!.transaction(async (transaction) => {
      await TelemetryConsent.upsert({
        userId,
        analyticsEnabled: input.analyticsEnabled as boolean,
        personalizationEnabled: input.personalizationEnabled as boolean,
        policyVersion: TELEMETRY_POLICY_VERSION,
        consentedAt: input.analyticsEnabled ? new Date() : undefined,
        updatedAt: new Date(),
      }, { transaction });
      if (!input.analyticsEnabled && input.deleteExistingEvents) {
        await UserEvent.destroy({ where: { userId }, transaction });
        await RecommendationRequest.destroy({ where: { userId }, transaction });
        await Review.update({ aiUsageAllowed: false, consentPolicyVersion: null } as any, { where: { userId }, transaction });
      }
    });
    return this.getConsent(userId);
  }

  static async collectClientEvent(userId: string, raw: unknown) {
    enforceTelemetryRateLimit(userId);
    const input = validateClientTelemetry(raw);
    const existing = await UserEvent.findOne({ where: { clientEventId: input.clientEventId } });
    if (existing) {
      const sameEvent = existing.userId === userId && existing.sessionId === input.sessionId &&
        existing.itemId === input.itemId && existing.itemType === input.itemType &&
        existing.eventType === input.eventType && existing.uiSurface === input.uiSurface &&
        (existing.requestId || undefined) === input.requestId && existing.occurredAt.getTime() === input.occurredAt.getTime() &&
        JSON.stringify(existing.context) === JSON.stringify(input.context);
      if (!sameEvent) throw new HttpError(409, 'clientEventId đã được dùng cho event khác', 'CLIENT_EVENT_ID_CONFLICT');
      return { event: existing, recorded: false, duplicate: true };
    }
    const consent = await TelemetryConsent.findByPk(userId);
    if (!consent?.analyticsEnabled) return { recorded: false, duplicate: false, reason: 'ANALYTICS_OPT_OUT' as const };
    await assertVisibleItem(input.itemType, input.itemId, userId);
    await assertRecommendationAttribution(input, userId);
    const expiresAt = new Date(Date.now() + TELEMETRY_RETENTION_DAYS * 86_400_000);
    try {
      const event = await UserEvent.create({
        ...input,
        userId,
        source: 'web',
        environment: serverTelemetryEnvironment(),
        origin: 'CLIENT',
        personalizationAllowed: consent.personalizationEnabled,
        expiresAt,
      });
      return { event, recorded: true, duplicate: false };
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        const duplicate = await UserEvent.findOne({ where: { clientEventId: input.clientEventId } });
        if (duplicate) return { event: duplicate, recorded: false, duplicate: true };
      }
      throw error;
    }
  }

  static async recordBookingEvent(input: {
    userId?: string; bookingId: string; eventType: 'BOOKING_CREATED' | 'BOOKING_CONFIRMED' | 'BOOKING_COMPLETED' | 'BOOKING_CANCELLED'; transaction: Transaction;
  }): Promise<void> {
    if (!input.userId) return;
    const consent = await TelemetryConsent.findByPk(input.userId, { transaction: input.transaction });
    if (!consent?.analyticsEnabled) return;
    const booking = await Booking.findByPk(input.bookingId, {
      transaction: input.transaction,
      attributes: ['id', 'userId', 'recommendationRequestId', 'recommendationItemId', 'recommendationItemType'],
    });
    if (!booking || booking.userId !== input.userId) throw new Error('Verified booking telemetry requires matching booking ownership');
    const recommendationRequest = booking.recommendationRequestId
      ? await RecommendationRequest.findByPk(booking.recommendationRequestId, { transaction: input.transaction })
      : null;
    await UserEvent.create({
      userId: input.userId,
      contractVersion: TELEMETRY_CONTRACT_VERSION,
      clientEventId: randomUUID(),
      sessionId: recommendationRequest?.sessionId || `server-booking-${input.bookingId}`,
      requestId: booking.recommendationRequestId,
      itemId: input.bookingId,
      itemType: 'booking',
      eventType: input.eventType,
      source: 'booking_transaction',
      environment: serverTelemetryEnvironment(),
      uiSurface: 'booking_transaction',
      origin: 'SERVER',
      personalizationAllowed: consent.personalizationEnabled,
      context: booking.recommendationRequestId ? {
        attributedItemId: booking.recommendationItemId,
        attributedItemType: booking.recommendationItemType,
      } : {},
      occurredAt: new Date(),
      expiresAt: new Date(Date.now() + TELEMETRY_RETENTION_DAYS * 86_400_000),
    }, { transaction: input.transaction });
  }

  static async purgeExpired(now = new Date()): Promise<number> {
    const events = await UserEvent.destroy({ where: { expiresAt: { [Op.lte]: now } } });
    const requests = await RecommendationRequest.destroy({ where: { expiresAt: { [Op.lte]: now } } });
    return events + requests;
  }
}
