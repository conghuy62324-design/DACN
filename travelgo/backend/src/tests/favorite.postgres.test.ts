import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import {
  Favorite, Place, RecommendationVisibleImpression, User, UserEvent,
} from '../models/index.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from '../utils/testDatabaseGuard.js';

async function main(): Promise<void> {
  assertTestDatabaseWriteOptIn('Server-side Favorite PostgreSQL integration test');
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'Server-side Favorite PostgreSQL integration test');
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to determine test server port');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const api = async (method: string, route: string, body?: object, token?: string) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };

  try {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const register = async (label: string) => {
      const response = await api('POST', '/api/auth/register', {
        email: `favorite.${label}.${suffix}@example.test`, fullName: `Favorite ${label}`,
        password: 'Favorite2026!', phone: '0901234567',
      });
      assert.equal(response.status, 201, JSON.stringify(response.body));
      return response.body.data as { token: string; user: { id: string } };
    };
    const owner = await register('owner');
    const other = await register('other');
    const optOut = await register('optout');
    const places = await Place.findAll({ where: { status: 'APPROVED' }, order: [['createdAt', 'ASC']] });
    const hotel = places.find((place) => place.category === 'hotel');
    const attraction = places.find((place) => place.category === 'attraction');
    assert.ok(hotel && attraction, 'Seed must include approved hotel and attraction places');

    const sessionId = `favorite-${suffix}`;
    const mutation = (overrides: Record<string, unknown> = {}) => ({
      contractVersion: '1.0', sessionId, uiSurface: 'place_detail', ...overrides,
    });

    const unauthorized = await api('GET', '/api/favorites');
    assert.equal(unauthorized.status, 401);
    const spoofed = await api('POST', `/api/favorites/${hotel.id}`, mutation({
      userId: other.user.id, businessId: randomUUID(), environment: 'production', itemType: 'hotel',
    }), owner.token);
    assert.equal(spoofed.status, 400, JSON.stringify(spoofed.body));
    assert.equal(spoofed.body.code, 'SPOOFED_FAVORITE_FIELD');
    assert.equal(await Favorite.count({ where: { userId: owner.user.id } }), 0);

    const optOutAdd = await api('POST', `/api/favorites/${hotel.id}`, mutation(), optOut.token);
    assert.equal(optOutAdd.status, 201, JSON.stringify(optOutAdd.body));
    assert.equal(optOutAdd.body.data.changed, true);
    assert.equal(optOutAdd.body.data.telemetry.reason, 'ANALYTICS_OPT_OUT');
    assert.equal(await Favorite.count({ where: { userId: optOut.user.id, placeId: hotel.id } }), 1);
    assert.equal(await UserEvent.count({ where: { userId: optOut.user.id } }), 0);
    const optOutDuplicate = await api('POST', `/api/favorites/${hotel.id}`, mutation(), optOut.token);
    assert.equal(optOutDuplicate.status, 200);
    assert.equal(optOutDuplicate.body.data.changed, false);
    assert.equal(await Favorite.count({ where: { userId: optOut.user.id, placeId: hotel.id } }), 1);

    const optOutList = await api('GET', '/api/favorites', undefined, optOut.token);
    assert.equal(optOutList.status, 200);
    assert.equal(optOutList.body.data.total, 1);
    assert.equal(optOutList.body.data.items[0].place.id, hotel.id);
    const otherList = await api('GET', '/api/favorites', undefined, other.token);
    assert.equal(otherList.body.data.total, 0, 'A user must never receive another user\'s favorites');
    const crossUserDelete = await api('DELETE', `/api/favorites/${hotel.id}`, mutation(), other.token);
    assert.equal(crossUserDelete.status, 200);
    assert.equal(crossUserDelete.body.data.changed, false);
    assert.equal(await Favorite.count({ where: { userId: optOut.user.id, placeId: hotel.id } }), 1);

    const consent = await api('PUT', '/api/intelligence/consent', {
      analyticsEnabled: true, personalizationEnabled: true,
    }, owner.token);
    assert.equal(consent.status, 200);

    const concurrentAdds = await Promise.all(Array.from({ length: 6 }, () =>
      api('POST', `/api/favorites/${attraction.id}`, mutation({ uiSurface: 'explore_results' }), owner.token)));
    assert.equal(concurrentAdds.filter((response) => response.status === 201).length, 1);
    assert.equal(concurrentAdds.filter((response) => response.body.data.changed).length, 1);
    assert.equal(await Favorite.count({ where: { userId: owner.user.id, placeId: attraction.id } }), 1);
    assert.equal(await UserEvent.count({ where: {
      userId: owner.user.id, itemId: attraction.id, eventType: 'FAVORITE', source: 'favorite_state',
    } }), 1);

    const repeatedAdds = await Promise.all(Array.from({ length: 3 }, () =>
      api('POST', `/api/favorites/${attraction.id}`, mutation(), owner.token)));
    assert.ok(repeatedAdds.every((response) => response.status === 200 && !response.body.data.changed));
    assert.equal(await UserEvent.count({ where: {
      userId: owner.user.id, itemId: attraction.id, eventType: 'FAVORITE', source: 'favorite_state',
    } }), 1, 'Idempotent add must not duplicate outcomes');

    const concurrentDeletes = await Promise.all(Array.from({ length: 6 }, () =>
      api('DELETE', `/api/favorites/${attraction.id}`, mutation(), owner.token)));
    assert.equal(concurrentDeletes.filter((response) => response.body.data.changed).length, 1);
    assert.equal(await Favorite.count({ where: { userId: owner.user.id, placeId: attraction.id } }), 0);
    assert.equal(await UserEvent.count({ where: {
      userId: owner.user.id, itemId: attraction.id, eventType: 'UNFAVORITE', source: 'favorite_state',
    } }), 1, 'Concurrent remove must emit one outcome');

    const recommendation = await api('POST', '/api/intelligence/recommendations', {
      contractVersion: '1.0', sessionId, uiSurface: 'explore_results', filters: { category: 'hotel' },
      explicitPreferences: [], limit: 10,
    }, owner.token);
    assert.equal(recommendation.status, 201, JSON.stringify(recommendation.body));
    const requestId = recommendation.body.data.requestId as string;
    const recommendedHotel = recommendation.body.data.items[0];
    assert.ok(recommendedHotel?.id);
    const visible = await api('POST', '/api/intelligence/recommendations/visible', {
      contractVersion: '1.0', clientAckId: randomUUID(), requestId, sessionId,
      itemId: recommendedHotel.id, itemType: 'hotel', uiSurface: 'explore_results',
      visibilityRuleVersion: 'viewport-50pct-2000ms-v1', visibleRatio: 0.8, dwellMs: 2000,
      visibleAt: new Date().toISOString(),
    }, owner.token);
    assert.equal(visible.status, 202, JSON.stringify(visible.body));
    assert.equal(await RecommendationVisibleImpression.count({ where: { requestId, itemId: recommendedHotel.id } }), 1);

    const attributed = await api('POST', `/api/favorites/${recommendedHotel.id}`, mutation({ requestId }), owner.token);
    assert.equal(attributed.status, 201, JSON.stringify(attributed.body));
    const attributedEvent = await UserEvent.findOne({ where: {
      userId: owner.user.id, itemId: recommendedHotel.id, eventType: 'FAVORITE', requestId,
    } });
    assert.equal(attributedEvent?.origin, 'SERVER');
    assert.equal(attributedEvent?.source, 'favorite_state');
    assert.equal(attributedEvent?.personalizationAllowed, true);

    const attributedDuplicate = await api('POST', `/api/favorites/${recommendedHotel.id}`, mutation({ requestId }), owner.token);
    assert.equal(attributedDuplicate.status, 200);
    assert.equal(attributedDuplicate.body.data.changed, false);
    assert.equal(await UserEvent.count({ where: {
      userId: owner.user.id, itemId: recommendedHotel.id, eventType: 'FAVORITE', requestId,
    } }), 1);

    const attributedRemove = await api('DELETE', `/api/favorites/${recommendedHotel.id}`, mutation({ requestId }), owner.token);
    assert.equal(attributedRemove.status, 200);
    assert.equal(attributedRemove.body.data.changed, true);
    assert.equal(await UserEvent.count({ where: {
      userId: owner.user.id, itemId: recommendedHotel.id, eventType: 'UNFAVORITE', requestId,
    } }), 1);

    const forgedAttribution = await api('POST', `/api/favorites/${recommendedHotel.id}`, mutation({ requestId: randomUUID() }), owner.token);
    assert.equal(forgedAttribution.status, 400, JSON.stringify(forgedAttribution.body));
    assert.equal(forgedAttribution.body.code, 'INVALID_RECOMMENDATION_ATTRIBUTION');
    assert.equal(await Favorite.count({ where: { userId: owner.user.id, placeId: recommendedHotel.id } }), 0);
    const crossUserAttribution = await api('POST', `/api/favorites/${recommendedHotel.id}`, mutation({ requestId }), other.token);
    assert.equal(crossUserAttribution.status, 400);
    assert.equal(await Favorite.count({ where: { userId: other.user.id, placeId: recommendedHotel.id } }), 0);

    const unseenRequest = await api('POST', '/api/intelligence/recommendations', {
      contractVersion: '1.0', sessionId, uiSurface: 'explore_results', filters: { category: 'hotel' },
      explicitPreferences: [], limit: 10,
    }, owner.token);
    const noImpression = await api('POST', `/api/favorites/${unseenRequest.body.data.items[0].id}`,
      mutation({ requestId: unseenRequest.body.data.requestId }), owner.token);
    assert.equal(noImpression.status, 400);
    assert.equal(noImpression.body.code, 'INVALID_RECOMMENDATION_ATTRIBUTION');

    await api('PUT', '/api/intelligence/consent', {
      analyticsEnabled: true, personalizationEnabled: false,
    }, owner.token);
    const analyticsOnly = await api('POST', `/api/favorites/${attraction.id}`, mutation(), owner.token);
    assert.equal(analyticsOnly.status, 201);
    const analyticsOnlyEvent = await UserEvent.findOne({ where: {
      userId: owner.user.id, itemId: attraction.id, eventType: 'FAVORITE', source: 'favorite_state',
    }, order: [['occurredAt', 'DESC']] });
    assert.equal(analyticsOnlyEvent?.personalizationAllowed, false);
    assert.equal(await Favorite.count({ where: { userId: owner.user.id, placeId: attraction.id } }), 1);

    const privacyDelete = await api('PUT', '/api/intelligence/consent', {
      analyticsEnabled: false, personalizationEnabled: false, deleteExistingEvents: true,
    }, owner.token);
    assert.equal(privacyDelete.status, 200);
    assert.equal(await UserEvent.count({ where: { userId: owner.user.id } }), 0, 'Privacy deletion must remove telemetry outcomes');
    assert.equal(await Favorite.count({ where: { userId: owner.user.id, placeId: attraction.id } }), 1,
      'Privacy deletion must not remove functional account favorites');
    const listAfterPrivacyDelete = await api('GET', '/api/favorites', undefined, owner.token);
    assert.equal(listAfterPrivacyDelete.body.data.total, 1);

    await User.destroy({ where: { id: optOut.user.id } });
    assert.equal(await Favorite.count({ where: { userId: optOut.user.id } }), 0, 'Account deletion must cascade functional favorites');
    assert.equal(await UserEvent.count({ where: { userId: optOut.user.id } }), 0);

    assert.equal(await UserEvent.count({ where: { environment: 'production', userId: owner.user.id } }), 0);
    console.log(JSON.stringify({
      result: 'PASS', checks: 59, unauthorized: 401, identitySpoofingBlocked: true,
      ownerIsolation: true, concurrentAddRows: 1, concurrentAddOutcomes: 1,
      concurrentRemoveRows: 0, concurrentRemoveOutcomes: 1,
      attributedSaveOutcomes: 1, attributedUnsaveOutcomes: 1,
      optOutFavoriteRows: 1, optOutEvents: 0, privacyDeletionPreservesFavorites: true, accountDeletionCascade: true,
      environment: 'test',
    }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error('Server-side Favorite PostgreSQL integration test failed:', error);
  process.exitCode = 1;
});
