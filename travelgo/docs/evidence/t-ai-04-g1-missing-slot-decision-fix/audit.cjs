// Read-only snapshots/diffs, no network or DB. Local working tree is the baseline.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const dir = 'docs/evidence/t-ai-04-g1-missing-slot-decision-fix';
const read = rel => fs.readFileSync(path.join(root, rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const intended = ['backend/src/services/agentService.ts', 'backend/src/agent/liveProvider.ts', 'backend/src/agent/toolProvenance.ts'];
function snapshot() {
  const hashes = {};
  for (const folder of ['backend/src', 'frontend/src', 'frontend/tests', 'docs']) for (const item of fs.readdirSync(path.join(root, folder), { recursive: true })) {
    const rel = path.join(folder, item).replaceAll('\\', '/');
    if (rel.startsWith(dir + '/') || rel === 'docs/HUGO_T_AI_04_G1_MISSING_SLOT_DECISION_FIX_REPORT.md' || !fs.statSync(path.join(root, rel)).isFile()) continue;
    hashes[rel] = sha(read(rel));
  }
  for (const rel of ['backend/package.json', 'backend/package-lock.json', 'frontend/package.json', 'frontend/package-lock.json']) hashes[rel] = sha(read(rel));
  return hashes;
}
if (process.argv[2] === 'before') {
  const hashes = snapshot();
  write('integrity-before.json', { at: new Date().toISOString(), hashes });
  for (const rel of intended) fs.writeFileSync(path.join(__dirname, path.basename(rel) + '.before.txt'), read(rel), { flag: 'wx' });
  console.log(JSON.stringify({ files: Object.keys(hashes).length, inferencePosts: 0 }));
} else if (process.argv[2] === 'after') {
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrity-before.json'))).hashes, after = snapshot();
  const changed = Object.keys(before).filter(rel => before[rel] !== after[rel]).map(rel => ({ path: rel, before: before[rel], after: after[rel] || null }));
  const added = Object.keys(after).filter(rel => !Object.hasOwn(before, rel));
  const allowedNew = ['backend/src/agent/missingSlotRecovery.ts', 'backend/src/tests/agentMissingSlotRecovery.test.ts'];
  const unexpected = [...changed.filter(x => !intended.includes(x.path)).map(x => x.path), ...added.filter(x => !allowedNew.includes(x))];
  let diff = '';
  for (const rel of intended) {
    const run = spawnSync('git', ['diff', '--no-index', '--', path.join(__dirname, path.basename(rel) + '.before.txt'), path.join(root, rel)], { encoding: 'utf8' });
    if (![0, 1].includes(run.status)) throw Error(run.stderr);
    diff += run.stdout;
  }
  fs.writeFileSync(path.join(__dirname, 'source.diff'), diff, { flag: 'wx' });
  const gateBefore = fs.readFileSync(path.join(__dirname, 'toolProvenance.ts.before.txt'), 'utf8').split('export function checkToolProvenance')[1];
  const gateAfter = read('backend/src/agent/toolProvenance.ts').toString('utf8').split('export function checkToolProvenance')[1];
  const gateBodyUnchanged = gateBefore === gateAfter;
  const status = !unexpected.length && gateBodyUnchanged ? 'PASS' : 'FAIL';
  write('integrity-after.json', { at: new Date().toISOString(), status, baselineFiles: Object.keys(before).length,
    unchanged: Object.keys(before).length - changed.length, changed, added, unexpected, gateBodyUnchanged, hashes: after, inferencePosts: 0, databaseAccess: 'NONE' });
  console.log(JSON.stringify({ status, changed, added, gateBodyUnchanged }));
  if (status !== 'PASS') process.exitCode = 1;
} else throw Error('Use before or after');
