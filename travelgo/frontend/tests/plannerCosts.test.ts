import assert from 'node:assert/strict';
import { movePlannerActivity, removePlannerActivity } from '../src/utils/plannerCosts.ts';

// Planner group-cost contract fixture, not a training dataset or DB record.
const plan: any = {
  totalBudgetUserVND: 1_000_000, totalEstimatedCostVND: 1_300_000,
  costDifferenceVND: -300_000, budgetStatus: 'over_budget', budgetAdvice: 'old advice',
  days: [
    { dayNumber: 1, lodgingEstimatedCostVND: 600_000, dayEstimatedCostVND: 950_000,
      activities: [{ id: 'lunch', estimatedCostVND: 150_000 }, { id: 'dinner', estimatedCostVND: 200_000 }] },
    { dayNumber: 2, lodgingEstimatedCostVND: 0, dayEstimatedCostVND: 350_000,
      activities: [{ id: 'lunch2', estimatedCostVND: 150_000 }, { id: 'dinner2', estimatedCostVND: 200_000 }] },
  ],
};
let passed = 0;
let failed = 0;
const check = (name: string, run: () => void) => {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error: any) { failed++; console.error(`FAIL ${name}: ${error.message}`); }
};
check('delete lunch subtracts only 150000, retaining 600000 lodging and group totals', () => {
  const changed = removePlannerActivity(plan, 1, 'lunch');
  assert.equal(changed.days[0].dayEstimatedCostVND, 800_000);
  assert.equal(changed.totalEstimatedCostVND, 1_150_000);
  assert.equal(changed.costDifferenceVND, -150_000);
  assert.equal(changed.budgetStatus, 'over_budget');
  assert.notEqual(changed.budgetAdvice, 'old advice');
});
check('delete all optional activities retains accommodation cost and updates budget advice', () => {
  const changed = removePlannerActivity(removePlannerActivity(plan, 1, 'lunch'), 1, 'dinner');
  assert.equal(changed.days[0].dayEstimatedCostVND, 600_000);
  assert.equal(changed.totalEstimatedCostVND, 950_000);
  assert.equal(changed.costDifferenceVND, 50_000);
  assert.equal(changed.budgetStatus, 'within_budget');
  assert.notEqual(changed.budgetAdvice, 'old advice');
});
check('reorder does not lose, duplicate or reprice lodging; subsequent delete remains correct', () => {
  const changed = movePlannerActivity(plan, 1, 0, 'down');
  assert.deepEqual(changed.days[0].activities.map((activity: any) => activity.id), ['dinner', 'lunch']);
  assert.equal(changed.totalEstimatedCostVND, 1_300_000);
  assert.equal(changed.days[0].lodgingEstimatedCostVND, 600_000);
  assert.equal(removePlannerActivity(changed, 1, 'lunch').totalEstimatedCostVND, 1_150_000);
  assert.equal(plan.days[0].activities[0].id, 'lunch');
});
check('repeated deletion and invalid move are idempotent', () => {
  const changed = removePlannerActivity(plan, 1, 'lunch');
  assert.deepEqual(removePlannerActivity(changed, 1, 'lunch'), changed);
  assert.equal(movePlannerActivity(plan, 1, 0, 'up'), plan);
});
check('zero-cost hotel marker is not charged twice or coupled to the lodging subtotal', () => {
  const withMarker = { ...plan, days: [
    { ...plan.days[0], activities: [...plan.days[0].activities, { id: 'hotel-reference', estimatedCostVND: 0 }] }, plan.days[1],
  ] };
  const changed = removePlannerActivity(withMarker, 1, 'hotel-reference');
  assert.equal(changed.totalEstimatedCostVND, 1_300_000);
  assert.equal(changed.days[0].lodgingEstimatedCostVND, 600_000);
});
check('a day trip stays free of overnight costs after deleting its last activity', () => {
  const dayTrip = { ...plan, totalEstimatedCostVND: 150_000, days: [
    { dayNumber: 1, lodgingNights: 0, lodgingEstimatedCostVND: 0, dayEstimatedCostVND: 150_000,
      activities: [{ id: 'lunch', estimatedCostVND: 150_000 }] },
  ] } as any;
  const changed = removePlannerActivity(dayTrip, 1, 'lunch');
  assert.equal(changed.totalEstimatedCostVND, 0);
  assert.equal(changed.costDifferenceVND, 1_000_000);
});
console.log(JSON.stringify({ suite: 'planner-cost-editing', passed, failed }));
process.exitCode = failed ? 1 : 0;
