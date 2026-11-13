// Read-only audit of historical benchmark/source; writes only a new evidence summary.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),rel=p=>path.join(root,p);
const sha=b=>createHash('sha256').update(b).digest('hex'),hash=p=>sha(fs.readFileSync(rel(p)));
const ref=JSON.parse(fs.readFileSync(rel('docs/evidence/t-ai-03-b-live-v2-b1/integrity-after.json'))).hashes;
const changed=Object.entries(ref).filter(([p,h])=>!fs.existsSync(rel(p))||hash(p)!==h).map(([p])=>p).sort();
const expectedChanges=['backend/src/agent/liveProvider.ts','backend/src/services/agentService.ts'];
assert.deepEqual(changed,expectedChanges);
const manifest='docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json';
const lockPath='docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json';
const lock=JSON.parse(fs.readFileSync(rel(lockPath)));
assert.equal(hash(manifest),'0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(hash(manifest),lock.sha256);assert.equal(hash(lockPath),ref[lockPath]);
const oldRun='docs/evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0';
const finalRun='docs/evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b';
const check=JSON.parse(fs.readFileSync(rel(`${finalRun}/old-evidence-check.json`)));
assert.equal(hash(`${oldRun}/results.json`),check.oldResultsSha256);
for(let i=1;i<=20;i++){
  const id=`VI${String(i).padStart(2,'0')}`;assert.equal(hash(`${oldRun}/${id}.json`),check.caseSha256[id]);
}
const fresh=JSON.parse(fs.readFileSync(rel(`${finalRun}/results.json`)));
assert.equal(fresh.inferencePosts,4);assert.deepEqual(fresh.cases.map(c=>c.id),['VI21','VI22','VI23','VI24']);
for(let i=21;i<=24;i++){
  const id=`VI${i}`;assert.deepEqual(JSON.parse(fs.readFileSync(rel(`${finalRun}/${id}.json`))),fresh.cases[i-21]);
}
const selected=['backend/src/services/agentService.ts','backend/src/agent/liveProvider.ts',
  'backend/src/agent/decisionSchema.ts','backend/src/agent/tools.ts','backend/src/agent/conversation.ts',
  'backend/src/agent/limits.ts','backend/src/tests/agentDecisionRouting.test.ts',
  'docs/HUGO_T_AI_03_B_LIVE_V2_B1_FINAL_REPORT.md'];
const summary={status:'PASS',referenceFiles:Object.keys(ref).length,changedFromB1Baseline:changed,
  expectedChangedProductionFiles:expectedChanges,
  selected:Object.fromEntries(selected.map(p=>[p,{before:ref[p]||null,after:hash(p)}])),
  manifestSha256:hash(manifest),lockSha256:hash(lockPath),
  oldB1ResultsSha256:hash(`${oldRun}/results.json`),oldB1CaseFilesVerified:20,
  finalResumeResultsSha256:hash(`${finalRun}/results.json`),finalResumeCaseFilesVerified:4,
  historicalReportSha256:hash('docs/HUGO_T_AI_03_B_LIVE_V2_B1_FINAL_REPORT.md'),
  databaseAccess:'NONE_IN_THIS_FIX',inferenceRequests:0};
const output=rel('docs/evidence/t-ai-04-a-fix/source-integrity.json');
fs.writeFileSync(output,JSON.stringify(summary,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:summary.status,referenceFiles:summary.referenceFiles,
  changedFromB1Baseline:changed,benchmarkHash:summary.manifestSha256,oldCases:20,resumeCases:4}));
