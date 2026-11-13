const c = require('./common.cjs');
const {fs,path,assert,sha,write,json,prefix,root,evidence} = c;
const previous = 'docs/evidence/t-ai-04-g2-e2e-harness-fix-resume/';
const currentExecution = json(prefix+'final-verified/execution.json').execution;
const oldExecution = json(previous+'final-verified/execution.json').execution;
const comparisons=[];
for(const name of fs.readdirSync(path.join(evidence,'final-verified')).filter(x=>/^(actual-policy|downstream-control)-agent.*\.json$/.test(x))){
  const current=json(prefix+'final-verified/'+name),old=json(previous+'final-verified/'+name);
  const extract=x=>x.results.map(y=>({name:y.name,status:y.status}));
  assert.deepEqual(extract(current),extract(old),name);
  comparisons.push({file:name,cases:current.results.length,passed:current.passed,failed:current.failed,everyNameAndStatusMatchesBaseline:true});
}
for(const name of ['readiness-33','actual-policy-diagnostics','downstream-control-diagnostics','historical-F-unchanged']){
  const current=currentExecution.find(x=>x.name===name),old=oldExecution.find(x=>x.name===name);
  assert.ok(current&&old,name);
  for(const key of ['exitCode','passed','failed'])assert.equal(current[key],old[key],name+':'+key);
}
const additional=json(prefix+'additional-offline-results.json');
assert.ok(additional.results.every(x=>x.status==='PASS'&&x.failed===0));
const frontend=json(prefix+'frontend-unit-final.json');
assert.deepEqual(frontend.results.map(x=>[x.passed,x.failed]),[[10,0],[39,0]]);
const browser=json(prefix+'browser-01/results.json');
assert.equal(browser.stats.expected,74);assert.equal(browser.stats.unexpected,0);assert.equal(browser.stats.skipped,0);assert.equal(browser.stats.flaky,0);
const guards=fs.readdirSync(path.join(evidence,'regression-audit')).filter(x=>x.endsWith('.json')).map(x=>json(prefix+'regression-audit/'+x));
assert.ok(guards.length>0);
for(const guard of guards){assert.equal(guard.postgresConnectAttempts,0);assert.equal(guard.forbiddenNetworkAttempts,0);}
write('offline-boundary-audit.json',{at:new Date().toISOString(),status:'PASS',processAuditFiles:guards.length,postgresConnectAttempts:0,forbiddenNetworkAttempts:0,nativeInference:0,scope:'Instrumented Node process boundaries; mocked browser dead API proxy; not OS-wide capture'});
const runnerNames=['run-regression.cjs','run-additional-offline.cjs','run-frontend.cjs','run-browser.cjs','run-build.cjs','run-foundation-compat.cjs'];
const runners=runnerNames.map(file=>{const current=sha(c.read(prefix+file)),old=sha(c.read(previous+file));assert.equal(current,old,file);return{file,sha256:current,unchangedFromSearchResume:true};});
write('regression-summary.json',{at:new Date().toISOString(),status:'PASS_NO_NEW_REGRESSION_BASELINE_FAILURES_RETAINED',frontend:{passed:49,failed:0},mockedBrowser:{passed:74,failed:0,skipped:0,flaky:0},additional:additional.results,backendCorrection:{passed:42,failed:0},backendCompleteness:{passed:52,failed:0},originalLegacy181:{passed:145,failed:36,backendCases:171,frontendCases:10},isolatedDownstreamControls181:{passed:176,failed:5,productionPolicyPass:false},readiness:{actual:{passed:32,failed:1},control:{passed:33,failed:0}},diagnostics:{actual:{passed:8,failed:5},control:{passed:13,failed:0}},builds:{backend:currentExecution.find(x=>x.name==='backend-build').exitCode===0?'PASS':'FAIL',frontend:json(prefix+'frontend-build-final.json').status},caseComparisons:comparisons,runners,assertionsChanged:0,nativeInference:0,database:false});
const lock=json(prefix+'manifest-lock.json'),manifest=json(prefix+'manifest.json');
assert.equal(sha(c.read(prefix+'manifest.json')),lock.sha256);
assert.equal(sha(c.read(prefix+'run-live.cjs')),lock.harnessSha256);
assert.equal(sha(c.read(prefix+'binding.cjs')),lock.bindingSha256);
assert.equal(sha(c.read(prefix+'direct-oracles.json')),manifest.directOraclesSha256);
assert.equal(sha(c.read(prefix+'fixture-committed-ledger.json')),manifest.fixtureLedgerSha256);
const historical=c.integrity(),after=c.snapshot(),before=json(prefix+'integrity-before.json').hashes;
assert.deepEqual(after,before);
write('integrity-after.json',{at:new Date().toISOString(),status:'PASS',protectedFiles:Object.keys(after).length,changed:[],sourceProductionChanges:0,benchmarkChanges:0,historical,manifestAndHarnessUnchanged:true,hashes:after});
console.log(JSON.stringify({status:'PASS',caseFilesCompared:comparisons.length,processAudits:guards.length,protectedFiles:Object.keys(after).length,historical}));
