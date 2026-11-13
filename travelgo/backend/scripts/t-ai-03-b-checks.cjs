// Offline regressions only. Never enable live provider or DB writes.
const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/evidence/t-ai-03-b', 'checks-' + new Date().toISOString().replace(/[-:.]/g, ''));
fs.mkdirSync(out, { recursive: true });
const commands = [
  ['backend-build', 'backend', 'build'], ['frontend-build', 'frontend', 'build'],
  ['agent-foundation', 'backend', 'dist/tests/agentFoundation.test.js'],
  ['agent-transport', 'backend', 'dist/tests/agentTransport.test.js'],
  ['assistant-ui-unit', 'frontend', 'tests/agentConversation.test.ts'],
  ['planner-validation-costs', 'backend', 'dist/tests/plannerValidationCosts.test.js'],
  ['planner-modes', 'backend', 'dist/tests/plannerModes.test.js'],
  ['recommendation', 'backend', 'dist/tests/recommendationCorrectness.test.js'],
];
const results = [];
for (const [name, dir, command] of commands) {
  const build = command === 'build';
  const bin = build ? process.env.ComSpec || 'cmd.exe' : process.execPath;
  const args = build ? ['/d','/s','/c','npm.cmd run build'] : command.endsWith('.ts') ? ['--experimental-strip-types', command] : [command];
  const p = spawnSync(bin, args, { cwd: path.join(root, dir), encoding: 'utf8',
    env: { ...process.env, LLM_LIVE_ENABLED: 'false', ALLOW_TEST_DB_WRITES: 'false' } });
  fs.writeFileSync(path.join(out, `${name}.log`), (p.stdout || '') + (p.stderr || '') + (p.error ? String(p.error) : ''));
  results.push({ name, exitCode: p.status, status: p.status === 0 ? 'PASS' : 'FAIL', liveLLM: 'NOT RUN' });
  if (p.status !== 0) { process.exitCode = 1; break; }
}
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ evidence: path.relative(root, out).replaceAll('\\', '/'), results }));
