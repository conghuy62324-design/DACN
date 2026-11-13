'use strict';
const c=require('./common.cjs'),assert=c.assert,{runScenario}=require('./scenarios.cjs'),{MODES,conflicts}=require('./lock-model.cjs'),{createFence}=require('./fail-fast.cjs');
const name=process.argv[2],input=c.json(c.prefix+'protocol-input.json');
(async()=>{let result;
 if(name==='matrix_64')result={modes:MODES,rows:MODES.map(a=>MODES.map(b=>conflicts(a,b)?'1':'0').join(''))};
 else if(name==='determinism'){const a=runScenario('B_writer_last',input),b=runScenario('B_writer_last',input);result={equal:JSON.stringify(a)===JSON.stringify(b),sha256:c.sha(JSON.stringify(a)),counterexamples:a.proof.counterexamples.length};}
 else if(name==='bounded_enumeration')result=require('./bounded-scheduler.cjs').explore(input);
 else if(name==='all25_writer_targets'){
  const {createCurrent}=require('./current-protocol.cjs'),{checkTrace}=require('./proof-checker.cjs');c.fs.mkdirSync(c.path.join(__dirname,'target-traces'));const targets=[];
  for(let i=0;i<input.order.length;i++){const target=input.order[i],p=createCurrent({tables:input.order,fixtureTable:input.fixtureTable});p.stepB();p.model.guardSample();p.model.begin('W','EXTERNAL_WRITER');p.model.request('W',target,'ROW_EXCLUSIVE');p.model.commit('A');p.model.invariant();const proof=checkTrace(p.model.events,input.order),file='target-traces/'+String(i+1).padStart(2,'0')+'.json';c.write(file,{target,events:p.model.events,proof,modelOnly:true});targets.push({target,counterexamples:proof.counterexamples.length,trace:file});}result={targets,all25Evaluated:true,universalProof:false};
 }
 else if(['ownership_unknown','ownership_drift'].includes(name)){
  const {OwnershipRegistry}=require('./ownership-registry.cjs'),{managedClass}=require('./managed-connections.cjs'),{SensorClient}=require('./sensor-client.cjs'),fence=createFence(),events=[];fence.start(name);const registry=new OwnershipRegistry({write:e=>events.push(e),stop:(e,p)=>fence.fail(e,p),role:'postgres',route:{kind:'VERIFIED_DIRECT',host:'127.0.0.1',port:5432}});let disposed=0;const Client=managedClass({RawClient:SensorClient,registry,factory:'offline-owned',onDisposed:()=>disposed++}),client=new Client({host:'127.0.0.1',port:5432,database:'travelgo_ai_m0_test',user:'postgres'});let error=null;
  try{await client.connect();const rows=[client.self()];if(name==='ownership_unknown')rows.push({...client.self(),pid:99999,application_name:''});else rows[0].backend_start='2026-11-11T11:00:00.654321Z';registry.assertActivity(rows,registry.snapshot());}catch(e){error=e.message;fence.fail(e,'ownership');}finally{await client.end();}
  let dispatched=0,rejected=0;for(const k of ['agent','native','tool','operator'])try{await fence.dispatch(k,async()=>dispatched++);}catch{rejected++;}result={error,disposed,dispatched,rejected,fence:fence.state,registrationPasses:events.filter(x=>x.type==='REGISTRATION_PASS').length,events};
 }else if(['cleanup_unsafe','cleanup_valid'].includes(name)){
  const {SyntheticDb}=require('./synthetic-db.cjs'),{createCleanupLifecycle}=require('./cleanup-lifecycle.cjs'),{runPlannerHarness,PRE,POST}=require('./run-live.corrected.cjs'),db=new SyntheticDb();if(name==='cleanup_unsafe')db.isolation.isolation='UNPROVEN_HANDOFF';const lifecycle=createCleanupLifecycle(db.ports());
  const ports={guards:Object.fromEntries(PRE.map(k=>[k,async()=>{if(k==='manifest')throw Error('HANDOFF_COUNTEREXAMPLE_PRIMARY');return true;}])),checks:Object.fromEntries(POST.map(k=>[k,async()=>true])),execute:async()=>assert.fail('NO_DISPATCH'),assertUi:async()=>true,cleanupPrecondition:()=>lifecycle.assess(),cleanup:()=>lifecycle.perform(),dispose:()=>db.dispose()};
  const harness=await runPlannerHarness({cases:[{id:'R01'},{id:'R02'},{id:'R03'}],ports});result={harness,cleanupActions:db.cleanupCalls,disposeCount:db.disposeCalls,residualModelRows:db.rows.length,tier:'ARRAY_MODEL_NO_DATABASE'};
 }else result=runScenario(name,input);
 c.write('cases/'+name+'.json',{name,tier:'OFFLINE_MODEL_OR_SENSOR_NOT_POSTGRES',result,network:require('./offline-boundary.cjs').audit});console.log(name+' COMPLETED');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
