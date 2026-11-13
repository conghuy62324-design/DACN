import { HttpError } from '../utils/httpError.js';
import { LlmProvider, ProviderRequest, UnconfiguredLlmProvider } from './provider.js';
import { DECISION_SCHEMA, GEMINI_DECISION_SCHEMA } from './decisionSchema.js';
import { matchesDecisionSchema } from './decisionValidation.js';
import { AGENT_TOOLS, parseDecision, validateTool } from './tools.js';
import { classifyMissingReadSlots, MissingReadSlotsRejection } from './missingSlotRecovery.js';
import { randomUUID } from 'node:crypto';
import { GeminiFunctionProvider, PUBLIC_GEMINI_MODEL } from './geminiFunctionProvider.js';
import { assertOllamaReady, localOllamaUrl, type Emit, type ProviderEvent, type Operation, type ReadinessReason } from './ollamaReadiness.js';
export { localOllamaUrl } from './ollamaReadiness.js';

type Fetcher = typeof fetch;
type Config = { provider: 'gemini' | 'ollama'; model: string; baseUrl?: string; apiKey?: string; modelDigest?: string };
export type ProviderTrace = Readonly<{ source: 'agent_provider'; correlationId: string; provider: 'gemini' | 'ollama';
  at: string; elapsedMs: number; event: ProviderEvent; inferenceStarted: boolean; operation?: Operation; reason?: ReadinessReason }>;
type TraceSink = (trace: ProviderTrace) => void;
export const LIVE_LIMITS = { inputTokens: 12288, outputTokens: 2048, responseBytes: 65536, decisionBytes: 16000, timeoutMs: 15000 } as const;
const error = (code: string, status = 502) => new HttpError(status, 'Dịch vụ LLM chưa xử lý được yêu cầu. Vui lòng thử lại sau.', code);

async function boundedJson(response: Response, signal: AbortSignal): Promise<any> {
  signal.throwIfAborted();
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 429) throw error('AGENT_PROVIDER_QUOTA', 429);
    if (response.status >= 500) throw error('AGENT_PROVIDER_UNAVAILABLE', 503);
    throw error('AGENT_PROVIDER_REJECTED');
  }
  if (Number(response.headers.get('content-length')) > LIVE_LIMITS.responseBytes) {
    await response.body?.cancel(); throw error('AGENT_PROVIDER_RESPONSE_TOO_LARGE');
  }
  const reader = response.body?.getReader();
  if (!reader) throw error('AGENT_INVALID_PROVIDER_OUTPUT');
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (signal.aborted) { await reader.cancel(); signal.throwIfAborted(); }
      if (done) break;
      size += value.byteLength;
      if (size > LIVE_LIMITS.responseBytes) { await reader.cancel(); throw error('AGENT_PROVIDER_RESPONSE_TOO_LARGE'); }
      chunks.push(value);
    }
    signal.throwIfAborted();
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw error('AGENT_INVALID_PROVIDER_OUTPUT');
  } finally { reader.releaseLock(); }
}

/** No provider SDK/global singleton secrets. Transport never logs bodies or headers. */
class LiveLlmProvider implements LlmProvider {
  readonly configured = true;
  readonly external: boolean;
  constructor(private readonly config: Config, private readonly fetcher: Fetcher, private readonly trace: TraceSink) { this.external = config.provider === 'gemini'; }

  async generate(input: ProviderRequest, outer: AbortSignal): Promise<unknown> {
    const correlationId = randomUUID(), started = performance.now();
    let inferenceStarted = false, deadlineLogged = false;
    const emit: Emit = (event, operation, reason) => {
      try { this.trace(Object.freeze({ source: 'agent_provider', correlationId, provider: this.config.provider,
        at: new Date().toISOString(), elapsedMs: Math.round(performance.now() - started), event, inferenceStarted,
        ...(operation ? { operation } : {}), ...(reason ? { reason } : {}) })); } catch { /* Observability cannot alter decisions. */ }
    };
    emit('provider_request_started');
    const abort = new AbortController();
    const deadline = () => { if (!deadlineLogged) { deadlineLogged = true; emit('deadline_triggered'); } };
    const relay = () => {
      if (outer.reason instanceof HttpError && outer.reason.code === 'AGENT_TIMEOUT') deadline();
      if (!abort.signal.aborted) { abort.abort(outer.reason); emit('abort_propagated'); }
    };
    outer.addEventListener('abort', relay, { once: true });
    if (outer.aborted) relay();
    const timer = setTimeout(() => { deadline(); if (!abort.signal.aborted) { abort.abort(); emit('abort_propagated'); } }, LIVE_LIMITS.timeoutMs);
    const signal = abort.signal;
    const post = async (url: string, body: unknown) => {
      signal.throwIfAborted();
      const operation: Operation = this.external && url.endsWith(':countTokens') ? 'token_count' : 'inference';
      if (operation === 'inference') { inferenceStarted = true; emit('inference_request_started', operation); }
      let response: Response;
      try { response = await this.fetcher(url, { method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/json', ...(this.external ? { 'x-goog-api-key': this.config.apiKey! } : {}) },
        body: JSON.stringify(body) }); }
      finally { emit('underlying_fetch_settled', operation); }
      if (signal.aborted) { await response.body?.cancel(); signal.throwIfAborted(); }
      const value = await boundedJson(response, signal);
      signal.throwIfAborted();
      return value;
    };
    try {
      // Conservative UTF-8 byte budget incl. schemas/system; not a model tokenizer claim.
      // Gemini additionally uses exact countTokens; Ollama enforces a finite context window.
      // Only compiled, allowlisted tool metadata enters the privileged system message.
      // Request history and caller-supplied tool objects cannot redefine tools here.
      const ollamaTools = this.config.provider === 'ollama'
        ? `\nAvailable read-only tools (metadata from AGENT_TOOLS):\n${JSON.stringify(AGENT_TOOLS.map(tool => ({
          name: tool.name, description: tool.description, required: tool.parameters.required,
          parameters: tool.parameters,
        })))}` : '';
      const system = `${input.system}${ollamaTools}\nDecision JSON Schema:\n${JSON.stringify(DECISION_SCHEMA)}`;
      const prompt = { system, messages: input.messages };
      if (Buffer.byteLength(JSON.stringify(prompt), 'utf8') + 512 > LIVE_LIMITS.inputTokens) throw error('AGENT_INPUT_TOKEN_LIMIT', 400);
      let raw: string;
      if (this.config.provider === 'gemini') {
        const model = `models/${this.config.model}`;
        const base = `https://generativelanguage.googleapis.com/v1beta/${model}`;
        const body = { systemInstruction: { parts: [{ text: system }] },
          contents: input.messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          generationConfig: { temperature: 0, maxOutputTokens: LIVE_LIMITS.outputTokens,
            responseMimeType: 'application/json', responseJsonSchema: GEMINI_DECISION_SCHEMA } };
        const count = await post(`${base}:countTokens`, { generateContentRequest: { model, ...body } });
        if (!Number.isSafeInteger(count.totalTokens) || count.totalTokens < 0) throw error('AGENT_INVALID_PROVIDER_OUTPUT');
        if (count.totalTokens > LIVE_LIMITS.inputTokens) throw error('AGENT_INPUT_TOKEN_LIMIT', 400);
        const envelope = await post(`${base}:generateContent`, body);
        const candidate = envelope.candidates?.[0];
        if (envelope.promptFeedback?.blockReason || envelope.candidates?.length !== 1 || candidate?.finishReason !== 'STOP' ||
          !Array.isArray(candidate?.content?.parts) || candidate.content.parts.length !== 1 ||
          candidate.content.parts[0].thought || typeof candidate.content.parts[0].text !== 'string') throw error('AGENT_INVALID_PROVIDER_OUTPUT');
        raw = candidate.content.parts[0].text;
      } else {
        await assertOllamaReady({ baseUrl: this.config.baseUrl!, model: this.config.model, modelDigest: this.config.modelDigest },
          this.fetcher, signal, LIVE_LIMITS.inputTokens + LIVE_LIMITS.outputTokens + 2048, emit);
        const envelope = await post(`${this.config.baseUrl}/api/chat`, { model: this.config.model,
          messages: [{ role: 'system', content: system }, ...input.messages], stream: false, format: 'json',
          options: { temperature: 0, num_predict: LIVE_LIMITS.outputTokens, num_ctx: LIVE_LIMITS.inputTokens + LIVE_LIMITS.outputTokens + 2048 } });
        if (envelope.done !== true || envelope.done_reason !== 'stop' || envelope.message?.role !== 'assistant' ||
          envelope.message?.tool_calls?.length || typeof envelope.message?.content !== 'string') throw error('AGENT_INVALID_PROVIDER_OUTPUT');
        if (!Number.isSafeInteger(envelope.prompt_eval_count) || envelope.prompt_eval_count < 0 ||
          !Number.isSafeInteger(envelope.eval_count) || envelope.eval_count < 0) throw error('AGENT_INVALID_PROVIDER_OUTPUT');
        if (envelope.prompt_eval_count > LIVE_LIMITS.inputTokens || envelope.eval_count > LIVE_LIMITS.outputTokens) throw error('AGENT_INPUT_TOKEN_LIMIT', 400);
        raw = envelope.message.content;
      }
      if (Buffer.byteLength(raw, 'utf8') > LIVE_LIMITS.decisionBytes) throw error('AGENT_PROVIDER_RESPONSE_TOO_LARGE');
      let decision;
      try {
        const parsed = JSON.parse(raw);
        if (this.config.provider === 'ollama' && !matchesDecisionSchema(parsed)) {
          const current = input.messages[input.messages.length - 1];
          const rejected = current?.role === 'user' ? classifyMissingReadSlots(parsed, current.content) : null;
          if (rejected) throw rejected;
          throw new Error('Invalid decision schema');
        }
        decision = parseDecision(parsed);
      } catch (e) {
        if (e instanceof MissingReadSlotsRejection) throw e;
        throw error('AGENT_INVALID_PROVIDER_OUTPUT');
      }
      if (decision.kind === 'tool') {
        try {
          if (validateTool(decision).missing.length) throw new Error('Model must clarify missing fields');
        } catch { throw error('AGENT_INVALID_PROVIDER_OUTPUT'); }
      }
      signal.throwIfAborted();
      emit('provider_completed');
      return decision;
    } catch (e) {
      emit('request_rejected_safely');
      if (signal.aborted) throw error('AGENT_TIMEOUT', 504);
      if (e instanceof HttpError) throw e;
      throw error('AGENT_PROVIDER_NETWORK');
    } finally { clearTimeout(timer); outer.removeEventListener('abort', relay); }
  }
}

/** All gates are operator settings, never accepted from the HTTP body. No fetch during construction. */
export function createConfiguredProvider(env: NodeJS.ProcessEnv = process.env, fetcher: Fetcher = fetch,
  trace: TraceSink = event => console.info(JSON.stringify(event))): LlmProvider {
  const disabled = () => new UnconfiguredLlmProvider();
  if (env.LLM_LIVE_ENABLED !== 'true' || env.LLM_USAGE_APPROVED !== 'true') return disabled();
  if (env.LLM_PROVIDER === 'gemini') {
    if (env.LLM_EXTERNAL_PROCESSING_APPROVED !== 'true' || !env.GEMINI_API_KEY?.trim() || !/^[A-Za-z0-9._-]{1,120}$/.test(env.GEMINI_MODEL || '')) return disabled();
    if (env.GEMINI_FUNCTION_CALLING_ENABLED === 'true') {
      if (env.GEMINI_MODEL !== PUBLIC_GEMINI_MODEL || !/^[A-Za-z0-9._-]{1,120}$/.test(env.GEMINI_EXPECTED_MODEL_VERSION || '')) return disabled();
      return new GeminiFunctionProvider(env.GEMINI_API_KEY, env.GEMINI_EXPECTED_MODEL_VERSION!, fetcher);
    }
    return new LiveLlmProvider({ provider: 'gemini', model: env.GEMINI_MODEL!, apiKey: env.GEMINI_API_KEY }, fetcher, trace);
  }
  if (env.LLM_PROVIDER === 'ollama') {
    if (env.OLLAMA_LOCAL_ONLY_CONFIRMED !== 'true' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,119}$/.test(env.OLLAMA_MODEL || '') || /cloud/i.test(env.OLLAMA_MODEL!)) return disabled();
    if (env.OLLAMA_MODEL_DIGEST !== undefined && !/^[a-f0-9]{64}$/.test(env.OLLAMA_MODEL_DIGEST)) return disabled();
    try { return new LiveLlmProvider({ provider: 'ollama', model: env.OLLAMA_MODEL!, modelDigest: env.OLLAMA_MODEL_DIGEST,
      baseUrl: localOllamaUrl(env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434') }, fetcher, trace); }
    catch { return disabled(); }
  }
  return disabled();
}

export const SAFE_PROVIDER_ERRORS = new Set(['AGENT_PROVIDER_QUOTA', 'AGENT_PROVIDER_UNAVAILABLE', 'AGENT_PROVIDER_REJECTED',
  'AGENT_PROVIDER_RESPONSE_TOO_LARGE', 'AGENT_INVALID_PROVIDER_OUTPUT', 'AGENT_PROVIDER_NETWORK', 'AGENT_INPUT_TOKEN_LIMIT',
  'AGENT_OLLAMA_NOT_READY', 'AGENT_OLLAMA_READINESS_FAILED']);
