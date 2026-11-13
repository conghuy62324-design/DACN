// OFFLINE only: production unit tests use fake providers/consent/tools.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const jobs = [
  ['backend-build', 'cmd.exe', ['/d', '/c', 'npm.cmd run build --silent'], 'backend'],
  ...['agentG1SafeContract', 'agentDecisionRouting', 'agentDecisionFormatSafety', 'agentFoundation', 'agentTransport',
    'agentContractSlotInvestigation', 'agentContractSlotInvestigation.g1-applicable'].map(name =>
      [name, process.execPath, ['dist/tests/' + name + (name.endsWith('g1-applicable') ? '.js' : '.test.js')], 'backend']),
  ['frontend-agent-conversation', process.execPath, ['--experimental-strip-types', 'tests/agentConversation.test.ts'], 'frontend'],
];
const results = [];
for (const [name, cmd, args, cwd] of jobs) {
  const result = spawnSync(cmd, args, { cwd: path.join(root, cwd), encoding: 'utf8', timeout: 120000,
    env: { ...process.env, LLM_LIVE_ENABLED: 'false', LLM_USAGE_APPROVED: 'false' } });
  const log = (result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error : '');
  fs.writeFileSync(path.join(__dirname, name + '.log'), log, { flag: 'wx' });
  results.push({ name, command: [cmd, ...args], exitCode: result.status, error: result.error?.message || null });
  console.log(name + ': exit ' + result.status);
  if (name === 'backend-build' && result.status !== 0) break;
}
fs.writeFileSync(path.join(__dirname, 'regression-execution.json'), JSON.stringify({ at: new Date().toISOString(),
  tier: 'MOCK_ONLY_OFFLINE', liveInference: 0, databaseAccess: 'NONE', results }, null, 2) + '\n', { flag: 'wx' });
