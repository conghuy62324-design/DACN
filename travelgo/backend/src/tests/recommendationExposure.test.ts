import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import {
  RECOMMENDATION_CONTRACT_VERSION, VISIBILITY_RULE_VERSION,
  validateRecommendationRequest, validateVisibilityAcknowledgement,
} from '../services/recommendationExposureService.js';
import { HttpError } from '../utils/httpError.js';

const sessionId = 'recommendation-unit-session';
const request = validateRecommendationRequest({
  contractVersion: RECOMMENDATION_CONTRACT_VERSION, sessionId, uiSurface: 'explore_results',
  filters: { destinationCity: 'Hội An', category: 'hotel', minRating: 3 },
  explicitPreferences: ['am-thuc', 'van-hoa'], dailyBudgetPerPerson: 1_000_000, limit: 10,
});
assert.equal(request.limit, 10);
assert.deepEqual(request.explicitPreferences, ['am-thuc', 'van-hoa']);

const ack = validateVisibilityAcknowledgement({
  contractVersion: RECOMMENDATION_CONTRACT_VERSION, clientAckId: randomUUID(), requestId: randomUUID(),
  sessionId, itemId: randomUUID(), itemType: 'hotel', uiSurface: 'explore_results',
  visibilityRuleVersion: VISIBILITY_RULE_VERSION, visibleRatio: 0.5, dwellMs: 2000,
  visibleAt: new Date().toISOString(),
});
assert.equal(ack.visibilityRuleVersion, VISIBILITY_RULE_VERSION);

for (const [name, payload, code] of [
  ['server score spoof', { ...request, contractVersion: '1.0', score: 0.99 }, 'SPOOFED_SERVER_FIELD'],
  ['unknown preference', { contractVersion: '1.0', sessionId, uiSurface: 'explore_results', explicitPreferences: ['secret-preference'] }, 'UNSUPPORTED_PREFERENCE'],
  ['short dwell', { contractVersion: '1.0', clientAckId: randomUUID(), requestId: randomUUID(), sessionId, itemId: randomUUID(), itemType: 'hotel', uiSurface: 'explore_results', visibilityRuleVersion: VISIBILITY_RULE_VERSION, visibleRatio: 0.5, dwellMs: 1999, visibleAt: new Date().toISOString() }, 'INVALID_VISIBILITY'],
  ['client rank spoof', { contractVersion: '1.0', clientAckId: randomUUID(), requestId: randomUUID(), sessionId, itemId: randomUUID(), itemType: 'hotel', uiSurface: 'explore_results', visibilityRuleVersion: VISIBILITY_RULE_VERSION, visibleRatio: 0.5, dwellMs: 2000, visibleAt: new Date().toISOString(), rank: 1 }, 'SPOOFED_SERVER_FIELD'],
] as const) {
  assert.throws(() => name.includes('dwell') || name.includes('rank')
    ? validateVisibilityAcknowledgement(payload)
    : validateRecommendationRequest(payload), (error: unknown) => {
    assert.ok(error instanceof HttpError, name);
    assert.equal(error.code, code, name);
    return true;
  });
}

console.log(JSON.stringify({ result: 'PASS', checks: 6, suite: 'recommendation-exposure-unit' }, null, 2));

