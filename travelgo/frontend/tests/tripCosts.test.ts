import assert from 'node:assert/strict';
import { tripCostView } from '../src/utils/tripCosts.ts';

const legacy: any = { totalEstimatedCostVND: 777, totalBudgetUserVND: 1000, pacing: 'packed', transportation: 'train', daysCount: 1,
  days: [{ dayEstimatedCostVND: 1, activities: [{ estimatedCostVND: 1 }] }], adults: 8, children: 4 };
const before = structuredClone(legacy);
const view = tripCostView(legacy);
assert.equal(view.isGroup, false);
assert.equal(view.total, 777);
assert.equal(view.nights, undefined); // Neither a fabricated overnight stay nor an inferred zero.
assert.match(view.transportation, /Tàu hỏa/);
assert.match(view.pacing, /Khám phá nhiều/);
assert.match(view.label, /Giữ nguyên/);
assert.deepEqual(legacy, before);

const group = tripCostView({ ...legacy, costBasis: 'GROUP_VND_V1', nightsCount: 0, costAssumptions: ['One group estimate'] });
assert.equal(group.isGroup, true);
assert.equal(group.total, 777); // No multiplication by eight adults/four children.
assert.equal(group.nights, 0);
assert.deepEqual(group.assumptions, ['One group estimate']);
assert.match(group.label, /không phải giá booking/);

const future = tripCostView({ ...legacy, costBasis: 'UNKNOWN_V2' });
assert.equal(future.isGroup, false);
assert.equal(future.total, 777);
console.log(JSON.stringify({ suite: 'trip-cost-display', result: 'PASS', checks: 3, browser: 'NOT USED' }));
