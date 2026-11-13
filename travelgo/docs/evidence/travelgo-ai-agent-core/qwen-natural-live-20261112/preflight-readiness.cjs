// Complete read-only preflight after the sandbox denied CIM inspection. No POST/load/inference.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),cp=require('node:child_process');
const c=require('../../t-ai-04-g2-live-multi-turn-validation/common.cjs');
const result={at:new Date().toISOString(),status:'BLOCKED',nativePosts:0,inference:0,loads:0,retries:0,postgresConnections:0,metadataGets:0,
  priorInspection:'preflight.json',purpose:'Complete process/readiness inspection with OS read permission; no guard or inference retry'};
const write=(f,v)=>fs.writeFileSync(path.join(__dirname,f),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
function sockets(){
 const output=cp.execFileSync('netstat.exe',['-ano','-p','tcp'],{encoding:'utf8',timeout:5000});
 const rows=output.split(/\r?\n/).map(l=>l.trim().split(/\s+/)).filter(p=>p[0]==='TCP'&&(/:11434$/.test(p[1])||/:11434$/.test(p[2]))).map(p=>({local:p[1],remote:p[2],state:p[3],pid:Number(p[4])}));
 const listener=rows.find(p=>p.local==='127.0.0.1:11434'&&p.state==='LISTENING');assert(listener,'LOOPBACK_LISTENER_ABSENT');
 assert(!rows.some(p=>p.state==='LISTENING'&&!['127.0.0.1:11434','[::1]:11434'].includes(p.local)),'NON_LOOPBACK_LISTENER');
 const name=cp.execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${listener.pid} | Select-Object -ExpandProperty ProcessName`],{encoding:'utf8',timeout:10000}).trim();assert.equal(name,'ollama');
 const clients=rows.filter(p=>/:11434$/.test(p.remote)&&['ESTABLISHED','SYN_SENT'].includes(p.state));assert(clients.every(p=>p.pid===process.pid),'COMPETING_OR_UNKNOWN_MODEL_CLIENT_STOP');
 return {listener,clients,rows};
}
(async()=>{try{
 result.quota=c.rate();assert.equal(result.quota.futureDatedEntries.length,0);assert(result.quota.remainingConservativeSlots>=10,'INSUFFICIENT_QUOTA_STOP');result.local=c.noProxy();
 result.socketsBefore=sockets();
 const raw=cp.execFileSync('powershell.exe',['-NoProfile','-Command',"$ErrorActionPreference='Stop'; Get-CimInstance Win32_Process | Where-Object { $_.Name -like '*ollama*' } | Select-Object ProcessId,ParentProcessId,Name,ExecutablePath | ConvertTo-Json -Compress"],{encoding:'utf8',timeout:10000});
 result.processes=raw.trim()?JSON.parse(raw):[];result.resources=c.resources();
 for(const route of ['/api/version','/api/tags','/api/ps']){
  result.metadataGets++;const start=performance.now();
  const response=await fetch('http://127.0.0.1:11434'+route,{method:'GET',redirect:'error',signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);
  const raw=await response.text();assert(Buffer.byteLength(raw)<=65536);const body=JSON.parse(raw);
  const name=route.split('/').at(-1);result[name]={at:new Date().toISOString(),status:response.status,elapsedMs:performance.now()-start,body};
 }
 result.socketsAfter=sockets();
 const installed=result.tags.body.models?.find(m=>m.name===c.model&&m.model===c.model);assert(installed,'APPROVED_MODEL_NOT_INSTALLED');assert.equal(installed.digest,c.digest,'INSTALLED_DIGEST_MISMATCH');assert(!installed.remote_host&&!installed.remote_model);
 const resident=result.ps.body.models?.find(m=>m.name===c.model&&m.model===c.model);
 result.readiness={installed:true,digestMatches:true,resident:!!resident,context:resident?.context_length??null,expiresAt:resident?.expires_at??null};
 assert(resident,'MODEL_NOT_RESIDENT_STOP_NO_LOAD_APPROVAL');assert.equal(resident.digest,c.digest);assert(!resident.remote_host&&!resident.remote_model);
 assert.equal(resident.context_length,16384,'WRONG_RESIDENT_CONTEXT_STOP_NO_RELOAD');assert(!resident.expires_at||Date.parse(resident.expires_at)>Date.now(),'RESIDENCY_EXPIRED');
 assert.equal(result.ps.body.models.length,1,'OTHER_MODEL_RESIDENT_STOP');assert(result.resources.ram.freeMiB>0);
 result.status='PREFLIGHT_PASS';
 }catch(e){result.reason=String(e.message).slice(0,1200);result.code=e.code||e.name;}
 finally{result.completedAt=new Date().toISOString();write('preflight-readiness.json',result);console.log(JSON.stringify(result,null,2));}
})();
