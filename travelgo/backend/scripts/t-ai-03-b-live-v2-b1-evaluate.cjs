// B1-only LIVE evaluator. Exactly VI01-VI20 max; VI21-VI24 remain NOT RUN until rate window expires.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash,randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process'),os=require('node:os');
process.chdir(path.resolve(__dirname,'..'));
Object.assign(process.env,{NODE_ENV:'test',DB_HOST:'127.0.0.1',DB_NAME:'travelgo_ai_m0_test',DB_SSL:'false',ALLOW_TEST_DB_WRITES:'false'});
require('dotenv').config({quiet:true});
const root=path.resolve('..'),evidenceRoot=path.join(root,'docs/evidence/t-ai-03-b-live-v2-b1');
const bytes=fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json'));
const manifest=JSON.parse(bytes),lock=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const assertLock=()=>{assert.equal(sha(fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json'))),lock.sha256);
  assert.equal(lock.sha256,'0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');};
assertLock();assert.equal(manifest.approvalStatus,'APPROVED');
assert.deepEqual(manifest.cases.map(c=>c.id),Array.from({length:24},(_,i)=>`VI${String(i+1).padStart(2,'0')}`));
const {parseDecision,validateTool,catalogPlannerTools}=require('../dist/agent/tools.js');
const {createConfiguredProvider,localOllamaUrl}=require('../dist/agent/liveProvider.js');
for(const c of manifest.cases){const d=parseDecision(c.expected);if(d.kind==='tool')assert.deepEqual(validateTool(d).missing,[]);}
const groups={tool:manifest.cases.filter(c=>c.expected.kind==='tool').length,
  clarify:manifest.cases.filter(c=>c.expected.kind==='clarify').length,
  unsupported:manifest.cases.filter(c=>c.expected.kind==='unsupported').length,
  multiTurn:manifest.cases.filter(c=>Array.isArray(c.request.history)).length};
assert.deepEqual(groups,{tool:13,clarify:8,unsupported:3,multiTurn:5});
fs.mkdirSync(evidenceRoot,{recursive:true});
if(!process.argv.includes('--live')){
  const file=path.join(evidenceRoot,'dry-run.json');
  fs.writeFileSync(file,JSON.stringify({status:'PASS',mode:'NO_INFERENCE',manifestSha256:lock.sha256,
    groups,ratePlan:'default AgentLimits 20/user/hour, one principal, sequential; stop after VI20; VI21-VI24 need a later approved run after eligibleAfter',
    cases:manifest.cases.map(c=>({id:c.id,status:'NOT RUN'}))},null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({mode:'NO_INFERENCE',status:'PASS',casesNotRun:24,groups}));
  process.exit(0);
}
// No LIVE request is possible from this file without all explicit operator gates.
assert.equal(process.env.T_AI_03_B_V2_B1_APPROVED,'true','B1 LIVE scope approval absent');
assert.equal(process.env.LLM_PROVIDER,'ollama');
assert.equal(process.env.LLM_LIVE_ENABLED,'true');
assert.equal(process.env.LLM_USAGE_APPROVED,'true');
assert.equal(process.env.OLLAMA_LOCAL_ONLY_CONFIRMED,'true');
assert.equal(process.env.OLLAMA_MODEL,'qwen3:4b-instruct-2507-q4_K_M');
assert.equal(localOllamaUrl(process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434'),'http://127.0.0.1:11434');
assert.ok(!process.env.HTTP_PROXY&&!process.env.HTTPS_PROXY&&!process.env.ALL_PROXY&&process.env.NODE_USE_ENV_PROXY!=='1');
const run=path.join(evidenceRoot,'run-'+new Date().toISOString().replace(/[-:.]/g,'')+'-'+randomUUID().slice(0,8));
fs.mkdirSync(run,{recursive:false});
const write=(name,value)=>fs.writeFileSync(path.join(run,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const normalize=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim().replace(/\s+/g,' ');
function checkDecision(actual,expected){
  assert.equal(actual?.kind,expected.kind);
  if(expected.kind==='clarify')assert.deepEqual([...new Set(actual.fields)].sort(),[...expected.fields].sort());
  if(expected.kind==='tool'){
    assert.equal(actual.name,expected.name);
    for(const [key,value]of Object.entries(expected.arguments)){
      if(['departureCity','destinationCity'].includes(key))assert.equal(normalize(actual.arguments[key]),normalize(value),key);
      else assert.deepEqual(actual.arguments[key],value,key);
    }
    const defaults={children:0,pacing:'balanced',preferences:[],mandatoryPlaceIds:[]};
    for(const key of Object.keys(actual.arguments))if(!(key in expected.arguments)){
      assert.ok(Object.hasOwn(defaults,key),`Unexpected argument ${key}`);assert.deepEqual(actual.arguments[key],defaults[key]);
    }
  }
}
function fingerprint(mode,...args){
  const p=spawnSync(process.execPath,['dist/evaluation/t11_db_fingerprint.js',mode,...args],
    {cwd:path.join(root,'backend'),env:{...process.env,ALLOW_TEST_DB_WRITES:'false'},encoding:'utf8',timeout:120000,windowsHide:true});
  fs.writeFileSync(path.join(run,`fingerprint-${mode}-${args.length===2?'compare':path.basename(args[0])}.log`),(p.stdout||'')+(p.stderr||''),{flag:'wx'});
  assert.equal(p.status,0,`Fingerprint ${mode} failed`);
}
let sequelize,server,before=false,monitorPromise=null,decision=null,toolCalls=0,toolResult=null,inferencePosts=0;
let firstCallAt=null,principalId=null;
const results=[];
async function localTags(){const r=await fetch('http://127.0.0.1:11434/api/tags',{signal:AbortSignal.timeout(3000),redirect:'error'});
  assert.equal(r.status,200);return r.json();}
async function localPs(){const r=await fetch('http://127.0.0.1:11434/api/ps',{signal:AbortSignal.timeout(3000),redirect:'error'});
  assert.equal(r.status,200);return r.json();}
function gpuSnapshot(){const p=spawnSync('nvidia-smi',['--query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu','--format=csv,noheader,nounits'],
  {encoding:'utf8',timeout:3000,windowsHide:true});assert.equal(p.status,0,'NVIDIA GPU telemetry unavailable');
  const [name,driver,total,used,free,utilization]=p.stdout.trim().split(',').map(x=>x.trim());
  return {name,driver,totalMiB:Number(total),usedMiB:Number(used),freeMiB:Number(free),utilizationPercent:Number(utilization)};}
async function preflight(){
  assertLock();
  const tags=await localTags(),model=tags.models?.find(m=>m.name===process.env.OLLAMA_MODEL);
  assert.equal(model?.digest,'0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0');
  write('model.json',{tag:model.name,digest:model.digest,sizeBytes:model.size,endpoint:'127.0.0.1:11434'});
  const ps=await localPs(),loaded=ps.models?.find(m=>m.name===model.name),gpu=gpuSnapshot();
  const ram={totalMiB:Math.round(os.totalmem()/1048576),freeMiB:Math.round(os.freemem()/1048576)};
  assert.match(gpu.name,/NVIDIA.*RTX 4060/i);assert.ok(ram.freeMiB>=2048,'RAM headroom below 2 GiB');
  assert.ok(gpu.freeMiB>=(loaded?512:5200),'GPU headroom below local model requirement');
  if(loaded)assert.ok(loaded.size_vram/loaded.size>=0.9,'Ollama model not predominantly on GPU');
  write('hardware-before.json',{gpu,ram,modelLoaded:Boolean(loaded),modelGpuRatio:loaded?loaded.size_vram/loaded.size:null,
    residencyCheck:loaded?'PASS':'PENDING_FIRST_APPROVED_CASE',inferenceRequests:0});
  ({sequelize}=require('../dist/models/index.js'));
  const {ENV}=require('../dist/config/env.js');
  const {assertIsolatedTestDatabase,assertDatabaseSentinel}=require('../dist/utils/testDatabaseGuard.js');
  assert.equal(ENV.NODE_ENV,'test');assert.equal(ENV.DB_HOST,'127.0.0.1');assert.equal(ENV.DB_NAME,'travelgo_ai_m0_test');
  assertIsolatedTestDatabase('T-AI-03-B-LIVE-V2 read-only');
  sequelize.addHook('afterConnect',async c=>{await c.query('SET default_transaction_read_only = on');await c.query("SET statement_timeout = '15000ms'");});
  await assertDatabaseSentinel(sequelize,'T-AI-03-B-LIVE-V2 read-only');
  const [identity]=await sequelize.query("SELECT current_database() AS database, current_setting('default_transaction_read_only') AS read_only");
  assert.equal(identity[0].database,'travelgo_ai_m0_test');assert.equal(identity[0].read_only,'on');
  const migrations=[];
  for(const filename of fs.readdirSync('../database/migrations').filter(f=>f.endsWith('.sql')).sort()){
    const checksum=sha(fs.readFileSync(path.join(root,'database/migrations',filename)));
    const [rows]=await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename',{replacements:{filename}});
    assert.equal(rows[0]?.checksum,checksum);migrations.push({filename,checksum});
  }
  assert.equal(migrations.length,12);
  const [vi20]=await sequelize.query("SELECT count(*)::integer AS count FROM places WHERE lower(city)=lower('HUGO_NO_CATALOG_TAI01B') OR lower(province)=lower('HUGO_NO_CATALOG_TAI01B')");
  assert.equal(vi20[0].count,0);
  const [catalog]=await sequelize.query(`SELECT category, count(*)::integer AS count FROM places
    WHERE status='APPROVED' AND (lower(city)=lower('Đà Nẵng') OR lower(province)=lower('Đà Nẵng')) GROUP BY category ORDER BY category`);
  const [hoiAn]=await sequelize.query(`SELECT count(*)::integer AS count FROM places
    WHERE status='APPROVED' AND (lower(city)=lower('Hội An') OR lower(province)=lower('Hội An'))`);
  const [trips]=await sequelize.query('SELECT count(*)::integer AS count FROM trip_sessions');
  write('db-preflight.json',{...identity[0],sentinel:'PASS',migrations,vi20CatalogRows:0,
    catalog:{daNangByCategory:catalog,hoiAnApprovedPlaces:hoiAn[0].count},historicalTripSessions:trips[0].count,writes:0});
  fingerprint('snapshot',path.join(run,'before.json'));before=true;
  write('ledger.json',{writes:0,fixtureIds:[],cleanup:'NOT_REQUIRED_READ_ONLY',principal:'SYNTHETIC_JWT_NOT_BROWSER_LOGIN'});
}
function safeDecision(c,d){if(!d)return null;
  if(d.kind==='clarify')return {kind:d.kind,fields:d.fields};
  if(d.kind==='unsupported')return {kind:d.kind};
  const allowed=new Set(['departureCity','destinationCity','startDate','endDate','adults','children',
    'totalBudget','dailyBudgetPerPerson','transportation','pacing','category','preferences','mandatoryPlaceIds']);
  const args=Object.fromEntries(Object.entries(d.arguments).map(([key,value])=>{
    const encoded=JSON.stringify(value),safe=allowed.has(key)&&encoded.length<=500&&!/@|bearer|token|password|booking|api.?key/i.test(encoded);
    return [key,safe?value:'[REDACTED_UNEXPECTED_VALUE]'];
  }));
  return {kind:'tool',name:d.name,arguments:args};
}
function gpuFreeMiB(){return gpuSnapshot().freeMiB;}
async function main(){
  await preflight();
  const {AgentOrchestrator}=require('../dist/services/agentService.js');
  const {createAgentRouter}=require('../dist/routes/agentRoutes.js');
  const {signAccessToken}=require('../dist/services/tokenService.js');
  const express=require('express');
  const monitoredFetch=async(url,init)=>{
    assert.equal(url,'http://127.0.0.1:11434/api/chat');assert.equal(init.method,'POST');
    assert.ok(!Object.keys(init.headers||{}).some(k=>/authorization|api.key/i.test(k)));
    assert.ok(!String(init.body).includes('synthetic-v2-evaluation@example.test'));
    assert.ok(inferencePosts<20,'B1 maximum inference requests reached');
    inferencePosts++;const r=await fetch(url,init);
    monitorPromise=r.clone().json().then(v=>({promptTokens:v.prompt_eval_count??null,outputTokens:v.eval_count??null,
      totalDurationNs:v.total_duration??null,loadDurationNs:v.load_duration??null,doneReason:v.done_reason??null})).catch(()=>null);
    return r;
  };
  const provider=createConfiguredProvider(process.env,monitoredFetch);
  assert.equal(provider.configured,true);
  const service=new AgentOrchestrator({
    provider:{configured:true,external:false,generate:async(...args)=>{decision=await provider.generate(...args);return decision;}},
    tools:{execute:async d=>{toolCalls++;toolResult=await catalogPlannerTools.execute(d);return toolResult;}}
    // No AgentLimits override: real default 20/user/hour, concurrency 2.
  });
  const app=express();app.use(express.json());app.use('/api/agent',createAgentRouter(service));
  server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});
  principalId=randomUUID();
  const token=signAccessToken({id:principalId,email:'synthetic-v2-evaluation@example.test',fullName:'V2 Evaluation',roles:['CUSTOMER']});
  let stopReason=null;
  for(let i=0;i<20;i++){
    const c=manifest.cases[i];
    if(stopReason){results.push({id:c.id,status:'NOT RUN',reason:stopReason});continue;}
    assertLock();
    const free=gpuFreeMiB();
    if(free<512){stopReason='VRAM_HEADROOM_BELOW_512_MIB';
      results.push({id:c.id,status:'NOT RUN',reason:stopReason});continue;}
    decision=null;toolCalls=0;toolResult=null;monitorPromise=null;
    const postsBefore=inferencePosts,start=Date.now();let response,body;
    if(firstCallAt===null)firstCallAt=start;
    try{
      response=await fetch(`http://127.0.0.1:${server.address().port}/api/agent/chat`,{
        method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},
        body:JSON.stringify(c.request),redirect:'error'});
      body=await response.json();
    }catch(e){body={success:false,code:'EVALUATOR_HTTP_ERROR'};}
    const usage=monitorPromise?await monitorPromise:null;
    let assertion='PASS',reason=null,decisionCorrect=false,toolFidelity=null;
    try{checkDecision(decision,c.expected);decisionCorrect=true;}catch{}
    const toolSelection=decision?.kind===c.expected.kind&&
      (c.expected.kind!=='tool'||decision?.name===c.expected.name);
    if(c.expected.kind==='tool'){
      toolFidelity=toolCalls===1&&(
        body?.data?.status==='completed'&&JSON.stringify(body.data.result)===JSON.stringify(toolResult)&&
          ['TourPlannerService','RecommendationService'].includes(toolResult?.source)||
        body?.data?.status==='tool_unavailable'&&body.data.warningCode==='AGENT_CATALOG_INSUFFICIENT');
      if(c.toolOutcome==='tool_unavailable')toolFidelity=toolFidelity&&body?.data?.status==='tool_unavailable';
    }
    try{
      checkDecision(decision,c.expected);assert.equal(response?.status,200);assert.equal(body?.success,true);
      assert.equal(inferencePosts-postsBefore,1,'Not exactly one real provider request');
      if(c.expected.kind==='tool'){
        assert.equal(toolCalls,1);
        assert.equal(toolFidelity,true,'Tool output did not match real service or explicit catalog insufficiency');
      }else{assert.equal(toolCalls,0);assert.equal(body.data.result,undefined);
        if(c.expected.kind==='clarify')assert.deepEqual([...body.data.missingFields].sort(),[...c.expected.fields].sort());}
    }catch{assertion='FAIL';reason=decisionCorrect?'HTTP_OR_TOOL_ASSERTION_FAILED':'MODEL_DECISION_MISMATCH';}
    const record={id:c.id,tier:'LIVE_LLM',status:assertion,reason,
      requestSha256:sha(Buffer.from(JSON.stringify(c.request),'utf8')),expected:c.expected,
      httpStatus:response?.status??null,errorCode:body?.code??null,
      decision:safeDecision(c,decision),providerDecisionParsed:decision!==null,
      actualMissingFields:body?.data?.missingFields??null,toolCalls,
      toolStatus:body?.data?.status??null,toolResultType:toolResult?.type??null,toolSource:toolResult?.source??null,
      metrics:{schemaValid:decision!==null,toolSelection,argumentCorrectness:c.expected.kind==='tool'?decisionCorrect:null,
        missingFieldHandling:c.expected.kind==='clarify'?decisionCorrect&&toolCalls===0:null,
        multiTurnConsistency:c.request.history?decisionCorrect:null,
        unsupportedHandling:c.expected.kind==='unsupported'?decisionCorrect&&toolCalls===0:null,
        toolResultFidelity:toolFidelity},
      latencyMs:Date.now()-start,usage};
    results.push(record);write(`${c.id}.json`,record);
    if(i===0){
      const ps=await localPs(),loaded=ps.models?.find(m=>m.name===process.env.OLLAMA_MODEL);
      const ratio=loaded&&Number.isFinite(loaded.size_vram/loaded.size)?loaded.size_vram/loaded.size:null;
      write('hardware-after-first.json',{gpu:gpuSnapshot(),ram:{totalMiB:Math.round(os.totalmem()/1048576),
        freeMiB:Math.round(os.freemem()/1048576)},modelLoaded:Boolean(loaded),modelGpuRatio:ratio,
        result:ratio!==null&&ratio>=0.9?'PASS':'FAIL_GPU_RESIDENCY'});
      if(ratio===null||ratio<0.9)stopReason='STOP_MODEL_NOT_ON_GPU';
    }
    if(record.errorCode==='AGENT_TIMEOUT'||record.errorCode==='AGENT_PROVIDER_NETWORK'||record.errorCode==='AGENT_PROVIDER_UNAVAILABLE')
      stopReason=`STOP_AFTER_PROVIDER_FAILURE_${record.errorCode}`;
  }
  for(const c of manifest.cases.slice(20))results.push({id:c.id,status:'NOT RUN',reason:'B1_RATE_WINDOW_PENDING'});
  write('rate-window.json',{principalId,firstCallAt:firstCallAt?new Date(firstCallAt).toISOString():null,
    eligibleAfter:firstCallAt?new Date(firstCallAt+3600000+2000).toISOString():null,
    executedWithinWindow:results.slice(0,20).filter(r=>r.status!=='NOT RUN').length,
    instruction:'Do not run VI21-VI24 before eligibleAfter; do not use another principal or reset AgentLimits to bypass rate limit.'});
  const executed=results.filter(r=>r.status!=='NOT RUN');
  const accuracy=key=>{const rows=executed.filter(r=>r.metrics?.[key]!==null&&r.metrics?.[key]!==undefined);
    return {numerator:rows.filter(r=>r.metrics[key]===true).length,denominator:rows.length};};
  write('results.json',{tier:'LIVE_LLM',benchmarkSha256:lock.sha256,model:process.env.OLLAMA_MODEL,
    total:24,pass:results.filter(r=>r.status==='PASS').length,fail:results.filter(r=>r.status==='FAIL').length,
    notRun:results.filter(r=>r.status==='NOT RUN').length,inferencePosts,
    metrics:Object.fromEntries(['schemaValid','toolSelection','argumentCorrectness','missingFieldHandling','multiTurnConsistency',
      'unsupportedHandling','toolResultFidelity'].map(k=>[k,accuracy(k)])),
    cases:results,auth:'SYNTHETIC_JWT_NOT_REAL_LOGIN',browserExecutions:'NOT_RUN_IN_THIS_HARNESS'});
  if(results.some(r=>r.status!=='PASS'))process.exitCode=1;
}
main().catch(e=>{write('failure.json',{status:'FAIL',reason:String(e.code||e.message).slice(0,250),inferencePosts});process.exitCode=1;})
.finally(async()=>{
  if(server)await new Promise(r=>server.close(r));if(sequelize)await sequelize.close();
  if(before){try{fingerprint('snapshot',path.join(run,'after.json'));fingerprint('compare',path.join(run,'before.json'),path.join(run,'after.json'));}
    catch{process.exitCode=1;}}
  console.log(JSON.stringify({run:path.relative(root,run).replaceAll('\\','/'),inferencePosts,exitCode:process.exitCode||0}));
});
