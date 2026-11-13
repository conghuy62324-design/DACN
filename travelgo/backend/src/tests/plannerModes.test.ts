import assert from 'node:assert/strict';
import { TourController } from '../controllers/tourController.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { GeoService } from '../services/geoService.js';
import { TourPlannerService } from '../services/tourPlannerService.js';
import { MOCK_PLACES } from '../utils/mockData.js';

// Isolated in-memory unit fixture; no DB writes or sentiment data.
const ids = [
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '55555555-5555-4555-8555-555555555555',
];
const prototype = MOCK_PLACES[0];
const catalog = [
  { ...prototype, id: ids[0], category: 'attraction', latitude: 16.0, longitude: 108.0 },
  { ...prototype, id: ids[1], category: 'attraction', latitude: 16.8, longitude: 108.8 },
  { ...prototype, id: ids[2], category: 'hotel', latitude: 16.4, longitude: 108.4 },
].map((place) => ({ ...place, city: 'Đà Nẵng', province: 'Đà Nẵng', status: 'APPROVED', businessId: null, priceFrom: 100_000 })) as any;
const input = (patch: Record<string, unknown> = {}) => ({
  departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng', startDate: '2028-02-28', endDate: '2028-03-01',
  adults: 2, children: 1, totalBudget: 10_000_000, preferences: [],
  mandatoryPlaceIds: ids, pacing: 'balanced', transportation: 'car', ...patch,
}) as any;

async function request(body: unknown) {
  let error: any;
  let result: any;
  await TourController.planItinerary({ body } as any, { json: (value: any) => { result = value; } } as any,
    ((value: unknown) => { error = value; }) as any);
  return { error, result };
}

const costs = (plan: any) => ({
  daysCount: plan.daysCount, nightsCount: plan.nightsCount, title: plan.title, costBasis: plan.costBasis,
  total: plan.totalEstimatedCostVND, difference: plan.costDifferenceVND, status: plan.budgetStatus,
  selectedPlaceIds: plan.selectedPlaceIds,
  days: plan.days.map((day: any) => ({ date: day.date, nights: day.lodgingNights,
    lodging: day.lodgingEstimatedCostVND, total: day.dayEstimatedCostVND,
    activities: day.activities.map((activity: any) => ({ id: activity.id, placeId: activity.placeId, cost: activity.estimatedCostVND })),
  })),
});

async function main() {
  let reads = 0;
  let passed = 0;
  let failed = 0;
  const calls: { distance: number; mode: string | undefined }[] = [];
  const originalEta = GeoService.estimateTravelTimeMinutes;
  GeoService.estimateTravelTimeMinutes = (distance, mode) => {
    calls.push({ distance, mode });
    return originalEta.call(GeoService, distance, mode);
  };
  RecommendationRepository.useLoaderForTests(async () => { reads++; return catalog; });
  const check = async (name: string, run: () => void | Promise<void>) => {
    try { await run(); passed++; console.log(`PASS ${name}`); }
    catch (error: any) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
  };
  try {
    await check('missing pacing/transportation use balanced/car defaults', async () => {
      const explicit = await TourPlannerService.generateSmartItinerary(input());
      const missing = await TourPlannerService.generateSmartItinerary(input({ pacing: undefined, transportation: undefined }));
      assert.equal(missing.pacing, 'balanced');
      assert.equal((missing as any).transportation, 'car');
      assert.deepEqual(costs(missing), costs(explicit));
      assert.ok(calls.every((call) => call.mode === 'car'));
    });
    for (const [field, value, code] of [
      ['pacing', 'relaxed', 'UNSUPPORTED_PLANNER_PACING'],
      ['pacing', 'packed', 'UNSUPPORTED_PLANNER_PACING'],
      ['transportation', 'flight', 'UNSUPPORTED_PLANNER_TRANSPORTATION'],
      ['transportation', 'train', 'UNSUPPORTED_PLANNER_TRANSPORTATION'],
      ['pacing', '', 'INVALID_PLANNER_PACING'], ['pacing', null, 'INVALID_PLANNER_PACING'],
      ['pacing', {}, 'INVALID_PLANNER_PACING'], ['pacing', 'unknown', 'INVALID_PLANNER_PACING'],
      ['transportation', '', 'INVALID_PLANNER_TRANSPORTATION'], ['transportation', null, 'INVALID_PLANNER_TRANSPORTATION'],
      ['transportation', false, 'INVALID_PLANNER_TRANSPORTATION'], ['transportation', 'walking', 'INVALID_PLANNER_TRANSPORTATION'],
    ] as const) {
      await check(`reject explicit ${field}=${JSON.stringify(value)} with 400/${code}`, async () => {
        const before = reads;
        const { error } = await request(input({ [field]: value }));
        assert.equal(error?.statusCode, 400);
        assert.equal(error?.code, code);
        assert.equal(typeof error?.message, 'string');
        assert.equal(reads, before, 'unsupported input must fail before candidate retrieval');
        await assert.rejects(() => TourPlannerService.generateSmartItinerary(input({ [field]: value })),
          (direct: any) => direct.statusCode === 400 && direct.code === code);
      });
    }
    await check('balanced describes at most two sightseeing stops, excluding meals', async () => {
      const plan = await TourPlannerService.generateSmartItinerary(input());
      assert.match(plan.summary, /tối đa 2 điểm tham quan\/ngày/);
      assert.match(plan.summary, /không tính bữa ăn/);
      assert.ok(plan.days.every((day) => day.activities.filter((activity) => activity.category === 'sightseeing').length <= 2));
    });
    await check('every car ETA uses the existing car formula', async () => {
      calls.length = 0;
      const plan = await TourPlannerService.generateSmartItinerary(input());
      assert.ok(calls.length > 0);
      assert.ok(calls.every((call) => call.mode === 'car'));
      for (const day of plan.days) for (const activity of day.activities) {
        if (activity.aerialDistanceToNextKm !== undefined) {
          assert.equal(activity.estimatedTransitMinutes, originalEta(activity.aerialDistanceToNextKm, 'car'));
        }
      }
    });
    await check('motorbike uses its own formula and differs from car on a long Haversine leg', async () => {
      const car = await TourPlannerService.generateSmartItinerary(input());
      calls.length = 0;
      const bike = await TourPlannerService.generateSmartItinerary(input({ transportation: 'motorbike' }));
      assert.ok(calls.length > 0);
      assert.ok(calls.every((call) => call.mode === 'motorbike'), 'planner must forward the selected mode');
      let differentLongLegs = 0;
      let witness: { distanceKm: number; carMinutes: number; motorbikeMinutes: number } | undefined;
      bike.days.forEach((day, index) => day.activities.forEach((activity, activityIndex) => {
        if (activity.aerialDistanceToNextKm === undefined) return;
        assert.equal(activity.estimatedTransitMinutes, originalEta(activity.aerialDistanceToNextKm, 'motorbike'));
        const carActivity = car.days[index].activities[activityIndex];
        assert.equal(activity.aerialDistanceToNextKm, carActivity.aerialDistanceToNextKm);
        if (activity.aerialDistanceToNextKm > 10 && activity.estimatedTransitMinutes !== carActivity.estimatedTransitMinutes) {
          differentLongLegs++;
          witness ??= { distanceKm: activity.aerialDistanceToNextKm, carMinutes: carActivity.estimatedTransitMinutes!, motorbikeMinutes: activity.estimatedTransitMinutes! };
        }
      }));
      assert.ok(differentLongLegs > 0, 'fixture must contain a leg large enough to avoid the 5-minute minimum');
      console.log(JSON.stringify({ longLegEtaWitness: witness }));
    });
    await check('mode changes preserve mandatory IDs, N-1 nights and every GROUP_VND_V1 amount', async () => {
      const car = await TourPlannerService.generateSmartItinerary(input());
      const bike = await TourPlannerService.generateSmartItinerary(input({ transportation: 'motorbike' }));
      assert.deepEqual(costs(bike), costs(car));
      assert.equal(car.daysCount, 3);
      assert.equal(car.nightsCount, 2);
      assert.equal(car.costBasis, 'GROUP_VND_V1');
      for (const plan of [car, bike]) {
        const scheduled = plan.days.flatMap((day) => day.activities.map((activity) => activity.placeId));
        for (const id of ids) assert.equal(scheduled.filter((value) => value === id).length, 1);
      }
    });
  } finally {
    GeoService.estimateTravelTimeMinutes = originalEta;
    RecommendationRepository.resetLoader();
  }
  console.log(JSON.stringify({ suite: 'planner-modes', passed, failed, database: 'NOT USED' }));
  process.exitCode = failed ? 1 : 0;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
