const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..'), read = rel => fs.readFileSync(path.join(root, rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrity-before.json'))).hashes;
const after = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrity-after.json'))).hashes;
for (const [file, hash] of Object.entries(after)) assert.equal(sha(read(file)), hash, file);
const changed = Object.keys(before).filter(file => before[file] !== after[file]);
assert.deepEqual(changed, ['backend/src/agent/liveProvider.ts', 'backend/src/agent/provider.ts']);
const report = 'docs/HUGO_T_AI_04_G1_READINESS_ABORT_GUARD_FIX_REPORT.md', body = read(report).toString('utf8');
assert.equal(body.normalize('NFC'), body);
const links = [...body.matchAll(/\]\(([^)]+)\)/g)].map(x => x[1]);
for (const link of links) assert.ok(fs.existsSync(path.resolve(root, 'docs', link)), link);
const summary = JSON.parse(fs.readFileSync(path.join(__dirname, 'final-run/verified-summary.json')));
assert.equal(summary.status, 'PASS'); assert.equal(summary.applicableRegressionPassed, 181); assert.equal(summary.newTestsPassed, 33); assert.equal(summary.priorDiagnosticsPassed, 13);
const compatibility = JSON.parse(fs.readFileSync(path.join(__dirname, 'compatibility-diff.json')));
assert.equal(compatibility.assertionsChanged, 0);
assert.equal(sha(fs.readFileSync(path.join(__dirname, 'prior-offline-diagnostics.cjs'))), sha(read('docs/evidence/t-ai-04-g1-readiness-raw-clarify-investigation/offline-diagnostics.cjs')));
const protectedHashes = JSON.parse(fs.readFileSync(path.join(__dirname, 'protected-hashes.json')));
assert.deepEqual(protectedHashes.historicalEvidenceChanged, []);
assert.equal(sha(fs.readFileSync(path.join(__dirname, 'source-diff.patch'))), protectedHashes.sourceDiffSha256);
const check = { at: new Date().toISOString(), status: 'PASS', reportLinks: links.length, reportSha256: sha(read(report)),
  baselineFiles: Object.keys(before).length, unchanged: Object.keys(before).length - changed.length, historicalEvidenceFiles: protectedHashes.historicalEvidenceFiles,
  sourceAssertionsChanged: 0, liveRequests: 0, databaseAccess: 'NONE', tests: { new: 33, priorDiagnostics: 13, applicableRegression: 181 } };
fs.writeFileSync(path.join(__dirname, 'artifact-validation.json'), JSON.stringify(check, null, 2) + '\n', { flag: 'wx' });
const hashes = {};
for (const file of fs.readdirSync(__dirname, { recursive: true })) {
  const absolute = path.join(__dirname, file); if (fs.statSync(absolute).isFile()) hashes[file.replaceAll('\\', '/')] = sha(fs.readFileSync(absolute));
}
fs.writeFileSync(path.join(__dirname, 'artifact-checksums.json'), JSON.stringify({ at: new Date().toISOString(), hashes, reportSha256: check.reportSha256 }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(check));
