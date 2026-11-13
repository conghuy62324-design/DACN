// OFFLINE source/manifest preparation; no provider invocation, HTTP, DB or model.
const c=require('./common.cjs'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
c.integrity();
const build=spawnSync('cmd.exe',['/d','/c','npm.cmd run build --silent'],{cwd:c.path.join(c.root,'backend'),encoding:'utf8',timeout:120000});
c.fs.writeFileSync(c.path.join(c.evidence,'backend-build-before-live.log'),(build.stdout||'')+(build.stderr||''),{flag:'wx'});c.assert.equal(build.status,0);
const load=rel=>require(c.path.join(c.root,'backend/dist',rel));
const {AGENT_TOOLS}=load('agent/tools.js'),{DECISION_SCHEMA}=load('agent/decisionSchema.js');
const {assessCurrentCompleteness}=load('agent/currentCompleteness.js'),{checkToolProvenance,inspectCurrentRequiredSlots}=load('agent/toolProvenance.js');
const {matchesDecisionSchema}=load('agent/decisionValidation.js');
const literal=c.read('backend/src/services/agentService.ts').toString('utf8').match(/const SYSTEM = (`[\s\S]*?`);/)[1];
const system=vm.runInNewContext(literal);
c.assert.equal(system,vm.runInNewContext(c.read('backend/dist/services/agentService.js').toString('utf8').match(/const SYSTEM = (`[\s\S]*?`);/)[1]));
const wireSystem=`${system}\nAvailable read-only tools (metadata from AGENT_TOOLS):\n${JSON.stringify(AGENT_TOOLS.map(tool=>({name:tool.name,description:tool.description,required:tool.parameters.required,parameters:tool.parameters})))}\nDecision JSON Schema:\n${JSON.stringify(DECISION_SCHEMA)}`;
c.assert.equal(c.sha(wireSystem),'5902945e22dfe3b9b3432c669125daf4d7929fbfd5a330ffce0581fc62c4fe1f');
const cases=[
 {id:'D01',phase:'DETERMINISTIC',request:{history:[],message:'Lập lịch trình; Nơi xuất phát: Hải Phòng; Điểm đến: Lạng Sơn; Ngày bắt đầu: 2044-02-06; Ngày kết thúc: 2044-02-08; Số người lớn: 3; Ngân sách cả nhóm: 8100000 VND'},fields:['transportation']},
 {id:'D02',phase:'DETERMINISTIC',request:{history:[],message:'Lên lịch trình; Nơi xuất phát: Ninh Bình; Điểm đến: Vinh; Ngày bắt đầu: 2044-03-04; Ngày kết thúc: 2044-03-06; Phương tiện: ô tô'},fields:['adults','totalBudget']},
 {id:'D03',phase:'DETERMINISTIC',request:{history:[],message:'Tìm nơi; Điểm đến: Cao Bằng'},fields:['dailyBudgetPerPerson']},
 {id:'D04',phase:'DETERMINISTIC',request:{history:[],message:'Tìm khách sạn!'},fields:['destinationCity','dailyBudgetPerPerson']},
 {id:'L01',phase:'LIVE_LLM',request:{history:[],message:'Lập lịch trình; Nơi xuất phát: Hải Dương; Điểm đến: Quy Nhơn; Ngày bắt đầu: 2044-05-06; Ngày kết thúc: 2044-05-08; Số người lớn: 3; Ngân sách cả nhóm: 9300000 VND; Tôi muốn đi bằng ô tô, à đổi sang xe máy'},
  expected:{kind:'tool',name:'plan_trip',arguments:{departureCity:'Hải Dương',destinationCity:'Quy Nhơn',startDate:'2044-05-06',endDate:'2044-05-08',adults:3,totalBudget:9300000,transportation:'motorbike'}},oldArgument:{transportation:'car'}},
 {id:'L02',phase:'LIVE_LLM',request:{history:[],message:'Lập lịch trình; Nơi xuất phát: Bắc Ninh; Điểm đến: Sơn La; Ngày bắt đầu: 2044-06-07; Ngày kết thúc: 2044-06-09; Số người lớn: 2; Ngân sách cả nhóm: 6400000 VND; Tôi muốn đi bằng xe máy, à đổi sang ô tô'},
  expected:{kind:'tool',name:'plan_trip',arguments:{departureCity:'Bắc Ninh',destinationCity:'Sơn La',startDate:'2044-06-07',endDate:'2044-06-09',adults:2,totalBudget:6400000,transportation:'car'}},oldArgument:{transportation:'motorbike'}},
 {id:'L03',phase:'LIVE_LLM',request:{history:[],message:'Lập lịch trình; Nơi xuất phát: Vĩnh Yên; Tôi không đi Buôn Ma Thuột, tôi muốn đi Tuy Hòa; Ngày bắt đầu: 2044-07-12; Ngày kết thúc: 2044-07-14; Số người lớn: 4; Ngân sách cả nhóm: 8700000 VND; Phương tiện: ô tô'},
  expected:{kind:'tool',name:'plan_trip',arguments:{departureCity:'Vĩnh Yên',destinationCity:'Tuy Hòa',startDate:'2044-07-12',endDate:'2044-07-14',adults:4,totalBudget:8700000,transportation:'car'}},oldArgument:{destinationCity:'Buôn Ma Thuột'}},
 {id:'L04',phase:'LIVE_LLM',request:{history:[],message:'Lập lịch trình; Nơi xuất phát: Thái Bình; Điểm đến: Gia Nghĩa; Ngày bắt đầu: 2044-08-11; Ngày kết thúc: 2044-08-13; Số người lớn: 2; Ngân sách cả nhóm: 7500000 VND; Phương tiện: ô tô; à đổi sang xe máy'},
  expected:{kind:'clarify',fields:['transportation']},hypotheticalOldTool:{kind:'tool',name:'plan_trip',arguments:{departureCity:'Thái Bình',destinationCity:'Gia Nghĩa',startDate:'2044-08-11',endDate:'2044-08-13',adults:2,totalBudget:7500000,transportation:'car'}}},
];
// Source validation below runs before lock/POST and rejects unsupported grammar/typos.
const normalize=s=>s.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
const historicalHashes=new Set();let inspected=0;
function collect(value){if(!value||typeof value!=='object')return;if(value.request&&typeof value.request.message==='string')historicalHashes.add(c.sha(normalize(value.request.message)));
 if(typeof value.request==='string')historicalHashes.add(c.sha(normalize(value.request)));for(const child of Object.values(value))if(child&&typeof child==='object')collect(child);}
for(const file of c.fs.readdirSync(c.path.join(c.root,'docs/evidence'),{recursive:true})){if(!file.endsWith('.json')||file.startsWith('t-ai-04-g1-server-completeness-live-validation'))continue;
 const full=c.path.join(c.root,'docs/evidence',file);if(!c.fs.statSync(full).isFile())continue;try{collect(JSON.parse(c.fs.readFileSync(full,'utf8')));inspected++;}catch{/* historical non-JSON extension content is not rewritten */}}
const checks=[];for(const item of cases){c.assert.equal(item.request.message,item.request.message.normalize('NFC'));c.assert.ok(item.request.message.length<=2000);
 const assessment=assessCurrentCompleteness(item.request.message);item.expectedAssessment=assessment.status;
 if(item.phase==='DETERMINISTIC'){c.assert.equal(assessment.status,'SUPPORTED_INCOMPLETE');c.assert.deepEqual(assessment.missingFields,item.fields);item.expectedOrigin='SERVER_COMPLETENESS';item.expectedTools=0;item.expectedProviderCalls=0;item.rawNlu='NOT EVALUATED';}
 else{c.assert.equal(historicalHashes.has(c.sha(normalize(item.request.message))),false,'Duplicate historical LIVE input '+item.id);c.assert.equal(matchesDecisionSchema(item.expected),true);
  if(item.id==='L04'){c.assert.equal(assessment.status,'UNDETERMINED');c.assert.notEqual(checkToolProvenance(item.hypotheticalOldTool,item.request.message).status,'ALLOW');item.expectedTools=0;item.expectedServiceStatus='needs_input';item.expectedGate='NOT_APPLICABLE if clarify; otherwise never ALLOW UNPROVEN transport';}
  else{c.assert.equal(assessment.status,'COMPLETE',item.id);c.assert.equal(checkToolProvenance(item.expected,item.request.message).status,'ALLOW');c.assert.notEqual(checkToolProvenance({...item.expected,arguments:{...item.expected.arguments,...item.oldArgument}},item.request.message).status,'ALLOW');item.expectedTools=1;item.expectedServiceStatus='completed';item.expectedGate='ALLOW only exact current proof';}
  const body=JSON.stringify({model:c.model,messages:[{role:'system',content:wireSystem},{role:'user',content:item.request.message}],stream:false,format:'json',options:{temperature:0,num_predict:2048,num_ctx:16384}});
  item.bodyFile=item.id+'-request-body.json';item.bodySha256=c.sha(body);item.promptBytes=Buffer.byteLength(JSON.stringify({system:wireSystem,messages:[{role:'user',content:item.request.message}]}))+512;c.assert.ok(item.promptBytes<=12288);
  c.fs.writeFileSync(c.path.join(c.evidence,item.bodyFile),body,{flag:'wx'});item.provenCurrent=inspectCurrentRequiredSlots(item.request.message);}
 checks.push({id:item.id,assessment:assessment.status,novelComparedHistorical:item.phase==='LIVE_LLM'?true:!historicalHashes.has(c.sha(normalize(item.request.message)))});
}
const operatorBody=JSON.stringify({model:c.model,prompt:'',stream:false,format:'json',keep_alive:'5m',options:{temperature:0,num_predict:2048,num_ctx:16384}});
c.fs.writeFileSync(c.path.join(c.evidence,'operator-load-body.json'),operatorBody,{flag:'wx'});
const plan={task:'T-AI-04-G1-SERVER-COMPLETENESS-LIVE-VALIDATION',status:'LOCKED_UNDER_APPROVED_SCOPE',lockedAt:new Date().toISOString(),
 approvalSource:'C:/Users/Danh/.codex/attachments/73f4224f-472c-45ae-a335-484dcee049e8/Pasted text.txt',maxOllamaPosts:5,maxLoadPosts:1,maxInferencePosts:4,
 principalHash:c.principalHash,principalSource:c.principalSource,model:c.model,digest:c.digest,operatorEnv:c.env,order:cases.map(x=>x.id),cases,
 modelPreparation:{id:'OP-LOAD',endpoint:c.env.OLLAMA_BASE_URL+'/api/generate',conditional:'Only if nonresident, never reload resident wrong context or a second load',bodyFile:'operator-load-body.json',bodySha256:c.sha(operatorBody),deadlineMs:60000,keepAlive:'5m',expected:{http:200,done:true,done_reason:'load',response:'',resident:true,context:16384},countsAsNlu:false,outsideAgentLimits:true},
 criteria:{rawNlu:'Exact kind/tool or exact clarify field set. Required args exact numbers/dates/enums; city strings NFC/case/whitespace canonicalization matching G1. Only existing optional harmless defaults children=0,pacing=balanced,preferences=[] may be present; all other optional/extra values fail. No raw => NOT EVALUATED, overall runtime FAIL/BLOCKED, not semantic judgment.',
 safety:'Recompute actual gate with actual parsed decision/current message, before executor. Only ALLOW when supplied args have current proof and actual executor count exactly one for valid supported tool; no tool on rejection/clarify/unsupported/schema failure. L04 always zero tool. Never repair raw args. Wrong-old-value ALLOW or unauthorized executor is safety blocker: stop remaining cases.',
 deterministic:'SERVER_COMPLETENESS/exact fields, HTTP200 needs_input, provider/GET/POST/tool all zero, raw NOT EVALUATED; mandatory auth/consent/quota precede question.',
 scoring:'Report raw semantics, schema enforcement, API UX, execution safety and runtime independently; recovered raw invalid remains FAIL. No retry, no model replacement or config/expected changes.',
 runtime:'Production phase deadline15000ms unchanged, context16384,predict2048,temp0,JSON,streamfalse. HTTP test client observation ceiling20000ms only to collect application 504; never mark a timed-out inference PASS. Concurrency1.',
 stop:'Preflight failure, eviction, preparation failure, unsafe gate/executor, or unresolved provider settlement stops remaining requests. No second warm/load POST.'},
 auxiliaryChecks:['Unauthenticated HTTP request =>401 and zero quota/provider','Authenticated consent-read failure =>503 before assessor; consumes normal quota once','Every D turn consumes normal AgentLimits quota; do not exhaust/reset quota for a 429 probe. 429 behavior remains covered offline.'],
 systemWireSha256:c.sha(wireSystem),historicalJsonInspected:inspected,historicalRequestHashes:historicalHashes.size,checks,livePostsSoFar:0};
c.write('manifest.json',plan);
const compiled={};for(const file of ['agent/liveProvider.js','agent/provider.js','agent/ollamaReadiness.js','agent/toolProvenance.js','agent/currentCompleteness.js','agent/missingSlotRecovery.js','agent/decisionSchema.js','agent/decisionValidation.js','agent/tools.js','agent/limits.js','services/agentService.js'])compiled['backend/dist/'+file]=c.sha(c.read('backend/dist/'+file));
c.write('manifest-lock.json',{at:new Date().toISOString(),manifestSha256:c.sha(c.read('docs/evidence/t-ai-04-g1-server-completeness-live-validation/manifest.json')),compiled,sourceScope:'Exact Correction FIX/Server Completeness source verified by preflight snapshot',maxOllamaPosts:5});
console.log(JSON.stringify({status:plan.status,manifestCases:plan.order,checks,operatorHash:c.sha(operatorBody),manifestSha256:c.sha(c.read('docs/evidence/t-ai-04-g1-server-completeness-live-validation/manifest.json')),maxPosts:5}));
