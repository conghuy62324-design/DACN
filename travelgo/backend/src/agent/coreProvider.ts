import type { LlmProvider, ProviderRequest } from './provider.js';
import { UnconfiguredLlmProvider } from './provider.js';
import { CORE_OPERATIONS } from './coreInput.js';
import { externalJson } from '../services/externalJson.js';
import { HttpError } from '../utils/httpError.js';
import { assertOllamaReady } from './ollamaReadiness.js';
import { NATURAL_RESPONSE_SCHEMA } from './vietnameseConversation.js';
import { GROUNDED_RESPONSE_SCHEMA } from './naturalGrounding.js';
import {assertStructuredOutput} from './structuredOutput.js';
export const CORE_MODEL = 'qwen3:4b-instruct-2507-q4_K_M', CORE_DIGEST = '0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0';
export const CORE_MODEL_OPTIONS = { temperature: 0, num_ctx: 16384, num_predict: 2048 };
export const CORE_DECISION_SCHEMA = { type: 'object', additionalProperties: false, required: ['kind', 'name'], properties: { kind: { type: 'string', enum: ['core'] }, name: { type: 'string', enum: CORE_OPERATIONS } } };
export class CoreOllamaProvider implements LlmProvider {
    readonly configured = true;
    readonly external = false;
    constructor(private fetcher: typeof fetch = fetch) { }
    async generate(input: ProviderRequest, outer: AbortSignal) { const signal = AbortSignal.any([outer, AbortSignal.timeout(15000)]); try {
        signal.throwIfAborted();
        if (Buffer.byteLength(JSON.stringify(input)) > 12288)
            throw new HttpError(400, 'Yêu cầu quá dài.', 'AGENT_INPUT_TOKEN_LIMIT');
        await assertOllamaReady({ baseUrl: 'http://127.0.0.1:11434', model: CORE_MODEL, modelDigest: CORE_DIGEST }, this.fetcher, signal, 16384, () => { });
        const schema = input.responseSchema === NATURAL_RESPONSE_SCHEMA || input.responseSchema === GROUNDED_RESPONSE_SCHEMA ? input.responseSchema : CORE_DECISION_SCHEMA;
        const e = await externalJson(this.fetcher, 'http://127.0.0.1:11434/api/chat', { method: 'POST', signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: CORE_MODEL, stream: false, format: schema===CORE_DECISION_SCHEMA?'json':schema, options: CORE_MODEL_OPTIONS, messages: [{ role: 'system', content: input.system + (schema===CORE_DECISION_SCHEMA?'\nSelect one operation. Schema: ':'\nReturn JSON for schema: ') + JSON.stringify(schema) }, ...input.messages] }) }, 65536);
        if (e.done !== true || e.done_reason !== 'stop' || e.message?.role !== 'assistant' || typeof e.message?.content !== 'string' || e.message?.tool_calls?.length)
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
        throw new HttpError(502, 'Không nhận được quyết định Core hợp lệ.', 'AGENT_INVALID_PROVIDER_OUTPUT');
    } }
}
export function configuredCoreProvider(env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch): LlmProvider { return env.AGENT_CORE_LLM_ENABLED === 'true' && env.LLM_LIVE_ENABLED === 'true' && env.LLM_USAGE_APPROVED === 'true' && env.LLM_PROVIDER === 'ollama' && env.OLLAMA_LOCAL_ONLY_CONFIRMED === 'true' && env.OLLAMA_MODEL === CORE_MODEL && env.OLLAMA_MODEL_DIGEST === CORE_DIGEST ? new CoreOllamaProvider(fetcher) : new UnconfiguredLlmProvider(); }
