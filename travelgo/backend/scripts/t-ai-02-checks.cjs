const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/evidence/t-ai-02', 'checks-' + new Date().toISOString().replace(/[-:.]/g, ''));
fs.mkdirSync(out, { recursive: true });
const commands = [
  ['backend-build', 'backend', 'build'],
  ['frontend-build', 'frontend', 'build'],
  ['agent-unit-http-mock', 'backend', 'dist/tests/agentFoundation.test.js'],
  ['transport-unit-http-mock', 'backend', 'dist/tests/agentTransport.test.js'],
  ['assistant-ui-unit', 'frontend', 'tests/agentConversation.test.ts'],
  ['rbac-unit', 'backend', 'dist/tests/rbac.test.js'],
  ['planner-validation-costs', 'backend', 'dist/tests/plannerValidationCosts.test.js'],
  ['planner-modes', 'backend', 'dist/tests/plannerModes.test.js'],
  ['recommendation-correctness', 'backend', 'dist/tests/recommendationCorrectness.test.js'],
];
const results = [];
for (const [name, dir, command] of commands) {
  const build = command === 'build';
  const bin = build ? (process.env.ComSpec || 'cmd.exe') : process.execPath;
  const args = build ? ['/d', '/s', '/c', 'npm.cmd run build'] : command.endsWith('.ts') ? ['--experimental-strip-types', command] : [command];
  const p = spawnSync(bin, args, { cwd: path.join(root, dir), encoding: 'utf8', env: { ...process.env, LLM_LIVE_ENABLED: 'false' } });
  fs.writeFileSync(path.join(out, `${name}.log`), (p.stdout || '') + (p.stderr || '') + (p.error ? String(p.error) : ''));
  results.push({ name, command: build ? `${dir}: npm run build` : `${dir}: node ${command}`, exitCode: p.status, status: p.status === 0 ? 'PASS' : 'FAIL' });
  if (p.status !== 0) { process.exitCode = 1; break; }
}
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ evidence: path.relative(root, out).replaceAll('\\', '/'), results }, null, 2));
