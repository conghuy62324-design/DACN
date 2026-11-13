// Read-only preflight. This entrypoint cannot send a native POST, load a model or access PostgreSQL.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const c=require('../../t-ai-04-g2-live-multi-turn-validation/common.cjs'),root=c.root;
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const read=f=>fs.readFileSync(path.join(root,f));
const write=(f,v)=>fs.writeFileSync(path.join(__dirname,f),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const report='docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md';
const result={at:new Date().toISOString(),status:'BLOCKED',nativePosts:0,inference:0,loads:0,retries:0,postgresConnections:0,metadataGets:0,
  approval:{maxInference:3,localQwenOnly:true,isolatedProcessOnly:true,noPostgresMutation:true,noRetry:true,loadApproved:false},
  requiredConservativeSlots:10};
function processes(){
 const output=cp.execFileSync('powershell.exe',['-NoProfile','-Command',"Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*ollama*' } | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath | ConvertTo-Json -Compress"],{encoding:'utf8',timeout:10000});
 return output.trim()?JSON.parse(output):[];
}
function sockets(){
 const output=cp.execFileSync('netstat.exe',['-ano','-p','tcp'],{encoding:'utf8',timeout:5000});
 const rows=output.split(/\r?\n/).map(l=>l.trim().split(/\s+/)).filter(p=>p[0]==='TCP'&&(/:11434$/.test(p[1])||/:11434$/.test(p[2]))).map(p=>({local:p[1],remote:p[2],state:p[3],pid:Number(p[4])}));
 const listener=rows.find(p=>p.local==='127.0.0.1:11434'&&p.state==='LISTENING');
 assert(listener,'EXACT_LOOPBACK_OLLAMA_LISTENER_ABSENT');
 assert(!rows.some(p=>p.state==='LISTENING'&&!['127.0.0.1:11434','[::1]:11434'].includes(p.local)),'NON_LOOPBACK_LISTENER');
 const name=cp.execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${listener.pid} | Select-Object -ExpandProperty ProcessName`],{encoding:'utf8',timeout:10000}).trim();
 assert.equal(name,'ollama');
 const clients=rows.filter(p=>/:11434$/.test(p.remote)&&['ESTABLISHED','SYN_SENT'].includes(p.state));
 assert(clients.every(p=>p.pid===process.pid),'UNKNOWN_OR_COMPETING_OLLAMA_CLIENT_STOP');
 return {listener,clients,rows};
}
(async()=>{try{
 const hashes={};
 for(const dir of ['backend/src','backend/scripts','frontend/src','frontend/tests','frontend/e2e','database','docker','docs'])for(const rel of fs.readdirSync(path.join(root,dir),{recursive:true})){
   const f=(dir+'/'+rel).replaceAll('\\','/');
   if(f.startsWith('docs/evidence/travelgo-ai-agent-core/qwen-natural-live-20261112/')||!fs.statSync(path.join(root,f)).isFile())continue;
   hashes[f]=sha(read(f));
 }
 for(const f of ['backend/.env','backend/package.json','backend/package-lock.json','frontend/package.json','frontend/package-lock.json'])if(fs.existsSync(path.join(root,f)))hashes[f]=sha(read(f));
 write('baseline.json',{at:new Date().toISOString(),hashes});
 fs.writeFileSync(path.join(__dirname,'master-report-before.md'),read(report),{flag:'wx'});
 const seals=[];
 for(const dir of ['docs/evidence/travelgo-ai-agent-core/','docs/evidence/travelgo-ai-agent-core/closure-20261111/','docs/evidence/travelgo-ai-agent-core/natural-chat-20261112/']){
   const seal=JSON.parse(read(dir+'artifact-checksums.json'));
   for(const[f,h]of Object.entries(seal.hashes))assert.equal(sha(read(dir+f)),h,dir+f);
   if(dir.includes('natural-chat')){
     assert.equal(sha(read(report)),seal.reportSha256);
     for(const[f,h]of Object.entries(seal.sourceHashes))assert.equal(sha(read(f)),h,f);
   }
   seals.push({directory:dir,artifacts:Object.keys(seal.hashes).length,status:'UNCHANGED'});
 }
 result.integrity=seals;
 result.quota=c.rate();assert.equal(result.quota.futureDatedEntries.length,0,'FUTURE_LEDGER_STOP');
 assert(result.quota.remainingConservativeSlots>=result.requiredConservativeSlots,'INSUFFICIENT_QUOTA_STOP');
 result.local=c.noProxy();
 const dotenv=require(path.join(root,'backend/node_modules/dotenv'));
 const env={...dotenv.parse(read('backend/.env')),...process.env};
 const {configuredCoreProvider,CORE_MODEL,CORE_DIGEST,CORE_MODEL_OPTIONS}=require(path.join(root,'backend/dist/agent/coreProvider.js'));
 result.configuration={websiteConfigured:configuredCoreProvider(env).configured,
  flags:Object.fromEntries(['AGENT_CORE_LLM_ENABLED','LLM_LIVE_ENABLED','LLM_USAGE_APPROVED','OLLAMA_LOCAL_ONLY_CONFIRMED'].map(k=>[k,env[k]==='true'])),
  model:CORE_MODEL,digest:CORE_DIGEST,options:CORE_MODEL_OPTIONS,isolatedOverrideNotYetEnabled:true};
 assert.equal(CORE_MODEL,c.model);assert.equal(CORE_DIGEST,c.digest);
 result.socketsBefore=sockets();result.processes=processes();result.resources=c.resources();
 const get=async route=>{
   assert(['/api/version','/api/tags','/api/ps'].includes(route));
   const start=performance.now();result.metadataGets++;
   const response=await fetch('http://127.0.0.1:11434'+route,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});
   assert.equal(response.status,200);
   const text=await response.text();assert(Buffer.byteLength(text)<=65536);
   const record={at:new Date().toISOString(),route,status:response.status,elapsedMs:performance.now()-start,body:JSON.parse(text)};
   write('metadata-'+route.split('/').at(-1)+'.json',record);return record.body;
 };
 const version=await get('/api/version'),tags=await get('/api/tags'),ps=await get('/api/ps');
 assert(typeof version.version==='string'&&version.version);
 const installed=tags.models?.find(m=>m.name===CORE_MODEL&&m.model===CORE_MODEL);
 assert(installed,'APPROVED_MODEL_NOT_INSTALLED');assert.equal(installed.digest,CORE_DIGEST,'INSTALLED_DIGEST_MISMATCH');
 assert(!installed.remote_host&&!installed.remote_model,'REMOTE_MODEL_FORBIDDEN');
 const resident=ps.models?.find(m=>m.name===CORE_MODEL&&m.model===CORE_MODEL);
 result.readiness={installed:true,digestMatches:true,resident:!!resident,context:resident?.context_length??null,expiresAt:resident?.expires_at??null};
 result.socketsAfter=sockets();
 assert(resident,'MODEL_NOT_RESIDENT_STOP_NO_LOAD_APPROVAL');
 assert.equal(resident.digest,CORE_DIGEST,'RESIDENT_DIGEST_MISMATCH');
 assert(!resident.remote_host&&!resident.remote_model,'REMOTE_RESIDENT_FORBIDDEN');
 assert.equal(resident.context_length,16384,'CONTEXT_MISMATCH_STOP_NO_RELOAD');
 assert(!resident.expires_at||Date.parse(resident.expires_at)>Date.now(),'MODEL_RESIDENCY_EXPIRED');
 assert.equal(ps.models.length,1,'OTHER_MODEL_RESIDENT_STOP');
 assert(result.resources.ram.freeMiB>0);
 result.status='PREFLIGHT_PASS';
 }catch(e){result.reason=String(e.message).slice(0,800);result.code=e.code||e.name;}
 finally{result.completedAt=new Date().toISOString();write('preflight.json',result);console.log(JSON.stringify(result,null,2));}
})();
