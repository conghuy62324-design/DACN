"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUNDED_RESPONSE_SCHEMA = void 0;
exports.groundedEvidenceAuthorities = groundedEvidenceAuthorities;
exports.groundedFacts = groundedFacts;
exports.renderGrounded = renderGrounded;
exports.boundedGroundingFacts = boundedGroundingFacts;
exports.catalogCostFacts = catalogCostFacts;
const httpError_js_1 = require("../utils/httpError.js");
const structuredOutput_js_1 = require("./structuredOutput.js");
const customerPersonalization_js_1 = require("./customerPersonalization.js");
exports.GROUNDED_RESPONSE_SCHEMA = { type: 'object', additionalProperties: false, required: ['kind', 'factIds', 'lead'], properties: { kind: { const: 'grounded' }, factIds: { type: 'array', maxItems: 3, uniqueItems: true, items: { type: 'string' } }, lead: { enum: ['suggestion', 'summary'] } } };
/** Projection over existing server facts, never a second evidence store or a new source of prices. */
function groundedEvidenceAuthorities(result, costFacts = {}) {
    const facts = [];
    const items = (result?.items || (result?.listing ? [result.listing] : [])).slice(0, 5);
    items.forEach((p, i) => { facts.push({ factId: 'option.' + i, authority: 'CATALOG_DATA', demo: !!p.isDemo, currentPriceConfirmed: false }); const r = p.reviewInsights; if (r?.method === 'BOUNDED_VI_ASPECT_RULES_V3' && r.evidenceScope === 'PUBLISHED_AND_AI_ALLOWED_ONLY' && r.status === 'READY' && Number.isSafeInteger(r.analyzedReviewCount) && r.analyzedReviewCount > 0)
        facts.push({ factId: 'reviews.' + i, authority: 'REVIEW_EVIDENCE', opinionOnly: true, sampleCount: r.analyzedReviewCount, currentPriceConfirmed: false }); });
    if (result?.type === 'itinerary')
        facts.push({ factId: 'plan', authority: 'PLANNER_COMPUTATION', demo: !!result.itinerary?.demo, currentPriceConfirmed: false });
    for (const [id, f] of Object.entries(costFacts || {}).slice(0, 12)) {
        if (f.factType !== 'COST')
            continue;
        const authority = f.sourceType === 'EXTERNAL_HISTORICAL' ? 'APPROVED_WEB_KNOWLEDGE' : f.sourceType === 'TRAVELGO_CATALOG' ? 'CATALOG_DATA' : f.sourceType === 'PLANNER_ESTIMATE' ? 'PLANNER_COMPUTATION' : undefined;
        if (authority)
            facts.push({ factId: id, authority, version: f.sourceVersion, demo: f.synthetic, currentPriceConfirmed: false });
    }
    // A listing property or historical observation cannot certify Booking. Only the existing Booking service can.
    return facts;
}
/** Model selects/order facts; server bundles provide complete information, not model-authored claims. */
function groundedFacts(result) {
    const facts = {};
    const items = result?.items || (result?.listing ? [result.listing] : []);
    items.slice(0, 5).forEach((p, i) => {
        facts[`option.${i}`] = `${p.name}${p.city ? ' ở ' + p.city : ''}.`;
        facts[`reason.${i}`] = Array.isArray(p.reasons) && p.reasons.length ? p.reasons.join(' ') : `Lựa chọn này có trong danh mục ${p.category === 'hotel' ? 'lưu trú' : p.category === 'restaurant' ? 'nhà hàng' : 'địa điểm'} TravelGo${p.city ? ' tại ' + p.city : ''}.`;
        const details = [p.address ? 'Địa chỉ trong TravelGo: ' + String(p.address).slice(0, 220) + '.' : 'Chưa có địa chỉ chi tiết.', p.category === 'hotel' ? 'Dịch vụ lưu trú.' : p.category === 'restaurant' ? 'Dịch vụ ăn uống.' : 'Địa điểm tham quan.', p.amenities?.length ? 'Tiện ích ghi nhận: ' + p.amenities.slice(0, 8).join(', ') + '.' : 'Chưa có tiện ích được ghi nhận.', p.reviewCount > 0 && Number.isFinite(p.rating) ? `Đánh giá trong TravelGo: ${p.rating}/5 từ ${p.reviewCount} lượt.` : 'Chưa có đánh giá khách hàng để kết luận chất lượng.'];
        facts[`details.${i}`] = details.join(' ');
        if (p.reviewInsights)
            facts[`reviews.${i}`] = (0, customerPersonalization_js_1.reviewEvidenceText)(p.reviewInsights);
        if (p.reviewInsights) {
            facts[`reviewSummary.${i}`] = (0, customerPersonalization_js_1.compactReviewEvidence)(p.reviewInsights);
            const insight = p.reviewInsights;
            facts[`reviewEvidence.${i}`] = JSON.stringify({ method: insight.method === 'BOUNDED_VI_ASPECT_RULES_V3' ? insight.method : 'UNKNOWN', sourceRevision: /^\d{1,18}$/.test(String(insight.sourceRevision)) ? String(insight.sourceRevision) : null, scope: insight.evidenceScope === 'PUBLISHED_AND_AI_ALLOWED_ONLY' ? insight.evidenceScope : 'UNSPECIFIED', opinionOnly: true, aspects: ['noise', 'cleanliness', 'price', 'staff', 'food', 'space'].filter(key => insight.aspects?.[key]).slice(0, 4).map(key => ({ aspect: key, reviewIds: (insight.aspects[key].evidence || []).slice(0, 3).map((e) => e.reviewId).filter((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) })) });
        }
        if (typeof p.href === 'string' && /^\/places\/[0-9a-f-]{36}$/i.test(p.href))
            facts[`source.${i}`] = 'Xem chi tiết trên TravelGo: ' + p.href + '.';
        if (p.priceFrom !== null && Number.isFinite(p.priceFrom) && p.priceFrom >= 0)
            facts[`price.${i}`] = `Giá tham khảo từ nguồn TravelGo${p.isDemo ? ' (giả định DEMO)' : ''}: ${p.priceFrom.toLocaleString('vi-VN')} VND; đơn vị giá và tình trạng còn chỗ chưa được xác minh.`;
        else
            facts[`unknownPrice.${i}`] = 'TravelGo chưa có giá cho lựa chọn này; cần xác minh giá, đơn vị và tình trạng còn chỗ.';
        if (p.isDemo)
            facts[`demo.${i}`] = 'Dữ liệu DEMO để kiểm thử, không phải cơ sở hoặc báo giá Booking thật.';
    });
    if (result?.type === 'itinerary')
        facts.plan = `Lịch trình có ${result.itinerary.daysCount} ngày, ${result.itinerary.nightsCount} đêm; dự toán cả nhóm ${result.cost.estimated.toLocaleString('vi-VN')} VND. Đây chưa phải báo giá hay xác nhận dịch vụ.`;
    return facts;
}
function renderGrounded(raw, facts) {
    try {
        (0, structuredOutput_js_1.assertStructuredOutput)(exports.GROUNDED_RESPONSE_SCHEMA, raw);
    }
    catch {
        throw new httpError_js_1.HttpError(502, 'Phần diễn giải AI chưa có đủ căn cứ.', 'AGENT_UNGROUNDED_RESPONSE');
    }
    if (!raw.factIds.length || raw.factIds.some((id) => !Object.hasOwn(facts, id)))
        throw new httpError_js_1.HttpError(502, 'Phần diễn giải AI chưa có đủ căn cứ.', 'AGENT_UNGROUNDED_RESPONSE');
    const bundles = [], seen = new Set();
    for (const id of raw.factIds) {
        const index = id.match(/^(?:option|price|unknownPrice|reason|details|source|reviews|reviewSummary|reviewEvidence|demo)\.(\d+)$/)?.[1];
        if (index !== undefined) {
            if (seen.has(index))
                continue;
            seen.add(index);
            if (!Object.hasOwn(facts, 'option.' + index))
                throw new httpError_js_1.HttpError(502, 'Thiếu thông tin nhận diện lựa chọn.', 'AGENT_UNGROUNDED_RESPONSE');
            const values = ['option.', 'details.', 'price.', 'unknownPrice.', 'reason.', 'reviews.', 'source.', 'demo.'].map(prefix => facts[prefix + index]).filter(Boolean);
            bundles.push([...new Set(values)].join(' '));
        }
        else
            bundles.push(facts[id]);
    }
    return (raw.lead === 'suggestion' ? 'Bạn có thể cân nhắc các lựa chọn sau từ TravelGo. ' : 'Mình tóm tắt các thông tin đang có trong dữ liệu TravelGo. ') + bundles.join('\n\n');
}
/** Model sees a bounded evidence subset; the server still renders complete bundles from fresh facts. */
function boundedGroundingFacts(facts) { const result = {}; const add = (key) => { if (Object.hasOwn(facts, key) && Buffer.byteLength(JSON.stringify({ ...result, [key]: facts[key] })) <= 7500)
    result[key] = facts[key]; }; for (let i = 0; i < 3; i++)
    for (const p of ['option.', 'price.', 'unknownPrice.'])
        add(p + i); add('plan'); for (let i = 0; i < 3; i++)
    add('reviewSummary.' + i); for (let i = 0; i < 3; i++)
    add('travelKnowledge.' + i); for (let i = 0; i < 3; i++)
    for (const p of ['reviewEvidence.', 'reason.', 'details.', 'source.', 'demo.'])
        add(p + i); return result; }
/** A catalog amount has an unknown unit; it cannot be promoted to a room/night or confirmed Booking price. */
function catalogCostFacts(result) { const out = {}; const items = result?.items || (result?.listing ? [result.listing] : []); for (const [p, index] of items.slice(0, 3).map((p, i) => [p, i])) {
    if (typeof p.priceFrom !== 'number' || !Number.isFinite(p.priceFrom) || p.priceFrom < 0)
        continue;
    const id = 'price.' + index;
    out[id] = { id, factType: 'COST', destination: p.geography?.locationId || null, category: p.category === 'hotel' ? 'ACCOMMODATION' : p.category === 'restaurant' ? 'FOOD' : 'ATTRACTION', amount: p.priceFrom, range: { min: p.priceFrom, max: p.priceFrom }, currency: 'VND', unit: 'UNKNOWN_UNIT', classification: 'REPORTED', sourceType: 'TRAVELGO_CATALOG', sourceId: 'option.' + index, sourceVersion: Number.isSafeInteger(p.version) ? p.version : null, sourceUrl: null, period: null, included: [], excluded: [], unknownItems: ['PRICE_UNIT', 'CURRENT_AVAILABILITY', 'BOOKING_PRICE'], comparability: 'NOT_COMPARABLE_WITH_HISTORICAL_COMPONENT_OR_TRIP_TOTAL', freshness: { reviewedAt: p.approvedAt || null, expiresAt: null, retrievedAt: null }, caveats: ['TravelGo catalog from-price; unit and availability unverified.', 'Not an external historical observation, Planner estimate or confirmed Booking price.', 'Do not convert to per-person/per-room/night or add to whole-trip totals.'], synthetic: !!p.isDemo };
} return out; }
