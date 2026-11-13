// GET/read-only only; no native POST allowed here.
const c=require('./common.cjs'),{execFileSync}=require('node:child_process');
const originalFetch=globalThis.fetch;
globalThis.fetch=(url,init={})=>{c.assert.equal(init.method||'GET','GET');c.assert.equal(new URL(String(url)).origin,c.env.OLLAMA_BASE_URL);return originalFetch(url,{...init,redirect:'error'});};
(async()=>{
const record={at:new Date().toISOString(),status:'BLOCKED',nativePosts:0,pendingProvider:0};let db;
try{
 c.assert.equal(c.json(c.prefix+'phase-a-gate.json').status,'PHASE_A_PASS');record.integrity=c.integrity();
 const plan=c.json(c.prefix+'manifest.json'),lock=c.json(c.prefix+'manifest-lock.json');c.assert.equal(c.sha(c.read(c.prefix+'manifest.json')),lock.sha256);
 c.assert.equal(c.sha(c.read(c.prefix+'run-live.cjs')),lock.harnessSha256);c.assert.equal(c.sha(c.read(c.prefix+'binding.cjs')),lock.bindingSha256);
 for(const[file,hash]of Object.entries(plan.sourceCompiled))c.assert.equal(c.sha(c.read(file)),hash,file);
 record.local=c.noProxy();record.rate=c.rate();c.assert.equal(record.rate.futureDatedEntries.length,0);c.assert.ok(record.rate.remainingConservativeSlots>=8,'INSUFFICIENT_CHAIN_QUOTA');
 record.resources=c.resources();record.ollama=await c.metadata();
 const lines=execFileSync('netstat.exe',['-ano','-p','tcp'],{encoding:'utf8',timeout:5000});
 const listener=lines.split(/\r?\n/).find(x=>/127\.0\.0\.1:11434\s+\S+\s+LISTENING/.test(x));c.assert.ok(listener,'EXACT_LOOPBACK_LISTENER_REQUIRED');
 const pid=Number(listener.trim().split(/\s+/).at(-1));const name=execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${pid} | Select-Object -ExpandProperty ProcessName`],{encoding:'utf8',timeout:10000}).trim();c.assert.equal(name,'ollama');record.listener={pid,process:name,endpoint:'127.0.0.1:11434'};
 c.assert.ok(record.resources.ram.freeMiB>0);if(record.ollama.resident)c.assert.ok(record.ollama.ready,'WRONG_RESIDENT_CONTEXT');else c.assert.ok(record.resources.gpus[0].freeMiB>5102307901/1048576,'INSUFFICIENT_GPU_HEADROOM');
 db=require('./readonly-db.cjs');const guard=await db.guard();c.write('db-preflight.json',guard);
 const oldGuard=c.json(c.previous+'db-preflight.json');c.assert.equal(guard.schemaSha256,oldGuard.schemaSha256,'SCHEMA_BASELINE_MISMATCH');
 const before=await db.fingerprint();c.write('fingerprint-before.json',before);
 const [roles]=await db.sequelize.query('SELECT rolsuper FROM pg_roles WHERE rolname=current_user');
 record.role={name:guard.identity.role,superuser:roles[0].rolsuper,leastPrivilege:false,enforcement:'Session READ ONLY verified each connection + SELECT/SHOW query guard; no grants changed'};
 const load=x=>require(c.path.join(c.root,'backend/dist',x)),{catalogPlannerTools}=load('agent/tools.js');
 const search=[];for(const id of ['E01','E07']){const item=plan.cases.find(x=>x.id===id),result=await catalogPlannerTools.execute(item.expected.raw);search.push({id,arguments:item.expected.raw.arguments,result});c.assert.deepEqual(result,item.expected.serviceResult,'CATALOG_OR_PRICE_DRIFT_'+id);}
 const {RecommendationRepository}=load('repositories/recommendationRepository.js');const catalog=await RecommendationRepository.getApprovedPlaces();
 const places=catalog.map(p=>({id:p.id,name:p.name,city:p.city,category:p.category,priceFrom:p.priceFrom,status:p.status,businessStatus:p.business?.status??null}));
 c.write('catalog-inventory.json',{at:new Date().toISOString(),count:places.length,places,source:'REAL_READONLY_POSTGRESQL'});
 const eligibleSightseeing=places.filter(p=>p.city==='Đà Nẵng'&&['attraction','tour'].includes(p.category));
 const data={at:new Date().toISOString(),search,exactOriginalExpectedMatch:true,planner:{status:eligibleSightseeing.length?'REQUIRES_SEPARATE_MANIFEST_REVIEW':'BLOCKED_DATA_READINESS',eligibleSightseeing:eligibleSightseeing.length},db:guard.identity,audit:db.audit,fixtures:0,writes:0};c.write('data-readiness.json',data);
 const [accounts]=await db.sequelize.query('SELECT id FROM users WHERE id=:id',{replacements:{id:c.principal}});record.authentication={principalHash:c.principalHash,existingDBAccount:accounts.length===1,mode:plan.authentication,notRealLogin:true};
 record.db={status:'PASS',identity:guard.identity,migrations:guard.migrations.length,schemaSha256:guard.schemaSha256,readOnly:true,tableCount:Object.keys(before.tables).length,tripSessions:before.tables.trip_sessions,audit:db.audit};
 record.dataReadinessSha256=c.sha(c.read(c.prefix+'data-readiness.json'));record.status='PASS_READONLY_AND_GET_ONLY';
}catch(error){record.reason=String(error.message).slice(0,1800);record.code=error.code??null;process.exitCode=1;}
finally{if(db)await db.sequelize.close();c.write('preflight-initial.json',record);console.log(JSON.stringify({status:record.status,reason:record.reason,remainingQuota:record.rate?.remainingConservativeSlots,resident:record.ollama?.resident,db:record.db?.status,nativePosts:0}));}
})().catch(e=>{console.error(e);process.exitCode=1;});
