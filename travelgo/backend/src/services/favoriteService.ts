import { randomUUID } from 'node:crypto';
import { Op, QueryTypes, Transaction } from 'sequelize';
import {
  Favorite, Place, RecommendationRequest, RecommendationVisibleImpression,
  TelemetryConsent, UserEvent, sequelize,
} from '../models/index.js';
import { serverTelemetryEnvironment, TELEMETRY_CONTRACT_VERSION, TELEMETRY_RETENTION_DAYS } from './telemetryService.js';
import { HttpError } from '../utils/httpError.js';
import { serializePlace } from './placeService.js';

export const FAVORITE_CONTRACT_VERSION = '1.0' as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SESSION_PATTERN = /^[A-Za-z0-9:_-]{8,120}$/;
const FAVORITE_SURFACES = new Set([
  'home_featured', 'explore_results', 'place_detail', 'favorites', 'hotel_list', 'restaurant_list',
]);
const MUTATION_KEYS = new Set(['contractVersion', 'sessionId', 'requestId', 'uiSurface']);

export interface FavoriteMutationInput {
  contractVersion: typeof FAVORITE_CONTRACT_VERSION;
  sessionId: string;
  requestId?: string;
  uiSurface: string;
}

function validateMutation(raw: unknown): FavoriteMutationInput {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new HttpError(400, 'Payload Favorite không hợp lệ', 'INVALID_FAVORITE_REQUEST');
  }
  const body = raw as Record<string, unknown>;
  const unknown = Object.keys(body).filter((key) => !MUTATION_KEYS.has(key));
  if (unknown.length) {
    throw new HttpError(400, `Client không được gửi trường Favorite: ${unknown.join(', ')}`, 'SPOOFED_FAVORITE_FIELD');
  }
  if (body.contractVersion !== FAVORITE_CONTRACT_VERSION) {
    throw new HttpError(400, 'contractVersion Favorite không được hỗ trợ', 'INVALID_CONTRACT_VERSION');
  }
  const sessionId = String(body.sessionId || '');
  if (!SESSION_PATTERN.test(sessionId)) throw new HttpError(400, 'sessionId không hợp lệ', 'INVALID_SESSION_ID');
  const uiSurface = String(body.uiSurface || '');
  if (!FAVORITE_SURFACES.has(uiSurface)) throw new HttpError(400, 'uiSurface không hợp lệ', 'INVALID_UI_SURFACE');
  const requestId = body.requestId === undefined || body.requestId === null || body.requestId === ''
    ? undefined
    : String(body.requestId);
  if (requestId && !UUID_PATTERN.test(requestId)) throw new HttpError(400, 'requestId không hợp lệ', 'INVALID_REQUEST_ID');
  return { contractVersion: FAVORITE_CONTRACT_VERSION, sessionId, requestId, uiSurface };
}

function favoriteItemType(place: Place): 'place' | 'hotel' | 'restaurant' {
  if (place.category === 'hotel' || place.category === 'restaurant') return place.category;
  return 'place';
}

async function verifyAttribution(
  userId: string,
  place: Place,
  input: FavoriteMutationInput,
  transaction: Transaction,
): Promise<string | undefined> {
  if (!input.requestId) return undefined;
  const environment = serverTelemetryEnvironment();
  const request = await RecommendationRequest.findOne({
    where: {
      requestId: input.requestId,
      userId,
      sessionId: input.sessionId,
      environment,
      expiresAt: { [Op.gt]: new Date() },
    },
    transaction,
  });
  const visible = request && await RecommendationVisibleImpression.findOne({
    where: {
      requestId: input.requestId,
      userId,
      sessionId: input.sessionId,
      itemId: place.id,
      itemType: favoriteItemType(place),
      environment,
      expiresAt: { [Op.gt]: new Date() },
    },
    transaction,
  });
  if (!request || !visible) {
    throw new HttpError(400, 'requestId không khớp visible impression đã được server xác minh', 'INVALID_RECOMMENDATION_ATTRIBUTION');
  }
  return request.requestId;
}

async function recordOutcome(
  userId: string,
  place: Place,
  input: FavoriteMutationInput,
  eventType: 'FAVORITE' | 'UNFAVORITE',
  requestId: string | undefined,
  transaction: Transaction,
) {
  const consent = await TelemetryConsent.findByPk(userId, { transaction });
  if (!consent?.analyticsEnabled) return { recorded: false, reason: 'ANALYTICS_OPT_OUT' as const };
  const event = await UserEvent.create({
    userId,
    contractVersion: TELEMETRY_CONTRACT_VERSION,
    clientEventId: randomUUID(),
    sessionId: input.sessionId,
    requestId,
    itemId: place.id,
    itemType: favoriteItemType(place),
    eventType,
    source: 'favorite_state',
    environment: serverTelemetryEnvironment(),
    uiSurface: input.uiSurface,
    origin: 'SERVER',
    personalizationAllowed: consent.personalizationEnabled,
    context: { stateChanged: true },
    occurredAt: new Date(),
    expiresAt: new Date(Date.now() + TELEMETRY_RETENTION_DAYS * 86_400_000),
  }, { transaction });
  return { recorded: true, eventId: event.id };
}

const favoriteInclude = [{ model: Place, as: 'place', required: true }];

export class FavoriteService {
  static async list(userId: string) {
    const rows = await Favorite.findAll({
      where: { userId },
      include: favoriteInclude,
      order: [['createdAt', 'DESC']],
    });
    return rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      place: serializePlace(row.place),
    }));
  }

  static async add(userId: string, placeId: string, raw: unknown) {
    if (!UUID_PATTERN.test(placeId)) throw new HttpError(400, 'placeId không hợp lệ', 'INVALID_PLACE_ID');
    const input = validateMutation(raw);
    return sequelize.transaction(async (transaction) => {
      const place = await Place.findOne({ where: { id: placeId, status: 'APPROVED' }, transaction });
      if (!place) throw new HttpError(404, 'Địa điểm không tồn tại hoặc không được công khai', 'PLACE_NOT_VISIBLE');
      const requestId = await verifyAttribution(userId, place, input, transaction);
      const inserted = await sequelize.query<{ id: string }>(`
        INSERT INTO user_favorites (id, user_id, place_id, created_at, updated_at)
        VALUES (gen_random_uuid(), :userId, :placeId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, place_id) DO NOTHING
        RETURNING id
      `, { replacements: { userId, placeId }, type: QueryTypes.SELECT, transaction });
      const changed = inserted.length === 1;
      const favorite = await Favorite.findOne({ where: { userId, placeId }, include: favoriteInclude, transaction });
      if (!favorite) throw new Error('Favorite insert did not produce a readable row');
      const telemetry = changed
        ? await recordOutcome(userId, place, input, 'FAVORITE', requestId, transaction)
        : { recorded: false, reason: 'ALREADY_FAVORITE' as const };
      return { favorite, changed, telemetry };
    });
  }

  static async remove(userId: string, placeId: string, raw: unknown) {
    if (!UUID_PATTERN.test(placeId)) throw new HttpError(400, 'placeId không hợp lệ', 'INVALID_PLACE_ID');
    const input = validateMutation(raw);
    return sequelize.transaction(async (transaction) => {
      const place = await Place.findByPk(placeId, { transaction });
      const existing = await Favorite.findOne({ where: { userId, placeId }, transaction, lock: transaction.LOCK.UPDATE });
      if (!existing) return { changed: false, favorite: null, telemetry: { recorded: false, reason: 'NOT_FAVORITE' as const } };
      if (!place) throw new Error('Favorite references a missing place despite its foreign key');
      const requestId = await verifyAttribution(userId, place, input, transaction);
      await existing.destroy({ transaction });
      const telemetry = await recordOutcome(userId, place, input, 'UNFAVORITE', requestId, transaction);
      return { changed: true, favorite: null, telemetry };
    });
  }
}
