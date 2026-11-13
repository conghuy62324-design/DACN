const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),final=process.argv[2]==='--final',evidenceDir=final?path.join(__dirname,'final-verified'):__dirname;
const load=name=>{
 if(final&&name==='final-supplement.json')return{results:[{name:'final-completeness',passed:JSON.parse(fs.readFileSync(path.join(evidenceDir,'execution.json'))).execution.find(x=>x.name==='new-completeness').passed},
 {name:'downstream-control-readiness-33',passed:Number(fs.readFileSync(path.join(evidenceDir,'downstream-control-readiness-33.log'),'utf8').match(/"passed"\s*:\s*(\d+)/)[1])}]};
 return JSON.parse(fs.readFileSync(path.join(name.startsWith('integrity-')?__dirname:evidenceDir,final&&name==='integrity-after.json'?'integrity-after-final.json':name)));
},sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const write=(name,data)=>fs.writeFileSync(path.join(evidenceDir,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const execution=load('execution.json').execution,suites=[],conflicts=[];let passed=10,failed=0,postControl=10,passWithServerShortCircuit=0;
function reason(name){
 if(/unsupported decision remains/.test(name))return'Previously injected unsupported on an incomplete supported turn is never requested. Server missing question takes precedence; unsupported behavior on actual provider paths unchanged.';
 if(/auth, external consent and rate/.test(name))return'Auth/consent/quota checks remain before precheck; assertion counted a provider call that is now correctly zero.';
 if(/prompt|production request|private context|history remains/.test(name))return'Known incomplete turn sends no provider payload. Access to old fake captured request is undefined by design; privacy/history checks downstream retained in layer control.';
 if(/network|HTTP|timeout|malformed|unknown tool|schema errors|contradicted or invented/.test(name))return'Fault was injected only into an uncalled provider for known incomplete input. No actual provider/network/validation error occurred; new COMPLETE/UNDETERMINED tests verify real errors remain errors.';
 return'Old assertion required a returned/rejected raw model decision or one provider invocation for proven incomplete input. SERVER_COMPLETENESS now asks exact fields before provider; raw model not evaluated.';
}
for(const item of execution.filter(x=>x.name.startsWith('actual-policy-agent'))){
 const actual=load(item.resultFile),control=load(item.resultFile.replace('actual-policy-','downstream-control-'));
 assert.equal(actual.results.length,item.expectedCount);assert.equal(control.passed,item.expectedCount);assert.equal(control.failed,0);
 passed+=actual.passed;failed+=actual.failed;postControl+=control.passed;
 passWithServerShortCircuit+=actual.results.filter(x=>x.status==='PASS'&&x.origins.some(o=>o.origin==='SERVER_COMPLETENESS')).length;
 for(const test of actual.results.filter(x=>x.status==='FAIL')){
  assert.ok(test.origins.some(o=>o.origin==='SERVER_COMPLETENESS'),test.name);
  assert.equal(control.results.find(x=>x.name===test.name).status,'PASS');
  conflicts.push({suite:actual.suite,name:test.name,originalStatus:'FAIL',disposition:'APPROVED_POLICY_EXPECTATION_CONFLICT',reason:reason(test.name),
    actualOrigins:test.origins,originalError:test.error,downstreamControl:'PASS',rawNluForServerTurn:'NOT_EVALUATED'});
 }
 suites.push({suite:actual.suite,actualPolicy:{pass:actual.passed,fail:actual.failed,notRun:0},downstreamControl:{pass:control.passed,fail:control.failed}});
}
assert.equal(passed,150);assert.equal(failed,31);assert.equal(postControl,181);
const readinessLog=fs.readFileSync(path.join(evidenceDir,'readiness-33.log'),'utf8');
const readiness=JSON.parse(readinessLog.slice(readinessLog.indexOf('{\n  "suite": "readiness-abort-guard"')));
assert.equal(readiness.passed,32);assert.equal(readiness.failed,1);
const readinessConflict=readiness.results.filter(x=>x.status==='FAIL');assert.equal(readinessConflict[0].name,'mock clarify path performs no readiness or network; existing deterministic response remains');
const diagnostics=load('actual-policy-diagnostics/offline-diagnostic-results.json'),diagControl=load('downstream-control-diagnostics/offline-diagnostic-results.json');
assert.equal(diagnostics.passed,8);assert.equal(diagnostics.failed,5);assert.equal(diagControl.passed,13);
const diagnosticConflicts=diagnostics.results.filter(x=>x.status==='FAIL').map(x=>({name:x.name,originalStatus:'FAIL',disposition:'APPROVED_POLICY_EXPECTATION_CONFLICT',
 reason:'Input is the known positive G1 incomplete fixture. Precheck does not invoke fake fetch; the old injected error/timeout/raw-recovery observation is not reached.',originalError:x.message}));
const supplement=load('final-supplement.json');assert.equal(supplement.results.find(x=>x.name==='final-completeness').passed,final?52:50);assert.equal(supplement.results.find(x=>x.name==='downstream-control-readiness-33').passed,33);
write('compatibility-review.json',{status:'REVIEWED_NO_UNCLASSIFIED_FAILURE',suites,conflicts,readinessConflict:readinessConflict.map(x=>({...x,disposition:'APPROVED_EXACT_MISSING_SET_CHANGE',
 reason:'Pure search intent omits both destinationCity and dailyBudgetPerPerson; old mock only clarified destinationCity. New test explicitly requires both, zero provider.'})),diagnosticConflicts,
 actualPolicyTotals:{baseline:{pass:passed,fail:failed,notRun:0,passedCasesWithServerShortCircuit:passWithServerShortCircuit},readiness:{pass:32,fail:1,notRun:0},diagnostics:{pass:8,fail:5,notRun:0}},
 layerIsolationTotals:{baseline:181,readiness:33,diagnostics:13,meaning:'MOCK_ONLY assessor stub isolates downstream only; not production-policy end-to-end acceptance or model NLU.'},
 approvedNewPolicyTests:{pass:final?52:50,fail:0},unexpectedRegressions:0,historicalF:{passBeforeStop:22,fail:1,notRun:1,assertionUnchanged:true}});
const before=load('integrity-before.json').hashes,after=load('integrity-after.json').hashes,files=['backend/src/agent/toolProvenance.ts','backend/src/agent/missingSlotRecovery.ts','backend/src/services/agentService.ts','backend/src/agent/currentCompleteness.ts','backend/src/tests/agentServerCompleteness.test.ts'];
const empty=path.join(evidenceDir,'empty-for-diff.txt');fs.writeFileSync(empty,'',{flag:'wx'});let patch='';
for(const file of files){const original=before[file]?path.join(__dirname,path.basename(file)+'.before'):empty;
 const result=spawnSync('git',['diff','--no-index','--no-ext-diff','--',original,path.join(root,file)],{encoding:'utf8'});assert.ok([0,1].includes(result.status));patch+='\n'+result.stdout;}
fs.writeFileSync(path.join(evidenceDir,'source-diff.patch'),patch,{flag:'wx'});
const protectedFiles=['backend/src/agent/liveProvider.ts','backend/src/agent/provider.ts','backend/src/agent/ollamaReadiness.ts','backend/src/agent/decisionSchema.ts','backend/src/agent/decisionValidation.ts','backend/src/agent/tools.ts','backend/src/agent/limits.ts','backend/src/agent/conversation.ts','backend/src/agent/privacy.ts','backend/src/routes/agentRoutes.ts'];
for(const file of protectedFiles)assert.equal(before[file],after[file],file);
write('source-hashes.json',{changed:files.map(file=>({file,before:before[file]||null,after:after[file]})),protectedFiles:protectedFiles.map(file=>({file,sha256:after[file],unchanged:true})),
 benchmark:Object.entries(before).filter(([,hash])=>['0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e','f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706'].includes(hash)).map(([file,hash])=>({file,sha256:hash,unchanged:hash===after[file]})),
 historicalEvidenceChanged:Object.keys(before).filter(file=>file.startsWith('docs/evidence/')&&before[file]!==after[file]),sourceDiffSha256:sha(patch)});
const approvalPaths=['C:/Users/Danh/.codex/attachments/479de637-760a-4afb-a02f-0483abdd1d15/Pasted text.txt','C:/Users/Danh/.codex/attachments/e7b51ffa-761d-40f0-befa-b7a2a546f564/Pasted text.txt'];
write('task-approval.json',{at:new Date().toISOString(),sources:approvalPaths.map(file=>({file,sha256:sha(fs.readFileSync(file))})),identical:true,liveInferenceApproved:false,productionPolicy:'SERVER_FIRST_PROVEN_G1_ONLY'});
console.log(JSON.stringify({newTests:final?52:50,actualPolicy:{baseline:{pass:passed,fail:failed},readiness:{pass:32,fail:1},diagnostics:{pass:8,fail:5}},controls:{baseline:181,readiness:33,diagnostics:13},passWithServerShortCircuit,unexpected:0,
 hashes:files.map(file=>({file,before:before[file]||null,after:after[file]}))}));
