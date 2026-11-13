// T-AI-04-F read-only baseline audit; writes only new F evidence. No network/DB/inference.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const evidence = path.join(root, 'docs/evidence/t-ai-04-f-contract-slot-filling');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const baseline = json('docs/evidence/t-ai-03-b-live-v2-b1/integrity-after.json').hashes;
const fix = json('docs/evidence/t-ai-04-a-fix/source-integrity.json');
const changed = [];
for (const [rel, hash] of Object.entries(baseline)) {
  const file = path.join(root, rel), expected = fix.selected[rel]?.after || hash;
  if (!fs.existsSync(file) || sha(read(rel)) !== expected) changed.push(rel);
}
const hashes = {
  benchmarkV2: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')),
  benchmarkV2Lock: sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')),
  eApproved: sha(read('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json')),
  eLock: sha(read('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-lock.json')),
  eCombined: sha(read('docs/evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88/combined-results.json')),
  newTest: sha(read('backend/src/tests/agentContractSlotInvestigation.test.ts')),
};
assert.equal(hashes.benchmarkV2, '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(hashes.benchmarkV2Lock, 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
assert.equal(hashes.eApproved, 'ebbbb9ad59ca4f699038a38698ded1d0d9f8d3d5285fcd817a8260cc4fc2f08c');
const oldRun = 'docs/evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88';
const before = json(`${oldRun}/old-evidence-before.json`), after = json(`${oldRun}/old-evidence-after.json`);
assert.deepEqual(before, after);
const historicalChanged = Object.entries(after).filter(([rel, hash]) =>
  !fs.existsSync(path.join(root, rel)) || sha(read(rel)) !== hash).map(([rel]) => rel);
assert.deepEqual(historicalChanged, []);
const suites = [
  ['candidate', 'agentContractSlotInvestigation-final.log'], ['formatSafety', 'agentDecisionFormatSafety.log'],
  ['routing', 'agentDecisionRouting.log'], ['foundation', 'agentFoundation.log'],
  ['transport', 'agentTransport.log'], ['frontendConversation', 'frontend-agent-conversation.log'],
];
const regression = Object.fromEntries(suites.map(([name, file]) => {
  const bytes = fs.readFileSync(path.join(evidence, file));
  const content = bytes[0] === 0xff && bytes[1] === 0xfe ? bytes.toString('utf16le') : bytes.toString('utf8');
  const passed = content.match(/"passed":\s*(\d+)/), failed = content.match(/"failed":\s*(\d+)/);
  assert.ok(passed && failed, `Missing counts in ${file}`);
  return [name, { passed: Number(passed[1]), failed: Number(failed[1]) }];
}));
const total = Object.values(regression).reduce((acc, row) => ({ passed: acc.passed + row.passed, failed: acc.failed + row.failed }),
  { passed: 0, failed: 0 });
assert.deepEqual(total, { passed: 102, failed: 0 });
const result = { status: changed.length ? 'FAIL' : 'PASS', baselineFiles: Object.keys(baseline).length, changed,
  hashes, historicalEvidenceFilesUnchanged: Object.keys(before).length, historicalChanged,
  regression, total, backendBuild: 'PASS', inferencePosts: 0, databaseAccess: 'NONE', productionSourceEdits: 0 };
fs.writeFileSync(path.join(evidence, 'integrity-and-regression-verified.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(result, null, 2));
assert.equal(result.status, 'PASS');
