// OFFLINE evidence analysis only; no network, DB, model or application changes.
const c=require('./common.cjs');
const rel='docs/evidence/t-ai-04-g1-server-completeness-live-validation/',old='docs/evidence/t-ai-04-g1-execution-provenance-correction-fix/';
const plan=c.json(rel+'manifest.json'),lock=c.json(rel+'manifest-lock.json'),run=c.json(rel+'results.json');
c.assert.equal(c.sha(c.read(rel+'manifest.json')),lock.manifestSha256);
const load=x=>require(c.path.join(c.root,'backend/dist',x));
const {matchesDecisionSchema}=load('agent/decisionValidation.js'),{parseDecision,validateTool}=load('agent/tools.js');
const {checkToolProvenance}=load('agent/toolProvenance.js');
const summaries=[],proofs=[];
for(const def of plan.cases){const item=run.results.find(x=>x.id===def.id);c.assert.equal(item.status,'PASS');c.assert.equal(item.quotaConsumed,1);c.assert.equal(item.consentReads,1);
 if(def.phase==='DETERMINISTIC'){c.assert.equal(item.rawNlu,'NOT EVALUATED');c.assert.equal(item.providerCalls,0);c.assert.equal(item.readinessGetCount,0);c.assert.equal(item.ollamaPostCount,0);c.assert.equal(item.executed.length,0);c.assert.equal(item.origins[0].origin,'SERVER_COMPLETENESS');c.assert.deepEqual(item.api.body.data.missingFields,def.fields);
  summaries.push({id:item.id,status:item.status,origin:item.origins[0].origin,fields:item.api.body.data.missingFields,rawNlu:item.rawNlu,apiMs:item.api.elapsedMs,providerCalls:0,readinessGetCount:0,ollamaPostCount:0,toolCalls:0});continue;}
 const record=c.json(rel+'ollama-response-'+item.id+'.json'),body=c.read(rel+def.bodyFile),e=record.envelope;
 c.assert.equal(c.sha(body),def.bodySha256);c.assert.equal(matchesDecisionSchema(item.rawDecision),true);const decision=parseDecision(item.rawDecision);if(decision.kind==='tool')c.assert.equal(validateTool(decision).missing.length,0);
 c.assert.deepEqual(item.providerBoundary.decision,decision);c.assert.deepEqual(JSON.parse(e.message.content),item.rawDecision);
 c.assert.equal(item.rawNlu,'PASS');c.assert.equal(item.safety,'PASS');c.assert.equal(item.runtime,'PASS');c.assert.equal(item.providerPending,0);c.assert.equal(item.executed.length,def.expectedTools);
 c.assert.ok(!body.includes(Buffer.from(c.principal)));c.assert.ok(!body.includes(Buffer.from('local-validation@hugo.test')));c.assert.ok(!body.includes(Buffer.from('Authorization')));
 if(def.expected.kind==='tool'){c.assert.equal(item.gate.status,'ALLOW');c.assert.deepEqual(item.executed[0],item.providerBoundary.decision);const oldDecision={...def.expected,arguments:{...def.expected.arguments,...def.oldArgument}};
  const oldGate=checkToolProvenance(oldDecision,def.request.message);c.assert.notEqual(oldGate.status,'ALLOW');proofs.push({id:item.id,liveGate:item.gate,actualExecutorDecisionUnmodified:true,hypotheticalOldDecision:oldDecision,hypotheticalOldGate:oldGate,proofTier:'OFFLINE hypothetical old-value rejection; actual LIVE raw was correct'});
 }else{const gate=checkToolProvenance(def.hypotheticalOldTool,def.request.message);c.assert.notEqual(gate.status,'ALLOW');proofs.push({id:item.id,liveGate:item.gate,hypotheticalOldGate:gate,proofTier:'LIVE model clarified; rejected-tool branch additionally verified OFFLINE, not injected into LIVE'});}
 summaries.push({id:item.id,status:item.status,rawNlu:item.rawNlu,safety:item.safety,assessment:item.assessment.status,origin:item.origins[0].origin,actualDecision:item.rawDecision,gate:item.gate,
  apiHttp:item.api.httpStatus,ollamaHttp:record.httpStatus,apiMs:item.api.elapsedMs,providerMs:item.traces.find(x=>x.event==='provider_completed').elapsedMs,nativePostHeadersMs:record.headersMs,nativePostBodyMs:record.bodyElapsedMs,
  ollamaTotalMs:e.total_duration/1e6,loadMs:e.load_duration/1e6,promptTokens:e.prompt_eval_count,cachedPromptTokens:e.prompt_eval_cached_count??null,outputTokens:e.eval_count,promptEvalMs:e.prompt_eval_duration/1e6,evalMs:e.eval_duration/1e6,
  providerCalls:item.providerCalls,readinessGetCount:item.readinessGetCount,ollamaPostCount:item.ollamaPostCount,toolCalls:item.executed.length,resourcesBefore:record.resourcesBefore,resourcesAfter:record.resourcesAfter,bodySha256:def.bodySha256});
}
const suites=['agentMissingSlotRecovery','agentSlotFillingPrompt','agentG1SafeContract','agentDecisionRouting','agentDecisionFormatSafety','agentFoundation','agentTransport','agentContractSlotInvestigation.g1-applicable'];
const regression=[];for(const layer of ['actual-policy','downstream-control'])for(const name of suites){const file='final-verified/'+layer+'-'+name+'.json',now=c.json(rel+file),prior=c.json(old+file);
 c.assert.deepEqual(now.results.map(x=>({name:x.name,status:x.status})),prior.results.map(x=>({name:x.name,status:x.status})),file);
 regression.push({layer,suite:name,passed:now.passed,failed:now.failed,notRun:now.notRun,caseNamesAndStatusesEqualBaseline:true,failures:now.results.filter(x=>x.status==='FAIL').map(x=>x.name)});}
for(const layer of ['actual-policy','downstream-control']){const file='final-verified/'+layer+'-diagnostics/offline-diagnostic-results.json',now=c.json(rel+file),prior=c.json(old+file);
 c.assert.deepEqual(now.results.map(x=>({id:x.id,status:x.status})),prior.results.map(x=>({id:x.id,status:x.status})),file);}
const execution=c.json(rel+'final-verified/execution.json').execution;
for(const name of ['new-completeness','new-execution-correction','readiness-33','actual-policy-diagnostics','downstream-control-diagnostics']){
 const now=execution.find(x=>x.name===name),prior=c.json(old+'final-verified/execution.json').execution.find(x=>x.name===name);c.assert.equal(now.passed,prior.passed);c.assert.equal(now.failed,prior.failed);}
const logs=c.json(rel+'native-log-window.json');c.assert.equal(logs.nativePostRows,5);c.assert.equal(run.nativePosts.length,5);c.assert.equal(run.nativePosts.filter(x=>!x.operator).length,4);c.assert.equal(run.dbAttempts,0);
const nativeIntents=c.fs.readdirSync(c.evidence).filter(x=>/^ollama-attempt-.*\.json$/.test(x));c.assert.equal(nativeIntents.length,5);
const operator=c.json(rel+'ollama-response-OP-LOAD.json');c.assert.equal(operator.envelope.done_reason,'load');c.assert.equal(operator.envelope.response,'');
const analysis={at:new Date().toISOString(),manifestSha256:lock.manifestSha256,status:'APPROVED_SCOPE_PROBE_PASS',deterministic:{pass:4,fail:0,notRun:0,nluPoints:0},live:{pass:4,fail:0,notRun:0,schemaPass:4,safetyPass:4,toolCalls:3},
 nativePosts:5,operatorLoadPosts:1,actualInferences:4,normalAgentTurns:run.quota.normalConsumed,conservativeLedgerRecent:run.quota.rateAfter.recent.length,remainingConservativeSlots:run.quota.rateAfter.remainingConservativeSlots,
 tokenTotals:{prompt:summaries.reduce((sum,x)=>sum+(x.promptTokens||0),0),output:summaries.reduce((sum,x)=>sum+(x.outputTokens||0),0)},summaries,
 operator:{http:operator.httpStatus,bodyMs:operator.bodyElapsedMs,doneReason:operator.envelope.done_reason,promptTokens:operator.envelope.prompt_eval_count??'NOT REPORTED',outputTokens:operator.envelope.eval_count??'NOT REPORTED',deadlineMs:60000,outsideAgentLimits:true},
 proofs,regression,db:'NOT ACCESSED; no fingerprint/fixture required',privacy:'Locked L bodies contain no principal UUID, synthetic auth email or Authorization header. No secrets captured. Local-only native transport, consent false, no behavioral data/persistence.',
 limitation:'Read-only executor and consent store are MOCK_ONLY. No actual Planner/Catalog/DB/Browser/V2/G2; no global closure of P1/P2. LIVE old-wrong-model-tool branch was not emitted; separate hypothetical gate checks remain offline.'};
c.write('analysis.json',analysis);
const after=c.snapshot(),before=c.json(rel+'integrity-before.json').hashes;c.assert.deepEqual(after,before);const checked=c.integrity();
for(const [file,hash]of Object.entries(lock.compiled))c.assert.equal(c.sha(c.read(file)),hash,file);
c.write('integrity-after.json',{at:new Date().toISOString(),status:'PASS',hashes:after,baselineFiles:Object.keys(before).length,unchanged:Object.keys(before).length,changed:[],addedOutsideTask:[],removed:[],compiledModuleHashes:lock.compiled,checked});
console.log(JSON.stringify({status:analysis.status,operator:analysis.operator,tokenTotals:analysis.tokenTotals,summaries:summaries.map(x=>({id:x.id,apiMs:x.apiMs,providerMs:x.providerMs,nativeMs:x.nativePostBodyMs,prompt:x.promptTokens,output:x.outputTokens,gate:x.gate,decision:x.actualDecision,bodySha256:x.bodySha256})),baselineFiles:Object.keys(before).length,regressionNamesAndStatuses:'UNCHANGED'}));
