'use strict';
const c=require('./common.cjs'),assert=c.assert,{OwnershipRegistry}=require('./ownership-registry.cjs'),{managedClass,ACTIVITY}=require('./managed-connections.cjs'),{makeClosingGuard}=require('./closing-guard.cjs'),{verifyForwarding}=require('./route-policy.cjs'),{createFence}=require('./fail-fast.cjs');
assert.equal(process.env.OWNERSHIP_MODE,'ONE_READONLY_TRACE');
const gate=c.json(c.prefix+'phase-a-gate.json');assert.equal(gate.status,'PASS');assert.equal(gate.originalPassed,51);assert.ok(gate.newPassed>0);assert.equal(gate.passed,gate.originalPassed+gate.newPassed);for(const[f,h]of Object.entries(gate.sourceHashes))assert.equal(c.sha(c.fs.readFileSync(c.path.join(__dirname,f))),h,f);c.integrity();
c.write('trace-attempt.json',{at:new Date().toISOString(),singleUse:true,maxConnections:1,retry:0,entityWritesAllowed:0});
const fence=createFence();fence.start('READONLY_TRACE');let n=0,client,registry,firstFailure=null,created=0,disposed=0,route,phase='route-proof',result;
function writeEvent(event){const payload=JSON.stringify(event);c.write('trace-events/'+String(++n).padStart(3,'0')+'-'+event.type+'.json',{at:new Date().toISOString(),payloadSha256:c.sha(payload),payload:event});}
c.fs.mkdirSync(c.path.join(__dirname,'trace-events'));
(async()=>{try{
 const rawRoute=c.json(c.prefix+'route-before-trace.json');assert.equal(rawRoute.containerId,c.json(c.prior+'route-before-trace.json').containerId,'EXACT_CONTAINER_ID_MISMATCH');route=verifyForwarding(rawRoute,{maxAgeMs:120000});c.write('route-verified.json',{at:new Date().toISOString(),route,independentObservationSha256:c.sha(c.read(c.prefix+'route-before-trace.json'))});
 const pg=require(c.path.join(c.root,'backend/node_modules/pg')),parsed=require(c.path.join(c.root,'backend/node_modules/dotenv')).parse(c.read('backend/.env'));
 assert.equal(parsed.DB_USER||'postgres',c.json(c.prior+'trace-events/003-RAW_SELF_IDENTITY.json').payload.row.role,'APPROVED_ROLE_MISMATCH');registry=new OwnershipRegistry({role:parsed.DB_USER||'postgres',route,write:writeEvent,stop:(e,p)=>fence.fail(e,p)});
 const Client=managedClass({RawClient:pg.Client,registry,factory:'controlled-trace',onCreated:()=>created++,onDisposed:()=>disposed++});
 phase='physical-connect-self-registration';client=new Client({host:'127.0.0.1',port:5432,database:'travelgo_ai_m0_test',user:parsed.DB_USER||'postgres',password:parsed.DB_PASSWORD||'postgres',ssl:false,connectionTimeoutMillis:10000});await client.connect();
 phase='closing-ownership';const closing=makeClosingGuard({registry,write:writeEvent,readActivity:async sql=>(await client.query(sql)).rows});await closing('CONTROLLED_READONLY_CLOSING');
 result={at:new Date().toISOString(),status:'PASS',phase,identity:registry.view(client),route,scope:'ONE_RAW_PHYSICAL_CONNECTION_SELF_METADATA_AND_ACTIVITY_ONLY_NOT_PLANNER_OR_LIVE_POOL',historicalPid9686:'UNKNOWN_NOT_RETROACTIVELY_ATTRIBUTED'};
 }catch(error){firstFailure={at:new Date().toISOString(),phase,name:error.name,message:error.message};fence.fail(error,phase);result={at:new Date().toISOString(),status:'FAIL_CLOSED',failure:firstFailure,route:route||null};}
 finally{
  fence.close();if(client&&!client._ownershipDisposed)try{await client.end();}catch(error){fence.fail(error,'dispose');firstFailure??={phase:'dispose',name:error.name,message:error.message};}
  if(firstFailure||created!==disposed||fence.state.stopped){result.status='FAIL_CLOSED';result.failure??=firstFailure;process.exitCode=1;}
  c.write('trace-result.json',{...result,created,disposed,reconnect:0,retry:0,entityQueries:0,entityWrites:0,fixtures:0,planner:0,ollamaGet:0,ollamaPost:0,liveBrowser:0,fence:fence.state,network:require('./network-boundary.cjs').audit});console.log(JSON.stringify({status:result.status,failure:result.failure||null,created,disposed}));
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
