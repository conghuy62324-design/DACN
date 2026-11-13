// Validates the owner-approved V2 benchmark without inference, API, or DB writes.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'docs/evidence/t-ai-03-b-v2-lock');
const p={
  v1:path.join(root,'docs/evidence/t-ai-01-b/nlu-manifest.json'),
  v1Lock:path.join(root,'docs/evidence/t-ai-01-b/nlu-manifest-lock.json'),
  draft:path.join(root,'docs/evidence/t-ai-03-b-unblock/nlu-manifest-v2-draft.json'),
  candidate:path.join(root,'docs/evidence/t-ai-03-b-v2-finalize/nlu-manifest-v2-candidate.json'),
  provenance:path.join(root,'docs/evidence/t-ai-03-b-v2-finalize/nlu-v2-candidate-provenance.json'),
  approved:path.join(out,'nlu-manifest-v2-approved.json'),
  lock:path.join(out,'nlu-manifest-v2-lock.json'),
  decision:path.join(out,'approval-decision.json')
};
const bytes=Object.fromEntries(Object.entries(p).map(([k,v])=>[k,fs.readFileSync(v)]));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const json=Object.fromEntries(Object.entries(bytes).map(([k,v])=>[k,JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(v))]));
const {v1,v1Lock,draft,candidate,provenance,approved,lock,decision}=json;
const {AGENT_TOOLS,FIELD_LABELS,parseDecision,validateTool}=require('../dist/agent/tools.js');
const {readConversation}=require('../dist/agent/conversation.js');
const checks=[];
function check(name,fn){try{fn();checks.push({name,status:'PASS'});}catch(e){checks.push({name,status:'FAIL',error:String(e.message)});}}
check('Historical V1, draft and approved candidate hashes',()=>{
  assert.equal(sha(bytes.v1),v1Lock.sha256);
  assert.equal(sha(bytes.v1),'e4369315ef9f0ded9943614438116bb897364593899e787cbc256b60f966e081');
  assert.equal(sha(bytes.draft),'6bc1afaae17d9ecb973aab9c6331faa7beace7b09035d8a4bbec20e4ef82f5fb');
  assert.equal(sha(bytes.candidate),'5f5a037239a5ddc7bee7b9c3a7f918c404b9a350a142698ed2d79a2ae553f33c');
  assert.equal(v1.cases.length,28);assert.equal(draft.cases.length,24);
});
check('V2 approval and lock checksums',()=>{
  assert.equal(approved.version,'T_AI_03_B_VI_V2_APPROVED');
  assert.equal(approved.approvalStatus,'APPROVED');
  assert.equal(lock.status,'APPROVED_LOCKED');
  assert.equal(lock.sha256,sha(bytes.approved));
  assert.equal(lock.candidateSha256,sha(bytes.candidate));
  assert.equal(lock.approvalDecisionSha256,sha(bytes.decision));
  assert.equal(lock.candidateProvenanceSha256,sha(bytes.provenance));
  assert.equal(lock.sourceV1Sha256,sha(bytes.v1));
  assert.equal(lock.liveCases,24);assert.equal(lock.mockFaultCases,0);
  assert.equal(decision.decision,'APPROVED');
  assert.equal(decision.candidateSha256,sha(bytes.candidate));
  assert.equal(decision.approvedManifestSha256,sha(bytes.approved));
  assert.equal(decision.provenanceSha256,sha(bytes.provenance));
  assert.equal(decision.classification,'RECONSTRUCTED_BENCHMARK_NOT_VERBATIM_V1');
});
check('Approved content equals candidate criteria and all 24 cases',()=>{
  assert.deepEqual(approved.criteria,candidate.criteria);
  assert.deepEqual(approved.cases,candidate.cases);
  assert.equal(approved.sourceManifestSha256,candidate.sourceManifestSha256);
  const expectedText=bytes.candidate.toString('utf8')
    .replace('"version": "T_AI_03_B_VI_V2_CANDIDATE"','"version": "T_AI_03_B_VI_V2_APPROVED"')
    .replace('"approvalStatus": "PENDING_OWNER_REVIEW"','"approvalStatus": "APPROVED"');
  assert.equal(bytes.approved.toString('utf8'),expectedText,'Unexpected byte edits outside metadata');
});
check('24 unique LIVE IDs and no duplicate request',()=>{
  assert.deepEqual(approved.cases.map(c=>c.id),Array.from({length:24},(_,i)=>`VI${String(i+1).padStart(2,'0')}`));
  assert.ok(approved.cases.every(c=>c.tier==='LIVE_LLM'));
  const normalized=approved.cases.map(c=>c.request.message.normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('vi-VN'));
  assert.equal(new Set(normalized).size,24);
});
check('Strict UTF-8, NFC, complete case schema, no replacement markers',()=>{
  function inspect(x,p){
    if(typeof x==='string'){assert.equal(x,x.normalize('NFC'),`${p} not NFC`);assert.ok(!/[?\uFFFD]/u.test(x),`${p} replacement marker`);}
    else if(Array.isArray(x))x.forEach((v,i)=>inspect(v,`${p}[${i}]`));
    else if(x&&typeof x==='object')for(const [k,v]of Object.entries(x))inspect(v,`${p}.${k}`);
  }
  inspect(approved,'approved');
  for(const c of approved.cases){
    assert.deepEqual(Object.keys(c).sort(),['id','tier','title','request','expected','toolOutcome'].sort());
    assert.ok(c.title.trim()&&c.request.message.trim());
    readConversation(c.request);
  }
});
check('Current Agent decision and tool contract accepts all expected',()=>{
  for(const c of approved.cases){
    const d=parseDecision(c.expected);assert.deepEqual(d,c.expected);
    if(d.kind==='tool'){
      assert.ok(AGENT_TOOLS.some(t=>t.name===d.name));
      assert.deepEqual(validateTool(d).missing,[],c.id);
    }else if(d.kind==='clarify')assert.ok(d.fields.every(f=>Object.hasOwn(FIELD_LABELS,f)));
  }
  assert.equal(approved.cases.filter(c=>c.expected.kind==='tool').length,13);
  assert.equal(approved.cases.filter(c=>c.expected.kind==='clarify').length,8);
  assert.equal(approved.cases.filter(c=>c.expected.kind==='unsupported').length,3);
});
check('Provenance covers 24 cases and records proposed VI16',()=>{
  assert.deepEqual(Object.keys(provenance.cases),approved.cases.map(c=>c.id));
  assert.equal(provenance.cases.VI16.fields['request.message'],'PROPOSED_RECONSTRUCTION');
  assert.equal(provenance.cases.VI16.candidateRevision.verbatimV1Recovery,false);
  assert.ok(provenance.cases.VI16.candidateRevision.source.includes('T-AI-03-B-V2-FINALIZE'));
  for(const c of approved.cases){
    const fields=provenance.cases[c.id].fields;
    const required=['id','tier','title','request.message','expected.kind','toolOutcome'];
    if(c.expected.name)required.push('expected.name');
    if(c.expected.fields)required.push('expected.fields');
    if(c.expected.arguments)required.push(...Object.keys(c.expected.arguments).map(k=>`expected.arguments.${k}`));
    if(c.request.history)c.request.history.forEach((_,i)=>required.push(`request.history[${i}].role`,`request.history[${i}].content`));
    assert.deepEqual(Object.keys(fields).sort(),required.sort(),c.id);
    assert.equal(provenance.cases[c.id].exactOriginalVietnameseRecovered,false);
  }
});
check('Approved, lock and approval decision files are read-only',()=>{
  for(const file of [p.approved,p.lock,p.decision])assert.equal(fs.statSync(file).mode&0o222,0,file);
});
const result={status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL',checks,hashes:Object.fromEntries(Object.entries(bytes).map(([k,b])=>[k,sha(b)])),
  caseCounts:{live:approved.cases.length,tool:13,clarify:8,unsupported:3},duplicateRequests:0,
  benchmarkClassification:'RECONSTRUCTED_V2_NOT_VERBATIM_V1',liveLlm:'NOT_RUN'};
fs.writeFileSync(path.join(out,'lock-validation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:checks.map(c=>`${c.name}: ${c.status}`),approvedSha256:result.hashes.approved,caseCounts:result.caseCounts}));
if(result.status!=='PASS')process.exitCode=1;
