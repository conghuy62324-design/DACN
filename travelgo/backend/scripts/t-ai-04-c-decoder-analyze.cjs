// Offline integrity and A/B aggregation. No model, tool, or database calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'docs/evidence/t-ai-04-c-decoder-investigation');
const runs=fs.readdirSync(base).filter(n=>n.startsWith('run-'));
const completed=runs.map(n=>path.join(base,n)).filter(p=>fs.existsSync(path.join(p,'results.json')));
assert.equal(completed.length,1);const run=completed[0];
const read=p=>JSON.parse(fs.readFileSync(p)),sha=b=>createHash('sha256').update(b).digest('hex');
const manifestBytes=fs.readFileSync(path.join(base,'diagnostic-manifest.json'));
const manifest=JSON.parse(manifestBytes),lock=read(path.join(base,'diagnostic-manifest-lock.json'));
assert.equal(sha(manifestBytes),lock.sha256);
const plan=read(path.join(run,'request-plan.json')),results=read(path.join(run,'results.json'));
assert.equal(plan.status,'LOCKED_BEFORE_INFERENCE');assert.equal(plan.manifestSha256,lock.sha256);
assert.equal(results.posts,8);assert.equal(results.cases.length,8);
const pairs=[];
for(let i=0;i<4;i++){
  const c=manifest.cases[i],row=plan.pairs[i];assert.equal(row.id,c.id);
  const a=read(path.join(run,`${c.id}-A-request.json`)),b=read(path.join(run,`${c.id}-B-request.json`));
  assert.equal(b.format,'json');assert.equal(a.format?.anyOf?.length,4);
  const aa=structuredClone(a),bb=structuredClone(b);delete aa.format;delete bb.format;
  assert.deepEqual(aa,bb);assert.deepEqual(Object.keys(a),Object.keys(b));
  assert.equal(sha(Buffer.from(JSON.stringify(a))),row.requestAsha256);
  assert.equal(sha(Buffer.from(JSON.stringify(b))),row.requestBsha256);
  assert.equal(sha(Buffer.from(JSON.stringify(aa))),row.commonBodySha256);
  assert.equal(sha(Buffer.from(a.messages[0].content)),row.systemSha256);
  assert.equal(sha(Buffer.from(JSON.stringify(a.messages))),row.messagesSha256);
  const ar=results.cases[2*i],br=results.cases[2*i+1];
  assert.equal(ar.id,`${c.id}-A`);assert.equal(br.id,`${c.id}-B`);
  assert.deepEqual(ar.expected,c.expected);assert.deepEqual(br.expected,c.expected);
  assert.deepEqual(read(path.join(run,`${c.id}-A.json`)),ar);
  assert.deepEqual(read(path.join(run,`${c.id}-B.json`)),br);
  assert.equal(read(path.join(run,`attempt-${c.id}-A.json`)).requestSha256,row.requestAsha256);
  assert.equal(read(path.join(run,`attempt-${c.id}-B.json`)).requestSha256,row.requestBsha256);
  assert.equal(ar.systemSha256,br.systemSha256);assert.equal(ar.messagesSha256,br.messagesSha256);
  assert.equal(ar.promptTokens,br.promptTokens);
  pairs.push({id:c.id,expected:c.expected,
    A:{status:ar.status,raw:ar.rawContent,decision:ar.decision,jsonValid:ar.jsonValid,
      schemaValid:ar.schemaValid,runtimeValid:ar.runtimeValid,latencyMs:ar.latencyMs,
      promptTokens:ar.promptTokens,outputTokens:ar.outputTokens,failureCategory:ar.failureCategory},
    B:{status:br.status,raw:br.rawContent,decision:br.decision,jsonValid:br.jsonValid,
      schemaValid:br.schemaValid,runtimeValid:br.runtimeValid,latencyMs:br.latencyMs,
      promptTokens:br.promptTokens,outputTokens:br.outputTokens,failureCategory:br.failureCategory},
    onlyRequestDifference:'format',commonBodySha256:row.commonBodySha256,
    sameSystemHash:true,sameMessagesHash:true,samePromptTokenCount:true});
}
const before=read(path.join(run,'source-integrity-before.json'));
const after=read(path.join(run,'source-integrity-after.json'));
assert.equal(before.status,'PASS');assert.equal(after.status,'PASS');
assert.equal(before.referenceFiles,3960);assert.equal(after.referenceFiles,3960);
const fix=read(path.join(root,'docs/evidence/t-ai-04-a-fix/source-integrity.json'));
const v2='docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json';
const v2lock='docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json';
assert.equal(sha(fs.readFileSync(path.join(root,v2))),fix.manifestSha256);
assert.equal(sha(fs.readFileSync(path.join(root,v2lock))),fix.lockSha256);
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
const priorProbe='docs/evidence/t-ai-04-b-live-probe/run-20261109T031033039Z-28a4545e';
const prior=read(path.join(root,priorProbe,'results.json'));
assert.equal(prior.posts??prior.inferencePosts,5);
for(let i=1;i<=5;i++)assert.deepEqual(read(path.join(root,priorProbe,`P0${i}.json`)),prior.cases[i-1]);
const by=v=>results.cases.filter(c=>c.variant===v),group=v=>({pass:by(v).filter(c=>c.status==='PASS').length,
  fail:by(v).filter(c=>c.status==='FAIL').length,notRun:by(v).filter(c=>c.status==='NOT RUN').length,
  jsonValid:by(v).filter(c=>c.jsonValid).length,schemaValid:by(v).filter(c=>c.schemaValid).length,
  runtimeValid:by(v).filter(c=>c.runtimeValid).length});
const latency=results.cases.map(c=>c.latencyMs).sort((a,b)=>a-b);
const output={status:'COMPLETE_FORMAT_EFFECT_SUPPORTED_NOT_PROVEN_UNIQUE',manifestSha256:lock.sha256,
  benchmarkV2Sha256:fix.manifestSha256,posts:results.posts,results:{A:group('A'),B:group('B'),
    total:{pass:results.pass,fail:results.fail,notRun:results.notRun}},
  rawKinds:{A:by('A').map(c=>c.decision?.kind||null),B:by('B').map(c=>c.decision?.kind||null)},
  tokens:{prompt:results.cases.reduce((n,c)=>n+(c.promptTokens||0),0),output:results.cases.reduce((n,c)=>n+(c.outputTokens||0),0)},
  latencyMs:{min:latency[0],median:(latency[3]+latency[4])/2,max:latency[7],
    mean:Math.round(latency.reduce((a,b)=>a+b,0)/8)},
  allPairsDifferOnlyInFormat:true,toolExecutions:0,databaseAccess:'NONE',sourceIntegrity:{before,after},
  baselineEvidenceIntact:true,pairs};
fs.writeFileSync(path.join(run,'analysis.json'),JSON.stringify(output,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({run:path.relative(root,run).replaceAll('\\','/'),posts:output.posts,results:output.results,
  tokens:output.tokens,latencyMs:output.latencyMs,allPairsDifferOnlyInFormat:true}));
