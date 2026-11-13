// Independent expectations: no imports of the cleanup implementation under test.
const c=require('./common.cjs'),{spawnSync}=require('node:child_process');
const run=process.argv[2]||'01';c.assert.match(run,/^\d\d$/);const dir='lifecycle-'+run;c.fs.mkdirSync(c.path.join(c.evidence,dir));
const specs=[
 ['beforeStage','NOT_APPLICABLE',0,0,false],['afterStageNoFixture','NOT_APPLICABLE',0,0,true],
 ['validCommitted','PASS',1,0,true],['committedBeforeStage','PASS',1,0,false],
 ['missingOwnership','BLOCKED',0,2,true],['missingLedger','BLOCKED',0,2,true],['rowHashMismatch','BLOCKED',0,2,true],['wrongIds','BLOCKED',0,2,true],['wrongSlug','BLOCKED',0,2,true],
 ['foreignReference','BLOCKED',0,2,true],['tripJsonReference','BLOCKED',0,2,true],['unknownIncomingFk','BLOCKED',0,2,true],['invalidIsolation','BLOCKED',0,2,true],['missingIsolationEvidence','BLOCKED',0,2,true],
 ['cleanupCallbackError','FAIL',1,2,true],['disposeError','PASS',1,0,true],['secondaryCleanupAndDispose','FAIL',1,2,true],
 ['cleanupSkipped','FAIL',0,2,true],['pretendRestoredWithoutDelete','FAIL',1,2,true],['missingCleanupResult','FAIL',1,2,true],
 ['ambiguousCommit','BLOCKED',0,2,true],['ledgerWithoutCommit','BLOCKED',0,0,true],['preconditionBypass','BLOCKED',0,2,true],['fakeNotApplicable','BLOCKED',0,2,true],
 ['foreignDuringRecheck','FAIL',0,2,true],['rowChangedDuringRecheck','FAIL',0,2,true],['repeatCleanupAction','FAIL',1,0,true],
 ['dispatchDuringCleanup','FAIL',0,2,true],['dispatchDuringDispose','PASS',1,0,true],['missingAdapter','PASS',1,0,true],
 ['successCommitted','PASS',1,0,true],['cleanupOnlyError','FAIL',1,2,true],['disposeOnlyError','PASS',1,0,true]
];
const results=[];
for(const[scenario,action,actionCount,residual,staged]of specs){try{
 const child=spawnSync(process.execPath,[c.path.join(c.evidence,'lifecycle-child.cjs'),scenario,dir],{encoding:'utf8',timeout:20000});c.fs.writeFileSync(c.path.join(c.evidence,dir,scenario+'.log'),(child.stdout||'')+(child.stderr||''),{flag:'wx'});
 const j=c.json(c.prefix+dir+'/'+scenario+'.json'),r=j.result,o=j.observed,success=scenario==='successCommitted',lateOnly=['cleanupOnlyError','disposeOnlyError'].includes(scenario);
 c.assert.equal(child.status,success?0:1,'PROCESS_EXIT');c.assert.equal(r.globalStop,!success);c.assert.equal(r.cleanup.invoked,true);c.assert.equal(r.cleanup.action,action);c.assert.equal(o.cleanupActionCount,actionCount);c.assert.equal(o.createdOrResidualRows,residual);c.assert.equal(o.runtimeStaged,staged);c.assert.equal(o.disposeCount,1);c.assert.equal(o.unsafeActionCalls,0);c.assert.equal(j.dispatch.late,0);c.assert.equal(o.rejectedLate,4);c.assert.equal(r.retry,0);
 for(const[kind,list]of Object.entries(j.dispatch)){if(Array.isArray(list)){c.assert.equal(new Set(list).size,list.length,'NO_RETRY');c.assert.deepEqual(list,r.dispatches[kind]);}}
 c.assert.equal(r.cleanup.dispose,['disposeError','disposeOnlyError','secondaryCleanupAndDispose','dispatchDuringDispose'].includes(scenario)?'FAIL':'PASS');
 if(success||lateOnly){c.assert.ok(r.cases.every(x=>x.status==='PASS'));c.assert.deepEqual(j.dispatch.agent,['R01','R02','R03']);if(lateOnly)c.assert.equal(r.firstFailure.phase,scenario==='cleanupOnlyError'?'cleanup':'dispose');}
 else{
  c.assert.equal(r.cases[0].status,'FAIL');c.assert.deepEqual(r.cases.slice(1),[{id:'R02',status:'NOT RUN'},{id:'R03',status:'NOT RUN'}]);for(const kind of ['agent','native','tool','operator'])c.assert.ok(j.dispatch[kind].every(id=>id==='R01'));
  const first=scenario==='missingAdapter'?null:['beforeStage','committedBeforeStage'].includes(scenario)?'PRIMARY_MANIFEST_FAILURE':scenario==='afterStageNoFixture'?'PRIMARY_AFTER_STAGE_FAILURE':'PRIMARY_OFFLINE_UI_FAILURE';if(first)c.assert.equal(r.firstFailure.error.message,first);c.assert.deepEqual(r.cases[0].failure,r.firstFailure);
 }
 if(noResource(scenario)){c.assert.equal(o.ledgerPresent,false);c.assert.equal(o.preconditionReads,1);c.assert.equal(r.cleanup.precondition,'NOT_APPLICABLE');c.assert.deepEqual(j.beforeLateProbe.secondaryFailures,[]);c.assert.equal(r.secondaryFailures.length,4);c.assert.ok(r.secondaryFailures.every(x=>x.phase.startsWith('dispatch:')&&x.error.message==='GLOBAL_STOP_DISPATCH_BLOCKED'));}
 else if(!['preconditionBypass','fakeNotApplicable'].includes(scenario))c.assert.ok(o.preconditionReads>=1);
 if(['cleanupCallbackError','disposeError','secondaryCleanupAndDispose','cleanupSkipped','pretendRestoredWithoutDelete','missingCleanupResult','foreignDuringRecheck','rowChangedDuringRecheck'].includes(scenario))c.assert.ok(r.secondaryFailures.length>0,'SECONDARY_ERROR_RETAINED');
 results.push({scenario,status:'PASS',processExit:child.status,cleanup:action,cleanupActionCount:actionCount,disposeCount:o.disposeCount,firstFailure:r.firstFailure?.error.message,dispatch:j.dispatch});
 }catch(error){results.push({scenario,status:'FAIL',error:error.stack});}}
function noResource(scenario){return['beforeStage','afterStageNoFixture'].includes(scenario);}
const status=results.every(x=>x.status==='PASS')?'PASS':'FAIL';c.write('lifecycle-acceptance-'+run+'.json',{at:new Date().toISOString(),status,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results,actualPostgres:0,actualOllama:0,actualFixtureWrites:0,independence:'Parent expected action/counters/stage/residual values; separate child processes execute shared lifecycle and real guard binding against synthetic rows.'});console.log(JSON.stringify({status,passed:results.filter(x=>x.status==='PASS').length,failures:results.filter(x=>x.status==='FAIL')}));if(status!=='PASS')process.exitCode=1;
