import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { AuditLog, Booking, BookingStatusHistory, Business, Place, RecommendationRequest, Ticket, Tour, UserEvent, UserRole } from '../models/index.js';
import { TelemetryService } from '../services/telemetryService.js';
import { HttpError } from '../utils/httpError.js';
import { BookingFixtures, bookingFingerprint, bookingTestGuard } from './bookingFixtures.js';

async function main() {
  await bookingTestGuard('T06 HTTP/PostgreSQL');
  const migration = '20261030_12_booking_request_fingerprint.sql';
  const [m]: any = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:migration', { replacements: { migration } });
  assert.equal(m[0]?.checksum, createHash('sha256').update(await readFile(`../database/migrations/${migration}`)).digest('hex'));
  const before = await bookingFingerprint();
  const fixtures = new BookingFixtures();
  const server = await new Promise<Server>(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`;
  const api = async (method: string, route: string, body?: any, token?: string, key?: string) => {
    const r = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(key === undefined ? {} : { 'Idempotency-Key': key }) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, body: await r.json() as any };
  };
  let checks = 0;
  const check = async (label: string, run: () => Promise<void>) => { await run(); checks++; console.log(`PASS ${label}`); };
  const input = (serviceType: string = 'tour', serviceId: string = fixtures.tourId) => ({ serviceType, serviceId, bookingDate: '2028-02-29', adultsCount: 1, childrenCount: 0, customerPhone: '0901234567' });
  try {
    await fixtures.createResources();
    const register = async () => {
      const password = randomBytes(24).toString('base64url') + '1a';
      const r = await api('POST', '/auth/register', { email: `t06.${randomUUID()}@example.test`, fullName: 'T06 Customer', password, phone: '0901234567' });
      assert.equal(r.status, 201); fixtures.users.push(r.body.data.user.id); return { ...r.body.data, password };
    };
    const owner = await register(); const other = await register(); const admin = await register();
    await UserRole.create({ userId: admin.user.id, role: 'SUPER_ADMIN' });
    const adminLogin = await api('POST', '/auth/login', { email: admin.user.email, password: admin.password });
    assert.equal(adminLogin.status, 200); admin.token = adminLogin.body.data.token;
    const create = (p: any = input(), key: string = randomUUID(), token = owner.token) => api('POST', '/bookings', p, token, key);
    const success = async (p: any = input(), key: string = randomUUID(), token = owner.token) => { const r = await create(p, key, token); assert.equal(r.status, 201, JSON.stringify(r.body)); return r.body.data; };
    const invariant = async () => ({
      bookings: (await Booking.findAll({ where: { userId: fixtures.users }, order: [['id', 'ASC']] })).map(b => b.toJSON()),
      histories: (await BookingStatusHistory.findAll({ where: { actorUserId: fixtures.users }, order: [['id', 'ASC']] })).map(h => h.toJSON()),
      events: (await UserEvent.findAll({ where: { userId: fixtures.users }, order: [['id', 'ASC']] })).map(e => e.toJSON()),
      tour: (await Tour.findByPk(fixtures.tourId))!.toJSON(), ticket: (await Ticket.findByPk(fixtures.ticketId))!.toJSON(),
    });
    const rejected = async (p: any, status = 400, key: string = randomUUID()) => { const before = await invariant(); assert.equal((await create(p, key)).status, status); assert.deepEqual(await invariant(), before); };
    const consent = (enabled: boolean, token = owner.token) => api('PUT', '/intelligence/consent', { analyticsEnabled: enabled, personalizationEnabled: false }, token);
    const counts = async (id: string, events: number) => {
      assert.equal(await BookingStatusHistory.count({ where: { bookingId: id, newStatus: 'PENDING' } }), 1);
      assert.equal(await UserEvent.count({ where: { itemId: id, eventType: 'BOOKING_CREATED' } }), events);
    };
    // Hold inventory externally and observe BOTH HTTP transactions waiting in
    // PostgreSQL (the same-key follower waits on advisory, leader on inventory).
    const contend = async (type: 'tour' | 'ticket', calls: (() => Promise<any>)[]) => {
      const tx = await sequelize.transaction(); let pending: Promise<any>[] = [];
      try {
        if (type === 'tour') await Tour.findByPk(fixtures.tourId, { transaction: tx, lock: tx.LOCK.UPDATE });
        else await Ticket.findByPk(fixtures.ticketId, { transaction: tx, lock: tx.LOCK.UPDATE });
        pending = calls.map(c => c());
        let blocked = 0; const end = Date.now() + 10000;
        while (Date.now() < end) {
          const [r]: any = await sequelize.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid() AND (query LIKE '%pg_advisory_xact_lock%' OR query LIKE '%FROM \"tours\"%' OR query LIKE '%FROM \"tickets\"%')");
          blocked = r[0].n; if (blocked >= 2) break;
          await new Promise(r => setTimeout(r, 25));
        }
        assert.ok(blocked >= 2, 'both booking requests must contend in PostgreSQL');
        console.log(JSON.stringify({ concurrencyWitness: type, blockedRequests: blocked }));
      } finally { await tx.commit(); }
      return Promise.all(pending);
    };

    await check('HTTP invalid inputs cause zero booking/history/event/inventory changes', async () => {
      for (const p of [null, [], {}, { ...input(), adultsCount: 0, childrenCount: 1 }, { ...input(), adultsCount: null }, { ...input(), adultsCount: '2' }, { ...input(), childrenCount: null }, { ...input(), adultsCount: 1.5 }, { ...input(), adultsCount: 101 }, { ...input(), adultsCount: Number.MAX_SAFE_INTEGER + 1 }, { ...input(), adultsCount: 100, childrenCount: 1 }, { ...input(), quantity: 1 }, { ...input(), bookingDate: '2028-02-30' }, { ...input(), bookingDate: '2028-02-29T00:00:00Z' }, { ...input(), bookingDate: '2027-02-29' }, { ...input(), returnDate: '2028-02-28' }, { ...input(), returnDate: null }, { ...input(), serviceId: 'bad' }, { ...input(), notes: 1 }, { ...input(), recommendationRequestId: randomUUID() }]) await rejected(p);
      for (const quantity of [0, -1, null, '2', 1.5, 101]) await rejected({ ...input('ticket', fixtures.ticketId), quantity });
      for (const key of ['', 'space key', 'x'.repeat(121)]) await rejected(input(), 400, key);
    });
    await check('ACTIVE/SUSPENDED and missing Business across all four service types', async () => {
      for (const [type, id] of [['tour', fixtures.tourId], ['ticket', fixtures.ticketId], ['hotel', fixtures.hotelId], ['restaurant', fixtures.restaurantId]]) {
        await Business.update({ status: 'ACTIVE' }, { where: { id: fixtures.businessId } });
        const b = await success(input(type, id)); await counts(b.id, 0);
        await Business.update({ status: 'SUSPENDED' }, { where: { id: fixtures.businessId } });
        await rejected(input(type, id), 409);
      }
      await Business.update({ status: 'ACTIVE' }, { where: { id: fixtures.businessId } });
      for (const id of [fixtures.hotelId, fixtures.restaurantId]) { await Place.update({ businessId: null }, { where: { id } }); await rejected(input(id === fixtures.hotelId ? 'hotel' : 'restaurant', id), 409); await Place.update({ businessId: fixtures.businessId }, { where: { id } }); }
      await Ticket.update({ businessId: null }, { where: { id: fixtures.ticketId } }); await rejected(input('ticket', fixtures.ticketId), 409); await Ticket.update({ businessId: fixtures.businessId }, { where: { id: fixtures.ticketId } });
      // Tour's NOT NULL FK makes a missing Business structurally impossible in this DB.
    });
    await check('resource validity/category/status checked atomically for every type', async () => {
      for (const type of ['tour', 'ticket', 'hotel', 'restaurant']) await rejected(input(type, randomUUID()), 404);
      await rejected(input('hotel', fixtures.restaurantId));
      await Tour.update({ status: 'SUSPENDED' }, { where: { id: fixtures.tourId } }); await rejected(input(), 404); await Tour.update({ status: 'APPROVED' }, { where: { id: fixtures.tourId } });
      await Ticket.update({ status: 'INACTIVE' }, { where: { id: fixtures.ticketId } }); await rejected(input('ticket', fixtures.ticketId), 404); await Ticket.update({ status: 'ACTIVE' }, { where: { id: fixtures.ticketId } });
      for (const id of [fixtures.hotelId, fixtures.restaurantId]) { await Place.update({ status: 'SUSPENDED' }, { where: { id } }); await rejected(input(id === fixtures.hotelId ? 'hotel' : 'restaurant', id), 404); await Place.update({ status: 'APPROVED' }, { where: { id } }); }
    });
    await check('new bookings observe a concurrent Business suspension before consuming inventory', async () => {
      const saved = await invariant(); const tx = await sequelize.transaction(); let pending: Promise<any>[] = [];
      try {
        await Business.update({ status: 'SUSPENDED' }, { where: { id: fixtures.businessId }, transaction: tx });
        pending = [create(input()), create(input('ticket', fixtures.ticketId))];
        let blocked = 0; const end = Date.now() + 10000;
        while (Date.now() < end) {
          const [r]: any = await sequelize.query("SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%FROM \"businesses\"%' AND pid<>pg_backend_pid()");
          blocked = r[0].n; if (blocked >= 2) break; await new Promise(r => setTimeout(r, 25));
        }
        assert.ok(blocked >= 2); console.log(JSON.stringify({ concurrencyWitness: 'business-suspension', blockedRequests: blocked }));
      } finally { await tx.commit(); }
      for (const r of await Promise.all(pending)) { assert.equal(r.status, 409); assert.equal(r.body.code, 'BUSINESS_NOT_ACTIVE'); }
      assert.deepEqual(await invariant(), saved);
      await Business.update({ status: 'ACTIVE' }, { where: { id: fixtures.businessId } });
    });
    await check('server price, guest/ticket quantities, optional returnDate and no nightly multiplication', async () => {
      const b = await success({ ...input(), adultsCount: 2, childrenCount: 1, returnDate: '2028-03-04', unitPrice: 1, totalAmount: 1, userId: other.user.id, customerName: 'Forged' } as any);
      assert.equal(b.quantity, 3); assert.equal(b.totalAmount, 270003); assert.equal(b.userId, owner.user.id); assert.equal(b.customerName, owner.user.fullName);
      const t = await success({ ...input('ticket', fixtures.ticketId), quantity: 2, childrenCount: 1 } as any); assert.equal(t.quantity, 2); assert.equal(t.totalAmount, 200002);
      const h = await success({ ...input('hotel', fixtures.hotelId), returnDate: '2028-03-04' } as any); assert.equal(h.totalAmount, 100001);
      const p: any = input('restaurant', fixtures.restaurantId); delete p.childrenCount; assert.equal((await success(p)).childrenCount, 0);
    });
    await check('canonical replay independent of catalog price/capacity/Business', async () => {
      const key = randomUUID(); const p = { ...input(), notes: 'First' }; const b = await success(p, key); const before = await invariant();
      assert.deepEqual((await success({ ...p, serviceId: p.serviceId.toUpperCase(), customerPhone: ' 0901234567 ', notes: ' First ' }, key)), b);
      assert.deepEqual(await invariant(), before);
      await Tour.update({ availableCapacity: 0, priceVND: 222222, status: 'SUSPENDED' }, { where: { id: fixtures.tourId } });
      await Business.update({ status: 'SUSPENDED' }, { where: { id: fixtures.businessId } });
      const unavailable = await invariant(); assert.deepEqual(await success(p, key), b); assert.deepEqual(await invariant(), unavailable);
      await Tour.update({ availableCapacity: 20, priceVND: 100001, status: 'APPROVED' }, { where: { id: fixtures.tourId } }); await Business.update({ status: 'ACTIVE' }, { where: { id: fixtures.businessId } });
    });
    await check('same user/key different business fields or attribution gives explicit 409', async () => {
      const key = randomUUID(); const p = input('hotel', fixtures.hotelId); await success(p, key);
      for (const patch of [{ adultsCount: 2 }, { childrenCount: 1 }, { notes: 'changed' }, { customerPhone: '0907654321' }, { bookingDate: '2028-03-01' }, { returnDate: '2028-03-01' }, { serviceId: fixtures.restaurantId, serviceType: 'restaurant' }, { recommendationRequestId: randomUUID(), recommendationSessionId: 'other-session' }]) {
        const before = await invariant(); const r = await create({ ...p, ...patch }, key); assert.equal(r.status, 409); assert.equal(r.body.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH'); assert.deepEqual(await invariant(), before);
      }
      const tk = randomUUID(); const tp = input('ticket', fixtures.ticketId); await success(tp, tk); const r = await create({ ...tp, quantity: 1 }, tk); assert.equal(r.body.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
    });
    await check('key scoped by user, cross-owner read/cancel and authentication protected', async () => {
      const key = randomUUID(); const p = input('hotel', fixtures.hotelId); const b = await success(p, key); const b2 = await success(p, key, other.token); assert.notEqual(b.id, b2.id);
      assert.equal((await api('GET', `/bookings/${b.id}`, undefined, other.token)).status, 404);
      assert.equal((await api('GET', `/bookings/${b.bookingCode}`, undefined, other.token)).status, 404);
      assert.equal((await api('POST', `/bookings/${b.id}/cancel`, {}, other.token)).status, 404);
      assert.equal((await api('POST', '/bookings', p)).status, 401);
      const mine = await api('GET', '/bookings/my', undefined, other.token); assert.ok(mine.body.data.every((x: any) => x.userId === other.user.id));
    });
    await check('same-key concurrent last seat: exactly one booking/history and consent-correct events', async () => {
      for (const type of ['tour', 'ticket'] as const) for (const analytics of [false, true]) {
        await consent(analytics);
        if (type === 'tour') await Tour.update({ availableCapacity: 1 }, { where: { id: fixtures.tourId } });
        else await Ticket.update({ availableSeats: 1 }, { where: { id: fixtures.ticketId } });
        const key = randomUUID(); const p = input(type, type === 'tour' ? fixtures.tourId : fixtures.ticketId);
        const rowsBefore = await Booking.count({ where: { userId: owner.user.id } });
        const r = await contend(type, [() => create(p, key), () => create(p, key)]);
        r.forEach(x => assert.equal(x.status, 201, JSON.stringify(x.body))); assert.equal(r[0].body.data.id, r[1].body.data.id); assert.equal(r[0].body.data.bookingCode, r[1].body.data.bookingCode);
        assert.equal(await Booking.count({ where: { userId: owner.user.id } }), rowsBefore + 1); await counts(r[0].body.data.id, analytics ? 1 : 0);
        assert.equal(type === 'tour' ? (await Tour.findByPk(fixtures.tourId))!.availableCapacity : (await Ticket.findByPk(fixtures.ticketId))!.availableSeats, 0);
      }
    });
    await check('different keys competing for final seat never oversell', async () => {
      for (const type of ['tour', 'ticket'] as const) {
        if (type === 'tour') await Tour.update({ availableCapacity: 1 }, { where: { id: fixtures.tourId } }); else await Ticket.update({ availableSeats: 1 }, { where: { id: fixtures.ticketId } });
        const p = input(type, type === 'tour' ? fixtures.tourId : fixtures.ticketId); const beforeCount = await Booking.count({ where: { userId: owner.user.id } });
        const r = await contend(type, [() => create(p), () => create(p)]); assert.deepEqual(r.map(x => x.status).sort(), [201, 409]); assert.equal(await Booking.count({ where: { userId: owner.user.id } }), beforeCount + 1);
        await counts(r.find(x => x.status === 201)!.body.data.id, 1);
        assert.equal(type === 'tour' ? (await Tour.findByPk(fixtures.tourId))!.availableCapacity : (await Ticket.findByPk(fixtures.ticketId))!.availableSeats, 0);
      }
    });
    await check('concurrent same-key different valid payload yields one success, one conflict', async () => {
      await Tour.update({ availableCapacity: 1 }, { where: { id: fixtures.tourId } }); const key = randomUUID();
      const r = await contend('tour', [() => create({ ...input(), notes: 'A' }, key), () => create({ ...input(), notes: 'B' }, key)]);
      assert.deepEqual(r.map(x => x.status).sort(), [201, 409]); assert.equal(r.find(x => x.status === 409)!.body.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH'); await counts(r.find(x => x.status === 201)!.body.data.id, 1);
    });
    await check('attribution validated, persisted, compared and replayed after expiry/suspension without extra telemetry', async () => {
      const a = await fixtures.attribution(owner.user.id); const p = { ...input('hotel', fixtures.hotelId), ...a }; const key = randomUUID();
      const b = await success(p, key); assert.equal(b.recommendationRequestId, a.recommendationRequestId); assert.equal(b.recommendationItemId, fixtures.hotelId);
      const event = await UserEvent.findOne({ where: { itemId: b.id, eventType: 'BOOKING_CREATED' } }); assert.equal(event?.requestId, a.recommendationRequestId); assert.equal(event?.personalizationAllowed, false); await counts(b.id, 1);
      await rejected({ ...p, recommendationSessionId: 'wrong-session' });
      assert.equal((await create({ ...p, recommendationSessionId: 'wrong-session' }, key)).body.code, 'IDEMPOTENCY_PAYLOAD_MISMATCH');
      assert.equal((await create(p, randomUUID(), other.token)).status, 400);
      await RecommendationRequest.update({ expiresAt: new Date(Date.now() - 1000) }, { where: { requestId: a.recommendationRequestId } }); await Business.update({ status: 'SUSPENDED' }, { where: { id: fixtures.businessId } });
      assert.deepEqual(await success(p, key), b); await counts(b.id, 1);
      await Business.update({ status: 'ACTIVE' }, { where: { id: fixtures.businessId } }); await consent(false);
      const a2 = await fixtures.attribution(owner.user.id); const b2 = await success({ ...input('hotel', fixtures.hotelId), ...a2 }); await counts(b2.id, 0); assert.equal(b2.recommendationRequestId, a2.recommendationRequestId);
    });
    await check('legacy fingerprint NULL returns explicit conflict without rewriting historical booking', async () => {
      const key = randomUUID(); const b = await success(input('hotel', fixtures.hotelId), key);
      await Booking.update({ requestFingerprint: null }, { where: { id: b.id } }); const before = await invariant();
      const r = await create(input('hotel', fixtures.hotelId), key); assert.equal(r.status, 409); assert.equal(r.body.code, 'LEGACY_IDEMPOTENCY_UNVERIFIABLE'); assert.deepEqual(await invariant(), before);
    });
    await check('failure after inventory/booking/history/event inserts rolls the entire transaction back', async () => {
      await consent(true); await Tour.update({ availableCapacity: 2 }, { where: { id: fixtures.tourId } });
      const original = TelemetryService.recordBookingEvent;
      let injected = false;
      TelemetryService.recordBookingEvent = async function (event) {
        await original.call(this, event);
        injected = true;
        throw new HttpError(503, 'T06 injected failure after event insert', 'T06_FAULT_INJECTION');
      };
      try { await rejected(input(), 503); assert.equal(injected, true); }
      finally { TelemetryService.recordBookingEvent = original; }
    });
    await check('concurrent cancel/reject restores inventory once and retains transitions, price and attribution', async () => {
      await consent(true);
      for (const type of ['tour', 'ticket'] as const) {
        if (type === 'tour') await Tour.update({ availableCapacity: 2 }, { where: { id: fixtures.tourId } }); else await Ticket.update({ availableSeats: 2 }, { where: { id: fixtures.ticketId } });
        const b = await success({ ...input(type, type === 'tour' ? fixtures.tourId : fixtures.ticketId), adultsCount: 2 });
        const results = await Promise.all([api('POST', `/bookings/${b.id}/cancel`, {}, owner.token), api('PATCH', `/bookings/${b.id}/status`, { status: 'REJECTED', reason: 'Fixture reject' }, admin.token)]);
        assert.deepEqual(results.map(x => x.status).sort(), [200, 409]);
        assert.equal(type === 'tour' ? (await Tour.findByPk(fixtures.tourId))!.availableCapacity : (await Ticket.findByPk(fixtures.ticketId))!.availableSeats, 2);
        assert.equal(await BookingStatusHistory.count({ where: { bookingId: b.id } }), 2); assert.equal(await AuditLog.count({ where: { entityId: b.id } }), 1);
        assert.equal((await api('POST', `/bookings/${b.id}/cancel`, {}, owner.token)).status, 409);
        const stored = (await Booking.findByPk(b.id))!; assert.equal(Number(stored.totalAmount), b.totalAmount); assert.equal(stored.quantity, 2);
        assert.equal(await UserEvent.count({ where: { itemId: b.id, eventType: 'BOOKING_CANCELLED' } }), stored.bookingStatus === 'CANCELLED' ? 1 : 0);
        // Exercise both terminal paths successfully, independently of who won the race.
        for (const target of ['CANCELLED', 'REJECTED']) {
          const next = await success({ ...input(type, type === 'tour' ? fixtures.tourId : fixtures.ticketId), adultsCount: 2 });
          if (target === 'CANCELLED') assert.equal((await api('PATCH', `/bookings/${next.id}/status`, { status: 'CONFIRMED' }, admin.token)).status, 200);
          const action = () => api('PATCH', `/bookings/${next.id}/status`, { status: target, reason: 'T06 fixture' }, admin.token);
          assert.equal((await action()).status, 200); const saved = await invariant(); assert.equal((await action()).status, 409); assert.deepEqual(await invariant(), saved);
          assert.equal(type === 'tour' ? (await Tour.findByPk(fixtures.tourId))!.availableCapacity : (await Ticket.findByPk(fixtures.ticketId))!.availableSeats, 2);
          assert.equal(await BookingStatusHistory.count({ where: { bookingId: next.id } }), target === 'CANCELLED' ? 3 : 2);
        }
      }
      const a = await fixtures.attribution(owner.user.id); const b = await success({ ...input('hotel', fixtures.hotelId), ...a });
      assert.equal((await api('PATCH', `/bookings/${b.id}/status`, { status: 'CONFIRMED' }, admin.token)).status, 200);
      assert.equal((await api('PATCH', `/bookings/${b.id}/status`, { status: 'COMPLETED' }, admin.token)).status, 200);
      assert.equal((await api('POST', `/bookings/${b.id}/cancel`, {}, owner.token)).status, 409);
      assert.equal((await Booking.findByPk(b.id))!.recommendationRequestId, a.recommendationRequestId);
    });
    console.log(JSON.stringify({ suite: 'booking-http-postgres', checks, result: 'PASS' }));
  } finally {
    await fixtures.cleanup();
    const after = await bookingFingerprint(); assert.deepEqual(after, before);
    console.log(JSON.stringify({ cleanup: 'PASS', fingerprint: 'UNCHANGED', before, after }));
    await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); await sequelize.close();
  }
}
main().catch(async e => { console.error(e); process.exitCode = 1; await sequelize.close(); });
