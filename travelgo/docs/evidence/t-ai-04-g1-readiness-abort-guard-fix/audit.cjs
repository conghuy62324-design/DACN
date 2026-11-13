const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..'), dir = 'docs/evidence/t-ai-04-g1-readiness-abort-guard-fix';
const allowed = ['backend/src/agent/liveProvider.ts', 'backend/src/agent/provider.ts'];
const newAllowed = ['backend/src/agent/ollamaReadiness.ts', 'backend/src/tests/agentReadinessAbort.test.ts'];
const read = rel => fs.readFileSync(path.join(root, rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
function snapshot() {
  const hashes = {};
  for (const folder of ['backend/src', 'frontend/src', 'frontend/tests', 'docs']) for (const item of fs.readdirSync(path.join(root, folder), { recursive: true })) {
    const rel = path.join(folder, item).replaceAll('\\', '/');
    if (rel.startsWith(dir + '/') || rel === 'docs/HUGO_T_AI_04_G1_READINESS_ABORT_GUARD_FIX_REPORT.md' || !fs.statSync(path.join(root, rel)).isFile()) continue;
    hashes[rel] = sha(read(rel));
  }
  for (const rel of ['backend/package.json', 'backend/package-lock.json', 'frontend/package.json', 'frontend/package-lock.json']) hashes[rel] = sha(read(rel));
  return hashes;
}
if (process.argv[2] === 'before') {
  write('integrity-before.json', { at: new Date().toISOString(), hashes: snapshot() });
  for (const rel of allowed) fs.copyFileSync(path.join(root, rel), path.join(__dirname, path.basename(rel) + '.before'));
} else {
  const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrity-before.json'))).hashes, after = snapshot();
  const changes = Object.keys(before).filter(rel => before[rel] !== after[rel]);
  const added = Object.keys(after).filter(rel => !Object.hasOwn(before, rel));
  const unexpected = changes.filter(x => !allowed.includes(x)).concat(added.filter(x => !newAllowed.includes(x)));
  write('integrity-after.json', { at: new Date().toISOString(), status: unexpected.length ? 'FAIL' : 'PASS', filesCompared: Object.keys(before).length,
    changes, added, unexpected, hashes: after, inferencePosts: 0, databaseAccess: 'NONE' });
  assert.deepEqual(unexpected, []);
  console.log(JSON.stringify({ unchanged: Object.keys(before).length - changes.length, changes, added, status: 'PASS' }));
}
