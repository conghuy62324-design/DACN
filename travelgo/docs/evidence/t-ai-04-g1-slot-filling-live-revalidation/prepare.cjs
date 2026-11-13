// OFFLINE preparation and lock. Only injected fake fetch; no network/DB/model inference.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const dir = 'docs/evidence/t-ai-04-g1-slot-filling-live-revalidation';
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const { AGENT_TOOLS, parseDecision, validateTool } = require(path.join(root, 'backend/dist/agent/tools.js'));
const { matchesDecisionSchema } = require(path.join(root, 'backend/dist/agent/decisionValidation.js'));
const { checkToolProvenance } = require(path.join(root, 'backend/dist/agent/toolProvenance.js'));
const { createConfiguredProvider } = require(path.join(root, 'backend/dist/agent/liveProvider.js'));
const { AgentOrchestrator } = require(path.join(root, 'backend/dist/services/agentService.js'));
const manifest = json(dir + '/manifest.json');
const norm = value => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');
const prior = [
  ...json('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-b-live-probe/technical-cases.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-c-decoder-investigation/diagnostic-manifest.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json').cases.map(x => x.message),
  ...json('docs/evidence/t-ai-04-g1-live-validation/manifest.json').cases.map(x => x.request.message),
];
const lastFix = json('docs/evidence/t-ai-04-g1-slot-filling-fix/integrity-after.json');
assert.equal(lastFix.status, 'PASS');
assert.equal(lastFix.hashes['backend/src/services/agentService.ts'], '7aa80a472611011efedb89822a3f6cc9cb9aace5707f54144bb0784a6c1f332f');
for (const [rel, hash] of Object.entries(lastFix.hashes)) assert.equal(sha(read(rel)), hash, rel);
const fixArtifacts = json('docs/evidence/t-ai-04-g1-slot-filling-fix/artifact-checksums.json');
for (const [rel, hash] of Object.entries(fixArtifacts.hashes)) assert.equal(sha(read(rel)), hash, rel);
const sourceFiles = ['backend/src/agent/liveProvider.ts', 'backend/src/agent/decisionValidation.ts', 'backend/src/agent/toolProvenance.ts',
  'backend/src/services/agentService.ts', 'backend/src/agent/decisionSchema.ts', 'backend/src/agent/tools.ts', 'backend/src/agent/limits.ts'];
const sourceHashes = Object.fromEntries(sourceFiles.map(rel => [rel, sha(read(rel))]));
const benchmark = { approved: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')),
  lock: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')) };
assert.equal(benchmark.approved, '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(benchmark.lock, 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
assert.equal(manifest.approvalMaxInference, 6);
assert.deepEqual(manifest.cases.map(x => x.id), ['S01', 'S02', 'S03', 'S04', 'S05', 'S06']);
assert.equal(new Set(manifest.cases.map(x => norm(x.request.message))).size, 6);
const prechecks = [];
for (const item of manifest.cases) {
  assert.ok(!prior.some(x => norm(x) === norm(item.request.message)), item.id + ' duplicates historical request');
  assert.equal(item.request.message.normalize('NFC'), item.request.message);
  assert.ok(!/[?\uFFFD]/u.test(item.request.message));
  assert.deepEqual(item.request.history, []);
  assert.equal(matchesDecisionSchema(item.expected), true);
  const expected = parseDecision(item.expected);
  if (expected.kind === 'tool') {
    assert.deepEqual(validateTool(expected).missing, []);
    assert.deepEqual(checkToolProvenance(expected, item.request.message), { status: 'ALLOW' });
    prechecks.push({ id: item.id, expectedSchema: 'PASS', expectedToolGate: 'ALLOW' });
  } else if (expected.kind === 'clarify') {
    // Test fixture extraction of explicit labels, not a production NLU implementation.
    const labels = Object.fromEntries(item.request.message.split('; ').slice(1).map(segment => {
      const index = segment.indexOf(': '); return [segment.slice(0, index), segment.slice(index + 2)];
    }));
    const args = { departureCity: labels['Nơi xuất phát'], destinationCity: labels['Điểm đến'], startDate: labels['Ngày bắt đầu'],
      endDate: labels['Ngày kết thúc'], adults: Number(labels['Số người lớn']), totalBudget: Number(labels['Ngân sách cả nhóm'].replace(' VND', '')), transportation: 'motorbike' };
    const complete = { kind: 'tool', name: 'plan_trip', arguments: args };
    assert.deepEqual(validateTool(complete).missing, []);
    const base = item.request.message.split('; ').filter(segment => !segment.startsWith('Phương tiện:')).join('; ');
    // Proves six supplied slots are recognized; only transportation is absent.
    assert.deepEqual(checkToolProvenance(complete, base), { status: 'NEEDS_INPUT', missing: ['transportation'] });
    assert.deepEqual(checkToolProvenance(complete, base + '; Phương tiện: xe máy'), { status: 'ALLOW' });
    const guesses = ['car', 'motorbike'].map(value => {
      const gate = checkToolProvenance({ ...complete, arguments: { ...args, transportation: value } }, item.request.message);
      assert.notEqual(gate.status, 'ALLOW'); return { guessed: value, gate };
    });
    prechecks.push({ id: item.id, expectedSchema: 'PASS', sixPositiveSlots: 'PROVEN_WITH_EXPLICIT_CONTROL', guesses });
  } else assert.equal(item.id, 'S06');
}
async function main() {
  const principal = json(manifest.principalSource).principalId;
  assert.equal(principal, '9997f6db-bfa1-4377-96f3-5b5ea19dbf34');
  const bodies = [];
  const config = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true', OLLAMA_LOCAL_ONLY_CONFIRMED: 'true',
    OLLAMA_MODEL: manifest.model, OLLAMA_BASE_URL: 'http://127.0.0.1:11434' };
  for (const item of manifest.cases) {
    let captured;
    const provider = createConfiguredProvider(config, async (url, init) => {
      assert.equal(String(url), manifest.endpoint);
      captured = { id: item.id, requestBody: JSON.parse(init.body), requestBodySha256: sha(init.body) };
      return new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ kind: 'unsupported' }) },
        prompt_eval_count: 1, eval_count: 1 }));
    });
    await new AgentOrchestrator({ provider, readConsent: async () => ({ personalizationEnabled: false }),
      tools: { execute: async () => { throw Error('No tool allowed in offline request capture'); } } }).chat({ id: principal, roles: ['CUSTOMER'] }, item.request);
    assert.ok(captured);
    const wireSystemSha = sha(captured.requestBody.messages[0].content);
    assert.equal(wireSystemSha, 'a70fa78949b83635dfd65bafd64504542f2733f9275d93fe5f83dc464f56c0ba');
    bodies.push({ ...captured, wireSystemSha256: wireSystemSha });
  }
  write('request-plan.json', { tier: 'OFFLINE_CAPTURE_ONLY', inferencePosts: 0, bodies });
  const validation = { status: 'PASS', manifestSha256: sha(read(dir + '/manifest.json')), caseCount: 6,
    historicalRequestsCompared: prior.length, duplicates: 0, utf8Nfc: true, schemaAndGatePrecheck: 'PASS', prechecks, sourceHashes, benchmark,
    priorFixFilesChecked: Object.keys(lastFix.hashes).length, priorFixArtifactsChecked: Object.keys(fixArtifacts.hashes).length,
    requestPlanSha256: sha(read(dir + '/request-plan.json')), inferencePosts: 0 };
  write('manifest-validation.json', validation);
  write('manifest-lock.json', { task: manifest.task, status: 'APPROVED_SCOPE_LOCKED_BEFORE_INFERENCE', lockedAt: new Date().toISOString(),
    approvalSource: manifest.approvalSource, approvalMaxInference: 6, manifestSha256: validation.manifestSha256, requestPlanSha256: validation.requestPlanSha256,
    caseOrder: manifest.order, model: manifest.model, modelDigest: manifest.modelDigest,
    benchmarkV2ApprovedSha256: benchmark.approved, benchmarkV2LockSha256: benchmark.lock, noRetries: true, noRealToolsOrDatabase: true });
  const hashes = {};
  for (const folder of ['backend/src', 'frontend/src', 'frontend/tests', 'docs']) {
    for (const file of fs.readdirSync(path.join(root, folder), { recursive: true })) {
      const rel = path.join(folder, file).replaceAll('\\', '/');
      if (rel.startsWith(dir + '/') || rel === 'docs/HUGO_T_AI_04_G1_SLOT_FILLING_LIVE_REVALIDATION_REPORT.md' || !fs.statSync(path.join(root, rel)).isFile()) continue;
      hashes[rel] = sha(read(rel));
    }
  }
  for (const rel of ['backend/package.json', 'backend/package-lock.json', 'frontend/package.json', 'frontend/package-lock.json']) hashes[rel] = sha(read(rel));
  write('integrity-before.json', { at: new Date().toISOString(), hashes });
  console.log(JSON.stringify({ status: 'PASS', manifestSha256: validation.manifestSha256, requestPlanSha256: validation.requestPlanSha256,
    historicalRequests: prior.length, snapshotFiles: Object.keys(hashes).length, inferencePosts: 0 }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
