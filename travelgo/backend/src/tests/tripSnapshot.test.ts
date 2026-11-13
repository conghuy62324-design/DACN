import assert from 'node:assert/strict';
import { sequelize } from '../config/database.js';
import { TripSession } from '../models/TripSession.js';
import { TripRepository } from '../repositories/tripRepository.js';
import { TripSessionService } from '../services/tripSessionService.js';
import { TripController } from '../controllers/tripController.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { TourPlannerService } from '../services/tourPlannerService.js';
import { MOCK_PLACES } from '../utils/mockData.js';

// Service/mapping unit doubles only: these are NOT PostgreSQL persistence evidence.
const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const other = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const tripId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
export function snapshot(): any {
  const activity = (id: string, cost: number, placeId?: string) => ({
    id, placeId, timeSlot: 'morning', title: 'Activity', description: 'Personal estimate',
    category: 'sightseeing', durationMinutes: 60, estimatedCostVND: cost, latitude: 16, longitude: 108,
  });
  return {
    id: 'itinerary-local', title: 'Trip unit snapshot', departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng',
    startDate: '2028-02-28', endDate: '2028-02-29', daysCount: 2, nightsCount: 1,
    costBasis: 'GROUP_VND_V1', costAssumptions: ['Amounts are group estimates, not booking prices.'],
    transportation: 'motorbike', pacing: 'balanced', adults: 2, children: 1, preferences: ['am-thuc'],
    totalBudgetUserVND: 1000, totalEstimatedCostVND: 375, selectedPlaceIds: [a, b],
    costDifferenceVND: 625, budgetStatus: 'within_budget', budgetAdvice: 'Estimate only', summary: 'Unit snapshot',
    createdAt: '2026-10-28T00:00:00Z', days: [
      { dayNumber: 1, date: '2028-02-28', themeTitle: 'Day 1', centroid: { latitude: 16, longitude: 108 },
        lodgingNights: 1, lodgingEstimatedCostVND: 200, dayEstimatedCostVND: 325,
        activities: [activity('act-1-a', 100, a), activity('act-1-custom', 25)] },
      { dayNumber: 2, date: '2028-02-29', themeTitle: 'Day 2', centroid: { latitude: 16, longitude: 108 },
        lodgingNights: 0, lodgingEstimatedCostVND: 0, dayEstimatedCostVND: 50,
        activities: [activity('act-2-b', 50, b)] },
    ],
  };
}

async function main() {
  const originals = { create: TripSession.create, find: TripRepository.findOwned, transaction: sequelize.transaction };
  let values: any;
  let writes = 0;
  let passed = 0;
  let failed = 0;
  const model = () => ({ toJSON: () => structuredClone(values),
    async update(patch: any) { writes++; values = { ...values, ...structuredClone(patch) }; return this; } });
  (TripSession.create as any) = async (attributes: any) => {
    writes++; values = { id: tripId, createdAt: '2026-10-28T00:00:00Z', updatedAt: '2026-10-28T00:00:00Z', ...structuredClone(attributes) };
    return model();
  };
  (TripRepository.findOwned as any) = async (id: string, userId: string) => values?.id === id && values.userId === userId ? model() : null;
  (sequelize.transaction as any) = async (run: any) => run({ LOCK: { UPDATE: 'UPDATE' } });
  const reset = async () => { writes = 0; await TripSessionService.createTripFromPlanner(snapshot(), owner, 'Owner'); writes = 0; };
  const check = async (name: string, run: () => Promise<void>) => {
    try { await run(); passed++; console.log(`PASS ${name}`); }
    catch (error: any) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
  };
  try {
    await check('UNIT create/read mapping preserves group metadata, modes, counts and lodging', async () => {
      const saved: any = await TripSessionService.createTripFromPlanner(snapshot(), owner, 'Owner');
      const read: any = await TripSessionService.getTripById(saved.id, owner);
      assert.equal(read.costBasis, 'GROUP_VND_V1');
      assert.equal(read.nightsCount, 1);
      assert.equal(read.transportation, 'motorbike');
      assert.equal(read.adults, 2);
      assert.equal(read.children, 1);
      assert.deepEqual(read.costAssumptions, snapshot().costAssumptions);
      assert.equal(read.days[0].lodgingEstimatedCostVND, 200);
      assert.equal(read.totalEstimatedCostVND, 375);
    });
    await check('UNIT create derives totals/IDs instead of trusting contradictory client totals', async () => {
      const input = snapshot(); input.totalEstimatedCostVND = 1; input.days[0].dayEstimatedCostVND = 2; input.selectedPlaceIds = [b];
      const saved = await TripSessionService.createTripFromPlanner(input, owner, 'Owner');
      assert.equal(saved.totalEstimatedCostVND, 375);
      assert.equal(saved.days[0].dayEstimatedCostVND, 325);
      assert.deepEqual(saved.selectedPlaceIds, [a, b]);
    });
    await check('UNIT remove/add/reorder updates IDs and all canonical group totals together', async () => {
      await reset();
      const days = snapshot().days;
      days[0].activities.shift(); // remove Place A, keep custom estimate and lodging
      days[1].activities.push({ ...days[1].activities[0], id: 'act-2-duplicate', estimatedCostVND: 10 });
      days[1].activities.reverse();
      const changed = await TripSessionService.updateTrip(tripId, owner, { itinerary: days });
      assert.deepEqual(changed?.selectedPlaceIds, [b]);
      assert.equal(changed?.days[0].dayEstimatedCostVND, 225);
      assert.equal(changed?.totalEstimatedCostVND, 285);
    });
    await check('UNIT preferences/title-only preserves itinerary and every metadata/amount field', async () => {
      await reset();
      const before: any = await TripSessionService.getTripById(tripId, owner);
      const changed: any = await TripSessionService.updateTrip(tripId, owner, { name: 'Renamed', preferences: ['van-hoa'] });
      assert.equal(changed.title, 'Renamed');
      assert.deepEqual(changed.preferences, ['van-hoa']);
      for (const field of ['days', 'costBasis', 'costAssumptions', 'nightsCount', 'transportation', 'adults', 'children', 'selectedPlaceIds', 'totalEstimatedCostVND']) {
        assert.deepEqual(changed[field], before[field], field);
      }
    });
    const badCreate: [string, (value: any) => void][] = [
      ['invalid calendar date', (x) => { x.endDate = '2028-02-30'; }],
      ['reversed dates', (x) => { x.endDate = '2028-02-27'; }],
      ['11 days', (x) => { x.endDate = '2028-03-09'; }],
      ['wrong day count', (x) => { x.daysCount = 3; }],
      ['zero adults', (x) => { x.adults = 0; }],
      ['fractional children', (x) => { x.children = 0.5; }],
      ['non-array activities', (x) => { x.days[0].activities = {}; }],
      ['too many activities', (x) => { x.days[0].activities = Array.from({ length: 21 }, (_, i) => ({ ...x.days[0].activities[0], id: `act-${i}` })); }],
      ['invalid Place UUID', (x) => { x.days[0].activities[0].placeId = 'not-a-uuid'; }],
      ['NaN coordinates', (x) => { x.days[0].activities[0].latitude = NaN; }],
      ['out-of-range coordinates', (x) => { x.days[0].activities[0].longitude = 181; }],
      ['negative activity cost', (x) => { x.days[0].activities[0].estimatedCostVND = -1; }],
      ['nonfinite total', (x) => { x.totalEstimatedCostVND = Infinity; }],
      ['zero-night lodging charge', (x) => { x.days[1].lodgingEstimatedCostVND = 200; }],
      ['duplicate activity IDs', (x) => { x.days[1].activities[0].id = x.days[0].activities[0].id; }],
      ['oversized title', (x) => { x.title = 'x'.repeat(256); }],
      ['oversized UTF-8 metadata', (x) => { x.costAssumptions = Array(20).fill('ế'.repeat(1000)); }],
      ['forged owner', (x) => { x.userId = other; }],
    ];
    for (const [name, mutate] of badCreate) {
      await check(`UNIT reject create ${name} before any write`, async () => {
        const input = snapshot(); mutate(input); writes = 0;
        await assert.rejects(() => TripSessionService.createTripFromPlanner(input, owner, 'Owner'), (error: any) => error.statusCode === 400);
        assert.equal(writes, 0);
      });
    }
    await check('UNIT invalid update never changes title, itinerary, metadata or amounts partially', async () => {
      await reset(); const before = structuredClone(values);
      const bad = snapshot().days; bad[0].activities[0].estimatedCostVND = -1;
      await assert.rejects(() => TripSessionService.updateTrip(tripId, owner, { name: 'must not write', itinerary: bad }), (error: any) => error.statusCode === 400);
      assert.deepEqual(values, before); assert.equal(writes, 0);
    });
    await check('UNIT client cannot update owner/status/progress/selected IDs directly', async () => {
      for (const patch of [{ userId: other }, { status: 'completed' }, { progressPercent: 100 }, { selectedPlaceIds: [] }]) {
        await reset(); const before = structuredClone(values);
        await assert.rejects(() => TripSessionService.updateTrip(tripId, owner, patch as any), (error: any) => error.statusCode === 400);
        assert.deepEqual(values, before);
      }
    });
    await check('UNIT cross-user read/update cannot access or mutate owner data', async () => {
      await reset(); const before = structuredClone(values);
      assert.equal(await TripSessionService.getTripById(tripId, other), null);
      assert.equal(await TripSessionService.updateTrip(tripId, other, { name: 'forged' }), null);
      assert.deepEqual(values, before);
    });
    await check('UNIT legacy read is not relabeled/repriced; itinerary edit is explicit read-only', async () => {
      await reset();
      values.plannerMetadata = null; values.pacing = 'packed'; values.estimatedCostVND = 777;
      const before = structuredClone(values);
      const read: any = await TripSessionService.getTripById(tripId, owner);
      assert.equal(read.costBasis, undefined);
      assert.equal(read.pacing, 'packed');
      assert.equal(read.totalEstimatedCostVND, 777);
      assert.deepEqual(read.days, before.itinerary);
      await assert.rejects(() => TripSessionService.updateTrip(tripId, owner, { itinerary: snapshot().days }),
        (error: any) => error.code === 'LEGACY_TRIP_ITINERARY_READ_ONLY');
      assert.deepEqual(values, before);
      const renamed = await TripSessionService.updateTrip(tripId, owner, { name: 'Legacy renamed' });
      assert.equal(renamed?.totalEstimatedCostVND, 777);
    });
    await check('UNIT malformed create envelope and forged root owner reach controlled 400 before write', async () => {
      for (const body of [null, [], {}, { itinerary: snapshot(), userId: other }]) {
        writes = 0; let error: any;
        await TripController.createTrip({ body, user: { id: owner, fullName: 'Owner' } } as any,
          { status() { return this; }, json() {} } as any, ((value: unknown) => { error = value; }) as any);
        assert.equal(error?.statusCode, 400); assert.equal(writes, 0);
      }
    });
    await check('UNIT route UUID and malformed update body fail predictably', async () => {
      await reset(); const before = structuredClone(values);
      await assert.rejects(() => TripSessionService.getTripById('bad-id', owner), (error: any) => error.code === 'INVALID_TRIP_ID');
      for (const patch of [null, [], { isPublic: 'false' }, { actualSpentVND: -1 }, { notes: 'x'.repeat(5001) }, { title: '' }]) {
        await assert.rejects(() => TripSessionService.updateTrip(tripId, owner, patch), (error: any) => error.statusCode === 400);
      }
      assert.deepEqual(values, before); assert.equal(writes, 0);
    });
    await check('UNIT snapshots distinguish valid Place references from custom activities', async () => {
      const input = snapshot(); const before = structuredClone(input);
      const saved = await TripSessionService.createTripFromPlanner(input, owner, 'Owner');
      assert.deepEqual(saved.selectedPlaceIds, [a, b]);
      assert.equal(saved.days[0].activities[1].placeId, undefined);
      assert.deepEqual(input, before, 'validation must not mutate the submitted snapshot');
    });
    await check('UNIT days alias handles empty activities and retains lodging without guessing IDs', async () => {
      await reset(); const days = snapshot().days; days[0].activities = []; days[1].activities = [];
      const changed = await TripSessionService.updateTrip(tripId, owner, { days } as any);
      assert.deepEqual(changed?.selectedPlaceIds, []);
      assert.equal(changed?.totalEstimatedCostVND, 200);
      assert.equal(changed?.days[0].lodgingEstimatedCostVND, 200);
    });
    await check('UNIT reject unversioned create and legacy financial conversion without changing old rows', async () => {
      const input = snapshot(); delete input.costBasis; writes = 0;
      await assert.rejects(() => TripSessionService.createTripFromPlanner(input, owner, 'Owner'), (error: any) => error.code === 'UNVERSIONED_TRIP_SNAPSHOT');
      assert.equal(writes, 0);
      await reset(); values.plannerMetadata = null; const before = structuredClone(values);
      await assert.rejects(() => TripSessionService.updateTrip(tripId, owner, { costBasis: 'GROUP_VND_V1' }), (error: any) => error.code === 'LEGACY_TRIP_ITINERARY_READ_ONLY');
      assert.deepEqual(values, before);
    });
    await check('UNIT money limits and hotel fees reject invalid precision, overflow and double charging', async () => {
      for (const patch of [
        (x: any) => { x.days[0].activities[0].estimatedCostVND = 0.001; },
        (x: any) => { x.totalBudgetUserVND = 1e14; },
        (x: any) => { x.days[0].activities[0].category = 'hotel'; },
        (x: any) => { x.days[0].activities[0].estimatedCostVND = 9_999_999_999_999.99; },
      ]) {
        const input = snapshot(); patch(input); writes = 0;
        await assert.rejects(() => TripSessionService.createTripFromPlanner(input, owner, 'Owner'), (error: any) => error.statusCode === 400);
        assert.equal(writes, 0);
      }
    });
    await check('UNIT saving a known legacy mode is not subjected to generate-only mode rules', async () => {
      const input = snapshot(); input.pacing = 'packed'; input.transportation = 'train';
      const saved: any = await TripSessionService.createTripFromPlanner(input, owner, 'Owner');
      assert.equal(saved.pacing, 'packed'); assert.equal(saved.transportation, 'train');
      assert.equal(saved.totalEstimatedCostVND, 375);
    });
    await check('UNIT actual Generator output is accepted and mapped without losing metadata/amounts', async () => {
      RecommendationRepository.useLoaderForTests(async () => [
        { ...MOCK_PLACES[0], id: a, category: 'attraction', city: 'Đà Nẵng', province: 'Đà Nẵng', priceFrom: 100_000 },
        { ...MOCK_PLACES[0], id: b, category: 'hotel', city: 'Đà Nẵng', province: 'Đà Nẵng', priceFrom: 200_000 },
      ] as any);
      try {
        const generated = await TourPlannerService.generateSmartItinerary({
          departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng', startDate: '2028-02-28', endDate: '2028-02-29',
          adults: 2, children: 1, totalBudget: 1_000_000, preferences: [], transportation: 'motorbike', pacing: 'balanced', mandatoryPlaceIds: [b],
        });
        const saved: any = await TripSessionService.createTripFromPlanner(generated, owner, 'Owner');
        assert.deepEqual(saved.days, generated.days);
        assert.equal(saved.totalEstimatedCostVND, generated.totalEstimatedCostVND);
        assert.deepEqual(saved.costAssumptions, generated.costAssumptions);
        assert.equal(saved.transportation, generated.transportation);
      } finally { RecommendationRepository.resetLoader(); }
    });
    await check('UNIT currency cent sums/difference are stable without repricing group amounts', async () => {
      const input = snapshot(); input.totalBudgetUserVND = 1.3;
      input.days[0].activities[0].estimatedCostVND = 0.1;
      input.days[0].activities[1].estimatedCostVND = 0.2;
      input.days[0].lodgingEstimatedCostVND = 0.3;
      input.days[1].activities[0].estimatedCostVND = 0.4;
      const saved: any = await TripSessionService.createTripFromPlanner(input, owner, 'Owner');
      assert.equal(saved.days[0].dayEstimatedCostVND, 0.6);
      assert.equal(saved.totalEstimatedCostVND, 1);
      assert.equal(saved.costDifferenceVND, 0.3);
    });
  } finally {
    TripSession.create = originals.create;
    TripRepository.findOwned = originals.find;
    sequelize.transaction = originals.transaction;
  }
  console.log(JSON.stringify({ suite: 'trip-snapshot-unit', passed, failed, persistenceEvidence: false, database: 'NOT USED' }));
  process.exitCode = failed ? 1 : 0;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
