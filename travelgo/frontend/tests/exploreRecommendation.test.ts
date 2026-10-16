import assert from 'node:assert/strict';
import {
  buildExploreRecommendationInput,
  recommendationFallbackMessage,
  recommendationReasonLabels,
  validateDailyBudget,
} from '../src/utils/exploreRecommendation.ts';

let checks = 0;
const check = (name: string, run: () => void) => {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
};

check('budget validation accepts empty/valid VND and rejects malformed or unsafe limits', () => {
  assert.deepEqual(validateDailyBudget(''), { valid: true, value: 0 });
  assert.deepEqual(validateDailyBudget('1500000'), { valid: true, value: 1_500_000 });
  assert.equal(validateDailyBudget('1.500.000').valid, false);
  assert.equal(validateDailyBudget('10000').valid, false);
  assert.equal(validateDailyBudget('100000001').valid, false);
});

check('request payload keeps two explicit preferences, budget and supported filters', () => {
  assert.deepEqual(buildExploreRecommendationInput({
    category: 'restaurant', city: 'Đà Nẵng', search: ' hải sản ', minRating: 4.5,
    preferences: ['am-thuc', 'nghi-duong'], dailyBudgetPerPerson: 800_000,
  }), {
    uiSurface: 'explore_results',
    filters: { category: 'restaurant', destinationCity: 'Đà Nẵng', search: 'hải sản', minRating: 4.5 },
    explicitPreferences: ['am-thuc', 'nghi-duong'], dailyBudgetPerPerson: 800_000, limit: 20,
  });
});

check('reason chips only map evidence codes supplied by the server and cap at three', () => {
  assert.deepEqual(recommendationReasonLabels([
    'NEAR_FILTERED_CANDIDATE_CENTROID_AERIAL', 'HIGH_BAYESIAN_QUALITY',
    'PREFERENCE_MATCH', 'ESTIMATED_PRICE_FROM_BUDGET_FIT', 'UNKNOWN',
  ]), ['Hợp sở thích', 'Hợp ngân sách ước tính', 'Bayesian uy tín']);
  assert.deepEqual(recommendationReasonLabels(['BALANCED_BASELINE']), []);
});

check('fallback warning is shown only for typed destination fallback', () => {
  assert.match(recommendationFallbackMessage({ applied: true, code: 'NO_DESTINATION_MATCH', requestedDestination: 'Huế' }) || '', /Huế/);
  assert.equal(recommendationFallbackMessage({ applied: false, code: null }), undefined);
});

console.log(JSON.stringify({ result: 'PASS', checks, suite: 'm3c-explore-ui-unit' }, null, 2));
