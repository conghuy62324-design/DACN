import type { AgentResponse, AgentPrivacy } from '../types/agent';

const invalid = () => { throw { status: 502, code: 'AGENT_INVALID_RESPONSE' }; };
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === 'string');
const money = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const place = (p: any) => p && typeof p.id === 'string' && typeof p.name === 'string' &&
  typeof p.catalogPriceAvailable === 'boolean' && (p.priceFrom === null || money(p.priceFrom));

/** Inspect envelope, union and rendered fields before trusting API data. Never synthesize success. */
export function parseAgentResponse(envelope: any): AgentResponse {
  const d = envelope?.data;
  if (envelope?.success !== true || !d || typeof d.reply !== 'string' || typeof d.historyTruncated !== 'boolean' ||
    !Array.isArray(d.history) || d.history.length > 20 || d.history.length % 2 ||
    !d.history.every((m: any, i: number) => m?.role === (i % 2 ? 'assistant' : 'user') && typeof m.content === 'string' && m.content.length <= 2000) ||
    d.context?.mode !== 'STATELESS' || d.context?.persisted !== false || d.context?.behavioralDataUsed !== false) return invalid();
  if (d.status === 'needs_input' && !strings(d.missingFields)) return invalid();
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
  return { ...d, history: d.history.map((m: any) => ({ role: m.role, content: m.content })) } as AgentResponse;
}
export function parseAgentPrivacy(envelope: any): AgentPrivacy {
  if (envelope?.success !== true || typeof envelope.data?.version !== 'string' || !envelope.data.version ||
    typeof envelope.data.text !== 'string' || !envelope.data.text) return invalid();
  return { version: envelope.data.version, text: envelope.data.text };
}
export function agentErrorMessage(error: { status?: number; code?: string }) {
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
