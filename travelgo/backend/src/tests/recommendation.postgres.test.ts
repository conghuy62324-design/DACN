import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import {
  Booking, Business, Place, RecommendationCandidate, RecommendationRequest, RecommendationVisibleImpression, TripSession, UserEvent,
} from '../models/index.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from '../utils/testDatabaseGuard.js';

async function main(): Promise<void> {
  assertTestDatabaseWriteOptIn('Recommendation exposure PostgreSQL integration test');
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'Recommendation exposure PostgreSQL integration test');
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to determine test server port');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const api = async (method: string, route: string, body?: object, token?: string, headers: Record<string, string> = {}) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };

  try {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const register = async (label: string) => {
      const response = await api('POST', '/api/auth/register', {
        email: `rec.${label}.${suffix}@example.test`, fullName: `Recommendation ${label}`,
        password: 'Recommendation2026!', phone: '0901234567',
      });
      assert.equal(response.status, 201, JSON.stringify(response.body));
      return response.body.data as { token: string; user: { id: string } };
    };
    const owner = await register('owner');
    const other = await register('other');
    await api('PUT', '/api/intelligence/consent', { analyticsEnabled: true, personalizationEnabled: true }, owner.token);
    const hotel = await Place.findOne({ where: { status: 'APPROVED', category: 'hotel' }, order: [['createdAt', 'ASC']] });
    const nonHotel = await Place.findOne({ where: { status: 'APPROVED', category: 'attraction' }, order: [['createdAt', 'ASC']] });
    assert.ok(hotel && nonHotel, 'Seed must include an approved hotel and attraction');
    const sessionId = `rec-integration-${suffix}`;

    const recommendation = await api('POST', '/api/intelligence/recommendations', {
      contractVersion: '1.0', sessionId, uiSurface: 'explore_results',
      filters: { category: 'hotel', destinationCity: hotel.city, search: hotel.name, minRating: Number(hotel.rating) },
      explicitPreferences: ['nghi-duong'], dailyBudgetPerPerson: 2_000_000, limit: 10,
    }, owner.token);
    assert.equal(recommendation.status, 201, JSON.stringify(recommendation.body));
    const requestId = recommendation.body.data.requestId as string;
    assert.match(requestId, /^[0-9a-f-]{36}$/i);
    assert.ok(recommendation.body.data.items.length > 0);
    const requestRow = await RecommendationRequest.findByPk(requestId);
    assert.equal(requestRow?.userId, owner.user.id);
    assert.equal(requestRow?.environment, 'test');
    assert.equal(requestRow?.modelVersion, recommendation.body.data.modelVersion);
    const candidates = await RecommendationCandidate.findAll({ where: { requestId }, order: [['rankPosition', 'ASC']] });
    assert.equal(candidates.length, recommendation.body.data.items.length);
    assert.equal(candidates[0].itemId, hotel.id);
    assert.equal(candidates[0].eligible, true);

    const noMatchFallback = await api('POST', '/api/intelligence/recommendations', {
      contractVersion: '1.0', sessionId: `rec-fallback-${suffix}`, uiSurface: 'explore_results',
      filters: { category: 'hotel', destinationCity: `No-such-city-${suffix}` }, explicitPreferences: [], limit: 2,
    }, owner.token);
    assert.equal(noMatchFallback.status, 201, JSON.stringify(noMatchFallback.body));
    assert.equal(noMatchFallback.body.data.fallback.applied, true);
    assert.equal(noMatchFallback.body.data.fallback.code, 'NO_DESTINATION_MATCH');
    assert.ok(noMatchFallback.body.data.items.length > 0);

    const suspendedBusiness = await Business.create({
      name: `Suspended recommendation business ${suffix}`,
      type: 'HOTEL', email: `suspended.${suffix}@example.test`, phone: '0909999999',
      address: 'Test only', city: 'Đà Nẵng', status: 'SUSPENDED',
    });
    const suspendedPlace = await Place.create({
      businessId: suspendedBusiness.id,
      name: `Suspended recommendation place ${suffix}`,
      slug: `suspended-recommendation-place-${suffix}`,
      category: 'hotel', summary: 'Fixture kiểm thử eligibility', description: 'Test only',
      city: 'Đà Nẵng', province: 'Đà Nẵng', address: 'Test only', latitude: 16.05, longitude: 108.2,
      priceFrom: 500_000, rating: 5, reviewCount: 10, bayesianRating: 4.6,
      heroImage: 'https://example.test/suspended.jpg', galleryImages: [], highlights: ['resort'], amenities: [],
      isFeatured: false, openingHours: {}, contactInfo: {}, status: 'APPROVED',
    });
    const suspendedSearch = await api('POST', '/api/intelligence/recommendations', {
      contractVersion: '1.0', sessionId: `rec-suspended-${suffix}`, uiSurface: 'explore_results',
      filters: { category: 'hotel', search: suspendedPlace.name }, explicitPreferences: [], limit: 5,
    }, owner.token);
    assert.equal(suspendedSearch.status, 201, JSON.stringify(suspendedSearch.body));
    assert.equal(suspendedSearch.body.data.items.length, 0);

    const suspendedPlanner = await api('POST', '/api/tours/plan', {
      departureCity: 'Hà Nội', destinationCity: suspendedPlace.city,
      startDate: '2027-05-01', endDate: '2027-05-01', adults: 1, children: 0,
      totalBudget: 3_000_000, transportation: 'car', preferences: [], pacing: 'balanced',
      mandatoryPlaceIds: [suspendedPlace.id],
    });
    assert.equal(suspendedPlanner.status, 422, JSON.stringify(suspendedPlanner.body));
    assert.equal(suspendedPlanner.body.code, 'MANDATORY_PLACE_UNAVAILABLE');

    const mandatoryPlan = await api('POST', '/api/tours/plan', {
      departureCity: 'Hà Nội', destinationCity: hotel.city,
      startDate: '2027-05-01', endDate: '2027-05-01', adults: 1, children: 0,
      totalBudget: 3_000_000, transportation: 'car', preferences: ['nghi-duong'], pacing: 'balanced',
      mandatoryPlaceIds: [hotel.id],
    });
    assert.equal(mandatoryPlan.status, 200, JSON.stringify(mandatoryPlan.body));
    const mandatoryActivities = mandatoryPlan.body.data.days.flatMap((day: any) => day.activities);
    assert.equal(mandatoryActivities.filter((activity: any) => activity.placeId === hotel.id).length, 1);
    assert.equal(mandatoryPlan.body.data.selectedPlaceIds.filter((id: string) => id === hotel.id).length, 1);

    const savedTrip = await api('POST', '/api/trips', { itinerary: mandatoryPlan.body.data }, owner.token);
    assert.equal(savedTrip.status, 201, JSON.stringify(savedTrip.body));
    assert.equal(savedTrip.body.data.selectedPlaceIds.filter((id: string) => id === hotel.id).length, 1);
    const storedTrip = await TripSession.findByPk(savedTrip.body.data.id);
    assert.equal(storedTrip?.userId, owner.user.id);
    assert.equal(storedTrip?.selectedPlaceIds.filter((id) => id === hotel.id).length, 1);
    const reopenedTrip = await api('GET', `/api/trips/${savedTrip.body.data.id}`, undefined, owner.token);
    assert.equal(reopenedTrip.status, 200, JSON.stringify(reopenedTrip.body));
    assert.equal(reopenedTrip.body.data.days.flatMap((day: any) => day.activities)
      .filter((activity: any) => activity.placeId === hotel.id).length, 1);
    const forbiddenTrip = await api('GET', `/api/trips/${savedTrip.body.data.id}`, undefined, other.token);
    assert.equal(forbiddenTrip.status, 404, JSON.stringify(forbiddenTrip.body));

    const ackPayload = {
      contractVersion: '1.0', clientAckId: randomUUID(), requestId, sessionId,
      itemId: hotel.id, itemType: 'hotel', uiSurface: 'explore_results',
      visibilityRuleVersion: 'viewport-50pct-2000ms-v1', visibleRatio: 0.75, dwellMs: 2000,
      visibleAt: new Date().toISOString(),
    };
    const visible = await api('POST', '/api/intelligence/recommendations/visible', ackPayload, owner.token);
    assert.equal(visible.status, 202, JSON.stringify(visible.body));
    assert.equal(visible.body.data.recorded, true);
    const duplicate = await api('POST', '/api/intelligence/recommendations/visible', ackPayload, owner.token);
    assert.equal(duplicate.status, 202, JSON.stringify(duplicate.body));
    assert.equal(duplicate.body.data.duplicate, true);
    const acknowledgementConflict = await api('POST', '/api/intelligence/recommendations/visible', {
      ...ackPayload, dwellMs: 2001,
    }, owner.token);
    assert.equal(acknowledgementConflict.status, 409, JSON.stringify(acknowledgementConflict.body));
    assert.equal(acknowledgementConflict.body.code, 'CLIENT_ACK_ID_CONFLICT');
    assert.equal(await RecommendationVisibleImpression.count({ where: { requestId, itemId: hotel.id } }), 1);

    const forged = await api('POST', '/api/intelligence/recommendations/visible', { ...ackPayload, clientAckId: randomUUID(), requestId: randomUUID() }, owner.token);
    assert.equal(forged.status, 400, JSON.stringify(forged.body));
    assert.equal(forged.body.code, 'INVALID_RECOMMENDATION_ATTRIBUTION');
    const otherUser = await api('POST', '/api/intelligence/recommendations/visible', { ...ackPayload, clientAckId: randomUUID() }, other.token);
    assert.equal(otherUser.status, 400, JSON.stringify(otherUser.body));
    const wrongItem = await api('POST', '/api/intelligence/recommendations/visible', {
      ...ackPayload, clientAckId: randomUUID(), itemId: nonHotel.id, itemType: 'place',
    }, owner.token);
    assert.equal(wrongItem.status, 400, JSON.stringify(wrongItem.body));
    assert.equal(wrongItem.body.code, 'INVALID_RECOMMENDATION_CANDIDATE');

    const click = await api('POST', '/api/intelligence/events', {
      contractVersion: '1.0', clientEventId: randomUUID(), sessionId, requestId,
      itemId: hotel.id, itemType: 'hotel', eventType: 'CLICK', occurredAt: new Date().toISOString(),
      uiSurface: 'explore_results', context: { position: 1 },
    }, owner.token);
    assert.equal(click.status, 202, JSON.stringify(click.body));
    assert.equal(click.body.data.recorded, true);
    const fakeClick = await api('POST', '/api/intelligence/events', {
      contractVersion: '1.0', clientEventId: randomUUID(), sessionId, requestId: randomUUID(),
      itemId: hotel.id, itemType: 'hotel', eventType: 'CLICK', occurredAt: new Date().toISOString(),
      uiSurface: 'explore_results', context: { position: 1 },
    }, owner.token);
    assert.equal(fakeClick.status, 400, JSON.stringify(fakeClick.body));
    assert.equal(fakeClick.body.code, 'INVALID_RECOMMENDATION_ATTRIBUTION');

    const optOutSession = `rec-optout-${suffix}`;
    const optOutRequest = await api('POST', '/api/intelligence/recommendations', {
      contractVersion: '1.0', sessionId: optOutSession, uiSurface: 'explore_results', filters: { category: 'hotel' },
      explicitPreferences: ['nghi-duong'], dailyBudgetPerPerson: 1_500_000, limit: 5,
    }, other.token);
    assert.equal(optOutRequest.status, 201, JSON.stringify(optOutRequest.body));
    assert.ok(optOutRequest.body.data.items.length > 0);
    assert.ok(optOutRequest.body.data.limitations.some((value: string) => value.includes('request hiện tại')));
    const optOutRequestRow = await RecommendationRequest.findByPk(optOutRequest.body.data.requestId);
    assert.deepEqual(optOutRequestRow?.explicitPreferences, []);
    assert.equal(Object.prototype.hasOwnProperty.call(optOutRequestRow?.filters || {}, 'dailyBudgetPerPerson'), false);
    const optOutItem = optOutRequest.body.data.items[0];
    const optOutAck = await api('POST', '/api/intelligence/recommendations/visible', {
      ...ackPayload, clientAckId: randomUUID(), requestId: optOutRequest.body.data.requestId, sessionId: optOutSession,
      itemId: optOutItem.id, itemType: optOutItem.category === 'hotel' ? 'hotel' : 'place',
    }, other.token);
    assert.equal(optOutAck.status, 202, JSON.stringify(optOutAck.body));
    assert.equal(optOutAck.body.data.recorded, false);
    assert.equal(optOutAck.body.data.reason, 'ANALYTICS_OPT_OUT');
    assert.equal(await RecommendationVisibleImpression.count({ where: { requestId: optOutRequest.body.data.requestId } }), 0);
    const deleteOptOutData = await api('PUT', '/api/intelligence/consent', {
      analyticsEnabled: false, personalizationEnabled: false, deleteExistingEvents: true,
    }, other.token);
    assert.equal(deleteOptOutData.status, 200, JSON.stringify(deleteOptOutData.body));
    assert.equal(await RecommendationRequest.count({ where: { requestId: optOutRequest.body.data.requestId } }), 0);
    assert.equal(await RecommendationCandidate.count({ where: { requestId: optOutRequest.body.data.requestId } }), 0);

    const bookingCountBefore = await Booking.count({ where: { userId: owner.user.id } });
    const bookingPayload = {
      serviceType: 'hotel', serviceId: hotel.id, bookingDate: '2027-04-10', returnDate: '2027-04-12',
      adultsCount: 1, childrenCount: 0, customerPhone: '0901234567',
      recommendationRequestId: requestId, recommendationSessionId: sessionId,
    };
    const booking = await api('POST', '/api/bookings', bookingPayload, owner.token, { 'Idempotency-Key': `rec-booking-${suffix}` });
    assert.equal(booking.status, 201, JSON.stringify(booking.body));
    const bookingRow = await Booking.findByPk(booking.body.data.id);
    assert.equal(bookingRow?.recommendationRequestId, requestId);
    const bookingEvent = await UserEvent.findOne({ where: { itemId: booking.body.data.id, eventType: 'BOOKING_CREATED' } });
    assert.equal(bookingEvent?.requestId, requestId);
    const fakeBooking = await api('POST', '/api/bookings', {
      ...bookingPayload, recommendationRequestId: randomUUID(),
    }, owner.token, { 'Idempotency-Key': `rec-booking-fake-${suffix}` });
    assert.equal(fakeBooking.status, 400, JSON.stringify(fakeBooking.body));
    assert.equal(await Booking.count({ where: { userId: owner.user.id } }), bookingCountBefore + 1);

    assert.equal(await RecommendationVisibleImpression.count({ where: { requestId, environment: 'production' } }), 0);
    console.log(JSON.stringify({
      result: 'PASS', checks: 52, requestId, candidates: candidates.length, visibleImpressions: 1,
      mandatoryPlaceTripId: savedTrip.body.data.id,
      clickAttributed: true, bookingAttributed: true, optOutTrainingImpressions: 0, environment: 'test',
    }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error('Recommendation exposure PostgreSQL integration test failed:', error);
  process.exitCode = 1;
});
