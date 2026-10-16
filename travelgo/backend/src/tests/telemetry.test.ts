import assert from 'node:assert/strict';
import { enforceTelemetryRateLimit, resetTelemetryRateLimitState, validateClientTelemetry } from '../services/telemetryService.js';
import { HttpError } from '../utils/httpError.js';

const id = '11111111-1111-4111-8111-111111111111';
const base = {
  contractVersion: '1.0', clientEventId: id, sessionId: 'session-unit-123', itemId: '22222222-2222-4222-8222-222222222222',
  itemType: 'place', eventType: 'VIEW', occurredAt: new Date().toISOString(), uiSurface: 'place_detail', context: { dwellMs: 2000 },
};

const valid = validateClientTelemetry(base);
assert.equal(valid.contractVersion, '1.0');
assert.equal(valid.context.dwellMs, 2000);

for (const [name, payload, code] of [
  ['identity spoof', { ...base, userId: id }, 'SPOOFED_SERVER_FIELD'],
  ['environment spoof', { ...base, environment: 'production' }, 'SPOOFED_SERVER_FIELD'],
  ['short view', { ...base, context: { dwellMs: 1999 } }, 'VIEW_DWELL_TOO_SHORT'],
  ['raw GPS/context field', { ...base, context: { dwellMs: 2000, latitude: 16.05 } }, 'INVALID_CONTEXT'],
  ['client booking event', { ...base, eventType: 'BOOKING_CREATED' }, 'INVALID_EVENT_TYPE'],
  ['client favorite outcome', { ...base, eventType: 'FAVORITE', context: {} }, 'USE_FAVORITES_API'],
] as const) {
  assert.throws(() => validateClientTelemetry(payload), (error: unknown) => {
    assert.ok(error instanceof HttpError, name);
    assert.equal(error.code, code, name);
    return true;
  });
}

resetTelemetryRateLimitState();
for (let index = 0; index < 120; index += 1) enforceTelemetryRateLimit('rate-limit-user', 1_000);
assert.throws(() => enforceTelemetryRateLimit('rate-limit-user', 1_000), (error: unknown) => {
  assert.ok(error instanceof HttpError);
  assert.equal(error.code, 'TELEMETRY_RATE_LIMIT');
  return true;
});
resetTelemetryRateLimitState();

console.log(JSON.stringify({ result: 'PASS', checks: 9, suite: 'telemetry-contract-unit' }, null, 2));
