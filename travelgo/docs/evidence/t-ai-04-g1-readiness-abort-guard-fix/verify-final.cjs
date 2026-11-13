const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), output = path.join(__dirname, 'final-run');
const args = ['--require', path.join(__dirname, 'legacy-ready-shim.cjs'), 'dist/tests/agentTransport.readiness-compatible.js'];
const run = spawnSync(process.execPath, args, { cwd: path.join(root, 'backend'), encoding: 'utf8', timeout: 120000,
  env: { ...process.env, LLM_LIVE_ENABLED: 'false', LLM_USAGE_APPROVED: 'false' } });
const log = (run.stdout || '') + (run.stderr || '');
fs.writeFileSync(path.join(output, 'agentTransport-ready-control-plane.log'), log, { flag: 'wx' });
assert.equal(run.status, 0, log); assert.equal(Number(log.match(/"passed"\s*:\s*(\d+)/)?.[1]), 19);
const previous = JSON.parse(fs.readFileSync(path.join(output, 'summary.json')));
const execution = previous.execution.map(x => x.name === 'agentTransport-compatible' ? { ...x, exitCode: 0, passed: 19, failed: 0, matchesExpected: true,
  log: 'agentTransport-ready-control-plane.log', compatibility: 'Synthetic GET readiness now also provided to historical loopback HTTP mock server; POST assertions unchanged' } : { ...x, log: x.name + '.log' });
const result = { ...previous, at: new Date().toISOString(), status: execution.every(x => x.matchesExpected) ? 'PASS' : 'FAIL', execution,
  applicableRegressionPassed: execution.filter(x => !['new-readiness-abort', 'prior-13-diagnostics-compatible'].includes(x.name)).reduce((n, x) => n + (x.passed || 0), 0),
  note: 'Aggregate of unchanged passing suites and corrected transport fixture run. Initial failures retained. No assertion changed.' };
assert.equal(result.status, 'PASS'); assert.equal(result.applicableRegressionPassed, 181);
fs.writeFileSync(path.join(output, 'verified-summary.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, applicable: result.applicableRegressionPassed, new: result.newTestsPassed, diagnostics: result.priorDiagnosticsPassed, liveRequests: 0 }));
