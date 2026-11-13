// Exactly one authorized technical inference to local Ollama. Never runs VI01-VI24.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const crypto=require('node:crypto');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'docs/evidence/t-ai-03-b-local-smoke-retry');
const approvedPath=path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json');
const preflight=JSON.parse(fs.readFileSync(path.join(out,'preflight.json'),'utf8'));
assert.equal(preflight.status,'PASS','Preflight did not pass');
const lock=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json'),'utf8'));
const approvedBytes=fs.readFileSync(approvedPath);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(approvedBytes),lock.sha256);
assert.equal(lock.sha256,'0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
const approved=JSON.parse(approvedBytes);
const input='Kiểm tra kỹ thuật: tôi muốn đổi màu giao diện HuGo sang tím. Đây không phải yêu cầu tìm địa điểm, lập lịch trình, lưu chuyến đi hay đặt dịch vụ.';
assert.ok(!approved.cases.some(c=>c.request.message===input),'Technical input overlaps benchmark');
const source=fs.readFileSync(path.join(root,'backend/src/services/agentService.ts'),'utf8');
const match=source.match(/const SYSTEM = `([\s\S]*?)`;/);
assert.ok(match,'Cannot extract current Agent system prompt');
const {DECISION_SCHEMA}=require('../dist/agent/decisionSchema.js');
const {LIVE_LIMITS}=require('../dist/agent/liveProvider.js');
const {parseDecision,validateTool}=require('../dist/agent/tools.js');
assert.equal(LIVE_LIMITS.timeoutMs,15000);assert.equal(LIVE_LIMITS.outputTokens,2048);
const system=`${match[1]}\nDecision JSON Schema:\n${JSON.stringify(DECISION_SCHEMA)}`;
const messages=[{role:'system',content:system},{role:'user',content:input}];
assert.ok(Buffer.byteLength(JSON.stringify({system,messages:[messages[1]]}),'utf8')+512<=LIVE_LIMITS.inputTokens);
const payload={model:'qwen3:4b-instruct-2507-q4_K_M',messages,stream:false,format:DECISION_SCHEMA,
  options:{temperature:0,num_predict:LIVE_LIMITS.outputTokens,num_ctx:LIVE_LIMITS.inputTokens+LIVE_LIMITS.outputTokens+2048}};
assert.equal(payload.options.num_ctx,16384);
const marker=path.join(out,'inference-request-reserved.json');
const summary={
  authorization:'Owner approved maximum one local technical inference in T-AI-03-B-LOCAL-SMOKE-RETRY',
  endpoint:'http://127.0.0.1:11434/api/chat',transport:'DIRECT_NODE_HTTP_NO_PROXY',
  requestCountLimit:1,technicalInput:input,technicalInputSha256:sha(Buffer.from(input)),
  systemPromptSha256:sha(Buffer.from(system)),schemaSha256:sha(Buffer.from(JSON.stringify(DECISION_SCHEMA))),
  options:payload.options,benchmarkSha256:lock.sha256,createdAtUtc:new Date().toISOString()
};
fs.writeFileSync(marker,JSON.stringify(summary,null,2)+'\n',{flag:'wx'}); // A rerun cannot send a second request.
const cli=path.join(process.env.LOCALAPPDATA||'','Programs/Ollama/ollama.exe');
const run=(prog,args)=>{try{const p=cp.spawnSync(prog,args,{encoding:'utf8',timeout:3000,windowsHide:true});return p.status===0?p.stdout.trim():null;}catch{return null;}};
const gpuQuery=['--query-gpu=memory.used,memory.free,utilization.gpu','--format=csv,noheader,nounits'];
async function main(){
const gpuBefore=run('nvidia-smi',gpuQuery);
let minFreeRam=os.freemem();let gpuPeakUsedMiB=null;let gpuPeakUtilPct=null;let gpuSamples=0;
const sampleRam=()=>{minFreeRam=Math.min(minFreeRam,os.freemem());};
const ramTimer=setInterval(sampleRam,200);
const gpuTimer=setInterval(()=>{
  cp.execFile('nvidia-smi',gpuQuery,{encoding:'utf8',timeout:2500,windowsHide:true},(err,stdout)=>{
    if(err)return;const parts=stdout.trim().split(',').map(s=>Number(s.trim()));
    if(parts.length>=3&&parts.every(Number.isFinite)){
      gpuSamples++;gpuPeakUsedMiB=Math.max(gpuPeakUsedMiB??0,parts[0]);gpuPeakUtilPct=Math.max(gpuPeakUtilPct??0,parts[2]);
    }
  });
},750);
const started=performance.now();let timedOut=false;
const requestResult=await new Promise(resolve=>{
  const req=http.request({host:'127.0.0.1',port:11434,path:'/api/chat',method:'POST',
    headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(JSON.stringify(payload))}},res=>{
      const chunks=[];let size=0;
      res.on('data',part=>{size+=part.length;if(size>LIVE_LIMITS.responseBytes)req.destroy(Error('RESPONSE_TOO_LARGE'));else chunks.push(part);});
      res.on('end',()=>resolve({httpStatus:res.statusCode,responseBytes:size,body:Buffer.concat(chunks).toString('utf8')}));
    });
  const timer=setTimeout(()=>{timedOut=true;req.destroy(Error('TIMEOUT_15000MS'));},LIVE_LIMITS.timeoutMs);
  req.on('error',e=>resolve({networkError:timedOut?'TIMEOUT_15000MS':String(e.code||e.message),httpStatus:null,responseBytes:0,body:null}));
  req.on('close',()=>clearTimeout(timer));
  req.end(JSON.stringify(payload)); // The only inference POST in this task.
});
const elapsedMs=+(performance.now()-started).toFixed(1);
clearInterval(ramTimer);clearInterval(gpuTimer);sampleRam();
const gpuAfter=run('nvidia-smi',gpuQuery);
const ollamaPs=run(cli,['ps']);
const resource={ramTotalGiB:+(os.totalmem()/2**30).toFixed(2),ramMinimumFreeGiB:+(minFreeRam/2**30).toFixed(2),
  gpuBefore,gpuAfter,gpuPeakUsedMiB,gpuPeakUtilPct,gpuSamples,ollamaPs};
let envelope=null,decision=null,schemaValid=false,runtimeValid=false,validationError=null;
if(requestResult.body){
  try{envelope=JSON.parse(requestResult.body);}catch{validationError='INVALID_ENVELOPE_JSON';}
}
function matches(schema,value){
  if(schema.anyOf)return schema.anyOf.some(x=>matches(x,value));
  if(schema.enum&&!schema.enum.some(x=>Object.is(x,value)))return false;
  if(schema.type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value))return false;
    if(schema.required?.some(k=>!Object.hasOwn(value,k)))return false;
    if(schema.additionalProperties===false&&Object.keys(value).some(k=>!Object.hasOwn(schema.properties||{},k)))return false;
    return Object.entries(value).every(([k,v])=>!schema.properties?.[k]||matches(schema.properties[k],v));
  }
  if(schema.type==='array'){
    if(!Array.isArray(value)||schema.minItems!==undefined&&value.length<schema.minItems||schema.maxItems!==undefined&&value.length>schema.maxItems)return false;
    return value.every(v=>matches(schema.items,v));
  }
  if(schema.type==='string'){
    if(typeof value!=='string'||schema.minLength!==undefined&&value.length<schema.minLength||schema.maxLength!==undefined&&value.length>schema.maxLength)return false;
    if(schema.format==='date')return /^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(`${value}T00:00:00Z`));
    if(schema.format==='uuid')return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
    return true;
  }
  if(schema.type==='integer')return Number.isSafeInteger(value)&&
    (schema.minimum===undefined||value>=schema.minimum)&&(schema.exclusiveMinimum===undefined||value>schema.exclusiveMinimum);
  if(schema.type==='number')return typeof value==='number'&&Number.isFinite(value)&&
    (schema.minimum===undefined||value>=schema.minimum)&&(schema.exclusiveMinimum===undefined||value>schema.exclusiveMinimum);
  return true;
}
let decisionJson=null;
if(envelope&&typeof envelope.message?.content==='string'){
  try{
    assert.ok(Buffer.byteLength(envelope.message.content,'utf8')<=LIVE_LIMITS.decisionBytes);
    decisionJson=JSON.parse(envelope.message.content);
    schemaValid=matches(DECISION_SCHEMA,decisionJson);
    decision=parseDecision(decisionJson);
    if(decision.kind==='tool')assert.deepEqual(validateTool(decision).missing,[]);
    runtimeValid=true;
  }catch(e){validationError=String(e.message).slice(0,250);}
}
const envelopeValid=Boolean(envelope&&requestResult.httpStatus===200&&envelope.done===true&&envelope.done_reason==='stop'&&
  envelope.message?.role==='assistant'&&!envelope.message?.tool_calls?.length&&
  Number.isSafeInteger(envelope.prompt_eval_count)&&envelope.prompt_eval_count>=0&&envelope.prompt_eval_count<=LIVE_LIMITS.inputTokens&&
  Number.isSafeInteger(envelope.eval_count)&&envelope.eval_count>=0&&envelope.eval_count<=LIVE_LIMITS.outputTokens);
const status=!timedOut&&elapsedMs<=LIVE_LIMITS.timeoutMs&&envelopeValid&&schemaValid&&runtimeValid&&decision?.kind==='unsupported'?'PASS':'FAIL';
const result={status,classification:'ONE_LOCAL_TECHNICAL_INFERENCE_NOT_NLU',
  requestCount:1,endpoint:'127.0.0.1:11434/api/chat',httpStatus:requestResult.httpStatus,
  timeoutMs:LIVE_LIMITS.timeoutMs,timedOut,elapsedMs,responseBytes:requestResult.responseBytes,
  networkError:requestResult.networkError||null,model:payload.model,
  schemaValid,runtimeValid,envelopeValid,decisionKind:decision?.kind||null,technicalIntentExpected:'unsupported',
  validationError,promptEvalCount:envelope?.prompt_eval_count??null,evalCount:envelope?.eval_count??null,
  doneReason:envelope?.done_reason??null,loadDurationNs:envelope?.load_duration??null,
  promptEvalDurationNs:envelope?.prompt_eval_duration??null,evalDurationNs:envelope?.eval_duration??null,
  totalDurationNs:envelope?.total_duration??null,resource,
  responseContent:typeof envelope?.message?.content==='string'?envelope.message.content:null,
  responseContentSha256:typeof envelope?.message?.content==='string'?sha(Buffer.from(envelope.message.content)):null};
fs.writeFileSync(path.join(out,'technical-inference-result.json'),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...result,resource:{...resource,ollamaPs:resource.ollamaPs},responseContent:undefined}));
}
main().catch(e=>{console.error(`Technical inference script failed: ${e.message}`);process.exitCode=1;});
