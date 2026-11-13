const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { sequelize, Business, Place, Tour, User, TripSession, Booking, BookingStatusHistory, UserEvent, AuditLog, TelemetryConsent, UserRole, RecommendationRequest } = require('../dist/models/index.js');
const { ENV } = require('../dist/config/env.js');
const { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } = require('../dist/utils/testDatabaseGuard.js');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
async function guard(purpose) {
  assert.equal(ENV.NODE_ENV, 'test'); assert.equal(ENV.DB_NAME, 'travelgo_ai_m0_test');
  assert.equal(ENV.DB_HOST, '127.0.0.1'); assert.equal(process.env.DB_SSL, 'false');
  assertTestDatabaseWriteOptIn(purpose); await assertDatabaseSentinel(sequelize, purpose);
}
async function schema() {
  await guard('T13-A preflight');
  const migrations = [];
  for (const name of fs.readdirSync(path.resolve(__dirname, '../../database/migrations')).filter(v => v.endsWith('.sql')).sort()) {
    const expected = createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../../database/migrations', name))).digest('hex');
    const [rows] = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:name', { replacements: { name } });
    assert.equal(rows[0]?.checksum, expected, name); migrations.push({ name, checksum: expected });
  }
  const [rows] = await sequelize.query('SELECT current_database() AS database, current_user AS username');
  return { nodeEnv: ENV.NODE_ENV, host: ENV.DB_HOST, ...rows[0], migrations, sentinel: 'PASS', writeOptIn: true };
}
class Fixtures {
  constructor(dir, name) {
    this.file = path.join(dir, name, 'ledger.json'); this.name = name;
    this.data = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file)) : {
      runId: process.env.T13A_RUN_ID, project: name, city: `T13A-${process.env.T13A_RUN_ID}-${name}`,
      businessId: randomUUID(), tourId: randomUUID(), hotelId: randomUUID(), restaurantId: randomUUID(),
      attractionIds: Array.from({ length: 4 }, () => randomUUID()), emails: [], users: [], trips: [], bookings: [], cleanup: 'PENDING',
    };
    this.save();
  }
  save() { write(this.file, this.data); }
  planEmail(label) { const email = `t13a.${this.data.runId.slice(-6)}.${this.name}.${label.slice(0, 10)}.${randomUUID().slice(0, 12)}@example.test`.toLowerCase(); assert.ok(email.split('@')[0].length <= 64); this.data.emails.push(email); this.save(); return email; }
  async create() {
    await guard('T13-A fixture create'); const d = this.data;
    d.cleanup = 'PENDING'; this.save();
    await Business.create({ id: d.businessId, name: `T13A TEST ONLY ${this.name}`, type: 'TOUR_OPERATOR', email: 't13a@example.test', phone: '0901234567', address: 'SYNTHETIC TEST FIXTURE - not a real business', city: d.city, status: 'ACTIVE' });
    await Tour.create({ id: d.tourId, businessId: d.businessId, title: `T13A TEST TOUR ${this.name}`, slug: `t13a-${d.tourId}`, destinationCity: d.city, departureCity: 'Hà Nội', durationDays: 2, durationNights: 1, category: 'culture', summary: 'SYNTHETIC TEST ONLY - price not a real offer', description: 'Fixture for browser/API/PostgreSQL acceptance', heroImage: d.image || '/vite.svg', priceVND: 100001, capacity: 30, availableCapacity: 30, status: 'APPROVED' });
    const entries = [...d.attractionIds.map((id, i) => [id, 'attraction', [100000, 300000, 50000, 0][i], i]), [d.hotelId, 'hotel', 600000, 4], [d.restaurantId, 'restaurant', 200000, 5]];
    // A local embedded fixture image avoids depending on a third-party image host.
    const image = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#075985"/><text x="15" y="90" fill="white">T13A SYNTHETIC TEST ONLY</text></svg>').toString('base64');
    await Tour.update({ heroImage: image }, { where: { id: d.tourId } });
    for (const [id, category, price, i] of entries) {
      await Place.create({ id, businessId: d.businessId, name: `T13A TEST ${category} ${i}`, slug: `t13a-${id}`, category, summary: 'SYNTHETIC TEST ONLY: artificial price and coordinates', description: 'Not a real destination, price quote or review', city: d.city, province: d.city, address: 'T13A synthetic address', latitude: 16.05 + i * 0.003, longitude: 108.20 + i * 0.002, priceFrom: price, rating: 4.5, reviewCount: 0, bayesianRating: 4.2, heroImage: image, galleryImages: [], highlights: [], amenities: [], status: 'APPROVED' });
    }
    d.fixturePrices = entries.map(([id, category, price]) => ({ id, category, price })); d.created = true; this.save();
  }
  async discover() {
    await guard('T13-A discover own fixture IDs'); const d = this.data;
    const users = d.emails.length ? await User.findAll({ where: { email: d.emails.map(v => v.toLowerCase()) }, attributes: ['id'] }) : [];
    d.users = [...new Set([...d.users, ...users.map(v => v.id)])];
    if (d.users.length) {
      d.trips = [...new Set([...d.trips, ...(await TripSession.findAll({ where: { userId: d.users }, attributes: ['id'] })).map(v => v.id)])];
      d.bookings = [...new Set([...d.bookings, ...(await Booking.findAll({ where: { userId: d.users }, attributes: ['id'] })).map(v => v.id)])];
    }
    this.save();
  }
  async cleanup() {
    await this.discover(); const d = this.data;
    await guard('T13-A explicit fixture cleanup');
    const captureDelete = async (model, where, key = 'id') => {
      const rows = await model.findAll({ where, attributes: [key] }); const ids = rows.map(v => v.get(key));
      d.cleanupIds ||= {}; d.cleanupIds[model.tableName] = ids; this.save();
      if (ids.length) await model.destroy({ where: { [key]: ids } });
    };
    if (d.users.length) {
      await captureDelete(UserEvent, { userId: d.users }); await captureDelete(AuditLog, { actorUserId: d.users });
      await captureDelete(RecommendationRequest, { userId: d.users }, 'requestId'); // child candidates/impressions cascade
      await captureDelete(TelemetryConsent, { userId: d.users }, 'userId');
    }
    if (d.bookings.length) { await captureDelete(BookingStatusHistory, { bookingId: d.bookings }); await Booking.destroy({ where: { id: d.bookings } }); }
    if (d.trips.length) await TripSession.destroy({ where: { id: d.trips } });
    await Tour.destroy({ where: { id: d.tourId } });
    await Place.destroy({ where: { id: [...d.attractionIds, d.hotelId, d.restaurantId] } });
    await Business.destroy({ where: { id: d.businessId } });
    if (d.users.length) { await captureDelete(UserRole, { userId: d.users }); await User.destroy({ where: { id: d.users } }); }
    assert.equal(await User.count({ where: { email: d.emails.map(v => v.toLowerCase()) } }), 0, 'No fixture account may remain');
    if (d.bookings.length) assert.equal(await Booking.count({ where: { id: d.bookings } }), 0);
    if (d.trips.length) assert.equal(await TripSession.count({ where: { id: d.trips } }), 0);
    d.cleanup = 'PASS'; this.save();
  }
}
module.exports = { guard, schema, Fixtures, sequelize, models: { Business, Place, Tour, User, TripSession, Booking, BookingStatusHistory, UserEvent }, write };
