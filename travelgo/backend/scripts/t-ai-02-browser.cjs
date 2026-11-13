const fs = require('node:fs'), path = require('node:path'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/evidence/t-ai-02', 'browser-' + new Date().toISOString().replace(/[-:.]/g, ''));
fs.mkdirSync(out, { recursive: true });
const p = spawnSync(process.env.ComSpec || 'cmd.exe', ['/d','/s','/c','npx.cmd playwright test --config playwright.t-ai-02.config.ts'], {
  cwd: path.join(root, 'frontend'), env: { ...process.env, T_AI_02_EVIDENCE: out, LLM_LIVE_ENABLED: 'false' }, encoding: 'utf8',
});
fs.writeFileSync(path.join(out, 'run.log'), (p.stdout || '') + (p.stderr || ''));
console.log(JSON.stringify({ evidence: path.relative(root, out).replaceAll('\\','/'), exitCode: p.status }));
console.log((p.stdout || '').slice(-6000)); process.exitCode = p.status || 0;
