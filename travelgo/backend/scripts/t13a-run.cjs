const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const backend = path.resolve(__dirname, '..');
const project = path.resolve(backend, '..');
const frontend = path.join(project, 'frontend');
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14) + '-' + crypto.randomBytes(3).toString('hex');
const evidenceRoot = path.resolve(project, process.env.T13A_EVIDENCE_ROOT || 'docs/evidence/t13a');
const output = path.join(evidenceRoot, runId);
fs.mkdirSync(output, { recursive: true });
const save = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = (...args) => spawnSync('git', args, { cwd: project, encoding: 'utf8' }).stdout;
function sourceFiles() {
  return git('ls-files', '--cached', '--others', '--exclude-standard').split(/\r?\n/).filter(p => p &&
    /^(backend\/src\/|frontend\/src\/|database\/migrations\/|docs\/[^/]+\.md$)/.test(p) && fs.existsSync(path.join(project, p)));
}
async function port(preferred) {
  const bind = n => new Promise((resolve, reject) => { const s = net.createServer(); s.once('error', reject); s.listen(n, '127.0.0.1', () => { const assigned = s.address().port; s.close(() => resolve(assigned)); }); });
  try { return await bind(preferred); } catch { return await bind(0); }
}
async function command(name, program, args, cwd, env) {
  return new Promise(resolve => {
    const child = spawn(program, args, { cwd, env, windowsHide: true }); let stdout = '', stderr = '';
    child.stdout.on('data', b => { stdout += b; if (name === 'browser') process.stdout.write(b); });
    child.stderr.on('data', b => { stderr += b; });
    child.on('error', error => { stderr += error.message; });
    child.on('close', code => { save(name + '.json', { program, args, cwd, exitCode: code, stdout, stderr }); console.log(JSON.stringify({ name, exitCode: code })); resolve(code); });
  });
}
async function main() {
  const backPort = await port(5313), frontPort = await port(3313);
  const env = { ...process.env, NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_NAME: 'travelgo_ai_m0_test', TEST_DATABASE_NAME: 'travelgo_ai_m0_test', DB_SSL: 'false', ALLOW_TEST_DB_WRITES: 'true',
    T13A_RUN_ID: runId, T13A_EVIDENCE: output, PLAYWRIGHT_BACKEND_PORT: String(backPort), PLAYWRIGHT_FRONTEND_PORT: String(frontPort),
    JWT_SECRET: crypto.randomBytes(48).toString('hex'), JWT_EXPIRES_SECONDS: '28800' };
  Object.assign(process.env, env);
  save('environment.json', { runId, head: git('rev-parse', 'HEAD').trim(), workingTree: git('status', '--short'), node: process.version, timezone: 'Asia/Saigon', nodeEnv: env.NODE_ENV, dbHost: env.DB_HOST, database: env.DB_NAME, testDatabase: env.TEST_DATABASE_NAME, dbSSL: false, writeOptIn: true, backendPort: backPort, frontendPort: frontPort, source: 'Current working tree; no reset/stash/seed/migration', browser: 'Edge headless; mobile viewport emulation, not a physical device' });
  fs.writeFileSync(path.join(output, 'working-tree-before.diff'), git('diff', '--binary'));
  const beforeSources = Object.fromEntries(sourceFiles().map(p => [p, hash(path.join(project, p))])); save('source-hashes-before.json', beforeSources);
  fs.writeFileSync(path.join(evidenceRoot, 'LATEST.txt'), runId + '\n');
  console.log(JSON.stringify({ runId, output, backPort, frontPort }));
  for (const [name, cwd] of [['backend-build', backend], ['frontend-build', frontend]]) {
    if (await command(name, 'cmd.exe', ['/d', '/s', '/c', 'npm.cmd run build'], cwd, env) !== 0) throw new Error(name + ' failed');
  }
  const support = require('./t13a-support.cjs');
  save('preflight.json', await support.schema());
  const fingerprint = (name, mode, ...args) => command(name, process.execPath, ['dist/evaluation/t11_db_fingerprint.js', mode, ...args], backend, env);
  const before = path.join(output, 'fingerprint-before.json'), after = path.join(output, 'fingerprint-after.json');
  if (await fingerprint('fingerprint-before-command', 'snapshot', before)) throw new Error('before fingerprint failed');
  let browserExit;
  try {
    browserExit = await command('browser', process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.core-e2e.config.ts', ...process.argv.slice(2)], frontend, env);
  } finally {
    const cleanup = [];
    // Worker afterAll normally cleans. This independently recovers the persisted
    // ledger after a failed test/worker; it never searches arbitrary old fixtures.
    for (const name of ['desktop', 'mobile']) {
      if (!fs.existsSync(path.join(output, name, 'ledger.json'))) continue;
      try { const fixture = new support.Fixtures(output, name); if (fixture.data.cleanup !== 'PASS') await fixture.cleanup(); cleanup.push({ project: name, result: 'PASS' }); }
      catch (error) { cleanup.push({ project: name, result: 'FAIL', error: error.message }); }
    }
    save('cleanup-final.json', cleanup);
    await fingerprint('fingerprint-after-command', 'snapshot', after);
    const compareExit = await fingerprint('fingerprint-compare', 'compare', before, after);
    const finalSources = Object.fromEntries(Object.keys(beforeSources).map(p => [p, fs.existsSync(path.join(project, p)) ? hash(path.join(project, p)) : null]));
    save('source-hashes-after.json', finalSources);
    const changed = Object.keys(beforeSources).filter(p => finalSources[p] !== beforeSources[p]);
    save('source-integrity.json', { count: Object.keys(beforeSources).length, changed, same: changed.length === 0 });
    save('run-summary.json', { runId, browserExit, compareExit, cleanup, sourceUnchanged: changed.length === 0 });
    await support.sequelize.close();
    if (browserExit !== 0 || compareExit !== 0 || cleanup.some(v => v.result !== 'PASS') || changed.length) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
