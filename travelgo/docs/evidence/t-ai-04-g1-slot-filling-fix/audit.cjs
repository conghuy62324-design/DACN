// Offline source/evidence audit. No network or DB access.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const read = rel => fs.readFileSync(path.join(root, rel));
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const excluded = 'docs/evidence/t-ai-04-g1-slot-filling-fix/';
const report = 'docs/HUGO_T_AI_04_G1_SLOT_FILLING_FIX_REPORT.md';
function snapshot() {
  const hashes = {};
  for (const dir of ['backend/src', 'frontend/src', 'frontend/tests', 'docs']) {
    for (const file of fs.readdirSync(path.join(root, dir), { recursive: true })) {
      const rel = path.join(dir, file).replaceAll('\\', '/');
      if (rel.startsWith(excluded) || rel === report || !fs.statSync(path.join(root, rel)).isFile()) continue;
      hashes[rel] = hash(read(rel));
    }
  }
  for (const rel of ['backend/package.json', 'backend/package-lock.json', 'frontend/package.json', 'frontend/package-lock.json']) hashes[rel] = hash(read(rel));
  return hashes;
}
const source = 'backend/src/services/agentService.ts';
if (process.argv[2] === 'before') {
  const hashes = snapshot();
  write('integrity-before.json', { at: new Date().toISOString(), hashes });
  fs.writeFileSync(path.join(__dirname, 'agentService.before.txt'), read(source), { flag: 'wx' });
  console.log(JSON.stringify({ files: Object.keys(hashes).length, sourceSha256: hashes[source] }));
} else if (process.argv[2] === 'after') {
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrity-before.json'))).hashes;
  const after = snapshot();
  const changed = Object.entries(before).filter(([rel, value]) => after[rel] !== value)
    .map(([rel, value]) => ({ path: rel, before: value, after: after[rel] || null }));
  const added = Object.keys(after).filter(rel => !Object.hasOwn(before, rel));
  const expectedNew = 'backend/src/tests/agentSlotFillingPrompt.test.ts';
  const unexpected = [...changed.filter(x => x.path !== source).map(x => x.path), ...added.filter(x => x !== expectedNew)];
  const diff = spawnSync('git', ['diff', '--no-index', '--', path.join(__dirname, 'agentService.before.txt'), path.join(root, source)], { encoding: 'utf8' });
  if (![0, 1].includes(diff.status)) throw new Error(diff.stderr);
  fs.writeFileSync(path.join(__dirname, 'source.diff'), diff.stdout, { flag: 'wx' });
  const old = fs.readFileSync(path.join(__dirname, 'agentService.before.txt'), 'utf8');
  const current = read(source).toString('utf8');
  const runtimeUnchanged = old.slice(old.indexOf('export interface AgentDependencies')) === current.slice(current.indexOf('export interface AgentDependencies'));
  const status = unexpected.length === 0 && changed.length === 1 && runtimeUnchanged ? 'PASS' : 'FAIL';
  write('integrity-after.json', { at: new Date().toISOString(), status, baselineFiles: Object.keys(before).length,
    unchanged: Object.keys(before).length - changed.length, changed, added, unexpected, runtimeUnchanged,
    hashes: after, inferencePosts: 0, databaseAccess: 'NONE' });
  console.log(JSON.stringify({ status, unchanged: Object.keys(before).length - changed.length, changed, added, runtimeUnchanged }));
  if (status !== 'PASS') process.exitCode = 1;
} else throw new Error('Use before or after');
