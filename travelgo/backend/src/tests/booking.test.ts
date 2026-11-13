import assert from 'node:assert/strict';
import { sequelize } from '../config/database.js';
import { Booking, BookingStatusHistory, Business, Tour, User } from '../models/index.js';
import { BookingService } from '../services/bookingService.js';
import { TelemetryService } from '../services/telemetryService.js';
import { validateSecureBookingRequest } from '../validators/validators.js';
import { bookingRequestFingerprint, normalizeBookingPayload } from '../utils/bookingValidation.js';

const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const serviceId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const payload = { serviceType: 'tour' as const, serviceId, bookingDate: '2028-02-29', adultsCount: 1, childrenCount: 0, customerPhone: '0901234567' };
const validate = (body: any) => {
  let status = 200;
  validateSecureBookingRequest({ body, header: () => undefined } as any, { status(n: number) { status = n; return this; }, json() { return this; } } as any, () => {});
  return status;
};

async function main() {
  let passed = 0; let failed = 0; let writes = 0;
  const originals = [sequelize.transaction, sequelize.query, Booking.findOne, User.findByPk, Tour.findByPk, Business.findByPk, Booking.create, BookingStatusHistory.create, TelemetryService.recordBookingEvent];
  (sequelize.transaction as any) = async (options: any, callback?: any) => (callback ?? options)({ LOCK: { UPDATE: 'UPDATE', SHARE: 'SHARE' } });
  (sequelize.query as any) = async () => [];
  (User.findByPk as any) = async () => ({ id: userId, fullName: 'Unit', email: 'unit@example.test' });
  (Tour.findByPk as any) = async () => ({ id: serviceId, businessId: serviceId, status: 'APPROVED', title: 'Tour', priceVND: 100, availableCapacity: 10, update: async () => { writes++; } });
  (Business.findByPk as any) = async () => ({ status: 'SUSPENDED' });
  (Booking.create as any) = async (input: any) => { writes++; return { id: serviceId, ...input }; };
  (BookingStatusHistory.create as any) = async () => { writes++; };
  (TelemetryService.recordBookingEvent as any) = async () => { writes++; };
  let existing: any = null;
  (Booking.findOne as any) = async () => existing;
  const check = async (name: string, run: () => any) => { writes = 0; existing = null; try { await run(); passed++; console.log(`PASS ${name}`); } catch (e: any) { failed++; console.error(`FAIL ${name}: ${e.message}`); } };
  try {
    await check('zero adults rejected at request boundary', () => assert.equal(validate({ ...payload, adultsCount: 0, childrenCount: 1 }), 400));
    await check('calendar overflow and timestamp rejected', () => { for (const bookingDate of ['2028-02-30', '2028-02-29T12:00:00Z']) assert.equal(validate({ ...payload, bookingDate }), 400); });
    await check('reversed return date rejected', () => assert.equal(validate({ ...payload, returnDate: '2028-02-28' }), 400));
    await check('unsafe/coerced/excessive counts rejected', () => { for (const adultsCount of [Number.MAX_SAFE_INTEGER + 1, '2', true, 101]) assert.equal(validate({ ...payload, adultsCount }), 400); });
    await check('tour quantity cannot override priced units', () => assert.equal(validate({ ...payload, quantity: 4 }), 400));
    await check('suspended business rejected before effects', async () => { await assert.rejects(() => BookingService.createBooking(userId, payload), (e: any) => e.statusCode === 409); assert.equal(writes, 0); });
    await check('same key with changed payload conflicts', async () => {
      existing = { id: serviceId, userId, requestFingerprint: 'different', unitPrice: 100, totalAmount: 100 };
      await assert.rejects(() => BookingService.createBooking(userId, { ...payload, notes: 'changed' }, 'unit-key'), (e: any) => e.code === 'IDEMPOTENCY_PAYLOAD_MISMATCH'); assert.equal(writes, 0);
    });
    await check('direct service callers cannot bypass count validation', async () => {
      for (const adultsCount of [0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER, '1', null]) {
        await assert.rejects(() => BookingService.createBooking(userId, { ...payload, adultsCount } as any), (e: any) => e.statusCode === 400);
      }
      assert.equal(writes, 0);
    });
    await check('defaults only for absent children; zero and null quantity never default', () => {
      const p: any = { ...payload }; delete p.childrenCount;
      assert.equal(normalizeBookingPayload(p).childrenCount, 0);
      for (const quantity of [0, null, NaN, Infinity]) assert.equal(validate({ ...payload, serviceType: 'ticket', quantity }), 400);
      for (const field of ['adultsCount', 'childrenCount']) assert.equal(validate({ ...payload, [field]: null }), 400);
    });
    await check('canonical fingerprint covers dates, notes, phone, counts, quantity mode and attribution', () => {
      const canonical = normalizeBookingPayload(payload); const hash = bookingRequestFingerprint(canonical);
      assert.equal(hash, bookingRequestFingerprint(normalizeBookingPayload({ ...payload, serviceId: serviceId.toUpperCase(), customerPhone: ' 0901234567 ', notes: ' ' })));
      for (const patch of [{ adultsCount: 2 }, { childrenCount: 1 }, { returnDate: '2028-03-01' }, { bookingDate: '2028-03-01' }, { notes: 'A' }, { customerPhone: '0907654321' }, { serviceType: 'ticket', quantity: 1 }, { recommendationRequestId: serviceId, recommendationSessionId: 'session-first' }]) {
        assert.notEqual(hash, bookingRequestFingerprint(normalizeBookingPayload({ ...payload, ...patch })));
      }
    });
    await check('real calendar leap days valid, malformed dates and excessive combined guests invalid', () => {
      assert.equal(validate(payload), 200);
      for (const bookingDate of ['2027-02-29', '2028-04-31', '0000-01-01', '2028-2-29', 'not-date']) assert.equal(validate({ ...payload, bookingDate }), 400);
      assert.equal(validate({ ...payload, adultsCount: 100, childrenCount: 1 }), 400);
    });
  } finally {
    [sequelize.transaction, sequelize.query, Booking.findOne, User.findByPk, Tour.findByPk, Business.findByPk, Booking.create, BookingStatusHistory.create, TelemetryService.recordBookingEvent] = originals as any;
    await sequelize.close();
  }
  console.log(JSON.stringify({ suite: 'booking-unit', passed, failed, database: 'NOT USED', persistenceEvidence: false }));
  if (failed) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
