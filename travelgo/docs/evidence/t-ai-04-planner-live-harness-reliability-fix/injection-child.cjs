// Independent driver: scenario inputs and expected observations are not generated
// by the orchestrator under test. Every dispatch below is a counter, never HTTP.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {runPlannerHarnessProcess}=require('./run-live.corrected.cjs');
const old=path.resolve(__dirname,'../t-ai-04-planner-real-tool-live-e2e-resume-run2');
const read=f=>JSON.parse(fs.readFileSync(path.join(old,f)));
const scenario=process.argv[2],output=process.argv[3];
const oracle=read('direct-oracles.json').oracles['P-COMPLETE'].result;
const saved=read('case-L01.json');
const cases=['L01','L02','L03','L04'].map(id=>({id,oracle:structuredClone(oracle)}));
if(scenario==='missingOracle')delete cases[0].oracle;
const observed={agent:[],native:[],tool:[],cleanup:0,precondition:0,dispose:0,lateExecutions:0,blockedLate:[],aborted:false};
let capturedContext;
function inject(name,item){if(item.id==='L01'&&scenario===name)throw Error('INJECTED_'+name+'_L01');return true;}
const ports={
  guards:{
    manifest:async item=>{const lock=read('manifest-lock.json');let hash=require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(old,'manifest.json'))).digest('hex');if(scenario==='manifest'&&item.id==='L01')hash='WRONG_HASH';assert.equal(hash,lock.sha256,'INJECTED_manifest_L01');return true;},
    request:async item=>inject('request',item),session:async item=>inject('session',item),authOwnership:async item=>inject('auth',item),toolSafety:async item=>inject('toolSafety',item),nativeCap:async item=>inject('nativeCap',item),quotaTtl:async item=>inject('quotaTtl',item),dbIsolation:async item=>inject('dbIsolation',item),runtimeSecurity:async item=>inject('runtimeSecurity',item),
  },
  execute:async(item,ctx)=>{
    capturedContext=ctx;
    return ctx.agent(async()=>{
      observed.agent.push(item.id);
      return ctx.native(async()=>{
        observed.native.push(item.id);
        if(scenario==='providerTimeout'&&item.id==='L01')await new Promise((_,reject)=>setTimeout(()=>reject(Object.assign(Error('INJECTED_providerTimeout_L01'),{name:'TimeoutError'})),5));
        if(scenario==='unexpected'&&item.id==='L01')throw Error('INJECTED_unexpected_L01');
        if(scenario==='swallowed'&&item.id==='L01'){ctx.fail(Error('INJECTED_swallowed_L01'),'runtimeSecurity');}
        if(scenario==='duplicate'&&item.id==='L01')await ctx.native(async()=>{observed.lateExecutions++;});
        return ctx.tool(async()=>{
          observed.tool.push(item.id);
          const result=structuredClone(saved.api.body.data.result),raw=structuredClone(saved.expected.raw);
          if(['fidelity','cleanupPrecondition','doubleFailure','evidenceFailure'].includes(scenario)&&item.id==='L01')result.cost.estimated++;
          if(scenario==='rawExpected'&&item.id==='L01')raw.arguments.totalBudget++;
          return{result,raw,httpStatus:scenario==='response'&&item.id==='L01'?500:200,revision:scenario==='sessionRevision'&&item.id==='L01'?99:2,allowed:!(scenario==='toolExecution'&&item.id==='L01'),mutations:scenario==='dbMutation'&&item.id==='L01'?1:0};
        });
      });
    });
  },
  checks:{
    response:async(_item,o)=>{assert.equal(o.httpStatus,200,'INJECTED_response_L01');return true;},
    rawExpected:async(_item,o)=>{assert.deepEqual(o.raw,saved.expected.raw,'INJECTED_rawExpected_L01');return true;},
    sessionRevision:async(_item,o)=>{assert.equal(o.revision,2,'INJECTED_sessionRevision_L01');return true;},
    toolExecution:async(_item,o)=>{assert.equal(o.allowed,true,'INJECTED_toolExecution_L01');return true;},
    dbMutation:async(_item,o)=>{assert.equal(o.mutations,0,'INJECTED_dbMutation_L01');return true;},
    runtimeSecurity:async item=>inject('postRuntime',item),
  },
  assertUi:async item=>inject('ui',item),
  cleanupPrecondition:async ctx=>{observed.precondition++;observed.aborted=ctx.signal.aborted;if(scenario==='cleanupPrecondition')throw Error('INJECTED_cleanupPrecondition');return true;},
  cleanup:async()=>{observed.cleanup++;if(scenario==='doubleFailure')throw Error('INJECTED_cleanupSecondary');return true;},
  dispose:async()=>{observed.dispose++;},
};
(async()=>{
  const result=await runPlannerHarnessProcess({cases,ports,emit:event=>{
    if(scenario==='evidenceFailure'&&event.type==='GLOBAL_STOP')throw Error('INJECTED_EVIDENCE_WRITE_FAILURE');
    if(scenario==='caseStartEvidenceFailure'&&event.type==='CASE_START')throw Error('INJECTED_CASE_START_WRITE_FAILURE');
    if(scenario==='guardEvidenceFailure'&&event.type==='GUARD_PASS')throw Error('INJECTED_GUARD_WRITE_FAILURE');
  }});
  // Simulate stale asynchronous callbacks after finally. Work functions must not run.
  if(capturedContext)for(const kind of ['agent','native','tool'])try{await capturedContext[kind](async()=>{observed.lateExecutions++;});}catch(error){observed.blockedLate.push({kind,message:error.message});}
  fs.writeFileSync(output,JSON.stringify({scenario,result,observed,tier:'INDEPENDENT_OFFLINE_PROCESS',realHttp:0,realNative:0,realDb:0},null,2)+'\n',{flag:'wx'});
})().catch(error=>{console.error(error.stack);process.exitCode=2;});
