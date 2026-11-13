import { api } from './api';
import { parseAgentResponse } from '../utils/agentContract';
export const CORE_CONSENT = 'TRAVELGO_CORE_SLOTS_V1';
export const CORE_INTENT_V2 = 'CORE_INTENT_V2';
export const NATURAL_CHAT_V3 = 'NATURAL_CHAT_V3';
// The model supplies only an enum; actual next messages are fixed client commands chosen by the user.
export const CORE_CLARIFICATION_ACTIONS = {
    search_registered_hotels: {label: 'Tìm khách sạn', message: 'Tìm khách sạn'},
    search_registered_restaurants: {label: 'Tìm nhà hàng', message: 'Tìm nhà hàng'},
    get_listing_details: {label: 'Xem chi tiết lựa chọn', message: 'Xem chi tiết'},
    compare_travel_options: {label: 'So sánh các lựa chọn', message: 'So sánh các lựa chọn này'},
    search_places: {label: 'Tìm địa điểm', message: 'Tìm địa điểm'},
    plan_trip: {label: 'Lập lại lịch trình', message: 'Lập lại lịch trình'},
    get_trip: {label: 'Xem Trip của tôi', message: 'Xem Trip của tôi'},
    save_or_update_trip: {label: 'Xem trước lưu Trip', message: 'Lưu Trip'},
    booking_preview: {label: 'Xem trước Booking', message: 'Chuẩn bị Booking'}
} as const;
const uuid = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export type CoreMetadata = {
    id: string;
    revision: number;
    expiresAt: string;
    mode: 'CORE_VERIFIED';
    persisted: false;
};
export function coreMetadata(v: any, request: any, previous?: CoreMetadata): CoreMetadata { if (!v || Object.keys(v).some(k => !['id', 'revision', 'expiresAt', 'mode', 'persisted'].includes(k)) || !uuid(v.id) || v.mode !== 'CORE_VERIFIED' || v.persisted !== false || !Number.isSafeInteger(v.revision) || !Number.isFinite(Date.parse(v.expiresAt)) || request.action === 'start' && v.revision !== 1 || request.action === 'continue' && (v.id !== request.id || v.revision !== request.revision + 1) || previous && (v.id !== previous.id || v.expiresAt !== previous.expiresAt))
    throw Error('Metadata Core không hợp lệ. Hãy kết thúc và bắt đầu lại.'); return v; }
function listing(p: any) { return p && uuid(p.id) && typeof p.name === 'string' && (p.source === 'TRAVELGO_REGISTERED_CATALOG'||p.source==='DEMO'&&p.isDemo===true&&p.bookingEligible===false&&p.catalogMetadata?.source==='DEMO') && (p.priceFrom === null || typeof p.priceFrom === 'number' && Number.isFinite(p.priceFrom) && p.priceFrom >= 0); }
export function readCoreResponse(r: any, request: any, previous?: CoreMetadata) {
    const d = r?.data;
    if (r?.success !== true || typeof d?.reply !== 'string' || !['completed', 'no_results', 'needs_input', 'needs_confirmation'].includes(d.status))
        throw Error('Phản hồi Core không hợp lệ.');
    const conversation = coreMetadata(d.conversation, request, previous);
    if (d.clarification && (d.status !== 'needs_input' || d.result || d.confirmation ||
        Object.keys(d.clarification).some(k => !['suggestedOperation','requiresExplicitRequest'].includes(k)) ||
        d.clarification.requiresExplicitRequest !== true || !Object.prototype.hasOwnProperty.call(CORE_CLARIFICATION_ACTIONS, d.clarification.suggestedOperation)))
        throw Error('Gợi ý tác vụ chưa hợp lệ; chưa gửi yêu cầu công cụ.');
    const v = d.result;
    if (v) {
        switch (v.type) {
            case 'registered_options':
            case 'comparison':
                if (!Array.isArray(v.items) || v.items.length > 5 || !v.items.every(listing))
                    throw Error('Catalog response invalid');
                break;
            case 'listing_details':
            case 'booking_preview':
                if (!listing(v.listing))
                    throw Error('Listing response invalid');
                if (v.pricing && !['unitPrice', 'quantity', 'discountAmount', 'totalAmount'].every(k => typeof v.pricing[k] === 'number' && Number.isFinite(v.pricing[k]) && v.pricing[k] >= 0))
                    throw Error('Booking price invalid');
                break;
            case 'itinerary':
                parseAgentResponse({ success: true, data: { status: 'completed', reply: d.reply, history: [], historyTruncated: false, context: { mode: 'STATELESS', personalizationEnabled: false, behavioralDataUsed: false, persisted: false }, result: v } });
                break;
            case 'trip':
                if (typeof v.trip?.id !== 'string' || typeof v.trip?.title !== 'string')
                    throw Error('Trip response invalid');
                break;
            default: throw Error('Unknown Core result');
        }
    }
    if (d.confirmation) {
        const c = d.confirmation;
        if (typeof c.id !== 'string' || typeof c.payloadHash !== 'string' || !/^[a-f0-9]{64}$/.test(c.payloadHash) || !['CREATE', 'UPDATE'].includes(c.operation) || !Array.isArray(c.plan?.days) || !Number.isFinite(c.plan.totalEstimatedCostVND) || !Number.isFinite(Date.parse(c.expiresAt)))
            throw Error('Bản xem trước không hợp lệ.');
    }
    return { ...d, conversation };
}
export function agentCoreClient(token: string, intentVersion: typeof CORE_INTENT_V2 | typeof NATURAL_CHAT_V3 = CORE_INTENT_V2) { const config = (signal?: AbortSignal) => ({ signal, timeout: 25000, headers: { Authorization: `Bearer ${token}` } }); return { privacy: async (signal: AbortSignal) => { const r: any = await api.get('/agent/core/privacy', config(signal)); if (r?.success !== true || r.data?.version !== CORE_CONSENT || r.data?.mode !== 'CORE_VERIFIED' || r.data.ttlSeconds !== 900 || typeof r.data.text !== 'string')
        throw Error('Chưa lấy được thông báo Core.'); return r.data; }, chat: (body: any, signal: AbortSignal) => api.post('/agent/core/chat', { ...body, intentVersion }, config(signal)), confirm: (body: any, signal: AbortSignal) => api.post('/agent/core/confirm', body, config(signal)), revoke: () => api.delete('/agent/core/sessions', { ...config(), timeout: 5000 }) }; }
