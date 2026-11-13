'use strict';
const c=require('./common.cjs'),assert=c.assert,{OwnershipRegistry}=require('./ownership-registry.cjs'),{createFence}=require('./fail-fast.cjs'),{SensorClient}=require('./sensor-client.cjs'),{createFactories}=require('./multi-factory.cjs'),{cleanupOwned}=require('./resource-cleanup.cjs'),{runLockSmoke}=require('./lock-smoke.cjs'),{createMaintenanceCandidate}=require('./maintenance.candidate.cjs');
const scenario=process.argv[2],events=[],fence=createFence();fence.start('MULTI_SENSOR');let failClient=null;
class RawSensor extends SensorClient{async end(callback){if(this===failClient){const e=Error('INJECTED_PARTIAL_DISPOSE');if(callback)return callback(e);throw e;}return super.end(callback);}}
const registry=new OwnershipRegistry({write:e=>events.push(e),stop:(e,p)=>fence.fail(e,p),route:{kind:'VERIFIED_DIRECT',host:'127.0.0.1',port:5432},role:'postgres'}),pg=require(c.path.join(c.root,'backend/node_modules/pg')),Sequelize=require(c.path.join(c.root,'backend/node_modules/sequelize')).Sequelize;
const factories=createFactories({pg:{...pg,Client:RawSensor},Sequelize,config:{host:'127.0.0.1',port:5432,database:'travelgo_ai_m0_test',user:'postgres',password:'SENSOR_ONLY'},registry,fence,write:e=>events.push(e)}),held=new Set();let sequelize,error=null,observed={},cleanup,releaseGate,connectPending,simTransactions=new Set(),sim;
async function twoPool(){sequelize=factories.pool();const clients=await Promise.all([0,1].map(()=>sequelize.connectionManager.getConnection({type:'SELECT'}).then(x=>{held.add(x);return x;})));return clients;}
async function reader(label='observer'){const client=factories.raw(label);await client.connect();return client;}
(async()=>{try{
 if(['concurrent-pool','bootstrap-separate','released-idle'].includes(scenario)){
  const pooled=await twoPool();observed.poolMax=sequelize.options.pool.max;observed.bootstrap=factories.records.filter(x=>x.kind==='bootstrap').map(x=>({id:x.instanceId,disposed:x.disposed}));observed.pool=factories.records.filter(x=>x.kind==='pool').map(x=>x.instanceId);observed.pooledDistinct=new Set(pooled).size;
  if(scenario==='released-idle'){for(const x of pooled){await sequelize.connectionManager.releaseConnection(x);held.delete(x);}observed.released=pooled.map(x=>({state:registry.view(x).state,ended:x._ended}));registry.assertActivity(pooled.map(x=>({...x.self(),state:'idle'})),registry.snapshot());}
 }else if(scenario==='pending-race'){
  sequelize=factories.pool();let entered;const ready=new Promise(r=>entered=r);sequelize.addHook('afterConnect',async()=>{entered();await new Promise(r=>releaseGate=r);});connectPending=sequelize.connectionManager.getConnection({type:'SELECT'}).then(x=>{held.add(x);return x;});connectPending.catch(()=>{});await ready;registry.assertActivity(factories.records.map(x=>x.client.self()),registry.snapshot());
 }else if(scenario==='stale-disconnect'){
  const client=await reader(),snapshot=registry.snapshot();await client.end();registry.assertActivity([],snapshot);
 }else if(scenario==='pid-reuse'){
  const client=await reader();registry.assertActivity([{...client.self(),backend_start:'2026-11-11T10:00:00.654321Z'}],registry.snapshot());
 }else if(scenario==='between-snapshots'){
  const client=await reader();registry.assertActivity([client.self()],registry.snapshot());const snapshot=registry.snapshot();registry.assertActivity([client.self(),{...client.self(),pid:99999,application_name:''}],snapshot);
 }else if(['observer-no-proof','probe-no-proof'].includes(scenario)){
  registry.assertActivity([{pid:99999,backend_start:'2026-11-11T10:00:00.654321Z',application_name:'',datname:'travelgo_ai_m0_test',usename:'postgres',backend_type:'client backend',client_addr:'127.0.0.1',client_port:61001}],registry.snapshot());
 }else if(scenario==='missing-entry'){registry.view({});
 }else if(scenario==='partial-dispose'){
  const a=await reader('reader-a');await reader('reader-b');failClient=a;throw Error('INJECTED_ORIGINAL_BEFORE_PARTIAL_DISPOSE');
 }else if(scenario==='cap-exceeded'){
  for(let i=0;i<11;i++)factories.budget.reserve({},{kind:'cap-sensor',instanceId:String(i),factory:'cap-unit'});
 }else if(['handoff-success','handoff-error'].includes(scenario)){
  const a=await reader('maintenance-a'),b=await reader('maintenance-b'),probe=await reader('probe');const m=createMaintenanceCandidate({db:{sequelize:{addHook(){}},ENV:{DB_USER:'postgres'}},registry,createClient:async()=>{},write:e=>events.push(e)});m.a=a;m.b=b;m.clients=[a,b,probe];m.tables=Object.keys(c.json('docs/evidence/t-ai-04-planner-test-data-readiness/fingerprint-after.json').tables).sort();m.writeLock='LOCK_A';m.shareLock='LOCK_B';let aLocks=false,bLocks=false,queued=false,resolveB;const calls=[];sim=m;
  m.sql=async(client,sql)=>{calls.push({pid:client.processID,sql});if(sql==='BEGIN READ WRITE'){simTransactions.add(client);return{rows:[]};}if(sql==='LOCK_A'){aLocks=true;return{rows:[]};}if(sql==='LOCK TABLE public."places" IN ROW EXCLUSIVE MODE NOWAIT'){const e=Error('EXPECTED_SENSOR_LOCK_CONFLICT');e.code='55P03';throw e;}if(sql==='LOCK_B'){queued=true;return new Promise(r=>resolveB=r);}if(sql.startsWith('SELECT pg_blocking_pids'))return{rows:[{blockers:queued&&aLocks?[a.processID]:[]}]};if(sql==='COMMIT'||sql==='ROLLBACK'){simTransactions.delete(client);if(client===a){aLocks=false;if(queued){bLocks=true;resolveB?.({rows:[]});}}if(client===b)bLocks=false;return{rows:[]};}throw Error('UNEXPECTED_SENSOR_SQL');};
  m.foreignConnections=async()=>registry.assertActivity([a.self(),b.self(),probe.self()],registry.snapshot());m.locks=async()=>m.tables.flatMap(relname=>[...(aLocks?[{pid:a.processID,relname,mode:'ShareRowExclusiveLock',granted:true}]:[]),...(bLocks?[{pid:b.processID,relname,mode:'ShareLock',granted:true}]:[])]);
  if(scenario==='handoff-error')m.queueGuardWrapped=async()=>{throw Error('INJECTED_HANDOFF_FAILURE');};
  try{observed.smoke=await runLockSmoke({maintenance:m,probe,write:e=>events.push(e)});}finally{for(const x of [...simTransactions])await m.sql(x,'ROLLBACK');observed.lockCalls=calls;observed.simTransactionsRemaining=simTransactions.size;}
 }
 }catch(e){error={message:e.message,code:e.code||null};fence.fail(e,'multi-scenario');}
 finally{
  if(releaseGate)releaseGate();if(connectPending)await Promise.allSettled([connectPending]);
  cleanup=await cleanupOwned({factories,sequelize,held,observer:null,fence,write:e=>events.push(e)});
  if(cleanup.status==='RESOURCE_CLEANUP_BLOCKED'&&!error)error={message:'RESOURCE_CLEANUP_BLOCKED'};
  let lateRejected=0,lateDispatched=0;if(error)for(const kind of ['agent','native','tool','operator'])try{await fence.dispatch(kind,async()=>lateDispatched++);}catch{lateRejected++;}
  c.write('multi-cases/'+scenario+'.json',{scenario,tier:'OFFLINE_MULTI_CONNECTION_SENSOR_CHILD',error,observed,cleanup,attempts:factories.budget.attempts,created:factories.records.length,disposed:factories.records.filter(x=>x.disposed).length,events,fence:fence.state,lateRejected,lateDispatched,network:require('./network-boundary.cjs').audit});if(error)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack);process.exitCode=2;});
