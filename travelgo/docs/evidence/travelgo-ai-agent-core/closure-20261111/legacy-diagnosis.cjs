const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../../..'),read=f=>fs.readFileSync(path.join(root,f)),json=f=>JSON.parse(read(f)),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const before=json('docs/evidence/travelgo-ai-agent-core/closure-20261111/baseline.json'),old=json('docs/evidence/t-ai-04-g2-live-multi-turn-validation/final-verified/execution.json');
const definitions=[
 ['agentReadinessAbort','readiness-33','Current completeness correctly requires destinationCity AND dailyBudgetPerPerson; the old clarify-only expectation omits budget.'],
 ['agentG1SafeContract','actual-policy-agentG1SafeContract','Old transport parses init.body for every fetch, including readiness GET with no body. A new GET-aware fixture is required, not bypassing readiness.'],
 ['agentFoundation','actual-policy-agentFoundation','The historical shared chat fixture combines two intents. Current single-intent completeness blocks before provider/tool, so expected toolCalls=2 is obsolete for that input.'],
 ['agentDecisionFormatSafety','actual-policy-agentDecisionFormatSafety','The TEST_ONLY input cannot exercise malformed-model-output validation after current completeness/provenance; use a complete verified request and a valid readiness envelope.'],
 ['agentMissingSlotRecovery','actual-policy-agentMissingSlotRecovery','Old cases expect provider output before completeness checks; current contract resolves missing required roles before calling a provider.'],
 ['agentTransport','actual-policy-agentTransport','Raw old native fixture predates version/tags/ps readiness. Historical readiness-compatible fixture is separate and must not replace original assertions.']
];
const results=definitions.map(([suite,name,cause])=>{const file='backend/src/tests/'+suite+'.test.ts';return{suite,classification:'HISTORICAL_CONTRACT_OR_HARNESS_INCOMPATIBILITY_NOT_NEW_CORE_V2_REGRESSION',cause,testSourceUnchanged:sha(read(file))===before.hashes[file],historicalBeforeM1:{at:old.at,evidence:'docs/evidence/t-ai-04-g2-live-multi-turn-validation/final-verified/execution.json',execution:old.execution.find(e=>e.name===name)||null},originalM1Result:'FAIL_PRESERVED',newContractProposal:'agentLegacyCurrentContractV2.test.ts; separate probes, NOT original suite PASS'};});
const runtime=['agentService','registeredCatalogService'].map(n=>'backend/src/services/'+n+'.ts');
const guards=['currentCompleteness','currentTurnProof','liveProvider','ollamaReadiness','toolProvenance','requestLimits'].map(n=>'backend/src/agent/'+n+'.ts');
fs.writeFileSync(path.join(__dirname,'legacy-diagnosis.json'),JSON.stringify({at:new Date().toISOString(),results,unchangedRuntime:[...runtime,...guards].map(file=>({file,unchanged:sha(read(file))===before.hashes[file]})),productionLegacyFixes:0,assertionsChanged:0,originalCasesSkipped:0,newVersionedProbes:json('docs/evidence/travelgo-ai-agent-core/closure-20261111/legacy-v2-contracts-02.json')},null,2),{flag:'wx'});
console.log(JSON.stringify(results.map(r=>({suite:r.suite,oldAt:r.historicalBeforeM1.at,oldResult:r.historicalBeforeM1.execution,testUnchanged:r.testSourceUnchanged}))));
