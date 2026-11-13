import { HttpError } from '../utils/httpError.js';
import { EXTERNAL_CONSENT_VERSION } from './privacy.js';

export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export const MAX_MESSAGES = 20;
export const MAX_CONTEXT_CHARS = 16000;

export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Dữ liệu phải là object.', 'AGENT_INVALID_INPUT');
  }
  return value as Record<string, unknown>;
}
export function onlyKeys(value: Record<string, unknown>, keys: readonly string[]) {
  if (Object.keys(value).some(key => !keys.includes(key))) {
    throw new HttpError(400, 'Có trường không được hỗ trợ.', 'AGENT_INVALID_INPUT');
  }
}
function content(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) {
    throw new HttpError(400, 'Mỗi tin nhắn cần từ 1 đến 2000 ký tự.', 'AGENT_INVALID_INPUT');
  }
  return value.trim();
}

/** Client history is untrusted dialogue, never authorization or tool evidence. */
export function readConversation(raw: unknown): ChatMessage[] {
  const input = object(raw);
  onlyKeys(input, ['message', 'history', 'externalProcessingConsent']);
  if (input.externalProcessingConsent !== undefined && input.externalProcessingConsent !== EXTERNAL_CONSENT_VERSION) {
    throw new HttpError(400, 'Phiên bản đồng ý xử lý bên ngoài không hợp lệ.', 'AGENT_INVALID_INPUT');
  }
  const history = input.history === undefined ? [] : input.history;
  if (!Array.isArray(history) || history.length > MAX_MESSAGES || history.length % 2 !== 0) {
    throw new HttpError(400, 'Lịch sử cần tối đa 10 cặp hội thoại hoàn chỉnh.', 'AGENT_INVALID_INPUT');
  }
  const messages: ChatMessage[] = history.map((rawMessage, index) => {
    const message = object(rawMessage);
    onlyKeys(message, ['role', 'content']);
    const expected = index % 2 === 0 ? 'user' : 'assistant';
    if (message.role !== expected) throw new HttpError(400, 'Thứ tự hội thoại không hợp lệ.', 'AGENT_INVALID_INPUT');
    return { role: expected, content: content(message.content) };
  });
  messages.push({ role: 'user', content: content(input.message) });
  if (messages.reduce((sum, m) => sum + m.content.length, 0) > MAX_CONTEXT_CHARS) {
    throw new HttpError(400, 'Hội thoại quá dài; hãy bắt đầu hội thoại mới.', 'AGENT_CONTEXT_LIMIT');
  }
  return messages;
}

export function finishConversation(messages: ChatMessage[], reply: string) {
  const history: ChatMessage[] = [...messages.map(m => ({ ...m })), { role: 'assistant', content: reply }];
  let truncated = false;
  // Reserve room for the next full-size user message.
  while (history.length > MAX_MESSAGES || history.reduce((sum, m) => sum + m.content.length, 0) > MAX_CONTEXT_CHARS - 2000) {
    history.splice(0, 2); truncated = true;
  }
  return { history, historyTruncated: truncated };
}
