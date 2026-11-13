'use strict';
// Corrected harness orchestration. Import-only; no auto-run, sockets, provider or DB.
// This task supplies MOCK_ONLY ports. A future LIVE task must supply separately
// reviewed adapters and a fresh bound manifest/approval; run2 cannot authorize it.
const assert=require('node:assert/strict');
const {createFence,errorRecord}=require('./fail-fast.cjs');
const {assertPublicFidelity}=require('./public-json.cjs');
const {readUiStrings}=require('./browser-checks.cjs');
const {validateCleanupDecision}=require('./cleanup-lifecycle.cjs');
const PRE=Object.freeze(['manifest','request','session','authOwnership','toolSafety','nativeCap','quotaTtl','dbIsolation','runtimeSecurity']);
const POST=Object.freeze(['response','rawExpected','sessionRevision','toolExecution','dbMutation','runtimeSecurity']);
async function runPlannerHarness({cases,ports,emit=()=>{}}){
  const fence=createFence({emit});
  const rows=cases.map(item=>({id:item.id,status:'NOT RUN'}));
  let currentRow,cleanup={invoked:false,precondition:'NOT RUN',action:'NOT RUN',dispose:'NOT RUN'};
  const ctx=Object.freeze({signal:fence.signal,agent:work=>fence.dispatch('agent',work),native:work=>fence.dispatch('native',work),tool:work=>fence.dispatch('tool',work),operator:work=>fence.dispatch('operator',work),fail:(error,phase)=>fence.fail(error,phase)});
  try{
    assert.ok(cases.length&&new Set(cases.map(x=>x.id)).size===cases.length,'UNIQUE_CASES_REQUIRED');
    for(const item of cases){
      currentRow=rows.find(x=>x.id===item.id);currentRow.status='RUNNING';fence.start(item.id);
      await fence.guard('unicode',async()=>{readUiStrings();return true;});
      for(const phase of PRE)await fence.guard(phase,()=>ports.guards[phase](item,ctx));
      fence.authorize();
      const observed=await ports.execute(item,ctx);
      for(const phase of POST)await fence.guard(phase,()=>ports.checks[phase](item,observed,ctx));
      await fence.guard('fidelity',async()=>{
        if(observed.result!==undefined||item.oracle!==undefined){assert.ok(item.oracle,'INDEPENDENT_ORACLE_REQUIRED');assertPublicFidelity(observed.result,item.oracle);}
        return true;
      });
      await fence.guard('ui',()=>ports.assertUi(item,observed,ctx));
      fence.complete();currentRow.status='PASS';currentRow=null;
    }
  }catch(error){
    if(!fence.state.stopped)fence.fail(error,'unexpected');
    if(currentRow){currentRow.status='FAIL';currentRow.failure=fence.state.firstFailure;}
  }finally{
    // Even successful teardown closes every Agent/native/tool channel first.
    fence.close();cleanup.invoked=true;
    try{
      const decision=await ports.cleanupPrecondition(ctx);
      if(validateCleanupDecision(decision)==='NOT_APPLICABLE'){
        cleanup.precondition='NOT_APPLICABLE';cleanup.action='NOT_APPLICABLE';cleanup.reason=decision.reason;
      }else{
        cleanup.precondition='PASS';
        assert.equal(await ports.cleanup(ctx),true,'CLEANUP_ACTION_FAILED');cleanup.action='PASS';
      }
    }catch(error){cleanup.precondition=cleanup.precondition==='PASS'?'PASS':'FAIL';cleanup.action=cleanup.precondition==='FAIL'?'BLOCKED':'FAIL';cleanup.failure=errorRecord(error);fence.fail(error,'cleanup');}
    finally{try{await ports.dispose(ctx);cleanup.dispose='PASS';}catch(error){cleanup.dispose='FAIL';cleanup.disposeFailure=errorRecord(error);fence.fail(error,'dispose');}}
  }
  return{tier:'TARGETED_REAL_ADAPTERS',status:fence.state.stopped?'FAIL':'PASS',exitCode:fence.state.stopped?1:0,globalStop:fence.state.stopped,firstFailure:fence.state.firstFailure,secondaryFailures:fence.state.secondaryFailures,cases:rows,cleanup,events:fence.state.events,dispatches:{agent:fence.state.agentDispatches,native:fence.state.nativeDispatches,tool:fence.state.toolDispatches,operator:fence.state.operatorDispatches},retry:fence.state.retry};
}
// Process entry contract: a caller cannot accidentally turn a failed run into
// exit 0 by forgetting to propagate result.exitCode. Used by independent children.
async function runPlannerHarnessProcess(options){
  try{const result=await runPlannerHarness(options);if(result.exitCode!==0)process.exitCode=result.exitCode;return result;}
  catch(error){process.exitCode=1;throw error;}
}
module.exports={runPlannerHarness,runPlannerHarnessProcess,PRE,POST};
if(require.main===module){console.error('IMPORT_ONLY_NO_LIVE_ADAPTER_OR_APPROVAL');process.exitCode=2;}
