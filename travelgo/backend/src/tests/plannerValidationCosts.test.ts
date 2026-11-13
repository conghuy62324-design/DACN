import assert from 'node:assert/strict';
import { TourController } from '../controllers/tourController.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { TourPlannerService, type PlannerInput } from '../services/tourPlannerService.js';
import { MOCK_PLACES } from '../utils/mockData.js';
import { validatePlannerInput } from '../utils/plannerValidation.js';

// In-memory unit fixture only. No database connection or training corpus.
const hotel = {
  ...MOCK_PLACES.find((place) => place.category === 'hotel')!,
  id: '55555555-5555-4555-8555-555555555555',
  city: 'Đà Nẵng', province: 'Đà Nẵng', category: 'hotel', priceFrom: 600_000,
  status: 'APPROVED', businessId: null,
} as any;
const freeAttraction = { ...hotel, id: '11111111-1111-4111-8111-111111111111', category: 'attraction', priceFrom: 0 };
const base = (overrides: Record<string, unknown> = {}): PlannerInput => ({
  departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng',
  startDate: '2028-02-28', endDate: '2028-02-28',
  adults: 1, children: 0, totalBudget: 10_000_000,
  transportation: 'car', preferences: [], pacing: 'balanced', ...overrides,
} as PlannerInput);

async function controller(body: unknown) {
  let status = 200;
  let response: any;
  let error: any;
  await TourController.planItinerary(
    { body } as any,
    { status(code: number) { status = code; return this; }, json(value: any) { response = value; } } as any,
    ((value: unknown) => { error = value; }) as any,
  );
  return { status: error?.statusCode ?? status, response, error };
}

async function main() {
  let passed = 0;
  let failed = 0;
  let reads = 0;
  RecommendationRepository.useLoaderForTests(async () => { reads++; return [freeAttraction, hotel]; });
  const check = async (name: string, run: () => unknown | Promise<unknown>) => {
    try { await run(); passed++; console.log(`PASS ${name}`); }
    catch (error: any) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
  };
  try {
    for (const [endDate, days, expected] of [
      ['2028-02-28', 1, 350_000],
      ['2028-02-29', 2, 1_300_000],
      ['2028-03-01', 3, 2_250_000],
    ] as const) {
      await check(`${days} inclusive day(s): meals 350000/day + ${days - 1} hotel night(s) at 600000`, async () => {
        const plan = await TourPlannerService.generateSmartItinerary(base({ endDate }));
        assert.equal(plan.daysCount, days);
        assert.equal(plan.nightsCount, days - 1);
        assert.equal(plan.days.at(-1)?.date, endDate);
        assert.equal(plan.totalEstimatedCostVND, expected);
        assert.equal(plan.costDifferenceVND, 10_000_000 - expected);
      });
    }
    await check('one-day title is 1N0Đ', async () => {
      const plan = await TourPlannerService.generateSmartItinerary(base());
      assert.match(plan.title, /1N0Đ/);
    });
    await check('group totals: 2 adults + 1 child, 3 days, each amount rounded once to VND', async () => {
      const plan = await TourPlannerService.generateSmartItinerary(base({ endDate: '2028-03-01', adults: 2, children: 1 }));
      assert.equal(plan.totalEstimatedCostVND, 4_035_000); // 350000 * 2.7 * 3 + 600000 * 2
      assert.equal(plan.days.reduce((sum, day) => sum + day.dayEstimatedCostVND, 0), plan.totalEstimatedCostVND);
      assert.equal(plan.costBasis, 'GROUP_VND_V1');
      assert.deepEqual(plan.days.map((day) => day.lodgingNights), [1, 1, 0]);
      for (const day of plan.days) {
        assert.equal(day.dayEstimatedCostVND,
          day.activities.reduce((sum, activity) => sum + activity.estimatedCostVND, 0) + ((day as any).lodgingEstimatedCostVND ?? 0));
      }
    });
    await check('mandatory hotel remains exactly once with zero overnight charge on a day trip', async () => {
      const plan = await TourPlannerService.generateSmartItinerary(base({ mandatoryPlaceIds: [hotel.id, hotel.id] }));
      const activities = plan.days.flatMap((day) => day.activities).filter((activity) => activity.placeId === hotel.id);
      assert.equal(activities.length, 1);
      assert.equal(activities[0].estimatedCostVND, 0);
      assert.equal(plan.totalEstimatedCostVND, 350_000);
      assert.deepEqual(plan.selectedPlaceIds, [freeAttraction.id, hotel.id]);
    });
    await check('ten inclusive days are supported without clamping', () => {
      assert.equal(TourPlannerService.calculateDaysBetween('2028-02-28', '2028-03-08'), 10);
    });
    for (const [startDate, endDate] of [
      ['invalid', '2028-03-01'], ['2027-02-29', '2027-03-01'],
      ['2028-02-30', '2028-03-01'], ['2028-04-31', '2028-05-01'],
      ['2028-2-28', '2028-03-01'], ['2028-02-28T00:00:00Z', '2028-03-01'],
      ['2028-03-01', '2028-02-28'], ['2028-02-28', '2028-03-09'],
      ['0000-01-01', '0000-01-01'],
    ]) {
      await check(`reject invalid/reversed/over-limit calendar range ${startDate}..${endDate}`, () => {
        assert.throws(() => TourPlannerService.calculateDaysBetween(startDate, endDate), (error: any) => error.statusCode === 400);
      });
    }
    for (const patch of [
      { adults: 0 }, { adults: -1 }, { adults: 1.5 }, { adults: '2' }, { adults: '' }, { adults: null },
      { children: -1 }, { children: 0.5 }, { children: '0' }, { children: false },
      { totalBudget: 0 }, { totalBudget: -1 }, { totalBudget: '1000000' },
      { totalBudget: 'bad' }, { totalBudget: null }, { totalBudget: Number.POSITIVE_INFINITY },
      { destinationCity: {} }, { startDate: '' }, { startDate: null },
      { endDate: '2028-02-30' }, { endDate: '2028-02-27' }, { endDate: '2028-03-09' },
    ]) {
      const shown = JSON.stringify(patch, (_key, value) => typeof value === 'number' && !Number.isFinite(value) ? String(value) : value);
      await check(`controller rejects explicit invalid input ${shown}`, async () => {
        const before = reads;
        const result = await controller(base(patch));
        assert.equal(result.status, 400);
        assert.equal(reads, before, 'invalid input must fail before catalog retrieval');
      });
    }
    await check('direct service callers receive the same count/budget validation', async () => {
      for (const patch of [{ adults: 0 }, { children: -1 }, { totalBudget: 0 }, { totalBudget: NaN }]) {
        await assert.rejects(() => TourPlannerService.generateSmartItinerary(base(patch)), (error: any) => error.statusCode === 400);
      }
    });
    await check('omitted fields retain documented defaults, end defaults to start + 2 days', async () => {
      const result = await controller({ destinationCity: 'Đà Nẵng', startDate: '2028-02-28' });
      assert.equal(result.status, 200);
      const plan = result.response.data;
      assert.equal(plan.endDate, '2028-03-01');
      assert.equal(plan.adults, 1);
      assert.equal(plan.children, 0);
      assert.equal(plan.totalBudgetUserVND, 5_000_000);
    });
    await check('invalid explicit endDate is not hidden by controller defaults', async () => {
      const result = await controller(base({ endDate: '' }));
      assert.equal(result.status, 400);
    });
    await check('preference allowlist remains enforced for direct service and controller', async () => {
      await assert.rejects(() => TourPlannerService.generateSmartItinerary(base({ preferences: ['from-summary'] })),
        (error: any) => error.statusCode === 400);
      assert.equal((await controller(base({ preferences: ['from-summary'] }))).status, 400);
    });
    await check('missing dates use the Vietnam calendar date and a three-inclusive-day default', () => {
      const input = validatePlannerInput({ destinationCity: 'Đà Nẵng' }, new Date('2026-10-28T18:30:00Z'));
      assert.equal(input.startDate, '2026-10-29');
      assert.equal(input.endDate, '2026-10-31');
      assert.equal(input.departureCity, 'Hà Nội');
      assert.deepEqual(input.preferences, []);
      assert.deepEqual(input.mandatoryPlaceIds, []);
    });
    await check('small positive numeric budgets remain valid; no new artificial minimum', async () => {
      const result = await controller(base({ totalBudget: 0.5 }));
      assert.equal(result.status, 200);
      assert.equal(result.response.data.totalBudgetUserVND, 0.5);
      assert.equal(result.response.data.costDifferenceVND, 0.5 - 350_000);
    });
    await check('malformed body and explicitly invalid optional fields return 400 before retrieval', async () => {
      for (const body of [null, [], {}, base({ departureCity: '' }), base({ pacing: null }),
        base({ transportation: 'boat' }), base({ mandatoryPlaceIds: null }), base({ children: null })]) {
        const before = reads;
        assert.equal((await controller(body)).status, 400);
        assert.equal(reads, before);
      }
    });
    await check('three-day mandatory hotel is one zero-cost marker plus exactly two overnight charges', async () => {
      const plan = await TourPlannerService.generateSmartItinerary(base({ endDate: '2028-03-01', mandatoryPlaceIds: [hotel.id] }));
      const markers = plan.days.flatMap((day) => day.activities).filter((activity) => activity.placeId === hotel.id);
      assert.equal(markers.length, 1);
      assert.equal(markers[0].estimatedCostVND, 0);
      assert.equal(plan.days.reduce((sum, day) => sum + day.lodgingEstimatedCostVND, 0), 1_200_000);
      assert.equal(plan.totalEstimatedCostVND, 2_250_000);
    });
    await check('legacy null preferences normalize to empty while invalid labels stay rejected', async () => {
      const result = await controller(base({ preferences: null }));
      assert.equal(result.status, 200);
      assert.deepEqual(result.response.data.preferences, []);
    });
    await check('no hotel catalog uses declared 400000/group/night fallback, never attraction price', async () => {
      RecommendationRepository.useLoaderForTests(async () => [{ ...hotel, category: 'attraction', priceFrom: 10_000 }]);
      const plan = await TourPlannerService.generateSmartItinerary(base({ endDate: '2028-02-29' }));
      assert.equal(plan.hotelSuggestion, undefined);
      assert.equal((plan.days[0] as any).lodgingEstimatedCostVND, 400_000);
      assert.equal((plan.days[1] as any).lodgingEstimatedCostVND, 0);
    });
    await check('empty catalog rejects Generate for day trips and overnight trips', async () => {
      RecommendationRepository.useLoaderForTests(async () => []);
      for (const patch of [{}, { endDate: '2028-02-29' }]) {
        await assert.rejects(() => TourPlannerService.generateSmartItinerary(base(patch)),
          (error: any) => error.statusCode === 422 && error.code === 'NO_SIGHTSEEING_FOR_DESTINATION');
      }
    });
    await check('missing hotel price uses a declared estimate; a genuine zero price stays zero', async () => {
      RecommendationRepository.useLoaderForTests(async () => [freeAttraction, { ...hotel, priceFrom: NaN }]);
      const missingPrice = await TourPlannerService.generateSmartItinerary(base({ endDate: '2028-02-29', mandatoryPlaceIds: [hotel.id] }));
      assert.equal(missingPrice.days[0].lodgingEstimatedCostVND, 400_000);
      RecommendationRepository.useLoaderForTests(async () => [freeAttraction, { ...hotel, priceFrom: 0 }]);
      const freeHotel = await TourPlannerService.generateSmartItinerary(base({ endDate: '2028-02-29', mandatoryPlaceIds: [hotel.id] }));
      assert.equal(freeHotel.totalEstimatedCostVND, 700_000);
    });
  } finally { RecommendationRepository.resetLoader(); }
  console.log(JSON.stringify({ suite: 'planner-validation-costs', passed, failed, database: 'NOT USED' }));
  process.exitCode = failed ? 1 : 0;
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
