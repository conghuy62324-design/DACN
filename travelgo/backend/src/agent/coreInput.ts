import { readCurrentTurnProof, readPendingTurnProof, validateCurrentTurnProof, type CurrentTurnProof } from './currentTurnProof.js';
import { AGENT_TOOLS } from './tools.js';
import { fold, type CatalogFilters } from '../services/registeredCatalogService.js';
export const CORE_OPERATIONS = ['search_registered_hotels', 'search_registered_restaurants', 'get_listing_details', 'compare_travel_options', 'search_places', 'plan_trip', 'get_trip', 'save_or_update_trip', 'booking_preview'] as const;
export type CoreOperation = typeof CORE_OPERATIONS[number];
export type CoreInterpretation = {
    operation?: CoreOperation;
    canonical: string;
    filters?: CatalogFilters;
    replace?: 'hotel_cheaper' | 'hotel_other' | 'restaurant_other';
    excludeSeafood?: boolean;
    error?: string;
};
export function coreInterpretation(message: string, values: Record<string, any>, explicitIntentOnly = false): CoreInterpretation {
    const raw = message.normalize('NFC').trim().replace(/\s+/g, ' '), normalized = fold(raw).replace(/[.!]$/, '').trim();
    // A shared suffix belongs to all correction families, not one benchmark sentence.
    const s = normalized.replace(/,? giu (?:cac )?thong tin con lai$/, '').trim();
    if (/^(?:doi|chuyen)(?: phuong tien)? sang (xe may|o to)$/.test(s))
        return { operation: 'plan_trip', canonical: 'Phương tiện: ' + (/xe may$/.test(s) ? 'xe máy' : 'ô tô') };
    const money = (value: string, unit?: string) => Number(value.replace(',', '.')) *
        (/^(trieu|tr)$/.test(unit || '') ? 1000000 : /^(k|nghin|ngan)$/.test(unit || '') ? 1000 : 1);
    const budget = s.match(/^(?:tang|giam|doi) ngan sach (?:len|xuong|con|thanh) (\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|vnd|dong)?$/);
    if (budget) {
        const n = money(budget[1], budget[2]);
        return { operation: 'plan_trip', canonical: 'Ngân sách cả nhóm: ' + n + ' VND' };
    }
    const relativeBudget = s.match(/^(tang|giam) ngan sach (?:them|di|bot) (\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|vnd|dong)$/);
    if (relativeBudget) {
        if (!Number.isFinite(values.totalBudget) || values.totalBudget <= 0)
            return { canonical: raw, error: 'Cần ngân sách cả nhóm đã xác minh trước khi tăng/giảm tương đối.' };
        const next = values.totalBudget + (relativeBudget[1] === 'giam' ? -1 : 1) * money(relativeBudget[2], relativeBudget[3]);
        if (!Number.isSafeInteger(next) || next <= 0)
            return { canonical: raw, error: 'Ngân sách sau thay đổi phải lớn hơn 0 và là số VND hợp lệ.' };
        return { operation: 'plan_trip', canonical: 'Ngân sách cả nhóm: ' + next + ' VND' };
    }
    const days = s.match(/^(them|bot|giam) (mot|hai|ba|\d{1,2}) ngay$/);
    if (days) {
        if (!/^\d{4}-\d\d-\d\d$/.test(values.endDate || ''))
            return { canonical: raw, error: 'Cần ngày kết thúc đã xác minh trước khi thêm/bớt ngày.' };
        const count = ({ mot: 1, hai: 2, ba: 3 } as Record<string, number>)[days[2]] ?? Number(days[2]);
        if (count < 1 || count > 30)
            return { canonical: raw, error: 'Số ngày thay đổi phải từ 1 đến 30.' };
        const date = new Date(values.endDate + 'T00:00:00Z');
        if (!Number.isFinite(date.getTime()))
            return { canonical: raw, error: 'Ngày kết thúc chưa hợp lệ.' };
        date.setUTCDate(date.getUTCDate() + (days[1] === 'them' ? count : -count));
        if (values.startDate && date.toISOString().slice(0, 10) < values.startDate)
            return { canonical: raw, error: 'Không thể bớt ngày để ngày kết thúc trước ngày bắt đầu.' };
        return { operation: 'plan_trip', canonical: 'Ngày kết thúc: ' + date.toISOString().slice(0, 10) };
    }
    if (/^doi khach san re hon$/.test(s))
        return { operation: 'plan_trip', canonical: raw, replace: 'hotel_cheaper' };
    if (/^(?:doi|thay) khach san(?: khac)?$/.test(s))
        return { operation: 'plan_trip', canonical: raw, replace: 'hotel_other' };
    if (/^(?:giu khach san,? chi (?:doi|thay) nha hang|(?:doi|thay) nha hang(?: khac)?)$/.test(s))
        return { operation: 'plan_trip', canonical: raw, replace: 'restaurant_other' };
    if (/^khong an hai san nua$/.test(s))
        return { operation: 'plan_trip', canonical: raw, replace: 'restaurant_other', excludeSeafood: true };
    // Negated/conditional edits never become model execution authority or consume inference.
    if (/^(?:khong|dung|chua|neu|gia su|co le|co the|hay la)\b/.test(s))
        return { canonical: raw, error: 'Chưa thực hiện thay đổi có phủ định, điều kiện hoặc chưa chắc chắn. Hãy xác nhận thao tác cụ thể.' };
    if (/^lap lai lich trinh(?: voi ngan sach moi)?$/.test(s))
        return { operation: 'plan_trip', canonical: raw };
    const search = s.match(/^tim (khach san|nha hang|dia diem)(?: (?:o|tai) ([a-z -]+?))?(?:[,;]? (?:ngan sach|gia toi da) (\d+(?:[.,]\d+)?)\s*(trieu|tr|k|nghin|ngan|vnd|dong)?)?$/d);
    if (search) {
        const city = search.indices?.[2] ? raw.slice(search.indices[2][0], search.indices[2][1]) : undefined;
        const max = search[3] ? Number(search[3].replace(',', '.')) * (/^(trieu|tr)$/.test(search[4]) ? 1000000 : /^(k|nghin|ngan)$/.test(search[4]) ? 1000 : 1) : undefined;
        return { operation: search[1] === 'khach san' ? 'search_registered_hotels' : search[1] === 'nha hang' ? 'search_registered_restaurants' : 'search_places', canonical: raw, filters: { ...(city ? { city } : {}), ...(max === undefined ? {} : { maxPriceFrom: max }) } };
    }
    const commands: Record<string, CoreOperation> = { 'xem chi tiet': 'get_listing_details', 'so sanh cac lua chon nay': 'compare_travel_options', 'xem trip cua toi': 'get_trip', 'mo lai trip': 'get_trip', 'luu trip': 'save_or_update_trip', 'luu lich trinh': 'save_or_update_trip', 'cap nhat trip': 'save_or_update_trip', 'chuan bi booking': 'booking_preview', 'chon khach san nay': 'plan_trip', 'chon nha hang nay': 'plan_trip' };
    if (commands[s])
        return { operation: commands[s], canonical: raw };
    // Advisory speech is a request for interpretation, not a verified travel-role patch.
    // In particular, accent folding makes "tư vấn" look like the departure prefix "từ".
    if (explicitIntentOnly && /^(?:tu van|goi y|xin goi y|xin tu van|giup (?:toi|minh)|toi muon|minh muon)\b/.test(s))
        return {canonical: raw};
    const proof = readCurrentTurnProof(raw) || readPendingTurnProof(raw, 'plan_trip');
    // An empty inherited proof is not an explicit replanning request under v2.
    if (explicitIntentOnly && proof && !/^(?:lap|tao|len)(?: lai)? lich trinh(?:[ ,;]|$)/.test(s) &&
        ![...Object.values(proof.states), ...Object.values(proof.optionalStates || {})].some(state => state !== 'OMITTED'))
        return {canonical: raw};
    return { ...(proof?.toolName === 'plan_trip' ? { operation: 'plan_trip' as const } : {}), canonical: raw };
}
export function mergeCorePlanProof(previous: CurrentTurnProof | undefined, message: string): CurrentTurnProof | undefined {
    const patch = readCurrentTurnProof(message) || readPendingTurnProof(message, 'plan_trip');
    if (!patch || patch.toolName !== 'plan_trip')
        return previous;
    const required = AGENT_TOOLS.find(x => x.name === 'plan_trip')!.parameters.required;
    const next: CurrentTurnProof = previous ? structuredClone(previous) : { toolName: 'plan_trip', dialect: 'NATURAL', values: {}, states: Object.fromEntries(required.map(f => [f, 'OMITTED'])), optionalValues: {}, optionalStates: {}, accentInsensitiveCities: [], valid: true };
    for (const field of required) {
        let state = patch.states[field];
        if (!state || state === 'OMITTED')
            continue;
        const value = patch.values[field];
        if (field.endsWith('City') && state === 'SET' && (typeof value !== 'string' || !/^[\p{L}][\p{L}\s-]{0,119}$/u.test(value) || value.split(/\s+/).some(w => w.length > 24) || /\b(?:nao|gi|tuy|bat ky|cung duoc|chua|khong)\b/.test(fold(value))))
            state = 'UNPROVEN';
        next.states[field] = state;
        if (state === 'SET')
            next.values[field] = structuredClone(value);
        else
            delete next.values[field];
    }
    for (const [field, value] of Object.entries(patch.optionalValues)) {
        next.optionalValues[field] = value;
        (next.optionalStates ||= {})[field] = 'SET';
    }
    for (const [field, state] of Object.entries(patch.optionalStates || {}))
        if (state !== 'OMITTED') {
            (next.optionalStates ||= {})[field] = state;
            if (state !== 'SET')
                delete next.optionalValues[field];
        }
    next.accentInsensitiveCities = [...new Set([...next.accentInsensitiveCities, ...patch.accentInsensitiveCities])];
    validateCurrentTurnProof(next);
    return next;
}
