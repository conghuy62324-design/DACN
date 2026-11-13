// Read-only checks against the current Agent contract; no model, API or DB call.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'docs/evidence/t-ai-03-b-v2-finalize');
const paths = {
  v1: path.join(root, 'docs/evidence/t-ai-01-b/nlu-manifest.json'),
  lock: path.join(root, 'docs/evidence/t-ai-01-b/nlu-manifest-lock.json'),
  draft: path.join(root, 'docs/evidence/t-ai-03-b-unblock/nlu-manifest-v2-draft.json'),
  draftProvenance: path.join(root, 'docs/evidence/t-ai-03-b-unblock/nlu-v2-provenance.json'),
  candidate: path.join(output, 'nlu-manifest-v2-candidate.json'),
  provenance: path.join(output, 'nlu-v2-candidate-provenance.json')
};
const sha = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const parse = p => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p)));
const files = Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,parse(p)]));
const { v1, lock, draft, draftProvenance, candidate, provenance } = files;
const { AGENT_TOOLS, FIELD_LABELS, parseDecision, validateTool } = require('../dist/agent/tools.js');
const { readConversation } = require('../dist/agent/conversation.js');
const checks=[];
function check(name, fn) { try { fn(); checks.push({name,status:'PASS'}); } catch(e) { checks.push({name,status:'FAIL',error:String(e.message)}); } }
const byId = (manifest,id) => manifest.cases.find(c=>c.id===id);
const request = 'Nhóm tôi có khoảng 5 triệu để đi Đà Nẵng từ Hà Nội, gồm 2 người lớn, đi ô tô từ ngày 15 đến 17 tháng 6 năm 2030. Lập lịch trình giúp tôi.';
const normalize = s => s.normalize('NFC').trim().replace(/\s+/gu,' ').toLocaleLowerCase('vi-VN');
const duplicates = manifest => {
  const groups = new Map();
  for (const c of manifest.cases) {
    const key=normalize(c.request.message); groups.set(key,[...(groups.get(key)||[]),c.id]);
  }
  return [...groups.values()].filter(ids=>ids.length>1);
};
check('V1 source hash, lock and historical counts',()=>{
  assert.equal(sha(paths.v1),lock.sha256);
  assert.equal(lock.sha256,'e4369315ef9f0ded9943614438116bb897364593899e787cbc256b60f966e081');
  assert.equal(lock.liveCases,24);assert.equal(lock.mockFaultCases,4);assert.equal(v1.cases.length,28);
});
check('Draft historical checksum and duplicate VI04/VI16',()=>{
  assert.equal(sha(paths.draft),'6bc1afaae17d9ecb973aab9c6331faa7beace7b09035d8a4bbec20e4ef82f5fb');
  assert.equal(byId(draft,'VI04').request.message,byId(draft,'VI16').request.message);
  assert.ok(duplicates(draft).some(g=>g.includes('VI04')&&g.includes('VI16')));
});
check('Candidate metadata, exact VI16 request, unchanged expected and 23 cases',()=>{
  assert.equal(candidate.version,'T_AI_03_B_VI_V2_CANDIDATE');
  assert.equal(candidate.approvalStatus,'PENDING_OWNER_REVIEW');
  assert.equal(candidate.sourceManifestSha256,lock.sha256);
  assert.deepEqual(candidate.criteria,draft.criteria);
  assert.equal(byId(candidate,'VI16').request.message,request);
  assert.deepEqual(byId(candidate,'VI16').expected,byId(draft,'VI16').expected);
  assert.equal(byId(candidate,'VI16').toolOutcome,byId(draft,'VI16').toolOutcome);
  for(const c of candidate.cases.filter(c=>c.id!=='VI16'))assert.deepEqual(c,byId(draft,c.id));
  assert.equal(candidate.cases.length,draft.cases.length);
});
check('24 unique ordered LIVE IDs and no duplicate request',()=>{
  assert.deepEqual(candidate.cases.map(c=>c.id),Array.from({length:24},(_,i)=>`VI${String(i+1).padStart(2,'0')}`));
  assert.ok(candidate.cases.every(c=>c.tier==='LIVE_LLM'));
  assert.deepEqual(duplicates(candidate),[]);
});
check('UTF-8 NFC, case schema, no replacement characters',()=>{
  function inspect(value,p) {
    if(typeof value==='string') { assert.equal(value,value.normalize('NFC'),`${p} not NFC`);assert.ok(!/[?\uFFFD]/u.test(value),`${p} has replacement marker`); }
    else if(Array.isArray(value))value.forEach((v,i)=>inspect(v,`${p}[${i}]`));
    else if(value&&typeof value==='object')for(const [k,v] of Object.entries(value))inspect(v,`${p}.${k}`);
  }
  inspect(candidate,'candidate');
  inspect(provenance,'provenance');
  for(const c of candidate.cases) {
    assert.deepEqual(Object.keys(c).sort(),['id','tier','title','request','expected','toolOutcome'].sort());
    assert.ok(c.title.trim()&&c.request.message.trim());
    assert.ok(['tool','clarify','unsupported'].includes(c.expected.kind));
    readConversation(c.request); // real request/history validation; no API call
  }
});
check('Current Agent decision/tool validation accepts every expected',()=>{
  for(const c of candidate.cases){
    const decision=parseDecision(c.expected);
    assert.deepEqual(decision,c.expected);
    if(decision.kind==='tool'){
      assert.ok(AGENT_TOOLS.some(t=>t.name===decision.name));
      assert.deepEqual(validateTool(decision).missing,[],`${c.id} missing tool fields`);
      assert.ok(['REAL_TOOL_RESULT_OR_EXPLICIT_CATALOG_INSUFFICIENT','tool_unavailable'].includes(c.toolOutcome));
    }else if(decision.kind==='clarify'){
      assert.ok(decision.fields.every(f=>Object.hasOwn(FIELD_LABELS,f)));
      assert.equal(c.toolOutcome,'NO_TOOL');
    }else assert.equal(c.toolOutcome,'NO_TOOL');
  }
  assert.deepEqual(byId(candidate,'VI16').expected,{kind:'tool',name:'plan_trip',arguments:{departureCity:'Hà Nội',destinationCity:'Đà Nẵng',startDate:'2030-06-15',endDate:'2030-06-17',adults:2,totalBudget:5000000,transportation:'car'}});
});
check('Per-case provenance covers every field; VI16 marked proposal',()=>{
  assert.equal(provenance.status,'CANDIDATE_PENDING_OWNER_REVIEW');
  assert.equal(provenance.sourceDraftSha256,sha(paths.draft));
  assert.deepEqual(Object.keys(provenance.cases),candidate.cases.map(c=>c.id));
  for(const c of candidate.cases){
    const p=provenance.cases[c.id];const keys=['id','tier','title','request.message','expected.kind','toolOutcome'];
    if(c.expected.name)keys.push('expected.name');
    if(c.expected.fields)keys.push('expected.fields');
    if(c.expected.arguments)keys.push(...Object.keys(c.expected.arguments).map(x=>`expected.arguments.${x}`));
    if(c.request.history)c.request.history.forEach((_,i)=>keys.push(`request.history[${i}].role`,`request.history[${i}].content`));
    assert.deepEqual(Object.keys(p.fields).sort(),keys.sort(),`${c.id} provenance field coverage`);
    assert.ok(Object.values(p.fields).every(v=>['V1_UNCHANGED','SUMMARY_SUPPORTED_VALUE','PROPOSED_RECONSTRUCTION'].includes(v)));
    assert.equal(p.exactOriginalVietnameseRecovered,false);
    if(c.id!=='VI16')assert.deepEqual(p,draftProvenance.cases[c.id]);
  }
  assert.equal(provenance.cases.VI16.fields['request.message'],'PROPOSED_RECONSTRUCTION');
  assert.equal(provenance.cases.VI16.candidateRevision.verbatimV1Recovery,false);
  assert.equal(provenance.cases.VI16.candidateRevision.candidateRequest,request);
});
function diff(a,b,p='',out=[]){
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b))
    for(const k of new Set([...Object.keys(a),...Object.keys(b)]))diff(a[k],b[k],p?`${p}.${k}`:k,out);
  else if(Array.isArray(a)&&Array.isArray(b))for(let i=0;i<Math.max(a.length,b.length);i++)diff(a[i],b[i],`${p}[${i}]`,out);
  else if(JSON.stringify(a)!==JSON.stringify(b))out.push({path:p,draft:a,candidate:b});
  return out;
}
const manifestDiff=diff(draft,candidate);
const provenanceDiff=diff(draftProvenance,provenance);
check('Draft→candidate diff limited to version and VI16 request',()=>{
  assert.deepEqual(manifestDiff.map(d=>d.path),['version','cases[15].request.message']);
  assert.equal(provenanceDiff.filter(d=>d.path.startsWith('cases.')&&!d.path.startsWith('cases.VI16.')).length,0);
});
const coverage={ toolSelection:candidate.cases.length,
  arguments:candidate.cases.filter(c=>c.expected.kind==='tool').length,
  missingFields:candidate.cases.filter(c=>c.expected.kind==='clarify').length,
  multiTurn:candidate.cases.filter(c=>Array.isArray(c.request.history)).length,
  unsupported:candidate.cases.filter(c=>c.expected.kind==='unsupported').length,
  toolFidelity:candidate.cases.filter(c=>c.expected.kind==='tool').length };
const result={status:checks.every(c=>c.status==='PASS')?'PASS':'FAIL',approvalStatus:candidate.approvalStatus,
  checks,coverage,draftDuplicates:duplicates(draft),candidateDuplicates:duplicates(candidate),
  checksums:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,sha(p)])),
  historicalFilesUntouchedByThisValidator:true};
fs.writeFileSync(path.join(output,'candidate-validation.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(output,'draft-to-candidate-diff.json'),JSON.stringify({status:'REVIEW_ONLY',manifestDiff,provenanceDiff},null,2)+'\n');
console.log(JSON.stringify({status:result.status,checks:checks.map(c=>`${c.name}: ${c.status}`),coverage,draftDuplicates:result.draftDuplicates,candidateDuplicates:result.candidateDuplicates,manifestDiff:manifestDiff.map(d=>d.path),checksums:result.checksums}));
if(result.status!=='PASS')process.exitCode=1;
