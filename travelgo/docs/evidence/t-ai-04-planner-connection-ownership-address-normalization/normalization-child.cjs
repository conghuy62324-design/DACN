'use strict';
const c=require('./common.cjs'),assert=c.assert,{parseHost,assertHostEqual}=require('./host-address.cjs'),{assertRoute,verifyForwarding}=require('./route-policy.cjs'),{OwnershipRegistry}=require('./ownership-registry.cjs'),{managedClass}=require('./managed-connections.cjs'),{SensorClient}=require('./sensor-client.cjs'),{createFence}=require('./fail-fast.cjs');
const spec=JSON.parse(Buffer.from(process.argv[2],'base64').toString('utf8')),events=[],clients=[],fence=createFence();fence.start(spec.id);
let client,result,error=null,disposed=0,registry;
const write=e=>{if(spec.action==='writer-failure'&&e.type==='RAW_SELF_IDENTITY')throw Error('INJECTED_EVIDENCE_WRITER_FAILURE');events.push(e);};
async function replay(){
 const seal=c.json(c.prior+'artifact-checksums.json'),names=['trace-events/001-CREATE.json','trace-events/002-PHYSICAL_OPEN.json','trace-events/003-RAW_SELF_IDENTITY.json','route-before-trace.json','trace-result.json'];
 for(const f of names)assert.equal(c.sha(c.read(c.prior+f)),seal.hashes[f],f);
 const created=c.json(c.prior+names[0]).payload,physical=c.json(c.prior+names[1]).payload,rawRecord=c.json(c.prior+names[2]),row=rawRecord.payload.row,lockedRoute=c.json(c.prior+'route-before-trace.json');
 assert.equal(c.sha(JSON.stringify(rawRecord.payload)),rawRecord.payloadSha256);assert.equal(created.id,physical.instanceId);assert.equal(created.id,rawRecord.payload.instanceId);assert.equal(row.application_name,created.application_name);assert.equal(row.application_name,physical.startup.application_name);assert.equal(row.application_name,'og-'+created.factory+'-'+created.token);assert.equal(row.pid,row.pg_backend_pid);assert.equal(row.pid,17864);assert.equal(row.backend_start,'2026-11-11T08:56:06.990903Z');assert.equal(row.database,'travelgo_ai_m0_test');assert.equal(row.role,'postgres');assert.equal(row.sentinel,'hugotravel-isolated-test-database-v1');assert.equal(row.default_transaction_read_only,'on');assert.equal(row.transaction_read_only,'on');
 const originalBytes=c.read(c.prior+names[2]),route=verifyForwarding(lockedRoute,{now:Date.parse(lockedRoute.at)});assertRoute(route,physical.physical,row);assert.equal(parseHost(row.server_addr).hex,'ac120003');assert.equal(parseHost(row.client_addr).hex,'ac120001');assert.deepEqual(c.read(c.prior+names[2]),originalBytes);assert.equal(c.json(c.prior+'trace-result.json').status,'FAIL_CLOSED');
 return{tier:'OFFLINE_REPLAY_OF_HISTORICAL_RAW_DATA',addressRouteComparison:'PASS_OFFLINE',originalRawSha256:c.sha(originalBytes),historicalTraceStatus:'FAIL_CLOSED_PRESERVED',historicalRegistrationPassSynthesized:false,linkedPid:row.pid,linkedBackendStart:row.backend_start,newPostgresTrace:false};
}
async function guardCase(){
 const locked=c.json(c.prior+'route-before-trace.json'),observedNow=Date.parse(locked.at);let routeRaw=structuredClone(locked);
 if(spec.action==='wrong-mapping')routeRaw.ports['5432/tcp'].forEach(x=>x.HostPort='5433');
 if(spec.action==='stale-route')routeRaw.at='2000-01-01T00:00:00Z';
 if(spec.action==='unexpected-listener')routeRaw.listeners.find(x=>x.address==='127.0.0.1').path='C:/unknown/proxy.exe';
 if(spec.action==='wrong-route-target')routeRaw.endpoint.host='10.0.0.1';
 const route=verifyForwarding(routeRaw,{now:observedNow});
 SensorClient.rowPatch={server_addr:route.serverAddress+'/32',client_addr:route.clientAddress+'/32',inet_client_addr:route.clientAddress+'/32',client_port:47448,inet_client_port:47448};
 const patches={
  'wrong-server':{server_addr:'172.18.0.4/32'},'wrong-gateway':{client_addr:'172.18.0.2/32',inet_client_addr:'172.18.0.2/32'},'server-network':{server_addr:'172.18.0.3/24'},'gateway-network':{client_addr:'172.18.0.1/24',inet_client_addr:'172.18.0.1/24'},'wrong-family':{server_addr:'::1/128'},'wrong-database':{database:'travelgo_db'},'protocol-pid':{pid:99999,pg_backend_pid:99999},'startup-token':{application_name:'og-copied-other-token'},'empty-tag':{application_name:''},'read-write':{transaction_read_only:'off'},'default-read-write':{default_transaction_read_only:'off'},'wrong-role':{role:'other'},'wrong-sentinel':{sentinel:'wrong'},'wrong-self-client':{inet_client_addr:'172.18.0.2/32'},'wrong-server-port':{server_port:5433}
 };
 Object.assign(SensorClient.rowPatch,patches[spec.action]||{});
 registry=new OwnershipRegistry({route,role:'postgres',write,stop:(e,p)=>fence.fail(e,p)});
 class PhysicalSensor extends SensorClient{constructor(config){super(config);if(spec.action==='wrong-physical-target')this.connection.stream.remoteAddress='10.0.0.1';}}
 const Client=managedClass({RawClient:PhysicalSensor,registry,factory:'norm-sensor',mode:spec.action==='missing-registration'?'SEQUELIZE':'RAW',onCreated:x=>clients.push(x),onDisposed:()=>disposed++});
 client=new Client({host:'127.0.0.1',port:5432,database:'travelgo_ai_m0_test',user:'postgres'});
 if(spec.action==='pending-created'){registry.assertActivity([],registry.snapshot());return;}
 await client.connect();let rows=[client.self()];
 if(spec.action==='backend-start'||spec.action==='pid-reuse')rows[0].backend_start='2026-11-11T09:00:00.654321Z';
 if(spec.action==='copied-tag')rows.push({...rows[0],pid:99999,backend_start:'2026-11-11T09:00:00.654321Z'});
 if(spec.action==='external')rows.push({...rows[0],pid:99999,application_name:''});
 if(spec.action==='closed'){await client.end();}
 if(spec.action==='snapshot-mutation'){const snap=registry.snapshot();snap.records[0].identity.pid=99999;return;}
 if(spec.action==='maintenance-owned'||spec.action==='maintenance-unknown'){
  if(spec.action==='maintenance-unknown')rows.push({...rows[0],pid:99999,application_name:''});
  const {createMaintenanceCandidate}=require('./maintenance.candidate.cjs'),{bindRealGuards}=require('./real-guards.cjs'),{runPlannerHarness}=require('./run-live.corrected.cjs');
  const m=createMaintenanceCandidate({db:{sequelize:{addHook(){}},ENV:{DB_USER:'postgres'}},registry,createClient:async()=>client,write});m.a=client;m.b=client;const sql=m.sql.bind(m);m.sql=async(holder,text,values)=>text.includes('FROM pg_stat_activity')?{rows}:sql(holder,text,values);
  const runtime={context(){},verify(){},stage(){},assertTemplate(){},assertSession(){},assertOwnership(){},assertToolBoundary(){},assertCap(){},assertQuotaTtl(){},assertFixtures:()=>m.foreignConnections(),assertRuntime(){},assertResponse(){},assertRaw(){},assertHistory(){},assertExecuted(){}};
  const ports={...bindRealGuards(runtime),execute:async()=>({}),assertUi:async()=>true,cleanupPrecondition:async()=>({status:'NOT_APPLICABLE',reason:'NO_COMMITTED_TASK_FIXTURES',committed:false,ambiguous:false,createdRows:0,ledgerPresent:false}),cleanup:async()=>assert.fail('NO_FIXTURE_DELETE'),dispose:()=>client.end()};
  const harness=await runPlannerHarness({cases:[{id:'R01'},{id:'R02'},{id:'R03'}],ports});result={harness};if(harness.status!=='PASS')throw Error(harness.firstFailure.error.message);return{harness};
 }
 registry.assertActivity(rows,registry.snapshot());return{registry:registry.view(client)};
}
(async()=>{try{
 if(spec.kind==='parse')result=parseHost(spec.input,spec.family);
 else if(spec.kind==='equal')result={equal:assertHostEqual(spec.actual,spec.expected)};
 else if(spec.kind==='replay')result=await replay();
 else result=await guardCase();
 }catch(e){error={name:e.name,message:e.message};fence.fail(e,'normalization-acceptance');}
 finally{
  for(const x of clients)if(!x._ownershipDisposed)try{await x.end();}catch(e){fence.fail(e,'dispose');error??={name:e.name,message:e.message};}
  let lateRejected=0,lateDispatched=0;if(error)for(const kind of ['agent','native','tool','operator'])try{await fence.dispatch(kind,async()=>lateDispatched++);}catch{lateRejected++;}
  c.write('normalization-cases/'+spec.id+'.json',{id:spec.id,tier:spec.kind==='replay'?'OFFLINE_REPLAY_OF_HISTORICAL_RAW_DATA':'OFFLINE_SENSOR_CHILD',result:result??null,error,events,created:clients.length,disposed,lateRejected,lateDispatched,fence:fence.state,network:require('./network-boundary.cjs').audit});if(error)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack);process.exitCode=2;});
