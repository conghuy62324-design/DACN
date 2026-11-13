// Post-run read-only evaluation/audit. Only GET /api/ps; no inference or DB.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const dir = 'docs/evidence/t-ai-04-g1-slot-filling-live-revalidation';
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const local = name => json(dir + '/' + name);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const { parseDecision, validateTool } = require(path.join(root, 'backend/dist/agent/tools.js'));
const lock = local('manifest-lock.json'), plan = local('request-plan.json');
assert.equal(sha(read(dir + '/manifest.json')), lock.manifestSha256);
assert.equal(sha(read(dir + '/request-plan.json')), lock.requestPlanSha256);
const before = local('integrity-before.json').hashes;
const after = {}, changes = [];
for (const [rel, value] of Object.entries(before)) {
  after[rel] = fs.existsSync(path.join(root, rel)) ? sha(read(rel)) : null;
  if (after[rel] !== value) changes.push({ path: rel, before: value, after: after[rel] });
}
write('integrity-after.json', { at: new Date().toISOString(), status: changes.length ? 'FAIL' : 'PASS',
  filesCompared: Object.keys(before).length, changes, hashes: after, databaseAccess: 'NONE' });
assert.deepEqual(changes, []);
const results = ['S01', 'S02', 'S03', 'S04', 'S05', 'S06'].map(id => local(id + '.json'));
const attempts = results.map(x => local('attempt-' + x.id + '.json'));
assert.deepEqual(attempts.map(x => x.rateCountBefore), [4, 5, 6, 7, 8, 9]);
assert.equal(new Set(attempts.map(x => x.principalId)).size, 1);
for (const item of results) {
  assert.equal(item.requestBodySha256, plan.bodies.find(x => x.id === item.id).requestBodySha256);
  assert.equal(item.rawModelDecision, local(item.id + '-ollama-response.json').envelope.message.content);
}
const independentRuntime = results.map(item => {
  let parseAccepted = false, missingRequired = [], runtimeError = null;
  try {
    const parsed = parseDecision(item.parsedModelDecision); parseAccepted = true;
    if (parsed.kind === 'tool') missingRequired = validateTool(parsed).missing;
  } catch (error) { runtimeError = String(error.message || error); }
  return { id: item.id, originalSchemaValid: item.originalSchemaValid, parseAccepted,
    missingRequired, runtimeError, productionValidationChainPassed: item.runtimeValid,
    note: 'Standalone diagnostics only. Actual provider rejects failed Ajv schema before parseDecision/validateTool; no second inference or tool call.' };
});
const times = results.map(x => x.elapsedMs).sort((a,b) => a-b);
const summary = { at: new Date().toISOString(), posts: attempts.length, retries: 0, concurrency: 1,
  nlu: local('results.json').nlu, safety: local('results.json').safety,
  jsonPass: results.filter(x => x.jsonValid).length, schemaPass: results.filter(x => x.originalSchemaValid).length,
  productionRuntimePass: results.filter(x => x.runtimeValid).length, independentRuntime,
  promptTokens: results.reduce((n,x) => n + (x.tokens.prompt || 0), 0),
  outputTokens: results.reduce((n,x) => n + (x.tokens.output || 0), 0),
  latencyMs: { min: times[0], max: times.at(-1), median: (times[2] + times[3]) / 2,
    mean: results.reduce((n,x) => n+x.elapsedMs,0)/results.length },
  timeouts: results.filter(x => x.timeoutExceeded).length,
  fakeToolCalls: results.reduce((n,x) => n+x.fakeToolInvocationCount, 0), realToolCalls: 0,
  failure: { id: 'S01', classification: 'NLU_DECISION_AND_REQUIRED_ARGUMENT_CONTRACT', severity: 'P1 OPEN under TAI03B-B1-01',
    reason: 'Model returns tool without transportation, not expected clarify. No invented transportation this run. Correct Ajv rejection, 502 safe error, zero execution.' },
  verdict: 'SLOT-FILLING NLU STILL FAILING', principalId: attempts[0].principalId,
  historicalRollingHourAttemptsBeforeRun: 4, taskAttempts: 6, rollingCountAfterTask: 10, attempts,
  databaseAccess: 'NONE' };
write('evaluation-summary.json', summary);
(async () => {
  const response = await fetch('http://127.0.0.1:11434/api/ps', { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(5000) });
  write('ollama-residency-after.json', { at: new Date().toISOString(), httpStatus: response.status, body: await response.json() });
  console.log(JSON.stringify({ verdict: summary.verdict, posts: summary.posts, nlu: summary.nlu, safety: summary.safety,
    jsonPass: summary.jsonPass, schemaPass: summary.schemaPass, promptTokens: summary.promptTokens,
    outputTokens: summary.outputTokens, integrityFiles: Object.keys(before).length }));
})().catch(error => { console.error(error); process.exitCode = 1; });
