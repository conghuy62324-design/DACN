"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.travelNumberSpacing = exports.literalVietnamese = exports.withVietnameseNormalizationScope = void 0;
exports.normalizeVietnamese = normalizeVietnamese;
exports.conversationalLocation = conversationalLocation;
exports.travelLocations = travelLocations;
exports.moneyMentions = moneyMentions;
const vietnam_js_1 = require("../geography/vietnam.js");
const node_async_hooks_1 = require("node:async_hooks");
// Request-local computed strings only; never a cross-customer cache or session transcript.
const normalizationScope = new node_async_hooks_1.AsyncLocalStorage();
const withVietnameseNormalizationScope = (work) => normalizationScope.run(new Map(), work);
exports.withVietnameseNormalizationScope = withVietnameseNormalizationScope;
/** Documentary evidence must not apply conversational typo/alias rewrites (e.g. tháng). */
const literalVietnamese = (v) => v.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase();
exports.literalVietnamese = literalVietnamese;
/** Separate attached quantities while preserving compact units (5tr2), dates and short geography aliases (q1). */
const travelNumberSpacing = (v) => v.replace(/\b([a-z]{2,})(?=\d)/g, '$1 ');
exports.travelNumberSpacing = travelNumberSpacing;
/** Lexical normalization only. Raw text remains the source for model quotes; no raw text is retained. */
function normalizeVietnamese(message) {
    const scope = normalizationScope.getStore(), cached = scope?.get(message);
    if (cached)
        return { ...cached };
    const raw = message.normalize('NFC').trim().replace(/\s+/g, ' ');
    const aliases = { ks: 'khach san', ko: 'khong', hong: 'khong', hok: 'khong', oto: 'o to', moto: 'xe may', xiu: 'chut', tui: 'toi', mik: 'minh', mn: 'moi nguoi', nhg: 'nhung', dc: 'duoc', tphcm: 'tp hcm' };
    const compounds = { ngansach: 'ngan sach', phuongtien: 'phuong tien', lichtrinh: 'lich trinh' };
    const vocabulary = ['khach', 'nguoi', 'trieu', 'phuong', 'ngay', 'dem', 'thang', 'ngan', 'sach', 'trinh', 'hang', 'phong', 'thich', 'thuan', 'chuyen'];
    const near = (a, b) => { if (Math.abs(a.length - b.length) > 1)
        return false; let i = 0, j = 0, edits = 0; while (i < a.length && j < b.length) {
        if (a[i] === b[j]) {
            i++;
            j++;
            continue;
        }
        if (++edits > 1)
            return false;
        if (a.length >= b.length)
            i++;
        if (b.length >= a.length)
            j++;
    } return edits + (i < a.length || j < b.length ? 1 : 0) <= 1; };
    const word = (w) => { if (aliases[w] || compounds[w])
        return aliases[w] || compounds[w]; const short = w.replace(/([a-z])\1{2,}/g, '$1'); if (short !== w && vocabulary.includes(short))
        return short; if (w.length < 5 || vocabulary.includes(w))
        return w; const alternatives = vocabulary.filter(v => w.length === v.length + 1 && near(w, v)); return alternatives.length === 1 ? alternatives[0] : w; };
    // Preserve decimals, dates and compact numeric units. Do not fuzzy-rewrite places or numbers.
    const normalized = (0, exports.travelNumberSpacing)((0, exports.literalVietnamese)(raw)).replace(/\b[a-z]+\b/g, word).replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim();
    const result = { raw, normalized };
    if (scope && scope.size < 128 && message.length <= 2000)
        scope.set(message, Object.freeze({ ...result }));
    return result;
}
function conversationalLocation(value, explicit) {
    const s = (0, vietnam_js_1.geoFold)(value).replace(/^(?:tinh|thanh pho|tp)\s+/, ''), known = (0, vietnam_js_1.resolveLocation)(value);
    if (known) {
        if (/^[a-z]{2}$/.test(s) && !explicit)
            return;
        return known;
    }
    if (!explicit)
        return;
    // Initialisms derive from the existing geographic names, never a second city mapping.
    const compact = s.replace(/\s/g, ''), initials = vietnam_js_1.DESTINATIONS.filter(g => (0, vietnam_js_1.geoFold)(g.name).split(' ').map(w => w[0]).join('') === compact);
    if (initials.length === 1)
        return initials[0];
    if (compact === 'tphcm')
        return (0, vietnam_js_1.resolveLocation)('TP. HCM');
    return;
}
// Derived once from the sole shared static geography; no mutable/private retrieval is cached.
const locationCandidates = [...vietnam_js_1.DESTINATIONS, ...vietnam_js_1.PROVINCES].flatMap(g => [g.name, g.catalogName, ...g.aliases, ...(g.kind === 'destination' ? [(0, vietnam_js_1.geoFold)(g.name).split(' ').map(w => w[0]).join('')] : [])].map(n => ({ g, key: (0, vietnam_js_1.geoFold)(n), canonical: (0, vietnam_js_1.geoFold)(n) === (0, vietnam_js_1.geoFold)(g.name) || (0, vietnam_js_1.geoFold)(n) === (0, vietnam_js_1.geoFold)(g.catalogName) }))).sort((a, b) => b.key.length - a.key.length);
function travelLocations(text, awaiting) {
    const hits = [];
    for (const { g, key, canonical } of locationCandidates) {
        if (!key || key.length < 2)
            continue;
        let from = 0, index;
        while ((index = text.indexOf(key, from)) >= 0) {
            from = index + key.length;
            if (index > 0 && /[a-z0-9]/.test(text[index - 1]) || /[a-z0-9]/.test(text[from] || '') || hits.some(h => index < h.end && from > h.start))
                continue;
            const prefix = text.slice(0, index), before = prefix.trim().split(/\s+/).at(-1), role = /\b(?:xuat phat|khoi hanh)(?:\s+tu)?\s*$/.test(prefix) || before === 'tu' ? 'departureCity' : /^(?:di|den|toi|len|ra|o|tai|qua|sang)$/.test(before || '') || /\b(?:du lich|kham pha)\s*$/.test(prefix) ? 'destinationCity' : undefined;
            const contextual = !!role || awaiting === 'departure' || awaiting === 'destination' || /\b(?:du lich|chuyen di|kham pha)\b/.test(prefix) || /^\s+(?:di|den|ra|toi)\b/.test(text.slice(from));
            if (!canonical && key.replace(/\s/g, '').length <= 3 && !contextual)
                continue;
            hits.push({ geo: g, start: index, end: from, role });
        }
    }
    hits.sort((a, b) => a.start - b.start);
    if (hits.length >= 2 && !hits[0].role && hits[1].role === 'destinationCity')
        hits[0].role = 'departureCity';
    if (hits.length === 1 && !hits[0].role && ['departure', 'destination'].includes(awaiting || ''))
        hits[0].role = awaiting === 'departure' ? 'departureCity' : 'destinationCity';
    return hits;
}
function moneyMentions(text) {
    const result = [];
    const pattern = /\b(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|nghin|ngan|k|vnd|dong)(\d)?\b/g;
    for (const m of text.matchAll(pattern)) {
        const unit = m[2], mult = /^(trieu|tr|cu)$/.test(unit) ? 1000000 : /^(k|nghin|ngan)$/.test(unit) ? 1000 : 1;
        const amount = Number(m[1].replace(',', '.')) * mult + (m[3] ? Number(m[3]) * mult / 10 : 0), start = m.index, end = start + m[0].length;
        const preceding = text.slice(Math.max(text.lastIndexOf(',', start - 1), text.lastIndexOf(';', start - 1), -1) + 1, start), suffix = text.slice(end, end + 35);
        const person = /^\s*(?:\/\s*|(?:cho )?moi\s+)(?:nguoi|ng)\b/.test(suffix), day = /^\s*(?:\/\s*|(?:cho )?moi\s+)(?:ngay|dem)\b/.test(suffix) || person && /^\s*(?:\/\s*|(?:cho )?moi\s+)(?:nguoi|ng)\s*\/\s*ngay\b/.test(suffix);
        const hotel = /\b(?:khach san|phong|cho o)\b/.test(preceding), restaurant = /\b(?:nha hang|quan an|bua an)\b/.test(preceding), relative = /\b(?:tang them|them|cong them|giam(?: di| bot)?|bot)\s*$/.exec(preceding);
        const group = /\b(?:ngan sach (?:ca nhom|chuyen di)|tong (?:cong|ngan sach)|ca nhom)\b/.test(preceding);
        const listing = (hotel || restaurant) && !group && !relative;
        result.push({ amount, start, end, scope: person ? (day ? 'person_day' : 'person') : day ? 'group_day' : listing ? 'listing' : 'group', ...(listing ? { category: hotel ? 'hotel' : 'restaurant' } : {}), ...(relative ? { relative: /giam|bot/.test(relative[0]) ? -1 : 1 } : {}) });
    }
    return result;
}
