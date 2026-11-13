const c = require('./common.cjs');
const prefix = 'docs/evidence/t-ai-04-g2-verified-history/';
const audit = c.json(prefix + 'final-audit.json');
const before = c.json(prefix + 'integrity-before.json').hashes;
const after = c.snapshot();
const changed = Object.keys(before).filter(file => before[file] !== after[file]).sort();
const added = Object.keys(after).filter(file => !(file in before)).sort();
c.assert.deepEqual(changed, [...audit.source.changed].sort());
c.assert.deepEqual(added, [...audit.source.added].sort());
c.assert.equal(Object.keys(before).length, 5024);
c.assert.equal(changed.length, 5);
c.assert.equal(added.length, 2);
for (const [file, hash] of Object.entries(audit.source.hashes)) c.assert.equal(c.sha(c.read(file)), hash, file);
c.assert.deepEqual(c.history(), { artifacts: 239, report: true });
const benchmark = 'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json';
const lock = 'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json';
c.assert.equal(c.sha(c.read(benchmark)), '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
c.assert.equal(c.sha(c.read(lock)), 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
const reportBytes = c.read(c.report);
const reportText = new TextDecoder('utf-8', { fatal: true }).decode(reportBytes);
c.assert.equal(reportText, reportText.normalize('NFC'), 'Report must be NFC');
c.assert.equal(reportText.includes('\ufffd'), false);
for (const hash of [...Object.values(audit.source.hashes), audit.prompts.g1WireSha256, audit.prompts.g2WireSha256]) c.assert.ok(reportText.includes(hash), 'Missing report hash: ' + hash);
let checkedLinks = 0;
for (const match of reportText.matchAll(/\]\(([^)]+)\)/g)) {
  const link = match[1];
  if (/^(https?:|#|mailto:)/.test(link)) continue;
  const target = c.path.resolve(c.root, c.path.dirname(c.report), link.split('#')[0]);
  if (target === c.path.join(c.evidence, 'artifact-checksums.json')) continue;
  c.assert.ok(c.fs.existsSync(target), 'Missing report link: ' + link);
  checkedLinks++;
}
const g2 = c.json(prefix + 'g2-results-final.json');
c.assert.equal(g2.passed, 68);
c.assert.equal(g2.failed, 0);
c.assert.equal(g2.results.length, 68);
c.assert.equal(new Set(g2.results.map(x => x.id)).size, 68);
for (const [name, n] of [['natural', 79], ['compatibility', 61], ['correction', 42], ['completeness', 52]]) {
  c.assert.equal(audit.tests[name].passed, n);
  c.assert.equal(audit.tests[name].failed, 0);
}
c.assert.equal(audit.guards.nativeOllamaPosts, 0);
c.assert.equal(audit.guards.preloads, 0);
c.assert.equal(audit.guards.nativeReadinessGets, 0);
c.assert.equal(audit.guards.postgres, 0);
const hashes = {};
for (const relative of c.fs.readdirSync(c.evidence, { recursive: true }).sort()) {
  const file = relative.replaceAll('\\', '/');
  if (file === 'artifact-checksums.json') continue;
  const full = c.path.join(c.evidence, relative);
  if (c.fs.statSync(full).isFile()) hashes[file] = c.sha(c.fs.readFileSync(full));
}
const seal = {
  at: new Date().toISOString(),
  status: 'FINAL_G2_OFFLINE_LOCAL_DEMO_INTEGRITY_PASS',
  report: c.report,
  reportSha256: c.sha(reportBytes),
  sourceHashes: audit.source.hashes,
  baselineFiles: 5024,
  unchangedBaselineFiles: 5019,
  authorizedSourceChanges: 5,
  newSourceFiles: 2,
  historicalIntegrity: { artifacts: 239, report: true },
  checkedReportLinks: checkedLinks,
  tests: audit.tests,
  nativeRequests: 0,
  postgres: false,
  hashes
};
c.write('artifact-checksums.json', seal);
const stored = c.json(prefix + 'artifact-checksums.json');
for (const [file, hash] of Object.entries(stored.hashes)) c.assert.equal(c.sha(c.read(prefix + file)), hash, file);
c.assert.equal(c.sha(c.read(stored.report)), stored.reportSha256);
console.log(JSON.stringify({ status: stored.status, reportSha256: stored.reportSha256, artifacts: Object.keys(hashes).length, checkedLinks, sourceFiles: Object.keys(stored.sourceHashes).length, nativeRequests: 0, postgres: false }));
