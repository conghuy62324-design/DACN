// Approved maximum TWO native Ollama POSTs: conditional operator load + one production smoke.
// No retry, mock model, real tool or DB. Every POST has a write-once intent ledger before native fetch.
const c = require('./common.cjs');
const { createConfiguredProvider } = require(c.path.join(c.root, 'backend/dist/agent/liveProvider.js'));
const { AgentOrchestrator } = require(c.path.join(c.root, 'backend/dist/services/agentService.js'));
const { AgentLimits } = require(c.path.join(c.root, 'backend/dist/agent/limits.js'));
const { parseDecision, validateTool } = require(c.path.join(c.root, 'backend/dist/agent/tools.js'));
const { matchesDecisionSchema } = require(c.path.join(c.root, 'backend/dist/agent/decisionValidation.js'));
const { sequelize } = require(c.path.join(c.root, 'backend/dist/config/database.js'));
sequelize.query = async () => { throw Error('DB_FORBIDDEN_BY_TASK'); };
const nativeFetch = globalThis.fetch;
globalThis.fetch = async () => { throw Error('Only task allowlisted captured native transport may use network'); };
// Metadata uses the explicitly captured native transport via this read-only wrapper.
const controlledGetFetch = async (url, init) => {
  c.assert.equal(init?.method, 'GET'); c.assert.ok(['/api/version','/api/tags','/api/ps'].includes(new URL(String(url)).pathname));
  c.assert.equal(new URL(String(url)).origin, c.env.OLLAMA_BASE_URL); return nativeFetch(url, init);
};
globalThis.fetch = controlledGetFetch;
const lock = c.json('docs/evidence/t-ai-04-g1-readiness-controlled-check/manifest-lock.json');
const plan = c.json('docs/evidence/t-ai-04-g1-readiness-controlled-check/request-plan.json');
const body = name => c.read('docs/evidence/t-ai-04-g1-readiness-controlled-check/' + name).toString('utf8');
const requestBytes = { load: body(plan.preparation.bodyFile), smoke: body(plan.smoke.bodyFile) };
const trace = [], transport = [], captures = [], executed = [];
let phase = 'RC00', posts = 0, consentReads = 0, providerReturned = null, providerRejection = null;
let providerPromise = null;
const startAt = new Date().toISOString();
const logPath = c.path.join(process.env.LOCALAPPDATA, 'Ollama/server.log');
const logBefore = c.fs.existsSync(logPath) ? c.fs.readFileSync(logPath) : Buffer.alloc(0);
const summary = { task: plan.task, startedAt: startAt, status: 'BLOCKED', approvedMaxPosts: 2, principalHash: c.principalHash,
  preparation: { status: 'NOT RUN' }, guard: { status: 'NOT RUN' }, smoke: { status: 'NOT RUN', rawNlu: 'NOT EVALUATED' },
  databaseAccess: 'NONE', realToolCalls: 0, browserE2E: 'NOT RUN', benchmark: 'NOT RUN' };
const safeError = e => ({ code: e.code || e.name || 'ERROR', statusCode: e.statusCode || null, type: e.constructor?.name || null });
function verifyLocks() {
  c.assert.equal(c.sha(c.read('docs/evidence/t-ai-04-g1-readiness-controlled-check/request-plan.json')), lock.requestPlanSha256);
  c.assert.equal(c.sha(requestBytes.load), lock.operatorLoadBodySha256); c.assert.equal(c.sha(requestBytes.smoke), lock.applicationBodySha256);
  for (const item of c.json('docs/evidence/t-ai-04-g1-readiness-abort-guard-fix/protected-hashes.json').changed)
    c.assert.equal(c.sha(c.read(item.file)), item.after);
  for (const item of c.json('docs/evidence/t-ai-04-g1-readiness-abort-guard-fix/protected-hashes.json').protectedHashes)
    c.assert.equal(c.sha(c.read(item.file)), item.after);
  c.noProxy();
}
function ledger(id, kind, postAttempt, endpoint, sha256) {
  const rate = c.rate(); c.assert.ok(rate.remainingConservativeSlots > 0); c.assert.equal(rate.futureDatedEntries.length, 0);
  const current = c.fs.readdirSync(c.evidence).filter(x => /^attempt-.*\.json$/.test(x)).map(x => c.json('docs/evidence/t-ai-04-g1-readiness-controlled-check/' + x));
  const alreadyPosts = current.filter(x => x.postAttempt).length;
  if (postAttempt) { c.assert.ok(alreadyPosts < 2); c.assert.ok(posts < 2); }
  const item = { id, kind, postAttempt, at: new Date().toISOString(), principalHash: c.principalHash, principalSource: c.principalSource,
    endpoint, requestBodySha256: sha256, requestPlanSha256: lock.requestPlanSha256, conservativeRecentBefore: rate.recent.length,
    taskPostsBefore: alreadyPosts, maxTaskPosts: 2, accounting: kind === 'operator_load_only' ? 'Direct operator POST outside AgentLimits; task cap and conservative ledger enforced' : 'Normal same-principal AgentOrchestrator/AgentLimits turn' };
  c.write(`attempt-${id}.json`, item);
  if (postAttempt) posts++;
  return item;
}
async function captureBody(response, id) {
  const reader = response.body?.getReader(), chunks = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength; if (size > 65536) { await reader.cancel(); throw Error('CAPTURE_TOO_LARGE'); } chunks.push(value);
    }
    const rawBody = Buffer.concat(chunks).toString('utf8'); let envelope = null;
    try { envelope = JSON.parse(rawBody); } catch { /* Invalid actual JSON retained, not repaired. */ }
    c.write(`${id}-ollama-response.json`, { at: new Date().toISOString(), httpStatus: response.status, rawBody, envelope });
    return envelope;
  } catch (e) { c.write(`${id}-response-capture-error.json`, safeError(e)); return null; }
  finally { reader?.releaseLock(); }
}
const fetcher = async (url, init) => {
  const endpoint = String(url), method = init.method;
  c.assert.equal(new URL(endpoint).origin, c.env.OLLAMA_BASE_URL); c.assert.equal(init.redirect, 'error');
  c.assert.ok(method === 'GET' && ['/api/version','/api/tags','/api/ps'].includes(new URL(endpoint).pathname) || method === 'POST' && endpoint === plan.smoke.endpoint);
  if (method === 'POST') {
    c.assert.equal(phase, 'RC01', 'Cold guard must never dispatch an inference');
    verifyLocks(); c.assert.equal(String(init.body), requestBytes.smoke, 'Exact locked production body mismatch');
    c.assert.ok(trace.some(x => x.phase === phase && x.event === 'readiness_verified'));
    ledger('RC01', 'application_inference', true, endpoint, c.sha(String(init.body)));
  }
  const started = performance.now(), item = { phase, method, endpoint, startedAt: new Date().toISOString() }; transport.push(item);
  init.signal.addEventListener('abort', () => { item.abortObservedAt = new Date().toISOString(); }, { once: true });
  try {
    const response = await nativeFetch(url, init); item.httpStatus = response.status;
    if (method === 'POST') captures.push(captureBody(response.clone(), 'RC01'));
    return response;
  } catch (e) { item.error = safeError(e); throw e; }
  finally { item.fetchSettledAt = new Date().toISOString(); item.fetchElapsedMs = performance.now()-started; }
};
function readAppOutcome(response, error, elapsedMs) {
  return { at: new Date().toISOString(), status: error ? 'ERROR' : response?.status || 'UNKNOWN', serviceResponse: response || null,
    error: error ? safeError(error) : null, elapsedMs, apiHttpStatus: 'NOT RUN: direct production orchestrator; service error statusCode recorded separately',
    providerDecision: providerReturned, providerRejection, fakeToolInvocations: executed.length, realToolInvocations: 0 };
}
async function main() {
  c.write('run-marker.json', { at: startAt, noRetry: true, maxPosts: 2 }); verifyLocks();
  const before = await c.preflight('preflight-run.json');
  if (before.status !== 'PASS') { summary.blocker = before.reason; return; }
  const limits = new AgentLimits(); // Production defaults, one instance for cold probe and smoke.
  // Respect historical consumption conservatively; never reset/switch principal to get a slot.
  for (const ignored of before.rate.recent) limits.consume(c.principal);
  const real = createConfiguredProvider(c.env, fetcher, event => trace.push({ phase, ...event }));
  c.assert.equal(real.configured, true); c.assert.equal(real.external, false);
  const provider = { configured: true, external: false, generate: (input, signal) => {
    providerPromise = real.generate(input, signal).then(value => { providerReturned = value; return value; }, error => { providerRejection = safeError(error); throw error; });
    return providerPromise;
  } };
  const service = new AgentOrchestrator({ provider, limits, readConsent: async () => { consentReads++; return { personalizationEnabled: false }; },
    tools: { execute: async decision => { executed.push(decision); throw Error('REAL_TOOLS_FORBIDDEN_BY_TASK'); } } });
  const user = { id: c.principal, roles: ['CUSTOMER'] };
  if (!before.metadata.resident) {
    ledger('RC00-GUARD', 'agent_readiness_turn_no_post', false, plan.smoke.endpoint, null);
    let coldError, coldResponse; const started = performance.now();
    try { coldResponse = await service.chat(user, plan.smoke.request); } catch (e) { coldError = e; }
    const outcome = readAppOutcome(coldResponse, coldError, performance.now()-started);
    summary.guard = { ...outcome, status: coldError?.code === 'AGENT_OLLAMA_NOT_READY' && posts === 0 && executed.length === 0 && trace.some(x => x.event === 'model_not_resident') ? 'PASS' : 'FAIL',
      modelResident: false, inferencePosts: posts, rawNlu: 'NOT EVALUATED' };
    c.write('cold-guard-result.json', summary.guard);
    if (summary.guard.status !== 'PASS') { summary.status = 'FAIL'; summary.blocker = 'Cold guard did not produce expected safe nonresident result'; return; }
    const pre = await c.preflight('preflight-before-load.json');
    if (pre.status !== 'PASS' || pre.metadata.resident) { summary.blocker = pre.reason || 'Unexpected residency change before locked operator preparation'; return; }
    phase = 'RC-LOAD'; verifyLocks();
    ledger('RC-LOAD', 'operator_load_only', true, plan.preparation.endpoint, c.sha(requestBytes.load));
    const startedLoad = performance.now(); let response, envelope, error;
    const signal = AbortSignal.timeout(plan.preparation.timeoutMs), item = { phase, method: 'POST', endpoint: plan.preparation.endpoint, startedAt: new Date().toISOString() }; transport.push(item);
    signal.addEventListener('abort', () => { item.abortObservedAt = new Date().toISOString(); }, { once: true });
    try {
      response = await nativeFetch(plan.preparation.endpoint, { method: 'POST', redirect: 'error', signal, headers: { 'Content-Type': 'application/json' }, body: requestBytes.load });
      item.httpStatus = response.status; item.fetchSettledAt = new Date().toISOString();
      envelope = await captureBody(response, 'RC-LOAD');
    } catch (e) { error = safeError(e); item.fetchSettledAt ||= new Date().toISOString(); }
    item.elapsedMs = performance.now()-startedLoad;
    const after = { resources: c.resources(), metadata: await c.metadata() }; c.write('post-preparation-readiness.json', after);
    summary.preparation = { status: !error && response?.status === 200 && envelope?.done === true && envelope?.done_reason === 'load' && envelope?.response === '' &&
      (!envelope.eval_count || envelope.eval_count === 0) && after.metadata.ready ? 'PASS' : 'FAIL', httpStatus: response?.status || null, error,
      elapsedMs: item.elapsedMs, serverLoadMs: envelope?.load_duration === undefined ? null : envelope.load_duration/1e6,
      generatedTokens: envelope?.eval_count ?? null, promptTokens: envelope?.prompt_eval_count ?? null, nlu: 'NOT EVALUATED',
      taskPosts: posts, operatorDeadlineMs: plan.preparation.timeoutMs, applicationDeadlineMs: 15000, outsideAgentLimits: true };
    c.write('preparation-result.json', summary.preparation);
    if (summary.preparation.status !== 'PASS') { summary.status = 'FAIL'; summary.blocker = 'Operator preparation or residency verification failed; no second POST'; return; }
  } else {
    summary.guard = { status: 'NOT RUN', reason: 'Model already resident; no unload or cold-state fabrication permitted' };
    summary.preparation = { status: 'SKIPPED', reason: 'Already resident; no unnecessary load POST' };
    if (!before.metadata.ready) { summary.blocker = 'Resident model has incompatible metadata/context; no preparation or bypass'; return; }
  }
  const pre = await c.preflight('preflight-before-smoke.json', true);
  if (pre.status !== 'PASS') { summary.blocker = pre.reason; return; }
  phase = 'RC01'; providerReturned = null; providerRejection = null;
  let response, error; const startedSmoke = performance.now();
  try { response = await service.chat(user, plan.smoke.request); } catch (e) { error = e; }
  const elapsedMs = performance.now()-startedSmoke;
  const outcome = readAppOutcome(response, error, elapsedMs); c.write('smoke-orchestrator-result.json', outcome);
  // Provider promise may settle after service timeout. Observe it without allowing late tool execution.
  const settled = await Promise.race([providerPromise.then(() => true, () => true), new Promise(r => { const timer = setTimeout(() => r(false), 3000); timer.unref(); })]);
  const captured = await Promise.all(captures); const envelope = captured[0] || null, raw = envelope?.message?.content ?? null;
  let parsed = null, jsonValid = false, schemaValid = null, runtimeValid = null;
  if (raw !== null) { try { parsed = JSON.parse(raw); jsonValid = true; schemaValid = matchesDecisionSchema(parsed); const decision = parseDecision(parsed);
    runtimeValid = decision.kind !== 'tool' || validateTool(decision).missing.length === 0; } catch { runtimeValid = false; } }
  const exactExpected = parsed?.kind === 'unsupported' && Object.keys(parsed).length === 1;
  const phaseTrace = trace.filter(x => x.phase === phase), deadline = phaseTrace.some(x => x.event === 'deadline_triggered' || x.event === 'abort_propagated');
  const nlu = raw === null ? 'NOT EVALUATED' : jsonValid && schemaValid && runtimeValid && exactExpected ? 'PASS' : 'FAIL';
  summary.smoke = { ...outcome, status: !error && nlu === 'PASS' && response?.status === 'unsupported' && executed.length === 0 && !deadline &&
    phaseTrace.some(x => x.event === 'provider_completed') && envelope?.done === true && envelope?.done_reason === 'stop' ? 'PASS' : 'FAIL',
    rawNlu: nlu, rawDecision: raw, parsedDecision: parsed, expected: plan.smoke.expected, jsonValid, originalSchemaValid: schemaValid, runtimeValid,
    httpOllama: transport.find(x => x.phase === 'RC01' && x.method === 'POST')?.httpStatus ?? null, deadlineOrAbortObserved: deadline,
    providerSettledWithinObservation: settled, providerDecisionAfterSettlement: providerReturned, providerRejectionAfterSettlement: providerRejection,
    tokens: { prompt: envelope?.prompt_eval_count ?? null, output: envelope?.eval_count ?? null },
    durationsMs: { total: envelope?.total_duration === undefined ? null : envelope.total_duration/1e6, load: envelope?.load_duration === undefined ? null : envelope.load_duration/1e6,
      promptEval: envelope?.prompt_eval_duration === undefined ? null : envelope.prompt_eval_duration/1e6, eval: envelope?.eval_duration === undefined ? null : envelope.eval_duration/1e6 },
    resourcesAfter: c.resources(), metadataAfter: await c.metadata(), source: 'REAL_OLLAMA_PRODUCTION_PROVIDER_FAKE_CONSENT_EXECUTOR' };
  c.write('smoke-result.json', summary.smoke);
  summary.status = summary.smoke.status;
}
async function finish() {
  summary.finishedAt = new Date().toISOString(); summary.posts = posts; summary.consentReads = consentReads;
  summary.toolInvocationCount = executed.length; summary.rateAfter = c.rate();
  c.write('readiness-lifecycle-events.json', { trace, transport, posts, notes: ['fetch settlement is not proof of GPU cleanup', 'Only deliberate task technical input, no account data in prompts'] });
  c.write('rate-window-after.json', summary.rateAfter);
  if (c.fs.existsSync(logPath)) {
    const after = c.fs.readFileSync(logPath), privateLine = /server config|env=|api[_-]?key|password|secret|authorization|token=|messages=|prompt=|"content"|request body/iu;
    const suffix = after.length >= logBefore.length && after.subarray(0, logBefore.length).equals(logBefore) ? after.subarray(logBefore.length).toString('utf8') : after.toString('utf8');
    const lines = suffix.split(/\r?\n/).filter(line => !privateLine.test(line) && /GPU discovery|memory.*refresh|aborting load|Load failed|runner|waiting for|offload|CUDA|KV|buffer|VRAM|\[GIN\].*\/api\/(generate|chat)|level=WARN/iu.test(line))
      .map(line => line.replaceAll(process.env.USERPROFILE || 'NO_PROFILE', '<USERPROFILE>').slice(0,1200));
    c.write('ollama-log-window.json', { from: startAt, until: summary.finishedAt, baselineBytes: logBefore.length, afterBytes: after.length,
      baselineSha256: c.sha(logBefore), afterSha256: c.sha(after), sanitizedNewRows: lines, warningCount: lines.filter(x => /level=WARN|GPU discovery.*timeout/iu.test(x)).length,
      limitation: 'Native log append window correlated by time; no task correlation ID in server log; sensitive/config lines omitted' });
  }
  c.write('results.json', summary);
  console.log(JSON.stringify({ status: summary.status, posts: summary.posts, guard: summary.guard.status, preparation: summary.preparation.status,
    smoke: summary.smoke.status, rawNlu: summary.smoke.rawNlu, elapsedMs: summary.smoke.elapsedMs, tokens: summary.smoke.tokens, blocker: summary.blocker }));
}
main().catch(e => { summary.status = 'BLOCKED'; summary.blocker = safeError(e); }).finally(() => finish()).catch(e => { console.error(e.code || e.name); process.exitCode = 1; });
