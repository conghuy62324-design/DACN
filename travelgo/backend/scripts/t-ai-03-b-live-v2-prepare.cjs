// Phase A only: lock/provider/DB preflight, no inference and no DB writes.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{spawnSync}=require('node:child_process');
process.chdir(path.resolve(__dirname,'..'));
Object.assign(process.env,{NODE_ENV:'test',DB_HOST:'127.0.0.1',DB_NAME:'travelgo_ai_m0_test',DB_SSL:'false',ALLOW_TEST_DB_WRITES:'false'});
require('dotenv').config({quiet:true});
const root=path.resolve('..'),out=path.join(root,'docs/evidence/t-ai-03-b-live-v2/phase-a');
fs.mkdirSync(out,{recursive:true});
const write=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json'));
const manifest=JSON.parse(manifestBytes);
const lock=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')));
assert.equal(sha(manifestBytes),lock.sha256);
assert.equal(lock.sha256,'0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(manifest.approvalStatus,'APPROVED');
assert.deepEqual(manifest.cases.map(c=>c.id),Array.from({length:24},(_,i)=>`VI${String(i+1).padStart(2,'0')}`));
assert.equal(new Set(manifest.cases.map(c=>c.request.message.normalize('NFC'))).size,24);
write('benchmark.json',{status:'PASS',sha256:lock.sha256,cases:24,
  classification:'RECONSTRUCTED_V2_NOT_VERBATIM_V1',mockFaultCasesExcluded:['F01','F02','F03','F04']});
const {createConfiguredProvider,localOllamaUrl}=require('../dist/agent/liveProvider.js');
const {AgentLimits}=require('../dist/agent/limits.js');
const provider=createConfiguredProvider();
const config={provider:process.env.LLM_PROVIDER||null,modelConfigured:Boolean(process.env.OLLAMA_MODEL),
  liveEnabled:process.env.LLM_LIVE_ENABLED==='true',usageApproved:process.env.LLM_USAGE_APPROVED==='true',
  localOnlyConfirmed:process.env.OLLAMA_LOCAL_ONLY_CONFIRMED==='true',
  v2LiveApproved:process.env.T_AI_03_B_V2_LIVE_APPROVED==='true',
  providerConfigured:provider.configured,loopbackUrlValid:(()=>{try{localOllamaUrl(process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434');return true;}catch{return false;}})(),
  proxyPresent:Boolean(process.env.HTTP_PROXY||process.env.HTTPS_PROXY||process.env.ALL_PROXY),
  nodeUseEnvProxy:process.env.NODE_USE_ENV_PROXY==='1'};
write('configuration.json',config);
async function tags(){return new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port:11434,path:'/api/tags',timeout:3000},res=>{
    if(res.statusCode!==200){res.resume();reject(Error(`HTTP_${res.statusCode}`));return;}
    let body='';res.setEncoding('utf8');res.on('data',c=>{body+=c;if(body.length>1000000)req.destroy(Error('TOO_LARGE'));});
    res.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});
  });req.on('timeout',()=>req.destroy(Error('TIMEOUT')));req.on('error',reject);
});}
async function rateLimitOffline(){
  const limit=new AgentLimits();for(let i=0;i<20;i++)limit.consume('synthetic-rate-check');
  let rateCode=null;try{limit.consume('synthetic-rate-check');}catch(e){rateCode=e.code;}
  assert.equal(rateCode,'AGENT_RATE_LIMITED');
  let release1,release2;
  const hold1=new Promise(r=>{release1=r}),hold2=new Promise(r=>{release2=r});
  const first=limit.providerCall(()=>hold1),second=limit.providerCall(()=>hold2);
  let concurrencyCode=null;try{await limit.providerCall(async()=>null);}catch(e){concurrencyCode=e.code;}
  release1();release2();await Promise.all([first,second]);
  assert.equal(concurrencyCode,'AGENT_BUSY');
  write('limits-offline.json',{status:'PASS',perUserPerHour:20,concurrency:2,
    twentyFirstRequestCode:rateCode,thirdConcurrentCallCode:concurrencyCode,
    liveSchedule:'ONE_SYNTHETIC_PRINCIPAL; cases 1-20 sequential, wait until first-call window expires, then cases 21-24; no retries or limit override'});
}
function fingerprint(mode,...args){
  const p=spawnSync(process.execPath,['dist/evaluation/t11_db_fingerprint.js',mode,...args],
    {cwd:path.join(root,'backend'),env:{...process.env,ALLOW_TEST_DB_WRITES:'false'},encoding:'utf8',timeout:120000,windowsHide:true});
  fs.writeFileSync(path.join(out,`fingerprint-${mode}-${args.length===2?'compare':path.basename(args[0])}.log`),(p.stdout||'')+(p.stderr||''),{flag:'wx'});
  assert.equal(p.status,0,`Fingerprint ${mode} failed`);
}
let sequelize=null,before=false;
async function dbReadOnly(){
  ({sequelize}=require('../dist/models/index.js'));
  const {ENV}=require('../dist/config/env.js');
  const {assertIsolatedTestDatabase,assertDatabaseSentinel}=require('../dist/utils/testDatabaseGuard.js');
  assert.equal(ENV.NODE_ENV,'test');assert.equal(ENV.DB_HOST,'127.0.0.1');assert.equal(ENV.DB_NAME,'travelgo_ai_m0_test');
  assertIsolatedTestDatabase('T-AI-03-B-LIVE-V2 Phase A read-only');
  sequelize.addHook('afterConnect',async c=>{await c.query('SET default_transaction_read_only = on');await c.query("SET statement_timeout = '15000ms'");});
  await assertDatabaseSentinel(sequelize,'T-AI-03-B-LIVE-V2 Phase A read-only');
  const [identity]=await sequelize.query("SELECT current_database() AS database, current_setting('default_transaction_read_only') AS read_only");
  assert.equal(identity[0].database,'travelgo_ai_m0_test');assert.equal(identity[0].read_only,'on');
  const migrations=[];
  for(const filename of fs.readdirSync('../database/migrations').filter(f=>f.endsWith('.sql')).sort()){
    const checksum=sha(fs.readFileSync(path.join(root,'database/migrations',filename)));
    const [rows]=await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename',{replacements:{filename}});
    assert.equal(rows[0]?.checksum,checksum,filename);migrations.push({filename,checksum});
  }
  assert.equal(migrations.length,12);
  const [catalog]=await sequelize.query(`SELECT category, count(*)::integer AS count FROM places
    WHERE status='APPROVED' AND (lower(city)=lower('Đà Nẵng') OR lower(province)=lower('Đà Nẵng'))
    GROUP BY category ORDER BY category`);
  const [hoiAn]=await sequelize.query(`SELECT count(*)::integer AS count FROM places
    WHERE status='APPROVED' AND (lower(city)=lower('Hội An') OR lower(province)=lower('Hội An'))`);
  const [sentinel]=await sequelize.query(`SELECT count(*)::integer AS count FROM places
    WHERE lower(city)=lower('HUGO_NO_CATALOG_TAI01B') OR lower(province)=lower('HUGO_NO_CATALOG_TAI01B')`);
  assert.equal(sentinel[0].count,0,'VI20 sentinel unexpectedly present in catalog');
  const [trips]=await sequelize.query('SELECT count(*)::integer AS count FROM trip_sessions');
  write('db-preflight.json',{status:'PASS',...identity[0],sentinel:'PASS',migrations,
    catalog:{daNangByCategory:catalog,hoiAnApprovedPlaces:hoiAn[0].count,vi20SentinelPlaces:sentinel[0].count},
    historicalTripSessions:trips[0].count,writes:0});
  fingerprint('snapshot',path.join(out,'before.json'));before=true;
  write('ledger.json',{owner:'T-AI-03-B-LIVE-V2-PHASE-A',writes:0,fixtureIds:[],cleanup:'NOT_REQUIRED_READ_ONLY',residual:0});
}
async function main(){
  await rateLimitOffline();
  const j=await tags(),m=j.models?.find(x=>x.name==='qwen3:4b-instruct-2507-q4_K_M');
  assert.equal(m?.digest,'0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0');
  assert.equal(config.loopbackUrlValid,true);assert.equal(config.proxyPresent,false);assert.equal(config.nodeUseEnvProxy,false);
  write('ollama.json',{status:'PASS',endpoint:'127.0.0.1:11434',transport:'DIRECT_HTTP_NO_PROXY',
    tag:m.name,digest:m.digest,sizeBytes:m.size,globalAgentLiveEnabled:config.liveEnabled});
  try{await dbReadOnly();}
  finally{
    if(sequelize)await sequelize.close();
    if(before){fingerprint('snapshot',path.join(out,'after.json'));fingerprint('compare',path.join(out,'before.json'),path.join(out,'after.json'));}
  }
  const reason='Explicit approval for 24-case LIVE scope is not present in this task; Phase A only.';
  write('nlu-results.json',{status:'NOT RUN',tier:'LIVE_LLM',benchmarkSha256:lock.sha256,
    pass:0,fail:0,notRun:24,reason,metrics:'NOT RUN',browserExecutions:'NOT RUN',
    cases:manifest.cases.map(c=>({id:c.id,tier:'LIVE_LLM',status:'NOT RUN',reason}))});
  console.log(JSON.stringify({status:'READY_FOR_LIVE_APPROVAL',benchmarkSha256:lock.sha256,
    providerLocal:true,dbReadOnly:true,notRun:24,evidence:path.relative(root,out).replaceAll('\\','/')}));
}
main().catch(e=>{write('failure.json',{status:'BLOCKED',reason:String(e.code||e.message).slice(0,250)});
  console.error('Phase A preflight BLOCKED; see evidence.');process.exitCode=1;});
