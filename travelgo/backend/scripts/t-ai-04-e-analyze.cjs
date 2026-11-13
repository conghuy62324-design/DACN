// Read-only analyzer for the partial T-AI-04-E diagnostic run. No POST, tools, or database.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const run = path.join(root, 'docs/evidence/t-ai-04-e-controlled-format-safety/run-20261109T035122286Z-4601e49c');
const evidence = path.dirname(run);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const load = file => JSON.parse(fs.readFileSync(path.join(run, file)));
const lock = JSON.parse(fs.readFileSync(path.join(evidence, 'manifest-lock.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(evidence, 'manifest-approved.json')));
const results = load('results.json'), plan = load('request-plan.json');
assert.equal(results.manifestSha256, lock.approvedSha256);
assert.equal(results.model, manifest.model);
assert.deepEqual(results.cases.map(c => c.id), lock.order);
assert.equal(results.attempts, 7); assert.equal(results.notRun, 1);
assert.equal(results.stopReason, 'TIME_GATE_BLOCKED');
const attempts = fs.readdirSync(run).filter(x => /^attempt-E0[1-4]-[BC]\.json$/.test(x));
assert.equal(attempts.length, 7);
for (const item of results.cases.filter(c => c.status !== 'NOT RUN')) {
  const attempt = load(`attempt-${item.id}.json`);
  assert.equal(attempt.id, item.id);
  assert.equal(attempt.principalId, results.principalId);
  assert.equal(attempt.requestSha256, item.requestSha256);
  assert.equal(item.toolExecutions, 0);
  assert.equal(item.databaseAccess, 'NONE');
}
const paired = plan.pairs.map(p => {
  const B = load(`${p.id}-B-request.json`), C = load(`${p.id}-C-request.json`);
  const without = value => { const copy = structuredClone(value); delete copy.format; return copy; };
  assert.deepEqual(without(B), without(C));
  assert.equal(sha(Buffer.from(JSON.stringify(without(B)))), p.commonBodySha256);
  assert.equal(B.format, 'json'); assert.equal(typeof C.format, 'object');
  return { id: p.id, onlyDifference: 'format', commonBodySha256: p.commonBodySha256,
    systemSha256: p.systemSha256, messagesSha256: p.messagesSha256 };
});
const executed = results.cases.filter(c => c.status !== 'NOT RUN');
const variant = label => { const rows = executed.filter(c => c.variant === label);
  return { executed: rows.length, pass: rows.filter(c => c.status === 'PASS').length,
    fail: rows.filter(c => c.status === 'FAIL').length, notRun: 4 - rows.length,
    jsonValid: rows.filter(c => c.jsonValid).length, originalSchemaValid: rows.filter(c => c.originalSchemaValid).length,
    runtimeValid: rows.filter(c => c.runtimeValid).length, semanticCorrect: rows.filter(c => c.semanticCorrect).length }; };
const latencies = executed.map(c => c.latencyMs).sort((a, b) => a - b);
const tokens = { prompt: executed.reduce((n, c) => n + c.promptTokens, 0), output: executed.reduce((n, c) => n + c.outputTokens, 0) };
const out = { status: 'TIME_GATE_BLOCKED_PARTIAL', approvedPosts: 8, actualPosts: 7, remaining: ['E04-B'],
  model: manifest.model, modelDigest: manifest.modelDigest, manifestSha256: lock.approvedSha256,
  schemaCSha256: lock.diagnosticSchemaSha256, order: lock.order, paired,
  totals: { pass: results.pass, fail: results.fail, notRun: results.notRun, jsonValid: executed.filter(c => c.jsonValid).length,
    originalSchemaValid: executed.filter(c => c.originalSchemaValid).length, runtimeValid: executed.filter(c => c.runtimeValid).length,
    http200: executed.filter(c => c.httpStatus === 200).length },
  B: variant('B'), C: variant('C'),
  latencyMs: { min: latencies[0], median: latencies[Math.floor(latencies.length / 2)], max: latencies.at(-1),
    mean: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) },
  tokens, sourceIntegrityBefore: load('source-integrity-before.json'), sourceIntegrityAfter: load('source-integrity-after.json'),
  rateGate: { checkedAt: load('rate-gate-stop.json').checkedAt, recentCount: load('rate-gate-stop.json').recentCount,
    maxPerHour: 20, nextSlotAt: load('rate-gate-stop.json').nextSlotAt },
  toolExecutions: 0, databaseAccess: 'NONE', browserExecutions: 0 };
assert.equal(out.sourceIntegrityBefore.status, 'PASS'); assert.equal(out.sourceIntegrityAfter.status, 'PASS');
fs.writeFileSync(path.join(run, 'analysis.json'), JSON.stringify(out, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(out, null, 2));
