// T-AI-04-C: locked A/B diagnostic, eight local Ollama POSTs maximum, no tools/DB.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash,randomUUID}=require('node:crypto'),{spawnSync}=require('node:child_process'),os=require('node:os');
process.chdir(path.resolve(__dirname,'..'));
const root=path.resolve('..'),evidenceRoot=path.join(root,'docs/evidence/t-ai-04-c-decoder-investigation');
const manifestPath=path.join(evidenceRoot,'diagnostic-manifest.json');
const bytes=fs.readFileSync(manifestPath),manifest=JSON.parse(bytes);
const lock=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'diagnostic-manifest-lock.json')));
const sha=b=>createHash('sha256').update(b).digest('hex');
const {AGENT_TOOLS,parseDecision,validateTool,FIELD_LABELS}=require('../dist/agent/tools.js');
const {DECISION_SCHEMA}=require('../dist/agent/decisionSchema.js');
const {readConversation}=require('../dist/agent/conversation.js');
const {createConfiguredProvider,LIVE_LIMITS}=require('../dist/agent/liveProvider.js');
const {AgentLimits}=require('../dist/agent/limits.js');
const expectedSource=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-04-a-fix/source-integrity.json')));
assert.equal(process.argv.includes('--live'),true,'--live absent');
assert.equal(process.env.T_AI_04_C_DECODER_APPROVED,'true','T-AI-04-C approval absent');
assert.equal(process.env.LLM_PROVIDER,'ollama');
assert.equal(process.env.OLLAMA_MODEL,'qwen3:4b-instruct-2507-q4_K_M');
assert.equal(process.env.OLLAMA_BASE_URL,'http://127.0.0.1:11434');
assert.ok(!process.env.HTTP_PROXY&&!process.env.HTTPS_PROXY&&!process.env.ALL_PROXY&&process.env.NODE_USE_ENV_PROXY!=='1');
assert.equal(LIVE_LIMITS.timeoutMs,15000);assert.equal(LIVE_LIMITS.outputTokens,2048);
assert.equal(LIVE_LIMITS.inputTokens+LIVE_LIMITS.outputTokens+2048,16384);
const run=path.join(evidenceRoot,'run-'+new Date().toISOString().replace(/[-:.]/g,'')+'-'+randomUUID().slice(0,8));
fs.mkdirSync(run,{recursive:false});
const write=(name,value)=>fs.writeFileSync(path.join(run,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
let posts=0,stopReason=null,principalId=null,modelDigest=null;
const results=[];
const limits=new AgentLimits(); // Production defaults; prior-run ledger is also checked below.
function assertLock(){
  assert.equal(sha(fs.readFileSync(manifestPath)),lock.sha256);
  assert.equal(lock.sha256,'02ea0370e3c4a6304ddfc48349308bc2c18b3e6fca07bc8671d56478e08a00e6');
  assert.equal(lock.approvedMaxInference,8);
  assert.deepEqual(lock.variantOrder,['D01-A','D01-B','D02-A','D02-B','D03-A','D03-B','D04-A','D04-B']);
  const v2='docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json';
  const v2lock='docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json';
  assert.equal(sha(fs.readFileSync(path.join(root,v2))),expectedSource.manifestSha256);
  assert.equal(sha(fs.readFileSync(path.join(root,v2lock))),expectedSource.lockSha256);
}
function sourceIntegrity(){
  const ref=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-live-v2-b1/integrity-after.json'))).hashes;
  const changed=[];
  for(const [rel,hash]of Object.entries(ref)){
    const file=path.join(root,rel),expected=expectedSource.selected[rel]?.after||hash;
    if(!fs.existsSync(file)||sha(fs.readFileSync(file))!==expected)changed.push(rel);
  }
  return {referenceFiles:Object.keys(ref).length,changed,status:changed.length?'FAIL':'PASS',
    agentServiceSha256:expectedSource.selected['backend/src/services/agentService.ts'].after,
    liveProviderSha256:expectedSource.selected['backend/src/agent/liveProvider.ts'].after,
    decisionSchemaSha256:expectedSource.selected['backend/src/agent/decisionSchema.ts'].after};
}
function gpu(){
  const p=spawnSync('nvidia-smi',['--query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu',
    '--format=csv,noheader,nounits'],{encoding:'utf8',timeout:3000,windowsHide:true});
  assert.equal(p.status,0,'GPU telemetry unavailable');
  const [name,driver,total,used,free,utilization]=p.stdout.trim().split(',').map(x=>x.trim());
  return {name,driver,totalMiB:Number(total),usedMiB:Number(used),freeMiB:Number(free),utilizationPercent:Number(utilization)};
}
const ram=()=>({totalMiB:Math.round(os.totalmem()/1048576),freeMiB:Math.round(os.freemem()/1048576)});
async function getLocal(endpoint){
  const r=await fetch(`http://127.0.0.1:11434${endpoint}`,{signal:AbortSignal.timeout(3000),redirect:'error'});
  assert.equal(r.status,200,`Ollama ${endpoint} unavailable`);return r.json();
}
function validateSchema(s,v){
  if(s.anyOf)return s.anyOf.filter(b=>validateSchema(b,v)).length===1;
  if(s.enum&&!s.enum.some(x=>JSON.stringify(x)===JSON.stringify(v)))return false;
  if(s.type==='object'){
    if(!v||typeof v!=='object'||Array.isArray(v))return false;
    if((s.required||[]).some(k=>!Object.hasOwn(v,k)))return false;
    if(s.additionalProperties===false&&Object.keys(v).some(k=>!Object.hasOwn(s.properties||{},k)))return false;
    return Object.entries(v).every(([k,x])=>!s.properties?.[k]||validateSchema(s.properties[k],x));
  }
  if(s.type==='array')return Array.isArray(v)&&v.length>=(s.minItems??0)&&v.length<=(s.maxItems??Infinity)&&
    v.every(x=>validateSchema(s.items,x));
  if(s.type==='string'){
    if(typeof v!=='string'||v.length<(s.minLength??0)||v.length>(s.maxLength??Infinity))return false;
    if(s.format==='date')return /^\d{4}-\d{2}-\d{2}$/.test(v)&&new Date(`${v}T00:00:00.000Z`).toISOString().slice(0,10)===v;
    if(s.format==='uuid')return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
    return true;
  }
  if(s.type==='integer')return Number.isSafeInteger(v)&&v>=(s.minimum??-Infinity)&&v<=(s.maximum??Infinity);
  if(s.type==='number')return typeof v==='number'&&Number.isFinite(v)&&v>=(s.minimum??-Infinity)&&
    v>(s.exclusiveMinimum??-Infinity)&&v<=(s.maximum??Infinity);
  return true;
}
const normalize=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim().replace(/\s+/g,' ');
function semantic(actual,expected){
  if(actual?.kind!==expected.kind)return false;
  if(expected.kind==='clarify')return JSON.stringify([...actual.fields].sort())===JSON.stringify([...expected.fields].sort());
  if(expected.kind==='unsupported')return true;
  if(actual.name!==expected.name)return false;
  for(const [k,v]of Object.entries(expected.arguments)){
    if(['departureCity','destinationCity'].includes(k)){if(normalize(actual.arguments[k])!==normalize(v))return false;}
    else if(JSON.stringify(actual.arguments[k])!==JSON.stringify(v))return false;
  }
  const defaults={children:0,pacing:'balanced',preferences:[],mandatoryPlaceIds:[]};
  return Object.entries(actual.arguments).every(([k,v])=>Object.hasOwn(expected.arguments,k)||
    (Object.hasOwn(defaults,k)&&JSON.stringify(v)===JSON.stringify(defaults[k])));
}
function verifyManifest(){
  assertLock();assert.equal(manifest.cases.length,4);
  assert.deepEqual(manifest.cases.map(c=>c.id),['D01','D02','D03','D04']);
  assert.deepEqual(manifest.variants,{A:{format:'DECISION_SCHEMA',description:'Unchanged production Ollama request body'},
    B:{format:'json',description:'Byte-equivalent request body except top-level format'}});
  const v2=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')));
  const p=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-04-b-live-probe/technical-cases.json')));
  const old=new Set([...v2.cases,...p.cases].map(c=>c.request.message));
  for(const c of manifest.cases){
    assert.ok(!old.has(c.request.message));assert.equal(c.request.message,c.request.message.normalize('NFC'));
    assert.deepEqual(c.request.history,[]);
    const d=parseDecision(c.expected);if(d.kind==='tool')assert.deepEqual(validateTool(d).missing,[]);
    assert.ok(validateSchema(DECISION_SCHEMA,c.expected));
  }
  for(const d of fs.readdirSync(evidenceRoot,{withFileTypes:true}).filter(e=>e.isDirectory()))
    for(const id of lock.variantOrder)assert.ok(!fs.existsSync(path.join(evidenceRoot,d.name,`attempt-${id}.json`)),`${id} already attempted`);
}
function ratePreflight(){
  const old=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/rate-window.json')));
  const resume='docs/evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b';
  const probe='docs/evidence/t-ai-04-b-live-probe/run-20261109T031033039Z-28a4545e';
  const a=JSON.parse(fs.readFileSync(path.join(root,resume,'request-count.json')));
  const b=JSON.parse(fs.readFileSync(path.join(root,probe,'request-count.json')));
  assert.equal(a.principalId,old.principalId);assert.equal(b.principalId,old.principalId);
  assert.equal(a.resumeInferencePosts,4);assert.equal(b.inferencePosts,5);
  const attempts=[...['VI21','VI22','VI23','VI24'].map(id=>path.join(root,resume,`attempt-${id}.json`)),
    ...['P01','P02','P03','P04','P05'].map(id=>path.join(root,probe,`attempt-${id}.json`))];
  const now=Date.now(),recent=attempts.map(file=>JSON.parse(fs.readFileSync(file)))
    .filter(x=>now-Date.parse(x.createdAt)<3600000&&now>=Date.parse(x.createdAt));
  assert.ok(recent.length+8<=20,'Prior request ledger plus eight would exceed 20/hour');
  principalId=old.principalId;
  write('rate-preflight.json',{principalId,checkedAt:new Date(now).toISOString(),priorKnownAttemptsWithinHour:recent.length,
    plannedPosts:8,maxPerHour:20,defaultAgentLimits:true,pass:true});
}
function extractSystem(){
  const source=fs.readFileSync(path.join(root,'backend/src/services/agentService.ts'),'utf8');
  const match=source.match(/const SYSTEM = `([\s\S]*?)`;/);
  assert.ok(match,'Agent SYSTEM literal not found');assert.ok(!match[1].includes('${'),'Dynamic SYSTEM interpolation unsupported');
  return match[1];
}
async function productionRequest(c){
  const system=extractSystem(),messages=readConversation(c.request),captures=[];
  const env={LLM_PROVIDER:'ollama',LLM_LIVE_ENABLED:'true',LLM_USAGE_APPROVED:'true',
    OLLAMA_LOCAL_ONLY_CONFIRMED:'true',OLLAMA_MODEL:'qwen3:4b-instruct-2507-q4_K_M',OLLAMA_BASE_URL:'http://127.0.0.1:11434'};
  const provider=createConfiguredProvider(env,async(url,init)=>{
    assert.equal(url,'http://127.0.0.1:11434/api/chat');captures.push(JSON.parse(init.body));
    return new Response(JSON.stringify({done:true,done_reason:'stop',message:{role:'assistant',content:'{"kind":"unsupported"}'},
      prompt_eval_count:1,eval_count:1}),{status:200,headers:{'Content-Type':'application/json'}});
  });
  const decision=await provider.generate({system,messages,tools:AGENT_TOOLS},new AbortController().signal);
  assert.deepEqual(decision,{kind:'unsupported'});assert.equal(captures.length,1);
  const body=captures[0];assert.deepEqual(body.format,DECISION_SCHEMA);
  assert.deepEqual(body.messages.map(m=>m.role),['system',...messages.map(m=>m.role)]);
  assert.equal(body.stream,false);assert.deepEqual(body.options,{temperature:0,num_predict:2048,num_ctx:16384});
  for(const tool of AGENT_TOOLS){assert.ok(body.messages[0].content.includes(tool.description));
    for(const key of tool.parameters.required)assert.ok(body.messages[0].content.includes(`"${key}"`));}
  assert.ok(!body.messages[0].content.includes('synthetic-v2-evaluation@example.test'));
  return body;
}
function bodyWithoutFormat(body){const copy=structuredClone(body);delete copy.format;return copy;}
async function prepareBodies(){
  const rows=[];
  for(const c of manifest.cases){
    const a=await productionRequest(c),b=structuredClone(a);b.format='json';
    assert.deepEqual(bodyWithoutFormat(a),bodyWithoutFormat(b));
    assert.equal(Object.keys(a).length,Object.keys(b).length);
    write(`${c.id}-A-request.json`,a);write(`${c.id}-B-request.json`,b);
    rows.push({id:c.id,requestAsha256:sha(Buffer.from(JSON.stringify(a))),requestBsha256:sha(Buffer.from(JSON.stringify(b))),
      commonBodySha256:sha(Buffer.from(JSON.stringify(bodyWithoutFormat(a)))),
      systemSha256:sha(Buffer.from(a.messages[0].content)),messagesSha256:sha(Buffer.from(JSON.stringify(a.messages))),
      onlyDifference:'top-level format',formatA:'DECISION_SCHEMA',formatB:'json'});
  }
  write('request-plan.json',{status:'LOCKED_BEFORE_INFERENCE',manifestSha256:lock.sha256,model:manifest.model,
    sourceAgentServiceSha256:expectedSource.selected['backend/src/services/agentService.ts'].after,
    sourceLiveProviderSha256:expectedSource.selected['backend/src/agent/liveProvider.ts'].after,
    pairs:rows,approvedMaxPosts:8});
}
async function preflight(){
  verifyManifest();const integrity=sourceIntegrity();write('source-integrity-before.json',integrity);
  assert.equal(integrity.status,'PASS');ratePreflight();await prepareBodies();
  const tags=await getLocal('/api/tags'),model=tags.models?.find(m=>m.name===manifest.model);
  assert.equal(model?.digest,'0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0');
  modelDigest=model.digest;write('model.json',{tag:model.name,digest:model.digest,sizeBytes:model.size,endpoint:'127.0.0.1:11434'});
  const ps=await getLocal('/api/ps'),loaded=ps.models?.find(m=>m.name===model.name),g=gpu(),r=ram();
  assert.match(g.name,/NVIDIA.*RTX 4060/i);assert.ok(r.freeMiB>=2048,'RAM headroom below 2 GiB');
  assert.ok(g.freeMiB>=(loaded?512:5200),'GPU headroom too low');
  if(loaded)assert.ok(loaded.size_vram/loaded.size>=0.9,'Model not predominantly resident on GPU');
  write('hardware-before.json',{gpu:g,ram:r,modelLoaded:Boolean(loaded),modelGpuRatio:loaded?loaded.size_vram/loaded.size:null});
  write('offline-findings.json',{schemaRoot:'anyOf',branches:DECISION_SCHEMA.anyOf.map(b=>({kind:b.properties.kind.enum[0],
    name:b.properties.name?.enum[0]||null,required:b.required,additionalProperties:b.additionalProperties})),
    systemSource:'backend/src/services/agentService.ts literal',toolDescriptionsInSystem:true,
    messageOrder:'system, history, current user',historyCount:0,
    productionOptions:{temperature:0,num_ctx:16384,num_predict:2048,timeoutMs:15000},
    hypotheses:['structured format may affect branch selection','model or prompt may still prefer unsupported'],
    databaseAccess:'NONE',toolExecution:'NONE'});
}
async function requestOnce(id,body){
  assert.ok(posts<8,'Approved request count exceeded');assertLock();
  limits.consume(principalId); // Same principal and default AgentLimits, no override.
  write(`attempt-${id}.json`,{id,principalId,at:new Date().toISOString(),requestSha256:sha(Buffer.from(JSON.stringify(body)))});
  posts++;
  const started=Date.now();let response=null,envelope=null,error=null,raw=null;
  try{
    response=await limits.providerCall(()=>fetch('http://127.0.0.1:11434/api/chat',{
      method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
      signal:AbortSignal.timeout(15000)}));
    const text=await response.text();
    if(Buffer.byteLength(text)>LIVE_LIMITS.responseBytes)throw Error('RESPONSE_TOO_LARGE');
    envelope=JSON.parse(text);raw=typeof envelope.message?.content==='string'?envelope.message.content:null;
  }catch(e){error=String(e?.name||e?.code||e?.message||e).slice(0,100);}
  const latencyMs=Date.now()-started;
  return {response,envelope,error,raw,latencyMs};
}
function score(c,variant,body,wire,resources){
  const {response,envelope,error,raw,latencyMs}=wire;
  const httpStatus=response?.status??null;
  const transportValid=!error&&httpStatus===200&&envelope?.done===true&&envelope?.done_reason==='stop'&&
    envelope.message?.role==='assistant'&&!envelope.message?.tool_calls?.length&&
    Number.isSafeInteger(envelope.prompt_eval_count)&&envelope.prompt_eval_count>=0&&envelope.prompt_eval_count<=LIVE_LIMITS.inputTokens&&
    Number.isSafeInteger(envelope.eval_count)&&envelope.eval_count>=0&&envelope.eval_count<=LIVE_LIMITS.outputTokens;
  let jsonValid=false,schemaValid=false,runtimeValid=false,decision=null,validationError=null;
  try{
    if(typeof raw!=='string'||Buffer.byteLength(raw)>LIVE_LIMITS.decisionBytes)throw Error('Missing or oversized content');
    const parsed=JSON.parse(raw);jsonValid=true;schemaValid=validateSchema(DECISION_SCHEMA,parsed);
    decision=parseDecision(parsed);if(decision.kind==='tool'&&validateTool(decision).missing.length)throw Error('Missing required tool args');
    runtimeValid=true;
  }catch(e){validationError=String(e?.message||e).slice(0,120);}
  const semanticCorrect=runtimeValid&&semantic(decision,c.expected);
  const status=transportValid&&jsonValid&&schemaValid&&runtimeValid&&semanticCorrect?'PASS':'FAIL';
  const failureCategory=status==='PASS'?null:!transportValid?'TRANSPORT_OR_TIMEOUT':
    !jsonValid?'INVALID_JSON':!schemaValid||!runtimeValid?'SCHEMA_OR_RUNTIME':'NLU_DECISION_OR_ARGUMENTS';
  const safeRaw=typeof raw==='string'&&Buffer.byteLength(raw)<=16000&&!/bearer|token|password|api.?key|secret/i.test(raw)?raw:null;
  return {id:`${c.id}-${variant}`,caseId:c.id,variant,status,failureCategory,
    expected:c.expected,decision,semanticCorrect,jsonValid,schemaValid,runtimeValid,validationError,
    httpStatus,doneReason:envelope?.done_reason??null,error,latencyMs,
    promptTokens:envelope?.prompt_eval_count??null,outputTokens:envelope?.eval_count??null,
    loadDurationNs:envelope?.load_duration??null,totalDurationNs:envelope?.total_duration??null,
    model:manifest.model,modelDigest,format:variant==='A'?'DECISION_SCHEMA':'json',
    requestSha256:sha(Buffer.from(JSON.stringify(body))),
    systemSha256:sha(Buffer.from(body.messages[0].content)),
    messagesSha256:sha(Buffer.from(JSON.stringify(body.messages))),
    rawContentSha256:typeof raw==='string'?sha(Buffer.from(raw)):null,rawContent:safeRaw,
    rawContentRedacted:raw!==null&&safeRaw===null,resources,toolCalls:0,databaseAccess:'NONE'};
}
async function main(){
  await preflight();
  for(const c of manifest.cases){
    for(const variant of ['A','B']){
      const id=`${c.id}-${variant}`;
      if(stopReason){results.push({id,status:'NOT RUN',reason:stopReason});continue;}
      const g=gpu();if(g.freeMiB<512){stopReason='VRAM_BELOW_512_MIB';results.push({id,status:'NOT RUN',reason:stopReason});continue;}
      const body=JSON.parse(fs.readFileSync(path.join(run,`${id}-request.json`)));
      const wire=await requestOnce(id,body);
      const resources={gpu:gpu(),ram:ram()};
      const record=score(c,variant,body,wire,resources);results.push(record);write(`${id}.json`,record);
      if(id==='D01-A'){
        const ps=await getLocal('/api/ps'),loaded=ps.models?.find(m=>m.name===manifest.model);
        const ratio=loaded?.size_vram/loaded?.size;
        write('hardware-after-first.json',{gpu:resources.gpu,ram:resources.ram,modelLoaded:Boolean(loaded),modelGpuRatio:ratio??null});
        if(!Number.isFinite(ratio)||ratio<0.9)stopReason='MODEL_NOT_ON_GPU';
      }
      if(record.failureCategory==='TRANSPORT_OR_TIMEOUT')stopReason=`STOP_AFTER_${record.error||record.httpStatus||'TRANSPORT'}`;
      if(resources.gpu.freeMiB<512||resources.ram.freeMiB<2048)stopReason='RESOURCE_HEADROOM_LOW';
    }
  }
  write('results.json',{tier:'LOCAL_LLM_DIAGNOSTIC',manifestSha256:lock.sha256,model:manifest.model,
    total:8,posts,pass:results.filter(x=>x.status==='PASS').length,fail:results.filter(x=>x.status==='FAIL').length,
    notRun:results.filter(x=>x.status==='NOT RUN').length,stopReason,cases:results,
    toolExecutions:0,databaseAccess:'NONE',browserExecutions:0});
  if(results.some(x=>x.status!=='PASS'))process.exitCode=1;
}
main().catch(e=>{write('failure.json',{status:'BLOCKED_OR_ERROR',message:String(e?.message||e).slice(0,250),posts});process.exitCode=1;})
.finally(()=>{
  try{const integrity=sourceIntegrity();write('source-integrity-after.json',integrity);if(integrity.status!=='PASS')process.exitCode=1;}
  catch{process.exitCode=1;}
  console.log(JSON.stringify({run:path.relative(root,run).replaceAll('\\','/'),posts,exitCode:process.exitCode||0}));
});
