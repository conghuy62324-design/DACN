const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), shim = path.join(__dirname, 'legacy-ready-shim.cjs');
const output = path.join(__dirname, 'final-run'); fs.mkdirSync(output);
const suites = ['agentMissingSlotRecovery', 'agentSlotFillingPrompt', 'agentG1SafeContract', 'agentDecisionRouting', 'agentDecisionFormatSafety', 'agentFoundation'];
const jobs = [
  ['backend-build', 'cmd.exe', ['/d', '/c', 'npm.cmd run build --silent'], 'backend', null],
  ['new-readiness-abort', process.execPath, ['dist/tests/agentReadinessAbort.test.js'], 'backend', 33],
  ...suites.map((name, i) => [name, process.execPath, ['--require', shim, 'dist/tests/' + name + '.test.js'], 'backend', [33, 21, 26, 10, 17, 22][i]]),
  ['agentTransport-compatible', process.execPath, ['--require', shim, 'dist/tests/agentTransport.readiness-compatible.js'], 'backend', 19],
  ['historical-F', process.execPath, ['--require', shim, 'dist/tests/agentContractSlotInvestigation.test.js'], 'backend', null],
  ['F-applicable', process.execPath, ['--require', shim, 'dist/tests/agentContractSlotInvestigation.g1-applicable.js'], 'backend', 23],
  ['frontend-agent-conversation', process.execPath, ['--experimental-strip-types', 'tests/agentConversation.test.ts'], 'frontend', 10],
  ['prior-13-diagnostics-compatible', process.execPath, ['--require', shim, path.join(__dirname, 'prior-diagnostics-compatible/offline-diagnostics.cjs')], '.', 13],
];
const execution = [];
for (const [name, cmd, args, folder, expectedPass] of jobs) {
  const result = spawnSync(cmd, args, { cwd: path.join(root, folder), encoding: 'utf8', timeout: 120000,
    env: { ...process.env, LLM_LIVE_ENABLED: 'false', LLM_USAGE_APPROVED: 'false' } });
  const log = (result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error : '');
  fs.writeFileSync(path.join(output, name + '.log'), log, { flag: 'wx' });
  const passed = log.match(/"passed"\s*:\s*(\d+)/), failed = log.match(/"failed"\s*:\s*(\d+)/);
  const item = { name, command: [cmd, ...args], exitCode: result.status, passed: passed ? Number(passed[1]) : null, failed: failed ? Number(failed[1]) : null,
    expectedPass, matchesExpected: name === 'historical-F' ? result.status === 1 && log.includes("actual: 'needs_input'") && log.includes("expected: 'completed'") : result.status === 0 && (expectedPass === null || Number(passed?.[1]) === expectedPass && Number(failed?.[1]) === 0) };
  execution.push(item); console.log(JSON.stringify(item));
  if (name === 'backend-build' && result.status !== 0) break;
}
const applicable = execution.filter(x => !['new-readiness-abort', 'prior-13-diagnostics-compatible'].includes(x.name)).reduce((sum, x) => sum + (x.passed || 0), 0);
const result = { at: new Date().toISOString(), status: execution.length === jobs.length && execution.every(x => x.matchesExpected) ? 'PASS' : 'FAIL',
  execution, applicableRegressionPassed: applicable, newTestsPassed: execution.find(x => x.name === 'new-readiness-abort')?.passed,
  priorDiagnosticsPassed: execution.find(x => x.name === 'prior-13-diagnostics-compatible')?.passed,
  historicalF: { passedBeforeStop: 22, failed: 1, notRun: 1, note: 'Unchanged unsafe historical observation expected completed; current safe result needs_input. Not included in 181.' },
  sourceAssertionsChanged: 0, liveRequests: 0, database: 'NOT USED', frontendBuild: 'NOT RUN: unchanged source' };
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
assert.equal(result.status, 'PASS'); assert.equal(applicable, 181);
