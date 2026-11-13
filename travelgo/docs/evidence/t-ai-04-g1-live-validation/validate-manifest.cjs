// Offline only. Validates and locks scope before any Ollama inference.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const manifestRel = 'docs/evidence/t-ai-04-g1-live-validation/manifest.json';
const manifestBytes = read(manifestRel);
const manifest = JSON.parse(manifestBytes);
const { AGENT_TOOLS, parseDecision, validateTool } = require(path.join(root, 'backend/dist/agent/tools.js'));
const { matchesDecisionSchema } = require(path.join(root, 'backend/dist/agent/decisionValidation.js'));
const { checkToolProvenance } = require(path.join(root, 'backend/dist/agent/toolProvenance.js'));
const prior = [
  ...json('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-b-live-probe/technical-cases.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-c-decoder-investigation/diagnostic-manifest.json').cases.map(x => x.request.message),
  ...json('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json').cases.map(x => x.message),
];
const norm = s => s.normalize('NFC').replace(/\s+/g, ' ').trim().toLocaleLowerCase('vi');
const priorSet = new Set(prior.map(norm));
assert.equal(manifest.status, 'LOCKED_BEFORE_INFERENCE');
assert.equal(manifest.approvalMaxInference, 4);
assert.deepEqual(manifest.order, ['G01', 'G02', 'G03', 'G04']);
assert.deepEqual(manifest.cases.map(x => x.id), manifest.order);
assert.equal(new Set(manifest.cases.map(x => x.id)).size, 4);
assert.equal(new Set(manifest.cases.map(x => norm(x.request.message))).size, 4);
for (const item of manifest.cases) {
  assert.equal(item.request.message, item.request.message.normalize('NFC'));
  assert.equal(item.request.message.includes('?'), false);
  assert.equal(priorSet.has(norm(item.request.message)), false, `Historical duplicate ${item.id}`);
  assert.deepEqual(item.request.history, []);
  assert.equal(matchesDecisionSchema(item.expected), true);
  const decision = parseDecision(item.expected);
  if (decision.kind === 'tool') {
    assert.deepEqual(validateTool(decision).missing, []);
    assert.deepEqual(checkToolProvenance(decision, item.request.message), { status: 'ALLOW' });
    assert.equal(item.expectedFakeToolCalls, 1);
  } else {
    assert.equal(decision.kind, 'clarify');
    assert.equal(item.expectedFakeToolCalls, 0);
    const injected = item.id === 'G03'
      ? { kind: 'tool', name: 'plan_trip', arguments: { departureCity: 'Hải Phòng', destinationCity: 'Ninh Bình',
        startDate: '2033-04-05', endDate: '2033-04-06', adults: 2, totalBudget: 3600000, transportation: 'car' } }
      : { kind: 'tool', name: 'plan_trip', arguments: { departureCity: 'Hà Nội', destinationCity: 'Mộc Châu',
        startDate: '2033-05-10', endDate: '2033-05-12', adults: 2, totalBudget: 6200000, transportation: 'car' } };
    assert.notEqual(checkToolProvenance(injected, item.request.message).status, 'ALLOW');
  }
}
const source = json('docs/evidence/t-ai-04-g1-safe-contract-fix/source-integrity.json');
const sourceFiles = [
  'backend/src/agent/liveProvider.ts', 'backend/src/agent/decisionValidation.ts',
  'backend/src/agent/toolProvenance.ts', 'backend/src/services/agentService.ts',
  'backend/src/agent/decisionSchema.ts', 'backend/src/agent/tools.ts', 'backend/src/agent/limits.ts',
];
const sourceHashes = Object.fromEntries(sourceFiles.map(rel => [rel, sha(read(rel))]));
for (const changed of source.changed) if (sourceHashes[changed.path]) assert.equal(sourceHashes[changed.path], changed.afterG1);
for (const added of source.newFiles) if (sourceHashes[added.path]) assert.equal(sourceHashes[added.path], added.sha256);
assert.equal(sourceHashes['backend/src/agent/decisionSchema.ts'], 'e53e931170f58765c7eec48344d507b257a4c3f1c3f4a88d22847ca7f78cd365');
assert.equal(sourceHashes['backend/src/agent/tools.ts'], 'f59fd3218fc6e54f1053612e36d58a428bd05e98044e36a7cdc92e12647017ce');
assert.equal(sourceHashes['backend/src/agent/limits.ts'], '62dba723d7744e9525697f6ecf12663afe7d330f12b79419acc679ce2c5bf295');
const benchmark = {
  approved: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')),
  lock: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')),
};
assert.equal(benchmark.approved, '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(benchmark.lock, 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
const result = { status: 'PASS', manifestSha256: sha(manifestBytes), caseCount: 4,
  historicalRequestsCompared: prior.length, duplicates: 0, utf8Nfc: true, schemaAndGatePrecheck: 'PASS',
  sourceHashes, benchmark, inferencePosts: 0 };
fs.writeFileSync(path.join(__dirname, 'manifest-validation.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
