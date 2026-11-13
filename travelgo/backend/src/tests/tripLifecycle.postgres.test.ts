import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { TripSession, User } from '../models/index.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from '../utils/testDatabaseGuard.js';

async function main() {
  assertTestDatabaseWriteOptIn('T04-B PostgreSQL fixtures');
  assert.equal(process.env.DB_NAME, 'travelgo_ai_m0_test');
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'T04-B PostgreSQL fixtures');
  const filename = '20261028_11_trip_planner_metadata.sql';
  const [m]: any = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename', { replacements: { filename } });
  assert.equal(m[0]?.checksum, createHash('sha256').update(await readFile(`../database/migrations/${filename}`)).digest('hex'));
  const server = await new Promise<Server>((resolve) => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}/api`;
  const users: string[] = [];
  const api = async (method: string, route: string, body?: any, token?: string) => {
    const res = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() as any };
  };
  let checks = 0;
  const check = async (label: string, run: () => Promise<void>) => { await run(); checks++; console.log(`PASS ${label}`); };
  try {
    const register = async () => {
      const r = await api('POST', '/auth/register', { email: `lifecycle.${randomUUID()}@example.test`, fullName: 'Lifecycle Fixture', password: randomBytes(24).toString('base64url') + '1a' });
      assert.equal(r.status, 201); users.push(r.body.data.user.id); return r.body.data;
    };
    const owner = await register(); const other = await register();
    const placeId = randomUUID();
    const a = { id: 'a', placeId, title: 'Place A', description: '', category: 'sightseeing', timeSlot: 'morning', durationMinutes: 30, latitude: 16, longitude: 108, estimatedCostVND: 100 };
    const b = { ...a, id: 'b', placeId: undefined, title: 'Custom lunch', category: 'food', estimatedCostVND: 25 };
    const snapshot = { title: 'Lifecycle Trip', destinationCity: 'Đà Nẵng', departureCity: 'Hà Nội', startDate: '2028-02-28', endDate: '2028-02-29', daysCount: 2, nightsCount: 1,
      adults: 2, children: 1, pacing: 'balanced', transportation: 'motorbike', costBasis: 'GROUP_VND_V1', costAssumptions: ['Group estimate only'], preferences: [], totalBudgetUserVND: 1000, totalEstimatedCostVND: 325,
      days: [
        { dayNumber: 1, date: '2028-02-28', themeTitle: 'Day 1', centroid: { latitude: 16, longitude: 108 }, activities: [a, b], lodgingNights: 1, lodgingEstimatedCostVND: 200, dayEstimatedCostVND: 325 },
        { dayNumber: 2, date: '2028-02-29', themeTitle: 'Day 2', centroid: { latitude: 16, longitude: 108 }, activities: [], lodgingNights: 0, lodgingEstimatedCostVND: 0, dayEstimatedCostVND: 0 },
      ] };
    const create = async (input: any = snapshot) => { const r = await api('POST', '/trips', { itinerary: input }, owner.token); assert.equal(r.status, 201); return r.body.data; };
    const read = async (id: string) => { const r = await api('GET', `/trips/${id}`, undefined, owner.token); assert.equal(r.status, 200); return r.body.data; };
    const action = (id: string, name: string, body?: any, token = owner.token) => api('POST', `/trips/${id}/${name}`, body, token);
    const row = async (id: string) => (await TripSession.findByPk(id))!.toJSON();
    const invariant = async (id: string, expectedStatus: string, expectedProgress: number) => {
      const r = await read(id); const db = await row(id);
      assert.equal(r.status, expectedStatus); assert.equal(db.status, expectedStatus);
      assert.equal(r.progressPercent, expectedProgress); assert.equal(db.progressPercent, expectedProgress);
      assert.equal(r.costBasis, 'GROUP_VND_V1'); assert.equal(r.transportation, 'motorbike'); assert.equal(r.nightsCount, 1);
      assert.deepEqual(r.costAssumptions, snapshot.costAssumptions);
      assert.deepEqual(r.days, db.itinerary); assert.deepEqual(r.selectedPlaceIds, db.selectedPlaceIds);
      assert.equal(r.totalEstimatedCostVND, Number(db.estimatedCostVND));
      return r;
    };
    // Hold the same row externally, wait until BOTH HTTP requests are blocked in PostgreSQL,
    // then release. This observes real lock contention rather than merely Promise.all timing.
    const contend = async (id: string, requests: (() => Promise<any>)[]) => {
      const tx = await sequelize.transaction(); let pending: Promise<any>[] = [];
      try {
        await TripSession.findByPk(id, { transaction: tx, lock: tx.LOCK.UPDATE });
        pending = requests.map((run) => run());
        let blocked = 0; const end = Date.now() + 10000;
        while (Date.now() < end) {
          const [r]: any = await sequelize.query("SELECT count(*)::integer AS count FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND query LIKE '%trip_sessions%' AND pid<>pg_backend_pid()");
          blocked = r[0].count; if (blocked >= requests.length) break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        assert.ok(blocked >= requests.length, 'Both requests must wait on the owned Trip row');
        console.log(JSON.stringify({ concurrencyWitness: 'PostgreSQL row lock', blockedRequests: blocked }));
      } finally { await tx.commit(); }
      return Promise.all(pending);
    };

    await check('Start endpoint, ownership, invalid transitions and exact retry', async () => {
      const t = await create();
      assert.equal((await action(t.id, 'complete')).status, 409);
      assert.equal((await action(t.id, 'checkin', { activityId: 'a' })).status, 409);
      for (const name of ['start', 'complete', 'checkin']) assert.equal((await action(t.id, name, name === 'checkin' ? { activityId: 'a' } : undefined, other.token)).status, 404);
      assert.equal((await action(t.id, 'start')).status, 200);
      const before = await row(t.id); assert.equal((await action(t.id, 'start')).status, 200); assert.deepEqual(await row(t.id), before);
      assert.equal((await action('invalid-uuid', 'start')).status, 400);
      await invariant(t.id, 'active', 0);
    });
    await check('generic update rejects lifecycle fields atomically', async () => {
      const t = await create(); const before = await row(t.id);
      for (const patch of [{ status: 'active' }, { progressPercent: 100 }, { checkins: [] }]) {
        assert.equal((await api('PUT', `/trips/${t.id}`, { title: 'Must not save', ...patch }, owner.token)).status, 400);
        assert.deepEqual(await row(t.id), before);
      }
    });
    await check('membership and body/geo/notes validation never partially writes', async () => {
      const t = await create(); await action(t.id, 'start'); const before = await row(t.id);
      for (const payload of [null, [], {}, { activityId: 'outside' }, { placeId: randomUUID() }, { activityId: 'a', placeId }, { activityId: 'a', notes: 1 }, { activityId: 'a', notes: 'x'.repeat(5001) },
        { activityId: 'a', geo: null }, { activityId: 'a', geo: { latitude: 91, longitude: 108 } }, { activityId: 'a', geo: { latitude: 16, longitude: -181 } },
        { activityId: 'a', geo: { latitude: '16', longitude: 108 } }, { activityId: 'a', geo: { latitude: 16, longitude: 108, accuracyMeters: -1 } }, { activityId: 'a', verifiedViaGeo: true }]) {
        assert.equal((await action(t.id, 'checkin', payload)).status, 400); assert.deepEqual(await row(t.id), before);
      }
    });
    await check('manual custom check-in, authoritative title and exact retry', async () => {
      const t = await create(); await action(t.id, 'start');
      const r = await action(t.id, 'checkin', { activityId: 'b', placeName: 'Forged title', notes: 'First note' }); assert.equal(r.status, 200);
      assert.equal(r.body.checkin.placeName, 'Custom lunch'); assert.equal(r.body.checkin.placeId, undefined);
      assert.equal(r.body.checkin.hasAttachedLocation, false);
      const before = await row(t.id);
      assert.equal((await action(t.id, 'checkin', { activityId: 'b', notes: 'Retry replacement' })).status, 200);
      assert.deepEqual(await row(t.id), before); await invariant(t.id, 'active', 50);
    });
    await check('attached location is not a verification claim', async () => {
      const t = await create(); await action(t.id, 'start');
      const r = await action(t.id, 'checkin', { activityId: 'a', geo: { latitude: 0, longitude: 0, accuracyMeters: 0 } });
      assert.equal(r.status, 200); assert.equal(r.body.checkin.verifiedViaGeo, false); assert.equal(r.body.checkin.hasAttachedLocation, true);
      assert.equal((await read(t.id)).checkins[0].accuracyMeters, 0);
    });
    await check('Place compatibility requires one occurrence; explicit activity does not mark both', async () => {
      const duplicate = structuredClone(snapshot); duplicate.days[0].activities = [a, { ...a, id: 'a-second' }];
      const t = await create(duplicate); await action(t.id, 'start');
      assert.equal((await action(t.id, 'checkin', { placeId, placeName: 'client' })).status, 409);
      assert.equal((await action(t.id, 'checkin', { activityId: 'a-second' })).status, 200);
      assert.deepEqual((await invariant(t.id, 'active', 50)).progress.checkedActivityIds, ['a-second']);
      const unique = await create(); await action(unique.id, 'start');
      const r = await action(unique.id, 'checkin', { placeId, placeName: 'client' }); assert.equal(r.status, 200); assert.equal(r.body.checkin.activityId, 'a');
    });
    await check('reorder, remove, reference change and empty itinerary retain history correctly', async () => {
      const t = await create(); await action(t.id, 'start'); await action(t.id, 'checkin', { activityId: 'a' });
      const originalHistory = (await row(t.id)).checkins;
      const days = structuredClone(snapshot.days); days[0].activities.reverse();
      assert.equal((await api('PUT', `/trips/${t.id}`, { days }, owner.token)).status, 200);
      assert.deepEqual((await row(t.id)).checkins, originalHistory); await invariant(t.id, 'active', 50);
      days[0].activities = [b];
      assert.equal((await api('PUT', `/trips/${t.id}`, { days }, owner.token)).status, 200);
      let r = await invariant(t.id, 'active', 0); assert.equal(r.checkins.length, 1); assert.equal(r.checkins[0].excludedFromProgress, 'activity_removed'); assert.equal(r.totalEstimatedCostVND, 225);
      days[0].activities = [a, b]; await api('PUT', `/trips/${t.id}`, { days }, owner.token);
      await invariant(t.id, 'active', 0); // No resurrection by reusing an ID.
      await action(t.id, 'checkin', { activityId: 'a' });
      days[0].activities[0] = { ...a, placeId: randomUUID() }; await api('PUT', `/trips/${t.id}`, { days }, owner.token);
      r = await invariant(t.id, 'active', 0); assert.equal(r.checkins[1].excludedFromProgress, 'activity_reference_changed');
      days[0].activities = []; await api('PUT', `/trips/${t.id}`, { days }, owner.token);
      r = await invariant(t.id, 'active', 0); assert.equal(r.progress.eligibleActivityIds.length, 0); assert.equal(r.checkins.length, 2); assert.equal(r.totalEstimatedCostVND, 200);
    });
    await check('Complete incomplete Trip, retry and forbidden closed-state changes', async () => {
      const t = await create(); await action(t.id, 'start'); await action(t.id, 'checkin', { activityId: 'a' });
      assert.equal((await action(t.id, 'complete')).status, 200); await invariant(t.id, 'completed', 50);
      const before = await row(t.id);
      assert.equal((await action(t.id, 'complete')).status, 200);
      assert.equal((await action(t.id, 'checkin', { activityId: 'a' })).status, 200);
      assert.equal((await action(t.id, 'start')).status, 409);
      assert.equal((await action(t.id, 'checkin', { activityId: 'b' })).status, 409);
      assert.deepEqual(await row(t.id), before);
      const cancelled = await create(); await TripSession.update({ status: 'cancelled' }, { where: { id: cancelled.id, userId: owner.user.id } });
      for (const name of ['start', 'complete', 'checkin']) assert.equal((await action(cancelled.id, name, name === 'checkin' ? { activityId: 'a' } : undefined)).status, 409);
    });
    await check('legacy unique/ambiguous mapping is read-only and preserves money', async () => {
      const t = await create();
      const history = [{ placeId, placeName: 'Old name', checkedInAt: '2025-01-01T00:00:00Z', verifiedViaGeo: true }];
      await TripSession.update({ plannerMetadata: null, pacing: 'packed', estimatedCostVND: 777, checkins: history, progressPercent: 100 }, { where: { id: t.id, userId: owner.user.id } });
      const before = await row(t.id); const unique = await read(t.id);
      assert.equal(unique.costBasis, undefined); assert.equal(unique.totalEstimatedCostVND, 777); assert.equal(unique.progressPercent, 50); assert.equal(unique.checkins[0].hasAttachedLocation, false);
      assert.deepEqual(await row(t.id), before);
      const days = structuredClone(snapshot.days); days[0].activities = [a, { ...a, id: 'second' }];
      await TripSession.update({ itinerary: days }, { where: { id: t.id, userId: owner.user.id } });
      const ambiguousBefore = await row(t.id); const ambiguous = await read(t.id);
      assert.equal(ambiguous.progressPercent, 0); assert.equal(ambiguous.progress.unmatchedCheckinCount, 1); assert.deepEqual(await row(t.id), ambiguousBefore);
      assert.equal((await api('PUT', `/trips/${t.id}`, { days: snapshot.days }, owner.token)).status, 422);
      await action(t.id, 'start'); assert.equal((await action(t.id, 'checkin', { placeId })).status, 409);
      const checked = await action(t.id, 'checkin', { activityId: 'a' }); assert.equal(checked.status, 200);
      assert.equal(checked.body.trip.checkins.length, 2); assert.equal(checked.body.trip.totalEstimatedCostVND, 777); assert.equal(checked.body.trip.costBasis, undefined);
    });
    await check('concurrent different activity check-ins cannot lose updates', async () => {
      const t = await create(); await action(t.id, 'start');
      const results = await contend(t.id, [() => action(t.id, 'checkin', { activityId: 'a' }), () => action(t.id, 'checkin', { activityId: 'b' })]);
      results.forEach((r) => assert.equal(r.status, 200));
      const r = await invariant(t.id, 'active', 100); assert.equal(r.checkins.length, 2);
    });
    await check('concurrent retry creates one check-in only', async () => {
      const t = await create(); await action(t.id, 'start');
      const results = await contend(t.id, [() => action(t.id, 'checkin', { activityId: 'a' }), () => action(t.id, 'checkin', { activityId: 'a' })]);
      results.forEach((r) => assert.equal(r.status, 200)); assert.deepEqual(results[0].body.checkin.checkedInAt, results[1].body.checkin.checkedInAt);
      assert.equal((await invariant(t.id, 'active', 50)).checkins.length, 1);
    });
    await check('concurrent check-in and delete serialize consistently', async () => {
      const t = await create(); await action(t.id, 'start'); const days = structuredClone(snapshot.days); days[0].activities = [b];
      const [checked, edited] = await contend(t.id, [() => action(t.id, 'checkin', { activityId: 'a' }), () => api('PUT', `/trips/${t.id}`, { days }, owner.token)]);
      assert.ok([200, 400].includes(checked.status)); assert.equal(edited.status, 200);
      const r = await invariant(t.id, 'active', 0); assert.deepEqual(r.selectedPlaceIds, []); assert.equal(r.totalEstimatedCostVND, 225);
      assert.equal(r.checkins.length, checked.status === 200 ? 1 : 0);
      if (r.checkins.length) assert.equal(r.checkins[0].excludedFromProgress, 'activity_removed');
    });
    console.log(JSON.stringify({ suite: 'trip-lifecycle-postgres', checks, result: 'PASS', database: process.env.DB_NAME }));
  } finally {
    try {
      assertTestDatabaseWriteOptIn('T04-B owned fixture cleanup'); await assertDatabaseSentinel(sequelize, 'T04-B owned fixture cleanup');
      for (const userId of users) { await TripSession.destroy({ where: { userId } }); await User.destroy({ where: { id: userId } }); }
    } finally { await new Promise<void>((resolve) => server.close(() => resolve())); await sequelize.close(); }
  }
}
main().catch(async (error) => { console.error('T04-B PostgreSQL failure:', error.message); process.exitCode = 1; await sequelize.close(); });
