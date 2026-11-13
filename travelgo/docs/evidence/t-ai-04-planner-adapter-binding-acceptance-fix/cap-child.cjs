const c=require('./common.cjs'),{runPlannerHarnessProcess}=require('./run-live.corrected.cjs'),{bindRealGuards}=require('./real-guards.cjs'),{SyntheticDb}=require('./synthetic-db.cjs'),{createCleanupLifecycle}=require('./cleanup-lifecycle.cjs');
const scenario=process.argv[2],dir=process.argv[3],db=new SyntheticDb({committed:false}),lifecycle=createCleanupLifecycle(db.ports());
const counters={agent:[],native:[],operator:[],quotaChecks:0},operator=id=>({id,channel:'operator'}),infer=id=>({id,channel:'native'}),agent=id=>({id,channel:'agent'});
let current,quota=scenario==='emptyQuota'?0:scenario==='quotaAfterOperator'?1:20;
const plans={
 combinedSuccess:[operator('OP'),infer('R01'),infer('R02'),infer('R03')],
 operatorAfterThree:[infer('R01'),infer('R02'),infer('R03'),operator('OP')],
 fourthAfterOperator:[operator('OP'),infer('R01'),infer('R02'),infer('R03'),infer('R04'),infer('LATER')],
 fourthWithoutOperator:[infer('R01'),infer('R02'),infer('R03'),infer('R04'),infer('LATER')],
 secondOperator:[operator('OP1'),operator('OP2'),infer('LATER')],
 agentQuotaIndependent:[...Array.from({length:7},(_,i)=>agent('A'+i))],
 emptyQuota:[infer('R01'),infer('LATER')],
 quotaAfterOperator:[operator('OP'),infer('R01'),agent('END'),infer('LATER')],
 duplicateNative:[infer('R01'),infer('LATER')],duplicateAgent:[agent('A1'),agent('LATER')]
};
const sensors={context(){},stage(id){current=plans[scenario].find(x=>x.id===id);},verify(){c.assert.ok(plans[scenario]);},assertTemplate(){c.assert.ok(current);},assertSession(){c.assert.ok(current.id);},assertOwnership(){c.assert.equal(db.committed,false);},assertToolBoundary(){c.assert.equal(db.rows.length,0);},assertCap(){c.assert.ok(counters.native.length+counters.operator.length<=4);},assertQuotaTtl(){counters.quotaChecks++;if(current.channel!=='operator')c.assert.ok(quota>0,'AGENT_QUOTA_EMPTY');},async assertFixtures(){c.assert.equal(db.rows.length,0);},async assertRuntime(){c.assert.ok(current);},assertResponse(){c.assert.ok(current);},assertRaw(){c.assert.ok(counters.native.length<=3);},assertHistory(){c.assert.ok(quota>=0);},assertExecuted(){c.assert.equal(db.rows.length,0);}};
const ports={...bindRealGuards(sensors),async execute(item,ctx){if(item.channel==='operator')return ctx.operator(async()=>{counters.operator.push(item.id);return{};});return ctx.agent(async()=>{quota--;counters.agent.push(item.id);if(scenario==='duplicateAgent')await ctx.agent(async()=>{counters.agent.push('FORBIDDEN_RETRY');return{};});if(item.channel==='agent')return{};const value=await ctx.native(async()=>{counters.native.push(item.id);return{};});if(scenario==='duplicateNative')await ctx.native(async()=>{counters.native.push('FORBIDDEN_RETRY');return{};});return value;});},async assertUi(){c.assert.ok(current);return true;},cleanupPrecondition:()=>lifecycle.assess(),cleanup:()=>lifecycle.perform(),dispose:()=>db.dispose()};
(async()=>{const result=await runPlannerHarnessProcess({cases:plans[scenario],ports});c.write(dir+'/'+scenario+'.json',{scenario,tier:'INDEPENDENT_CAP_COUNTERS_ONLY',result,counters,quotaRemaining:quota,disposeCount:db.disposeCalls,cleanupActionCount:db.cleanupCalls,actualNetwork:0,actualDb:0,actualNative:0});})().catch(error=>{console.error(error.stack);process.exitCode=2;});
