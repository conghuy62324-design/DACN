// T-AI-04-E: offline approval artifact. No network, database, or inference.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const dst = path.join(root, 'docs/evidence/t-ai-04-e-controlled-format-safety');
const draftPath = path.join(root, 'docs/evidence/t-ai-04-d-decision-format-safety/next-live-manifest-draft.json');
const schemaPath = path.join(root, 'docs/evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const draftBytes = fs.readFileSync(draftPath), schemaBytes = fs.readFileSync(schemaPath);
assert.equal(sha(draftBytes), 'a388ba0530bc290221869d90d06df2238b6821708cd3760568650a01b66f895f');
assert.equal(sha(schemaBytes), 'ac0454601f61899b1a2e64b15e0b2f518fe1d02bb40a2a27a7cc5bdc50d2f4f7');
const draft = JSON.parse(draftBytes), schema = JSON.parse(schemaBytes);
const { AGENT_TOOLS, FIELD_LABELS, parseDecision, validateTool } = require('../dist/agent/tools.js');
const { DECISION_SCHEMA } = require('../dist/agent/decisionSchema.js');
const check = (s, v) => {
  if (s.anyOf) return s.anyOf.filter(branch => check(branch, v)).length === 1;
  if (s.enum && !s.enum.includes(v)) return false;
  if (s.type === 'object') {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
    if ((s.required || []).some(k => !Object.hasOwn(v, k))) return false;
    if (s.additionalProperties === false && Object.keys(v).some(k => !Object.hasOwn(s.properties || {}, k))) return false;
    return Object.entries(v).every(([k, x]) => !s.properties?.[k] || check(s.properties[k], x));
  }
  if (s.type === 'array') return Array.isArray(v) && v.length >= (s.minItems ?? 0) && v.length <= (s.maxItems ?? Infinity) && v.every(x => check(s.items, x));
  if (s.type === 'string') return typeof v === 'string' && v.length >= (s.minLength ?? 0) && v.length <= (s.maxLength ?? Infinity) &&
    (s.format !== 'date' || /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00.000Z`)) && new Date(`${v}T00:00:00.000Z`).toISOString().slice(0, 10) === v) &&
    (s.format !== 'uuid' || /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v));
  if (s.type === 'integer') return Number.isSafeInteger(v) && v >= (s.minimum ?? -Infinity);
  if (s.type === 'number') return typeof v === 'number' && Number.isFinite(v) && v >= (s.minimum ?? -Infinity) && v > (s.exclusiveMinimum ?? -Infinity);
  return true;
};
assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.type, 'object'); assert.equal(schema.additionalProperties, false);
assert.deepEqual(schema.required, ['kind']);
assert.deepEqual(schema.properties.name.enum, AGENT_TOOLS.map(t => t.name));
assert.deepEqual(schema.properties.fields.items.enum, Object.keys(FIELD_LABELS));
assert.deepEqual(new Set(Object.keys(schema.properties.arguments.properties)),
  new Set(AGENT_TOOLS.flatMap(t => Object.keys(t.parameters.properties))));
assert.equal(draft.cases.length, 4); assert.equal(draft.requestCountToApprove, 8);
const previous = [
  ...JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json'))).cases,
  ...JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/t-ai-04-b-live-probe/technical-cases.json'))).cases,
  ...JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/t-ai-04-c-decoder-investigation/diagnostic-manifest.json'))).cases,
];
const old = new Set(previous.map(c => c.request.message.normalize('NFC'))), seen = new Set();
for (const c of draft.cases) {
  assert.ok(!old.has(c.message) && !seen.has(c.message)); seen.add(c.message);
  assert.equal(c.message, c.message.normalize('NFC')); assert.deepEqual(c.history, []);
  assert.deepEqual([...c.order].sort(), ['B', 'C']);
  assert.ok(check(DECISION_SCHEMA, c.expected), `${c.id} expected violates original schema`);
  const d = parseDecision(c.expected); if (d.kind === 'tool') assert.deepEqual(validateTool(d).missing, []);
}
assert.deepEqual(draft.cases.map(c => c.id), ['E01', 'E02', 'E03', 'E04']);
assert.deepEqual(draft.cases.map(c => c.order.join('')), ['BC', 'CB', 'BC', 'CB']);
const v2bytes = fs.readFileSync(path.join(root, 'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json'));
assert.equal(sha(v2bytes), '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
const approved = { ...draft, status: 'APPROVED_LOCKED' };
const approvedBytes = Buffer.from(JSON.stringify(approved, null, 2) + '\n');
fs.mkdirSync(dst, { recursive: true });
const lock = {
  status: 'APPROVED_LOCKED', approval: 'Owner message T-AI-04-E, max 8 local Ollama inferences',
  approvedAt: new Date().toISOString(), draftSha256: sha(draftBytes), approvedSha256: sha(approvedBytes),
  diagnosticSchemaSha256: sha(schemaBytes), benchmarkV2Sha256: sha(v2bytes),
  caseIds: draft.cases.map(c => c.id), order: draft.cases.flatMap(c => c.order.map(v => `${c.id}-${v}`)),
  maxPosts: 8, contentChanges: ['status DRAFT_NOT_APPROVED_NO_POST to APPROVED_LOCKED only'],
};
fs.writeFileSync(path.join(dst, 'manifest-approved.json'), approvedBytes, { flag: 'wx' });
fs.writeFileSync(path.join(dst, 'manifest-lock.json'), JSON.stringify(lock, null, 2) + '\n', { flag: 'wx' });
fs.writeFileSync(path.join(dst, 'approval-audit.json'), JSON.stringify({ ...lock, validation: {
  cases: 4, uniqueRequests: 4, oldRequestDuplicates: 0, expectedOriginalSchema: 'PASS',
  expectedRuntime: 'PASS', schemaCStructuralSubset: 'PASS', ollamaCompatibility: 'NOT_YET_TESTED',
} }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(lock, null, 2));
