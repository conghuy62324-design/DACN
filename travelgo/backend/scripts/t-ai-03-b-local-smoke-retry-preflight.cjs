// Read-only local Ollama, model file, hardware and V2 lock preflight. No inference.
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const http=require('node:http');
const cp=require('node:child_process');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const out=path.join(root,'docs/evidence/t-ai-03-b-local-smoke-retry');
const tag='qwen3:4b-instruct-2507-q4_K_M';
const expectedV2='0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e';
const hashBytes=b=>crypto.createHash('sha256').update(b).digest('hex');
const hashFile=file=>new Promise((resolve,reject)=>{
  const h=crypto.createHash('sha256');
  fs.createReadStream(file).on('data',b=>h.update(b)).on('error',reject).on('end',()=>resolve(h.digest('hex')));
});
const exe=path.join(process.env.LOCALAPPDATA||'','Programs/Ollama/ollama.exe');
const models=process.env.OLLAMA_MODELS||path.join(os.homedir(),'.ollama/models');
const localManifest=path.join(models,'manifests/registry.ollama.ai/library/qwen3/4b-instruct-2507-q4_K_M');
const command=(name,args)=>{
  try {const p=cp.spawnSync(name,args,{encoding:'utf8',timeout:10000,windowsHide:true});return p.status===0?p.stdout.trim():null;}
  catch{return null;}
};
const tags=()=>new Promise((resolve,reject)=>{
  const req=http.get({host:'127.0.0.1',port:11434,path:'/api/tags',timeout:3000},res=>{
    if(res.statusCode!==200){res.resume();reject(Error(`HTTP ${res.statusCode}`));return;}
    let raw='';res.setEncoding('utf8');res.on('data',c=>{raw+=c;if(raw.length>2000000)req.destroy(Error('response too large'));});
    res.on('end',()=>{try{resolve(JSON.parse(raw));}catch(e){reject(e);}});
  });req.on('timeout',()=>req.destroy(Error('timeout')));req.on('error',reject);
});
async function main(){
  const approvedBytes=fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json'));
  const lock=JSON.parse(fs.readFileSync(path.join(root,'docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json'),'utf8'));
  assert.equal(hashBytes(approvedBytes),expectedV2);assert.equal(lock.sha256,expectedV2);
  const approved=JSON.parse(approvedBytes);assert.equal(approved.cases.length,24);
  assert.ok(fs.existsSync(exe),'Ollama exe absent');
  const version=command(exe,['--version']);assert.ok(version?.includes('ollama version'),'Ollama version unavailable');
  const show=command(exe,['show',tag]);assert.ok(show,'Local ollama show failed');
  const modelContext=Number(show.match(/context length\s+(\d+)/)?.[1]);
  assert.ok(Number.isSafeInteger(modelContext)&&modelContext>=16384,'Model published context below 16k');
  const raw=await tags();const model=raw.models?.find(m=>m.name===tag);
  assert.ok(model,'Exact local tag absent');
  assert.ok(/^[0-9a-f]{64}$/.test(model.digest),'No valid digest');
  assert.ok(fs.existsSync(localManifest),'Local model manifest absent');
  const manifest=JSON.parse(fs.readFileSync(localManifest,'utf8'));
  const registryLayer=manifest.layers?.find(l=>l.digest===`sha256:${model.digest}`);
  const modelLayer=manifest.layers?.find(l=>l.mediaType==='application/vnd.ollama.image.model');
  assert.ok(registryLayer&&modelLayer,'Local layers incomplete');
  const registryBlob=path.join(models,'blobs',`sha256-${model.digest}`);
  const modelBlob=path.join(models,'blobs',modelLayer.digest.replace(':','-'));
  assert.ok(fs.existsSync(registryBlob)&&fs.existsSync(modelBlob),'Local blobs absent');
  const registryHash=await hashFile(registryBlob),modelHash=await hashFile(modelBlob);
  assert.equal(registryHash,model.digest,'Local registry digest mismatch');
  assert.equal(modelHash,modelLayer.digest.split(':')[1],'Local model blob digest mismatch');
  assert.equal(fs.statSync(modelBlob).size,modelLayer.size,'Local model blob size mismatch');
  const netstat=command('netstat',['-ano','-p','tcp'])||'';
  const listener=netstat.split(/\r?\n/).find(line=>/127\.0\.0\.1:11434\s+0\.0\.0\.0:0\s+LISTENING/i.test(line));
  assert.ok(listener,'Ollama listener not bound specifically to 127.0.0.1');
  const processId=Number(listener.trim().split(/\s+/).at(-1));
  assert.ok(Number.isSafeInteger(processId)&&processId>0);
  const gpu=command('nvidia-smi',['--query-gpu=name,driver_version,memory.total,memory.free','--format=csv,noheader,nounits']);
  assert.ok(gpu?.includes('RTX 4060'),'NVIDIA GPU not detected');
  const config=JSON.parse(fs.readFileSync(path.join(out,'configuration.json'),'utf8'));
  assert.equal(config.proxyVariablesPresent,false);assert.equal(config.nodeUseEnvProxy,false);
  assert.equal(config.ollamaHostConfigured,false);assert.equal(config.ollamaBaseUrlLoopbackValid,true);
  assert.equal(config.liveEnabled,false,'Global Agent LIVE unexpectedly enabled');
  assert.equal(config.provider,null,'Global LLM_PROVIDER unexpectedly configured');
  const source=['agent/liveProvider','agent/decisionSchema','agent/tools','services/agentService'];
  for(const name of source){const s=path.join(root,`backend/src/${name}.ts`),d=path.join(root,`backend/dist/${name}.js`);
    assert.ok(fs.statSync(d).mtimeMs>=fs.statSync(s).mtimeMs,`${name} compiled source stale`);}
  const result={status:'PASS',benchmark:{sha256:expectedV2,caseCount:24},
    ollama:{version,service:'DIRECT_HTTP_127.0.0.1',listener:'127.0.0.1:11434',listenerPid:processId,
      executable:'%LOCALAPPDATA%/Programs/Ollama/ollama.exe',tag,digest:model.digest,sizeBytes:model.size,
      architecture:show.match(/architecture\s+(\S+)/)?.[1]||null,
      quantization:show.match(/quantization\s+(\S+)/)?.[1]||null,
      publishedContextLength:modelContext,
      manifestPath:'~/.ollama/models/manifests/registry.ollama.ai/library/qwen3/4b-instruct-2507-q4_K_M',
      localManifestSha256:await hashFile(localManifest),registryBlobSha256:registryHash,
      modelBlobSha256:modelHash,modelBlobSizeBytes:fs.statSync(modelBlob).size},
    network:{cloudUsed:false,proxyUsed:false,globalAgentLiveEnabled:false},
    hardware:{cpu:os.cpus()[0]?.model,ramTotalGiB:+(os.totalmem()/2**30).toFixed(2),ramFreeGiB:+(os.freemem()/2**30).toFixed(2),gpuCsv:gpu},
    compiledAgentContractCurrent:true};
  fs.writeFileSync(path.join(out,'preflight.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({status:result.status,model:result.ollama.tag,digest:result.ollama.digest,version:result.ollama.version,localBlobsVerified:true,listener:result.ollama.listener,gpu}));
}
main().catch(e=>{
  const result={status:'BLOCKED',reason:e.message,benchmarkSha256:expectedV2,inferenceRequests:0};
  fs.writeFileSync(path.join(out,'preflight.json'),JSON.stringify(result,null,2)+'\n');
  console.error(JSON.stringify(result));process.exitCode=1;
});
