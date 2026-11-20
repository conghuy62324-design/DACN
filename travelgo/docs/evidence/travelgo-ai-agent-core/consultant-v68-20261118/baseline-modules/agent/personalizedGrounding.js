"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.currentQualityRequest = currentQualityRequest;
exports.safeCurrentRequest = safeCurrentRequest;
exports.personalizedGroundingContext = personalizedGroundingContext;
exports.assembleModelContext = assembleModelContext;
const modelPrivacy_js_1 = require("./modelPrivacy.js");
const geographicEvidence_js_1 = require("./geographicEvidence.js");
const vietnameseNormalizer_js_1 = require("./vietnameseNormalizer.js");
const vietnam_js_1 = require("../geography/vietnam.js");
const vietnameseNormalizer_js_2 = require("./vietnameseNormalizer.js");
const naturalIntent_js_1 = require("./naturalIntent.js");
const customerMemoryService_js_1 = require("../services/customerMemoryService.js");
const travelConsultant_js_1 = require("./travelConsultant.js");
const travelPreferences_js_1 = require("../utils/travelPreferences.js");
/** Current trip preferences are transient; this function never writes long-term memory. */
function currentQualityRequest(message) {
    const s = (0, vietnameseNormalizer_js_2.normalizeVietnamese)(message).normalized;
    if (/\blan nay\b/.test(s) && /\b(?:soi dong|nhon nhip)\b/.test(s))
        return { preferred: [], deprioritized: ['quiet'] };
    if (!/\b(?:uu tien|thich|muon|can|tim|chon|lan nay)\b/.test(s) && !/\b(?:yen tinh|sach se) hon\b/.test(s) || /\b(?:neu|gia su|co le)\b/.test(s))
        return;
    const rules = [[/\byen tinh\b/, 'quiet'], [/\bsach se\b|\bve sinh\b/, 'clean'], [/\bgia hop ly\b|\btiet kiem\b/, 'value']];
    const preferred = [], deprioritized = [];
    for (const [pattern, value] of rules) {
        const match = pattern.exec(s);
        if (!match)
            continue;
        const before = s.slice(Math.max(0, match.index - 45), match.index);
        if (/\b(?:khong (?:can|uu tien|thich)|dung uu tien|hon la|thay vi)\s*$/.test(before))
            deprioritized.push(value);
        else
            preferred.push(value);
    }
    return preferred.length || deprioritized.length ? { preferred, deprioritized } : undefined;
}
/** Only this turn, with obvious sensitive clauses/identifiers removed; no raw reviews/history/profile. */
function safeCurrentRequest(message) {
    return (0, modelPrivacy_js_1.projectModelMessage)(message).text.split(/[;\n]/).map(s => s.replaceAll('[đã ẩn]', '').trim()).filter(Boolean).join('; ').slice(0, 500);
}
function personalizedGroundingContext(message, values, optional, allowed, qualityOverride, additional = {}) {
    const preferences = (Array.isArray(allowed) ? allowed : []).filter(p => p && typeof p.type === 'string' && typeof p.value === 'string' && Object.hasOwn(customerMemoryService_js_1.MEMORY_VALUES, p.type) && Object.hasOwn(customerMemoryService_js_1.MEMORY_VALUES[p.type], p.value) && (!p.status || p.status === 'ACTIVE') && !(qualityOverride && p.type === 'quality')).slice(0, 8).map(p => ({ type: p.type, value: p.value }));
    const source = { ...values, ...optional }, verifiedSession = {};
    for (const key of ['destinationCity', 'departureCity']) {
        const value = source[key];
        if (typeof value === 'string' && value.length <= 120 && /^[\p{L}\p{M}\s.-]+$/u.test(value))
            verifiedSession[key] = value;
    }
    for (const key of ['startDate', 'endDate'])
        if (typeof source[key] === 'string' && /^20\d\d-\d\d-\d\d$/.test(source[key]))
            verifiedSession[key] = source[key];
    for (const key of ['adults', 'children', 'totalBudget']) {
        const value = source[key];
        if (Number.isSafeInteger(value) && value >= (key === 'children' ? 0 : 1) && value <= (key === 'totalBudget' ? 1000000000000 : 100))
            verifiedSession[key] = value;
    }
    if (['car', 'motorbike'].includes(source.transportation))
        verifiedSession.transportation = source.transportation;
    if (Array.isArray(source.preferences))
        verifiedSession.preferences = source.preferences.filter((p) => travelPreferences_js_1.TRAVEL_PREFERENCE_IDS.includes(p)).slice(0, 8);
    // Grounded selection needs a structured current request, never another copy of free-form customer text.
    const sanitized = safeCurrentRequest(message), s = (0, vietnameseNormalizer_js_2.normalizeVietnamese)(sanitized).normalized, evidence = (0, naturalIntent_js_1.naturalIntentEvidence)(sanitized, values, additional.intentContext);
    const aspects = [[/\b(?:yen tinh|tieng on|cach am)\b/, 'noise'], [/\b(?:sach se|ve sinh)\b/, 'cleanliness'], [/\b(?:gia|re hon|tiet kiem)\b/, 'price'], [/\b(?:vi tri|gan|trung tam)\b/, 'location'], [/\b(?:nhan vien|phuc vu)\b/, 'staff'], [/\b(?:mon an|ngon|dac san)\b/, 'food']].filter(([pattern]) => pattern.test(s)).map(([, aspect]) => aspect);
    const needs = [...new Set([...(additional.needs || []), ...((0, travelConsultant_js_1.understandConsultation)(sanitized, (0, travelConsultant_js_1.consultantMemory)()).needs || [])])].filter(n => travelConsultant_js_1.CONSULTATION_CONCEPTS.some(([, label]) => label === n) && !(n === 'ưu tiên yên tĩnh' && qualityOverride && !qualityOverride.preferred.includes('quiet'))).slice(0, 8);
    const context = { currentRequest: { goal: additional.priority ? 'COMPARE' : evidence.goal, requestedAspects: aspects, needs, quality: qualityOverride || null, priority: additional.priority || null }, verifiedSession, allowedPreferences: preferences, preferencePolicy: { source: qualityOverride ? 'CURRENT_TRIP_OVERRIDES_SAVED_QUALITY' : 'FRESH_AUTHORIZED_MEMORY', softOnly: true, executionAuthority: false }, wasTruncated: false, dataLimits: ['Review insights are opinions with cited evidence/sample counts, not verified amenities or guarantees.', 'Missing prices, units and availability stay unknown.', 'Only select supplied fact IDs; prioritize relevant noise/cleanliness evidence, preserve conflicting/negative evidence and missing-data caveats.'] };
    while (Buffer.byteLength(JSON.stringify(context)) > 2400 && context.currentRequest.needs.length) {
        context.currentRequest.needs.pop();
        context.wasTruncated = true;
    }
    while (Buffer.byteLength(JSON.stringify(context)) > 2400 && context.allowedPreferences.length) {
        context.allowedPreferences.pop();
        context.wasTruncated = true;
    }
    return context;
}
/** Shared NLU/grounding context: typed slots, relevant current evidence, no transcript/private profile. */
function assembleModelContext(input) {
    const safe = input.projection.text, values = input.values || {}, context = personalizedGroundingContext(safe, values, input.optional || {}, input.allowed || [], input.quality, { intentContext: input.intentContext, needs: input.needs, priority: input.priority });
    context.currentRequest.text = safe.slice(0, 700);
    context.pendingClarification = input.pending || null;
    context.awaiting = input.pending || null;
    if (['search_registered_hotels', 'search_registered_restaurants', 'search_places'].includes(input.lastCatalogOperation || ''))
        context.lastCatalogOperation = input.lastCatalogOperation;
    if (Number.isInteger(input.durationDays) && input.durationDays >= 1 && input.durationDays <= 10)
        context.durationDays = input.durationDays;
    context.selected = input.intentContext?.selected || {};
    context.intentEvidence = (0, naturalIntent_js_1.naturalIntentEvidence)(safe, values, { ...input.intentContext, awaiting: input.pending || input.intentContext?.awaiting });
    context.permittedOperations = (input.operations || []).slice(0, 12);
    context.executionAuthority = false;
    const geo = (0, geographicEvidence_js_1.geographicEvidence)(safe, input.pending), literal = (0, vietnameseNormalizer_js_1.travelLocations)((0, vietnameseNormalizer_js_2.normalizeVietnamese)(safe).normalized, input.pending);
    context.geographicEvidence = { ambiguous: geo.ambiguous, uncertain: geo.uncertain, candidates: geo.candidates.slice(0, 3).map(c => ({ name: c.name, quote: c.quote, role: c.role, match: c.match })), locations: literal.slice(0, 3).map(c => ({ id: c.geo.id, name: c.geo.catalogName, role: c.role })) };
    // Verified geography is canonical, never a free-form profile/address field.
    for (const key of ['departureCity', 'destinationCity']) {
        const g = (0, vietnam_js_1.resolveLocation)(context.verifiedSession[key]);
        if (g)
            context.verifiedSession[key] = g.catalogName;
        else
            delete context.verifiedSession[key];
    }
    const relevant = (input.language || []).filter(e => typeof e.expression === 'string' && !(0, modelPrivacy_js_1.projectModelMessage)(e.expression).redactions && (safe.includes(e.expression) || e.origin === 'CONFIRMED_PENDING_REQUEST')).slice(0, 4);
    if (relevant.length)
        context.languageEvidence = relevant.flatMap(e => { const span = input.projection.mapQuote(e.expression); if (e.currentSpan && !span)
            return []; return [{ ...e, ...(span ? { currentSpan: { start: span.safeStart, end: span.safeEnd } } : {}) }]; });
    if (input.dialogue)
        context.dialogue = input.dialogue;
    if (input.decision)
        context.decision = input.decision;
    if (input.planning)
        context.planning = input.planning;
    if (input.cost)
        context.cost = input.cost;
    if (input.factIds)
        context.availableFactIds = input.factIds.slice(0, 12);
    const clean = (0, modelPrivacy_js_1.safeModelValue)(context);
    clean.wasTruncated = false;
    for (const key of ['dialogue', 'decision', 'cost', 'planning', 'geographicEvidence'])
        if (Buffer.byteLength(JSON.stringify(clean)) > 3000) {
            delete clean[key];
            clean.wasTruncated = true;
        }
    if (Buffer.byteLength(JSON.stringify(clean)) > 3000) {
        clean.allowedPreferences = [];
        clean.currentRequest.needs = [];
        clean.currentRequest.text = safe.slice(0, 300);
        clean.wasTruncated = true;
    }
    if (Buffer.byteLength(JSON.stringify(clean)) > 3000) {
        delete clean.languageEvidence;
        delete clean.availableFactIds;
        clean.currentRequest.text = '';
        clean.wasTruncated = true;
    }
    if (Buffer.byteLength(JSON.stringify(clean)) > 3000)
        throw Error('MODEL_CONTEXT_LIMIT');
    return clean;
}
