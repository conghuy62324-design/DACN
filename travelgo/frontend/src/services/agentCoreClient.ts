import {readWebRetrieval,readCostAdvice} from '../utils/webSourceCards';
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
    if(d.editingTrip&&(!uuid(d.editingTrip.id)||typeof d.editingTrip.title!=='string'||!d.editingTrip.title.trim()||d.editingTrip.title.length>255||Object.keys(d.editingTrip).some(k=>!['id','title'].includes(k))))throw Error('Editing Trip metadata invalid');
    if(d.languageFeedback&&(!uuid(d.languageFeedback.id)||d.languageFeedback.revision!==conversation.revision))throw Error('Language feedback metadata invalid');
    if(d.languageLearning&&(!uuid(d.languageLearning.candidateId)||typeof d.languageLearning.expression!=='string'||d.languageLearning.expression.length>48||typeof d.languageLearning.label!=='string'||typeof d.languageLearning.conceptId!=='string'||d.languageLearning.purpose!=='SAVE_PERSONAL'||d.languageLearning.policyVersion!=='TRAVELGO_LANGUAGE_MEMORY_V1'||!Number.isFinite(Date.parse(d.languageLearning.expiresAt))||d.confirmation))throw Error('Language learning confirmation invalid');
    if(d.languageClarification&&(!uuid(d.languageClarification.candidateId)||typeof d.languageClarification.expression!=='string'||d.languageClarification.expression.length>48||!Array.isArray(d.languageClarification.concepts)||d.languageClarification.concepts.length>20||d.languageClarification.concepts.some((c:any)=>typeof c.id!=='string'||typeof c.label!=='string'||c.label.length>120)||d.confirmation||d.result))throw Error('Language clarification invalid');
    if(d.languageUnderstanding&&(!Array.isArray(d.languageUnderstanding.evidence)||d.languageUnderstanding.evidence.length>4||d.languageUnderstanding.evidence.some((e:any)=>e.executionAuthority!==false||typeof e.expression!=='string'||e.expression.length>48||typeof e.conceptId!=='string')))throw Error('Language evidence invalid');
    if (d.clarification && (d.status !== 'needs_input' || d.result || d.confirmation ||
        Object.keys(d.clarification).some(k => !['suggestedOperation','requiresExplicitRequest'].includes(k)) ||
        d.clarification.requiresExplicitRequest !== true || !Object.prototype.hasOwnProperty.call(CORE_CLARIFICATION_ACTIONS, d.clarification.suggestedOperation)))
        throw Error('Gợi ý tác vụ chưa hợp lệ; chưa gửi yêu cầu công cụ.');
    if(d.webRetrieval)readWebRetrieval(d.webRetrieval);
    if(d.costIntelligence)readCostAdvice(d.costIntelligence);
    const v = d.result;
    if(d.knowledge){const k=d.knowledge;if(k.mutationAuthority!==false||!Array.isArray(k.sources)||k.sources.length>3||k.sources.some((s:any)=>{
        if(!s||typeof s.title!=='string'||!s.title.trim()||s.title.length>160||!Number.isFinite(Date.parse(s.reviewedAt))||!Number.isSafeInteger(s.version)||s.version<1||typeof s.href!=='string')return true;
        if(/^\/places\/[0-9a-f-]{36}$/i.test(s.href))return false;
        try{const u=new URL(s.href);return u.protocol!=='https:'||!!u.username||!!u.password||!!u.search||!!u.hash;}catch{return true;}
    }))throw Error('Knowledge sources invalid');}
    if (v) {
        switch (v.type) {
            case 'knowledge_options':
                if(!Array.isArray(v.items)||v.items.length>3||v.items.some((p:any)=>!p||!uuid(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>160||!['attraction','tour'].includes(p.category)||p.href!=='/places/'+p.id||typeof p.isDemo!=='boolean'||!Array.isArray(p.amenities)||p.amenities.length>4||p.amenities.some((a:any)=>typeof a!=='string'||a.length>80)||!Number.isFinite(Date.parse(p.retrievedAt))))throw Error('Knowledge catalog invalid');
                if(d.confirmation)throw Error('Knowledge cannot authorize mutation');
                break;
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
        throw Error('Chưa lấy được thông báo Core.'); return r.data; }, chat: (body: any, signal: AbortSignal) => api.post('/agent/core/chat', { ...body, intentVersion }, config(signal)), confirm: (body: any, signal: AbortSignal) => api.post('/agent/core/confirm', body, config(signal)), cancelPreview: (body:any,signal:AbortSignal) => api.post('/agent/core/preview/cancel',body,config(signal)), revoke: () => api.delete('/agent/core/sessions', { ...config(), timeout: 5000 }) }; }
