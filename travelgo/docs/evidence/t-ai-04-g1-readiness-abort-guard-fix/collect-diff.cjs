const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict'), { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const before = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrity-before.json'))).hashes;
const after = JSON.parse(fs.readFileSync(path.join(__dirname, 'integrity-after.json'))).hashes;
const empty = path.join(__dirname, 'empty-for-diff.txt'); fs.writeFileSync(empty, '', { flag: 'wx' });
const files = ['backend/src/agent/liveProvider.ts', 'backend/src/agent/provider.ts', 'backend/src/agent/ollamaReadiness.ts', 'backend/src/tests/agentReadinessAbort.test.ts'];
let diff = '';
for (const rel of files) {
  const old = before[rel] ? path.join(__dirname, path.basename(rel) + '.before') : empty;
  const result = spawnSync('git', ['diff', '--no-index', '--no-ext-diff', '--', old, path.join(root, rel)], { encoding: 'utf8' });
  assert.ok([0, 1].includes(result.status)); diff += '\n' + result.stdout;
}
fs.writeFileSync(path.join(__dirname, 'source-diff.patch'), diff, { flag: 'wx' });
const benchmarks = Object.entries(before).filter(([, hash]) => ['0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e', 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706'].includes(hash)).map(([file, hash]) => ({ file, before: hash, after: after[file], unchanged: hash === after[file] }));
assert.ok(benchmarks.length >= 2); assert.ok(benchmarks.every(x => x.unchanged));
const protectedFiles = ['backend/src/services/agentService.ts', 'backend/src/agent/decisionSchema.ts', 'backend/src/agent/decisionValidation.ts',
  'backend/src/agent/tools.ts', 'backend/src/agent/limits.ts', 'backend/src/agent/toolProvenance.ts', 'backend/src/agent/missingSlotRecovery.ts',
  'backend/src/agent/conversation.ts', 'backend/src/agent/privacy.ts', 'backend/src/routes/agentRoutes.ts'];
const protectedHashes = protectedFiles.map(file => ({ file, before: before[file], after: after[file], unchanged: before[file] === after[file] }));
assert.ok(protectedHashes.every(x => x.before && x.unchanged));
fs.writeFileSync(path.join(__dirname, 'protected-hashes.json'), JSON.stringify({ benchmarks, protectedHashes, changed: files.map(file => ({ file, before: before[file] || null, after: after[file] })),
  historicalEvidenceFiles: Object.keys(before).filter(x => x.startsWith('docs/evidence/')).length,
  historicalEvidenceChanged: Object.keys(before).filter(x => x.startsWith('docs/evidence/') && before[x] !== after[x]),
  sourceDiffSha256: sha(Buffer.from(diff)), liveRequests: 0, databaseAccess: 'NONE' }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ benchmarks, protectedSource: protectedHashes.length, changed: files.map(file => ({ file, sha256: after[file] })) }, null, 2));
