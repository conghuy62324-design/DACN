const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),dir=path.join(__dirname,'final-verified'),prior=path.join(root,'docs/evidence/t-ai-04-g1-server-completeness-policy-fix/final-verified');
const final=process.argv[2]==='--final',reviewDir=final?path.join(__dirname,'final-review'):dir;if(final)fs.mkdirSync(reviewDir);
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),load=(name,folder=dir)=>JSON.parse(fs.readFileSync(path.join(folder,name))),write=(name,data)=>fs.writeFileSync(path.join(reviewDir,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const execution=load('execution.json').execution,suites=[],legacyPrecheckConflicts=[],singleIntentConflicts=[];let passed=10,failed=0,controlPass=10,controlFail=0;
for(const job of execution.filter(x=>x.name.startsWith('actual-policy-agent'))){
 const actual=load(job.resultFile),control=load(job.resultFile.replace('actual-policy-','downstream-control-')),previous=load(job.resultFile,prior);
 assert.equal(actual.results.length,job.expectedCount);assert.equal(control.results.length,job.expectedCount);
 passed+=actual.passed;failed+=actual.failed;controlPass+=control.passed;controlFail+=control.failed;
 for(const row of actual.results.filter(x=>x.status==='FAIL')){
  const old=previous.results.find(x=>x.name===row.name);assert.ok(old);
  if(old.status==='FAIL'){assert.ok(row.origins.some(x=>x.origin==='SERVER_COMPLETENESS'));assert.equal(control.results.find(x=>x.name===row.name).status,'PASS');
   legacyPrecheckConflicts.push({suite:actual.suite,name:row.name,originalStatus:'FAIL',classification:'INHERITED_SERVER_FIRST_COMPATIBILITY',error:row.error});
  }else{assert.equal(actual.suite,'agentFoundation');assert.ok(row.origins.some(x=>x.origin==='MODEL'));assert.equal(control.results.find(x=>x.name===row.name).status,'FAIL');
   singleIntentConflicts.push({suite:actual.suite,name:row.name,originalStatus:'FAIL',classification:'SHARED_PROOF_SINGLE_INTENT_FIXTURE_CONFLICT',
    reason:'Original chat fixture names both read intents. New gate rejects absent unique current intent; assessor stub cannot bypass gate. Original expected assertions retained; separately disambiguated fixture keeps callbacks/assertions unchanged.',error:row.error});}
 }
 suites.push({suite:actual.suite,actual:{pass:actual.passed,fail:actual.failed,notRun:0},downstream:{pass:control.passed,fail:control.failed,notRun:0}});
}
assert.equal(passed,145);assert.equal(failed,36);assert.equal(controlPass,176);assert.equal(controlFail,5);assert.equal(legacyPrecheckConflicts.length,31);assert.equal(singleIntentConflicts.length,5);
const logs=name=>fs.readFileSync(path.join(dir,name),'utf8');
const parsedReadiness=JSON.parse(logs('readiness-33.log').slice(logs('readiness-33.log').indexOf('{\n  "suite": "readiness-abort-guard"')));
assert.equal(parsedReadiness.passed,32);assert.equal(parsedReadiness.failed,1);
const diagnostics=load('actual-policy-diagnostics/offline-diagnostic-results.json'),diagControl=load('downstream-control-diagnostics/offline-diagnostic-results.json');assert.equal(diagnostics.passed,8);assert.equal(diagnostics.failed,5);assert.equal(diagControl.passed,13);
assert.ok(logs('downstream-control-readiness-33.log').includes('"passed": 33'));
assert.ok(fs.readFileSync(path.join(__dirname,'foundation-single-intent-control.log'),'utf8').includes('"passed": 22'));
const currentJobs=execution.filter(x=>['new-completeness','new-execution-correction'].includes(x.name));assert.ok(currentJobs.every(x=>x.exitCode===0&&x.failed===0));
assert.equal(currentJobs.find(x=>x.name==='new-completeness').passed,52);assert.equal(currentJobs.find(x=>x.name==='new-execution-correction').passed,42);
const oldActualDiag=load('actual-policy-diagnostics/offline-diagnostic-results.json',prior);assert.deepEqual(diagnostics.results.filter(x=>x.status==='FAIL').map(x=>x.name),oldActualDiag.results.filter(x=>x.status==='FAIL').map(x=>x.name));
const review={at:new Date().toISOString(),status:'PASS_WITH_EXPLICIT_COMPATIBILITY',acceptance:{newCorrection:42,serverCompleteness:52,fail:0},suites,
 actualPolicy:{original181:{pass:145,fail:36,notRun:0},readiness:{pass:32,fail:1,notRun:0},diagnostics:{pass:8,fail:5,notRun:0}},
 downstreamOriginal:{original181:{pass:176,fail:5,notRun:0},readiness:{pass:33,fail:0},diagnostics:{pass:13,fail:0}},
 additionalFixtureControl:{suite:'Foundation',pass:22,fail:0,caseBodiesChanged:0,assertionsChanged:0,assessorStub:false,gateStub:false},
 legacyPrecheckConflicts,singleIntentConflicts,readinessConflicts:parsedReadiness.results.filter(x=>x.status==='FAIL'),diagnosticConflicts:diagnostics.results.filter(x=>x.status==='FAIL'),
 unexpectedFailureCount:0,historicalF:{passBeforeStop:22,fail:1,notRun:1,assertionUnchanged:true},livePosts:0,databaseAccess:'NONE',
 warning:'Do not report 181/181 on actual production policy or unchanged downstream controls. Separate single-intent fixture verifies adapter behavior; original FAILs remain FAIL.'};
write('compatibility-review.json',review);
const before=load('integrity-before.json',__dirname).hashes,after=load(final?'integrity-after-final.json':'integrity-after.json',__dirname).hashes;
const files=['backend/src/agent/toolProvenance.ts','backend/src/tests/agentExecutionCorrection.test.ts'];
const empty=path.join(reviewDir,'empty-for-diff.txt');fs.writeFileSync(empty,'',{flag:'wx'});let diff='';
for(const file of files){const previous=before[file]?path.join(__dirname,path.basename(file)+'.before'):empty;
 const result=spawnSync('git',['diff','--no-index','--no-ext-diff','--',previous,path.join(root,file)],{encoding:'utf8'});assert.ok([0,1].includes(result.status));diff+='\n'+result.stdout;}
fs.writeFileSync(path.join(reviewDir,'source-diff.patch'),diff,{flag:'wx'});
const protectedFiles=['backend/src/agent/currentCompleteness.ts','backend/src/agent/missingSlotRecovery.ts','backend/src/services/agentService.ts','backend/src/agent/tools.ts',
 'backend/src/agent/decisionSchema.ts','backend/src/agent/decisionValidation.ts','backend/src/agent/liveProvider.ts','backend/src/agent/ollamaReadiness.ts','backend/src/agent/provider.ts',
 'backend/src/agent/limits.ts','backend/src/agent/privacy.ts','backend/src/agent/conversation.ts','backend/src/tests/agentServerCompleteness.test.ts'];
for(const file of protectedFiles)assert.equal(before[file],after[file],file);
write('source-hashes.json',{changed:files.map(file=>({file,before:before[file]||null,after:after[file]})),protected:protectedFiles.map(file=>({file,sha256:after[file],unchanged:true})),
 benchmark:Object.entries(before).filter(([,hash])=>['0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e','f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706'].includes(hash)).map(([file,hash])=>({file,sha256:hash,unchanged:hash===after[file]})),
 historicalChanges:Object.keys(before).filter(file=>file.startsWith('docs/evidence/')&&before[file]!==after[file]),diffSha256:sha(diff)});
console.log(JSON.stringify({status:review.status,newCorrection:42,serverCompleteness:52,actual:review.actualPolicy,downstream:review.downstreamOriginal,
 fixtureControl:review.additionalFixtureControl,unexpected:0,hashes:files.map(file=>({file,before:before[file]||null,after:after[file]})),
 baseline:load(final?'integrity-after-final.json':'integrity-after.json',__dirname).baselineFiles,historicalEvidence:load(final?'integrity-after-final.json':'integrity-after.json',__dirname).historicalEvidenceFiles}));
