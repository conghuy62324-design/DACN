// Offline validation and request lock; injected fake fetch only, no inference/DB.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const dir = 'docs/evidence/t-ai-04-g1-missing-slot-live-check';
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const { parseDecision, validateTool } = require(path.join(root, 'backend/dist/agent/tools.js'));
const { matchesDecisionSchema } = require(path.join(root, 'backend/dist/agent/decisionValidation.js'));
const { checkToolProvenance } = require(path.join(root, 'backend/dist/agent/toolProvenance.js'));
const { classifyMissingReadSlots, recoverMissingReadSlots } = require(path.join(root, 'backend/dist/agent/missingSlotRecovery.js'));
const { createConfiguredProvider } = require(path.join(root, 'backend/dist/agent/liveProvider.js'));
const { AgentOrchestrator } = require(path.join(root, 'backend/dist/services/agentService.js'));
const manifest = json(dir + '/manifest.json');
const norm = text => text.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');
const prior = [
  ...json('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-b-live-probe/technical-cases.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-c-decoder-investigation/diagnostic-manifest.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json').cases.map(x => x.message),
  ...json('docs/evidence/t-ai-04-g1-live-validation/manifest.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-g1-slot-filling-live-revalidation/manifest.json').cases.map(x => x.request.message),
];
const baseline = json('docs/evidence/t-ai-04-g1-missing-slot-decision-fix/integrity-after.json');
assert.equal(baseline.status, 'PASS');
for (const [rel, hash] of Object.entries(baseline.hashes)) assert.equal(sha(read(rel)), hash, rel);
const fixedArtifacts = json('docs/evidence/t-ai-04-g1-missing-slot-decision-fix/artifact-checksums.json');
for (const [rel, hash] of Object.entries(fixedArtifacts.hashes)) assert.equal(sha(read(rel)), hash, rel);
const fixedReview = json('docs/evidence/t-ai-04-g1-missing-slot-decision-fix/review-details.json');
for (const [rel, hash] of Object.entries(fixedReview.sourceHashes)) assert.equal(sha(read(rel)), hash, rel);
const sourceFiles = ['backend/src/agent/liveProvider.ts', 'backend/src/agent/decisionValidation.ts', 'backend/src/agent/toolProvenance.ts',
  'backend/src/agent/missingSlotRecovery.ts', 'backend/src/services/agentService.ts', 'backend/src/agent/decisionSchema.ts', 'backend/src/agent/tools.ts', 'backend/src/agent/limits.ts'];
const sourceHashes = Object.fromEntries(sourceFiles.map(rel => [rel, sha(read(rel))]));
const benchmark = { approved: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')), lock: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')) };
assert.equal(benchmark.approved, '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(benchmark.lock, 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
assert.equal(manifest.approvalMaxInference, 6);
assert.deepEqual(manifest.cases.map(x => x.id), ['M01', 'M02', 'M03', 'M04', 'M05', 'M06']);
assert.equal(new Set(manifest.cases.map(x => norm(x.request.message))).size, 6);
const prechecks = [];
for (const item of manifest.cases) {
  assert.ok(!prior.some(text => norm(text) === norm(item.request.message)), item.id + ' duplicate');
  assert.equal(item.request.message.normalize('NFC'), item.request.message); assert.ok(!/[?\uFFFD]/u.test(item.request.message));
  assert.deepEqual(item.request.history, []); assert.equal(matchesDecisionSchema(item.expected), true);
  const expected = parseDecision(item.expected);
  if (expected.kind === 'tool') {
    assert.deepEqual(validateTool(expected).missing, []); assert.deepEqual(checkToolProvenance(expected, item.request.message), { status: 'ALLOW' });
    prechecks.push({ id: item.id, expectedSchema: 'PASS', expectedGate: 'ALLOW' });
  } else if (expected.kind === 'clarify') {
    // Test-only fixture extraction from exact labels; no production arg completion.
    const labels = Object.fromEntries(item.request.message.split('; ').slice(1).map(text => { const i = text.indexOf(': '); return [text.slice(0, i), text.slice(i + 2)]; }));
    const args = {};
    for (const [field, label] of Object.entries({ departureCity: 'Nơi xuất phát', destinationCity: 'Điểm đến', startDate: 'Ngày bắt đầu', endDate: 'Ngày kết thúc', adults: 'Số người lớn', totalBudget: 'Ngân sách cả nhóm' })) {
      if (labels[label] !== undefined) args[field] = ['adults', 'totalBudget'].includes(field) ? Number(labels[label].replace(' VND', '')) : labels[label];
    }
    if (labels['Phương tiện'] === 'xe máy') args.transportation = 'motorbike';
    const partial = { kind: 'tool', name: 'plan_trip', arguments: args };
    assert.deepEqual(validateTool(partial).missing, item.expectedMissingFields);
    const rejected = classifyMissingReadSlots(partial, item.request.message);
    if (item.id !== 'M02') {
      assert.ok(rejected); assert.deepEqual(recoverMissingReadSlots(rejected, item.request.message), item.expectedMissingFields);
    } else assert.equal(rejected, null); // Negation outside positive recovery grammar stays fail closed.
    prechecks.push({ id: item.id, expectedSchema: 'PASS', hypotheticalPartialSchema: matchesDecisionSchema(partial),
      hypotheticalPartialRecoveryEligible: !!rejected, missingFields: validateTool(partial).missing,
      hypotheticalPartialGate: checkToolProvenance(partial, item.request.message) });
  }
}
async function main() {
  const principal = json(manifest.principalSource).principalId;
  assert.equal(principal, '9997f6db-bfa1-4377-96f3-5b5ea19dbf34');
  const bodies = [];
  for (const item of manifest.cases) {
    let captured;
    const provider = createConfiguredProvider({ LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true', OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: manifest.model,
      OLLAMA_BASE_URL: 'http://127.0.0.1:11434' }, async (url, init) => {
        assert.equal(String(url), manifest.endpoint);
        captured = { id: item.id, requestBody: JSON.parse(init.body), requestBodySha256: sha(init.body) };
        return new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ kind: 'unsupported' }) }, prompt_eval_count: 1, eval_count: 1 }));
      });
    await new AgentOrchestrator({ provider, readConsent: async () => ({ personalizationEnabled: false }), tools: { execute: async () => { throw Error('NO TOOL IN OFFLINE PREP'); } } }).chat({ id: principal, roles: ['CUSTOMER'] }, item.request);
    assert.ok(captured); assert.equal(sha(captured.requestBody.messages[0].content), fixedReview.promptWire.afterSha256);
    bodies.push({ ...captured, wireSystemSha256: fixedReview.promptWire.afterSha256 });
  }
  write('request-plan.json', { tier: 'OFFLINE_CAPTURE_ONLY', inferencePosts: 0, bodies });
  const validation = { status: 'PASS', manifestSha256: sha(read(dir + '/manifest.json')), requestPlanSha256: sha(read(dir + '/request-plan.json')),
    caseCount: 6, historicalRequestsCompared: prior.length, duplicates: 0, utf8Nfc: true, schemaAndRecoveryPrechecks: prechecks,
    sourceHashes, benchmark, priorFixFilesChecked: Object.keys(baseline.hashes).length, priorFixArtifactsChecked: Object.keys(fixedArtifacts.hashes).length, inferencePosts: 0 };
  write('manifest-validation.json', validation);
  write('manifest-lock.json', { task: manifest.task, status: 'APPROVED_SCOPE_LOCKED_BEFORE_INFERENCE', lockedAt: new Date().toISOString(), approvalSource: manifest.approvalSource,
    approvalMaxInference: 6, manifestSha256: validation.manifestSha256, requestPlanSha256: validation.requestPlanSha256, caseOrder: manifest.order,
    model: manifest.model, modelDigest: manifest.modelDigest, benchmarkV2ApprovedSha256: benchmark.approved, benchmarkV2LockSha256: benchmark.lock,
    noRetries: true, noRealToolsOrDatabase: true });
  const hashes = {};
  for (const folder of ['backend/src', 'frontend/src', 'frontend/tests', 'docs']) for (const file of fs.readdirSync(path.join(root, folder), { recursive: true })) {
    const rel = path.join(folder, file).replaceAll('\\', '/');
    if (rel.startsWith(dir + '/') || rel === 'docs/HUGO_T_AI_04_G1_MISSING_SLOT_LIVE_CHECK_REPORT.md' || !fs.statSync(path.join(root, rel)).isFile()) continue;
    hashes[rel] = sha(read(rel));
  }
  for (const rel of ['backend/package.json', 'backend/package-lock.json', 'frontend/package.json', 'frontend/package-lock.json']) hashes[rel] = sha(read(rel));
  write('integrity-before.json', { at: new Date().toISOString(), hashes });
  console.log(JSON.stringify({ status: 'PASS', manifestSha256: validation.manifestSha256, requestPlanSha256: validation.requestPlanSha256,
    historicalRequests: prior.length, snapshotFiles: Object.keys(hashes).length, inferencePosts: 0 }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
