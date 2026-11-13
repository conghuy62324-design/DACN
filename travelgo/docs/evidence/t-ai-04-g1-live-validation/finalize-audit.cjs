// Offline audit only; never sends requests or touches DB.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = name => JSON.parse(fs.readFileSync(path.join(__dirname, name)));
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const before = json('integrity-before.json');
const after = {}, changes = [];
for (const [rel, expected] of Object.entries(before.hashes)) {
  after[rel] = fs.existsSync(path.join(root, rel)) ? hash(read(rel)) : null;
  if (after[rel] !== expected) changes.push({ path: rel, before: expected, after: after[rel] });
}
assert.equal(hash(fs.readFileSync(path.join(__dirname, 'manifest.json'))), json('manifest-lock.json').manifestSha256);
write('integrity-after.json', { at: new Date().toISOString(), status: changes.length ? 'FAIL' : 'PASS',
  filesCompared: Object.keys(after).length, changes, hashes: after, databaseAccess: 'NONE' });
const executions = json('regression-execution.json');
const suites = {};
for (const result of executions.results) {
  const text = fs.readFileSync(path.join(__dirname, result.name + '.log'), 'utf8');
  const matched = text.match(/"passed"\s*:\s*(\d+)/);
  if (matched) suites[result.name] = { passed: Number(matched[1]), failed: Number(text.match(/"failed"\s*:\s*(\d+)/)?.[1] || 0), exitCode: result.exitCode };
}
assert.equal(suites.agentG1SafeContract.passed, 26);
assert.equal(Object.entries(suites).filter(([key]) => key !== 'agentG1SafeContract').reduce((n, [,v]) => n + v.passed, 0), 101);
assert.ok(Object.values(suites).every(x => x.failed === 0 && x.exitCode === 0));
const historical = fs.readFileSync(path.join(__dirname, 'agentContractSlotInvestigation.log'), 'utf8');
assert.ok(historical.includes("actual: 'needs_input'") && historical.includes("expected: 'completed'"));
write('regression-summary.json', { tier: 'MOCK_ONLY_OFFLINE', suites, g1: { passed: 26, failed: 0 },
  applicableRegression: { passed: 101, failed: 0 }, originalF: { passedBeforeStop: 22, failed: 1, notRun: 1,
    countBasis: 'Unchanged sequential runner: failure at test 23/24. Historical assertion requires unsafe completed; actual needs_input.',
    assertionChanged: false }, backendBuild: 'PASS', frontendBuild: 'NOT RERUN; prior G1 PASS only',
  inferencePosts: 0, databaseAccess: 'NONE' });
const attempts = ['G01', 'G02', 'G03', 'G04'].map(id => json(`attempt-${id}.json`));
assert.deepEqual(attempts.map(x => x.rateCountBefore), [0, 1, 2, 3]);
assert.equal(new Set(attempts.map(x => x.principalId)).size, 1);
write('rate-after.json', { at: new Date().toISOString(), principalId: attempts[0].principalId,
  taskPosts: attempts.length, approvedMax: 4, retries: 0, attempts,
  note: 'Same AgentLimits instance across four sequential cases; preflight historical rolling-hour count 0, final task count 4. No limit reset.' });
console.log(JSON.stringify({ integrity: changes.length ? 'FAIL' : 'PASS', files: Object.keys(after).length,
  g1: 26, applicableRegression: 101, historicalFExpectedFailure: true, posts: attempts.length }));
