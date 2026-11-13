// Create task-local compatibility copy. Never edit the prior harness/evidence.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const oldRel = 'docs/evidence/t-ai-04-g1-live-validation/run-live.cjs';
const old = fs.readFileSync(path.join(root, oldRel), 'utf8');
let source = old.replaceAll('t-ai-04-g1-live-validation', 't-ai-04-g1-slot-filling-live-revalidation');
function replace(from, to) { assert.ok(source.includes(from), 'Compatibility anchor missing: ' + from); source = source.replace(from, to); }
replace('Run --preflight first, then --run once.', 'Six approved S cases; run --preflight first, then --run once.');
replace('assert.equal(manifest.approvalMaxInference, 4);', 'assert.equal(manifest.approvalMaxInference, 6);');
replace("assert.deepEqual(manifest.order, ['G01', 'G02', 'G03', 'G04']);", "assert.deepEqual(manifest.order, ['S01', 'S02', 'S03', 'S04', 'S05', 'S06']);");
replace("record.checks.manifest = 'PASS';", `assert.equal(sha(read('docs/evidence/t-ai-04-g1-slot-filling-live-revalidation/request-plan.json')), lock.requestPlanSha256);
    for (const [rel, hash] of Object.entries(json('docs/evidence/t-ai-04-g1-slot-filling-live-revalidation/integrity-before.json').hashes))
      assert.equal(sha(read(rel)), hash, rel);
    record.checks.fullSourceAndEvidenceSnapshot = 'PASS';
    record.checks.manifest = 'PASS';`);
replace('requestBodySha256 = sha(String(options.body));', `requestBodySha256 = sha(String(options.body));
      const planned = json('docs/evidence/t-ai-04-g1-slot-filling-live-revalidation/request-plan.json').bodies.find(x => x.id === item.id);
      assert.equal(requestBodySha256, planned.requestBodySha256, 'Locked request body changed');`);
replace('return response;\n    };', `writeNew(item.id + '-ollama-response.json', { capturedAt: new Date().toISOString(), httpStatus, envelope });
      return response;
    };`);
replace("status: results.length === 4 ? 'COMPLETE' : 'PARTIAL'", "status: results.length === 6 && results.every(x => x.nlu !== 'NOT RUN') ? 'COMPLETE' : 'PARTIAL'");
replace('approvedMaxInference: 4, posts, results', 'approvedMaxInference: 6, posts, results');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
fs.writeFileSync(path.join(__dirname, 'run-live.cjs'), source, { flag: 'wx' });
fs.copyFileSync(path.join(root, 'docs/evidence/t-ai-04-g1-slot-filling-fix/run-regression.cjs'), path.join(__dirname, 'run-regression.cjs'), fs.constants.COPYFILE_EXCL);
fs.writeFileSync(path.join(__dirname, 'harness-compatibility.json'), JSON.stringify({ base: oldRel, baseSha256: sha(old), newSha256: sha(source),
  changes: ['New evidence paths and six S case IDs/budget', 'Verify locked request-plan bodies and full before snapshot',
    'Persist full actual Ollama envelope in addition to raw decision', 'Partial status when quota stops remaining cases'],
  businessAssertions: 'Same schema, semantic comparison, safety scoring, limits, provider and orchestrator; expected from new locked manifest.',
  inferencePosts: 0 }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ harnessSha256: sha(source), inferencePosts: 0 }));
