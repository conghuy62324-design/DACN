// Final offline artifact checksums. No network/model/DB calls.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const dir = 'docs/evidence/t-ai-04-g1-missing-slot-decision-fix';
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const integrity = json(dir + '/integrity-after.json');
assert.equal(integrity.status, 'PASS'); assert.equal(integrity.changed.length, 3); assert.equal(integrity.added.length, 2);
assert.equal(integrity.gateBodyUnchanged, true);
for (const [rel, expected] of Object.entries(integrity.hashes)) assert.equal(sha(read(rel)), expected, rel);
const review = json(dir + '/review-details.json');
for (const [rel, expected] of Object.entries(review.sourceHashes)) assert.equal(sha(read(rel)), expected, rel);
assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')), '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')), 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
assert.equal(sha(read('docs/evidence/t-ai-04-g1-slot-filling-live-revalidation/manifest.json')), 'cca9a54a5dfe8b7934d202e91ba8fb6dc63ec0a11329ff17c50fbc071d2e45c2');
const regression = json(dir + '/final/regression-summary.json');
assert.equal(regression.status, 'PASS'); assert.equal(regression.priorApplicablePass, 148); assert.equal(regression.newTestsPass, 33);
assert.equal(regression.totalApplicablePass, 181);
const replay = json(dir + '/S01-offline-replay.json');
assert.equal(replay.historicalNluResultNotRemeasured, 'FAIL'); assert.equal(replay.originalSchemaValid, false);
assert.equal(replay.providerReturned, null); assert.equal(replay.response.status, 'needs_input'); assert.equal(replay.fakeToolCalls, 0);
const report = 'docs/HUGO_T_AI_04_G1_MISSING_SLOT_DECISION_FIX_REPORT.md', text = read(report).toString('utf8');
assert.ok(!text.includes('\uFFFD'));
const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map(match => match[1]);
for (const target of links) assert.ok(fs.existsSync(path.resolve(root, 'docs', target.replace(/:\d+$/, ''))), target);
const hashes = {};
for (const name of fs.readdirSync(__dirname, { recursive: true })) {
  const rel = path.join(dir, name).replaceAll('\\', '/');
  if (fs.statSync(path.join(root, rel)).isFile()) hashes[rel] = sha(read(rel));
}
hashes[report] = sha(read(report));
fs.writeFileSync(path.join(__dirname, 'artifact-checksums.json'), JSON.stringify({ at: new Date().toISOString(), status: 'PASS',
  reportLinksChecked: links.length, rawNluLiveValidation: 'NOT RUN', offlineTests: 181, historicalFExceptionReported: true,
  baselineFiles: integrity.baselineFiles, sourceChanges: 3, newSourceAndTestFiles: 2, inferencePosts: 0, databaseAccess: 'NONE', hashes }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'PASS', links: links.length, artifacts: Object.keys(hashes).length, offlineTests: 181, inferencePosts: 0 }));
