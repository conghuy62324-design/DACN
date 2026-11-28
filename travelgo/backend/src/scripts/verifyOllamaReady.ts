import {CORE_DIGEST,CORE_MODEL,CORE_MODEL_OPTIONS} from '../agent/coreProvider.js';
import {assertOllamaReady,localOllamaUrl} from '../agent/ollamaReadiness.js';

async function verify(){
    const baseUrl=localOllamaUrl(process.env.OLLAMA_BASE_URL??'http://127.0.0.1:11434');
    if(process.env.OLLAMA_MODEL!==CORE_MODEL||process.env.OLLAMA_MODEL_DIGEST!==CORE_DIGEST)
        throw Error('CONFIGURED_PIN_MISMATCH');
    await assertOllamaReady({baseUrl,model:CORE_MODEL,modelDigest:CORE_DIGEST},
        fetch,AbortSignal.timeout(3500),CORE_MODEL_OPTIONS.num_ctx,()=>{});
    console.log(JSON.stringify({status:'RESIDENT_READY',model:CORE_MODEL,context:CORE_MODEL_OPTIONS.num_ctx}));
}

if(require.main===module)verify().catch(()=>{console.error(JSON.stringify({status:'NOT_READY'}));process.exitCode=1;});
