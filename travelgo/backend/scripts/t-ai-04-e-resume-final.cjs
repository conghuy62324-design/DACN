// T-AI-04-E-RESUME-FINAL: exactly one owner-approved E04-B POST to local Ollama.
// Old E run/evidence are read-only. No Agent tool adapter or database access.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const oldRoot = path.join(root, 'docs/evidence/t-ai-04-e-controlled-format-safety');
const oldRun = path.join(oldRoot, 'run-20261109T035122286Z-4601e49c');
const newRoot = path.join(root, 'docs/evidence/t-ai-04-e-final');
const run = path.join(newRoot, 'run-' + new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8));
const sha = b => createHash('sha256').update(b).digest('hex');
const read = file => fs.readFileSync(file);
const json = file => JSON.parse(read(file));
const write = (name, value) => fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const manifest = json(path.join(oldRoot, 'manifest-approved.json'));
const lock = json(path.join(oldRoot, 'manifest-lock.json'));
const oldResults = json(path.join(oldRun, 'results.json'));
const plan = json(path.join(oldRun, 'request-plan.json'));
const expectedSource = json(path.join(root, 'docs/evidence/t-ai-04-a-fix/source-integrity.json'));
const principal = json(path.join(root, 'docs/evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/rate-window.json')).principalId;
const requestFile = path.join(oldRun, 'E04-B-request.json');
const { DECISION_SCHEMA } = require('../dist/agent/decisionSchema.js');
const { parseDecision, validateTool } = require('../dist/agent/tools.js');
const { LIVE_LIMITS } = require('../dist/agent/liveProvider.js');
const { AgentLimits } = require('../dist/agent/limits.js');
const limits = new AgentLimits();
const eligibleAfter = Date.parse('2026-11-09T04:10:38.770Z');
let posts = 0, preflightPassed = false;
assert.equal(process.argv.includes('--live'), true, '--live required');
assert.equal(process.env.T_AI_04_E_FINAL_APPROVED, 'true', 'approval gate absent');
assert.equal(process.env.LLM_PROVIDER, 'ollama');
assert.equal(process.env.OLLAMA_MODEL, 'qwen3:4b-instruct-2507-q4_K_M');
assert.equal(process.env.OLLAMA_BASE_URL, 'http://127.0.0.1:11434');
assert.ok(!process.env.HTTP_PROXY && !process.env.HTTPS_PROXY && !process.env.ALL_PROXY && process.env.NODE_USE_ENV_PROXY !== '1');
assert.equal(LIVE_LIMITS.timeoutMs, 15000);
assert.equal(LIVE_LIMITS.inputTokens + LIVE_LIMITS.outputTokens + 2048, 16384);
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file, out); else out.push(file);
  }
  return out;
}
function oldEvidenceSnapshot() {
  const files = [
    ...walk(oldRoot),
    ...walk(path.join(root, 'docs/evidence/t-ai-04-e-resume-one')),
    ...walk(path.join(root, 'docs/evidence/t-ai-04-b-live-probe')),
    ...walk(path.join(root, 'docs/evidence/t-ai-04-c-decoder-investigation')),
    ...walk(path.join(root, 'docs/evidence/t-ai-04-d-decision-format-safety')),
    ...walk(path.join(root, 'docs/evidence/t-ai-03-b-v2-lock')),
    path.join(root, 'docs/HUGO_T_AI_04_E_CONTROLLED_FORMAT_SAFETY_REPORT.md'),
    path.join(root, 'docs/HUGO_T_AI_04_E_RESUME_ONE_REPORT.md'),
  ];
  return Object.fromEntries(files.sort().map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(read(file))]));
}
function sourceIntegrity() {
  const baseline = json(path.join(root, 'docs/evidence/t-ai-03-b-live-v2-b1/integrity-after.json')).hashes;
  const changed = [];
  for (const [rel, hash] of Object.entries(baseline)) {
    const file = path.join(root, rel), expected = expectedSource.selected[rel]?.after || hash;
    if (!fs.existsSync(file) || sha(read(file)) !== expected) changed.push(rel);
  }
  return { baselineFiles: Object.keys(baseline).length, changed, status: changed.length ? 'FAIL' : 'PASS' };
}
function attempts() {
  return walk(path.join(root, 'docs/evidence')).filter(file => path.basename(file).startsWith('attempt-') && file.endsWith('.json'))
    .flatMap(file => { try { const v = json(file), at = v.at || v.createdAt;
      return v.principalId === principal && Number.isFinite(Date.parse(at)) ? [{ id: v.id || path.basename(file), at,
        path: path.relative(root, file).replaceAll('\\', '/') }] : []; } catch { return []; } });
}
function rateWindow() {
  const now = Date.now(), all = attempts(), recent = all.filter(x => now >= Date.parse(x.at) && now - Date.parse(x.at) < 3600000);
  return { checkedAt: new Date(now).toISOString(), principalId: principal, recentCount: recent.length, maxPerHour: 20,
    recent: recent.sort((a, b) => a.at.localeCompare(b.at)) };
}
function hardware() {
  const p = spawnSync('nvidia-smi', ['--query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu',
    '--format=csv,noheader,nounits'], { encoding: 'utf8', timeout: 3000, windowsHide: true });
  assert.equal(p.status, 0, 'GPU telemetry unavailable');
  const [name, driver, total, used, free, utilization] = p.stdout.trim().split(',').map(x => x.trim());
  return { gpu: { name, driver, totalMiB: +total, usedMiB: +used, freeMiB: +free, utilizationPercent: +utilization },
    ram: { totalMiB: Math.round(os.totalmem() / 1048576), freeMiB: Math.round(os.freemem() / 1048576) } };
}
async function localGet(endpoint) {
  const response = await fetch('http://127.0.0.1:11434' + endpoint, { signal: AbortSignal.timeout(3000), redirect: 'error' });
  assert.equal(response.status, 200, `Ollama ${endpoint} unavailable`); return response.json();
}
function originalSchema(s, v) {
  if (s.anyOf) return s.anyOf.filter(branch => originalSchema(branch, v)).length === 1;
  if (s.enum && !s.enum.some(x => JSON.stringify(x) === JSON.stringify(v))) return false;
  if (s.type === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    if ((s.required || []).some(k => !Object.hasOwn(v, k))) return false;
    if (s.additionalProperties === false && Object.keys(v).some(k => !Object.hasOwn(s.properties || {}, k))) return false;
    return Object.entries(v).every(([k, x]) => !s.properties?.[k] || originalSchema(s.properties[k], x));
  }
  if (s.type === 'array') return Array.isArray(v) && v.length >= (s.minItems ?? 0) && v.length <= (s.maxItems ?? Infinity) && v.every(x => originalSchema(s.items, x));
  if (s.type === 'string') {
    if (typeof v !== 'string' || v.length < (s.minLength ?? 0) || v.length > (s.maxLength ?? Infinity)) return false;
    if (s.format === 'date') return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00.000Z')) && new Date(v + 'T00:00:00.000Z').toISOString().slice(0, 10) === v;
    if (s.format === 'uuid') return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    return true;
  }
  if (s.type === 'integer') return Number.isSafeInteger(v) && v >= (s.minimum ?? -Infinity);
  if (s.type === 'number') return typeof v === 'number' && Number.isFinite(v) && v >= (s.minimum ?? -Infinity) && v > (s.exclusiveMinimum ?? -Infinity);
  return true;
}
async function preflight() {
  const now = Date.now(); assert.ok(now > eligibleAfter, 'TIME_GATE_BLOCKED');
  assert.equal(principal, '9997f6db-bfa1-4377-96f3-5b5ea19dbf34');
  assert.equal(sha(read(path.join(oldRoot, 'manifest-approved.json'))), 'ebbbb9ad59ca4f699038a38698ded1d0d9f8d3d5285fcd817a8260cc4fc2f08c');
  assert.equal(lock.approvedSha256, 'ebbbb9ad59ca4f699038a38698ded1d0d9f8d3d5285fcd817a8260cc4fc2f08c');
  assert.equal(sha(read(requestFile)), '9792f568bcf3b86b69228f5d8eca7c3998e1aeda8804341e29ea22d6dd703403');
  assert.equal(sha(read(path.join(root, 'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json'))), lock.benchmarkV2Sha256);
  assert.equal(sha(read(path.join(root, 'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json'))), 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
  assert.equal(sha(read(path.join(root, 'docs/evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json'))), lock.diagnosticSchemaSha256);
  assert.equal(plan.manifestSha256, lock.approvedSha256);
  assert.deepEqual(plan.order, lock.order);
  const E04 = plan.pairs.find(x => x.id === 'E04'); assert.ok(E04);
  assert.equal(E04.requestBFileSha256, sha(read(requestFile)));
  const body = json(requestFile);
  assert.equal(body.model, manifest.model); assert.equal(body.format, 'json'); assert.equal(body.stream, false);
  assert.deepEqual(body.options, { temperature: 0, num_predict: 2048, num_ctx: 16384 });
  assert.equal(body.messages.at(-1).content, manifest.cases.find(x => x.id === 'E04').message);
  assert.deepEqual(manifest.cases.find(x => x.id === 'E04').expected, { kind: 'unsupported' });
  assert.equal(oldResults.attempts, 7); assert.equal(oldResults.pass, 3); assert.equal(oldResults.fail, 4); assert.equal(oldResults.notRun, 1);
  assert.deepEqual(oldResults.cases.filter(x => x.status !== 'NOT RUN').map(x => x.id), lock.order.slice(0, 7));
  const all = attempts(), E = all.filter(x => /^E0[1-4]-[BC]$/.test(x.id));
  assert.equal(E.length, 7); assert.equal(new Set(E.map(x => x.id)).size, 7);
  assert.ok(!all.some(x => x.id === 'E04-B'), 'E04-B attempt already exists');
  const rate = rateWindow(); assert.ok(rate.recentCount < 20, 'RATE_WINDOW_BLOCKED');
  const integrity = sourceIntegrity(); assert.equal(integrity.status, 'PASS', 'Source changed');
  const tags = await localGet('/api/tags'), model = tags.models?.find(m => m.name === manifest.model);
  assert.equal(model?.digest, manifest.modelDigest);
  const version = await localGet('/api/version'), ps = await localGet('/api/ps'), loaded = ps.models?.find(m => m.name === manifest.model), h = hardware();
  assert.match(h.gpu.name, /NVIDIA.*RTX 4060/i); assert.ok(h.ram.freeMiB >= 2048, 'RAM below 2GiB');
  assert.ok(h.gpu.freeMiB >= (loaded ? 512 : 5200), 'GPU headroom low');
  if (loaded) assert.ok(loaded.size_vram / loaded.size >= 0.9, 'Model not predominantly GPU resident');
  const before = oldEvidenceSnapshot();
  write('preflight.json', { status: 'PASS', checkedAt: new Date().toISOString(), eligibleAfter: new Date(eligibleAfter).toISOString(),
    principalId: principal, rate, priorEPosts: 7, e04BAttempts: 0,
    approvedManifestSha256: lock.approvedSha256, requestFileSha256: E04.requestBFileSha256,
    benchmarkV2Sha256: lock.benchmarkV2Sha256, benchmarkLockSha256: 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706',
    sourceIntegrity: integrity, ollama: { endpoint: '127.0.0.1:11434', version: version.version, model: model.name,
      digest: model.digest, sizeBytes: model.size, loaded: !!loaded, gpuRatio: loaded ? loaded.size_vram / loaded.size : null },
    hardware: h, requestOptions: body.options, requestFormat: body.format, timeoutMs: 15000,
    oldEvidenceFiles: Object.keys(before).length });
  write('old-evidence-before.json', before);
  return { body, before, model, rate };
}
async function runOne(body) {
  const now = Date.now(); assert.ok(now > eligibleAfter, 'TIME_GATE_BLOCKED');
  const rate = rateWindow(); assert.ok(rate.recentCount < 20 && !attempts().some(x => x.id === 'E04-B'), 'RATE_OR_DUPLICATE_BLOCKED');
  assert.equal(sha(read(requestFile)), '9792f568bcf3b86b69228f5d8eca7c3998e1aeda8804341e29ea22d6dd703403');
  limits.consume(principal);
  write('attempt-E04-B.json', { id: 'E04-B', principalId: principal, at: new Date().toISOString(),
    requestFileSha256: sha(read(requestFile)), requestBodySha256: sha(Buffer.from(JSON.stringify(body))),
    rateCountBefore: rate.recentCount, maxPosts: 1 });
  posts++;
  const started = Date.now(); let response = null, envelope = null, raw = null, error = null;
  try {
    response = await limits.providerCall(() => fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000) }));
    const text = await response.text(); if (Buffer.byteLength(text) > LIVE_LIMITS.responseBytes) throw Error('RESPONSE_TOO_LARGE');
    envelope = JSON.parse(text); raw = typeof envelope.message?.content === 'string' ? envelope.message.content : null;
  } catch (e) { error = String(e?.name || e?.code || e?.message || e).slice(0, 120); }
  const latencyMs = Date.now() - started;
  const transportValid = !error && response?.status === 200 && envelope?.done === true && envelope?.done_reason === 'stop' &&
    envelope.message?.role === 'assistant' && !envelope.message?.tool_calls?.length &&
    Number.isSafeInteger(envelope.prompt_eval_count) && envelope.prompt_eval_count >= 0 && envelope.prompt_eval_count <= LIVE_LIMITS.inputTokens &&
    Number.isSafeInteger(envelope.eval_count) && envelope.eval_count >= 0 && envelope.eval_count <= LIVE_LIMITS.outputTokens;
  let jsonValid = false, schemaValid = false, runtimeValid = false, decision = null, validationError = null;
  try {
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > LIVE_LIMITS.decisionBytes) throw Error('Missing/oversized raw content');
    const parsed = JSON.parse(raw); jsonValid = true; schemaValid = originalSchema(DECISION_SCHEMA, parsed);
    decision = parseDecision(parsed); if (decision.kind === 'tool' && validateTool(decision).missing.length) throw Error('Missing required args');
    runtimeValid = true;
  } catch (e) { validationError = String(e?.message || e).slice(0, 120); }
  const semanticCorrect = runtimeValid && decision.kind === 'unsupported';
  const status = transportValid && jsonValid && schemaValid && runtimeValid && semanticCorrect && latencyMs <= 15000 ? 'PASS' : 'FAIL';
  const failureCategory = status === 'PASS' ? null : !transportValid || latencyMs > 15000 ? 'TRANSPORT_OR_TIMEOUT' :
    !jsonValid ? 'INVALID_JSON' : !schemaValid || !runtimeValid ? 'SCHEMA_OR_RUNTIME' : 'NLU_DECISION_OR_ARGUMENTS';
  const safeRaw = typeof raw === 'string' && Buffer.byteLength(raw) <= 16000 && !/bearer|token|password|api.?key|secret/i.test(raw) ? raw : null;
  let h = null, loaded = null, telemetryError = null;
  try { h = hardware(); const ps = await localGet('/api/ps'); loaded = ps.models?.find(m => m.name === manifest.model); }
  catch (e) { telemetryError = String(e?.message || e).slice(0, 120); }
  const result = { id: 'E04-B', caseId: 'E04', variant: 'B', status, failureCategory, expected: { kind: 'unsupported' }, actual: decision,
    jsonValid, originalSchemaValid: schemaValid, runtimeValid, semanticCorrect, validationError,
    httpStatus: response?.status ?? null, doneReason: envelope?.done_reason ?? null, error, latencyMs,
    promptTokens: envelope?.prompt_eval_count ?? null, outputTokens: envelope?.eval_count ?? null,
    loadDurationNs: envelope?.load_duration ?? null, totalDurationNs: envelope?.total_duration ?? null,
    model: manifest.model, modelDigest: manifest.modelDigest, format: 'json', requestFileSha256: sha(read(requestFile)),
    requestBodySha256: sha(Buffer.from(JSON.stringify(body))), rawContentSha256: typeof raw === 'string' ? sha(Buffer.from(raw)) : null,
    rawContent: safeRaw, rawContentRedacted: raw !== null && safeRaw === null,
    resourcesAfter: h, telemetryError, modelLoadedAfter: !!loaded, modelGpuRatioAfter: loaded ? loaded.size_vram / loaded.size : null,
    toolExecutions: 0, databaseAccess: 'NONE' };
  write('E04-B.json', result);
  return result;
}
async function main() {
  fs.mkdirSync(newRoot, { recursive: true }); fs.mkdirSync(run, { recursive: false });
  const { body, before } = await preflight(); preflightPassed = true;
  const result = await runOne(body);
  const after = oldEvidenceSnapshot(); assert.deepEqual(after, before, 'Old evidence changed'); write('old-evidence-after.json', after);
  const sourceAfter = sourceIntegrity(); write('source-integrity-after.json', sourceAfter); assert.equal(sourceAfter.status, 'PASS');
  const combined = [...oldResults.cases.slice(0, 7), result];
  assert.deepEqual(combined.map(x => x.id), lock.order);
  const stats = label => { const rows = combined.filter(x => x.variant === label);
    return { pass: rows.filter(x => x.status === 'PASS').length, fail: rows.filter(x => x.status === 'FAIL').length,
      jsonValid: rows.filter(x => x.jsonValid).length, originalSchemaValid: rows.filter(x => x.originalSchemaValid).length,
      runtimeValid: rows.filter(x => x.runtimeValid).length, semanticCorrect: rows.filter(x => x.semanticCorrect).length }; };
  write('combined-results.json', { status: 'COMPLETE_8_POSTS', approvedMaxPosts: 8, historicalPosts: 7, newPosts: posts,
    pass: combined.filter(x => x.status === 'PASS').length, fail: combined.filter(x => x.status === 'FAIL').length,
    notRun: combined.filter(x => x.status === 'NOT RUN').length, B: stats('B'), C: stats('C'),
    cases: combined.map(x => ({ id: x.id, status: x.status, failureCategory: x.failureCategory, actual: x.actual,
      jsonValid: x.jsonValid, originalSchemaValid: x.originalSchemaValid, runtimeValid: x.runtimeValid,
      semanticCorrect: x.semanticCorrect, latencyMs: x.latencyMs, promptTokens: x.promptTokens, outputTokens: x.outputTokens,
      evidence: x.id === 'E04-B' ? path.relative(root, path.join(run, 'E04-B.json')).replaceAll('\\', '/') :
        path.relative(root, path.join(oldRun, `${x.id}.json`)).replaceAll('\\', '/') })),
    toolExecutions: 0, databaseAccess: 'NONE', browserExecutions: 0, oldEvidenceUnchanged: true,
    sourceIntegrity: sourceAfter, p1: 'OPEN' });
}
main().catch(e => { if (fs.existsSync(run)) write('failure.json', { status: preflightPassed ? 'POST_OR_ANALYSIS_FAILED' : 'PREFLIGHT_BLOCKED',
  message: String(e?.message || e).slice(0, 250), posts }); process.exitCode = 1; }).finally(() => {
  console.log(JSON.stringify({ run: path.relative(root, run).replaceAll('\\', '/'), posts, exitCode: process.exitCode || 0 }));
});
