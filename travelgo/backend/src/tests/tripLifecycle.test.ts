import assert from 'node:assert/strict';
import { sequelize } from '../config/database.js';
import { TripRepository } from '../repositories/tripRepository.js';
import { TripSessionService } from '../services/tripSessionService.js';
import { TripController } from '../controllers/tripController.js';
import { reconcileCheckins, resolveCheckinActivity, tripProgress, validateCheckinBody } from '../utils/tripProgress.js';

const owner = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const place = '11111111-1111-4111-8111-111111111111';
const foreign = '22222222-2222-4222-8222-222222222222';
const activity = (key: string, placeId?: string) => ({ id: key, ...(placeId ? { placeId } : {}), title: key, description: '', category: 'food', timeSlot: 'lunch', durationMinutes: 30, latitude: 16, longitude: 108, estimatedCostVND: 100 });
async function main() {
  const originals = { find: TripRepository.findOwned, transaction: sequelize.transaction };
  let model: any; let writes = 0; let passed = 0; let failed = 0;
  const reset = () => {
    writes = 0;
    model = { id, userId: owner, name: 'Lifecycle unit', startDate: '2028-02-28', endDate: '2028-02-28', daysCount: 1,
      departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng', pacing: 'balanced', totalBudgetVND: 1000, estimatedCostVND: 200, actualSpentVND: 0,
      status: 'active', preferences: [], selectedPlaceIds: [place], checkins: [], progressPercent: 0,
      plannerMetadata: { schemaVersion: 1, costBasis: 'GROUP_VND_V1', nightsCount: 0, adults: 2, children: 0, transportation: 'car', costAssumptions: ['Group estimate'] },
      itinerary: [{ dayNumber: 1, date: '2028-02-28', themeTitle: 'Day', centroid: { latitude: 16, longitude: 108 }, lodgingNights: 0, lodgingEstimatedCostVND: 0, dayEstimatedCostVND: 200, activities: [activity('a', place), activity('b')] }],
      createdAt: '2026-10-28T00:00:00Z', updatedAt: '2026-10-28T00:00:00Z',
      toJSON() { const { toJSON, update, ...value } = this; return structuredClone(value); },
      async update(patch: any) { writes++; Object.assign(this, structuredClone(patch)); return this; },
    };
  };
  (TripRepository.findOwned as any) = async (tripId: string, userId: string) => tripId === id && userId === owner ? model : null;
  (sequelize.transaction as any) = async (run: any) => run({ LOCK: { UPDATE: 'UPDATE' } });
  const checkin = async (body: any) => {
    let status = 200; let data: any; let error: any;
    const res: any = { status(value: number) { status = value; return this; }, json(value: any) { data = value; return this; } };
    await TripController.checkinPlace({ params: { id }, user: { id: owner }, body } as any, res, (e: any) => { error = e; });
    return { status: error?.statusCode ?? status, data, error };
  };
  const check = async (name: string, run: () => Promise<void>) => { reset(); try { await run(); passed++; console.log(`PASS ${name}`); } catch (e: any) { failed++; console.error(`FAIL ${name}: ${e.message}`); } };
  try {
    await check('Start has a dedicated action and retry does not write', async () => {
      model.status = 'upcoming';
      const service: any = TripSessionService;
      assert.equal(typeof service.startTrip, 'function');
      assert.equal((await service.startTrip(id, owner)).status, 'active');
      const before = writes; await service.startTrip(id, owner); assert.equal(writes, before);
    });
    await check('foreign Place is rejected before writing', async () => {
      assert.equal((await checkin({ placeId: foreign, placeName: 'Untrusted' })).status, 400); assert.equal(writes, 0);
    });
    await check('invalid geo is rejected before writing', async () => {
      assert.equal((await checkin({ placeId: place, placeName: 'Untrusted', geo: { latitude: Infinity, longitude: 108 } })).status, 400); assert.equal(writes, 0);
    });
    await check('Complete keeps actual check-in percentage', async () => {
      model.checkins = [{ activityId: 'a', placeId: place, placeName: 'a', checkedInAt: '2026-10-27T00:00:00Z' }]; model.progressPercent = 50;
      const completed = await TripSessionService.completeTrip(id, owner); assert.equal(completed?.status, 'completed'); assert.equal(completed?.progressPercent, 50);
    });
    await check('duplicate check-in preserves first timestamp and notes', async () => {
      model.checkins = [{ activityId: 'a', placeId: place, placeName: 'a', checkedInAt: '2026-10-27T00:00:00Z', notes: 'first' }];
      const before = structuredClone(model.checkins);
      assert.equal((await checkin({ placeId: place, placeName: 'Forged', notes: 'retry' })).status, 200);
      assert.deepEqual(model.checkins, before); assert.equal(writes, 0);
    });
    await check('deleted activity cannot keep contributing to progress; history retained', async () => {
      model.checkins = [{ activityId: 'a', placeId: place, placeName: 'a', checkedInAt: '2026-10-27T00:00:00Z' }]; model.progressPercent = 50;
      const days = structuredClone(model.itinerary); days[0].activities.shift();
      const result = await TripSessionService.updateTrip(id, owner, { days });
      assert.equal(result?.progressPercent, 0); assert.equal(model.checkins.length, 1);
    });
    await check('legacy ambiguous references include activities missing or duplicating IDs', async () => {
      const history = [{ placeId: place, placeName: 'a', checkedInAt: '2025-01-01T00:00:00Z' }];
      for (const extra of [{ ...activity('other', place), id: undefined }, activity('a', place)]) {
        const days = [{ activities: [activity('a', place), extra] }];
        assert.equal(tripProgress(days, history).progressPercent, 0);
        assert.equal(tripProgress(days, history).progress.unmatchedCheckinCount, 1);
        assert.throws(() => resolveCheckinActivity(days, { placeId: place }), (e: any) => e.statusCode === 409);
      }
    });
    await check('legacy custom association and duplicate history preserve facts without double count', async () => {
      const days = [{ activities: [activity('custom')] }];
      const history = [{ placeId: 'custom', placeName: 'Old title', checkedInAt: '2025-01-01T00:00:00Z', notes: 'old note' }];
      const before = structuredClone(history);
      const view = tripProgress(days, [...history, ...history]);
      assert.deepEqual(view.progress.checkedActivityIds, ['custom']); assert.equal(view.progress.unmatchedCheckinCount, 1);
      assert.deepEqual(history, before);
      const linked: any = reconcileCheckins(days, days, history)[0];
      assert.equal(linked.activityId, 'custom'); assert.equal(linked.legacyPlaceId, 'custom');
      assert.equal(linked.placeName, 'Old title'); assert.equal(linked.notes, 'old note'); assert.equal(linked.checkedInAt, history[0].checkedInAt);
      assert.equal(tripProgress(days, [linked]).progressPercent, 100);
    });
    await check('nonfinite geo and invalid accuracy are rejected independently of JSON encoding', async () => {
      for (const geo of [{ latitude: NaN, longitude: 108 }, { latitude: 16, longitude: Infinity }, { latitude: 16, longitude: 108, accuracyMeters: Infinity }, { latitude: 16, longitude: 108, accuracyMeters: NaN }, { latitude: 16, longitude: 108, accuracyMeters: '10' }]) {
        assert.throws(() => validateCheckinBody({ activityId: 'a', geo }), (e: any) => e.statusCode === 400);
      }
    });
  } finally { TripRepository.findOwned = originals.find; sequelize.transaction = originals.transaction; await sequelize.close(); }
  console.log(JSON.stringify({ suite: 'trip-lifecycle-unit', passed, failed, database: 'NOT USED', persistenceEvidence: false }));
  if (failed) process.exitCode = 1;
}
main().catch((e) => { console.error(e.message); process.exitCode = 1; });
