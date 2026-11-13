'use strict';
const assert=require('node:assert/strict');
const errorRecord=error=>({name:error?.name||'Error',message:String(error?.message??error),stack:typeof error?.stack==='string'?error.stack:null});
function createFence({emit=()=>{},nativeCap=4,inferenceCap=3}={}){
  assert.equal(nativeCap,4,'NATIVE_CAP_POLICY');assert.equal(inferenceCap,3,'INFERENCE_CAP_POLICY');
  const state={stopped:false,closed:false,current:null,firstFailure:null,secondaryFailures:[],events:[],agentDispatches:[],nativeDispatches:[],toolDispatches:[],operatorDispatches:[],retry:0};
  const abort=new AbortController();
  let permits=false;
  function event(value){const e={sequence:state.events.length+1,...value};state.events.push(e);emit(e);}
  function fail(error,phase='unexpected'){
    const failure={caseId:state.current,phase,error:errorRecord(error)};
    // Latch before evidence I/O. A disk failure cannot reopen dispatch.
    state.stopped=true;permits=false;abort.abort(error);
    if(!state.firstFailure)state.firstFailure=failure;else if(state.firstFailure.error.message!==failure.error.message||state.firstFailure.phase!==phase)state.secondaryFailures.push(failure);
    try{event({type:'GLOBAL_STOP',...failure});}catch(e){state.secondaryFailures.push({phase:'evidence-write',error:errorRecord(e)});}
    return state.firstFailure;
  }
  function active(){assert.ok(!state.stopped&&!state.closed,'GLOBAL_STOP_DISPATCH_BLOCKED');}
  function start(id){active();assert.equal(state.current,null,'CASE_ALREADY_ACTIVE');state.current=id;permits=false;event({type:'CASE_START',caseId:id});}
  async function guard(phase,work){active();try{assert.equal(await work(),true,'MANDATORY_GUARD_DID_NOT_PASS: '+phase);event({type:'GUARD_PASS',caseId:state.current,phase});return true;}catch(error){fail(error,phase);throw error;}}
  function authorize(){active();permits=true;}
  async function dispatch(kind,work){
    try{
      active();assert.ok(permits&&state.current,'DISPATCH_BEFORE_GUARDS');
      const list=kind==='agent'?state.agentDispatches:kind==='native'?state.nativeDispatches:kind==='tool'?state.toolDispatches:kind==='operator'?state.operatorDispatches:null;
      assert.ok(list,'UNKNOWN_DISPATCH_KIND');assert.ok(!list.includes(state.current),'DUPLICATE_DISPATCH_NO_RETRY');
      if(kind!=='agent'&&kind!=='operator')assert.ok(state.agentDispatches.includes(state.current),'DISPATCH_BEFORE_AGENT');
      if(kind==='native'||kind==='operator'){assert.ok(state.nativeDispatches.length+state.operatorDispatches.length<nativeCap,'NATIVE_POST_CAP');if(kind==='native')assert.ok(list.length<inferenceCap,'INFERENCE_POST_CAP');else assert.ok(list.length<1,'OPERATOR_POST_CAP');}
      list.push(state.current);event({type:'DISPATCH_INTENT',caseId:state.current,kind});
      return await work();
    }catch(error){fail(error,'dispatch:'+kind);throw error;}
  }
  function complete(){active();event({type:'CASE_PASS',caseId:state.current});state.current=null;permits=false;}
  function close(){state.closed=true;permits=false;abort.abort();}
  return{state,signal:abort.signal,start,guard,authorize,dispatch,complete,fail,close};
}
module.exports={createFence,errorRecord};
