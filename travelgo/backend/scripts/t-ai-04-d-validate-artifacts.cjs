// OFFLINE_ONLY. Never calls fetch, Ollama, Agent tools, or a database.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const evidence = path.join(root, 'docs/evidence/t-ai-04-d-decision-format-safety');
const read = rel => fs.readFileSync(path.join(root, rel));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = rel => JSON.parse(read(rel));
const { AGENT_TOOLS, FIELD_LABELS, parseDecision, validateTool } = require('../dist/agent/tools.js');
const manifestRel = 'docs/evidence/t-ai-04-d-decision-format-safety/next-live-manifest-draft.json';
const schemaRel = 'docs/evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json';
const manifest = json(manifestRel);
const schema = json(schemaRel);
assert.equal(manifest.status, 'DRAFT_NOT_APPROVED_NO_POST');
assert.equal(manifest.requestCountToApprove, 8);
assert.equal(manifest.cases.length, 4);
assert.equal(manifest.modelDigest, '0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0');
assert.deepEqual(schema.properties.name.enum, AGENT_TOOLS.map(t => t.name));
assert.deepEqual(schema.properties.fields.items.enum, Object.keys(FIELD_LABELS));
const previous = [
  ...json('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json').cases,
  ...json('docs/evidence/t-ai-04-b-live-probe/technical-cases.json').cases,
  ...json('docs/evidence/t-ai-04-c-decoder-investigation/diagnostic-manifest.json').cases,
];
const priorMessages = new Set(previous.map(c => c.request.message.normalize('NFC')));
const ids = new Set(), messages = new Set();
let tool = 0, clarify = 0, unsupported = 0;
for (const item of manifest.cases) {
  assert.match(item.id, /^E0[1-4]$/);
  assert.ok(!ids.has(item.id)); ids.add(item.id);
  assert.equal(item.message, item.message.normalize('NFC'));
  assert.ok(!messages.has(item.message) && !priorMessages.has(item.message)); messages.add(item.message);
  assert.deepEqual(item.history, []);
  assert.deepEqual([...item.order].sort(), ['B', 'C']);
  const decision = parseDecision(item.expected);
  if (decision.kind === 'tool') { tool++; assert.deepEqual(validateTool(decision).missing, []); }
  else if (decision.kind === 'clarify') clarify++;
  else unsupported++;
}
assert.deepEqual(manifest.cases.map(c => c.order.join('')), ['BC', 'CB', 'BC', 'CB']);
assert.deepEqual({ tool, clarify, unsupported }, { tool: 2, clarify: 1, unsupported: 1 });
const approved = read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json');
const v2lock = json('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json');
assert.equal(sha(approved), v2lock.sha256);
assert.equal(v2lock.sha256, '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
const previousSource = json('docs/evidence/t-ai-03-b-live-v2-b1/integrity-after.json').hashes;
const fix = json('docs/evidence/t-ai-04-a-fix/source-integrity.json');
const changed = [];
for (const [rel, baseline] of Object.entries(previousSource)) {
  const expected = fix.selected[rel]?.after || baseline;
  if (!fs.existsSync(path.join(root, rel)) || sha(read(rel)) !== expected) changed.push(rel);
}
const artifact = {
  status: changed.length ? 'FAIL' : 'PASS', baselineFiles: Object.keys(previousSource).length,
  changed, benchmarkV2Sha256: sha(approved),
  benchmarkV2LockSha256: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')),
  diagnosticSchemaSha256: sha(read(schemaRel)), nextLiveDraftSha256: sha(read(manifestRel)),
  manifest: { uniqueNewCases: ids.size, duplicateRequests: 0, tool, clarify, unsupported,
    futurePostsRequested: manifest.requestCountToApprove, approved: false },
  checkedAgentFiles: Object.fromEntries(['backend/src/agent/decisionSchema.ts', 'backend/src/agent/tools.ts',
    'backend/src/agent/liveProvider.ts', 'backend/src/services/agentService.ts',
    'backend/src/agent/limits.ts'].map(rel => [rel, sha(read(rel))])),
  inference: 0, database: 'NOT_USED',
};
fs.writeFileSync(path.join(evidence, 'artifact-validation.json'), JSON.stringify(artifact, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(artifact, null, 2));
assert.equal(artifact.status, 'PASS');
