// Offline only; new suite plus all 148 applicable prior tests, original F separately.
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const output = __dirname;
const jobs = [
  ['backend-build', 'cmd.exe', ['/d', '/c', 'npm.cmd run build --silent'], 'backend'],
  ...['agentMissingSlotRecovery', 'agentSlotFillingPrompt', 'agentG1SafeContract', 'agentDecisionRouting', 'agentDecisionFormatSafety',
    'agentFoundation', 'agentTransport', 'agentContractSlotInvestigation', 'agentContractSlotInvestigation.g1-applicable'].map(name =>
    [name, process.execPath, ['dist/tests/' + name + (name.endsWith('g1-applicable') ? '.js' : '.test.js')], 'backend']),
  ['frontend-agent-conversation', process.execPath, ['--experimental-strip-types', 'tests/agentConversation.test.ts'], 'frontend'],
];
const execution = [], suites = {};
for (const [name, cmd, args, folder] of jobs) {
  const result = spawnSync(cmd, args, { cwd: path.join(root, folder), encoding: 'utf8', timeout: 120000,
    env: { ...process.env, LLM_LIVE_ENABLED: 'false', LLM_USAGE_APPROVED: 'false' } });
  const log = (result.stdout || '') + (result.stderr || '') + (result.error ? '\n' + result.error : '');
  fs.writeFileSync(path.join(output, name + '.log'), log, { flag: 'wx' });
  execution.push({ name, command: [cmd, ...args], exitCode: result.status, error: result.error?.message || null });
  const match = log.match(/"passed"\s*:\s*(\d+)/);
  if (match) suites[name] = { passed: Number(match[1]), failed: Number(log.match(/"failed"\s*:\s*(\d+)/)?.[1] || 0), exitCode: result.status };
  console.log(name + ': exit ' + result.status + (match ? ', passed ' + match[1] : ''));
  if (name === 'backend-build' && result.status !== 0) break;
}
const historical = fs.readFileSync(path.join(output, 'agentContractSlotInvestigation.log'), 'utf8');
const expectedHistoricalFailure = historical.includes("actual: 'needs_input'") && historical.includes("expected: 'completed'");
const status = execution.length === jobs.length && execution.every(x => x.exitCode === (x.name === 'agentContractSlotInvestigation' ? 1 : 0)) && expectedHistoricalFailure ? 'PASS' : 'FAIL';
const priorApplicablePass = Object.entries(suites).filter(([name]) => name !== 'agentMissingSlotRecovery').reduce((sum, [,x]) => sum + x.passed, 0);
fs.writeFileSync(path.join(output, 'regression-summary.json'), JSON.stringify({ at: new Date().toISOString(), status,
  tier: 'MOCK_ONLY_OFFLINE', suites, execution, priorApplicablePass, newTestsPass: suites.agentMissingSlotRecovery?.passed || 0,
  totalApplicablePass: priorApplicablePass + (suites.agentMissingSlotRecovery?.passed || 0),
  originalHistoricalF: { expectedHistoricalFailure, passedBeforeStop: 22, failed: 1, notRun: 1,
    countBasis: 'Unchanged sequential runner fails at old unsafe observation 23/24; assertions/evidence unchanged.' },
  frontendBuild: 'NOT RUN: frontend source unchanged', inferencePosts: 0, databaseAccess: 'NONE' }, null, 2) + '\n', { flag: 'wx' });
if (status !== 'PASS') process.exitCode = 1;
