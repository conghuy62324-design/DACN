import type { AgentResponse, AgentPrivacy, AgentG2Privacy, AgentG2Request, AgentConversationMetadata, AgentError, AgentChatRequest } from '../types/agent';

const invalid = () => { throw { status: 502, code: 'AGENT_INVALID_RESPONSE' }; };
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string');
const money = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const place = (p: any) => p && typeof p.id === 'string' && typeof p.name === 'string' &&
  typeof p.catalogPriceAvailable === 'boolean' && (p.priceFrom === null || money(p.priceFrom));
export const G2_CONSENT_VERSION = 'LOCAL_DEMO_SLOTS_V1' as const;
export const AGENT_MISSING_FIELDS = ['departureCity', 'destinationCity', 'startDate', 'endDate', 'adults', 'totalBudget', 'transportation', 'dailyBudgetPerPerson'] as const;
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const keys = (value: any, allowed: string[]) => value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(k => allowed.includes(k));

export function parseConversationMetadata(value: any): AgentConversationMetadata {
  if (!keys(value, ['id', 'revision', 'expiresAt', 'mode', 'persisted']) || !uuid(value.id) || !Number.isSafeInteger(value.revision) || value.revision < 1 ||
    typeof value.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value.expiresAt) || !Number.isFinite(Date.parse(value.expiresAt)) ||
    value.mode !== 'LOCAL_DEMO' || value.persisted !== false) return invalid();
  return { id: value.id.toLowerCase(), revision: value.revision, expiresAt: value.expiresAt, mode: 'LOCAL_DEMO', persisted: false };
}
export function acceptTurnMetadata(value: unknown, request: AgentG2Request, previous?: AgentConversationMetadata): AgentConversationMetadata {
  const next = parseConversationMetadata(value);
  if (request.action === 'start' ? next.revision !== 1 : next.id !== request.id.toLowerCase() || next.revision !== request.revision + 1) return invalid();
  if (previous && (next.id !== previous.id || next.expiresAt !== previous.expiresAt)) return invalid();
  return next;
}
export function projectAgentRequest(input: AgentChatRequest): AgentChatRequest {
  if (typeof input?.message !== 'string' || !input.message.trim() || input.message.length > 2000) throw { status: 400, code: 'AGENT_INVALID_INPUT' };
  if (input.conversation !== undefined) {
    const v = input.conversation;
    if (!keys(v, ['action', 'requestId', 'consentVersion', 'id', 'revision']) || !uuid(v.requestId) || v.consentVersion !== G2_CONSENT_VERSION ||
      !['start', 'continue'].includes(v.action) || (v.action === 'start' ? 'id' in v || 'revision' in v : !uuid(v.id) || !Number.isSafeInteger(v.revision) || v.revision < 0)) {
      throw { status: 400, code: 'AGENT_G2_INVALID_INPUT' };
    }
    return { message: input.message, conversation: v.action === 'start'
      ? { action: 'start', requestId: v.requestId, consentVersion: G2_CONSENT_VERSION }
      : { action: 'continue', requestId: v.requestId, consentVersion: G2_CONSENT_VERSION, id: v.id, revision: v.revision } };
  }
  return { message: input.message, history: (input.history || []).map(m => ({ role: m.role, content: m.content })),
    ...(input.externalProcessingConsent ? { externalProcessingConsent: input.externalProcessingConsent } : {}) };
}

/** Metadata is still request-bound at the controller's token/generation boundary.
 * An unknown start ID is trusted only as this authenticated server's revision1;
 * UUID shape alone is never an ownership assertion. */
export function normalizeAgentError(raw: any, status: number, requestData?: unknown, canceled = false): AgentError {
  const result: AgentError = { status: Number.isInteger(status) && status >= 0 && status <= 599 ? status : 0,
    code: typeof raw?.code === 'string' && /^(?:AGENT_[A-Z0-9_]{1,64}|AUTH_REQUIRED|INVALID_TOKEN|TOKEN_EXPIRED)$/.test(raw.code) ? raw.code : undefined, canceled };
  try {
    const request = typeof requestData === 'string' ? JSON.parse(requestData) : requestData as any;
    if (result.status !== 409 && result.status !== 401 && result.status >= 400 && result.code?.startsWith('AGENT_') && request?.conversation) {
      const projected = projectAgentRequest(request);
      result.conversation = acceptTurnMetadata(raw?.conversation, projected.conversation!);
    }
  } catch { /* Drop malformed/foreign/stale metadata; never surface raw exception. */ }
  return result;
}

export function parseG2Privacy(envelope: any): AgentG2Privacy {
  const value = envelope?.data;
  if (envelope?.success !== true || !keys(value, ['version', 'mode', 'ttlSeconds', 'text', 'enabled']) || value.version !== G2_CONSENT_VERSION ||
    value.mode !== 'LOCAL_DEMO' || value.ttlSeconds !== 900 || typeof value.enabled !== 'boolean' || typeof value.text !== 'string' || !value.text.trim()) return invalid();
  return { version: G2_CONSENT_VERSION, mode: 'LOCAL_DEMO', ttlSeconds: 900, text: value.text, enabled: value.enabled };
}

/** Inspect envelope, union and rendered fields before trusting API data. Never synthesize success. */
export function parseAgentResponse(envelope: any): AgentResponse {
  const d = envelope?.data;
  if (envelope?.success !== true || !d || typeof d.reply !== 'string' || typeof d.historyTruncated !== 'boolean' ||
    !Array.isArray(d.history) || d.history.length > 20 || d.history.length % 2 ||
    !d.history.every((m: any, i: number) => m?.role === (i % 2 ? 'assistant' : 'user') && typeof m.content === 'string' && m.content.length <= 2000) ||
    !['STATELESS', 'LOCAL_DEMO_VERIFIED_HISTORY'].includes(d.context?.mode) || typeof d.context?.personalizationEnabled !== 'boolean' ||
    d.context?.persisted !== false || d.context?.behavioralDataUsed !== false) return invalid();
  if (d.context.mode === 'STATELESS' ? d.conversation !== undefined : !d.conversation) return invalid();
  const conversation = d.context.mode === 'LOCAL_DEMO_VERIFIED_HISTORY' ? parseConversationMetadata(d.conversation) : undefined;
  if (d.status === 'needs_input' && (!strings(d.missingFields) || d.missingFields.length > 8 ||
    d.missingFields.some(f => !(AGENT_MISSING_FIELDS as readonly string[]).includes(f)))) return invalid();
  if (d.status === 'tool_unavailable' && d.warningCode !== 'AGENT_CATALOG_INSUFFICIENT') return invalid();
  if (!['completed', 'needs_input', 'unsupported', 'tool_unavailable'].includes(d.status)) return invalid();
  if (d.status === 'completed') {
    const r = d.result;
    if (!r || !strings(r.warnings)) return invalid();
    if (r.type === 'places') {
      if (r.source !== 'RecommendationService' || !Array.isArray(r.places) || !r.places.every(place)) return invalid();
    } else if (r.type === 'itinerary') {
      const p = r.itinerary, c = r.cost;
      if (r.source !== 'TourPlannerService' || !p || !c || c.currency !== 'VND' || c.basis !== 'GROUP_VND_V1' ||
        ![c.estimated, c.budget, c.overBudget].every(money) || !['within_budget', 'over_budget'].includes(c.budgetStatus) ||
        !['title', 'destinationCity', 'startDate', 'endDate', 'budgetAdvice'].every(k => typeof p[k] === 'string') ||
        !strings(p.costAssumptions) || !strings(p.constraintViolations) || !Array.isArray(p.days) ||
        !p.days.every((day: any) => typeof day.date === 'string' && typeof day.themeTitle === 'string' && money(day.dayEstimatedCostVND) &&
          Array.isArray(day.activities) && day.activities.every((a: any) => typeof a.title === 'string' && typeof a.description === 'string' && money(a.estimatedCostVND))) ||
        (p.hotelSuggestion && !place(p.hotelSuggestion))) return invalid();
    } else return invalid();
  }
  return { ...d, ...(conversation ? { conversation } : {}), history: d.history.map((m: any) => ({ role: m.role, content: m.content })) } as AgentResponse;
}
export function parseAgentPrivacy(envelope: any): AgentPrivacy {
  if (envelope?.success !== true || typeof envelope.data?.version !== 'string' || !envelope.data.version ||
    typeof envelope.data.text !== 'string' || !envelope.data.text) return invalid();
  return { version: envelope.data.version, text: envelope.data.text };
}
export function agentErrorMessage(error: { status?: number; code?: string }) {
  switch (error.code) {
    case 'AGENT_G2_SESSION_UNAVAILABLE': return 'Phiên G2 không còn khả dụng hoặc đã hết hạn. Hãy bắt đầu phiên mới; không khôi phục từ lịch sử trên trình duyệt.';
    case 'AGENT_G2_REVISION_CONFLICT': case 'AGENT_G2_REPLAY': case 'AGENT_G2_BUSY': case 'AGENT_G2_STALE_TURN':
      return 'Phiên đã thay đổi hoặc yêu cầu không còn hợp lệ. Hãy đặt lại hoặc kết thúc phiên trước khi gửi tiếp.';
    case 'AGENT_G2_DISABLED': return 'G2 demo chưa được bật trên máy chủ. Bạn vẫn có thể dùng chế độ G1.';
    case 'AGENT_G2_CONSENT_REQUIRED': return 'Cần đọc và đồng ý thông báo lưu slots tạm của G2 trước khi bắt đầu.';
    case 'AGENT_CLIENT_UUID_UNAVAILABLE': return 'Trình duyệt chưa hỗ trợ tạo mã yêu cầu an toàn. Hãy dùng chế độ G1.';
  }
  switch (error.status) {
    case 400: return 'Yêu cầu chưa hợp lệ. Hãy kiểm tra nội dung hoặc bắt đầu hội thoại mới nếu lịch sử quá dài.';
    case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    case 428: return 'Cần bạn đồng ý trước khi gửi hội thoại đến dịch vụ bên ngoài.';
    case 429: return 'Đã đạt giới hạn sử dụng. Vui lòng thử lại sau.';
    case 502: return 'Chưa nhận được kết quả hợp lệ từ Agent. Bạn có thể thử lại.';
    case 503: return error.code === 'AGENT_PROVIDER_NOT_CONFIGURED'
      ? 'Trợ lý AI chưa sẵn sàng. Bạn có thể dùng công cụ tạo lịch trình thông thường.'
      : 'Dịch vụ AI tạm thời không khả dụng. Vui lòng thử lại sau.';
    case 504: return 'Yêu cầu quá thời gian chờ. Bạn có thể chủ động thử lại.';
    default: return 'Không thể kết nối với Agent. Hãy kiểm tra mạng và thử lại.';
  }
}
