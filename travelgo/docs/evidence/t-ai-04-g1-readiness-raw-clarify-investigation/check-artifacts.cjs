// Final read-only source/benchmark/evidence/artifact validation; no model/DB/network.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), dir = 'docs/evidence/t-ai-04-g1-readiness-raw-clarify-investigation';
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const integrity = json(dir + '/integrity-after.json');
assert.equal(integrity.status, 'PASS'); assert.equal(integrity.changes.length, 0); assert.equal(integrity.added.length, 0);
for (const [rel, expected] of Object.entries(integrity.hashes)) assert.equal(sha(read(rel)), expected, rel);
const diagnostic = json(dir + '/offline-diagnostic-results.json');
assert.equal(diagnostic.passed, 13); assert.equal(diagnostic.failed, 0);
assert.equal(sha(read(dir + '/offline-diagnostics.cjs')), json(dir + '/diagnostic-plan-lock.json').diagnosticSha256);
assert.equal(json(dir + '/regression-summary.json').totalApplicablePass, 181);
assert.equal(json(dir + '/model-identity.json').status, 'PASS');
assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')), '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')), 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
assert.equal(sha(read('docs/evidence/t-ai-04-g1-missing-slot-live-check/manifest.json')), 'dafcf5f1bed80e17eff03306a18ae0f641fb2728c99f080b406d5b866d7a60ab');
const report = 'docs/HUGO_T_AI_04_G1_READINESS_RAW_CLARIFY_INVESTIGATION_REPORT.md', text = read(report).toString('utf8');
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
  reportLinksChecked: links.length, sourceFilesCompared: integrity.filesCompared, sourceChanges: 0, diagnosticTestsPass: 13,
  applicableBaselinePass: 181, observationsAreNotModelAcceptance: true, inferencePosts: 0, databaseAccess: 'NONE', hashes }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: 'PASS', links: links.length, artifacts: Object.keys(hashes).length, sourceFilesCompared: integrity.filesCompared,
  diagnosticPass: 13, baselinePass: 181, inferencePosts: 0 }));
