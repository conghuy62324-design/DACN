import type { ChatMessage } from './conversation.js';
import { HttpError } from '../utils/httpError.js';

export interface ProviderRequest {
  system: string;
  messages: ChatMessage[];
  tools: readonly unknown[];
  responseSchema?: unknown;
}

/** SDK-specific credentials/HTTP belong inside a future transport, never this request. */
export interface LlmProvider {
  readonly configured: boolean;
  readonly external?: boolean;
  generate(input: ProviderRequest, signal: AbortSignal): Promise<unknown>;
}

/** Adapter seam for a provider that returns one JSON decision, without markdown fences. */
export class JsonLlmProvider implements LlmProvider {
  readonly configured = true;
  constructor(private readonly transport: (input: ProviderRequest, signal: AbortSignal) => Promise<string>) {}
  async generate(input: ProviderRequest, signal: AbortSignal): Promise<unknown> {
    const raw = await this.transport(input, signal);
    if (typeof raw !== 'string' || raw.length > 16000) throw new Error('Invalid provider envelope');
    return JSON.parse(raw);
  }
}

/** Production default: no test/mock fallback and no automatic external data transfer. */
export class UnconfiguredLlmProvider implements LlmProvider {
  readonly configured = false;
  async generate(): Promise<never> {
    throw new HttpError(503, 'LLM chưa được cấu hình. Hãy dùng Tour Planner hiện có.', 'AGENT_PROVIDER_NOT_CONFIGURED');
  }
}

export async function withinDeadline<T>(work: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      Promise.resolve().then(() => work(controller.signal)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          const error = new HttpError(504, 'Dịch vụ chưa phản hồi kịp. Vui lòng thử lại.', 'AGENT_TIMEOUT');
          controller.abort(error);
          reject(error);
        }, ms);
      }),
    ]);
  } finally { clearTimeout(timer!); }
}
