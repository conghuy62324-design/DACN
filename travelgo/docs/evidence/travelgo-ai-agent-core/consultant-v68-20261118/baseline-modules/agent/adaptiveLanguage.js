"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageConcept = exports.LANGUAGE_CONCEPTS = exports.FEEDBACK_KINDS = exports.CONTRIBUTION_POLICY = exports.LANGUAGE_POLICY = void 0;
exports.languageExpression = languageExpression;
exports.languageSpans = languageSpans;
exports.correctionConcept = correctionConcept;
exports.languageDomain = languageDomain;
exports.discoverExpression = discoverExpression;
exports.resolveLanguage = resolveLanguage;
exports.languageInterpretation = languageInterpretation;
exports.controlledLanguageEvidence = controlledLanguageEvidence;
exports.confirmedLanguageSearch = confirmedLanguageSearch;
const vietnameseNormalizer_js_1 = require("./vietnameseNormalizer.js");
const vietnam_js_1 = require("../geography/vietnam.js");
const catalogPolicy_js_1 = require("../services/catalogPolicy.js");
exports.LANGUAGE_POLICY = 'TRAVELGO_LANGUAGE_MEMORY_V1';
exports.CONTRIBUTION_POLICY = 'TRAVELGO_LANGUAGE_CONTRIBUTION_V1';
exports.FEEDBACK_KINDS = ['LANGUAGE', 'INTENT', 'REFERENT', 'CRITERIA', 'HELPFULNESS', 'DATA_GAP'];
const labels = { hotel: 'khách sạn', resort: 'resort', homestay: 'homestay', villa: 'villa', apartment: 'căn hộ', guesthouse: 'nhà nghỉ' };
exports.LANGUAGE_CONCEPTS = [
    ...catalogPolicy_js_1.ACCOMMODATION_TYPES.map(value => ({ id: 'accommodation_type.' + value, type: 'accommodation_type', domain: 'travel_accommodation', label: labels[value], value })),
    { id: 'category.restaurant', type: 'category', domain: 'travel_dining', label: 'nhà hàng', value: 'restaurant' },
    { id: 'category.attraction', type: 'category', domain: 'travel_experience', label: 'điểm tham quan', value: 'attraction' },
    ...catalogPolicy_js_1.CUISINES.map(value => ({ id: 'cuisine.' + value, type: 'cuisine', domain: 'travel_dining', label: { seafood: 'hải sản', local: 'đặc sản', vegetarian: 'đồ chay', vietnamese: 'món Việt', bbq_hotpot: 'lẩu nướng', buffet: 'buffet', international: 'quốc tế', family: 'ẩm thực gia đình' }[value], value })),
    ...[...vietnam_js_1.DESTINATIONS, ...vietnam_js_1.PROVINCES].map(g => ({ id: 'location.' + g.id, type: 'location', domain: 'travel_location', label: g.catalogName, value: g.id }))
];
const languageConcept = (id) => exports.LANGUAGE_CONCEPTS.find(c => c.id === id);
exports.languageConcept = languageConcept;
const normalized = (v) => (0, vietnameseNormalizer_js_1.normalizeVietnamese)(v).normalized;
/** Conservative lexical phrases only. Never learn numbers, proper-name forms, identifiers or control vocabulary. */
function languageExpression(raw) {
    if (typeof raw !== 'string' || raw !== raw.trim() || raw.length > 48 || !/^[\p{L}\p{M}]{2,24}(?:[ -][\p{L}\p{M}]{2,16}){0,2}$/u.test(raw) || raw.split(/[ -]/).some(w => /^\p{Lu}\p{Ll}{2,}$/u.test(w)))
        throw Error('LANGUAGE_EXPRESSION_UNSAFE');
    const s = normalized(raw);
    if (/\b(?:sql|select|insert|delete|drop|update|truncate|exec|eval|shell|powershell|cmd|curl|wget|sudo|bash|python|system|prompt|ignore|password|token|secret|cccd|cmnd|email|phone|ten|toi|minh|ngan|nghin|trieu|khong|chua|neu|dung|duoc|api|key|mat|khau)\b/.test(s) || /^(?:nguyen|tran|pham|hoang|huynh|ngo|duong|dinh|dang|bui|truong)(?:\s+[a-z]+){1,2}$/.test(s) || ['ko', 'dc', 'ks', 'ng', 'tr', 'cu', 'ntd'].includes(s))
        throw Error('LANGUAGE_EXPRESSION_UNSAFE');
    return { expression: raw, normalizedExpression: s };
}
function languageSpans(message) {
    const words = [...message.matchAll(/[\p{L}\p{M}]+/gu)].slice(0, 80), spans = [];
    for (let i = 0; i < words.length; i++)
        for (let n = 1; n <= 3 && i + n <= words.length; n++) {
            const start = words[i].index, end = words[i + n - 1].index + words[i + n - 1][0].length, quote = message.slice(start, end);
            try {
                const safe = languageExpression(quote);
                spans.push({ start, end, quote, normalized: safe.normalizedExpression });
            }
            catch { }
        }
    return spans;
}
function correctionConcept(message) {
    const s = normalized(message).replace(/^(?:y (?:minh|toi) la|minh (?:noi|muon noi) la|toi (?:noi|muon noi) la|nghia la)\s+/, ''), options = exports.LANGUAGE_CONCEPTS.filter(c => normalized(c.label) === s || c.value === s);
    return options.length === 1 ? options[0] : undefined;
}
const searchCue = /\b(?:tim|kiem|goi y|tu van|muon (?:nghi )?o)\b/;
function languageDomain(message, span, context) {
    const before = normalized(message.slice(0, span.start)), after = normalized(message.slice(span.end)), s = normalized(message);
    if (/\b(?:muon|thich)\s+(?:nghi\s+)?o\s*$/.test(before))
        return 'travel_accommodation';
    if (/\b(?:o|tai|den|toi|tu|di)\s*$/.test(before))
        return 'travel_location';
    if (context && /\b(?:tim|kiem|doi sang|so sanh)\b/.test(s) && !/(?:o|tai|den|tu)\s*$/.test(before))
        return context;
    if (!searchCue.test(before))
        return;
    if (/\b(?:nha hang|quan an|mon an|am thuc|an)\b/.test(before))
        return 'travel_dining';
    if (/\b(?:tham quan|trai nghiem|hoat dong)\b/.test(s))
        return 'travel_experience';
    if (/\b(?:khach san|cho o|noi o|luu tru)\b/.test(s) || /^\s*(?:o|tai)\b/.test(after))
        return 'travel_accommodation';
    return;
}
function discoverExpression(message) {
    const teaching = /(?:từ giờ|tu gio|từ nay|tu nay)\s+(?:(?:mình|minh|tôi|toi)\s+)?(?:gọi|goi)\s+(.+?)\s+(?:là|la)\s+([\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+){0,2})[.!?]?\s*$/iu.exec(message);
    const patterns = [
        /(?:^|\s)(?:tìm|tim|kiếm|kiem|gợi ý|goi y)\s+([\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+){0,2}?)\s+(?:ở|o|tại|tai)\s/iu,
        /(?:muốn|muon|thích|thich)\s+(?:(?:nghỉ|nghi)\s+)?(?:ở|o)\s+([\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+){0,2}?)(?=\s+(?:cho|có|co|ở|o|tại|tai)(?=\s)|[.!?]?\s*$)/iu,
        /(?:so sánh|so sanh)\s+(?:(?:mấy|may|các|cac)\s+)?([\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+){0,2}?)\s+(?:đó|do|này|nay)(?=\s|[.!?]|$)/iu,
        /(?:đổi sang|doi sang|ưu tiên|uu tien)\s+([\p{L}\p{M}]+(?:[ -][\p{L}\p{M}]+){0,2}?)(?=\s+(?:ở|o|tại|tai|có|co)(?=\s)|[.!?]?\s*$)/iu
    ];
    const m = teaching || patterns.map(p => p.exec(message)).find(Boolean);
    if (!m)
        return;
    if (teaching && !correctionConcept(teaching[1]))
        return;
    const quote = teaching ? m[2] : m[1], start = m.index + m[0].lastIndexOf(quote), s = normalized(quote);
    if (exports.LANGUAGE_CONCEPTS.some(c => [normalized(c.label), c.value].includes(s)) || /\b(?:khach|san|nha|hang|noi|cho|tham|quan|resort|homestay|phong|ks)\b/.test(s))
        return;
    // Base geography/control/criteria are not unknown language candidates.
    if (conversationalBase(quote) || /\b(?:gia mem|gia re|yen tinh|sach se|binh dan|nhe nhang|thien nhien|chill|voi|hon|khong)\b/.test(s))
        return;
    try {
        const safe = languageExpression(quote);
        return { ...safe, span: { start, end: start + quote.length, quote, normalized: s }, purpose: teaching ? 'MEANING_ONLY' : 'CONTEXTUAL_REQUEST', candidateConceptId: teaching ? correctionConcept(teaching[1])?.id : undefined, kind: /([\p{L}])\1{2,}/u.test(quote) ? 'ELONGATION' : quote.length <= 4 ? 'ABBREVIATION' : 'UNKNOWN_PHRASE' };
    }
    catch {
        return;
    }
}
const conversationalBase = (expression) => (0, vietnam_js_1.resolveLocation)(expression) || exports.LANGUAGE_CONCEPTS.find(c => normalized(c.label) === normalized(expression));
/** No string replacement: original spans, typed meanings and provenance stay separate from raw message. */
function resolveLanguage(message, mappings, now, context) {
    const spans = languageSpans(message), s = normalized(message), evidence = [];
    const matched = spans.filter(span => mappings.some(m => m.normalizedExpression === span.normalized));
    if (matched.length && (/\b(?:neu|gia su|co le)\b/.test(s) || matched.some(span => {
        const before = normalized(message.slice(0, span.start)), clause = before.slice(Math.max(before.lastIndexOf(','), before.lastIndexOf(';')) + 1);
        return /\b(?:khong|chua|dung)(?:\s+(?:tim|kiem|chon|doi sang|muon))?\s*$/.test(clause);
    })))
        return { status: 'UNSAFE_CONTEXT', evidence: [], question: 'Bạn muốn tìm dịch vụ hay chỉ đang nêu một khả năng? Mình chưa thay đổi lựa chọn nào.' };
    for (const span of matched) {
        const base = conversationalBase(span.quote), matches = mappings.filter(m => m.normalizedExpression === span.normalized && ['ACTIVE', 'APPROVED'].includes(m.status) && (!m.expiresAt || Date.parse(m.expiresAt) > now));
        if (base && matches.some(m => m.conceptId !== (Object.hasOwn(base, 'catalogName') ? 'location.' + base.id : base.id)))
            return { status: 'UNSAFE_CONTEXT', evidence: [], question: 'Cách gọi đã nhớ khác nghĩa địa danh hoặc loại dịch vụ chuẩn. Bạn muốn dùng nghĩa nào trong yêu cầu này?' };
    }
    for (const span of spans) {
        let domain = languageDomain(message, span, context);
        if (process.env.PERSONALIZED_DECISION_ENABLED === 'true') {
            const explicit = languageDomain(message, span), domains = [...new Set(mappings.filter(m => m.normalizedExpression === span.normalized).map(m => m.domain))];
            domain = explicit || (domains.length === 1 && /\b(?:tim|kiem|doi sang|so sanh|muon (?:nghi )?o|co)\b/.test(s) ? domains[0] : context);
            if (domains.length && /\b(?:ma nguon|code|tep|sql|system)\b/.test(s))
                return { status: 'UNSAFE_CONTEXT', evidence: [], question: 'Cách diễn đạt đã nhớ chỉ được dùng trong ngữ cảnh dịch vụ du lịch. Bạn muốn hỏi dịch vụ nào?' };
        }
        if (!domain)
            continue;
        const matches = mappings.filter(m => m.normalizedExpression === span.normalized && m.domain === domain && ['ACTIVE', 'APPROVED'].includes(m.status) && (!m.expiresAt || Date.parse(m.expiresAt) > now) && (0, exports.languageConcept)(m.conceptId)?.domain === domain);
        const rank = (scope) => scope === 'SESSION' ? 0 : scope === 'PERSONAL' ? 1 : 2;
        matches.sort((a, b) => rank(a.scope) - rank(b.scope));
        const preferred = matches.filter(m => rank(m.scope) === rank(matches[0]?.scope));
        if (new Set(preferred.map(m => m.conceptId)).size > 1)
            return { status: 'AMBIGUOUS', evidence: [], question: `Bạn dùng “${span.quote}” với nghĩa nào trong yêu cầu này?` };
        if (preferred.length) {
            const m = preferred[0];
            evidence.push({ span, concept: (0, exports.languageConcept)(m.conceptId), scope: m.scope, version: m.version, mappingId: m.id });
        }
    }
    const unique = evidence.filter((e, i) => !evidence.some((other, j) => j < i && other.span.start <= e.span.start && other.span.end >= e.span.end)).slice(0, 4);
    return { status: unique.length ? 'RESOLVED' : 'NONE', evidence: unique };
}
function languageInterpretation(message, resolution, contextLocation) {
    if (resolution.status !== 'RESOLVED' || !searchCue.test(normalized(message)))
        return;
    const service = resolution.evidence.filter(e => e.concept.type !== 'location');
    if (service.length !== 1)
        return;
    const c = service[0].concept, explicit = (0, vietnameseNormalizer_js_1.travelLocations)(normalized(message)).filter(x => x.role !== 'departureCity'), locationIds = [...new Set(explicit.map(x => x.geo.id))];
    if (locationIds.length > 1)
        return;
    const mapped = resolution.evidence.filter(e => e.concept.type === 'location' && normalized(message.slice(0, e.span.start)).match(/\b(?:o|tai|den)\s*$/));
    if (locationIds.length && mapped.some(e => e.concept.value !== locationIds[0]))
        return;
    const location = (0, vietnam_js_1.resolveLocation)(locationIds[0] || mapped[0]?.concept.value || contextLocation), filters = { ...(location ? { locationId: location.id, city: location.catalogName } : {}) };
    if (c.type === 'accommodation_type')
        return { operation: 'search_registered_hotels', canonical: '', filters: { ...filters, accommodationType: c.value } };
    if (c.type === 'cuisine')
        return { operation: 'search_registered_restaurants', canonical: '', filters: { ...filters, cuisine: c.value } };
    return { operation: c.value === 'restaurant' ? 'search_registered_restaurants' : 'search_places', canonical: '', filters };
}
function controlledLanguageEvidence(resolution) { return resolution.evidence.slice(0, 4).map(e => ({ expression: e.span.quote, meaning: e.concept.label, conceptId: e.concept.id, domain: e.concept.domain, evidenceStatus: e.scope === 'SHARED' ? 'ADMIN_APPROVED' : 'USER_CONFIRMED', ...(e.confirmedContext ? { origin: 'CONFIRMED_PENDING_REQUEST' } : { currentSpan: { start: e.span.start, end: e.span.end } }), executionAuthority: false })); }
function confirmedLanguageSearch(conceptId, locationId) {
    const c = (0, exports.languageConcept)(conceptId), location = (0, vietnam_js_1.resolveLocation)(locationId);
    if (!c)
        return;
    const filters = { ...(location ? { locationId: location.id, city: location.catalogName } : {}) };
    if (c.type === 'accommodation_type')
        return { operation: 'search_registered_hotels', canonical: '', filters: { ...filters, accommodationType: c.value } };
    if (c.type === 'cuisine')
        return { operation: 'search_registered_restaurants', canonical: '', filters: { ...filters, cuisine: c.value } };
    if (c.type === 'category')
        return { operation: c.value === 'restaurant' ? 'search_registered_restaurants' : 'search_places', canonical: '', filters };
}
