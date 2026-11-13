// Final offline artifact validation. No network, model or DB calls.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), dir = 'docs/evidence/t-ai-04-g1-missing-slot-live-check';
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const integrity = json(dir + '/integrity-after.json');
assert.equal(integrity.status, 'PASS'); assert.equal(integrity.changes.length, 0);
for (const [rel, expected] of Object.entries(integrity.hashes)) assert.equal(sha(read(rel)), expected, rel);
const lock = json(dir + '/manifest-lock.json');
assert.equal(sha(read(dir + '/manifest.json')), lock.manifestSha256);
assert.equal(sha(read(dir + '/request-plan.json')), lock.requestPlanSha256);
assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')), lock.benchmarkV2ApprovedSha256);
assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')), lock.benchmarkV2LockSha256);
const result = json(dir + '/results.json'), evaluation = json(dir + '/evaluation-summary.json');
assert.equal(result.posts, 6); assert.deepEqual(result.nlu, { pass: 3, fail: 3, notRun: 0 });
assert.deepEqual(result.validation, { pass: 4, fail: 0, notRun: 2 });
assert.deepEqual(result.ux, { pass: 4, fail: 2, notRun: 0 }); assert.equal(result.safety.pass, 6);
assert.equal(result.recovery.applied, 1); assert.equal(result.recovery.uxPass, 1);
assert.equal(evaluation.originalSchema.accepted, 3); assert.equal(evaluation.originalSchema.rejected, 1);
assert.equal(evaluation.originalSchema.notEvaluatedNoOutput, 2);
assert.equal(json(dir + '/regression-summary.json').totalApplicablePass, 181);
assert.equal(fs.readdirSync(__dirname).filter(x => /^attempt-M\d\d\.json$/.test(x)).length, 6);
const typed = json(dir + '/M03-provider-exception.json'); assert.equal(typed.type, 'MissingReadSlotsRejection'); assert.equal(typed.beforeServiceRecovery, true);
const report = 'docs/HUGO_T_AI_04_G1_MISSING_SLOT_LIVE_CHECK_REPORT.md', text = read(report).toString('utf8');
assert.ok(!text.includes('\uFFFD'));
const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map(x => x[1]);
for (const target of links) assert.ok(fs.existsSync(path.resolve(root, 'docs', target.replace(/:\d+$/, ''))), target);
const hashes = {};
for (const name of fs.readdirSync(__dirname, { recursive: true })) {
  const rel = path.join(dir, name).replaceAll('\\', '/');
  if (fs.statSync(path.join(root, rel)).isFile()) hashes[rel] = sha(read(rel));
}
hashes[report] = sha(read(report));
fs.writeFileSync(path.join(__dirname, 'artifact-checksums.json'), JSON.stringify({ at: new Date().toISOString(), status: 'PASS', reportLinksChecked: links.length,
  posts: 6, nlu: result.nlu, validation: result.validation, ux: result.ux, recovery: result.recovery, safety: result.safety,
  sourceFilesCompared: integrity.filesCompared, sourceChanges: 0, regressionApplicablePass: 181, hashes }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'PASS', links: links.length, artifacts: Object.keys(hashes).length, posts: 6,
  nlu: result.nlu, recovery: result.recovery, safety: result.safety, sourceFilesCompared: integrity.filesCompared }));
