const c=require('./common.cjs');
c.assert.equal(c.json(c.prefix+'phase-a-gate.json').status,'PHASE_A_PASS');c.integrity();
const old=c.json(c.previous+'manifest.json');
const cases=['D01','D02','D-RESET','E01','D-END','E07'].map(id=>structuredClone(old.cases.find(x=>x.id===id)));
cases.push({...structuredClone(old.cases.find(x=>x.id==='D-END')),id:'M-END',viewport:'mobile',path:'/api/agent/verified-history/$mobile.id'});
const plan={...old,at:new Date().toISOString(),task:'T-AI-04-G2-E2E-HARNESS-FIX-AND-RESUME',status:'LOCKED_BEFORE_ANY_NATIVE_POST',approvalSha256:c.sha(c.read(c.prefix+'owner-task.txt')),
 previousRun:{manifest:c.previous+'manifest.json',manifestSha256:c.sha(c.read(c.previous+'manifest.json')),review:c.previous+'results-reviewed.json',reviewSha256:c.sha(c.read(c.previous+'results-reviewed.json')),nativePosts:0,applicationChecksPassed:6},
 budget:{ownerNativeCap:3,operatorCap:1,inferenceOwnerCap:2,allocatedInferenceCap:2,unallocatedInferenceSlots:0,mainQuotaTurns:7,secondaryQuotaTurns:0,conservativeOperatorEntry:1,maxMainRollingEntries:8,concurrency:1,retry:0,hiddenWarmup:0,chainDeadlineMinutes:15},cases,
 setup:'Old process and memory sessions disposed. D01/D02 must create server ID and revision2; reset must create revision3 for unchanged E01 continue. This is necessary deterministic setup, not a retry of prior inference (prior0). No other six historical checks replayed.',
 secondaryScope:'No secondary principal LIVE requests in resume',
 stop:['PHASE_A_FAIL','native cap3 / inference cap2 / load cap1','quota insufficient for remaining chain','manifest/source/body/hash mismatch','DB guard/read-only/fingerprint failure or mutation','auth/consent failure or cross-owner leak','model/digest/context/eviction mismatch','runtime timeout/abort or provider pending','absolute15min TTL insufficient'],
 bindingImplementation:{file:'binding.cjs',sha256:c.sha(c.read(c.prefix+'binding.cjs')),grammar:'Complete lexical $name[.member] tokens; path components URL encoded; unresolved rejected; fresh requestId bound at dispatch only',serverSessionId:'Only production start response accepted'},
 runtime:{applicationTimeoutMs:15000,loadDeadlineMs:60000,format:'json',stream:false,temperature:0,num_ctx:16384,num_predict:2048},
 dataReadinessSha256:null,dataReadinessPolicy:'Fresh exact Catalog/price snapshot must deepEqual unchanged E01/E07 expected before inference; stop drift rather than edit expected'};
for(const id of ['E01','E07']){const x=cases.find(x=>x.id===id),y=old.cases.find(x=>x.id===id);c.assert.deepEqual(x,y);c.fs.copyFileSync(c.path.join(c.root,c.previous+x.nativeBody.file),c.path.join(c.evidence,x.nativeBody.file),c.fs.constants.COPYFILE_EXCL);}
const bytes=JSON.stringify(plan,null,2)+'\n';c.fs.writeFileSync(c.path.join(c.evidence,'manifest.json'),bytes,{flag:'wx'});
c.write('manifest-lock.json',{at:new Date().toISOString(),sha256:c.sha(bytes),previousManifestSha256:plan.previousRun.manifestSha256,harnessSha256:c.sha(c.read(c.prefix+'run-live.cjs')),bindingSha256:plan.bindingImplementation.sha256,sourceCompiledUnchanged:true,exactE01E07Unchanged:true,scoringUnchanged:true,readinessPending:true});
console.log(JSON.stringify({manifestSha256:c.sha(bytes),cases:cases.map(x=>x.id),quota:8,nativeCap:3}));
