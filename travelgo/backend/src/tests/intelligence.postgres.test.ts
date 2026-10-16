import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { Place, TelemetryConsent, Ticket, UserEvent } from '../models/index.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from '../utils/testDatabaseGuard.js';

async function main(): Promise<void> {
  assertTestDatabaseWriteOptIn('HuGo Intelligence PostgreSQL integration test');
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'HuGo Intelligence PostgreSQL integration test');
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to determine integration test port');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const api = async (method: string, route: string, body?: object, token?: string, extraHeaders: Record<string, string> = {}) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extraHeaders },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };

  try {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const registered = await api('POST', '/api/auth/register', {
      email: `intelligence.${suffix}@example.test`, fullName: 'HuGo Intelligence Test',
      password: 'Intelligence2026!', phone: '0901234567',
    });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    const userId = registered.body.data.user.id as string;
    const token = registered.body.data.token as string;
    const place = await Place.findOne({ where: { status: 'APPROVED' }, order: [['createdAt', 'ASC']] });
    const ticket = await Ticket.findOne({ where: { status: 'ACTIVE' }, order: [['createdAt', 'ASC']] });
    assert.ok(place && ticket, 'Seed must provide an approved place and active ticket');

    const event = (overrides: Record<string, unknown> = {}) => ({
      contractVersion: '1.0', clientEventId: randomUUID(), sessionId: `integration-${suffix}`,
      itemId: place.id, itemType: 'place', eventType: 'VIEW', occurredAt: new Date().toISOString(),
      uiSurface: 'place_detail', context: { dwellMs: 2000 }, ...overrides,
    });

    const unauthorized = await api('POST', '/api/intelligence/events', event());
    assert.equal(unauthorized.status, 401, JSON.stringify(unauthorized.body));

    const defaultConsent = await api('GET', '/api/intelligence/consent', undefined, token);
    assert.equal(defaultConsent.status, 200);
    assert.equal(defaultConsent.body.data.hasDecision, false);
    assert.equal(defaultConsent.body.data.analyticsEnabled, false);

    const optedOutPayload = event();
    const optedOut = await api('POST', '/api/intelligence/events', optedOutPayload, token);
    assert.equal(optedOut.status, 202, JSON.stringify(optedOut.body));
    assert.equal(optedOut.body.data.recorded, false);
    assert.equal(optedOut.body.data.reason, 'ANALYTICS_OPT_OUT');
    assert.equal(await UserEvent.count({ where: { clientEventId: optedOutPayload.clientEventId } }), 0);

    const consent = await api('PUT', '/api/intelligence/consent', { analyticsEnabled: true, personalizationEnabled: true }, token);
    assert.equal(consent.status, 200, JSON.stringify(consent.body));
    assert.equal(consent.body.data.personalizationEnabled, true);

    const acceptedPayload = event();
    const accepted = await api('POST', '/api/intelligence/events', acceptedPayload, token);
    assert.equal(accepted.status, 202, JSON.stringify(accepted.body));
    assert.equal(accepted.body.data.recorded, true);
    const stored = await UserEvent.findByPk(accepted.body.data.id);
    assert.equal(stored?.userId, userId);
    assert.equal(stored?.source, 'web');
    assert.equal(stored?.origin, 'CLIENT');
    assert.equal(stored?.personalizationAllowed, true);
    assert.notEqual(stored?.environment, 'production');
    assert.ok(stored?.expiresAt && stored.expiresAt > new Date());

    const duplicate = await api('POST', '/api/intelligence/events', acceptedPayload, token);
    assert.equal(duplicate.status, 202, JSON.stringify(duplicate.body));
    assert.equal(duplicate.body.data.duplicate, true);
    assert.equal(await UserEvent.count({ where: { clientEventId: acceptedPayload.clientEventId } }), 1);
    const idempotencyConflict = await api('POST', '/api/intelligence/events', {
      ...acceptedPayload, eventType: 'CLICK', occurredAt: new Date().toISOString(),
    }, token);
    assert.equal(idempotencyConflict.status, 409, JSON.stringify(idempotencyConflict.body));
    assert.equal(idempotencyConflict.body.code, 'CLIENT_EVENT_ID_CONFLICT');

    const spoofed = await api('POST', '/api/intelligence/events', event({
      userId: '00000000-0000-4000-8000-000000000000', environment: 'production', businessId: randomUUID(),
    }), token);
    assert.equal(spoofed.status, 400, JSON.stringify(spoofed.body));
    assert.equal(spoofed.body.code, 'SPOOFED_SERVER_FIELD');

    const invisible = await api('POST', '/api/intelligence/events', event({ itemId: randomUUID() }), token);
    assert.equal(invisible.status, 404, JSON.stringify(invisible.body));
    assert.equal(invisible.body.code, 'EVENT_ITEM_NOT_VISIBLE');

    const fakeAttribution = await api('POST', '/api/intelligence/events', event({ requestId: randomUUID() }), token);
    assert.equal(fakeAttribution.status, 400, JSON.stringify(fakeAttribution.body));
    assert.equal(fakeAttribution.body.code, 'INVALID_RECOMMENDATION_ATTRIBUTION');

    const invalidFavorite = await api('POST', '/api/intelligence/events', event({ eventType: 'FAVORITE', context: {} }), token);
    assert.equal(invalidFavorite.status, 400, JSON.stringify(invalidFavorite.body));
    assert.equal(invalidFavorite.body.code, 'USE_FAVORITES_API');

    const bookingKey = `ai-m1-task2-${suffix}`;
    const bookingPayload = {
      serviceType: 'ticket', serviceId: ticket.id, bookingDate: '2027-03-10', adultsCount: 1,
      childrenCount: 0, quantity: 1, customerPhone: '0901234567', notes: 'M1 Task 2 verified transaction',
    };
    const booking = await api('POST', '/api/bookings', bookingPayload, token, { 'Idempotency-Key': bookingKey });
    assert.equal(booking.status, 201, JSON.stringify(booking.body));
    const bookingId = booking.body.data.id as string;
    const repeatedBooking = await api('POST', '/api/bookings', bookingPayload, token, { 'Idempotency-Key': bookingKey });
    assert.equal(repeatedBooking.status, 201, JSON.stringify(repeatedBooking.body));
    assert.equal(repeatedBooking.body.data.id, bookingId);
    assert.equal(await UserEvent.count({ where: { itemId: bookingId, eventType: 'BOOKING_CREATED' } }), 1);
    const bookingEvent = await UserEvent.findOne({ where: { itemId: bookingId, eventType: 'BOOKING_CREATED' } });
    assert.equal(bookingEvent?.origin, 'SERVER');
    assert.equal(bookingEvent?.source, 'booking_transaction');

    const cancelled = await api('POST', `/api/bookings/${bookingId}/cancel`, { reason: 'Telemetry integration test' }, token);
    assert.equal(cancelled.status, 200, JSON.stringify(cancelled.body));
    assert.equal(await UserEvent.count({ where: { itemId: bookingId, eventType: 'BOOKING_CANCELLED' } }), 1);

    const disable = await api('PUT', '/api/intelligence/consent', {
      analyticsEnabled: false, personalizationEnabled: false, deleteExistingEvents: true,
    }, token);
    assert.equal(disable.status, 200, JSON.stringify(disable.body));
    assert.equal(disable.body.data.analyticsEnabled, false);
    assert.equal(await UserEvent.count({ where: { userId } }), 0, 'Opt-out deletion must remove only this user telemetry');
    assert.equal((await TelemetryConsent.findByPk(userId))?.analyticsEnabled, false);

    console.log(JSON.stringify({
      result: 'PASS', checks: 30, unauthorized: 401, duplicatePrevented: true,
      spoofingBlocked: true, invalidItemBlocked: true, optOutHonored: true, bookingEventsServerVerified: true,
    }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error('HuGo Intelligence integration test failed:', error);
  process.exitCode = 1;
});
