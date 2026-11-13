'use strict';
const c=require('./common.cjs'),assert=c.assert,{OwnershipSensor}=require('./ownership-sensor.proposed.cjs');
assert.equal(process.env.OWNERSHIP_TRACE_MODE,'READ_ONLY_METADATA');
assert.equal(c.json(c.prefix+'offline-results.json').status,'PASS');assert.equal(c.json(c.prefix+'offline-results.json').pass,19);
assert.equal(c.json(c.prefix+'static-investigation.json').status,'PASS_STATIC_REVIEW_COMPLETE');c.integrity();
const marker=c.path.join(__dirname,'trace-started.json');c.write('trace-started.json',{at:new Date().toISOString(),mode:'READ_ONLY_METADATA',singleUse:true,entityQueries:0,entityWrites:0,ollama:0});
const parsed=require(c.path.join(c.root,'backend/node_modules/dotenv')).parse(c.read('backend/.env'));
const pg=require(c.path.join(c.root,'backend/node_modules/pg')),{Sequelize}=require(c.path.join(c.root,'backend/node_modules/sequelize'));
const config={host:'127.0.0.1',port:5432,database:'travelgo_ai_m0_test',user:parsed.DB_USER||'postgres',password:parsed.DB_PASSWORD||'postgres',ssl:false,options:'-c default_transaction_read_only=on -c statement_timeout=15000 -c idle_in_transaction_session_timeout=30000'};
const run='own-'+c.crypto.randomUUID().slice(0,8),sensor=new OwnershipSensor(),events=[],clients=new Set(),queries=[];
const ACTIVITY="SELECT pid,to_char(backend_start AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS backend_start,application_name,usename,datname,client_addr::text AS client_addr,client_port,backend_type,state,wait_event_type,wait_event FROM pg_stat_activity WHERE datname=current_database() ORDER BY pid";
const SELF="SELECT pid,to_char(backend_start AT TIME ZONE 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"') AS backend_start,application_name,usename,datname,client_addr::text AS client_addr,client_port,backend_type,current_setting('default_transaction_read_only') AS read_only,current_setting('transaction_read_only') AS transaction_read_only,inet_server_port() AS server_port,shobj_description((SELECT oid FROM pg_database WHERE datname=current_database()),'pg_database') AS sentinel FROM pg_stat_activity WHERE pid=pg_backend_pid()";
function event(type,data={}){events.push({sequence:events.length+1,at:new Date().toISOString(),type,...data});}
function allowed(sql){return [ACTIVITY,SELF,'SELECT 1+1 AS result',"SELECT current_database() AS database, current_setting('transaction_read_only') AS read_only","SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position"].includes(sql)||/^SET client_min_messages TO warning;SET TIME ZONE INTERVAL '\+00:00' HOUR TO MINUTE;$/.test(sql)||sql.startsWith('WITH ranges AS (  SELECT pg_range.rngtypid, pg_type.typname AS rngtypname,');}
class TracedClient extends pg.Client{
 constructor(options){super(options);this.factory=options.application_name?.includes('observer')?'observer':options.application_name?.includes('maintenance')?'maintenance-readonly-control':'sequelize-pool-or-bootstrap';this.clientId=run+'-c'+(clients.size+1);this.applicationName=this.connectionParameters.application_name;clients.add(this);sensor.opened(this,this.factory);event('CREATE',{clientId:this.clientId,factory:this.factory,application_name:this.applicationName});this.on('end',()=>{sensor.closed(this);event('DISPOSE_END',{clientId:this.clientId,pid:this.processID,localPort:this.localPort});});this.on('error',error=>{sensor.failed(this,'connection');event('CLIENT_ERROR',{clientId:this.clientId,code:error.code||error.name});});}
 async connect(callback){try{await super.connect();this.localPort=this.connection.stream.localPort;event('PHYSICAL_CONNECTED',{clientId:this.clientId,pid:this.processID,localPort:this.localPort,factory:this.factory});if(callback)callback(null);}catch(e){sensor.failed(this,'connect');if(callback)callback(e);else throw e;}}
 query(...args){const sql=typeof args[0]==='string'?args[0]:args[0]?.text;assert.ok(typeof sql==='string'&&allowed(sql),'METADATA_SQL_ALLOWLIST_STOP');queries.push({clientId:this.clientId,sqlSha256:c.sha(sql),kind:sql===SELF?'SELF_IDENTITY':sql===ACTIVITY?'ACTIVITY':sql.startsWith('SET ')?'FIXED_SESSION_SETUP':'CATALOG_OR_CONSTANT'});return super.query(...args);}
}
async function register(client){const row=(await client.query(SELF)).rows[0];assert.equal(row.datname,config.database);assert.equal(row.usename,config.user);assert.equal(row.read_only,'on');assert.equal(row.transaction_read_only,'on');assert.equal(row.sentinel,'hugotravel-isolated-test-database-v1');assert.equal(row.server_port,5432);sensor.register(client,row);event('REGISTER_IDENTITY',{clientId:client.clientId,factory:client.factory,identity:row});return row;}
let observer,maintenance,orm,held,second,releaseHook,hookReached,hookBlock=false;
const windows=[];let failure=null,result;
async function observe(label){const snap=sensor.snapshot();const rows=(await observer.query(ACTIVITY)).rows;const verdict=sensor.evaluate(rows,snap);const out={label,at:new Date().toISOString(),snapshotSequence:snap.sequence,rows,verdict};windows.push(out);event('GUARD_OBSERVATION',{label,status:verdict.status,unknownPids:verdict.unknown.map(x=>x.pid)});return out;}
(async()=>{
 try{
  observer=new TracedClient({...config,application_name:run+'-observer'});await observer.connect();const identity=await register(observer);
  const schema=(await observer.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position")).rows;
  const expected=c.json(c.prior+'db-preflight.json').schemaSha256;assert.equal(c.sha(JSON.stringify(schema)),expected,'SCHEMA_CONTEXT_STOP');
  c.write('read-only-preflight.json',{at:new Date().toISOString(),status:'PASS',configured:{host:config.host,port:config.port,database:config.database},identity,schemaSha256:expected,readOnlyStartup:true,transactionReadOnly:true,entityQueries:0,entityWrites:0,superuserNotLeastPrivilege:config.user==='postgres'});
  const initial=await observe('INITIAL_AFTER_PREFLIGHT');
  maintenance=new TracedClient({...config,application_name:run+'-maintenance'});await maintenance.connect();await register(maintenance);await observe('MAINTENANCE_READONLY_CONTROL');
  orm=new Sequelize(config.database,config.user,config.password,{host:config.host,port:config.port,dialect:'postgres',logging:false,pool:{max:10,min:0,acquire:15000,idle:10000},dialectModule:{...pg,Client:TracedClient},dialectOptions:{ssl:false,application_name:run+'-sequelize',options:config.options}});
  let reachedResolve;const reached=new Promise(resolve=>{reachedResolve=resolve;});
  orm.addHook('afterConnect',async client=>{event('AFTERCONNECT_ENTER',{clientId:client.clientId,pid:client.processID});if(hookBlock){hookBlock=false;hookReached=client;event('INJECTED_REGISTRATION_PAUSE',{clientId:client.clientId,pid:client.processID});await new Promise(resolve=>{releaseHook=resolve;reachedResolve();});}await register(client);event('AFTERCONNECT_COMPLETE',{clientId:client.clientId,pid:client.processID});});
  orm.addHook('beforeDisconnect',client=>event('BEFORE_DISCONNECT',{clientId:client.clientId,pid:client.processID}));
  orm.addHook('afterDisconnect',client=>event('AFTER_DISCONNECT',{clientId:client.clientId,pid:client.processID}));
  await orm.authenticate();await observe('AFTER_AUTHENTICATE_BOOTSTRAP_CLOSED_POOL_RETAINED');
  held=await orm.connectionManager.getConnection({type:'SELECT'});event('POOL_ACQUIRE_HELD',{clientId:held.clientId,pid:held.processID});
  hookBlock=true;const pending=orm.connectionManager.getConnection({type:'SELECT'});pending.catch(()=>{});
  await Promise.race([reached,new Promise((_,reject)=>{const timer=setTimeout(()=>reject(Error('TRACE_REGISTRATION_PAUSE_TIMEOUT')),10000);timer.unref();})]);
  const paused=await observe('INJECTED_AFTERCONNECT_PENDING');
  assert.ok(paused.verdict.unknown.some(x=>x.pid===hookReached.processID),'PENDING_BACKEND_NOT_OBSERVED');
  const legacyAllowed=[...sensor.snapshot().records.filter(x=>x.state==='REGISTERED').map(x=>x.identity.pid)];
  releaseHook();releaseHook=null;second=await pending;
  const after=await observe('AFTER_EXPLICIT_REGISTRATION');assert.ok(!after.verdict.unknown.some(x=>x.pid===second.processID));
  const legacyFalseUnknown=after.rows.filter(x=>!legacyAllowed.includes(x.pid));assert.ok(legacyFalseUnknown.some(x=>x.pid===second.processID),'BOUND_PID_SNAPSHOT_RACE_NOT_DEMONSTRATED');
  await orm.connectionManager.releaseConnection(second);event('POOL_RELEASE',{clientId:second.clientId,pid:second.processID});sensor.released(second);second=null;
  await orm.connectionManager.releaseConnection(held);event('POOL_RELEASE',{clientId:held.clientId,pid:held.processID});sensor.released(held);held=null;
  await observe('RELEASED_TO_POOL_SESSIONS_STILL_PRESENT');
  await orm.close();orm=null;await maintenance.end();maintenance=null;
  const disposed=await observe('AFTER_OWNED_POOL_AND_MAINTENANCE_DISPOSE');
  const disposedPids=[...clients].filter(x=>x!==observer).map(x=>x.processID);assert.ok(disposed.rows.every(x=>!disposedPids.includes(x.pid)),'OWNED_SESSION_RESIDUAL_STOP');
  const historicalRows=initial.rows.filter(x=>x.pid===9686);
  result={at:new Date().toISOString(),status:'READ_ONLY_PROVENANCE_TRACE_COMPLETE',historical:{pid:9686,status:historicalRows.length?'HISTORICAL_PID_IDENTITY_NOT_RECOVERABLE':'HISTORICAL_PID_NOT_OBSERVABLE',currentRows:historicalRows,ownership:'UNKNOWN',backendStartHistoricalMissing:true},mechanism:{status:'VERIFIED_HARNESS_CONNECTION_REGISTRATION_WINDOW',injectedPause:true,historicalReplay:false,pausedClientId:hookReached.clientId,pid:hookReached.processID,backend_start:after.rows.find(x=>x.pid===hookReached.processID).backend_start,legacyBoundPidSnapshotFalseUnknown:legacyFalseUnknown,safeFreshSensorRecognition:true,guardBypass:false},initialUnknown:initial.verdict.unknown,postDisposeUnknown:disposed.verdict.unknown,entityQueries:0,entityWrites:0,fixtureWrites:0,directPlannerExecutions:0,ollamaGet:0,ollamaPost:0,liveBrowser:0,productionChanged:false};
 }catch(e){failure={at:new Date().toISOString(),name:e.name,code:e.code||null,message:e.message};process.exitCode=1;}
 finally{
  if(releaseHook)releaseHook();
  if(orm){try{if(second)await orm.connectionManager.releaseConnection(second);if(held)await orm.connectionManager.releaseConnection(held);await orm.close();}catch(e){event('DISPOSE_ERROR',{kind:'orm',message:e.message});process.exitCode=1;}}
  if(maintenance)try{await maintenance.end();}catch(e){event('DISPOSE_ERROR',{kind:'maintenance',message:e.message});process.exitCode=1;}
  if(observer)try{await observer.end();}catch(e){event('DISPOSE_ERROR',{kind:'observer',message:e.message});process.exitCode=1;}
  c.write('provenance-events.json',{events,sensorEvents:sensor.events,queries,windows});c.write('trace-result.json',{...(result||{status:'TRACE_STOP'}),failure,clientsCreated:clients.size,clientsEnded:[...clients].filter(x=>x._ended).length,allOwnedDisposed:[...clients].every(x=>x._ended),audit:{queryCount:queries.length,entityQueries:0,entityWrites:0,sqlAllowlist:true},integrity:c.integrity()});console.log(JSON.stringify({status:result?.status??'TRACE_STOP',failure,historical:result?.historical?.status,clientsCreated:clients.size,clientsEnded:[...clients].filter(x=>x._ended).length}));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
