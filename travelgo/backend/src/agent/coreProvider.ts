import type { LlmProvider, ProviderRequest } from './provider.js';
import { UnconfiguredLlmProvider } from './provider.js';
import { CORE_OPERATIONS } from './coreInput.js';
import { externalJson } from '../services/externalJson.js';
import { HttpError } from '../utils/httpError.js';
import { assertOllamaReady, localOllamaUrl } from './ollamaReadiness.js';
import { NATURAL_RESPONSE_SCHEMA } from './vietnameseConversation.js';
import { GROUNDED_RESPONSE_SCHEMA } from './naturalGrounding.js';
import {assertStructuredOutput} from './structuredOutput.js';
export const CORE_MODEL = 'qwen3:4b-instruct-2507-q4_K_M', CORE_DIGEST = '0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0';
export const CORE_MODEL_OPTIONS = { temperature: 0, num_ctx: 16384, num_predict: 2048 };
export const NATIVE_MODEL_OPTIONS = {...CORE_MODEL_OPTIONS, num_predict: 256};
export type CoreModelMetrics = Partial<Record<'total_duration'|'load_duration'|'prompt_eval_count'|'prompt_eval_duration'|'eval_count'|'eval_duration',number>>;
export const CORE_DECISION_SCHEMA = { type: 'object', additionalProperties: false, required: ['kind', 'name'], properties: { kind: { type: 'string', enum: ['core'] }, name: { type: 'string', enum: CORE_OPERATIONS } } };
/** Pure production serializer, also inspected offline without touching Ollama. */
export function serializeCoreRequest(input:ProviderRequest){
 const schema=input.responseSchema===NATURAL_RESPONSE_SCHEMA||input.responseSchema===GROUNDED_RESPONSE_SCHEMA?input.responseSchema:CORE_DECISION_SCHEMA;
 const options=input.profile==='native_consultation'&&schema!==CORE_DECISION_SCHEMA?NATIVE_MODEL_OPTIONS:CORE_MODEL_OPTIONS;
 const body=JSON.stringify({model:CORE_MODEL,stream:false,format:schema===CORE_DECISION_SCHEMA?'json':schema,options,messages:[{role:'system',content:input.system+(schema===CORE_DECISION_SCHEMA?'\nSelect one operation. Schema: ':'\nReturn JSON for schema: ')+JSON.stringify(schema)},...input.messages]});
 if(Buffer.byteLength(JSON.stringify(input))>12288||Buffer.byteLength(body)>12288)throw new HttpError(400,'Yêu cầu quá dài.','AGENT_INPUT_TOKEN_LIMIT');return body;
}
export class CoreOllamaProvider implements LlmProvider {
    readonly configured = true;
    readonly external = false;
    private readonly baseUrl:string;
    constructor(private fetcher: typeof fetch = fetch, endpoint='http://127.0.0.1:11434',
        private observe?: (metrics:CoreModelMetrics)=>void) { this.baseUrl=localOllamaUrl(endpoint); }
    async generate(input: ProviderRequest, outer: AbortSignal) { const signal = AbortSignal.any([outer, AbortSignal.timeout(15000)]); try {
        signal.throwIfAborted();
        if (Buffer.byteLength(JSON.stringify(input)) > 12288)
            throw new HttpError(400, 'Yêu cầu quá dài.', 'AGENT_INPUT_TOKEN_LIMIT');
        const body=serializeCoreRequest(input);
        await assertOllamaReady({ baseUrl: this.baseUrl, model: CORE_MODEL, modelDigest: CORE_DIGEST }, this.fetcher, signal, CORE_MODEL_OPTIONS.num_ctx, () => { });
        signal.throwIfAborted();
        const schema = input.responseSchema === NATURAL_RESPONSE_SCHEMA || input.responseSchema === GROUNDED_RESPONSE_SCHEMA ? input.responseSchema : CORE_DECISION_SCHEMA;
        const e = await externalJson(this.fetcher, this.baseUrl+'/api/chat', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body }, 65536);
        try{
            this.observe?.(Object.fromEntries(['total_duration','load_duration','prompt_eval_count','prompt_eval_duration','eval_count','eval_duration']
                .filter(key=>Number.isSafeInteger(e?.[key])&&e[key]>=0).map(key=>[key,e[key]])));
        }catch{/* A metrics sink cannot change the provider decision. */}
        if (e.done !== true || e.done_reason !== 'stop' || e.model!==undefined&&e.model!==CORE_MODEL ||
            e.message?.role !== 'assistant' || typeof e.message?.content !== 'string' ||
            e.message.tool_calls!=null&&(!Array.isArray(e.message.tool_calls)||e.message.tool_calls.length))
            throw Error('INVALID_ENVELOPE');
        const d = JSON.parse(e.message.content);
        assertStructuredOutput(schema,d);
        if (!d || (schema === CORE_DECISION_SCHEMA ? Object.keys(d).length !== 2 || d.kind !== 'core' || !CORE_OPERATIONS.includes(d.name) : schema === NATURAL_RESPONSE_SCHEMA ? d.kind !== 'natural' : d.kind !== 'grounded'))
            throw Error('INVALID_DECISION');
        signal.throwIfAborted();
        return d;
    }
    catch (e) {
        if (signal.aborted)
            throw new HttpError(504, 'Model chưa phản hồi kịp.', 'AGENT_TIMEOUT');
        if (e instanceof HttpError && e.code?.startsWith('AGENT_'))
            throw e;
        if (e instanceof HttpError && e.statusCode === 429)
            throw new HttpError(429, 'Model đạt hạn mức.', 'AGENT_PROVIDER_QUOTA');
        if (e instanceof TypeError || e instanceof HttpError && e.code==='EXTERNAL_UNAVAILABLE')
            throw new HttpError(503, 'Ollama local chưa phản hồi.', 'AGENT_OLLAMA_UNAVAILABLE');
        throw new HttpError(502, 'Không nhận được quyết định Core hợp lệ.', 'AGENT_INVALID_PROVIDER_OUTPUT');
    } }
}
export function configuredCoreProvider(env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch): LlmProvider {
    if(env.AGENT_CORE_LLM_ENABLED==='true'&&env.LLM_LIVE_ENABLED==='true'&&env.LLM_USAGE_APPROVED==='true'&&
        env.LLM_PROVIDER==='ollama'&&env.OLLAMA_LOCAL_ONLY_CONFIRMED==='true'&&env.OLLAMA_MODEL===CORE_MODEL&&env.OLLAMA_MODEL_DIGEST===CORE_DIGEST){
        try{return new CoreOllamaProvider(fetcher,env.OLLAMA_BASE_URL);}
        catch{/* Invalid endpoint leaves the provider disabled. */}
    }
    return new UnconfiguredLlmProvider();
}
