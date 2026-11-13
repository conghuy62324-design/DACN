const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), shim = path.join(__dirname, 'legacy-ready-shim.cjs');
const jobs = [
  ['backend-build', 'cmd.exe', ['/d', '/c', 'npm.cmd run build --silent'], 'backend'],
  ['new-readiness-abort', process.execPath, ['dist/tests/agentReadinessAbort.test.js'], 'backend'],
  ...['agentMissingSlotRecovery', 'agentSlotFillingPrompt', 'agentG1SafeContract', 'agentDecisionRouting', 'agentDecisionFormatSafety',
    'agentFoundation', 'agentTransport', 'agentContractSlotInvestigation', 'agentContractSlotInvestigation.g1-applicable'].map(name =>
    [name, process.execPath, ['--require', shim, 'dist/tests/' + name + (name.endsWith('g1-applicable') ? '.js' : '.test.js')], 'backend']),
  ['frontend-agent-conversation', process.execPath, ['--experimental-strip-types', 'tests/agentConversation.test.ts'], 'frontend'],
  ['prior-13-diagnostics', process.execPath, ['--require', shim, path.join(__dirname, 'prior-offline-diagnostics.cjs')], '.'],
];
const execution = [];
for (const [name, cmd, args, folder] of jobs) {
  const result = spawnSync(cmd, args, { cwd: path.join(root, folder), encoding: 'utf8', timeout: 120000,
    env: { ...process.env, LLM_LIVE_ENABLED: 'false', LLM_USAGE_APPROVED: 'false' } });
  const log = (result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error : '');
  fs.writeFileSync(path.join(__dirname, name + '.log'), log, { flag: 'wx' });
  const passed = log.match(/"passed"\s*:\s*(\d+)/), failed = log.match(/"failed"\s*:\s*(\d+)/);
  execution.push({ name, command: [cmd, ...args], exitCode: result.status, passed: passed ? Number(passed[1]) : null, failed: failed ? Number(failed[1]) : null });
  console.log(JSON.stringify(execution.at(-1)));
  if (name === 'backend-build' && result.status !== 0) break;
}
fs.writeFileSync(path.join(__dirname, 'execution-initial.json'), JSON.stringify({ at: new Date().toISOString(), tier: 'MOCK_ONLY_OFFLINE', execution, liveRequests: 0, database: 'NOT USED' }, null, 2) + '\n', { flag: 'wx' });
