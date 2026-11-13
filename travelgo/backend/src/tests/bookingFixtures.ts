import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sequelize } from '../config/database.js';
import { AuditLog, Booking, Business, Place, RecommendationCandidate, RecommendationRequest, RecommendationVisibleImpression, Ticket, Tour, User, UserEvent } from '../models/index.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from '../utils/testDatabaseGuard.js';

export async function bookingTestGuard(purpose: string) {
  assertTestDatabaseWriteOptIn(purpose);
  assert.equal(process.env.DB_NAME, 'travelgo_ai_m0_test');
  await assertDatabaseSentinel(sequelize, purpose);
}
export async function bookingFingerprint() {
  const output: Record<string, any> = {};
  // The same expression works before/after migration12: it omits ONLY the new,
  // nullable request column, so adding schema does not masquerade as row changes.
  for (const table of ['bookings', 'booking_status_history', 'businesses', 'tours', 'tickets', 'places', 'trip_sessions', 'users', 'user_events']) {
    const [rows]: any = await sequelize.query(`SELECT count(*)::int AS count,
      md5(COALESCE(string_agg((to_jsonb(t)-'request_fingerprint')::text, '' ORDER BY id),'')) AS fingerprint FROM ${table} t`);
    output[table] = rows[0];
  }
  return output;
}

/** Only IDs allocated by this fixture are ever mutated or deleted. */
export class BookingFixtures {
  users: string[] = [];
  readonly businessId = randomUUID();
  readonly tourId = randomUUID();
  readonly ticketId = randomUUID();
  readonly hotelId = randomUUID();
  readonly restaurantId = randomUUID();
  requests: string[] = [];
  async createResources() {
    await bookingTestGuard('T06 create fixtures');
    await Business.create({ id: this.businessId, name: 'T06 Fixture Business', type: 'TOUR_OPERATOR', email: 't06@example.test', phone: '0901234567', address: 'Fixture', city: 'T06 City', status: 'ACTIVE' });
    await Tour.create({ id: this.tourId, businessId: this.businessId, title: 'T06 Fixture Tour', slug: `t06-${this.tourId}`, destinationCity: 'T06 City', departureCity: 'T06 City', durationDays: 2, durationNights: 1, category: 'culture', summary: 'Fixture', description: 'Fixture', heroImage: '/fixture.png', priceVND: 100001, capacity: 20, availableCapacity: 20, status: 'APPROVED' });
    await Ticket.create({ id: this.ticketId, businessId: this.businessId, title: 'T06 Fixture Ticket', type: 'bus', operator: 'T06', departureCity: 'T06 City', arrivalCity: 'T06 City', departureTime: new Date('2028-02-29T08:00:00Z'), price: 100001, capacity: 20, availableSeats: 20, features: [], status: 'ACTIVE' });
    for (const [id, category] of [[this.hotelId, 'hotel'], [this.restaurantId, 'restaurant']] as const) {
      await Place.create({ id, businessId: this.businessId, name: `T06 Fixture ${category}`, slug: `t06-${id}`, category, summary: 'Fixture', description: 'Fixture', city: 'T06 City', province: 'T06', address: 'Fixture', latitude: 16, longitude: 108, priceFrom: 100001, heroImage: '/fixture.png', galleryImages: [], highlights: [], amenities: [], status: 'APPROVED' });
    }
  }
  async attribution(userId: string) {
    const requestId = randomUUID(); this.requests.push(requestId);
    const sessionId = `t06-${randomUUID()}`;
    const expiresAt = new Date(Date.now() + 86400000);
    await RecommendationRequest.create({ requestId, userId, sessionId, uiSurface: 'explore_results', algorithmVersion: 'fixture', policyVersion: 'fixture', modelVersion: 'fixture', configVersion: 'fixture', environment: 'test', analyticsConsent: true, personalizationConsent: false, expiresAt });
    const candidate = await RecommendationCandidate.create({ requestId, itemId: this.hotelId, itemType: 'hotel', eligible: true, eligibilityCode: 'ELIGIBLE', rankPosition: 1, returned: true, policyVersion: 'fixture', modelVersion: 'fixture' });
    await RecommendationVisibleImpression.create({ clientAckId: randomUUID(), requestId, candidateId: candidate.id, userId, sessionId, itemId: this.hotelId, itemType: 'hotel', uiSurface: 'explore_results', visibilityRuleVersion: 'fixture-v1', visibleRatio: 1, dwellMs: 2000, visibleAt: new Date(), environment: 'test', personalizationAllowed: false, expiresAt });
    return { recommendationRequestId: requestId, recommendationSessionId: sessionId };
  }
  async cleanup() {
    await bookingTestGuard('T06 fixture cleanup');
    const bookings = this.users.length ? await Booking.findAll({ where: { userId: this.users }, attributes: ['id'] }) : [];
    const bookingIds = bookings.map(b => b.id);
    if (this.users.length) {
      await UserEvent.destroy({ where: { userId: this.users } });
      await AuditLog.destroy({ where: { actorUserId: this.users } });
    }
    if (bookingIds.length) await Booking.destroy({ where: { id: bookingIds } }); // history cascades
    if (this.requests.length) await RecommendationRequest.destroy({ where: { requestId: this.requests } });
    await Ticket.destroy({ where: { id: this.ticketId } });
    await Tour.destroy({ where: { id: this.tourId } });
    await Place.destroy({ where: { id: [this.hotelId, this.restaurantId] } });
    await Business.destroy({ where: { id: this.businessId } });
    if (this.users.length) await User.destroy({ where: { id: this.users } });
  }
}
