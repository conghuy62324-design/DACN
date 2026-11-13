// Read-only consolidation after the five approved local inferences.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'docs/evidence/t-ai-04-b-live-probe');
const runs=fs.readdirSync(base).filter(n=>n.startsWith('run-'));
assert.equal(runs.length,1);const run=path.join(base,runs[0]);
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=fs.readFileSync(path.join(base,'technical-cases.json'));
const manifest=JSON.parse(manifestBytes),lock=read(path.join(base,'technical-cases-lock.json'));
assert.equal(sha(manifestBytes),lock.sha256);
const results=read(path.join(run,'results.json'));
assert.equal(results.probeSha256,lock.sha256);assert.equal(results.inferencePosts,5);
assert.equal(results.cases.length,5);
for(let i=0;i<5;i++){
  const id=`P0${i+1}`,c=results.cases[i],m=manifest.cases[i];
  assert.equal(c.id,id);assert.equal(m.id,id);assert.deepEqual(c.expected,m.expected);
  assert.equal(c.requestSha256,sha(Buffer.from(JSON.stringify(m.request),'utf8')));
  assert.deepEqual(read(path.join(run,`${id}.json`)),c);
  assert.equal(read(path.join(run,`attempt-${id}.json`)).id,id);
}
const compare=read(path.join(run,'fingerprint-compare-compare.log'));
assert.deepEqual(compare,{result:'PASS',database:'travelgo_ai_m0_test',tables:25,changed:[]});
const db=read(path.join(run,'db-preflight.json'));
assert.equal(db.database,'travelgo_ai_m0_test');assert.equal(db.read_only,'on');
assert.equal(db.sentinel,'PASS');assert.equal(db.migrations.length,12);
assert.equal(db.historicalTripSessions,27);assert.equal(db.writes,0);
const before=read(path.join(run,'source-integrity-before.json'));
const after=read(path.join(run,'source-integrity-after.json'));
assert.equal(before.status,'PASS');assert.equal(after.status,'PASS');
const fix=read(path.join(root,'docs/evidence/t-ai-04-a-fix/source-integrity.json'));
const oldRun='docs/evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0';
const finalRun='docs/evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b';
const oldCheck=read(path.join(root,finalRun,'old-evidence-check.json'));
assert.equal(sha(fs.readFileSync(path.join(root,oldRun,'results.json'))),fix.oldB1ResultsSha256);
for(let i=1;i<=20;i++){
  const id=`VI${String(i).padStart(2,'0')}`;
  assert.equal(sha(fs.readFileSync(path.join(root,oldRun,`${id}.json`))),oldCheck.caseSha256[id]);
}
assert.equal(sha(fs.readFileSync(path.join(root,finalRun,'results.json'))),fix.finalResumeResultsSha256);
const final=read(path.join(root,finalRun,'results.json'));
for(let i=21;i<=24;i++)assert.deepEqual(read(path.join(root,finalRun,`VI${i}.json`)),final.cases[i-21]);
const v2='docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json';
const v2lock='docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json';
assert.equal(sha(fs.readFileSync(path.join(root,v2))),fix.manifestSha256);
assert.equal(sha(fs.readFileSync(path.join(root,v2lock))),fix.lockSha256);
const cases=results.cases,latencies=cases.map(c=>c.latencyMs).sort((a,b)=>a-b);
const nluCorrect=cases.filter(c=>c.metrics.toolSelection&&
  (c.expected.kind!=='tool'||c.metrics.argumentCorrectness)&&
  (c.expected.kind!=='clarify'||c.metrics.missingFieldHandling)).length;
const analysis={status:'COMPLETE_DECISION_COLLAPSE_PERSISTS',probeSha256:lock.sha256,
  benchmarkV2Sha256:fix.manifestSha256,baselineEvidenceIntact:true,
  counts:{total:5,pass:results.pass,fail:results.fail,notRun:results.notRun,inferencePosts:results.inferencePosts,
    http200:cases.filter(c=>c.httpStatus===200).length,schemaValid:cases.filter(c=>c.metrics.schemaValid).length,
    rawJsonValid:cases.filter(c=>c.usage?.rawJsonValid).length,unsupportedDecision:cases.filter(c=>c.decision?.kind==='unsupported').length,
    nluCorrect,supportedIntentCorrect:cases.slice(0,3).filter(c=>c.status==='PASS').length,
    unsupportedCorrect:cases.slice(3).filter(c=>c.status==='PASS').length,
    toolCalls:cases.reduce((n,c)=>n+c.toolCalls,0)},
  tokens:{prompt:cases.reduce((n,c)=>n+c.usage.promptTokens,0),output:cases.reduce((n,c)=>n+c.usage.outputTokens,0)},
  latencyMs:{min:latencies[0],median:latencies[2],max:latencies[4],mean:Math.round(latencies.reduce((a,b)=>a+b,0)/5)},
  database:{fingerprint:compare,historicalTripSessions:db.historicalTripSessions,migrations:db.migrations.length,fixtureWrites:0},
  sourceIntegrity:{referenceFiles:before.referenceFiles,changedBefore:before.changed,changedAfter:after.changed},
  cases:cases.map(c=>({id:c.id,status:c.status,expected:c.expected,decision:c.decision,
    httpStatus:c.httpStatus,schemaValid:c.metrics.schemaValid,rawJsonValid:c.usage?.rawJsonValid,
    toolCalls:c.toolCalls,toolStatus:c.toolStatus,toolWarningCode:c.toolWarningCode,
    latencyMs:c.latencyMs,promptTokens:c.usage?.promptTokens,outputTokens:c.usage?.outputTokens,
    failureCategory:c.failureCategory}))};
const out=path.join(run,'analysis.json');fs.writeFileSync(out,JSON.stringify(analysis,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({run:path.relative(root,run).replaceAll('\\','/'),counts:analysis.counts,tokens:analysis.tokens,latencyMs:analysis.latencyMs}));
