// Configuration inspection only; never call generate(), readiness, fetch, load or native endpoints.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../../..');
const parsed=require(path.join(root,'backend/node_modules/dotenv')).parse(fs.readFileSync(path.join(root,'backend/.env')));
const effective={...parsed,...process.env};const {configuredCoreProvider,CORE_MODEL,CORE_DIGEST,CORE_MODEL_OPTIONS}=require(path.join(root,'backend/dist/agent/coreProvider.js'));
let calls=0;const provider=configuredCoreProvider(effective,async()=>{calls++;throw Error('NATIVE_NOT_APPROVED');});
const result={at:new Date().toISOString(),configured:provider.configured,flags:Object.fromEntries(['AGENT_CORE_LLM_ENABLED','LLM_LIVE_ENABLED','LLM_USAGE_APPROVED','OLLAMA_LOCAL_ONLY_CONFIRMED'].map(k=>[k,effective[k]==='true'])),provider:effective.LLM_PROVIDER||'unset',lockedModel:CORE_MODEL,lockedDigest:CORE_DIGEST,options:CORE_MODEL_OPTIONS,endpoint:'http://127.0.0.1:11434',readiness:'NOT_MEASURED_NO_FRESH_APPROVAL',actualRequests:calls,credentialsRecorded:false};
fs.writeFileSync(path.join(__dirname,'provider-config.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
