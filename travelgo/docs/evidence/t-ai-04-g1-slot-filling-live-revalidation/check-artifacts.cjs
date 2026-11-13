// Final read-only checksums, no network/inference/DB.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const dir = 'docs/evidence/t-ai-04-g1-slot-filling-live-revalidation';
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const integrity = json(dir + '/integrity-after.json');
assert.equal(integrity.status, 'PASS');
for (const [rel, expected] of Object.entries(integrity.hashes)) assert.equal(sha(read(rel)), expected, rel);
const lock = json(dir + '/manifest-lock.json');
assert.equal(sha(read(dir + '/manifest.json')), lock.manifestSha256);
assert.equal(sha(read(dir + '/request-plan.json')), lock.requestPlanSha256);
assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')), lock.benchmarkV2ApprovedSha256);
assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')), lock.benchmarkV2LockSha256);
const result = json(dir + '/results.json'), evaluation = json(dir + '/evaluation-summary.json');
assert.equal(result.posts, 6); assert.equal(result.nlu.pass, 5); assert.equal(result.nlu.fail, 1);
assert.equal(result.safety.pass, 6); assert.equal(evaluation.schemaPass, 5); assert.equal(evaluation.fakeToolCalls, 2);
assert.equal(json(dir + '/regression-summary.json').applicablePass, 148);
assert.equal(fs.readdirSync(__dirname).filter(x => /^attempt-S\d\d\.json$/.test(x)).length, 6);
const report = 'docs/HUGO_T_AI_04_G1_SLOT_FILLING_LIVE_REVALIDATION_REPORT.md';
const text = read(report).toString('utf8'); assert.ok(!text.includes('\uFFFD'));
const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map(x => x[1]);
for (const target of links) assert.ok(fs.existsSync(path.resolve(root, 'docs', target.replace(/:\d+$/, ''))), target);
const hashes = {};
for (const name of fs.readdirSync(__dirname, { recursive: true })) {
  const rel = path.join(dir, name).replaceAll('\\', '/');
  if (fs.statSync(path.join(root, rel)).isFile()) hashes[rel] = sha(read(rel));
}
hashes[report] = sha(read(report));
fs.writeFileSync(path.join(__dirname, 'artifact-checksums.json'), JSON.stringify({ at: new Date().toISOString(), status: 'PASS',
  reportLinksChecked: links.length, posts: 6, nlu: result.nlu, safety: result.safety, regressionApplicablePass: 148,
  sourceFilesCompared: integrity.filesCompared, sourceChanges: 0, hashes }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'PASS', links: links.length, artifacts: Object.keys(hashes).length,
  posts: 6, nlu: result.nlu, safety: result.safety, sourceFilesCompared: integrity.filesCompared }));
