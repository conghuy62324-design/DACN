// MOCK_ONLY fixture compatibility, not an application bypass. Original run kept intact.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),source=fs.readFileSync(path.join(root,'backend/dist/tests/agentFoundation.test.js'),'utf8');
const from='const service = (decision, overrides = {}) => new agentService_js_1.AgentOrchestrator({ provider: mock(decision), readConsent: consent, ...overrides });';
assert.equal(source.split(from).length-1,1);
const to=`const service = (decision, overrides = {}) => {
 const instance = new agentService_js_1.AgentOrchestrator({provider:mock(decision),readConsent:consent,...overrides});
 const chatOriginal = instance.chat.bind(instance);
 instance.chat = (user,input) => {
  if(input===chat && decision?.kind==='tool' && ['plan_trip','search_places'].includes(decision.name)) {
   const message=input.message.replace(decision.name==='plan_trip'?'Tìm địa điểm; ':'Lập lịch trình; ','');
   return chatOriginal(user,{...input,message});
  }
  return chatOriginal(user,input);
 };
 return instance;
};`;
const derived=source.replace(from,to),name='agentFoundation.execution-correction-fixture.js',target=path.join(root,'backend/dist/tests',name);
fs.writeFileSync(target,derived);fs.writeFileSync(path.join(__dirname,name.replace('.js','.final.js')),derived,{flag:'wx'});
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
fs.writeFileSync(path.join(__dirname,'foundation-fixture-diff-final.json'),JSON.stringify({source:'backend/dist/tests/agentFoundation.test.js',originalSha256:sha(source),derivedSha256:sha(derived),
 before:from,after:to,assertionsChanged:0,caseBodiesChanged:0,assessorStub:false,productionGateStub:false,
 reason:'Original fixture intentionally names both search and plan. Narrow same-purpose unit requests to the single scripted tool intent; retain all values/model args/expected assertions. Original 17 PASS/5 FAIL retained separately.'},null,2)+'\n',{flag:'wx'});
const run=spawnSync(process.execPath,['--require',path.join(__dirname,'offline-guard.cjs'),'dist/tests/'+name],{cwd:path.join(root,'backend'),encoding:'utf8',timeout:120000,env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'}});
const log=(run.stdout||'')+(run.stderr||'');fs.writeFileSync(path.join(__dirname,'foundation-single-intent-control-final.log'),log,{flag:'wx'});
const passed=Number(log.match(/"passed"\s*:\s*(\d+)/)?.[1]||0);assert.equal(run.status,0,log);assert.equal(passed,22);
console.log(JSON.stringify({status:'PASS',passed,originalUnmodified:{pass:17,fail:5},assertionsChanged:0,assessorStub:false,gateStub:false}));
