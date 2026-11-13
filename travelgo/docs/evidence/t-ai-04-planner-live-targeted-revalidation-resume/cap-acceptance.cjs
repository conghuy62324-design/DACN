// Expectations declared independently from the shared cap implementation.
const c=require('./common.cjs'),{spawnSync}=require('node:child_process');
const run=process.argv[2]||'01';c.assert.match(run,/^\d\d$/);const dir='caps-'+run;c.fs.mkdirSync(c.path.join(c.evidence,dir));
const specs=[
 ['combinedSuccess',0,3,1,3,null],['operatorAfterThree',0,3,1,3,null],
 ['fourthAfterOperator',1,3,1,4,'NATIVE_POST_CAP'],['fourthWithoutOperator',1,3,0,4,'INFERENCE_POST_CAP'],
 ['secondOperator',1,0,1,0,'OPERATOR_POST_CAP'],['agentQuotaIndependent',0,0,0,7,null],
 ['emptyQuota',1,0,0,0,'AGENT_QUOTA_EMPTY'],['quotaAfterOperator',1,1,1,1,'AGENT_QUOTA_EMPTY'],
 ['duplicateNative',1,1,0,1,'DUPLICATE_DISPATCH_NO_RETRY'],['duplicateAgent',1,0,0,1,'DUPLICATE_DISPATCH_NO_RETRY']
];const results=[];
for(const[scenario,exit,native,operator,agent,error]of specs)try{
 const child=spawnSync(process.execPath,[c.path.join(c.evidence,'cap-child.cjs'),scenario,dir],{encoding:'utf8',timeout:20000});c.fs.writeFileSync(c.path.join(c.evidence,dir,scenario+'.log'),(child.stdout||'')+(child.stderr||''),{flag:'wx'});const j=c.json(c.prefix+dir+'/'+scenario+'.json'),r=j.result;
 c.assert.equal(child.status,exit);c.assert.equal(r.globalStop,exit===1);c.assert.equal(j.counters.native.length,native);c.assert.equal(j.counters.operator.length,operator);c.assert.equal(j.counters.agent.length,agent);c.assert.ok(native+operator<=4);c.assert.ok(native<=3);c.assert.ok(operator<=1);c.assert.equal(r.retry,0);c.assert.equal(j.disposeCount,1);c.assert.equal(j.cleanupActionCount,0);c.assert.equal(r.cleanup.action,'NOT_APPLICABLE');
 for(const kind of ['agent','native','operator']){c.assert.deepEqual(j.counters[kind],r.dispatches[kind]);c.assert.equal(new Set(j.counters[kind]).size,j.counters[kind].length);}
 if(error){c.assert.ok(r.firstFailure.error.message.includes(error));const failed=r.cases.findIndex(x=>x.status==='FAIL');c.assert.ok(failed>=0);c.assert.ok(r.cases.slice(failed+1).every(x=>x.status==='NOT RUN'));const at=r.events.findIndex(x=>x.type==='GLOBAL_STOP');c.assert.ok(!r.events.slice(at+1).some(x=>x.type==='DISPATCH_INTENT'));}
 else c.assert.ok(r.cases.every(x=>x.status==='PASS'));
 results.push({scenario,status:'PASS',exit,native,operator,agent,firstFailure:r.firstFailure?.error.message});
 }catch(error){results.push({scenario,status:'FAIL',error:error.stack});}
const status=results.every(x=>x.status==='PASS')?'PASS':'FAIL';c.write('cap-acceptance-'+run+'.json',{at:new Date().toISOString(),status,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results,actualNativePosts:0,actualDb:0});console.log(JSON.stringify({status,results}));if(status!=='PASS')process.exitCode=1;
