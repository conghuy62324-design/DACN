"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decisionIntelligenceEnabled = void 0;
exports.createDecisionProfile = createDecisionProfile;
exports.analyzeDecision = analyzeDecision;
exports.controlledDecisionContext = controlledDecisionContext;
exports.renderDecision = renderDecision;
exports.readDecisionAct = readDecisionAct;
exports.plannerBudgetAdvice = plannerBudgetAdvice;
const vietnameseNormalizer_js_1 = require("./vietnameseNormalizer.js");
const planningIntelligence_js_1 = require("./planningIntelligence.js");
const vietnam_js_1 = require("../geography/vietnam.js");
const geographicEvidence_js_1 = require("./geographicEvidence.js");
const plannerFeasibility_js_1 = require("../utils/plannerFeasibility.js");
const decisionIntelligenceEnabled = () => process.env.PERSONALIZED_DECISION_ENABLED === 'true';
exports.decisionIntelligenceEnabled = decisionIntelligenceEnabled;
const label = { quiet: 'yên tĩnh', clean: 'vệ sinh', price: 'giá tham khảo thấp', nature: 'thiên nhiên', culture: 'văn hóa', food: 'ẩm thực', relaxed: 'nghỉ ngơi', balcony: 'ban công' };
function createDecisionProfile(values, memory, allowed) {
    const category = memory.category || memory.dialogue?.currentGoal?.category || 'hotel', filters = { ...memory.filters[category], ...memory.dialogue?.constraints[category] }, current = memory.qualityOverride;
    let soft = current ? current.preferred.map(q => q === 'value' ? 'price' : q) : allowed.filter(p => p.status === 'ACTIVE' && p.type === 'quality' && ['quiet', 'clean', 'value'].includes(p.value)).map(p => p.value === 'value' ? 'price' : p.value);
    const inTrip = memory.dialogue?.softPreferences[category] || [];
    if (inTrip.length)
        soft = [...soft, ...inTrip.filter(p => ['quiet', 'cleanliness', 'price'].includes(p) && !current?.deprioritized.includes((p === 'cleanliness' ? 'clean' : p === 'price' ? 'value' : p))).map(p => p === 'cleanliness' ? 'clean' : p)];
    if (memory.decision?.unresolved.includes('BALCONY_EVIDENCE'))
        soft.push('balcony');
    if (memory.advisoryPriority)
        soft = [memory.advisoryPriority, ...soft];
    const location = (0, vietnam_js_1.resolveLocation)(filters.locationId || filters.city || values.destinationCity);
    return { hard: { ...(location ? { locationId: location.id } : {}), ...(Number.isSafeInteger(values.totalBudget) ? { tripBudget: values.totalBudget } : {}), ...(filters.maxPriceFrom !== undefined ? { maxPriceFrom: filters.maxPriceFrom } : {}), ...(filters.accommodationType ? { accommodationType: filters.accommodationType } : {}), ...(filters.amenities?.length ? { amenities: filters.amenities.slice(0, 6) } : {}), excludedIds: memory.dialogue?.rejectedOptions.slice(-10) || [] }, soft: [...new Set(soft)].slice(0, 6), flexible: structuredClone(memory.decision?.flexible || []).slice(0, 3), unresolved: memory.decision?.unresolved.slice(0, 5) || [], source: current || inTrip.length || memory.advisoryPriority ? 'CURRENT_TRIP' : soft.length ? 'SAVED_MEMORY' : 'NONE' };
}
/** A relation over evidence, not a replacement ranking score. Missing evidence never contributes support. */
function analyzeDecision(base, result, profile) {
    const items = (result.items || (result.listing ? [result.listing] : [])).slice(0, 3), hard = profile.hard;
    const comparable = items.length > 1 && new Set(items.map((p) => p.category)).size === 1 && new Set(items.map((p) => p.currency || 'VND')).size === 1;
    const options = items.map((p, index) => {
        const reasons = [];
        if (hard.locationId && !(0, vietnam_js_1.matchesLocation)(p, hard.locationId))
            reasons.push('LOCATION');
        if (hard.maxPriceFrom !== undefined && (!(typeof p.priceFrom === 'number' && Number.isFinite(p.priceFrom)) || p.priceFrom > hard.maxPriceFrom || (p.currency && p.currency !== 'VND')))
            reasons.push('REFERENCE_PRICE_CAP');
        if (hard.accommodationType && p.catalogMetadata?.accommodationType !== hard.accommodationType)
            reasons.push('REQUIRED_TYPE');
        if (hard.amenities?.some(a => !(p.amenities || []).includes(a)))
            reasons.push('REQUIRED_AMENITY_UNVERIFIED');
        if (hard.excludedIds?.includes(p.id))
            reasons.push('CUSTOMER_REJECTED');
        const criteria = profile.soft.map(criterion => {
            const aspect = criterion === 'quiet' ? 'noise' : criterion === 'clean' ? 'cleanliness' : null, a = aspect ? p.reviewInsights?.aspects?.[aspect] : undefined;
            let state = 'UNKNOWN';
            if (p.reviewInsights?.method === 'BOUNDED_VI_ASPECT_RULES_V3' && p.reviewInsights?.evidenceScope === 'PUBLISHED_AND_AI_ALLOWED_ONLY' && p.reviewInsights?.status === 'READY' && a && Number.isSafeInteger(a.supportCount) && a.supportCount > 0 && a.counts && ['POSITIVE', 'NEGATIVE', 'MIXED', 'NEUTRAL', 'UNKNOWN'].every(k => Number.isSafeInteger(a.counts[k]) && a.counts[k] >= 0) && Object.values(a.counts).reduce((n, v) => n + v, 0) === a.supportCount) {
                const c = a.counts;
                state = c.MIXED > 0 || c.POSITIVE > 0 && c.NEGATIVE > 0 ? 'MIXED' : c.NEGATIVE > 0 ? 'CONFLICTS' : c.POSITIVE > 0 && c.UNKNOWN === 0 ? 'SUPPORTS' : 'UNKNOWN';
            }
            if (criterion === 'balcony' && p.amenities?.includes('Ban công'))
                state = 'SUPPORTS';
            return { criterion, state, factIds: aspect && p.reviewInsights ? ['reviews.' + index, 'reviewEvidence.' + index] : criterion === 'balcony' ? ['details.' + index] : [] };
        });
        return { index, eligibility: reasons.length ? 'EXCLUDED' : 'ELIGIBLE', hardReasons: reasons, criteria };
    });
    const eligible = options.filter(o => o.eligibility === 'ELIGIBLE');
    let recommendationIndex = null;
    const quality = profile.soft.filter(p => p === 'quiet' || p === 'clean' || p === 'balcony');
    if (profile.soft[0] === 'price' && comparable) {
        const priced = eligible.filter(o => typeof items[o.index].priceFrom === 'number' && Number.isFinite(items[o.index].priceFrom));
        if (priced.length === eligible.length && priced.length) {
            const min = Math.min(...priced.map(o => items[o.index].priceFrom)), lowest = priced.filter(o => items[o.index].priceFrom === min);
            if (lowest.length === 1)
                recommendationIndex = lowest[0].index;
        }
    }
    else if (quality.length) {
        const supported = eligible.filter(o => quality.every(q => o.criteria.find(c => c.criterion === q)?.state === 'SUPPORTS'));
        if (supported.length === 1)
            recommendationIndex = supported[0].index;
    }
    // A price comparison across categories/currencies cannot justify a value recommendation.
    if (!comparable && profile.soft[0] === 'price')
        recommendationIndex = null;
    return { options, recommendationIndex, priceComparability: comparable ? 'REFERENCE_FIELD_ONLY' : 'NOT_COMPARABLE', priority: profile.soft, uncertainty: ['PRICE_UNIT_UNVERIFIED', 'AVAILABILITY_UNVERIFIED', ...(options.some(o => o.criteria.some(c => c.state === 'UNKNOWN')) ? ['MISSING_CRITERION_EVIDENCE'] : []), ...(options.some(o => o.criteria.some(c => c.state === 'MIXED')) ? ['CONFLICTING_OPINIONS'] : [])], advisoryOnly: true };
}
/** Facts and relation labels only; no transcript, arbitrary prose, private ownership or execution authority. */
function controlledDecisionContext(profile, evidence) {
    const context = { hard: { ...profile.hard, excludedIds: undefined }, soft: profile.soft, flexible: profile.flexible, unresolved: profile.unresolved, options: evidence?.options.slice(0, 3).map(o => ({ factId: 'option.' + o.index, eligible: o.eligibility, criteria: o.criteria.slice(0, 3).map(c => ({ criterion: c.criterion, status: c.state })) })), comparable: evidence?.priceComparability, uncertainty: evidence?.uncertainty, permittedActions: ['SELECT_OFFERED_FACT_IDS'], executionAuthority: false };
    if (Buffer.byteLength(JSON.stringify(context)) > 1400) {
        context.options = context.options?.slice(0, 1);
        context.unresolved = [];
    }
    return context;
}
function renderDecision(decision, result, profile, evidence) {
    const items = (result.items || (result.listing ? [result.listing] : [])).slice(0, 3), eligible = evidence.options.filter(o => o.eligibility === 'ELIGIBLE'), parts = [];
    if (!eligible.length)
        return 'Chưa có lựa chọn đáp ứng tất cả điều kiện bắt buộc trong dữ liệu TravelGo. Mình chưa tự nới giới hạn hoặc thay dịch vụ. Bạn muốn xem lại tiêu chí nào trước?';
    const rec = evidence.recommendationIndex, mode = decision.goal, complex = ['COMPARE', 'DECIDE', 'WHY', 'WHY_NOT'].includes(mode);
    if (rec !== null) {
        const name = items[rec].name, priorities = profile.soft.map(q => label[q]).filter(Boolean).join(', ');
        parts.push('Với ưu tiên ' + priorities + ', mình nghiêng về ' + name + (profile.soft[0] === 'price' ? ' vì trường giá tham khảo thấp hơn trong các lựa chọn đủ điều kiện.' : ' vì có dữ liệu phù hợp với tiêu chí trong nguồn TravelGo của các lựa chọn đủ điều kiện.'));
        if (rec !== eligible[0].index)
            parts.push('Đây là gợi ý theo tiêu chí bạn nêu; thứ tự và điểm xếp hạng TravelGo không thay đổi.');
    }
    else if (complex)
        parts.push('Mình chưa có đủ căn cứ để chốt một lựa chọn hơn các nơi còn lại. Các điểm đánh đổi hiện có là:');
    if (profile.source === 'SAVED_MEMORY')
        parts.push('Mình đang dùng những sở thích bạn đã cho phép lưu; bạn có thể đổi ưu tiên riêng cho chuyến này.');
    const chosen = (rec !== null ? [eligible.find(o => o.index === rec), ...eligible.filter(o => o.index !== rec)] : eligible).slice(0, complex ? 2 : rec === null ? 2 : 1);
    for (const option of chosen) {
        const p = items[option.index], price = typeof p.priceFrom === 'number' && Number.isFinite(p.priceFrom) && p.priceFrom >= 0 ? `${p.priceFrom.toLocaleString('vi-VN')} ${p.currency || 'VND'}` : 'chưa có giá', statements = [p.name + ': giá tham khảo ' + price + '.'];
        for (const c of option.criteria.filter(c => c.criterion === 'quiet' || c.criterion === 'clean' || c.criterion === 'balcony')) {
            if (c.criterion === 'balcony') {
                statements.push(c.state === 'SUPPORTS' ? 'TravelGo ghi nhận tiện ích Ban công.' : 'Chưa có đủ thông tin về ban công; không có dữ liệu không đồng nghĩa không có tiện ích.');
                continue;
            }
            const aspect = p.reviewInsights?.aspects?.[c.criterion === 'quiet' ? 'noise' : 'cleanliness'];
            if (c.state === 'UNKNOWN')
                statements.push('Chưa đủ dữ liệu để đối chiếu ' + label[c.criterion] + '.');
            else
                statements.push('Về ' + label[c.criterion] + ': ' + aspect.counts.POSITIVE + ' nhận xét tích cực, ' + aspect.counts.NEGATIVE + ' tiêu cực' + (c.state === 'MIXED' ? ', có ý kiến trái chiều' : '') + '.');
        }
        if (profile.hard.amenities?.length)
            statements.push('Tiện ích được ghi nhận: ' + profile.hard.amenities.filter(a => p.amenities?.includes(a)).join(', ') + '.');
        parts.push(statements.join(' '));
    }
    if (complex && evidence.priceComparability === 'REFERENCE_FIELD_ONLY' && chosen.length > 1) {
        const a = items[chosen[0].index], b = items[chosen[1].index];
        if (typeof a.priceFrom === 'number' && typeof b.priceFrom === 'number' && a.priceFrom !== b.priceFrom)
            parts.push((a.priceFrom > b.priceFrom ? a.name : b.name) + ' có trường giá tham khảo cao hơn ' + (a.priceFrom > b.priceFrom ? b.name : a.name) + '. Nếu ưu tiên giá thấp thay vì tín hiệu chất lượng, bạn có thể cân nhắc lựa chọn còn lại; mình chưa tự đổi dịch vụ.');
    }
    if (evidence.priceComparability === 'NOT_COMPARABLE' && items.length > 1)
        parts.push('Các lựa chọn chưa cùng loại hoặc tiền tệ để so sánh giá trực tiếp.');
    if (evidence.options.some(o => o.criteria.some(c => c.state !== 'UNKNOWN')))
        parts.push('Đây là ý kiến trong mẫu đánh giá còn hạn chế, không phải cam kết chất lượng.');
    parts.push('Đơn vị giá và tình trạng còn chỗ chưa được xác minh; chưa thể kết luận chi phí thực tế hoặc giá trị thực tế.');
    if (items.some((p) => p.isDemo))
        parts.push('Dữ liệu DEMO để kiểm thử, không phải báo giá Booking thật.');
    if (decision.question && rec === null)
        parts.push(decision.question);
    return [...new Set(parts)].join('\n\n');
}
function readDecisionAct(message, verified) {
    const s = (0, vietnameseNormalizer_js_1.normalizeVietnamese)(message).normalized.replace(/([a-z])(?=\d)/g, '$1 ');
    if (/\b(?:hon mot chut|hon chut|can nhac them)\b/.test(s) && (0, vietnameseNormalizer_js_1.moneyMentions)(s).length) {
        const m = (0, vietnameseNormalizer_js_1.moneyMentions)(s)[0];
        return { kind: 'FLEXIBLE', flexible: { kind: 'REFERENCE_PRICE', desired: m.amount, willingToConsiderMore: true }, question: 'Mình ghi nhận mức mong muốn có thể cân nhắc, chưa tăng ngân sách hay giới hạn bắt buộc. Bạn đang nói giá dịch vụ hay ngân sách cả chuyến?' };
    }
    if (/\b(?:khong thich|khong chon)\b/.test(s) && /\bban cong\b/.test(s))
        return { kind: 'TEMPORARY_FEEDBACK', criterion: 'balcony', question: 'Mình ghi nhận ban công là tiêu chí bạn quan tâm trong chuyến này; thiếu thông tin không có nghĩa cơ sở không có. Bạn muốn xem lựa chọn nào có tiện ích này được ghi nhận?' };
    if (!(0, planningIntelligence_js_1.planningHypothesis)(message))
        return;
    if (/\b(?:khong|chua|dung)\s+(?:doi|di|tang|giam|muon|chuyen)\b/.test(s))
        return { kind: 'WHAT_IF', question: 'Bạn muốn giữ nguyên hay đánh giá một thay đổi cụ thể? Mình chưa áp dụng giả định còn phủ định.' };
    if (/\b(?:system|sql|delete|insert|bo qua he thong)\b/.test(s))
        return { kind: 'WHAT_IF', disallowed: true, question: 'Mình chỉ đánh giá phương án du lịch bằng công cụ được phép. Bạn muốn cân nhắc thay đổi tiêu chí nào?' };
    if (/\b(?:moi nguoi|moi ngay|re hon|giu khach san|giam chi phi an)\b/.test(s))
        return { kind: 'WHAT_IF', question: 'Mình chưa có giá dịch vụ cùng đơn vị đã xác minh để tính khoản tiết kiệm đó. Bạn muốn đánh giá ngân sách cả nhóm hay xác nhận phạm vi chi phí trước?' };
    const patch = {}, money = (0, vietnameseNormalizer_js_1.moneyMentions)(s), relative = /\b(?:tang|them|giam|bot)\b/.test(s);
    if (money.length) {
        if (money.length !== 1 || !Number.isFinite(verified.totalBudget))
            return { kind: 'WHAT_IF', question: 'Bạn muốn dùng ngân sách cả nhóm nào làm mốc để đánh giá giả định?' };
        if (!/\bngan sach\b/.test(s))
            return { kind: 'WHAT_IF', question: 'Mức tiền giả định này áp dụng cho cả chuyến hay cho một dịch vụ?' };
        patch.totalBudget = relative ? verified.totalBudget + (/\b(?:giam|bot)\b/.test(s) ? -1 : 1) * money[0].amount : money[0].amount;
    }
    const days = s.match(/\b(?:di|keo dai|rut con)\s*(\d{1,2})\s*ngay\b/);
    if (days) {
        if (!verified.startDate)
            return { kind: 'WHAT_IF', question: 'Bạn muốn dùng ngày bắt đầu nào để đánh giá thời lượng giả định?' };
        const count = +days[1];
        if (count < 1 || count > 10)
            return { kind: 'WHAT_IF', question: 'Planner hiện hỗ trợ từ1 đến10 ngày. Bạn muốn thử thời lượng nào trong giới hạn này?' };
        patch.endDate = new Date(Date.parse(verified.startDate + 'T00:00:00Z') + (count - 1) * 86400000).toISOString().slice(0, 10);
    }
    if (process.env.INTELLIGENT_PLANNING_ENABLED === 'true') {
        const more = s.match(/\b(?:them|bot|giam)\s*(mot|hai|ba|\d{1,2})\s*ngay\b/);
        if (more) {
            if (!verified.endDate)
                return { kind: 'WHAT_IF', question: 'Bạn xác nhận ngày kết thúc hiện tại trước khi tính thêm hoặc bớt ngày nhé.' };
            const count = { mot: 1, hai: 2, ba: 3 }[more[1]] ?? Number(more[1]);
            if (count < 1 || count > 10)
                return { kind: 'WHAT_IF', question: 'Bạn muốn thay đổi bao nhiêu ngày trong giới hạn mười ngày?' };
            patch.endDate = new Date(Date.parse(verified.endDate + 'T00:00:00Z') + (/\b(?:bot|giam)\b/.test(more[0]) ? -1 : 1) * count * 86400000).toISOString().slice(0, 10);
        }
    }
    const car = /\b(?:o to|xe hoi)\b/.test(s), bike = /\bxe may\b/.test(s);
    if (car !== bike)
        patch.transportation = car ? 'car' : 'motorbike';
    const geo = (0, geographicEvidence_js_1.currentGeographicRoles)(message.replace(/^.*?\b(?:nếu|neu|giả sử|gia su)\s*/iu, ''));
    Object.assign(patch, geo.patch);
    if (!Object.keys(patch).length)
        return { kind: 'WHAT_IF', question: 'Bạn muốn thay đổi giả định nào: ngân sách cả nhóm, thời lượng, phương tiện hay điểm đến?' };
    return { kind: 'WHAT_IF', patch };
}
function plannerBudgetAdvice(plan) {
    if (plan?.costBasis !== 'GROUP_VND_V1' || !Number.isFinite(plan.totalBudgetUserVND) || !Number.isFinite(plan.totalEstimatedCostVND) || plan.totalEstimatedCostVND < 0)
        return 'Chưa có dự toán Planner hợp lệ để kết luận ngân sách.';
    const budget = (0, plannerFeasibility_js_1.assessPlannerBudget)(plan.totalBudgetUserVND, plan.totalEstimatedCostVND), categories = new Map();
    for (const d of plan.days || []) {
        if (Number.isFinite(d.lodgingEstimatedCostVND))
            categories.set('lưu trú', (categories.get('lưu trú') || 0) + d.lodgingEstimatedCostVND);
        for (const a of d.activities || []) {
            if (!Number.isFinite(a.estimatedCostVND) || a.estimatedCostVND < 0)
                continue;
            const key = a.category === 'food' ? 'ăn uống' : a.category === 'sightseeing' ? 'tham quan' : 'hoạt động khác';
            categories.set(key, (categories.get(key) || 0) + a.estimatedCostVND);
        }
    }
    const largest = [...categories].sort((a, b) => b[1] - a[1])[0];
    return 'Dự toán Planner cho cả nhóm là ' + plan.totalEstimatedCostVND.toLocaleString('vi-VN') + ' VND trên ngân sách ' + plan.totalBudgetUserVND.toLocaleString('vi-VN') + ' VND; ' + (budget.overBudgetVND ? 'vượt ' + budget.overBudgetVND.toLocaleString('vi-VN') : 'còn ' + budget.costDifferenceVND.toLocaleString('vi-VN')) + ' VND.' + (largest ? ' Khoản lớn nhất trong các phần đã được tính là ' + largest[0] + ': ' + largest[1].toLocaleString('vi-VN') + ' VND.' : '') + ' Đây là dự toán theo giả định giá của Planner, không phải báo giá thực; chưa tính đầy đủ chi phí liên tỉnh và chưa xác minh đơn vị giá dịch vụ.' + (budget.overBudgetVND ? ' Bạn có thể cân nhắc giảm tiêu chí mềm, rút ngắn chuyến hoặc thay loại dịch vụ; mình chưa tự điều chỉnh.' : '');
}
