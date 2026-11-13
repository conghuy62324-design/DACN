const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../../../..'),read=f=>JSON.parse(fs.readFileSync(path.join(root,f)));
const review=read('docs/evidence/travelgo-ai-agent-core/closure-20261111/legacy-diagnosis.json');
for(const row of review.results){const old=row.historicalBeforeM1.execution;
 row.historicalInterpretation=old?.exitCode===0?'Historical result used readiness compatibility shim; this PASS is NOT evidence that the original raw fixture passed.':'Historical run before M1 already had contract incompatibilities; preserve exact failed cases.';
 if(row.suite==='agentG1SafeContract')row.classification='RAW_FIXTURE_LACKS_READINESS_METADATA_HISTORICAL_COMPATIBILITY_SHIM_26_PASS';
 if(row.suite==='agentDecisionFormatSafety'){row.classification='RAW_FIXTURE_LACKS_READINESS_METADATA_HISTORICAL_COMPATIBILITY_SHIM_17_PASS';row.cause='First current failure occurs in a raw fake transport predating readiness GET/envelope handling, before the intended invalid-decision assertion. Historical shim passed17/17. The v2 proposal isolates malformed decision validation using complete current input and GET-aware, token-count-bearing envelopes; original assertions stay untouched.';}
 const f='docs/evidence/t-ai-04-g2-live-multi-turn-validation/final-verified/actual-policy-'+row.suite+'.json';if(fs.existsSync(path.join(root,f)))row.historicalFailedCases=read(f).results.filter(r=>r.status==='FAIL').map(r=>({name:r.name,error:r.error}));
}
review.reviewedAt=new Date().toISOString();review.verdict='DO_NOT_RELABEL_ORIGINAL_FAILS_AS_GREEN';
fs.writeFileSync(path.join(__dirname,'legacy-diagnosis-reviewed.json'),JSON.stringify(review,null,2),{flag:'wx'});
