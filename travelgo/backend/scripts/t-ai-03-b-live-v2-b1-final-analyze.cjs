// Read-only consolidation of the immutable B1 20-case run and the four-case resume.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..');
const oldRun=path.join(root,'docs/evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0');
const finalRoot=path.join(root,'docs/evidence/t-ai-03-b-live-v2-b1-final');
const [runName]=fs.readdirSync(finalRoot).filter(n=>n.startsWith('run-'));
assert.ok(runName,'Resume run missing');
assert.equal(fs.readdirSync(finalRoot).filter(n=>n.startsWith('run-')).length,1,'Unexpected extra resume run');
const run=path.join(finalRoot,runName),read=p=>JSON.parse(fs.readFileSync(p));
const sha=b=>createHash('sha256').update(b).digest('hex');
const old=read(path.join(oldRun,'results.json')),fresh=read(path.join(run,'results.json'));
const manifestPath=path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json');
const manifest=read(manifestPath),lock=read(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json'));
assert.equal(sha(fs.readFileSync(manifestPath)),lock.sha256);
assert.equal(lock.sha256,'0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(old.inferencePosts,20);assert.equal(fresh.inferencePosts,4);
assert.equal(old.cases.length,24);assert.equal(fresh.cases.length,4);
const oldCheck=read(path.join(run,'old-evidence-check.json'));
assert.equal(sha(fs.readFileSync(path.join(oldRun,'results.json'))),oldCheck.oldResultsSha256);
for(let i=0;i<20;i++){
  const id=`VI${String(i+1).padStart(2,'0')}`;
  assert.equal(sha(fs.readFileSync(path.join(oldRun,`${id}.json`))),oldCheck.caseSha256[id]);
}
const cases=[...old.cases.slice(0,20),...fresh.cases];
for(let i=0;i<24;i++){
  const c=cases[i],m=manifest.cases[i],id=`VI${String(i+1).padStart(2,'0')}`;
  assert.equal(c.id,id);assert.equal(m.id,id);
  assert.deepEqual(c.expected,m.expected);
  assert.equal(c.requestSha256,sha(Buffer.from(JSON.stringify(m.request),'utf8')));
  assert.ok(['PASS','FAIL'].includes(c.status));
  assert.equal(c.httpStatus,200);
  assert.equal(c.providerDecisionParsed,true);
  assert.equal(c.metrics.schemaValid,true);
  if(i>=20)assert.equal(read(path.join(run,`attempt-${id}.json`)).id,id);
}
const compare=read(path.join(run,'fingerprint-compare-compare.log'));
assert.deepEqual(compare,{result:'PASS',database:'travelgo_ai_m0_test',tables:25,changed:[]});
const sourceBefore=read(path.join(run,'source-integrity-before.json'));
const sourceAfter=read(path.join(run,'source-integrity-after.json'));
assert.equal(sourceBefore.status,'PASS');assert.equal(sourceAfter.status,'PASS');
assert.equal(sourceBefore.referenceFiles,3960);assert.equal(sourceAfter.referenceFiles,3960);
const db=read(path.join(run,'db-preflight.json'));
assert.equal(db.database,'travelgo_ai_m0_test');assert.equal(db.read_only,'on');
assert.equal(db.sentinel,'PASS');assert.equal(db.migrations.length,12);
assert.equal(db.historicalTripSessions,27);assert.equal(db.writes,0);
const metric=(rows,predicate)=>({pass:rows.filter(predicate).length,total:rows.length});
const byKind=kind=>cases.filter((_,i)=>manifest.cases[i].expected.kind===kind);
const latencies=cases.map(c=>c.latencyMs).sort((a,b)=>a-b);
const sum=(field)=>cases.reduce((n,c)=>n+(c.usage?.[field]||0),0);
const analysis={status:'COMPLETE_WITH_NLU_FAIL',benchmarkSha256:lock.sha256,
  oldRun:path.relative(root,oldRun).replaceAll('\\','/'),resumeRun:path.relative(root,run).replaceAll('\\','/'),
  oldEvidenceIntact:true,sourceIntegrity:{referenceFiles:3960,changed:[]},
  counts:{total:24,pass:cases.filter(c=>c.status==='PASS').length,fail:cases.filter(c=>c.status==='FAIL').length,
    notRun:0,ollamaPosts:old.inferencePosts+fresh.inferencePosts,http200:cases.filter(c=>c.httpStatus===200).length,
    schemaValid:cases.filter(c=>c.metrics.schemaValid).length,unsupportedDecision:cases.filter(c=>c.decision?.kind==='unsupported').length,
    toolCalls:cases.reduce((n,c)=>n+c.toolCalls,0)},
  groups:{tool:metric(byKind('tool'),c=>c.status==='PASS'),
    clarify:metric(byKind('clarify'),c=>c.status==='PASS'),
    unsupported:metric(byKind('unsupported'),c=>c.status==='PASS'),
    multiTurn:metric(cases.filter((_,i)=>Array.isArray(manifest.cases[i].request.history)),c=>c.status==='PASS')},
  toolFidelity:{evaluatedCalls:cases.reduce((n,c)=>n+c.toolCalls,0),note:'No tool invocation; Catalog/Planner output fidelity not evaluable'},
  tokens:{prompt:sum('promptTokens'),output:sum('outputTokens')},
  latencyMs:{min:latencies[0],median:(latencies[11]+latencies[12])/2,p95NearestRank:latencies[Math.ceil(.95*24)-1],
    max:latencies[23],mean:Math.round(latencies.reduce((a,b)=>a+b,0)/24),allSorted:latencies},
  database:{...compare,historicalTripSessions:db.historicalTripSessions,migrationChecksums:db.migrations.length,writes:db.writes},
  cases:cases.map(c=>({id:c.id,expected:c.expected,actual:c.decision,status:c.status,httpStatus:c.httpStatus,
    latencyMs:c.latencyMs,promptTokens:c.usage.promptTokens,outputTokens:c.usage.outputTokens,
    toolCalls:c.toolCalls,reason:c.reason,source:c.id<='VI20'?'B1':'RESUME'}))};
const out=path.join(run,'analysis.json');fs.writeFileSync(out,JSON.stringify(analysis,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({run:analysis.resumeRun,counts:analysis.counts,groups:analysis.groups,tokens:analysis.tokens,latencyMs:analysis.latencyMs}));
