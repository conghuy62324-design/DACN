import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { TripSession, User } from '../models/index.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from '../utils/testDatabaseGuard.js';

async function main() {
  assertTestDatabaseWriteOptIn('T04-A Trip PostgreSQL test');
  if (process.env.DB_NAME !== 'travelgo_ai_m0_test') throw new Error('T04-A only targets the existing travelgo_ai_m0_test database');
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'T04-A Trip PostgreSQL test');
  // Fail before any fixture writes if the additive metadata migration is absent/stale.
  const filename = '20261028_11_trip_planner_metadata.sql';
  const sql = await readFile(`../database/migrations/${filename}`, 'utf8');
  const [migration]: any = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename = :filename', { replacements: { filename } });
  assert.equal(migration[0]?.checksum, createHash('sha256').update(sql).digest('hex'), 'Apply migration 11 through the guarded runner before this test');
  const [column]: any = await sequelize.query("SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name='trip_sessions' AND column_name='planner_metadata'");
  assert.equal(column[0]?.data_type, 'jsonb');
  assert.equal(column[0]?.is_nullable, 'YES');

  const server = await new Promise<Server>((resolve) => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  const createdUsers: string[] = [];
  const api = async (method: string, path: string, body?: any, token?: string) => {
    const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() as any };
  };
  let checks = 0;
  try {
    const register = async () => {
      const result = await api('POST', '/api/auth/register', { email: `trip.${randomUUID()}@example.test`, fullName: 'Isolated Trip Test', password: randomBytes(24).toString('base64url') + '1a' });
      assert.equal(result.status, 201); createdUsers.push(result.body.data.user.id);
      return result.body.data as { token: string; user: { id: string } };
    };
    const owner = await register(); const other = await register();
    const placeId = randomUUID();
    const activity = { id: 'act-1', placeId, timeSlot: 'morning', category: 'sightseeing', title: 'Personal itinerary estimate', description: '', durationMinutes: 30, estimatedCostVND: 100, latitude: 16, longitude: 108 };
    const snapshot = {
      title: 'Isolated Trip Snapshot', destinationCity: 'Đà Nẵng', departureCity: 'Hà Nội', startDate: '2028-02-28', endDate: '2028-02-29', daysCount: 2,
      nightsCount: 1, adults: 2, children: 1, pacing: 'balanced', transportation: 'motorbike', costBasis: 'GROUP_VND_V1', costAssumptions: ['Group estimate only, not booking price'], preferences: [],
      totalBudgetUserVND: 1000, totalEstimatedCostVND: 1,
      days: [
        { dayNumber: 1, date: '2028-02-28', themeTitle: 'Day 1', activities: [activity], centroid: { latitude: 16, longitude: 108 }, lodgingNights: 1, lodgingEstimatedCostVND: 200, dayEstimatedCostVND: 1 },
        { dayNumber: 2, date: '2028-02-29', themeTitle: 'Day 2', activities: [], centroid: { latitude: 16, longitude: 108 }, lodgingNights: 0, lodgingEstimatedCostVND: 0, dayEstimatedCostVND: 0 },
      ],
    };
    const assertReopened = async (expected: any) => {
      const result = await api('GET', `/api/trips/${expected.id}`, undefined, owner.token);
      assert.equal(result.status, 200);
      const fields = ['title', 'startDate', 'endDate', 'daysCount', 'costBasis', 'nightsCount', 'costAssumptions', 'transportation', 'pacing', 'adults', 'children', 'preferences', 'days', 'selectedPlaceIds', 'totalBudgetUserVND', 'totalEstimatedCostVND', 'costDifferenceVND', 'budgetStatus'];
      for (const field of fields) assert.deepEqual(result.body.data[field], expected[field], `GET preserves ${field}`);
      const persisted = (await TripSession.findByPk(expected.id))!;
      assert.ok(persisted);
      assert.deepEqual(persisted.itinerary, expected.days);
      assert.deepEqual(persisted.selectedPlaceIds, expected.selectedPlaceIds);
      assert.equal(persisted.pacing, expected.pacing);
      assert.deepEqual(persisted.preferences, expected.preferences);
      assert.equal(persisted.name, expected.title);
      assert.equal(Number(persisted.estimatedCostVND), expected.totalEstimatedCostVND);
      assert.equal(Number(persisted.totalBudgetVND), expected.totalBudgetUserVND);
      for (const field of ['costBasis', 'nightsCount', 'costAssumptions', 'transportation', 'adults', 'children']) {
        assert.deepEqual(persisted.plannerMetadata?.[field], expected[field], `DB preserves ${field}`);
      }
      assert.equal(expected.costBasis, 'GROUP_VND_V1');
      assert.equal(expected.nightsCount, expected.daysCount - 1);
      const ids = [...new Set(expected.days.flatMap((day: any) => day.activities.map((item: any) => item.placeId).filter(Boolean)))];
      assert.deepEqual(expected.selectedPlaceIds, ids);
      const dayCents = expected.days.map((day: any) => {
        const cents = day.activities.reduce((total: number, item: any) => total + Math.round(item.estimatedCostVND * 100), 0) + Math.round(day.lodgingEstimatedCostVND * 100);
        assert.equal(day.dayEstimatedCostVND, cents / 100);
        return cents;
      });
      assert.equal(expected.totalEstimatedCostVND, dayCents.reduce((a: number, b: number) => a + b, 0) / 100);
    };
    const saved = await api('POST', '/api/trips', { itinerary: snapshot }, owner.token);
    assert.equal(saved.status, 201); const id = saved.body.data.id;
    const row = await TripSession.findByPk(id);
    assert.equal(row?.plannerMetadata?.costBasis, 'GROUP_VND_V1');
    assert.equal(row?.plannerMetadata?.transportation, 'motorbike');
    assert.equal(row?.plannerMetadata?.adults, 2);
    assert.equal(saved.body.data.costBasis, snapshot.costBasis);
    assert.equal(saved.body.data.pacing, snapshot.pacing);
    assert.equal(saved.body.data.transportation, snapshot.transportation);
    assert.equal(Number(row?.estimatedCostVND), 300); checks++;
    const reopened = await api('GET', `/api/trips/${id}`, undefined, owner.token);
    assert.equal(reopened.status, 200);
    assert.deepEqual(reopened.body.data.costAssumptions, snapshot.costAssumptions);
    assert.equal(reopened.body.data.nightsCount, 1);
    assert.equal(reopened.body.data.days[0].dayEstimatedCostVND, 300);
    assert.deepEqual(reopened.body.data.selectedPlaceIds, [placeId]);
    await assertReopened(reopened.body.data); checks++;
    const renamed = await api('PUT', `/api/trips/${id}`, { title: 'Renamed', preferences: ['van-hoa'] }, owner.token);
    assert.equal(renamed.status, 200);
    assert.deepEqual(renamed.body.data.days, reopened.body.data.days);
    assert.deepEqual(renamed.body.data.costAssumptions, snapshot.costAssumptions);
    assert.equal(renamed.body.data.totalEstimatedCostVND, 300);
    for (const field of ['costBasis', 'nightsCount', 'transportation', 'pacing', 'adults', 'children', 'selectedPlaceIds']) {
      assert.deepEqual(renamed.body.data[field], reopened.body.data[field]);
    }
    await assertReopened(renamed.body.data); checks++;
    const reordered = structuredClone(snapshot.days);
    const addedId = randomUUID();
    reordered[0].activities.push({ ...activity, id: 'act-added', placeId: addedId, estimatedCostVND: 50 });
    reordered[0].activities.push({ ...activity, id: 'act-duplicate-place', estimatedCostVND: 0 });
    reordered[0].activities.reverse();
    const reorderedResult = await api('PUT', `/api/trips/${id}`, { days: reordered }, owner.token);
    assert.equal(reorderedResult.status, 200);
    assert.deepEqual(reorderedResult.body.data.selectedPlaceIds, [placeId, addedId]);
    assert.equal(reorderedResult.body.data.totalEstimatedCostVND, 350);
    assert.equal(reorderedResult.body.data.days[0].lodgingEstimatedCostVND, 200);
    await assertReopened(reorderedResult.body.data); checks++;
    const edited = structuredClone(snapshot.days); edited[0].activities = [];
    const updated = await api('PUT', `/api/trips/${id}`, { days: edited }, owner.token);
    assert.equal(updated.status, 200);
    assert.deepEqual(updated.body.data.selectedPlaceIds, []);
    assert.equal(updated.body.data.totalEstimatedCostVND, 200);
    assert.equal(updated.body.data.days[0].lodgingNights, 1);
    assert.equal(updated.body.data.days[0].lodgingEstimatedCostVND, 200);
    assert.equal(Number((await TripSession.findByPk(id))?.estimatedCostVND), 200);
    await assertReopened(updated.body.data); checks++;
    const fractional = structuredClone(edited);
    fractional[0].lodgingEstimatedCostVND = 0.2;
    fractional[0].activities = [{ ...activity, placeId: undefined, estimatedCostVND: 0.1 }];
    const cents = await api('PUT', `/api/trips/${id}`, { days: fractional, totalBudgetUserVND: 0.6 }, owner.token);
    assert.equal(cents.status, 200);
    assert.equal(cents.body.data.totalEstimatedCostVND, 0.3);
    assert.equal(cents.body.data.costDifferenceVND, 0.3);
    assert.equal(Number((await TripSession.findByPk(id))?.estimatedCostVND), 0.3);
    await assertReopened(cents.body.data); checks++;
    const before = (await TripSession.findByPk(id))!.toJSON();
    const invalid = structuredClone(edited); (invalid[0] as any).activities = [{ ...activity, latitude: 100 }];
    assert.equal((await api('PUT', `/api/trips/${id}`, { title: 'Must not persist', days: invalid }, owner.token)).status, 400);
    assert.deepEqual((await TripSession.findByPk(id))!.toJSON(), before); checks++;
    assert.equal((await api('POST', '/api/trips', { itinerary: { ...snapshot, costAssumptions: Array(20).fill('ế'.repeat(1000)) } }, owner.token)).status, 400);
    assert.equal(await TripSession.count({ where: { userId: owner.user.id } }), 1);
    assert.equal((await api('GET', `/api/trips/${id}`, undefined, other.token)).status, 404);
    assert.equal((await api('PUT', `/api/trips/${id}`, { title: 'Not owner' }, other.token)).status, 404);
    assert.equal((await api('POST', '/api/trips', { itinerary: snapshot, userId: other.user.id }, owner.token)).status, 400); checks++;
    const singleDay = structuredClone(snapshot);
    singleDay.endDate = singleDay.startDate;
    singleDay.daysCount = 1; singleDay.nightsCount = 0;
    singleDay.days = [singleDay.days[0]];
    singleDay.days[0].lodgingNights = 0; singleDay.days[0].lodgingEstimatedCostVND = 0;
    const singleSaved = await api('POST', '/api/trips', { itinerary: singleDay }, owner.token);
    assert.equal(singleSaved.status, 201);
    assert.equal(singleSaved.body.data.nightsCount, 0);
    assert.equal(singleSaved.body.data.totalEstimatedCostVND, 100);
    await assertReopened(singleSaved.body.data); checks++;
    const threeDays = structuredClone(snapshot);
    threeDays.endDate = '2028-03-01'; threeDays.daysCount = 3; threeDays.nightsCount = 2;
    threeDays.days[1].lodgingNights = 1; threeDays.days[1].lodgingEstimatedCostVND = 125;
    threeDays.days[1].activities = [{ ...activity, id: 'hotel-marker', category: 'hotel', placeId: randomUUID(), estimatedCostVND: 0 }];
    threeDays.days.push({ ...structuredClone(snapshot.days[1]), dayNumber: 3, date: '2028-03-01', themeTitle: 'Day 3' });
    const threeSaved = await api('POST', '/api/trips', { itinerary: threeDays }, owner.token);
    assert.equal(threeSaved.status, 201);
    assert.equal(threeSaved.body.data.nightsCount, 2);
    assert.equal(threeSaved.body.data.totalEstimatedCostVND, 425);
    assert.deepEqual(threeSaved.body.data.days.map((day: any) => day.lodgingNights), [1, 1, 0]);
    await assertReopened(threeSaved.body.data); checks++;
    // T11-B: current amounts win over stale client warnings at save/edit/reopen.
    for (const budget of [100, 300, 301]) {
      const draft: any = structuredClone(snapshot);
      draft.totalBudgetUserVND = budget;
      draft.budgetStatus = 'within_budget'; draft.overBudgetVND = 0; draft.constraintViolations = [];
      draft.days[0].activities[0].costSource = 'Synthetic catalog estimate; unit assumption, not verified';
      draft.days[0].lodgingCostSource = 'Synthetic one-room group/night assumption';
      const created = await api('POST', '/api/trips', { itinerary: draft }, owner.token);
      assert.equal(created.status, 201);
      const current = created.body.data;
      assert.equal(current.totalEstimatedCostVND, 300);
      assert.equal(current.overBudgetVND, Math.max(0, 300 - budget));
      assert.equal(current.budgetStatus, budget < 300 ? 'over_budget' : 'within_budget');
      assert.deepEqual(current.constraintViolations, budget < 300 ? ['BUDGET_EXCEEDED'] : []);
      await assertReopened(current); checks++;
      if (budget === 301) {
        const changed = structuredClone(current.days);
        changed[0].activities[0].estimatedCostVND = 500;
        const over = await api('PUT', `/api/trips/${current.id}`, { days: changed }, owner.token);
        assert.equal(over.status, 200);
        assert.equal(over.body.data.totalEstimatedCostVND, 700);
        assert.equal(over.body.data.overBudgetVND, 399);
        assert.equal(over.body.data.budgetStatus, 'over_budget');
        assert.deepEqual(over.body.data.constraintViolations, ['BUDGET_EXCEEDED']);
        await assertReopened(over.body.data); checks++;
        changed[0].activities[0].estimatedCostVND = 0;
        const within = await api('PUT', `/api/trips/${current.id}`, { days: changed }, owner.token);
        assert.equal(within.status, 200);
        assert.equal(within.body.data.totalEstimatedCostVND, 200);
        assert.equal(within.body.data.overBudgetVND, 0);
        assert.equal(within.body.data.budgetStatus, 'within_budget');
        assert.deepEqual(within.body.data.constraintViolations, []);
        assert.equal(within.body.data.days[0].activities[0].costSource, draft.days[0].activities[0].costSource);
        assert.equal(within.body.data.days[0].lodgingCostSource, draft.days[0].lodgingCostSource);
        await assertReopened(within.body.data); checks++;
      }
    }
    // Only this test's new row is made legacy; no preexisting fixtures are edited.
    await row!.update({ plannerMetadata: null, pacing: 'packed', estimatedCostVND: 777 });
    const legacy = await api('GET', `/api/trips/${id}`, undefined, owner.token);
    assert.equal(legacy.body.data.costBasis, undefined);
    assert.equal(legacy.body.data.totalEstimatedCostVND, 777);
    assert.equal(legacy.body.data.pacing, 'packed');
    assert.equal((await api('PUT', `/api/trips/${id}`, { days: edited }, owner.token)).status, 422);
    assert.equal(Number((await TripSession.findByPk(id))?.estimatedCostVND), 777); checks++;
    console.log(JSON.stringify({ suite: 'trip-snapshot-postgres', checks, result: 'PASS', database: process.env.DB_NAME }));
  } finally {
    try {
      assertTestDatabaseWriteOptIn('T04-A owned fixture cleanup');
      await assertDatabaseSentinel(sequelize, 'T04-A owned fixture cleanup');
      for (const userId of createdUsers) { await TripSession.destroy({ where: { userId } }); await User.destroy({ where: { id: userId } }); }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await sequelize.close();
    }
  }
}
main().catch(async (error) => { console.error('Trip PostgreSQL test failed:', error.message); process.exitCode = 1; await sequelize.close(); });
