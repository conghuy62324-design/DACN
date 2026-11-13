const c=require('./common.cjs'),{spawnSync}=require('node:child_process');
const {assertPublicFidelity,publicJson}=require('./public-json.cjs');
const ui=require('./browser-checks.cjs');
const run=process.argv[2]||'01';c.assert.match(run,/^\d\d$/);
const results=[],test=(name,work)=>{try{work();results.push({name,status:'PASS'});}catch(error){results.push({name,status:'FAIL',error:error.stack});}};
const original=c.json(c.old+'case-L01.json'),base=original.api.body.data.result,oracle=c.json(c.old+'direct-oracles.json').oracles;
const pairs=[['L01','P-COMPLETE'],['L02','P-BUDGET'],['L03','P-DATE']];
for(const[id,key]of pairs)test('Saved public JSON '+id+' matches independent direct oracle',()=>c.assert.equal(assertPublicFidelity(c.json(c.old+'case-'+id+'.json').api.body.data.result,oracle[key].result),true));
test('HTTP serialization omits optional undefined without changing input',()=>{const v=structuredClone(base);v.itinerary.days[0].activities[2].placeId=undefined;c.assert.equal(assertPublicFidelity(v,oracle['P-COMPLETE'].result),true);c.assert.ok(Object.hasOwn(v.itinerary.days[0].activities[2],'placeId'));});
test('Only two approved volatile values may differ',()=>{const v=structuredClone(base);v.itinerary.id='other-id';v.itinerary.createdAt='2036-01-01T00:00:00.000Z';c.assert.equal(assertPublicFidelity(v,oracle['P-COMPLETE'].result),true);});
const mutations={
  'wrong total':v=>v.cost.estimated++, 'wrong itinerary total':v=>v.itinerary.totalEstimatedCostVND++,
  'wrong day total':v=>v.itinerary.days[0].dayEstimatedCostVND++, 'wrong item cost':v=>v.itinerary.days[0].activities[0].estimatedCostVND++,
  'wrong place ID':v=>v.itinerary.days[0].activities[0].placeId='wrong-id', 'wrong selectedPlaceIds':v=>v.itinerary.selectedPlaceIds.reverse(),
  'wrong date':v=>v.itinerary.startDate='2036-04-21', 'wrong transport':v=>v.itinerary.transportation='motorbike',
  'wrong ETA':v=>v.itinerary.days[0].activities[0].estimatedTransitMinutes++, 'wrong distance':v=>v.itinerary.days[0].activities[0].aerialDistanceToNextKm++,
  'missing required cost':v=>delete v.cost, 'missing required days':v=>delete v.itinerary.days,
  'missing required activity field':v=>delete v.itinerary.days[0].activities[0].category,
  'missing volatile required ID':v=>delete v.itinerary.id, 'extra public field':v=>v.secret='unexpected',
  'extra nested field':v=>v.itinerary.days[0].activities[0].injected=true,
  'wrong source provenance':v=>v.source='RecommendationService','wrong cost source':v=>v.itinerary.days[0].activities[0].costSource='FAKE',
  'wrong warnings':v=>v.warnings.pop(),'null is meaningful':v=>v.itinerary.days[0].activities[2].placeId=null,
  'nonfinite rejected':v=>v.cost.estimated=NaN,
};
for(const[name,mutate]of Object.entries(mutations))test('Reject '+name,()=>{const v=structuredClone(base);mutate(v);c.assert.throws(()=>assertPublicFidelity(v,oracle['P-COMPLETE'].result));});
test('UTF-8 bytes decode strictly and exact independent codepoints',()=>{const b=c.read(c.prefix+'ui-strings.json');const literal=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(b));c.assert.equal(literal.motorbike,'Xe m\u00e1y');c.assert.equal(literal.car,'\u00d4 t\u00f4');c.assert.equal(literal.dong,'\u20ab');c.assert.equal(ui.money(3500000),'3.500.000 \u20ab');c.assert.ok(b.includes(Buffer.from([0xe2,0x82,0xab])));});
for(const[key,bad]of [['motorbike','Xe m?y'],['car','? t?'],['dong','?']])test('Reject corrupted '+key+' before any locator',()=>{const v={...ui.UI,[key]:bad};c.assert.throws(()=>ui.assertUiStrings(v),/UI_LITERAL_CORRUPT_BEFORE_LOCATOR/);});
for(const file of ['public-json.cjs','browser-checks.cjs','fail-fast.cjs','run-live.corrected.cjs'])test('Parse UTF-8 module '+file,()=>{new TextDecoder('utf-8',{fatal:true}).decode(c.read(c.prefix+file));const child=spawnSync(process.execPath,['--check',c.path.join(c.evidence,file)],{encoding:'utf8'});c.assert.equal(child.status,0,child.stderr);});
const scenarios=['success','fidelity','ui','rawExpected','manifest','sessionRevision','toolSafety','providerTimeout','cleanupPrecondition','request','session','auth','nativeCap','quotaTtl','dbIsolation','runtimeSecurity','response','toolExecution','dbMutation','postRuntime','unexpected','swallowed','duplicate','doubleFailure','evidenceFailure','caseStartEvidenceFailure','guardEvidenceFailure','missingOracle'];
const injectionDir='injections-'+run;
const injections=[];c.fs.mkdirSync(c.path.join(c.evidence,injectionDir));
for(const scenario of scenarios)test('Independent process fail-fast: '+scenario,()=>{
  const output=c.path.join(c.evidence,injectionDir,scenario+'.json');
  const child=spawnSync(process.execPath,[c.path.join(c.evidence,'injection-child.cjs'),scenario,output],{encoding:'utf8',timeout:20000});
  c.fs.writeFileSync(c.path.join(c.evidence,injectionDir,scenario+'.log'),(child.stdout||'')+(child.stderr||''),{flag:'wx'});
  c.assert.ok(c.fs.existsSync(output),'child must persist evidence');const actual=JSON.parse(c.fs.readFileSync(output)),r=actual.result,o=actual.observed;
  c.assert.equal(r.cleanup.invoked,true);c.assert.equal(o.dispose,1);c.assert.equal(o.precondition,1);c.assert.equal(r.retry,0);c.assert.equal(o.lateExecutions,0);
  c.assert.deepEqual(o.agent,r.dispatches.agent);c.assert.deepEqual(o.native,r.dispatches.native);c.assert.deepEqual(o.tool,r.dispatches.tool);
  for(const list of [o.agent,o.native,o.tool])c.assert.equal(new Set(list).size,list.length,'No retries');
  if(scenario==='success'){
    c.assert.equal(child.status,0);c.assert.equal(r.status,'PASS');c.assert.equal(r.globalStop,false);c.assert.equal(r.firstFailure,null);
    c.assert.deepEqual(r.cases.map(x=>[x.id,x.status]),['L01','L02','L03','L04'].map(id=>[id,'PASS']));c.assert.deepEqual(o.agent,['L01','L02','L03','L04']);c.assert.equal(o.cleanup,1);
    // Every mandatory phase is independent and must be observed for every case.
    for(const id of ['L01','L02','L03','L04'])c.assert.deepEqual(r.events.filter(x=>x.type==='GUARD_PASS'&&x.caseId===id).map(x=>x.phase),['unicode','manifest','request','session','authOwnership','toolSafety','nativeCap','quotaTtl','dbIsolation','runtimeSecurity','response','rawExpected','sessionRevision','toolExecution','dbMutation','runtimeSecurity','fidelity','ui']);
  }else{
    c.assert.equal(child.status,1);c.assert.equal(r.status,'FAIL');c.assert.equal(r.globalStop,true);c.assert.equal(r.cases[0].status,'FAIL');
    c.assert.deepEqual(r.cases.slice(1),['L02','L03','L04'].map(id=>({id,status:'NOT RUN'})));
    c.assert.equal(r.firstFailure.caseId,'L01');c.assert.ok(r.firstFailure.error.message.length>0);c.assert.equal(r.cases[0].failure.error.message,r.firstFailure.error.message);
    for(const list of [o.agent,o.native,o.tool])c.assert.ok(list.every(id=>id==='L01'),'Later dispatch forbidden');
    if(scenario==='cleanupPrecondition'){c.assert.equal(o.cleanup,0);c.assert.equal(r.cleanup.action,'BLOCKED');c.assert.equal(r.firstFailure.phase,'fidelity');c.assert.ok(r.secondaryFailures.some(x=>x.error.message==='INJECTED_cleanupPrecondition'));}
    else c.assert.equal(o.cleanup,1);
    if(['doubleFailure','evidenceFailure'].includes(scenario)){c.assert.equal(r.firstFailure.phase,'fidelity');c.assert.ok(r.secondaryFailures.length>0);}
    if(o.agent.length)c.assert.equal(o.blockedLate.length,3);
    const stopAt=r.events.findIndex(x=>x.type==='GLOBAL_STOP');c.assert.ok(stopAt>=0||scenario==='evidenceFailure');c.assert.ok(!r.events.slice(stopAt+1).some(x=>x.type==='DISPATCH_INTENT'));
  }
  c.assert.equal(o.aborted,true);injections.push({scenario,status:'PASS',exitCode:child.status,globalStop:r.globalStop,agent:o.agent,native:o.native,cleanup:r.cleanup,firstFailure:r.firstFailure});
});
const status=results.some(x=>x.status==='FAIL')?'FAIL':'PASS';
c.write('independent-acceptance-'+run+'.json',{at:new Date().toISOString(),tier:'INDEPENDENT_OFFLINE_ACCEPTANCE',status,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,results,injections,realHttp:0,realNativePost:0,realDb:0,historicalVerdictsChanged:false});
console.log(JSON.stringify({status,passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,failures:results.filter(x=>x.status==='FAIL')}));
if(status!=='PASS')process.exitCode=1;
