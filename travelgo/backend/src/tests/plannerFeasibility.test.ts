import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import app from '../app.js';
import { PlaceRepository } from '../repositories/placeRepository.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { TourPlannerService } from '../services/tourPlannerService.js';
import { prepareTripSnapshot } from '../utils/tripSnapshot.js';

// Real HTTP route/controller/error middleware, synthetic catalog; no DB connection.
async function main() {
  const spec = JSON.parse(await readFile('src/evaluation/t11b_scenarios_v3.json', 'utf8'));
  const catalog = spec.catalog;
  const input = spec.plannerBase;
  const originalList = PlaceRepository.list;
  const server = await new Promise<Server>(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const api = async (patch = {}) => {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/tours/plan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...input, ...patch }),
    });
    return { status: response.status, body: await response.json() as any };
  };
  let passed = 0;
  try {
    RecommendationRepository.useLoaderForTests(async () => catalog);
    const high = await api(); const low = await api({ totalBudget: 100000 });
    assert.equal(high.status, 200); assert.equal(low.status, 200);
    const a = high.body.data; const b = low.body.data;
    assert.equal(b.totalEstimatedCostVND, 750000);
    assert.equal(b.overBudgetVND, 650000);
    assert.equal(b.budgetStatus, 'over_budget');
    assert.deepEqual(b.constraintViolations, ['BUDGET_EXCEEDED']);
    const amounts = (p: any) => p.days.flatMap((d: any) => d.activities.map((v: any) => [v.placeId, v.estimatedCostVND]));
    assert.deepEqual(amounts(a), amounts(b)); passed++;
    // New provenance and derived fields are accepted when saving a generated plan.
    const snapshot = prepareTripSnapshot(b);
    assert.equal(snapshot.estimatedCostVND, 750000);
    assert.equal((snapshot.itinerary[0] as any).activities[0].costSource, b.days[0].activities[0].costSource); passed++;
    RecommendationRepository.useLoaderForTests(async () => []);
    const empty = await api();
    assert.equal(empty.status, 422); assert.equal(empty.body.code, 'NO_SIGHTSEEING_FOR_DESTINATION');
    assert.equal(empty.body.success, false); assert.equal(empty.body.data, undefined); passed++;
    RecommendationRepository.useLoaderForTests(async () => { throw new Error('Synthetic DB offline'); });
    const broken = await api();
    assert.equal(broken.status, 500); assert.notEqual(broken.body.code, 'NO_SIGHTSEEING_FOR_DESTINATION'); passed++;
    // Exercise the actual repository serialization boundary: null must not become free.
    for (const [raw, amount, available] of [[null, 300000, false], [undefined, 300000, false], ['', 300000, false], [' ', 300000, false], [false, 300000, false], [-1, 300000, false], [NaN, 300000, false], ['0', 0, true], [0, 0, true]] as const) {
      (PlaceRepository.list as any) = async () => ({ items: [{ ...catalog[0], priceFrom: raw }], pages: 1 });
      RecommendationRepository.resetLoader();
      const loaded = await RecommendationRepository.getApprovedPlaces();
      assert.equal(loaded[0].catalogPriceAvailable, available);
      const plan = await TourPlannerService.generateSmartItinerary({ ...input, totalBudget: 1 });
      const activity = plan.days[0].activities.find(v => v.category === 'sightseeing')!;
      assert.equal(activity.estimatedCostVND, amount);
      assert.match(activity.costSource!, available ? /Catalog priceFrom/ : /Giả định planner T11-B/);
      passed++;
    }
    console.log(JSON.stringify({ suite: 'planner-feasibility-http-and-repository', passed, failed: 0, database: 'NOT USED' }));
  } finally {
    PlaceRepository.list = originalList; RecommendationRepository.resetLoader();
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
