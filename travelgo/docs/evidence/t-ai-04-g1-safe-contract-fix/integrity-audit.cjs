// Read-only G1 source and historical-artifact audit. No DB/network/model calls.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const baseline = json('docs/evidence/t-ai-03-b-live-v2-b1/integrity-after.json').hashes;
const priorFix = json('docs/evidence/t-ai-04-a-fix/source-integrity.json').selected;
const intended = new Set([
  'backend/package.json', 'backend/package-lock.json',
  'backend/src/agent/liveProvider.ts', 'backend/src/services/agentService.ts',
  'backend/src/tests/agentFoundation.test.ts', 'backend/src/tests/agentTransport.test.ts',
  'backend/src/tests/agentDecisionRouting.test.ts',
]);
const changed = [];
for (const [rel, original] of Object.entries(baseline)) {
  const beforeG1 = priorFix[rel]?.after || original;
  const afterG1 = fs.existsSync(path.join(root, rel)) ? hash(read(rel)) : null;
  if (afterG1 !== beforeG1) changed.push({ path: rel, beforeG1, afterG1, intended: intended.has(rel) });
}
for (const [rel, prior] of Object.entries(priorFix)) {
  if (Object.hasOwn(baseline, rel)) continue;
  const beforeG1 = prior.after;
  const afterG1 = fs.existsSync(path.join(root, rel)) ? hash(read(rel)) : null;
  if (afterG1 !== beforeG1) changed.push({ path: rel, beforeG1, afterG1, intended: intended.has(rel) });
}
const unexpected = changed.filter(item => !item.intended);
const historicalRun = 'docs/evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88';
const historical = json(`${historicalRun}/old-evidence-after.json`);
const historicalChanged = Object.entries(historical).filter(([rel, expected]) =>
  !fs.existsSync(path.join(root, rel)) || hash(read(rel)) !== expected).map(([rel]) => rel);
const immutable = {
  v2Approved: { actual: hash(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')),
    expected: '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e' },
  v2Lock: { actual: hash(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')),
    expected: 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706' },
  eApproved: { actual: hash(read('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json')),
    expected: 'ebbbb9ad59ca4f699038a38698ded1d0d9f8d3d5285fcd817a8260cc4fc2f08c' },
  fDiagnosticTest: { actual: hash(read('backend/src/tests/agentContractSlotInvestigation.test.ts')),
    expected: 'cfb2d8100fc61afd2907bcbdde2c12277bb0a926c8a250ba800a8d5e7c46e035' },
};
const newFiles = [
  'backend/src/agent/decisionValidation.ts', 'backend/src/agent/toolProvenance.ts',
  'backend/src/tests/agentG1SafeContract.test.ts',
  'backend/src/tests/agentDecisionFormatSafety.test.ts',
].map(rel => ({ path: rel, sha256: hash(read(rel)) }));
const result = { status: unexpected.length || historicalChanged.length ||
    Object.values(immutable).some(x => x.actual !== x.expected) ? 'FAIL' : 'PASS',
  baselineFiles: Object.keys(baseline).length, changed, unexpected,
  historicalEvidenceFilesChecked: Object.keys(historical).length, historicalChanged, immutable, newFiles,
  inferencePosts: 0, databaseAccess: 'NONE' };
fs.writeFileSync(path.join(__dirname, 'source-integrity.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: result.status, changed: changed.length,
  unexpected: unexpected.length, historicalChanged: historicalChanged.length,
  immutablePass: Object.values(immutable).every(x => x.actual === x.expected) }));
if (result.status !== 'PASS') process.exitCode = 1;
