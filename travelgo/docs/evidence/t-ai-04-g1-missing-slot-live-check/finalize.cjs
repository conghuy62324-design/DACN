// Post-run evaluation/integrity. Only local GET /api/ps; never inference/DB.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), dir = 'docs/evidence/t-ai-04-g1-missing-slot-live-check';
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const local = name => json(dir + '/' + name);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const { checkToolProvenance } = require(path.join(root, 'backend/dist/agent/toolProvenance.js'));
const { classifyMissingReadSlots } = require(path.join(root, 'backend/dist/agent/missingSlotRecovery.js'));
const lock = local('manifest-lock.json'), plan = local('request-plan.json'), result = local('results.json');
assert.equal(sha(read(dir + '/manifest.json')), lock.manifestSha256);
assert.equal(sha(read(dir + '/request-plan.json')), lock.requestPlanSha256);
const before = local('integrity-before.json').hashes, after = {}, changes = [];
for (const [rel, hash] of Object.entries(before)) {
  after[rel] = fs.existsSync(path.join(root, rel)) ? sha(read(rel)) : null;
  if (after[rel] !== hash) changes.push({ path: rel, before: hash, after: after[rel] });
}
write('integrity-after.json', { at: new Date().toISOString(), status: changes.length ? 'FAIL' : 'PASS', filesCompared: Object.keys(before).length,
  changes, hashes: after, databaseAccess: 'NONE' });
assert.deepEqual(changes, []);
const cases = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06'].map(id => local(id + '.json'));
const attempts = cases.map(x => local('attempt-' + x.id + '.json'));
assert.equal(result.posts, 6); assert.equal(new Set(attempts.map(x => x.principalId)).size, 1);
assert.deepEqual(attempts.map(x => x.rateCountBefore), [6, 7, 8, 9, 10, 11]);
const exceptionNotes = [];
for (const [index, item] of cases.entries()) {
  assert.equal(item.requestBodySha256, plan.bodies.find(x => x.id === item.id).requestBodySha256);
  const file = item.id + '-provider-exception.json';
  if (fs.existsSync(path.join(__dirname, file))) {
    const captured = local(file);
    exceptionNotes.push({ id: item.id, exception: captured, presentInCaseSnapshot: item.providerException !== null,
      note: item.providerException === null
        ? 'Provider timeout rejection arrived after outer service deadline/case snapshot. Original wrapper file is retained; beforeServiceRecovery flag denotes wrapper boundary, not earlier-than-service-timeout timing. No validation output or recovery exists for this timeout.'
        : 'Original validation rejection captured in provider wrapper before service recovery; preserved in case snapshot.' });
    if (index < attempts.length - 1) assert.ok(Date.parse(captured.capturedAt) <= Date.parse(attempts[index + 1].at), 'Next POST preceded previous provider rejection');
  }
  if (item.rawModelDecision !== null) assert.equal(item.rawModelDecision, local(item.id + '-ollama-response.json').envelope.message.content);
}
write('exception-reconciliation.json', { status: 'APPENDED_WITHOUT_OVERWRITING_CASES', notes: exceptionNotes });
const observed = cases.filter(x => x.rawModelDecision !== null), sorted = cases.map(x => x.elapsedMs).sort((a,b) => a-b);
const recoveryProofs = cases.filter(x => x.recoveryApplied).map(x => {
  const typed = classifyMissingReadSlots(x.parsedModelDecision, x.request.message);
  assert.ok(typed); assert.deepEqual(typed.fields, x.serviceMissingFields);
  return { id: x.id, typedFields: typed.fields, diagnosticPartialGate: checkToolProvenance(x.parsedModelDecision, x.request.message),
    executionGate: x.gate.status, providerRejectedBeforeServiceRecovery: x.providerException?.beforeServiceRecovery === true,
    serviceStatus: x.serviceStatus, fakeToolCalls: x.fakeToolInvocationCount };
});
write('evaluation-summary.json', { at: new Date().toISOString(), status: 'LIVE_CHECK_COMPLETED_WITH_FAILURES', posts: 6, retries: 0, concurrency: 1,
  nluCaseResults: result.nlu, rawSemanticsAmongReturnedOutputs: { pass: observed.filter(x => x.nlu === 'PASS').length,
    fail: observed.filter(x => x.nlu === 'FAIL').length, notObservableDueToTimeout: cases.filter(x => x.rawModelDecision === null).length },
  originalSchema: { accepted: observed.filter(x => x.originalSchemaValid).length, rejected: observed.filter(x => !x.originalSchemaValid).length,
    notEvaluatedNoOutput: cases.length - observed.length }, validationEnforcement: result.validation, ux: result.ux,
  recovery: result.recovery, recoveryProofs, safety: result.safety, fakeToolCalls: cases.reduce((n,x) => n+x.fakeToolInvocationCount,0), realToolCalls: 0,
  observedTokensOnly: { prompt: observed.reduce((n,x) => n+x.tokens.prompt,0), output: observed.reduce((n,x) => n+x.tokens.output,0),
    casesWithUsage: observed.length, timeoutCaseTokens: 'UNKNOWN, NOT ZERO; no response envelope' },
  wallLatencyMs: { min: sorted[0], max: sorted.at(-1), median: (sorted[2]+sorted[3])/2,
    mean: cases.reduce((n,x) => n+x.elapsedMs,0)/cases.length }, timeouts: cases.filter(x => x.timeoutExceeded).length,
  rate: { principalId: attempts[0].principalId, recentHistoricalBefore: 6, taskAttempts: 6, countAtRunEnd: 12, attempts },
  limitations: ['No raw NLU/schema result for M01/M02 timeouts; locked end-to-end case scores remain FAIL',
    'Recovery UX LIVE exercised only for M03, not the missing-transportation cases',
    'Direct orchestrator, Agent HTTP NOT RUN; fake consent/executor; no real tool fidelity or DB'], databaseAccess: 'NONE' });
(async () => {
  const response = await fetch('http://127.0.0.1:11434/api/ps', { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(5000) });
  write('ollama-residency-after.json', { at: new Date().toISOString(), httpStatus: response.status, body: await response.json() });
  console.log(JSON.stringify({ integrity: 'PASS', files: Object.keys(before).length, posts: 6, nlu: result.nlu, validation: result.validation,
    ux: result.ux, recovery: result.recovery, safety: result.safety, observedPromptTokens: observed.reduce((n,x) => n+x.tokens.prompt,0), observedOutputTokens: observed.reduce((n,x) => n+x.tokens.output,0) }));
})().catch(error => { console.error(error); process.exitCode = 1; });
