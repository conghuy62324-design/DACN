const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/evidence/t-ai-03-a', 'checks-' + new Date().toISOString().replace(/[-:.]/g, ''));
fs.mkdirSync(out, { recursive: true });
const commands = [
  ['backend-build', 'backend', 'build'], ['frontend-build', 'frontend', 'build'],
  ['agent-foundation', 'backend', 'dist/tests/agentFoundation.test.js'],
  ['agent-transport', 'backend', 'dist/tests/agentTransport.test.js'],
  ['assistant-ui-unit', 'frontend', 'tests/agentConversation.test.ts'],
  ['planner-validation-costs', 'backend', 'dist/tests/plannerValidationCosts.test.js'],
  ['planner-modes', 'backend', 'dist/tests/plannerModes.test.js'],
  ['recommendation', 'backend', 'dist/tests/recommendationCorrectness.test.js'],
  ['assistant-ui-browser-mock', 'frontend', 'browser'],
];
const results = [];
for (const [name, dir, command] of commands) {
  const build = command === 'build', browser = command === 'browser';
  const bin = build || browser ? process.env.ComSpec || 'cmd.exe' : process.execPath;
  const args = build ? ['/d', '/s', '/c', 'npm.cmd run build'] : browser
    ? ['/d', '/s', '/c', 'npx.cmd playwright test --config playwright.t-ai-02.config.ts']
    : command.endsWith('.ts') ? ['--experimental-strip-types', command] : [command];
  const browserOut = path.join(out, 'browser-mock'); if (browser) fs.mkdirSync(browserOut);
  const p = spawnSync(bin, args, { cwd: path.join(root, dir), encoding: 'utf8', env: {
    ...process.env, LLM_LIVE_ENABLED: 'false', ALLOW_TEST_DB_WRITES: 'false', ...(browser ? { T_AI_02_EVIDENCE: browserOut } : {}) } });
  fs.writeFileSync(path.join(out, `${name}.log`), (p.stdout || '') + (p.stderr || '') + (p.error ? String(p.error) : ''));
  results.push({ name, exitCode: p.status, status: p.status === 0 ? 'PASS' : 'FAIL', tier: browser ? 'UI MOCK_ONLY' : 'LOCAL_REGRESSION' });
  if (p.status !== 0) { process.exitCode = 1; break; }
}
fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2));
console.log(JSON.stringify({ evidence: path.relative(root, out).replaceAll('\\', '/'), results }));
