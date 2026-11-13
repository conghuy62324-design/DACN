// G1 approved local-only LIVE harness. Six approved S cases; run --preflight first, then --run once.
// Production provider/orchestrator/validators/gate; fake read-only executor; no DB.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const writeNew = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const manifestRel = 'docs/evidence/t-ai-04-g1-missing-slot-live-check/manifest.json';
const lockRel = 'docs/evidence/t-ai-04-g1-missing-slot-live-check/manifest-lock.json';
const manifest = json(manifestRel), lock = json(lockRel);
const principal = json(manifest.principalSource).principalId;
const expectedPrincipal = '9997f6db-bfa1-4377-96f3-5b5ea19dbf34';
const { createConfiguredProvider } = require(path.join(root, 'backend/dist/agent/liveProvider.js'));
const { AgentOrchestrator } = require(path.join(root, 'backend/dist/services/agentService.js'));
const { AgentLimits } = require(path.join(root, 'backend/dist/agent/limits.js'));
const { AGENT_TOOLS, parseDecision, validateTool } = require(path.join(root, 'backend/dist/agent/tools.js'));
const { matchesDecisionSchema } = require(path.join(root, 'backend/dist/agent/decisionValidation.js'));
const { checkToolProvenance } = require(path.join(root, 'backend/dist/agent/toolProvenance.js'));
const { MissingReadSlotsRejection, recoverMissingReadSlots } = require(path.join(root, 'backend/dist/agent/missingSlotRecovery.js'));
const Ajv = require(path.join(root, 'backend/node_modules/ajv'));
const addFormats = require(path.join(root, 'backend/node_modules/ajv-formats'));
const diagnosticAjv = new Ajv({ allErrors: true, strict: true }); addFormats(diagnosticAjv, ['date', 'uuid']);
const diagnosticTools = new Map(AGENT_TOOLS.map(spec => [spec.name, diagnosticAjv.compile(spec.parameters)]));
const sameFields = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());

function knownAttempts(now = Date.now()) {
  const dir = path.join(root, 'docs/evidence');
  const entries = [];
  for (const rel of fs.readdirSync(dir, { recursive: true })) {
    if (!/^attempt-.*\.json$/.test(path.basename(rel))) continue;
    try {
      const item = JSON.parse(fs.readFileSync(path.join(dir, rel)));
      if (item.principalId === principal && item.at) entries.push({ id: item.id, at: item.at,
        path: path.join('docs/evidence', rel).replace(/\\/g, '/') });
    } catch { /* Historical nonstandard file: ignore only if it cannot be parsed. */ }
  }
  const recent = entries.filter(item => Date.parse(item.at) > now - 3600000).sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  return { totalKnown: entries.length, recent, slots: Math.max(0, 20 - recent.length) };
}

function resources() {
  let gpu = null;
  try {
    const line = execFileSync('nvidia-smi', ['--query-gpu=name,driver_version,memory.total,memory.free,memory.used',
      '--format=csv,noheader,nounits'], { encoding: 'utf8', timeout: 5000 }).trim().split(/\r?\n/)[0];
    const [name, driver, total, free, used] = line.split(',').map(v => v.trim());
    gpu = { name, driver, totalMiB: Number(total), freeMiB: Number(free), usedMiB: Number(used) };
  } catch (e) { gpu = { error: e.message }; }
  return { freeRAMMiB: Math.round(os.freemem() / 1048576), totalRAMMiB: Math.round(os.totalmem() / 1048576), gpu };
}

async function getLocal(pathname) {
  const response = await fetch(`http://127.0.0.1:11434${pathname}`, { method: 'GET',
    redirect: 'error', signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200, `Ollama GET ${pathname}`);
  return response.json();
}

async function preflight(file) {
  const record = { checkedAt: new Date().toISOString(), status: 'BLOCKED', principalId: principal,
    manifestSha256: sha(read(manifestRel)), lockSha256: sha(read(lockRel)), checks: {}, resources: resources() };
  try {
    assert.equal(principal, expectedPrincipal);
    assert.equal(lock.status, 'APPROVED_SCOPE_LOCKED_BEFORE_INFERENCE');
    assert.equal(record.manifestSha256, lock.manifestSha256);
    assert.equal(manifest.approvalMaxInference, 6);
    assert.deepEqual(manifest.order, ['M01', 'M02', 'M03', 'M04', 'M05', 'M06']);
    assert.equal(manifest.model, lock.model);
    assert.equal(manifest.modelDigest, lock.modelDigest);
    assert.equal(sha(read('docs/evidence/t-ai-04-g1-missing-slot-live-check/request-plan.json')), lock.requestPlanSha256);
    for (const [rel, hash] of Object.entries(json('docs/evidence/t-ai-04-g1-missing-slot-live-check/integrity-before.json').hashes))
      assert.equal(sha(read(rel)), hash, rel);
    record.checks.fullSourceAndEvidenceSnapshot = 'PASS';
    record.checks.manifest = 'PASS';
    const validation = json('docs/evidence/t-ai-04-g1-missing-slot-live-check/manifest-validation.json');
    assert.equal(validation.status, 'PASS');
    assert.equal(validation.manifestSha256, record.manifestSha256);
    for (const [rel, expected] of Object.entries(validation.sourceHashes)) assert.equal(sha(read(rel)), expected, `Source ${rel}`);
    record.checks.source = 'PASS';
    assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')), lock.benchmarkV2ApprovedSha256);
    assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')), lock.benchmarkV2LockSha256);
    record.checks.benchmark = 'PASS';
    const historical = json('docs/evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88/old-evidence-after.json');
    const changed = Object.entries(historical).filter(([rel, hash]) => !fs.existsSync(path.join(root, rel)) || sha(read(rel)) !== hash);
    assert.deepEqual(changed, []);
    record.checks.historicalEvidence = `${Object.keys(historical).length}/ ${Object.keys(historical).length} PASS`;
    assert.equal(process.env.NODE_USE_ENV_PROXY === '1', false);
    assert.equal(!!process.env.HTTP_PROXY || !!process.env.HTTPS_PROXY || !!process.env.http_proxy || !!process.env.https_proxy, false);
    const [version, tags, ps] = await Promise.all([getLocal('/api/version'), getLocal('/api/tags'), getLocal('/api/ps')]);
    const model = tags.models?.find(x => x.name === manifest.model);
    assert.ok(model && model.digest === manifest.modelDigest, 'Model tag/digest mismatch');
    const resident = ps.models?.some(x => x.name === manifest.model) || false;
    record.ollama = { endpoint: manifest.endpoint, version: version.version, model: model.name,
      digest: model.digest, sizeBytes: model.size, resident, loadedModels: ps.models?.map(x => x.name) || [] };
    record.checks.localOllama = 'PASS';
    assert.ok(record.resources.freeRAMMiB >= 2500, 'Insufficient free RAM');
    assert.ok(record.resources.gpu?.name?.includes('NVIDIA') && record.resources.gpu.totalMiB >= 7000, 'GPU unavailable');
    assert.ok(resident || record.resources.gpu.freeMiB >= 3000, 'Insufficient free VRAM for cold load');
    record.checks.hardware = 'PASS';
    const ledger = knownAttempts();
    record.rate = { ...ledger, maxPerHour: 20, processAgentLimits: 'fresh test process, same principal; conservative historical ledger enforced' };
    assert.ok(ledger.slots > 0, 'No rolling-hour slots');
    for (const item of manifest.cases) assert.equal(fs.existsSync(path.join(__dirname, `attempt-${item.id}.json`)), false,
      `Already attempted ${item.id}`);
    record.checks.rate = 'PASS';
    record.status = 'PASS';
  } catch (error) { record.reason = String(error.message || error); }
  writeNew(file, record);
  return record;
}

function compareDecision(actual, expected) {
  if (!actual || actual.kind !== expected.kind) return false;
  if (expected.kind === 'clarify') return Array.isArray(actual.fields) &&
    JSON.stringify([...new Set(actual.fields)].sort()) === JSON.stringify([...expected.fields].sort());
  if (expected.kind !== 'tool') return true;
  if (actual.name !== expected.name || !actual.arguments || typeof actual.arguments !== 'object') return false;
  const normalizeCity = v => v.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');
  for (const [key, value] of Object.entries(expected.arguments)) {
    if (key === 'departureCity' || key === 'destinationCity') {
      if (typeof actual.arguments[key] !== 'string' || normalizeCity(actual.arguments[key]) !== normalizeCity(value)) return false;
    } else if (actual.arguments[key] !== value) return false;
  }
  const allowedDefaults = { children: 0, pacing: 'balanced', preferences: [] };
  for (const [key, value] of Object.entries(actual.arguments)) {
    if (Object.hasOwn(expected.arguments, key)) continue;
    if (!Object.hasOwn(allowedDefaults, key) || JSON.stringify(value) !== JSON.stringify(allowedDefaults[key])) return false;
  }
  return true;
}

async function run() {
  const pre = await preflight('preflight-run.json');
  if (pre.status !== 'PASS') { console.log(JSON.stringify({ status: 'BLOCKED', reason: pre.reason })); return; }
  const env = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
    OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: manifest.model, OLLAMA_BASE_URL: 'http://127.0.0.1:11434' };
  const limits = new AgentLimits();
  const user = { id: principal, email: 'g1-local-validation@example.test', fullName: 'G1 Local Validation', roles: ['CUSTOMER'] };
  const results = [];
  let posts = 0;
  for (const item of manifest.cases) {
    const ledger = knownAttempts();
    if (ledger.slots < 1 || posts >= manifest.approvalMaxInference) {
      results.push({ id: item.id, nlu: 'NOT RUN', safety: 'NOT RUN', reason: 'rolling-hour/approval gate' });
      continue;
    }
    let envelope = null, httpStatus = null, requestBodySha256 = null, providerDecision = null, providerException = null, originalProviderError = null;
    const executed = [];
    const fetcher = async (url, options) => {
      assert.equal(String(url), manifest.endpoint);
      assert.ok(posts < manifest.approvalMaxInference);
      assert.equal(fs.existsSync(path.join(__dirname, `attempt-${item.id}.json`)), false);
      const body = JSON.parse(String(options.body));
      assert.equal(body.model, manifest.model);
      assert.equal(body.format, 'json');
      assert.equal(body.stream, false);
      assert.deepEqual(body.options, { temperature: 0, num_predict: 2048, num_ctx: 16384 });
      assert.equal(body.messages.at(-1).content, item.request.message);
      requestBodySha256 = sha(String(options.body));
      const planned = json('docs/evidence/t-ai-04-g1-missing-slot-live-check/request-plan.json').bodies.find(x => x.id === item.id);
      assert.equal(requestBodySha256, planned.requestBodySha256, 'Locked request body changed');
      writeNew(`attempt-${item.id}.json`, { id: item.id, principalId: principal,
        at: new Date().toISOString(), requestBodySha256, manifestSha256: lock.manifestSha256,
        rateCountBefore: ledger.recent.length, maxPosts: manifest.approvalMaxInference });
      posts++;
      const response = await fetch(url, options);
      httpStatus = response.status;
      try { envelope = JSON.parse((await response.clone().text()).slice(0, 70000)); }
      catch (error) { envelope = { captureError: String(error.message || error) }; }
      writeNew(item.id + '-ollama-response.json', { capturedAt: new Date().toISOString(), httpStatus, envelope });
      return response;
    };
    const real = createConfiguredProvider(env, fetcher);
    assert.equal(real.configured, true);
    assert.equal(real.external, false);
    const provider = { configured: true, external: false, generate: async (input, signal) => {
      try {
        providerDecision = await real.generate(input, signal);
        return providerDecision;
      } catch (e) {
        originalProviderError = e;
        providerException = { capturedAt: new Date().toISOString(), beforeServiceRecovery: true,
          type: e.constructor?.name || 'Unknown', name: e.name || null, code: e.code || null, statusCode: e.statusCode || null,
          message: String(e.message || e), typedMissingSlots: e instanceof MissingReadSlotsRejection,
          toolName: e instanceof MissingReadSlotsRejection ? e.toolName : null,
          fields: e instanceof MissingReadSlotsRejection ? [...e.fields] : [] };
        writeNew(item.id + '-provider-exception.json', providerException);
        throw e;
      }
    } };
    const orchestrator = new AgentOrchestrator({ provider, limits,
      readConsent: async () => ({ personalizationEnabled: false }),
      tools: { execute: async decision => { executed.push(decision); return { type: 'MOCK_ONLY', source: 'MOCK_ONLY', warnings: [] }; } } });
    const before = resources();
    const started = performance.now();
    let serviceResponse = null, error = null;
    try { serviceResponse = await orchestrator.chat(user, item.request); }
    catch (e) { error = { code: e.code || 'UNEXPECTED', statusCode: e.statusCode || null, message: String(e.message || e) }; }
    const elapsedMs = Math.round(performance.now() - started);
    const after = resources();
    const raw = typeof envelope?.message?.content === 'string' ? envelope.message.content : null;
    let parsed = null, jsonValid = false, schemaValid = false, runtimeValid = false, runtimeError = null;
    try {
      if (raw !== null) {
        parsed = JSON.parse(raw); jsonValid = true;
        schemaValid = matchesDecisionSchema(parsed);
        if (schemaValid) {
          const decision = parseDecision(parsed);
          if (decision.kind === 'tool' && validateTool(decision).missing.length) throw Error('Missing required arguments');
          runtimeValid = true;
        }
      }
    } catch (e) { runtimeError = String(e.message || e); }
    let gate = { status: 'NOT_APPLICABLE' }, provenRequired = [];
    if (providerDecision?.kind === 'tool') {
      gate = checkToolProvenance(providerDecision, item.request.message);
      const spec = AGENT_TOOLS.find(x => x.name === providerDecision.name);
      provenRequired = gate.status === 'ALLOW' ? [...spec.parameters.required] :
        gate.status === 'NEEDS_INPUT' ? spec.parameters.required.filter(x => !gate.missing.includes(x)) : [];
    }
    const transportValid = httpStatus === 200 && envelope?.done === true && envelope?.done_reason === 'stop' &&
      envelope?.message?.role === 'assistant' && !envelope?.message?.tool_calls?.length && elapsedMs <= 15000;
    let missingRequiredOnly = false, requiredMissing = [], diagnosticSchemaErrors = [];
    try {
      const diagnostic = parseDecision(parsed);
      if (diagnostic.kind === 'tool') {
        const validate = diagnosticTools.get(diagnostic.name);
        const validArguments = validate(diagnostic.arguments);
        diagnosticSchemaErrors = (validate.errors || []).map(e => ({ keyword: e.keyword, instancePath: e.instancePath, params: e.params }));
        requiredMissing = validateTool(diagnostic).missing;
        missingRequiredOnly = !validArguments && diagnosticSchemaErrors.length > 0 && diagnosticSchemaErrors.every(e => e.keyword === 'required');
      }
    } catch { /* Diagnostic only; original provider rejection remains unchanged. */ }
    const recoveryFields = originalProviderError ? recoverMissingReadSlots(originalProviderError, item.request.message) : null;
    const recoveryEligible = !!recoveryFields;
    const recoveryApplied = recoveryEligible && !error && serviceResponse?.status === 'needs_input' && sameFields(serviceResponse?.missingFields || [], recoveryFields);
    const recoveryUx = recoveryEligible ? (recoveryApplied && executed.length === 0 ? 'PASS' : 'FAIL') : 'NOT_APPLICABLE';
    const validation = raw === null ? 'NOT RUN' : (runtimeValid
      ? (providerDecision !== null && providerException === null ? 'PASS' : 'FAIL')
      : (providerDecision === null && providerException?.code === 'AGENT_INVALID_PROVIDER_OUTPUT' && executed.length === 0 ? 'PASS' : 'FAIL'));
    const ux = !error && serviceResponse?.status === item.expectedServiceStatus &&
      sameFields(serviceResponse?.missingFields || [], item.expectedMissingFields) && executed.length === item.expectedFakeToolCalls ? 'PASS' : 'FAIL';
    const semanticValid = runtimeValid && compareDecision(parsed, item.expected);
    const nlu = transportValid && semanticValid ? 'PASS' : 'FAIL';
    const safety = item.expectedFakeToolCalls === 1
      ? (gate.status === 'ALLOW' && executed.length === 1 && serviceResponse?.status === 'completed' ? 'PASS' : 'FAIL')
      : (executed.length === 0 && gate.status !== 'ALLOW' ? 'PASS' : 'FAIL');
    const record = { id: item.id, request: item.request, expected: item.expected, nlu, validation, ux, safety,
      providerException, missingRequiredOnly, requiredMissing, diagnosticSchemaErrors,
      recoveryEligible, recoveryApplied, recoveryFields, recoveryUx, apiHttpStatus: 'NOT RUN_DIRECT_ORCHESTRATOR',
      httpStatus, rawModelDecision: raw, parsedModelDecision: parsed, providerDecision,
      jsonValid, originalSchemaValid: schemaValid, runtimeValid, runtimeError, semanticValid,
      transportValid, gate, provenRequired, fakeToolInvocationCount: executed.length, fakeToolDecisions: executed,
      serviceStatus: serviceResponse?.status || null, serviceMissingFields: serviceResponse?.missingFields || [],
      error, elapsedMs, timeoutExceeded: elapsedMs > 15000 || error?.code === 'AGENT_TIMEOUT',
      tokens: { prompt: envelope?.prompt_eval_count ?? null, output: envelope?.eval_count ?? null },
      durationsNs: { total: envelope?.total_duration ?? null, load: envelope?.load_duration ?? null,
        promptEval: envelope?.prompt_eval_duration ?? null, eval: envelope?.eval_duration ?? null },
      resourcesBefore: before, resourcesAfter: after, requestBodySha256,
      model: manifest.model, modelDigest: manifest.modelDigest, tier: 'LIVE_LLM_LOCAL_FAKE_TOOL' };
    writeNew(`${item.id}.json`, record);
    results.push({ id: item.id, nlu, validation, ux, safety, schemaAccepted: schemaValid, recoveryEligible, recoveryApplied, recoveryUx, httpStatus, decisionKind: parsed?.kind || null,
      gate: gate.status, fakeToolInvocationCount: executed.length, elapsedMs });
    console.log(`${item.id} NLU=${nlu} VALIDATION=${validation} UX=${ux} SAFETY=${safety} RECOVERY=${recoveryApplied} TOOLS=${executed.length}`);
  }
  const summary = { status: results.length === 6 && results.every(x => x.nlu !== 'NOT RUN') ? 'COMPLETE' : 'PARTIAL', manifestSha256: lock.manifestSha256,
    principalId: principal, approvedMaxInference: 6, posts, results,
    nlu: { pass: results.filter(x => x.nlu === 'PASS').length, fail: results.filter(x => x.nlu === 'FAIL').length,
      notRun: results.filter(x => x.nlu === 'NOT RUN').length },
    validation: { pass: results.filter(x => x.validation === 'PASS').length, fail: results.filter(x => x.validation === 'FAIL').length, notRun: results.filter(x => x.validation === 'NOT RUN' || x.nlu === 'NOT RUN').length },
    ux: { pass: results.filter(x => x.ux === 'PASS').length, fail: results.filter(x => x.ux === 'FAIL').length, notRun: results.filter(x => x.nlu === 'NOT RUN').length },
    recovery: { eligible: results.filter(x => x.recoveryEligible).length, applied: results.filter(x => x.recoveryApplied).length,
      uxPass: results.filter(x => x.recoveryUx === 'PASS').length, uxFail: results.filter(x => x.recoveryUx === 'FAIL').length },
    safety: { pass: results.filter(x => x.safety === 'PASS').length, fail: results.filter(x => x.safety === 'FAIL').length,
      notRun: results.filter(x => x.safety === 'NOT RUN').length } };
  writeNew('results.json', summary);
  console.log(JSON.stringify({ posts, nlu: summary.nlu, validation: summary.validation, ux: summary.ux, recovery: summary.recovery, safety: summary.safety }));
}

const mode = process.argv[2];
if (mode === '--preflight') preflight('preflight.json').then(x => console.log(JSON.stringify(x, null, 2)))
  .catch(e => { console.error(e); process.exitCode = 1; });
else if (mode === '--run') run().catch(e => { console.error(e); process.exitCode = 1; });
else { console.error('Use --preflight or --run'); process.exitCode = 2; }
