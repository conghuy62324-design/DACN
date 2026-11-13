const c=require('./common.cjs'),crypto=require('node:crypto');
const {SyntheticDb}=require('./synthetic-db.cjs'),{createCleanupLifecycle}=require('./cleanup-lifecycle.cjs'),{bindRealGuards,assertBindings}=require('./real-guards.cjs'),{runPlannerHarnessProcess}=require('./run-live.corrected.cjs');
const scenario=process.argv[2],dir=process.argv[3];
const noFixture=['beforeStage','afterStageNoFixture'].includes(scenario),db=new SyntheticDb({committed:!noFixture});
const oracle=c.json('docs/evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/case-L01.json').api.body.data.result;
const dispatch={agent:[],native:[],tool:[],operator:[],late:0},io=db.ports();
function tamperRow(){db.rows[0].row.name+=' CHANGED';db.rows[0].full_row_json=JSON.stringify(db.rows[0].row);db.rows[0].sha256=crypto.createHash('sha256').update(db.rows[0].full_row_json).digest('hex');db.rows[0].row_md5=crypto.createHash('md5').update(db.rows[0].full_row_json).digest('hex');}
if(scenario==='missingOwnership')db.owned=false;
if(scenario==='missingLedger')db.ledger=null;
if(scenario==='rowHashMismatch')tamperRow();
if(scenario==='wrongIds')db.rows[0].row.id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
if(scenario==='wrongSlug')db.rows[0].row.slug='foreign-slug';
if(scenario==='foreignReference')db.refs.foreign[0].count=1;
if(scenario==='tripJsonReference')db.refs.tripJson=1;
if(scenario==='unknownIncomingFk')db.refs.foreign.push({table:'unknown_fk',count:0});
if(scenario==='invalidIsolation')db.isolation.isolation='NOT_ENFORCED';
if(scenario==='missingIsolationEvidence')db.isolation={};
if(['cleanupCallbackError','cleanupOnlyError','secondaryCleanupAndDispose'].includes(scenario))db.failCleanup=true;
if(['disposeError','disposeOnlyError','secondaryCleanupAndDispose'].includes(scenario))db.failDispose=true;
if(scenario==='pretendRestoredWithoutDelete')db.noDelete=true;
if(scenario==='missingCleanupResult')db.skipResult=true;
if(scenario==='ambiguousCommit')db.ambiguous=true;
if(scenario==='ledgerWithoutCommit'){db.committed=false;db.rows=[];}
const lifecycle=createCleanupLifecycle(io);
const calls=[];let currentCtx;
const sensors={context(ctx){currentCtx=ctx;},verify(){calls.push('manifest');if(['beforeStage','committedBeforeStage'].includes(scenario))throw Error('PRIMARY_MANIFEST_FAILURE');},stage(){db.active=true;calls.push('stage');},assertTemplate(){calls.push('request');},assertSession(){calls.push('session');if(scenario==='afterStageNoFixture')throw Error('PRIMARY_AFTER_STAGE_FAILURE');},assertOwnership(){calls.push('owner');},assertToolBoundary(){calls.push('tool');},assertCap(){calls.push('cap');},assertQuotaTtl(){calls.push('quota');},async assertFixtures(){calls.push('db');},async assertRuntime(){calls.push('runtime');},assertResponse(){calls.push('response');},assertRaw(){calls.push('raw');},assertHistory(){calls.push('history');},assertExecuted(){calls.push('executed');}};
const noPrimary=['successCommitted','cleanupOnlyError','disposeOnlyError'].includes(scenario);
const ports={...bindRealGuards(sensors),
 async execute(item,ctx){return ctx.agent(async()=>{dispatch.agent.push(item.id);return ctx.native(async()=>{dispatch.native.push(item.id);return ctx.tool(async()=>{dispatch.tool.push(item.id);return{result:structuredClone(oracle)};});});});},
 async assertUi(){if(!noPrimary)throw Error('PRIMARY_OFFLINE_UI_FAILURE');c.assert.ok(calls.includes('response'));return true;},
 async cleanupPrecondition(){
  if(scenario==='preconditionBypass')return true;
  if(scenario==='fakeNotApplicable')return{status:'NOT_APPLICABLE'};
  const decision=await lifecycle.assess();
  if(scenario==='foreignDuringRecheck')db.refs.foreign[0].count=1;
  if(scenario==='rowChangedDuringRecheck')tamperRow();
  return decision;
 },
 async cleanup(ctx){if(scenario==='cleanupSkipped')return undefined;if(scenario==='dispatchDuringCleanup')return ctx.native(async()=>{dispatch.late++;return true;});const result=await lifecycle.perform();if(scenario==='repeatCleanupAction')await lifecycle.perform();return result;},
 async dispose(ctx){await db.dispose();if(scenario==='dispatchDuringDispose')await ctx.agent(async()=>{dispatch.late++;});}
};
assertBindings(ports);if(scenario==='missingAdapter')delete ports.guards.authOwnership;
(async()=>{
 const result=await runPlannerHarnessProcess({cases:['R01','R02','R03'].map(id=>({id,oracle})),ports});
 const beforeLateProbe={secondaryFailures:structuredClone(result.secondaryFailures)};
 let rejectedLate=0;for(const kind of ['agent','native','tool','operator'])try{await currentCtx[kind](async()=>{dispatch.late++;});}catch{rejectedLate++;}
 c.write(dir+'/'+scenario+'.json',{scenario,tier:'INDEPENDENT_SYNTHETIC_LIFECYCLE_PROCESS',result,beforeLateProbe,dispatch,observed:{runtimeStaged:db.active,committed:db.committed,ledgerPresent:!!db.ledger,createdOrResidualRows:db.rows.length,preconditionReads:db.preconditionReads,cleanupActionCount:db.cleanupCalls,disposeCount:db.disposeCalls,unsafeActionCalls:db.unsafeActionCalls,rejectedLate},actualPostgres:0,actualOllama:0,actualFixtureWrites:0});
})().catch(error=>{console.error(error.stack);process.exitCode=2;});
