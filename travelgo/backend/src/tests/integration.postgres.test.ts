import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { AuditLog, Booking, PartnerApplication, Place, Ticket, TripSession, UserEvent, UserRole } from '../models/index.js';
import { RecommendationService } from '../services/recommendationService.js';
import {
  assertDatabaseSentinel,
  assertTestDatabaseWriteOptIn,
  requireSeedPassword,
} from '../utils/testDatabaseGuard.js';

type ApiResponse = { status: number; body: any };

function tokenHeader(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

async function main(): Promise<void> {
  assertTestDatabaseWriteOptIn('PostgreSQL integration test');
  const seedPassword = requireSeedPassword();
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'PostgreSQL integration test');

  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to determine integration test port');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const api = async (path: string, init: RequestInit = {}): Promise<ApiResponse> => {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}) },
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };
  const expectStatus = async (path: string, status: number, init: RequestInit = {}) => {
    const result = await api(path, init);
    assert.equal(result.status, status, `${init.method || 'GET'} ${path}: ${JSON.stringify(result.body)}`);
    return result.body;
  };
  const login = async (email: string, password: string) => {
    const body = await expectStatus('/api/auth/login', 200, { method: 'POST', body: JSON.stringify({ email, password }) });
    return body.data;
  };
  const register = async (email: string, fullName: string) => {
    const body = await expectStatus('/api/auth/register', 201, {
      method: 'POST',
      body: JSON.stringify({ email, fullName, password: 'Customer2026!', phone: '0901234567' }),
    });
    return body.data;
  };

  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const customerAEmail = `phase35.a.${suffix}@example.test`;
  const customerBEmail = `phase35.b.${suffix}@example.test`;
  const city = `Phase35 City ${suffix}`;
  const checks: string[] = [];
  const pass = (name: string) => { checks.push(name); console.log(`PASS ${name}`); };

  try {
    const health = await expectStatus('/api/health', 200);
    assert.equal(health.database, 'connected');
    pass('PostgreSQL-backed health check');

    await expectStatus('/api/admin/dashboard', 401);
    const admin = await login('admin@hugotravel.vn', seedPassword);
    const seededPartnerB = await login('hotel.b@hugotravel.vn', seedPassword);
    const customerA = await register(customerAEmail, 'Phase 35 Customer A');
    const customerB = await register(customerBEmail, 'Phase 35 Customer B');
    assert.deepEqual(customerA.user.roles, ['CUSTOMER']);
    await expectStatus('/api/admin/dashboard', 403, { headers: tokenHeader(customerA.token) });
    await expectStatus('/api/partner/dashboard', 403, { headers: tokenHeader(customerA.token) });
    pass('401/403 authorization boundaries and customer registration');

    await expectStatus('/api/intelligence/events', 401, {
      method: 'POST',
      body: JSON.stringify({}),
    });
    await expectStatus('/api/intelligence/consent', 200, {
      method: 'PUT', headers: tokenHeader(customerA.token),
      body: JSON.stringify({ analyticsEnabled: true, personalizationEnabled: true }),
    });
    const visiblePlace = await Place.findOne({ where: { status: 'APPROVED' }, order: [['createdAt', 'ASC']] });
    assert.ok(visiblePlace);
    const clientEventId = randomUUID();
    const authenticatedEvent = await expectStatus('/api/intelligence/events', 202, {
      method: 'POST', headers: tokenHeader(customerA.token),
      body: JSON.stringify({
        contractVersion: '1.0', clientEventId, sessionId: `auth-${suffix}`, itemId: visiblePlace.id,
        itemType: 'place', eventType: 'CLICK', occurredAt: new Date().toISOString(),
        uiSurface: 'explore_results', context: { position: 1 },
      }),
    });
    await expectStatus('/api/intelligence/events', 400, {
      method: 'POST', headers: tokenHeader(customerA.token),
      body: JSON.stringify({
        contractVersion: '1.0', clientEventId: randomUUID(), sessionId: `spoof-${suffix}`, itemId: visiblePlace.id,
        itemType: 'place', eventType: 'CLICK', occurredAt: new Date().toISOString(), uiSurface: 'explore_results',
        userId: admin.user.id,
      }),
    });
    const storedAuthenticatedEvent = await UserEvent.findByPk(authenticatedEvent.data.id);
    assert.equal(storedAuthenticatedEvent?.userId, customerA.user.id);
    assert.equal(storedAuthenticatedEvent?.clientEventId, clientEventId);
    pass('AI event consent, required authentication, idempotency identity, and anti-user spoofing');

    const applicationBody = await expectStatus('/api/partner-applications', 201, {
      method: 'POST',
      headers: tokenHeader(customerA.token),
      body: JSON.stringify({
        representativeName: 'Phase 35 Representative', businessName: `Phase 35 Operator ${suffix}`,
        businessType: 'TOUR_OPERATOR', email: customerAEmail, phone: '0901234567',
        address: '35 Integration Street', city, latitude: 16.05, longitude: 108.2,
        status: 'APPROVED', userId: admin.user.id, reviewedBy: admin.user.id,
      }),
    });
    const application = await PartnerApplication.findByPk(applicationBody.data.id);
    assert.equal(application?.status, 'PENDING');
    assert.equal(application?.userId, customerA.user.id);
    pass('Partner application mass-assignment protection');

    const approval = await expectStatus(`/api/admin/partners/${application!.id}/approval`, 200, {
      method: 'PATCH', headers: tokenHeader(admin.token), body: JSON.stringify({ status: 'APPROVED' }),
    });
    const businessId = approval.data.business.id as string;
    const partnerA = await login(customerAEmail, 'Customer2026!');
    assert.ok(partnerA.user.roles.includes('PARTNER'));
    pass('Super Admin approval transaction and Partner role refresh');

    const placeBody = await expectStatus('/api/partner/places', 201, {
      method: 'POST', headers: tokenHeader(partnerA.token),
      body: JSON.stringify({
        businessId, name: `Phase 35 Landmark ${suffix}`, category: 'attraction',
        summary: 'Integration landmark', description: 'A PostgreSQL integration landmark used by the real planner.',
        city, province: city, address: '1 Database Avenue', latitude: 16.06, longitude: 108.21,
        priceFrom: 125000, heroImage: 'https://example.test/place.jpg', highlights: ['culture'],
        status: 'APPROVED',
      }),
    });
    const placeId = placeBody.data.id as string;
    assert.equal(placeBody.data.status, 'DRAFT');
    await expectStatus(`/api/places/${placeId}`, 404);
    await expectStatus(`/api/partner/places/${placeId}`, 403, {
      method: 'PATCH', headers: tokenHeader(seededPartnerB.token), body: JSON.stringify({ name: 'Stolen' }),
    });
    await expectStatus(`/api/partner/places/${placeId}`, 403, {
      method: 'DELETE', headers: tokenHeader(seededPartnerB.token),
    });
    await expectStatus(`/api/partner/places/${placeId}/submit`, 200, { method: 'POST', headers: tokenHeader(partnerA.token) });
    await expectStatus(`/api/admin/places/${placeId}/status`, 200, {
      method: 'PATCH', headers: tokenHeader(admin.token), body: JSON.stringify({ status: 'APPROVED' }),
    });
    const publicPlace = await expectStatus(`/api/places/${placeId}`, 200);
    assert.equal(publicPlace.data.id, placeId);
    pass('Partner place ownership, moderation, and public visibility');

    const tourBody = await expectStatus('/api/partner/tours', 201, {
      method: 'POST', headers: tokenHeader(partnerA.token),
      body: JSON.stringify({
        businessId, title: `Phase 35 Tour ${suffix}`, destinationCity: city, departureCity: 'Da Nang',
        durationDays: 2, durationNights: 1, category: 'culture', summary: 'Integration tour',
        description: 'Tour persisted and moderated on PostgreSQL.', heroImage: 'https://example.test/tour.jpg',
        priceVND: 850000, capacity: 8,
      }),
    });
    const tourId = tourBody.data.id as string;
    await expectStatus(`/api/partner/tours/${tourId}/submit`, 200, { method: 'POST', headers: tokenHeader(partnerA.token) });
    await expectStatus(`/api/admin/tours/${tourId}/status`, 200, {
      method: 'PATCH', headers: tokenHeader(admin.token), body: JSON.stringify({ status: 'APPROVED' }),
    });
    const publicTours = await expectStatus(`/api/tours?search=${encodeURIComponent(`Phase 35 Tour ${suffix}`)}`, 200);
    assert.ok(publicTours.data.some((item: any) => item.id === tourId));
    pass('Partner tour creation, moderation, and public visibility');

    const createTicket = async (title: string, capacity: number) => {
      const body = await expectStatus('/api/partner/tickets', 201, {
        method: 'POST', headers: tokenHeader(partnerA.token),
        body: JSON.stringify({
          businessId, title, type: 'sightseeing', operator: 'Phase 35 Operator',
          departureCity: city, arrivalCity: city, departureTime: '2027-01-15T08:00:00+07:00',
          duration: '1 day', price: 275000, capacity, status: 'ACTIVE',
        }),
      });
      return body.data;
    };
    const idempotentTicket = await createTicket(`Phase 35 Idempotency ${suffix}`, 2);
    const scarceTicket = await createTicket(`Phase 35 Last Seat ${suffix}`, 1);

    const bookingPayload = (serviceId: string) => ({
      serviceType: 'ticket', serviceId, bookingDate: '2027-01-15', adultsCount: 1, childrenCount: 0,
      quantity: 1, customerPhone: '0901234567', unitPrice: 1, totalAmount: 1,
      businessId: '00000000-0000-4000-8000-000000000000', customerEmail: 'forged@example.test',
    });
    const idempotencyKey = `phase35-${suffix}`;
    const [idemA, idemB] = await Promise.all([
      api('/api/bookings', { method: 'POST', headers: { ...tokenHeader(partnerA.token), 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(bookingPayload(idempotentTicket.id)) }),
      api('/api/bookings', { method: 'POST', headers: { ...tokenHeader(partnerA.token), 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(bookingPayload(idempotentTicket.id)) }),
    ]);
    assert.deepEqual([idemA.status, idemB.status], [201, 201]);
    assert.equal(idemA.body.data.id, idemB.body.data.id);
    const storedIdempotent = await Booking.findByPk(idemA.body.data.id);
    const refreshedIdempotentTicket = await Ticket.findByPk(idempotentTicket.id);
    assert.equal(Number(storedIdempotent?.unitPrice), 275000);
    assert.equal(storedIdempotent?.businessId, businessId);
    assert.equal(storedIdempotent?.customerEmail, customerAEmail);
    assert.equal(refreshedIdempotentTicket?.availableSeats, 1);
    assert.equal(await Booking.count({ where: { userId: customerA.user.id, idempotencyKey } }), 1);
    pass('Booking idempotency, anti-price/business spoofing, and rollback after unique race');

    const [lastSeatA, lastSeatB] = await Promise.all([
      api('/api/bookings', { method: 'POST', headers: tokenHeader(partnerA.token), body: JSON.stringify(bookingPayload(scarceTicket.id)) }),
      api('/api/bookings', { method: 'POST', headers: tokenHeader(customerB.token), body: JSON.stringify(bookingPayload(scarceTicket.id)) }),
    ]);
    assert.deepEqual([lastSeatA.status, lastSeatB.status].sort(), [201, 409]);
    const successfulLastSeat = lastSeatA.status === 201 ? lastSeatA : lastSeatB;
    const losingToken = lastSeatA.status === 201 ? customerB.token : partnerA.token;
    const refreshedScarceTicket = await Ticket.findByPk(scarceTicket.id);
    assert.equal(refreshedScarceTicket?.availableSeats, 0);
    assert.equal(await Booking.count({ where: { ticketId: scarceTicket.id } }), 1);
    await expectStatus(`/api/bookings/${successfulLastSeat.body.data.id}`, 404, { headers: tokenHeader(losingToken) });
    pass('Concurrent last-seat booking without oversell and cross-customer privacy');

    await expectStatus(`/api/partner/bookings/${idemA.body.data.id}/status`, 200, {
      method: 'PATCH', headers: tokenHeader(partnerA.token),
      body: JSON.stringify({ businessId, status: 'CONFIRMED' }),
    });
    const confirmed = await expectStatus(`/api/bookings/${idemA.body.data.id}`, 200, { headers: tokenHeader(partnerA.token) });
    assert.equal(confirmed.data.bookingStatus, 'CONFIRMED');
    pass('Partner booking confirmation and customer status retrieval');

    const recommendations = await RecommendationService.recommendFromDatabase({
      destinationCity: city, preferences: ['van-hoa'], dailyBudgetPerPerson: 1000000,
    });
    assert.ok(recommendations.some((item) => item.place.id === placeId));
    const requestedPreferences = ['van-hoa', 'am-thuc'];
    const planned = await expectStatus('/api/tours/plan', 200, {
      method: 'POST', body: JSON.stringify({
        departureCity: 'Da Nang', destinationCity: city, startDate: '2027-01-15', endDate: '2027-01-16',
        adults: 1, children: 0, totalBudget: 4000000, transportation: 'car', preferences: requestedPreferences, pacing: 'balanced',
      }),
    });
    assert.ok(planned.data.days.flatMap((day: any) => day.activities).some((activity: any) => activity.placeId === placeId));
    assert.deepEqual(planned.data.preferences, requestedPreferences);
    await expectStatus('/api/tours/plan', 400, {
      method: 'POST', body: JSON.stringify({ destinationCity: city, preferences: ['from-summary'] }),
    });
    pass('Database-backed recommendation, planner and preference allowlist');

    const savedTrip = await expectStatus('/api/trips', 201, {
      method: 'POST', headers: tokenHeader(partnerA.token), body: JSON.stringify({ itinerary: planned.data }),
    });
    assert.deepEqual(savedTrip.data.preferences, requestedPreferences);
    const storedTrip = await TripSession.findByPk(savedTrip.data.id);
    assert.deepEqual(storedTrip?.preferences, requestedPreferences);
    const reopened = await expectStatus(`/api/trips/${savedTrip.data.id}`, 200, { headers: tokenHeader(partnerA.token) });
    assert.equal(reopened.data.id, savedTrip.data.id);
    assert.deepEqual(reopened.data.preferences, requestedPreferences);
    await expectStatus(`/api/trips/${savedTrip.data.id}`, 404, { headers: tokenHeader(customerB.token) });
    pass('Trip persistence and ownership isolation');

    await expectStatus('/api/trips', 400, {
      method: 'POST', headers: tokenHeader(partnerA.token),
      body: JSON.stringify({ itinerary: { ...planned.data, preferences: ['from-summary'] } }),
    });
    const editedTrip = await expectStatus(`/api/trips/${savedTrip.data.id}`, 200, {
      method: 'PUT', headers: tokenHeader(partnerA.token),
      body: JSON.stringify({ preferences: ['nghi-duong', 'bien'] }),
    });
    assert.deepEqual(editedTrip.data.preferences, ['nghi-duong', 'bien']);
    await expectStatus(`/api/trips/${savedTrip.data.id}`, 400, {
      method: 'PUT', headers: tokenHeader(partnerA.token),
      body: JSON.stringify({ preferences: ['inferred-from-review'] }),
    });
    const clearedTrip = await expectStatus(`/api/trips/${savedTrip.data.id}`, 200, {
      method: 'PUT', headers: tokenHeader(partnerA.token), body: JSON.stringify({ preferences: [] }),
    });
    assert.deepEqual(clearedTrip.data.preferences, []);
    const legacyItinerary: any = { ...planned.data };
    delete legacyItinerary.preferences;
    const legacyTrip = await expectStatus('/api/trips', 201, {
      method: 'POST', headers: tokenHeader(partnerA.token), body: JSON.stringify({ itinerary: legacyItinerary }),
    });
    assert.deepEqual(legacyTrip.data.preferences, []);
    pass('Trip preferences save/reopen/edit/clear validation and legacy compatibility');

    assert.equal(await UserRole.count({ where: { role: 'SUPER_ADMIN' } }), 1);
    assert.equal(await UserRole.count({ where: { userId: customerB.user.id, role: 'SUPER_ADMIN' } }), 0);
    assert.ok(await AuditLog.count({ where: { actorUserId: admin.user.id } }) >= 3);
    pass('Seed/admin privilege and audit-log verification');

    console.log(JSON.stringify({ result: 'PASS', checks: checks.length, database: process.env.DB_NAME }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error('PostgreSQL integration test failed:', error);
  process.exitCode = 1;
});
