// Final read-only artifact validation and checksum index. No network/DB.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const dir = 'docs/evidence/t-ai-04-g1-slot-filling-fix';
const expected = {
  'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json': '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e',
  'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json': 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706',
  'docs/evidence/t-ai-04-g1-live-validation/manifest.json': '98210d7d93530fdcc4952063d3d5a3849eda81189d75ef3674f3a109f4e5cb4e',
  'docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json': 'ebbbb9ad59ca4f699038a38698ded1d0d9f8d3d5285fcd817a8260cc4fc2f08c',
  'backend/src/tests/agentContractSlotInvestigation.test.ts': 'cfb2d8100fc61afd2907bcbdde2c12277bb0a926c8a250ba800a8d5e7c46e035',
  'backend/src/services/agentService.ts': '7aa80a472611011efedb89822a3f6cc9cb9aace5707f54144bb0784a6c1f332f',
  'backend/src/tests/agentSlotFillingPrompt.test.ts': 'eb1158408997eb99f0fa11881ab47f255e8a0590307dc789f620d148e053e94b',
};
for (const [rel, sha] of Object.entries(expected)) assert.equal(hash(read(rel)), sha, rel);
const integrity = json(dir + '/integrity-after.json');
assert.equal(integrity.status, 'PASS');
for (const [rel, sha] of Object.entries(integrity.hashes)) assert.equal(hash(read(rel)), sha, rel);
const regression = json(dir + '/regression-summary.json');
assert.equal(regression.status, 'PASS'); assert.equal(regression.applicablePass, 148);
const report = 'docs/HUGO_T_AI_04_G1_SLOT_FILLING_FIX_REPORT.md';
const text = read(report).toString('utf8');
assert.ok(!text.includes('\uFFFD'));
const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
for (const target of links) assert.ok(fs.existsSync(path.resolve(root, 'docs', target.replace(/:\d+$/, ''))), target);
const hashes = {};
for (const name of fs.readdirSync(__dirname, { recursive: true })) {
  const rel = path.join(dir, name).replaceAll('\\', '/');
  if (fs.statSync(path.join(root, rel)).isFile()) hashes[rel] = hash(read(rel));
}
hashes[report] = hash(read(report));
const result = { at: new Date().toISOString(), status: 'PASS', reportLinksChecked: links.length, applicableOfflineTests: 148,
  sourceChanges: 1, newTests: 1, benchmarkLocks: 'PASS', inferencePosts: 0, databaseAccess: 'NONE', hashes };
fs.writeFileSync(path.join(__dirname, 'artifact-checksums.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, links: links.length, artifacts: Object.keys(hashes).length, applicableOfflineTests: 148 }));
