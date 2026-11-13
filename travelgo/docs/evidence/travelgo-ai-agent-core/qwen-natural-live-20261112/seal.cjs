const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),prefix='docs/evidence/travelgo-ai-agent-core/qwen-natural-live-20261112/',report='docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md';
const read=f=>fs.readFileSync(path.join(root,f)),json=f=>JSON.parse(read(f)),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const write=(f,v)=>fs.writeFileSync(path.join(__dirname,f),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const baseline=json(prefix+'baseline.json'),changed=[];
for(const[f,h]of Object.entries(baseline.hashes))if(sha(read(f))!==h){assert.equal(f,report,'Unexpected change: '+f);changed.push(f);}
assert.deepEqual(changed,[report]);
const history=[];
for(const dir of ['docs/evidence/travelgo-ai-agent-core/','docs/evidence/travelgo-ai-agent-core/closure-20261111/','docs/evidence/travelgo-ai-agent-core/natural-chat-20261112/']){
 const seal=json(dir+'artifact-checksums.json');
 for(const[f,h]of Object.entries(seal.hashes))assert.equal(sha(read(dir+f)),h,dir+f);
 if(dir.includes('natural-chat')){assert.equal(sha(read(prefix+'master-report-before.md')),seal.reportSha256);for(const[f,h]of Object.entries(seal.sourceHashes))assert.equal(sha(read(f)),h,f);}
 history.push({directory:dir,artifacts:Object.keys(seal.hashes).length,status:'UNCHANGED'});
}
const initial=json(prefix+'preflight.json'),preflight=json(prefix+'preflight-readiness.json');
assert.equal(initial.nativePosts,0);assert.equal(initial.metadataGets,0);assert.equal(preflight.nativePosts,0);assert.equal(preflight.inference,0);assert.equal(preflight.loads,0);assert.equal(preflight.retries,0);assert.equal(preflight.postgresConnections,0);assert.equal(preflight.metadataGets,3);
assert.equal(preflight.status,'BLOCKED');assert.equal(preflight.reason,'MODEL_NOT_RESIDENT_STOP_NO_LOAD_APPROVAL');assert.deepEqual(preflight.ps.body.models,[]);
const c=require('../../t-ai-04-g2-live-multi-turn-validation/common.cjs'),quota=c.rate();assert.equal(quota.remainingConservativeSlots,20);assert.equal(quota.recent.length,0);assert.equal(quota.futureDatedEntries.length,0);
assert.equal(quota.known,105);assert(!fs.readdirSync(__dirname).some(f=>f.startsWith('attempt-')));
const missing=[];
for(const m of read(report).toString('utf8').matchAll(/\]\(([^)]+)\)/g)){
 const link=m[1];if(/^(https?:|mailto:|#)/.test(link))continue;
 const target=path.resolve(root,'docs',decodeURIComponent(link.split('#')[0]));
 if(['acceptance-final.json','artifact-checksums.json'].some(f=>target===path.join(__dirname,f)))continue;
 if(!fs.existsSync(target))missing.push(link);
}
assert.deepEqual(missing,[]);
const acceptance={at:new Date().toISOString(),timezone:'Asia/Ho_Chi_Minh',status:'REAL_MODEL_ACCEPTANCE_BLOCKED',coreStatus:'TRAVELGO_AI_AGENT_CORE_PARTIAL',
 reason:preflight.reason,approval:{maxInference:3,used:0,loadApproved:false,localOnly:true},
 semantic:{realModelPass:0,realModelFail:0,notRun:3,rawOutputAvailable:false,inferenceLatencyMeasured:false,operationProposed:false},
 native:{metadataGet:3,post:0,inference:0,load:0,reload:0,retry:0},
 postgres:{connections:0,queries:0,writes:0,fixtures:0,fingerprintRerun:false},quotaAfter:quota,
 defaultWebsiteConfiguration:'UNCHANGED_DISABLED',sourceChanges:0,configurationChanges:0,buildRegressionRerun:false,
 baselineFilesChecked:Object.keys(baseline.hashes).length,changedFiles:changed,historicalArtifacts:history,reportLinks:'ALL_EXIST',
 initialSandboxCimRead:'DENIED_OS_PERMISSION_THEN_COMPLETED_READ_ONLY_WITH_APPROVED_ESCALATION',autoReviewRejected:false,
 isolatedModelOverrideEnabled:false,expectedChangedAfterOutput:false,stopBeforeManifestOrInference:true};
write('acceptance-final.json',acceptance);
const hashes={};for(const rel of fs.readdirSync(__dirname,{recursive:true}).sort()){const f=rel.replaceAll('\\','/');if(f==='artifact-checksums.json'||!fs.statSync(path.join(__dirname,rel)).isFile())continue;hashes[f]=sha(fs.readFileSync(path.join(__dirname,rel)));}
const seal={at:new Date().toISOString(),report,reportSha256:sha(read(report)),priorReportSnapshot:prefix+'master-report-before.md',priorReportSha256:sha(read(prefix+'master-report-before.md')),hashes};
write('artifact-checksums.json',seal);
for(const[f,h]of Object.entries(hashes))assert.equal(sha(read(prefix+f)),h,f);
console.log(JSON.stringify({status:acceptance.status,reason:acceptance.reason,native:acceptance.native,remaining:quota.remainingConservativeSlots,baselineFiles:Object.keys(baseline.hashes).length,historical:history,newArtifacts:Object.keys(hashes).length,reportSha256:seal.reportSha256},null,2));
