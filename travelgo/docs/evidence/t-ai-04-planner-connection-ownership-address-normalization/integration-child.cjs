'use strict';
const c=require('./common.cjs'),assert=c.assert,{OwnershipRegistry}=require('./ownership-registry.cjs'),{managedClass}=require('./managed-connections.cjs'),{SensorClient}=require('./sensor-client.cjs'),{createFence}=require('./fail-fast.cjs'),{createMaintenanceCandidate}=require('./maintenance.candidate.cjs'),{bindRealGuards}=require('./real-guards.cjs'),{runPlannerHarness,PRE,POST}=require('./run-live.corrected.cjs');
const kind=process.argv[2],run=process.argv[3]||'02',events=[],fence=createFence(),clients=[],route={kind:'VERIFIED_DIRECT',host:'127.0.0.1',port:5432},registry=new OwnershipRegistry({write:e=>events.push(e),stop:(e,p)=>fence.fail(e,p),route,role:'postgres'}),Client=managedClass({RawClient:SensorClient,registry,factory:'maintenance',onCreated:x=>clients.push(x)});
const cfg={host:'127.0.0.1',port:5432,database:'travelgo_ai_m0_test',user:'postgres'};
(async()=>{let result,error,disposed=0;
 try{const client=new Client(cfg);await client.connect();let rows=[client.self()];if(kind==='unknown')rows.push({...client.self(),pid:99999,application_name:''});
 const fakeDb={sequelize:{addHook(){}},ENV:{DB_USER:'postgres'}};
 const m=createMaintenanceCandidate({db:fakeDb,registry,createClient:async()=>client,write:e=>events.push(e)});m.a=client;m.b=client;
 // SQL boundary remains Base.sql; sensor client supplies independent activity rows.
 const sql=m.sql.bind(m);m.sql=async(holder,text,values)=>{if(text.includes('FROM pg_stat_activity'))return{rows};return sql(holder,text,values);};
 const runtime={context(){},verify(){},stage(){},assertTemplate(){},assertSession(){},assertOwnership(){},assertToolBoundary(){},assertCap(){},assertQuotaTtl(){},assertFixtures:()=>kind==='via-b'?m.foreignConnectionsViaB():m.foreignConnections(),assertRuntime(){},assertResponse(){},assertRaw(){},assertHistory(){},assertExecuted(){}};
 const ports={...bindRealGuards(runtime),execute:async()=>({}),assertUi:async()=>true,cleanupPrecondition:async()=>({status:'NOT_APPLICABLE',reason:'NO_COMMITTED_TASK_FIXTURES',committed:false,ambiguous:false,createdRows:0,ledgerPresent:false}),cleanup:async()=>assert.fail('NO_FIXTURE_DELETE'),dispose:async()=>{await client.end();disposed++;}};
 result=await runPlannerHarness({cases:[{id:'R01'},{id:'R02'},{id:'R03'}],ports});
 }catch(e){error=e.message;}
 c.write('integration-'+run+'-'+kind+'.json',{kind,tier:'OFFLINE_BASE_MAINTENANCE_REALGUARDS_SENSOR_PROCESS',result,error:error||null,disposed,events,created:clients.length,ended:clients.filter(x=>x._ownershipDisposed).length});if(error||result?.status!==(kind==='unknown'?'FAIL':'PASS'))process.exitCode=2;else if(kind==='unknown')process.exitCode=1;
})().catch(e=>{console.error(e.stack);process.exitCode=2;});
