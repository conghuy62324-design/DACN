// Read-only status gate; never calls Ollama inference, Agent API or PostgreSQL.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'docs/evidence/t-ai-03-b-local-smoke');
const read=p=>fs.readFileSync(path.join(root,p));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const approvedBytes=read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json');
const lockBytes=read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json');
const approved=JSON.parse(approvedBytes),lock=JSON.parse(lockBytes);
assert.equal(sha(approvedBytes),lock.sha256);
assert.equal(lock.sha256,'0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
assert.equal(approved.approvalStatus,'APPROVED');
assert.equal(approved.cases.length,24);
assert.equal(new Set(approved.cases.map(c=>c.id)).size,24);
const hardware=JSON.parse(fs.readFileSync(path.join(out,'hardware.json')));
const ollama=JSON.parse(fs.readFileSync(path.join(out,'ollama.json')));
const configuration=JSON.parse(fs.readFileSync(path.join(out,'configuration.json')));
const serviceReady=ollama.commandAvailable && ollama.tags.reachable;
const modelReady=serviceReady && ollama.tags.candidatePresent && Boolean(ollama.tags.candidateDigest);
const result={
  benchmark:{status:'APPROVED_LOCKED',sha256:lock.sha256,cases:24},
  readiness:{status:modelReady?'READY_FOR_OPERATOR_INFERENCE_APPROVAL':'BLOCKED',
    service:serviceReady?'PASS':'BLOCKED',model:modelReady?'PASS':'BLOCKED',
    modelTag:ollama.tags.candidateTag,localDigest:ollama.tags.candidateDigest,
    directLoopbackProbe:true,cloudOrProxyUsedByProbe:false,
    actualModelLocality:modelReady?'TAG_AND_DIGEST_ON_LOOPBACK':'NOT_VERIFIED'},
  technicalSmoke:{status:'NOT_RUN',reason:modelReady?'Requires explicit operator inference approval':'Ollama service/model not ready',
    jsonSchema:'NOT_RUN',runtimeValidation:'NOT_RUN',errorTimeoutHandling:'NOT_RUN',
    latencyMs:null,promptTokens:null,outputTokens:null,gpuCpuSplit:null,ramPeakGiB:null,vramPeakMiB:null,
    numCtx:16384,numPredict:2048,timeoutMs:15000},
  liveNlu:{status:'NOT_RUN',caseCount:24},
  localHardware:{gpuDetected:hardware.nvidiaSmiAvailable,ramFreeGiBAtSurvey:hardware.ramFreeGiB,gpuCsv:hardware.gpuCsv},
  config:{provider:configuration.provider,modelConfigured:configuration.ollamaModelConfigured,
    liveEnabled:configuration.liveEnabled,usageApproved:configuration.usageApproved,
    localOnlyConfirmed:configuration.localOnlyConfirmed,evaluationApproved:configuration.evaluationApproved,
    loopbackUrlValid:configuration.ollamaBaseUrlLoopbackValid},
  sourceHashes:Object.fromEntries([
    'backend/src/agent/liveProvider.ts','backend/src/agent/decisionSchema.ts',
    'backend/src/agent/tools.ts','backend/src/agent/limits.ts',
    'backend/src/services/agentService.ts','backend/scripts/t-ai-01-b-evaluate.cjs'
  ].map(p=>[p,sha(read(p))]))
};
fs.writeFileSync(path.join(out,'smoke-status.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({benchmark:result.benchmark,readiness:result.readiness,technicalSmoke:result.technicalSmoke.status,liveNlu:result.liveNlu.status}));
