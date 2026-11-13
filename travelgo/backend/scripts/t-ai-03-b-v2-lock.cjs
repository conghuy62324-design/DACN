// One-time V2 benchmark lock. Historical candidate/V1/evidence are read-only inputs.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/evidence/t-ai-03-b-v2-lock');
const candidatePath = path.join(root, 'docs/evidence/t-ai-03-b-v2-finalize/nlu-manifest-v2-candidate.json');
const provenancePath = path.join(root, 'docs/evidence/t-ai-03-b-v2-finalize/nlu-v2-candidate-provenance.json');
const v1Path = path.join(root, 'docs/evidence/t-ai-01-b/nlu-manifest.json');
const v1LockPath = path.join(root, 'docs/evidence/t-ai-01-b/nlu-manifest-lock.json');
const approvedPath = path.join(out, 'nlu-manifest-v2-approved.json');
const lockPath = path.join(out, 'nlu-manifest-v2-lock.json');
const decisionPath = path.join(out, 'approval-decision.json');
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const candidateBytes = fs.readFileSync(candidatePath), provenanceBytes = fs.readFileSync(provenancePath);
const candidateSha = sha(candidateBytes);
assert.equal(candidateSha, '5f5a037239a5ddc7bee7b9c3a7f918c404b9a350a142698ed2d79a2ae553f33c', 'Owner-approved candidate hash mismatch');
const candidate = JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(candidateBytes));
assert.equal(candidate.cases.length,24);
assert.equal(candidate.approvalStatus,'PENDING_OWNER_REVIEW');
assert.equal(JSON.parse(fs.readFileSync(v1LockPath,'utf8')).sha256,sha(fs.readFileSync(v1Path)));
const oldText = candidateBytes.toString('utf8');
const replaceExactlyOnce = (text,from,to) => {
  assert.equal(text.split(from).length-1,1,`Expected one occurrence of ${from}`);
  return text.replace(from,to);
};
const approvedText = replaceExactlyOnce(replaceExactlyOnce(oldText,
  '"version": "T_AI_03_B_VI_V2_CANDIDATE"','"version": "T_AI_03_B_VI_V2_APPROVED"'),
  '"approvalStatus": "PENDING_OWNER_REVIEW"','"approvalStatus": "APPROVED"');
const approvedBytes = Buffer.from(approvedText,'utf8');
const approved = JSON.parse(approvedText);
assert.deepEqual(approved.criteria,candidate.criteria);
assert.deepEqual(approved.cases,candidate.cases);
const approvedSha = sha(approvedBytes);
const decision = {
  decision:'APPROVED',
  authority:'Project owner instruction in TASK T-AI-03-B-V2-LOCK & OLLAMA READINESS',
  scope:'24-case NLU V2 Candidate as HuGo Travel new benchmark',
  candidateSha256:candidateSha,
  approvedManifestSha256:approvedSha,
  provenanceSha256:sha(provenanceBytes),
  classification:'RECONSTRUCTED_BENCHMARK_NOT_VERBATIM_V1',
  approvalRecordedAtUtc:new Date().toISOString(),
  note:'Approval applies to candidate content. No live model evaluation implied.'
};
const decisionBytes = Buffer.from(JSON.stringify(decision,null,2)+'\n','utf8');
const lock = {
  version:'T_AI_03_B_V2_LOCK_V1',
  sha256:approvedSha,
  candidateSha256:candidateSha,
  approvalDecisionSha256:sha(decisionBytes),
  candidateProvenanceSha256:sha(provenanceBytes),
  liveCases:24,
  mockFaultCases:0,
  benchmark:'RECONSTRUCTED_V2',
  sourceV1Sha256:sha(fs.readFileSync(v1Path)),
  status:'APPROVED_LOCKED'
};
const lockBytes = Buffer.from(JSON.stringify(lock,null,2)+'\n','utf8');
fs.mkdirSync(out,{recursive:true});
function writeNewOrVerify(file,bytes){
  if(fs.existsSync(file)) assert.deepEqual(fs.readFileSync(file),bytes,`Existing lock artifact differs: ${file}`);
  else fs.writeFileSync(file,bytes,{flag:'wx'});
}
// Preserve an existing decision's timestamp on rerun; never overwrite a historical approval record.
writeNewOrVerify(approvedPath,approvedBytes);
if(fs.existsSync(decisionPath)){
  const existing=JSON.parse(fs.readFileSync(decisionPath,'utf8'));
  assert.equal(existing.candidateSha256,candidateSha);
  assert.equal(existing.approvedManifestSha256,approvedSha);
  decision.approvalRecordedAtUtc=existing.approvalRecordedAtUtc;
}
const stableDecisionBytes=Buffer.from(JSON.stringify(decision,null,2)+'\n','utf8');
writeNewOrVerify(decisionPath,stableDecisionBytes);
lock.approvalDecisionSha256=sha(stableDecisionBytes);
writeNewOrVerify(lockPath,Buffer.from(JSON.stringify(lock,null,2)+'\n','utf8'));
// Windows read-only attribute is an accident guard; SHA-256 is the integrity check.
for(const file of [approvedPath,lockPath,decisionPath])fs.chmodSync(file,0o444);
console.log(JSON.stringify({approvedManifestSha256:approvedSha,candidateSha256:candidateSha,cases:approved.cases.length,status:lock.status,readOnly:true}));
