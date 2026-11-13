// Single-use approved local probe. No PostgreSQL, Planner or Catalog calls.
const c=require('./common.cjs'),http=require('node:http');
const baseRel='docs/evidence/t-ai-04-g1-server-completeness-live-validation/';
const plan=c.json(baseRel+'manifest.json'),lock=c.json(baseRel+'manifest-lock.json');
const nativeFetch=global.fetch;
const load=rel=>require(c.path.join(c.root,'backend/dist',rel));
const {parseDecision,validateTool}=load('agent/tools.js');
const {matchesDecisionSchema}=load('agent/decisionValidation.js');
const {checkToolProvenance}=load('agent/toolProvenance.js');
const {assessCurrentCompleteness}=load('agent/currentCompleteness.js');
const {createConfiguredProvider}=load('agent/liveProvider.js');
const {AgentOrchestrator}=load('services/agentService.js');
const {AgentLimits}=load('agent/limits.js');
const {createAgentRouter}=load('routes/agentRoutes.js');
const {signAccessToken}=load('services/tokenService.js');
const express=require(c.path.join(c.root,'backend/node_modules/express'));
const {sequelize}=load('config/database.js');
let dbAttempts=0;sequelize.query=async()=>{dbAttempts++;throw Error('DB_FORBIDDEN');};
sequelize.connectionManager.getConnection=async()=>{dbAttempts++;throw Error('DB_FORBIDDEN');};
let current=null,server,consentAvailable=true,consumed=0,providerPending=0;
const results=[],nativePosts=[],transport=[],captures=[];
const limits=new AgentLimits();
// Conservative hydration: never reset quota or change principal/default policy.
const initialRate=c.rate();for(const entry of initialRate.recent)limits.consume(c.principal);
const normalConsume=limits.consume.bind(limits);
limits.consume=id=>{c.assert.equal(id,c.principal);normalConsume(id);consumed++;};
const token=signAccessToken({id:c.principal,email:'local-validation@hugo.test',fullName:'LOCAL_VALIDATION',roles:['CUSTOMER']});
function verifyLock(){c.integrity();c.noProxy();c.assert.equal(c.sha(c.read(baseRel+'manifest.json')),lock.manifestSha256);
 for(const [file,hash]of Object.entries(lock.compiled))c.assert.equal(c.sha(c.read(file)),hash,file);
 for(const item of plan.cases.filter(x=>x.bodyFile))c.assert.equal(c.sha(c.read(baseRel+item.bodyFile)),item.bodySha256);
 c.assert.equal(c.sha(c.read(baseRel+plan.modelPreparation.bodyFile)),plan.modelPreparation.bodySha256);}
function entry(id,kind){const rate=c.rate();c.assert.ok(rate.remainingConservativeSlots>0);c.assert.equal(rate.futureDatedEntries.length,0);
 const value={at:new Date().toISOString(),id,kind,principalHash:c.principalHash,principalSource:c.principalSource,postAttempt:false,quota:'Normal AgentLimits consumption on HTTP turn; operator separately identified'};
 c.write('attempt-'+id+'.json',value);return value;}
async function nativePost(id,url,options,operator=false){
 verifyLock();c.assert.equal(url,c.env.OLLAMA_BASE_URL+(operator?'/api/generate':'/api/chat'));
 const def=operator?plan.modelPreparation:plan.cases.find(x=>x.id===id);
 c.assert.equal(String(options.body),c.read(baseRel+def.bodyFile).toString('utf8'));
 c.assert.ok(nativePosts.length<5);c.assert.ok(nativePosts.filter(x=>x.operator).length<(operator?1:2));
 if(!operator){c.assert.ok(nativePosts.filter(x=>!x.operator).length<4);c.assert.equal(current.id,id);c.assert.ok(current.traces.some(x=>x.event==='readiness_verified'));}
 c.assert.ok(!nativePosts.some(x=>x.id===id));
 const record={id,operator,at:new Date().toISOString(),url,method:'POST',bodySha256:c.sha(String(options.body)),principalHash:c.principalHash,
  agentLimitsApplied:!operator,deadlineMs:operator?60000:15000,resourcesBefore:c.resources(),rateBeforeNativePost:c.rate(),status:'INTENT_RECORDED_BEFORE_DISPATCH'};
 c.write('ollama-attempt-'+id+'.json',record);nativePosts.push(record);
 const started=performance.now();
 try{
  const response=await nativeFetch(url,options);record.httpStatus=response.status;record.headersMs=performance.now()-started;
  const capture=(async()=>{try{const text=await response.clone().text();c.assert.ok(Buffer.byteLength(text)<=65536);record.bodyElapsedMs=performance.now()-started;record.rawEnvelopeText=text;record.envelope=JSON.parse(text);}
   catch(error){record.captureError=error.code||error.name;}finally{record.resourcesAfter=c.resources();c.write('ollama-response-'+id+'.json',record);}})();
  captures.push(capture);return response;
 }catch(error){record.elapsedMs=performance.now()-started;record.error={name:error.name,code:error.code||null};record.resourcesAfter=c.resources();c.write('ollama-response-'+id+'.json',record);throw error;}
}
const fetcher=async(url,options={})=>{
 c.assert.ok(current&&current.phase==='LIVE_LLM','No provider network during deterministic/auxiliary phase');
 const parsed=new URL(url);c.assert.equal(parsed.origin,c.env.OLLAMA_BASE_URL);
 const method=options.method||'GET',event={id:current.id,at:new Date().toISOString(),method,path:parsed.pathname};transport.push(event);current.transport.push(event);
 if(method==='POST')return nativePost(current.id,String(url),options);
 c.assert.equal(method,'GET');c.assert.ok(['/api/version','/api/tags','/api/ps'].includes(parsed.pathname));
 const started=performance.now();try{const response=await nativeFetch(url,options);event.httpStatus=response.status;return response;}
 finally{event.elapsedMs=performance.now()-started;}
};
const realProvider=createConfiguredProvider(c.env,fetcher,event=>{if(current)current.traces.push(event);});
c.assert.equal(realProvider.configured,true);c.assert.equal(realProvider.external,false);
const provider={configured:realProvider.configured,external:realProvider.external,async generate(input,signal){
 const target=current;target.providerCalls++;providerPending++;
 try{const decision=await realProvider.generate(input,signal);target.providerBoundary={status:'RETURNED',decision:structuredClone(decision)};return decision;}
 catch(error){target.providerBoundary={status:'REJECTED',name:error.name,code:error.code||null};throw error;}
 finally{providerPending--;target.providerSettledAt=new Date().toISOString();}
}};
const service=new AgentOrchestrator({provider,limits,readConsent:async id=>{c.assert.equal(id,c.principal);current.consentReads++;if(!consentAvailable)throw Error('MOCK_ONLY_CONSENT_UNAVAILABLE');return {personalizationEnabled:false};},
 tools:{async execute(decision){const target=current,gate=checkToolProvenance(decision,target.request.message);c.assert.equal(gate.status,'ALLOW');c.assert.notEqual(target.id,'L04');target.executed.push(structuredClone(decision));
   return {type:'MOCK_ONLY',source:'READ_ONLY_TEST_EXECUTOR',toolName:decision.name};}},onDecision:event=>current.origins.push(event)});
async function api(request,authenticated=true){const started=performance.now();return new Promise((resolve,reject)=>{
 const body=JSON.stringify(request);const req=http.request({hostname:'127.0.0.1',port:server.address().port,path:'/api/agent/chat',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(body),...(authenticated?{Authorization:'Bearer '+token}:{})}},res=>{
  const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>{try{resolve({httpStatus:res.statusCode,elapsedMs:performance.now()-started,body:JSON.parse(Buffer.concat(chunks).toString('utf8'))});}catch(e){reject(e);}});});
 req.setTimeout(20000,()=>req.destroy(Error('HTTP_OBSERVATION_TIMEOUT')));req.on('error',reject);req.end(body);
 });}
const normalized=x=>x.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
function scoreRaw(raw,expected){if(raw.kind!==expected.kind)return false;if(raw.kind==='unsupported')return true;
 if(raw.kind==='clarify')return JSON.stringify([...raw.fields].sort())===JSON.stringify([...expected.fields].sort());
 if(raw.name!==expected.name)return false;
 for(const [key,value]of Object.entries(expected.arguments))if(typeof value==='string'&&key.endsWith('City')?normalized(raw.arguments[key]||'')!==normalized(value):raw.arguments[key]!==value)return false;
 return Object.keys(raw.arguments).every(key=>Object.hasOwn(expected.arguments,key)||(key==='children'&&raw.arguments[key]===0)||(key==='pacing'&&raw.arguments[key]==='balanced')||(key==='preferences'&&Array.isArray(raw.arguments[key])&&!raw.arguments[key].length));}
function context(item){return {id:item.id,phase:item.phase,request:item.request,assessment:assessCurrentCompleteness(item.request.message),providerCalls:0,consentReads:0,traces:[],origins:[],transport:[],executed:[],at:new Date().toISOString()};}
async function runCase(item){current=context(item);entry(item.id,'NORMAL_AGENT_TURN');const quotaBefore=consumed;
 current.api=await api(item.request);if(providerPending)await Promise.race([new Promise(resolve=>{const timer=setInterval(()=>{if(!providerPending){clearInterval(timer);resolve();}},10);setTimeout(()=>{clearInterval(timer);resolve();},2000).unref();}),new Promise(resolve=>setTimeout(resolve,2100))]);
 await Promise.allSettled(captures);current.quotaConsumed=consumed-quotaBefore;current.resourcesAfter=c.resources();
 const data=current.api.body.data,post=nativePosts.find(x=>x.id===item.id);
 current.ollamaPostCount=post?1:0;current.readinessGetCount=current.transport.filter(x=>x.method==='GET').length;
 if(item.phase==='DETERMINISTIC'){
  current.rawNlu='NOT EVALUATED';current.safety='PASS';
  current.status=current.api.httpStatus===200&&data?.status==='needs_input'&&JSON.stringify(data.missingFields)===JSON.stringify(item.fields)&&current.origins.length===1&&current.origins[0].origin==='SERVER_COMPLETENESS'&&current.providerCalls===0&&current.readinessGetCount===0&&current.ollamaPostCount===0&&current.executed.length===0&&current.quotaConsumed===1&&current.consentReads===1?'PASS':'FAIL';
 }else{
  const content=post?.envelope?.message?.content;current.rawDecisionText=typeof content==='string'?content:null;current.jsonValid=false;current.schemaValid=false;current.runtimeValid=false;current.rawNlu='NOT EVALUATED';current.gate={status:'NOT_APPLICABLE'};
  if(typeof content==='string'){try{current.rawDecision=JSON.parse(content);current.jsonValid=true;current.schemaValid=matchesDecisionSchema(current.rawDecision);const parsed=parseDecision(current.rawDecision);
    current.runtimeValid=parsed.kind!=='tool'||!validateTool(parsed).missing.length;
    if(parsed.kind==='tool')current.gate=checkToolProvenance(parsed,item.request.message);
    current.rawNlu=current.schemaValid&&current.runtimeValid&&scoreRaw(current.rawDecision,item.expected)?'PASS':'FAIL';
   }catch(error){current.rawNlu='FAIL';current.validationError=error.code||error.message;}}
  const executed=current.executed,raw=current.rawDecision;
  const correctExecution=executed.every(decision=>JSON.stringify(decision)===JSON.stringify(current.providerBoundary?.decision)&&checkToolProvenance(decision,item.request.message).status==='ALLOW');
  current.safety=correctExecution&&executed.length<2&&(item.id!=='L04'||executed.length===0)&&(!executed.length||current.gate.status==='ALLOW')?'PASS':'FAIL';
  if(raw?.kind==='tool'&&item.oldArgument&&Object.entries(item.oldArgument).some(([k,v])=>normalized(String(raw.arguments?.[k]))===normalized(String(v)))&&current.gate.status==='ALLOW')current.safety='FAIL';
  current.runtime=post?.httpStatus===200&&current.providerBoundary?.status==='RETURNED'&&current.api.httpStatus===200&&!current.traces.some(x=>x.event==='deadline_triggered')?'PASS':'FAIL';
  current.expectedBehavior=current.rawNlu==='PASS'&&data?.status===item.expectedServiceStatus&&executed.length===item.expectedTools?'PASS':'FAIL';
  current.status=current.rawNlu==='PASS'&&current.safety==='PASS'&&current.runtime==='PASS'&&current.expectedBehavior==='PASS'?'PASS':'FAIL';
 }
 current.providerPending=providerPending;c.write('case-'+item.id+'.json',current);results.push(current);console.log(JSON.stringify({id:item.id,status:current.status,rawNlu:current.rawNlu,safety:current.safety,api:current.api.httpStatus,provider:current.providerCalls,post:current.ollamaPostCount,tools:current.executed.length}));return current;}
let logPath=c.path.join(process.env.LOCALAPPDATA||'','Ollama/server.log'),logStart=0;
async function main(){
 verifyLock();c.write('run-marker.json',{at:new Date().toISOString(),singleUse:true,harnessSha256:c.sha(c.fs.readFileSync(__filename)),manifestSha256:lock.manifestSha256});
 if(c.fs.existsSync(logPath))logStart=c.fs.statSync(logPath).size;
 c.write('native-log-start.json',{at:new Date().toISOString(),byteOffset:logStart,source:'%LOCALAPPDATA%/Ollama/server.log'});
 const initial=await c.preflight('preflight-run.json');if(initial.status!=='PASS')throw Error('PREFLIGHT_BLOCKED');
 const app=express();app.use(express.json({limit:'32kb'}));app.use('/api/agent',createAgentRouter(service));server=http.createServer(app);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const d=plan.cases[0];current=context({...d,id:'AUX-AUTH',phase:'AUXILIARY'});let count=consumed;const auth=await api(d.request,false);c.assert.equal(auth.httpStatus,401);c.assert.equal(consumed-count,0);c.assert.equal(current.providerCalls,0);c.write('auth-check.json',{status:'PASS',api:auth,quotaConsumed:0,providerCalls:0,dbAttempts});
 current=context({...d,id:'AUX-CONSENT',phase:'AUXILIARY'});entry(current.id,'NORMAL_AGENT_TURN_CONSENT_FAILURE');consentAvailable=false;count=consumed;current.api=await api(d.request);consentAvailable=true;current.quotaConsumed=consumed-count;
 c.assert.equal(current.api.httpStatus,503);c.assert.equal(current.api.body.code,'AGENT_CONSENT_UNAVAILABLE');c.assert.equal(current.quotaConsumed,1);c.assert.equal(current.providerCalls,0);c.assert.equal(current.origins.length,0);c.write('consent-check.json',{status:'PASS',...current});
 for(const item of plan.cases.filter(x=>x.phase==='DETERMINISTIC')){const result=await runCase(item);if(result.status!=='PASS')throw Error('DETERMINISTIC_FAILED_STOP');}
 const prepare=await c.preflight('preflight-before-preparation.json');if(prepare.status!=='PASS')throw Error('PREPARATION_PREFLIGHT_BLOCKED');
 if(!prepare.metadata.resident){entry('OP-LOAD','OPERATOR_LOAD_OUTSIDE_AGENT_LIMITS');const response=await nativePost('OP-LOAD',plan.modelPreparation.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(60000),headers:{'Content-Type':'application/json'},body:c.read(baseRel+'operator-load-body.json').toString('utf8')},true);
  await Promise.allSettled(captures);const op=nativePosts.find(x=>x.id==='OP-LOAD');c.assert.equal(response.status,200);c.assert.equal(op.envelope?.done,true);c.assert.equal(op.envelope?.done_reason,'load');c.assert.equal(op.envelope?.response,'');}
 for(const item of plan.cases.filter(x=>x.phase==='LIVE_LLM')){
  const pre=await c.preflight('preflight-'+item.id+'.json',true);if(pre.status!=='PASS')throw Error('LIVE_PREFLIGHT_BLOCKED_'+item.id);
  const result=await runCase(item);if(result.safety!=='PASS')throw Error('SAFETY_BLOCKER_'+item.id);if(providerPending||result.traces.some(x=>x.event==='deadline_triggered'))throw Error('RUNTIME_DEADLINE_STOP_'+item.id);
 }
}
main().catch(error=>{c.write('stop.json',{at:new Date().toISOString(),reason:error.message,code:error.code||null,nativePosts:nativePosts.length,providerPending});console.error('STOP '+error.message);}).finally(async()=>{
 await Promise.allSettled(captures);if(server)await new Promise(resolve=>server.close(resolve));
 const missing=plan.cases.filter(x=>!results.some(y=>y.id===x.id)).map(x=>({id:x.id,status:'NOT RUN',rawNlu:x.phase==='LIVE_LLM'?'NOT EVALUATED':'NOT EVALUATED',reason:'Stopped before case'}));
 let lastMetadata;try{lastMetadata=await c.metadata();}catch(error){lastMetadata={error:error.code||error.name};}
 c.write('results.json',{at:new Date().toISOString(),manifestSha256:lock.manifestSha256,results:[...results,...missing],nativePosts:nativePosts.map(x=>({id:x.id,operator:x.operator,at:x.at,httpStatus:x.httpStatus,error:x.error||null})),quota:{initialRecent:initialRate.recent.length,normalConsumed:consumed,rateAfter:c.rate()},dbAttempts,providerPending,resourcesAfter:c.resources(),metadataAfter:lastMetadata,real:'Production provider/readiness/orchestrator/router/auth/schema/limits/provenance with native local Ollama',mockOnly:'Consent store and read-only executor; synthetic identity claims signed locally using same approved UUID. No DB login or Planner/Catalog.',transport});
 if(c.fs.existsSync(logPath)){const buf=c.fs.readFileSync(logPath);const added=buf.subarray(Math.min(logStart,buf.length)).toString('utf8');
  const lines=added.split(/\r?\n/).filter(x=>/\[GIN\].*POST|watchdog|free memory|free_mem|offload|layers|CUDA.*buffer|KV.*buffer|context.*16384|loaded.*model|runner started|load.*completed|n_ctx.*16384/i.test(x)&&!/prompt|authorization|password|api.key|server config|env=|USERPROFILE/i.test(x));
  c.write('native-log-window.json',{at:new Date().toISOString(),startOffset:logStart,endOffset:buf.length,appendedBytes:buf.length-logStart,lines:lines.map(x=>x.replace(/C:\\[^\s"']+/g,'[LOCAL_PATH]')),nativePostRows:lines.filter(x=>/\[GIN\].*POST/.test(x)).length,scope:'Filtered native runtime lines; no prompts, credentials, full env or account fields'});}
 console.log(JSON.stringify({completedCases:results.length,nativePosts:nativePosts.length,inferencePosts:nativePosts.filter(x=>!x.operator).length,dbAttempts,providerPending}));
});
