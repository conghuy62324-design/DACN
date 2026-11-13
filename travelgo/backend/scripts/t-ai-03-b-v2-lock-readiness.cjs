// Read-only machine and configuration snapshot. Does not run a model or access DB.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const cp = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'docs/evidence/t-ai-03-b-v2-lock');
const run = (program, args) => {
  try { const x = cp.spawnSync(program,args,{encoding:'utf8',timeout:5000,windowsHide:true}); return {ok:x.status===0, output:x.status===0 ? x.stdout.trim() : null}; }
  catch { return {ok:false,output:null}; }
};
const nvidia = run('nvidia-smi',['--query-gpu=name,driver_version,memory.total,memory.free','--format=csv,noheader,nounits']);
const ollama = run('ollama',['--version']); // Version only; no daemon/model inference.
const paths = [path.join(process.env.LOCALAPPDATA || '', 'Programs/Ollama/ollama.exe'), path.join(process.env.PROGRAMFILES || '', 'Ollama/ollama.exe')];
const modelDirs = [path.join(os.homedir(),'.ollama/models'), process.env.OLLAMA_MODELS].filter(Boolean);
const config = {
  provider: ['gemini','ollama'].includes(process.env.LLM_PROVIDER) ? process.env.LLM_PROVIDER : null,
  liveEnabled: process.env.LLM_LIVE_ENABLED === 'true',
  usageApproved: process.env.LLM_USAGE_APPROVED === 'true',
  localOnlyConfirmed: process.env.OLLAMA_LOCAL_ONLY_CONFIRMED === 'true',
  externalProcessingApproved: process.env.LLM_EXTERNAL_PROCESSING_APPROVED === 'true',
  evaluationApproved: process.env.T_AI_01_B_LIVE_APPROVED === 'true',
  ollamaModelConfigured: Boolean(process.env.OLLAMA_MODEL?.trim()),
  ollamaBaseUrlConfigured: Boolean(process.env.OLLAMA_BASE_URL?.trim()),
  geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY?.trim()),
  ollamaHostConfigured: Boolean(process.env.OLLAMA_HOST?.trim()),
  proxyVariablesPresent: Boolean(process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY),
  nodeUseEnvProxy: process.env.NODE_USE_ENV_PROXY === '1'
};
const disk = (() => { try { const x=fs.statfsSync(root); return { checkedPath:'workspace',freeGiB:Number((x.bavail*x.bsize/2**30).toFixed(2)) }; } catch { return { checkedPath:'workspace',freeGiB:null }; } })();
const hardware = { platform:os.platform(),release:os.release(),arch:os.arch(),cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,
  ramTotalGiB:Number((os.totalmem()/2**30).toFixed(2)),ramFreeGiB:Number((os.freemem()/2**30).toFixed(2)),
  nvidiaSmiAvailable:nvidia.ok,gpuCsv:nvidia.output,workspaceDisk:disk };
const candidateTag = 'qwen3:4b-instruct-2507-q4_K_M';
let tags = { reachable:false, modelCount:null, names:[], candidateTag, candidatePresent:false, candidateDigest:null, candidateSizeBytes:null };
function directLocalTags() {
  return new Promise((resolve,reject)=>{
    const req=http.get({host:'127.0.0.1',port:11434,path:'/api/tags',timeout:2500},res=>{
      if(res.statusCode!==200){res.resume();reject(new Error('Non-200 local response'));return;}
      let body='';res.setEncoding('utf8');
      res.on('data',chunk=>{body+=chunk;if(body.length>2000000)req.destroy(new Error('Tags too large'));});
      res.on('end',()=>{try{resolve(JSON.parse(body));}catch(e){reject(e);}});
    });
    req.on('timeout',()=>req.destroy(new Error('Timeout')));
    req.on('error',reject);
  });
}
async function main() {
  try {
    const j=await directLocalTags();
    const models=Array.isArray(j.models)?j.models:[];
    const exact=models.find(m=>m.name===candidateTag);
    tags={reachable:true,modelCount:models.length,names:models.map(m=>m.name),candidateTag,
      candidatePresent:Boolean(exact),candidateDigest:exact?.digest||null,candidateSizeBytes:exact?.size||null};
  } catch { /* Port closed/unavailable; no inference. */ }
  const readiness = { commandAvailable:ollama.ok, version:ollama.output, installPathExists:paths.map(fs.existsSync),
    modelDirectoryExists:modelDirs.map(fs.existsSync), port:'127.0.0.1:11434', directSocketNoProxy:true, tags };
  fs.mkdirSync(out,{recursive:true});
  for (const [name,value] of Object.entries({hardware,ollama:readiness,configuration:config}))
    fs.writeFileSync(path.join(out,`${name}.json`),JSON.stringify(value,null,2)+'\n');
  console.log(JSON.stringify({hardware,ollama:readiness,configuration:config}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
