'use strict';
const c=require('./common.cjs'),assert=c.assert,{OwnershipRegistry}=require('./ownership-registry.cjs'),{managedClass,makeSequelize,OPTIONS,ACTIVITY}=require('./managed-connections.cjs'),{makeClosingGuard}=require('./closing-guard.cjs'),{SensorClient}=require('./sensor-client.cjs'),{createFence}=require('./fail-fast.cjs');
const scenario=process.argv[2],caseDir=process.argv[3]||'cases',events=[],clients=[],fence=createFence();fence.start('OWNERSHIP');const cfg={host:'127.0.0.1',port:5432,database:'travelgo_ai_m0_test',user:'postgres',password:'SENSOR_ONLY_NOT_REAL'};
let route={kind:'VERIFIED_DIRECT',host:'127.0.0.1',port:5432},writeFail=false,cleanupCount=0,orm,result;
const forwarded=['verified-proxy','unknown-route','forward-server-mismatch'].includes(scenario);
if(forwarded){SensorClient.rowPatch={server_addr:'172.18.0.3',client_addr:'172.18.0.1',inet_client_addr:'172.18.0.1',client_port:35994,inet_client_port:35994};route=scenario==='unknown-route'?{kind:'UNKNOWN'}:{kind:'VERIFIED_DOCKER_WSL_FORWARD',serverAddress:'172.18.0.3',serverPort:5432,clientAddress:'172.18.0.1'};}
if(scenario==='forward-server-mismatch')SensorClient.rowPatch.server_addr='172.18.0.99';
if(scenario==='unexpected-port')SensorClient.rowPatch={client_port:35994,inet_client_port:35994};
if(scenario==='db-mismatch')SensorClient.rowPatch={database:'travelgo_db'};
if(scenario==='ro-not-applied')SensorClient.rowPatch={default_transaction_read_only:'off'};
if(scenario==='transaction-rw')SensorClient.rowPatch={transaction_read_only:'off'};
if(scenario==='timeout-mismatch')SensorClient.rowPatch={statement_timeout:'0'};
if(scenario==='sentinel-mismatch')SensorClient.rowPatch={sentinel:'wrong'};
if(scenario==='empty-tag')SensorClient.rowPatch={application_name:''};
if(scenario==='spoofed-self-tag')SensorClient.rowPatch={application_name:'og-spoofed'};
const registry=new OwnershipRegistry({role:'postgres',route,stop:(e,p)=>fence.fail(e,p),write:e=>{if(scenario==='writer-failure'&&e.type==='RAW_SELF_IDENTITY')throw Error('INJECTED_EVIDENCE_WRITE_FAILURE');events.push(e);}});
const Client=managedClass({RawClient:SensorClient,registry,factory:'test-reader',mode:scenario==='pending-bootstrap'?'SEQUELIZE':'RAW',onCreated:x=>clients.push(x)});
let client,error=null,guardPassed=false;
async function guard(rows){return makeClosingGuard({registry,write:e=>events.push(e),readActivity:async()=>rows})('closing');}
(async()=>{try{
 if(scenario.startsWith('cleanup-')){
  const {SyntheticDb}=require('./synthetic-db.cjs'),{createCleanupLifecycle}=require('./cleanup-lifecycle.cjs'),db=new SyntheticDb(),io=db.ports();
  if(scenario==='cleanup-hash')db.rows[0].sha256='0'.repeat(64);
  if(scenario==='cleanup-foreign')db.refs.foreign[0].count=1;
  if(scenario==='cleanup-trip')db.refs.tripJson=1;
  if(scenario==='cleanup-isolation')db.isolation.isolation='NONE';
  if(scenario==='cleanup-ids')db.rows[0].row.id='foreign';
  const life=createCleanupLifecycle(io);try{await life.assess();await life.perform();}finally{cleanupCount=db.cleanupCalls;}
  guardPassed=true;
 }else if(['afterconnect-failure','sequelize-pool','sequelize-startup'].includes(scenario)){
  const {Sequelize}=require(c.path.join(c.root,'backend/node_modules/sequelize')),pg=require(c.path.join(c.root,'backend/node_modules/pg'));
  orm=makeSequelize({Sequelize,pg:{...pg,Client:SensorClient},config:cfg,registry,onCreated:x=>clients.push(x)});
  if(scenario==='afterconnect-failure')orm.addHook('afterConnect',async()=>{throw Error('INJECTED_AFTERCONNECT_FAILURE');});
  client=await orm.connectionManager.getConnection({type:'SELECT'});assert.equal(client.startupSent.options,OPTIONS);assert.equal(orm.connectionManager.config.dialectOptions.options,OPTIONS);
  await guard([client.self()]);await orm.connectionManager.releaseConnection(client);assert.equal(registry.view(client).state,'RELEASED');assert.equal(client._ended,false);guardPassed=true;
 }else if(scenario==='missing-open'){
  client=new Client(cfg);registry.observe(client,client.self());registry.register(client);
 }else{
  client=new Client(cfg);await client.connect();assert.equal(client.startupSent.options,OPTIONS);
  let rows=[client.self()];
  if(scenario==='release-pool')registry.release(client);
  if(scenario==='destroy-disconnect'){await client.end();rows=[];}
  if(scenario==='pid-reuse'||scenario==='backend-start-mismatch')rows[0].backend_start='2026-11-11T09:00:00.654321Z';
  if(scenario==='unknown-external')rows.push({...rows[0],pid:99999,application_name:''});
  if(scenario==='copied-tag')rows.push({...rows[0],pid:99999,backend_start:'2026-11-11T09:00:00.654321Z'});
  if(scenario==='stale-registry'){const row=rows[0];await client.end();rows=[row];}
  if(scenario==='duplicate-registration')registry.register(client);
  if(scenario==='late-registration'){
   const snap=registry.snapshot(),other=new Client(cfg);await other.connect();registry.assertActivity([client.self(),other.self()],snap);
  }else if(scenario==='dispose-failure'){SensorClient.failEnd=true;await client.end();}
  else if(scenario==='runtime-write-block'){await client.query('DELETE FROM places');}
  else if(scenario==='fake-snapshot'){registry.assertActivity(rows,{sequence:0,records:[]});}
  else if(scenario==='immutable-snapshot'){const snap=registry.snapshot();assert.throws(()=>snap.records.push({}));assert.throws(()=>{snap.records[0].identity.pid=1;});registry.assertActivity(rows,snap);guardPassed=true;}
  else{await guard(rows);guardPassed=true;}
 }
 }catch(e){error={name:e.name,message:e.message};fence.fail(e,'acceptance-scenario');}
 finally{
  if(orm){try{await orm.close();}catch(e){fence.fail(e,'orm-dispose');error??={name:e.name,message:e.message};}}
  for(const x of clients)if(!x._ownershipDisposed&&scenario!=='dispose-failure')try{await x.end();}catch(e){fence.fail(e,'dispose-secondary');error??={name:e.name,message:e.message};}
  let lateRejected=0,lateDispatched=0;if(fence.state.stopped){for(const kind of ['agent','native','tool','operator'])try{await fence.dispatch(kind,async()=>lateDispatched++);}catch{lateRejected++;}}
  c.write(caseDir+'/'+scenario+'.json',{scenario,tier:'OFFLINE_SENSOR_CHILD',error,guardPassed,events,clientsCreated:clients.length,clientsDisposed:clients.filter(x=>x._ownershipDisposed).length,cleanupCount,lateRejected,lateDispatched,fence:fence.state,network:require('./network-boundary.cjs').audit,actualEntityWrites:0});if(fence.state.stopped)process.exitCode=1;
 }
})().catch(e=>{console.error(e.stack);process.exitCode=2;});
