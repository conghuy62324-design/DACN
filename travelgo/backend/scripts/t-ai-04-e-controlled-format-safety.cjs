// T-AI-04-E: owner-approved, max eight local Ollama POSTs. No tool or database execution.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const evidence = path.join(root, 'docs/evidence/t-ai-04-e-controlled-format-safety');
const priorEvidence = path.join(root, 'docs/evidence');
const sha = b => createHash('sha256').update(b).digest('hex');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const manifest = json('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json');
const lock = json('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-lock.json');
const diagnostic = json('docs/evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json');
const { DECISION_SCHEMA } = require('../dist/agent/decisionSchema.js');
const { AGENT_TOOLS, parseDecision, validateTool } = require('../dist/agent/tools.js');
const { readConversation } = require('../dist/agent/conversation.js');
const { createConfiguredProvider, LIVE_LIMITS } = require('../dist/agent/liveProvider.js');
const { AgentLimits } = require('../dist/agent/limits.js');
const limits = new AgentLimits();
const principal = json('docs/evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/rate-window.json').principalId;
const approvedOrder = ['E01-B', 'E01-C', 'E02-C', 'E02-B', 'E03-B', 'E03-C', 'E04-C', 'E04-B'];
const expectedSource = json('docs/evidence/t-ai-04-a-fix/source-integrity.json');
const runArg = process.argv.find(x => x.startsWith('--resume='));
const run = runArg ? path.resolve(root, runArg.slice('--resume='.length)) :
  path.join(evidence, 'run-' + new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8));
const write = (name, value) => fs.writeFileSync(path.join(run, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const exists = name => fs.existsSync(path.join(run, name));
const load = name => JSON.parse(fs.readFileSync(path.join(run, name)));
let postsThisProcess = 0, stopReason = null;
const preflightOnly = process.argv.includes('--preflight-only');
assert.ok(preflightOnly || process.argv.includes('--live'), 'Explicit --live or --preflight-only required');
if (!preflightOnly) assert.equal(process.env.T_AI_04_E_APPROVED, 'true', 'Owner approval gate absent');
assert.equal(process.env.LLM_PROVIDER, 'ollama');
assert.equal(process.env.OLLAMA_MODEL, manifest.model);
assert.equal(process.env.OLLAMA_BASE_URL, 'http://127.0.0.1:11434');
assert.ok(!process.env.HTTP_PROXY && !process.env.HTTPS_PROXY && !process.env.ALL_PROXY && process.env.NODE_USE_ENV_PROXY !== '1');
assert.equal(LIVE_LIMITS.timeoutMs, 15000);
assert.equal(LIVE_LIMITS.inputTokens + LIVE_LIMITS.outputTokens + 2048, 16384);
function verifyLocks() {
  assert.equal(sha(read('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json')), lock.approvedSha256);
  assert.equal(sha(read('docs/evidence/t-ai-04-d-decision-format-safety/next-live-manifest-draft.json')), lock.draftSha256);
  assert.equal(sha(read('docs/evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json')), lock.diagnosticSchemaSha256);
  assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')), lock.benchmarkV2Sha256);
  assert.equal(lock.benchmarkV2Sha256, '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
  assert.deepEqual(lock.order, approvedOrder); assert.equal(lock.maxPosts, 8);
  assert.equal(manifest.status, 'APPROVED_LOCKED');
  for (const [rel, hash] of Object.entries({
    'docs/evidence/t-ai-04-b-live-probe/technical-cases.json': '2e1121cd0ec96d6a09dddf39d67be9246aa6f2ac98b55a751a6d299d267a7807',
    'docs/evidence/t-ai-04-c-decoder-investigation/diagnostic-manifest.json': '02ea0370e3c4a6304ddfc48349308bc2c18b3e6fca07bc8671d56478e08a00e6',
  })) assert.equal(sha(read(rel)), hash, `${rel} changed`);
}
function sourceIntegrity() {
  const ref = json('docs/evidence/t-ai-03-b-live-v2-b1/integrity-after.json').hashes;
  const changed = [];
  for (const [rel, hash] of Object.entries(ref)) {
    const target = path.join(root, rel), expected = expectedSource.selected[rel]?.after || hash;
    if (!fs.existsSync(target) || sha(fs.readFileSync(target)) !== expected) changed.push(rel);
  }
  return { baselineFiles: Object.keys(ref).length, changed, status: changed.length ? 'FAIL' : 'PASS' };
}
function attemptFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) attemptFiles(file, out);
    else if (entry.name.startsWith('attempt-') && entry.name.endsWith('.json')) out.push(file);
  }
  return out;
}
function attempts() {
  return attemptFiles(priorEvidence).flatMap(file => {
    try { const row = JSON.parse(fs.readFileSync(file));
      const at = row.at || row.createdAt;
      return row.principalId === principal && Number.isFinite(Date.parse(at)) ? [{ id: row.id || path.basename(file), at, file: path.relative(root, file).replaceAll('\\', '/') }] : [];
    } catch { return []; }
  }).sort((a, b) => a.at.localeCompare(b.at));
}
function rateWindow() {
  const now = Date.now();
  const prior = attempts(), recent = prior.filter(x => now >= Date.parse(x.at) && now - Date.parse(x.at) < 3600000);
  return { principalId: principal, checkedAt: new Date(now).toISOString(), maxPerHour: 20,
    totalKnownAttempts: prior.length, recentCount: recent.length,
    nextSlotAt: recent.length >= 20 ? new Date(Date.parse(recent[0].at) + 3600000).toISOString() : null,
    recent: recent.map(x => ({ id: x.id, at: x.at, file: x.file })) };
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
const normalize = v => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
function semantic(actual, expected) {
  if (actual?.kind !== expected.kind) return false;
  if (expected.kind === 'unsupported') return true;
  if (expected.kind === 'clarify') return JSON.stringify([...actual.fields].sort()) === JSON.stringify([...expected.fields].sort());
  if (actual.name !== expected.name) return false;
  for (const [key, value] of Object.entries(expected.arguments)) {
    if (['departureCity', 'destinationCity'].includes(key)) { if (normalize(actual.arguments[key]) !== normalize(value)) return false; }
    else if (JSON.stringify(actual.arguments[key]) !== JSON.stringify(value)) return false;
  }
  const defaults = { children: 0, pacing: 'balanced', preferences: [], mandatoryPlaceIds: [] };
  return Object.entries(actual.arguments).every(([key, value]) => Object.hasOwn(expected.arguments, key) ||
    Object.hasOwn(defaults, key) && JSON.stringify(value) === JSON.stringify(defaults[key]));
}
function systemLiteral() {
  const source = read('backend/src/services/agentService.ts').toString('utf8');
  const match = source.match(/const SYSTEM = `([\s\S]*?)`;/);
  assert.ok(match && !match[1].includes('${'), 'SYSTEM source must be static'); return match[1];
}
async function productionBody(c) {
  const captures = [], messages = readConversation({ message: c.message, history: c.history });
  const env = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
    OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: manifest.model, OLLAMA_BASE_URL: 'http://127.0.0.1:11434' };
  const provider = createConfiguredProvider(env, async (url, init) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat'); captures.push(JSON.parse(init.body));
    return new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: '{"kind":"unsupported"}' },
      prompt_eval_count: 1, eval_count: 1 }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  await provider.generate({ system: systemLiteral(), messages, tools: AGENT_TOOLS }, new AbortController().signal);
  assert.equal(captures.length, 1); const body = captures[0];
  assert.deepEqual(body.format, DECISION_SCHEMA);
  assert.deepEqual(body.options, { temperature: 0, num_predict: 2048, num_ctx: 16384 });
  assert.equal(body.stream, false); assert.deepEqual(body.messages.map(m => m.role), ['system', ...messages.map(m => m.role)]);
  return body;
}
const withoutFormat = body => { const copy = structuredClone(body); delete copy.format; return copy; };
async function prepare() {
  if (exists('request-plan.json')) {
    const plan = load('request-plan.json'); assert.equal(plan.manifestSha256, lock.approvedSha256);
    for (const row of plan.pairs) for (const variant of ['B', 'C'])
      assert.equal(sha(fs.readFileSync(path.join(run, `${row.id}-${variant}-request.json`))), row[`request${variant}FileSha256`]);
    return;
  }
  const pairs = [];
  for (const c of manifest.cases) {
    const production = await productionBody(c), b = structuredClone(production), vC = structuredClone(production);
    b.format = 'json'; vC.format = diagnostic;
    assert.deepEqual(withoutFormat(b), withoutFormat(vC));
    assert.deepEqual(withoutFormat(production), withoutFormat(b));
    const bBytes = Buffer.from(JSON.stringify(b, null, 2) + '\n'), cBytes = Buffer.from(JSON.stringify(vC, null, 2) + '\n');
    fs.writeFileSync(path.join(run, `${c.id}-B-request.json`), bBytes, { flag: 'wx' });
    fs.writeFileSync(path.join(run, `${c.id}-C-request.json`), cBytes, { flag: 'wx' });
    pairs.push({ id: c.id, onlyDifference: 'top-level format', commonBodySha256: sha(Buffer.from(JSON.stringify(withoutFormat(b)))),
      systemSha256: sha(Buffer.from(b.messages[0].content)), messagesSha256: sha(Buffer.from(JSON.stringify(b.messages))),
      requestBFileSha256: sha(bBytes), requestCFileSha256: sha(cBytes),
      requestBBodySha256: sha(Buffer.from(JSON.stringify(b))), requestCBodySha256: sha(Buffer.from(JSON.stringify(vC))) });
  }
  write('request-plan.json', { status: 'LOCKED_BEFORE_FIRST_POST', manifestSha256: lock.approvedSha256,
    schemaCSha256: lock.diagnosticSchemaSha256, order: approvedOrder, onlyDifference: 'format', pairs });
}
async function preflight() {
  verifyLocks(); const integrity = sourceIntegrity(); if (!exists('source-integrity-before.json')) write('source-integrity-before.json', integrity);
  assert.equal(integrity.status, 'PASS', 'Source integrity failed');
  assert.equal(sha(read('backend/src/agent/limits.ts')), expectedSource.selected['backend/src/agent/limits.ts'].after);
  assert.equal(principal, '9997f6db-bfa1-4377-96f3-5b5ea19dbf34');
  const old = attempts().filter(x => /^E0[1-4]-[BC]$/.test(x.id));
  assert.ok(old.length <= 8 && new Set(old.map(x => x.id)).size === old.length, 'Duplicate E attempt ledger');
  if (!exists('rate-preflight.json')) write('rate-preflight.json', { ...rateWindow(), plannedPosts: 8, alreadyAttempted: old.length,
    note: 'Conservative rolling-hour ledger gate plus unchanged AgentLimits.consume' });
  await prepare();
  const tags = await localGet('/api/tags'), model = tags.models?.find(m => m.name === manifest.model);
  assert.equal(model?.digest, manifest.modelDigest); if (!exists('model.json')) write('model.json', { tag: model.name, digest: model.digest, sizeBytes: model.size, endpoint: '127.0.0.1:11434' });
  const ps = await localGet('/api/ps'), loaded = ps.models?.find(m => m.name === manifest.model), h = hardware();
  assert.match(h.gpu.name, /NVIDIA.*RTX 4060/i); assert.ok(h.ram.freeMiB >= 2048, 'RAM below 2 GiB');
  assert.ok(h.gpu.freeMiB >= (loaded ? 512 : 5200), 'VRAM headroom too low');
  if (loaded) assert.ok(loaded.size_vram / loaded.size >= 0.9, 'Model not GPU resident');
  if (!exists('hardware-before.json')) write('hardware-before.json', { ...h, modelLoaded: !!loaded,
    modelGpuRatio: loaded ? loaded.size_vram / loaded.size : null });
}
async function postOnce(id, body) {
  verifyLocks();
  const global = attempts(); assert.ok(global.filter(x => /^E0[1-4]-[BC]$/.test(x.id)).length < 8, 'Eight attempts exhausted');
  assert.ok(!global.some(x => x.id === id), `${id} already attempted`);
  const rate = rateWindow(); if (rate.recentCount >= 20) return { gate: rate };
  limits.consume(principal);
  write(`attempt-${id}.json`, { id, principalId: principal, at: new Date().toISOString(), requestSha256: sha(Buffer.from(JSON.stringify(body))),
    rateCountBefore: rate.recentCount, maxPosts: 1 });
  postsThisProcess++;
  const start = Date.now(); let response = null, envelope = null, raw = null, error = null;
  try {
    response = await limits.providerCall(() => fetch('http://127.0.0.1:11434/api/chat', {
      method: 'POST', redirect: 'error', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000) }));
    const text = await response.text();
    if (Buffer.byteLength(text) > LIVE_LIMITS.responseBytes) throw Error('RESPONSE_TOO_LARGE');
    envelope = JSON.parse(text); raw = typeof envelope.message?.content === 'string' ? envelope.message.content : null;
  } catch (e) { error = String(e?.name || e?.code || e?.message || e).slice(0, 120); }
  return { response, envelope, raw, error, latencyMs: Date.now() - start };
}
function score(c, variant, body, wire, resources) {
  const { response, envelope, raw, error, latencyMs } = wire;
  const transportValid = !error && response?.status === 200 && envelope?.done === true && envelope?.done_reason === 'stop' &&
    envelope.message?.role === 'assistant' && !envelope.message?.tool_calls?.length &&
    Number.isSafeInteger(envelope.prompt_eval_count) && envelope.prompt_eval_count <= LIVE_LIMITS.inputTokens &&
    Number.isSafeInteger(envelope.eval_count) && envelope.eval_count <= LIVE_LIMITS.outputTokens;
  let jsonValid = false, schemaValid = false, runtimeValid = false, decision = null, validationError = null;
  try {
    if (typeof raw !== 'string' || Buffer.byteLength(raw) > LIVE_LIMITS.decisionBytes) throw Error('Missing/oversized raw content');
    const parsed = JSON.parse(raw); jsonValid = true; schemaValid = originalSchema(DECISION_SCHEMA, parsed);
    decision = parseDecision(parsed); if (decision.kind === 'tool' && validateTool(decision).missing.length) throw Error('Missing required args');
    runtimeValid = true;
  } catch (e) { validationError = String(e?.message || e).slice(0, 120); }
  const semanticCorrect = runtimeValid && semantic(decision, c.expected);
  const status = transportValid && jsonValid && schemaValid && runtimeValid && semanticCorrect && latencyMs <= 15000 ? 'PASS' : 'FAIL';
  const failureCategory = status === 'PASS' ? null : !transportValid || latencyMs > 15000 ? 'TRANSPORT_OR_TIMEOUT' :
    !jsonValid ? 'INVALID_JSON' : !schemaValid || !runtimeValid ? 'SCHEMA_OR_RUNTIME' : 'NLU_DECISION_OR_ARGUMENTS';
  const safeRaw = typeof raw === 'string' && Buffer.byteLength(raw) <= 16000 && !/bearer|token|password|api.?key|secret/i.test(raw) ? raw : null;
  return { id: `${c.id}-${variant}`, caseId: c.id, variant, status, failureCategory, expected: c.expected, actual: decision,
    jsonValid, originalSchemaValid: schemaValid, runtimeValid, semanticCorrect, validationError,
    httpStatus: response?.status ?? null, doneReason: envelope?.done_reason ?? null, error, latencyMs,
    promptTokens: envelope?.prompt_eval_count ?? null, outputTokens: envelope?.eval_count ?? null,
    loadDurationNs: envelope?.load_duration ?? null, totalDurationNs: envelope?.total_duration ?? null,
    model: manifest.model, modelDigest: manifest.modelDigest, format: variant === 'B' ? 'json' : 'DIAGNOSTIC_SCHEMA_C',
    requestSha256: sha(Buffer.from(JSON.stringify(body))), rawContentSha256: typeof raw === 'string' ? sha(Buffer.from(raw)) : null,
    rawContent: safeRaw, rawContentRedacted: raw !== null && safeRaw === null,
    resources, toolExecutions: 0, databaseAccess: 'NONE' };
}
function summary() {
  const rows = approvedOrder.map(id => exists(`${id}.json`) ? load(`${id}.json`) : { id, status: 'NOT RUN', reason: stopReason || 'TIME_GATE_BLOCKED_OR_PENDING' });
  const result = { tier: 'LOCAL_LLM_DIAGNOSTIC', manifestSha256: lock.approvedSha256, schemaCSha256: lock.diagnosticSchemaSha256,
    model: manifest.model, principalId: principal, total: 8, attempts: rows.filter(x => x.status !== 'NOT RUN').length,
    pass: rows.filter(x => x.status === 'PASS').length, fail: rows.filter(x => x.status === 'FAIL').length,
    notRun: rows.filter(x => x.status === 'NOT RUN').length, stopReason, cases: rows,
    toolExecutions: 0, databaseAccess: 'NONE', browserExecutions: 0 };
  fs.writeFileSync(path.join(run, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  return result;
}
async function main() {
  if (runArg) assert.ok(run.startsWith(evidence + path.sep) && fs.existsSync(run), 'Invalid resume path');
  else fs.mkdirSync(run, { recursive: false });
  await preflight();
  if (preflightOnly) { stopReason = 'PREFLIGHT_ONLY_NO_POST'; return summary(); }
  for (const id of approvedOrder) {
    if (exists(`${id}.json`)) continue;
    if (exists(`attempt-${id}.json`)) { stopReason = `ATTEMPT_WITHOUT_RESULT_${id}`; break; }
    const c = manifest.cases.find(x => x.id === id.slice(0, 3)), variant = id.slice(-1);
    const body = load(`${id}-request.json`), plan = load('request-plan.json'), row = plan.pairs.find(x => x.id === c.id);
    assert.equal(sha(read(path.relative(root, path.join(run, `${id}-request.json`)))), row[`request${variant}FileSha256`]);
    const hBefore = hardware(); if (hBefore.gpu.freeMiB < 512 || hBefore.ram.freeMiB < 2048) { stopReason = 'RESOURCE_HEADROOM_LOW'; break; }
    const wire = await postOnce(id, body);
    if (wire.gate) { stopReason = 'TIME_GATE_BLOCKED'; write('rate-gate-stop.json', wire.gate); break; }
    const resources = { before: hBefore, after: hardware() };
    const record = score(c, variant, body, wire, resources); write(`${id}.json`, record);
    const ps = await localGet('/api/ps'), loaded = ps.models?.find(m => m.name === manifest.model);
    if (id === 'E01-B' && !exists('hardware-after-first.json')) write('hardware-after-first.json', { ...resources.after,
      modelLoaded: !!loaded, modelGpuRatio: loaded ? loaded.size_vram / loaded.size : null });
    if (record.failureCategory === 'TRANSPORT_OR_TIMEOUT') { stopReason = `STOP_AFTER_${id}_${record.error || record.httpStatus}`; break; }
    if (loaded && loaded.size_vram / loaded.size < 0.9) { stopReason = 'MODEL_NOT_GPU_RESIDENT'; break; }
    if (resources.after.gpu.freeMiB < 512 || resources.after.ram.freeMiB < 2048) { stopReason = 'RESOURCE_HEADROOM_LOW'; break; }
  }
  return summary();
}
main().catch(e => {
  stopReason = 'PREFLIGHT_OR_SCRIPT_BLOCKED';
  if (fs.existsSync(run)) fs.writeFileSync(path.join(run, 'failure.json'), JSON.stringify({ status: 'BLOCKED', message: String(e?.message || e).slice(0, 250), postsThisProcess }, null, 2) + '\n');
  process.exitCode = 1;
}).finally(() => {
  if (fs.existsSync(run)) {
    try { const integrity = sourceIntegrity(); fs.writeFileSync(path.join(run, 'source-integrity-after.json'), JSON.stringify(integrity, null, 2) + '\n');
      if (integrity.status !== 'PASS') process.exitCode = 1; } catch { process.exitCode = 1; }
  }
  console.log(JSON.stringify({ run: path.relative(root, run).replaceAll('\\', '/'), postsThisProcess, stopReason, exitCode: process.exitCode || 0 }));
});
