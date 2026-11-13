import { HttpError } from '../utils/httpError.js';

export const OLLAMA_READINESS_TIMEOUT_MS = 2000;
export type ProviderEvent = 'provider_request_started' | 'readiness_check_started' | 'model_not_resident' |
  'readiness_check_failed' | 'readiness_verified' | 'inference_request_started' | 'deadline_triggered' |
  'abort_propagated' | 'underlying_fetch_settled' | 'provider_completed' | 'request_rejected_safely';
export type Operation = 'version' | 'tags' | 'ps' | 'inference' | 'token_count';
export type ReadinessReason = 'unavailable' | 'invalid_metadata' | 'deadline' | 'tag_mismatch' | 'digest_mismatch' |
  'not_resident' | 'context_mismatch' | 'expired';
export type Emit = (event: ProviderEvent, operation?: Operation, reason?: ReadinessReason) => void;

export function localOllamaUrl(raw: string): string {
  const url = new URL(raw);
  if (url.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname) ||
    url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('Invalid Ollama endpoint');
  if (url.hostname === 'localhost') url.hostname = '127.0.0.1';
  return url.origin;
}

class ReadinessError extends HttpError {
  constructor(readonly reason: ReadinessReason, notReady = false) {
    super(503, 'Ollama local chưa sẵn sàng. Vui lòng liên hệ người vận hành.',
      notReady ? 'AGENT_OLLAMA_NOT_READY' : 'AGENT_OLLAMA_READINESS_FAILED');
  }
}
const digest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const record = (value: any) => value && typeof value === 'object' && !Array.isArray(value);

/** Read-only control-plane signals, not a guarantee of subsequent inference or GPU cleanup.
 * No Promise.race here: a fetch/body ignoring abort must continue occupying the provider slot.
 * The existing outer API deadline returns independently while that work settles. */
export async function assertOllamaReady(config: { baseUrl: string; model: string; modelDigest?: string },
  fetcher: typeof fetch, parent: AbortSignal, context: number, emit: Emit): Promise<void> {
  const base = localOllamaUrl(config.baseUrl);
  const controller = new AbortController(), signal = controller.signal;
  let timedOut = false;
  const relay = () => controller.abort(parent.reason);
  parent.addEventListener('abort', relay, { once: true });
  if (parent.aborted) relay();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, OLLAMA_READINESS_TIMEOUT_MS);
  const get = async (operation: 'version' | 'tags' | 'ps') => {
    signal.throwIfAborted();
    let response: Response;
    try { response = await fetcher(`${base}/api/${operation}`, { method: 'GET', redirect: 'error', signal }); }
    finally { emit('underlying_fetch_settled', operation); }
    if (signal.aborted) { await response.body?.cancel(); signal.throwIfAborted(); }
    if (!response.ok || Number(response.headers.get('content-length')) > 65536) {
      await response.body?.cancel(); throw new ReadinessError('unavailable');
    }
    const reader = response.body?.getReader();
    if (!reader) throw new ReadinessError('invalid_metadata');
    const chunks: Uint8Array[] = []; let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (signal.aborted) { await reader.cancel(); signal.throwIfAborted(); }
        if (done) break;
        bytes += value.byteLength;
        if (bytes > 65536) { await reader.cancel(); throw new ReadinessError('invalid_metadata'); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    signal.throwIfAborted();
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  };
  emit('readiness_check_started');
  try {
    const version = await get('version');
    if (!record(version) || typeof version.version !== 'string' || !version.version.trim()) throw new ReadinessError('invalid_metadata');
    const tags = await get('tags');
    if (!record(tags) || !Array.isArray(tags.models)) throw new ReadinessError('invalid_metadata');
    const installed = tags.models.find((m: any) => record(m) && m.name === config.model && m.model === config.model);
    if (!installed) throw new ReadinessError('tag_mismatch', true);
    if (!digest(installed.digest)) throw new ReadinessError('invalid_metadata');
    if (config.modelDigest && installed.digest !== config.modelDigest) throw new ReadinessError('digest_mismatch', true);
    const ps = await get('ps');
    if (!record(ps) || !Array.isArray(ps.models)) throw new ReadinessError('invalid_metadata');
    const resident = ps.models.find((m: any) => record(m) && m.name === config.model && m.model === config.model);
    if (!resident) { emit('model_not_resident'); throw new ReadinessError('not_resident', true); }
    if (!digest(resident.digest) || resident.digest !== installed.digest) throw new ReadinessError('digest_mismatch', true);
    if (resident.context_length !== context) throw new ReadinessError('context_mismatch', true);
    if (resident.expires_at !== undefined && (typeof resident.expires_at !== 'string' || !Number.isFinite(Date.parse(resident.expires_at)) || Date.parse(resident.expires_at) <= Date.now())) throw new ReadinessError('expired', true);
    // Do not infer free VRAM, GPU split or load success from allocation metadata.
    for (const field of ['size', 'size_vram']) if (resident[field] !== undefined &&
      (!Number.isSafeInteger(resident[field]) || resident[field] < 0)) throw new ReadinessError('invalid_metadata');
    parent.throwIfAborted(); signal.throwIfAborted();
    emit('readiness_verified');
  } catch (e) {
    if (parent.aborted) throw parent.reason;
    const safe = e instanceof ReadinessError ? e : new ReadinessError(timedOut ? 'deadline' : 'unavailable');
    emit('readiness_check_failed', undefined, safe.reason);
    throw safe;
  } finally { clearTimeout(timer); parent.removeEventListener('abort', relay); }
}
