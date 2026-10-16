import assert from 'node:assert/strict';
import { RecommendationExposureService } from '../services/recommendationExposureService.js';
import { RecommendationService } from '../services/recommendationService.js';

type FixtureOverrides = Record<string, unknown>;

function place(id: string, overrides: FixtureOverrides = {}): any {
  return {
    id,
    businessId: null,
    status: 'APPROVED',
    name: `Place ${id}`,
    slug: `place-${id}`,
    category: 'attraction',
    summary: 'Điểm tham quan yên tĩnh',
    description: 'Không gian tham quan',
    city: 'Đà Nẵng',
    province: 'Đà Nẵng',
    address: 'Đà Nẵng',
    latitude: 16,
    longitude: 108,
    priceFrom: 100_000,
    rating: 4.5,
    reviewCount: 20,
    bayesianRating: 4.4,
    heroImage: 'https://example.test/place.jpg',
    galleryImages: [],
    highlights: [],
    amenities: [],
    isFeatured: false,
    openingHours: {},
    contactInfo: {},
    ...overrides,
  };
}

const failures: string[] = [];
let checks = 0;

function golden(name: string, run: () => void): void {
  checks += 1;
  try {
    run();
    console.log(`PASS ${name}`);
  } catch (error) {
    failures.push(name);
    console.error(`FAIL ${name}:`, error instanceof Error ? error.message : error);
  }
}

golden('city/category/search/minRating are applied before scoring', () => {
  const results = RecommendationService.recommendPlaces([
    place('low-rating', { category: 'hotel', name: 'Ocean Budget', rating: 3.5 }),
    place('wrong-category', { category: 'restaurant', name: 'Ocean View', rating: 4.9 }),
    place('wrong-search', { category: 'hotel', name: 'Mountain Hotel', rating: 4.9 }),
    place('match', { category: 'hotel', name: 'Ocean Hotel', rating: 4.8 }),
  ], {
    destinationCity: 'Đà Nẵng',
    preferences: [],
    dailyBudgetPerPerson: 500_000,
    category: 'hotel',
    search: 'ocean',
    minRating: 4.5,
  } as any);
  assert.deepEqual(results.map((result) => result.place.id), ['match']);
});

golden('distance uses filtered-candidate centroid, not first record', () => {
  const results = RecommendationService.recommendPlaces([
    place('b', { longitude: 110 }),
    place('a', { longitude: 106 }),
  ], { destinationCity: 'Đà Nẵng', preferences: [], dailyBudgetPerPerson: 500_000 });
  assert.equal(results[0].breakdown.distanceScore, results[1].breakdown.distanceScore);
  assert.deepEqual(results.map((result) => result.place.id), ['a', 'b']);
});

golden('no city match returns an explicitly labelled fallback', () => {
  const recommendForRequest = (RecommendationService as any).recommendForRequest;
  assert.equal(typeof recommendForRequest, 'function');
  const batch = recommendForRequest.call(RecommendationService, [place('a')], {
    filters: { destinationCity: 'Huế' },
    preferences: [],
    dailyBudgetPerPerson: 0,
    limit: 10,
  });
  assert.equal(batch.fallback.applied, true);
  assert.equal(batch.fallback.code, 'NO_DESTINATION_MATCH');
  assert.equal(batch.items.length, 1);
});

golden('SUSPENDED business is ineligible while a legacy null-business place remains eligible', () => {
  const results = RecommendationService.recommendPlaces([
    place('suspended', { businessId: 'business-1', business: { id: 'business-1', status: 'SUSPENDED' } }),
    place('legacy', { businessId: null, business: null }),
  ], { destinationCity: 'all', preferences: [], dailyBudgetPerPerson: 0 });
  assert.deepEqual(results.map((result) => result.place.id), ['legacy']);
});

golden('explanation never claims preference fit without a real match', () => {
  const [result] = RecommendationService.recommendPlaces(
    [place('a')],
    { destinationCity: 'all', preferences: ['Phiêu lưu'], dailyBudgetPerPerson: 0 },
  );
  assert.deepEqual(result.matchedPreferences, []);
  assert.equal(result.explanation.toLocaleLowerCase('vi-VN').includes('phù hợp sở thích'), false);
});

golden('equal inputs have deterministic finalScore/Bayesian/id ordering', () => {
  const query = { destinationCity: 'all', preferences: [], dailyBudgetPerPerson: 0 };
  const first = RecommendationService.recommendPlaces([place('b'), place('a')], query);
  const second = RecommendationService.recommendPlaces([place('a'), place('b')], query);
  assert.deepEqual(first.map((result) => result.place.id), ['a', 'b']);
  assert.deepEqual(second.map((result) => result.place.id), ['a', 'b']);
});

golden('breakdown reconstructs finalScore within six-decimal tolerance', () => {
  const [result] = RecommendationService.recommendPlaces(
    [place('a', { longitude: 108.123456 })],
    { destinationCity: 'all', preferences: ['du lịch biển'], dailyBudgetPerPerson: 470_000 },
  );
  const reconstructed =
    result.breakdown.qualityScore * 0.35 +
    result.breakdown.preferenceScore * 0.25 +
    result.breakdown.budgetScore * 0.25 +
    result.breakdown.distanceScore * 0.15;
  assert.ok(Math.abs(result.score - reconstructed) <= 0.000001);
});

golden('opt-out keeps one-shot scoring inputs but does not retain preference/budget detail', () => {
  const resolve = (RecommendationExposureService as any).resolveConsentAwareInputs;
  assert.equal(typeof resolve, 'function');
  const resolved = resolve({
    filters: { category: 'hotel' },
    explicitPreferences: ['Nghỉ dưỡng'],
    dailyBudgetPerPerson: 1_500_000,
  }, false);
  assert.deepEqual(resolved.scoringPreferences, ['Nghỉ dưỡng']);
  assert.equal(resolved.scoringDailyBudgetPerPerson, 1_500_000);
  assert.deepEqual(resolved.persistedPreferences, []);
  assert.deepEqual(resolved.persistedFilters, { category: 'hotel' });
});

if (failures.length) {
  console.error(JSON.stringify({ result: 'FAIL', checks, failures }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ result: 'PASS', checks }, null, 2));
}
