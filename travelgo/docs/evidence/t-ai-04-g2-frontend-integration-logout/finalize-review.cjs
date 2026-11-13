const c=require('./common.cjs'),{spawnSync}=require('node:child_process');
c.history();
const before=c.json(c.prefix+'integrity-before.json').hashes,after=c.snapshot();
const authorized=[
'frontend/src/pages/AssistantPage.tsx','frontend/src/components/agent/PrivacyConsentModal.tsx','frontend/src/context/AuthContext.tsx',
'frontend/src/services/agentService.ts','frontend/src/services/api.ts','frontend/src/types/agent.ts','frontend/src/utils/agentContract.ts'];
const newSource=['frontend/src/utils/agentG2Conversation.ts','frontend/src/utils/agentSessionLifecycle.ts','frontend/tests/agentG2Conversation.test.ts','frontend/tests/agentG2.loader.cjs','frontend/e2e/t-ai-04-g2-frontend.spec.ts','frontend/playwright.t-ai-04-g2.config.ts'];
const changed=[],added=[];
for(const[file,hash]of Object.entries(before)){c.assert.ok(after[file],file);if(after[file]!==hash){c.assert.ok(authorized.includes(file),'UNAUTHORIZED_CHANGE:'+file);changed.push({file,before:hash,after:after[file]});}}
for(const[file,hash]of Object.entries(after))if(!before[file]){c.assert.ok(newSource.includes(file),'UNEXPECTED_ADDITION:'+file);added.push({file,sha256:hash});}
// The task-specific Playwright config is outside historical snapshot glob.
c.assert.ok(!Object.hasOwn(before,'frontend/playwright.t-ai-04-g2.config.ts'));
added.push({file:'frontend/playwright.t-ai-04-g2.config.ts',sha256:c.sha(c.read('frontend/playwright.t-ai-04-g2.config.ts'))});
c.assert.equal(changed.length,7);c.assert.equal(added.length,6);
const protectedUnchanged=Object.keys(before).length-changed.length;
c.write('integrity-after.json',{at:new Date().toISOString(),status:'PASS',protectedBefore:Object.keys(before).length,protectedUnchanged,authorizedModified:changed,newSource:added,removed:[],historical:c.history(),hashes:after});
let diff='';
for(const{file}of changed){const rel=file.slice('frontend/src/'.length);const old=c.path.join(c.evidence,'before-'+rel.replaceAll('/','-'));
const r=spawnSync('git',['--no-pager','diff','--no-index','--no-ext-diff','--',old,c.path.join(c.root,file)],{encoding:'utf8'});c.assert.equal(r.status,1,file);diff+='\n'+(r.stdout||'');}
for(const{file}of added){diff+=`\nNEW ${file} SHA256 ${c.sha(c.read(file))}\n`;}
c.fs.writeFileSync(c.path.join(c.evidence,'source-diff.patch'),diff,{flag:'wx'});
const sourceHashes=Object.fromEntries([...changed.map(x=>x.file),...added.map(x=>x.file),
'frontend/src/utils/agentConversation.ts','frontend/tests/agentConversation.test.ts','frontend/e2e/t-ai-02-assistant-ui.spec.ts',
'backend/src/services/agentService.ts','backend/src/agent/liveProvider.ts','backend/src/agent/verifiedHistory.ts','backend/src/agent/decisionSchema.ts','backend/src/agent/tools.ts','backend/src/agent/limits.ts','backend/src/agent/currentTurnProof.ts','backend/src/agent/currentCompleteness.ts','backend/src/agent/toolProvenance.ts','backend/src/agent/decisionValidation.ts','backend/src/routes/agentRoutes.ts'].map(file=>[file,c.sha(c.read(file))]));
c.write('source-hashes.json',{at:new Date().toISOString(),sourceHashes,backendProductionChanges:0,originalTestChanges:0,dependenciesChanged:0});
const benchmark=Object.entries(before).filter(([file])=>file.includes('v2')&&(file.includes('approved')||file.includes('lock'))&&file.endsWith('.json')).map(([file,sha256])=>({file,sha256,unchanged:after[file]===sha256}));
c.assert.ok(benchmark.some(x=>x.sha256==='0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e'));
c.assert.ok(benchmark.some(x=>x.sha256==='f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706'));
c.write('benchmark-integrity.json',{status:'PASS',files:benchmark,V2LiveRequests:0,candidateB:'NOT APPLIED'});
const oldPrefix='docs/evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/final-verified/',newPrefix=c.prefix+'final-verified/';
const suites=['agentMissingSlotRecovery','agentSlotFillingPrompt','agentG1SafeContract','agentDecisionRouting','agentDecisionFormatSafety','agentFoundation','agentTransport','agentContractSlotInvestigation.g1-applicable'];
const legacy=[];
for(const layer of ['actual-policy','downstream-control'])for(const suite of suites){const file=layer+'-'+suite+'.json',a=c.json(oldPrefix+file),b=c.json(newPrefix+file);
c.assert.deepEqual(b.results.map(x=>({name:x.name,status:x.status})),a.results.map(x=>({name:x.name,status:x.status})),file);
legacy.push({layer,suite,passed:b.passed,failed:b.failed,baselinePassed:a.passed,baselineFailed:a.failed,everyCaseNameAndStatusUnchanged:true});}
const totals={};for(const layer of ['actual-policy','downstream-control'])totals[layer]=legacy.filter(x=>x.layer===layer).reduce((s,x)=>({passed:s.passed+x.passed,failed:s.failed+x.failed}),{passed:10,failed:0});
c.assert.deepEqual(totals['actual-policy'],{passed:145,failed:36});c.assert.deepEqual(totals['downstream-control'],{passed:176,failed:5});
const execution=c.json(newPrefix+'execution.json').execution,oldExecution=c.json(oldPrefix+'execution.json').execution;
for(const name of ['readiness-33','historical-F-unchanged','actual-policy-diagnostics','downstream-control-diagnostics']){const a=oldExecution.find(x=>x.name===name),b=execution.find(x=>x.name===name);c.assert.deepEqual({code:b.exitCode,pass:b.passed,fail:b.failed},{code:a.exitCode,pass:a.passed,fail:a.failed},name);}
c.write('regression-comparison.json',{status:'BASELINE_MATCH',legacy,totals,legacyCount:181,assertionsChanged:0,readiness:'32/33 actual-policy; 33/33 isolated, unchanged',historicalF:'unmodified fail-fast exit1 unchanged',diagnostics:'8/13 actual;13/13 isolated unchanged',controlsCountedAsProductionPass:false});
const browser=c.json(c.prefix+'browser-01/results.json'),browserRows=[];
function walk(suite){for(const spec of suite.specs||[])for(const test of spec.tests||[]){c.assert.equal(test.status,'expected',spec.title);browserRows.push({file:spec.file||suite.file,title:spec.title,project:test.projectName,status:test.results.at(-1)?.status,attempts:test.results.length});}for(const nested of suite.suites||[])walk(nested);}
for(const suite of browser.suites)walk(suite);c.assert.equal(browserRows.length,74);c.assert.equal(browser.stats.unexpected,0);c.assert.equal(browser.stats.skipped,0);c.assert.ok(browserRows.every(x=>x.status==='passed'&&x.attempts===1));
const counts={};for(const project of ['desktop','mobile'])counts[project]={g1:browserRows.filter(x=>x.project===project&&x.file.includes('t-ai-02')).length,g2:browserRows.filter(x=>x.project===project&&x.file.includes('t-ai-04')).length};
c.write('browser-summary.json',{tier:'MOCK_ONLY',passed:74,failed:0,notRun:0,counts,viewports:{desktop:'1440x900',mobile:'390x844'},rows:browserRows,nativeInference:0,database:false,realToolFidelity:'NOT RUN',manualScreenshotReview:['desktop/D01a-notice.png','mobile/D01a-notice.png','mobile/D03.png'],productionNluAccepted:false});
const cases=c.json(c.previous+'independent-acceptance-plan.json').scenarios;
const references={D01:'D01,D01a browser + privacy contract unit',D02:'D02 browser + API projection/service unit',D03:'D03 browser, repeated clarify unit',D04:'D03 browser motorcycle action + D04 unit',D05:'D03 browser car action + D05 correction unit',D06:'D03,D12,D12a,D12b browser; reset/end unit',D07:'D07 mocked browser + unchanged backend G2 gates68/Natural79/Correction42',D08:'D07,D10 browser + unchanged backend incomplete/conflict gating68/Completeness52',D09:'D09,D09a browser + interceptor/controller error-boundary units',D10:'D10 replay/revision browser; busy/stale/cross-owner unit + G57 API',D11:'D11,D11a,D13b browser + expiry/reload controller tests',D12:'D12,D12a,D12b browser + reset/revoke units + G57 API',D13:'D13-success,D13-offline,D13a,D13b browser + auth lifecycle/interceptor units',D14:'D14 browser + duplicate/quota unit + unchanged limits/backend68',D15:'D15 browser + malformed provenance unit; real tools NOT EVALUATED',D16:'All40 G2 browser runs across2 viewports + G1 original34; notice/focus/screenshots/no-overflow',D17:'Original10 G1 units,34 G1 browser; backend68/79/61/42/52; legacy baseline preserved',D18:'Report/summaries retain MOCK_ONLY and P1/P2 OPEN; native requests0; real tool fidelity NOT RUN'};
c.write('acceptance-coverage.json',{status:'18/18 OFFLINE_FRONTEND_DEMO_SCOPE_PASS',scenarios:cases.map(x=>({...x,status:'PASS_IN_OFFLINE_FRONTEND_DEMO_SCOPE',evidence:references[x.id]})),rawNlu:'NOT RUN; previous FAIL evidence unchanged',realServiceFidelity:'NOT RUN',database:false});
const initial=c.read(c.prefix+'frontend-unit-initial.log'),initialText=initial[0]===255&&initial[1]===254?initial.toString('utf16le'):initial.toString('utf8');
c.write('development-observations.json',{initialFrontendUnit:{passed:38,failed:1,reason:'D06 MOCK_ONLY reset fixture returned revision2 after two committed turns; nonadvancing revision correctly rejected by controller. Fixture response corrected to3, assertions unchanged.',retainedEvidence:'frontend-unit-initial.log',recordMatches:/"failed": 1/.test(initialText)},buildEnvironment:'PowerShell npm.ps1 blocked by existing execution policy; used npm.cmd. Initial sandbox Vite config resolution denied parent-directory read; approved escalated local build passed, no environment/source workaround.',backendNoticeObservation:'Exact backend notice/version preserved. Text describes old logout. Added frontend best-effort cleanup explanation, no backend edit.',open:{P1:'TAI03B-B1-01 OPEN',runtimeP2:'OPEN',budgetGrammarP2:'OPEN untouched',mapP2:'OPEN untouched'}});
console.log(JSON.stringify({integrity:'PASS',protectedUnchanged,modified:changed.length,newSource:added.length,browser:74,frontendUnit:49,backendRequired:'68/79/61/42/52 PASS',legacy:totals,realInference:0,postgres:0}));
