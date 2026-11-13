import assert from 'node:assert/strict';
import { isMandatoryPlannerActivity, movePlannerActivity, removePlannerActivity } from '../src/utils/plannerCosts.ts';
import { bookingSnapshotMoney } from '../src/utils/bookingSnapshotMoney.ts';

const reasons = [
  'Địa điểm bắt buộc do bạn chọn từ trang chi tiết.',
  'Nhà hàng bắt buộc do bạn chọn từ trang chi tiết.',
  'Khách sạn do bạn chọn. Phí lưu trú ước tính nằm ở mục riêng của ngày; không phải xác nhận đặt phòng.',
];
let passed = 0;
const check = (name: string, run: () => void) => { run(); passed++; console.log(`PASS ${name}`); };
const activity = (id: string, cost: number, reason?: string) => ({ id, placeId: `place-${id}`, title: id, estimatedCostVND: cost, recommendationReason: reason, costSource: 'Catalog priceFrom; unit assumption' });
const trip: any = { id: 'existing-trip', costBasis: 'GROUP_VND_V1', costAssumptions: ['Group only'], transportation: 'motorbike', status: 'active', adults: 2, children: 1,
  totalBudgetUserVND: 100000, totalEstimatedCostVND: 900000, selectedPlaceIds: ['place-a', 'place-b'],
  checkins: [{ activityId: 'a', checkedInAt: '2026-10-31T00:00:00Z' }],
  days: [{ dayNumber: 1, date: '2028-02-28', lodgingNights: 1, lodgingEstimatedCostVND: 600000, lodgingCostSource: 'One room/group/night', dayEstimatedCostVND: 900000,
    activities: [activity('a', 100000), activity('b', 200000), activity('hotel', 0, reasons[2])] }] };
for (const reason of reasons) check('saved mandatory marker prevents removal without repricing', () => {
  const plan = { ...trip, days: [{ ...trip.days[0], activities: [activity('protected', 0, reason)] }] };
  assert.ok(isMandatoryPlannerActivity(plan.days[0].activities[0] as any));
  assert.equal(removePlannerActivity(plan, 1, 'protected'), plan);
});
check('remove keeps immutable IDs/sources/metadata/history and separate lodging', () => {
  const before = structuredClone(trip); const draft = removePlannerActivity(trip, 1, 'b');
  assert.deepEqual(trip, before); assert.equal(draft.id, trip.id); assert.equal(draft.totalEstimatedCostVND, 700000);
  assert.equal(draft.overBudgetVND, 600000); assert.deepEqual(draft.selectedPlaceIds, ['place-a', 'place-hotel']);
  assert.equal(draft.days[0].lodgingEstimatedCostVND, 600000); assert.equal(draft.days[0].lodgingCostSource, trip.days[0].lodgingCostSource);
  assert.deepEqual(draft.checkins, trip.checkins); assert.deepEqual(draft.costAssumptions, trip.costAssumptions);
  assert.equal(draft.days[0].activities[0].costSource, trip.days[0].activities[0].costSource);
});
check('reorder buttons preserve costs/IDs/check-ins and do not mutate canonical Trip', () => {
  const before = structuredClone(trip); const draft = movePlannerActivity(trip, 1, 0, 'down');
  assert.deepEqual(draft.days[0].activities.map((a: any) => a.id), ['b', 'a', 'hotel']);
  assert.equal(draft.totalEstimatedCostVND, trip.totalEstimatedCostVND); assert.deepEqual(draft.checkins, trip.checkins); assert.deepEqual(trip, before);
  assert.deepEqual(draft.selectedPlaceIds, ['place-b', 'place-a', 'place-hotel']);
});
check('optional free activity is removable; hotel category alone does not invent a mandatory marker', () => {
  const free = activity('free', 0); assert.equal(isMandatoryPlannerActivity({ ...free, category: 'hotel' } as any), false);
  const draft = removePlannerActivity({ ...trip, days: [{ ...trip.days[0], activities: [...trip.days[0].activities, free] }] }, 1, 'free');
  assert.equal(draft.totalEstimatedCostVND, 900000); assert.ok(!draft.days[0].activities.some((a: any) => a.id === 'free'));
});
check('confirmed prices preserve genuine zero and server unit instead of division/quote fallback', () => {
  assert.equal(bookingSnapshotMoney(0), 0); assert.equal(bookingSnapshotMoney(123457), 123457);
  assert.equal(bookingSnapshotMoney(246914), 246914); // Distinct server amounts; no price calculation.
});
check('missing or invalid legacy amounts remain unknown, never silently free or repriced', () => {
  for (const value of [undefined, null, '', '123457', NaN, Infinity, -1]) assert.equal(bookingSnapshotMoney(value), undefined);
});
check('versioned manual Trip cents remain serializable and equal-budget after removing a free stop', () => {
  const manual = { ...trip, totalBudgetUserVND: 0.3, totalEstimatedCostVND: 0.3, days: [{ ...trip.days[0], dayEstimatedCostVND: 0.3,
    lodgingEstimatedCostVND: 0.2, activities: [activity('manual', 0.1), activity('free', 0)] }] };
  const draft = removePlannerActivity(manual, 1, 'free');
  assert.equal(draft.totalEstimatedCostVND, 0.3); assert.equal(draft.days[0].dayEstimatedCostVND, 0.3);
  assert.equal(draft.costDifferenceVND, 0); assert.equal(draft.budgetStatus, 'within_budget'); assert.equal(draft.overBudgetVND, 0);
});
console.log(JSON.stringify({ suite: 'saved-trip-editor-and-booking-snapshot', passed, failed: 0, database: 'NOT USED' }));
