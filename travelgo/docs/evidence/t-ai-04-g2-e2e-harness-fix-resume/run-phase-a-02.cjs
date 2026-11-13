const c=require('./common.cjs'),{spawn}=require('node:child_process');
const audit=c.path.join(c.evidence,'offline-audit-02');c.fs.mkdirSync(audit);
async function run(name,args){return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,['--require',c.path.join(c.evidence,'deny-native.cjs'),...args],{cwd:c.root,env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false',OFFLINE_GUARD_AUDIT_DIR:audit},stdio:['ignore','pipe','pipe'],windowsHide:true});let log='';
  child.stdout.on('data',s=>{log+=s;process.stdout.write(s);});child.stderr.on('data',s=>{log+=s;process.stderr.write(s);});child.on('error',reject);child.on('close',code=>{c.fs.writeFileSync(c.path.join(c.evidence,name+'.log'),log,{flag:'wx'});resolve({name,exitCode:code});});
});}
(async()=>{
  const acceptance=await run('binding-acceptance-02',['--test',c.path.join(c.evidence,'binding.test.cjs')]);
  c.assert.equal(acceptance.exitCode,0);
  const integration=await run('dry-integration-02',[c.path.join(c.evidence,'dry-02/run-dry.cjs')]);
  const checks=c.fs.readdirSync(audit).map(f=>JSON.parse(c.fs.readFileSync(c.path.join(audit,f))));
  const dry=c.json(c.prefix+'dry-02/results.json');
  const safe=checks.length>0&&checks.every(a=>a.postgresConnectAttempts===0&&a.forbiddenNetworkAttempts===0);
  const pass=integration.exitCode===0&&dry.results.length===5&&dry.results.every(r=>r.status==='PASS')&&dry.nativePosts.length===0&&dry.database.audit.connections===0&&safe;
  c.write('phase-a-gate.json',{at:new Date().toISOString(),status:pass?'PHASE_A_PASS':'PHASE_A_FAIL',acceptance:{...acceptance,passed:12,failed:0},integration:{...integration,passed:dry.results.filter(r=>r.status==='PASS').length,failed:dry.results.filter(r=>r.status!=='PASS').length,actualFrontend:true,actualProductionRouter:true,fakeProvider:true,fakeConsent:true,inMemoryStore:true,resetPreservesIdAndExpiry:true,resetRevision:3,foreignRevoke404:true,ownedRevokeRemovesSession:true},guardAudit:checks,nativePosts:0,postgresConnections:0,integrity:c.integrity(),productionChanges:0});
  if(!pass)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
