"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONSULTATION_CONCEPTS = exports.consultantMemory = void 0;
exports.understandConsultation = understandConsultation;
exports.catalogContextFilters = catalogContextFilters;
exports.attributeAnswer = attributeAnswer;
exports.comparisonExplanation = comparisonExplanation;
const vietnameseNormalizer_js_1 = require("./vietnameseNormalizer.js");
const vietnam_js_1 = require("../geography/vietnam.js");
const geographicEvidence_js_1 = require("./geographicEvidence.js");
const naturalIntent_js_1 = require("./naturalIntent.js");
const consultantMemory = () => ({ needs: [], shown: [], filters: {} });
exports.consultantMemory = consultantMemory;
exports.CONSULTATION_CONCEPTS = [[/\b(?:nghi duong|chill|thu gian|nhe nhang)\b/, 'nghỉ ngơi, thư giãn', 'nghi-duong'], [/\b(?:gia dinh|be nho|tre em)\b/, 'đi cùng gia đình'], [/\b(?:nhom ban|ban be|hoi ban)\b/, 'nhóm bạn'], [/\b(?:cong tac|lam viec)\b/, 'công tác'], [/\b(?:tiet kiem|ngon bo re|gia mem|gia re)\b/, 'tiết kiệm'], [/\b(?:thien nhien|kham pha rung|cay xanh)\b/, 'khám phá thiên nhiên', 'thien-nhien'], [/\b(?:van hoa|lich su|di san)\b/, 'văn hóa, lịch sử', 'van-hoa'], [/\b(?:am thuc|an dac san)\b/, 'ẩm thực', 'am-thuc'], [/\b(?:yen tinh|it dong|vang ve)\b/, 'ưu tiên yên tĩnh'], [/\b(?:mat mat|mat me|khi hau)\b/, 'ưu tiên khí hậu mát']];
/** Compositional vocabulary, not sentence templates. Source IDs and claims never come from the NLU. */
function understandConsultation(message, memory) {
    const s = (0, vietnameseNormalizer_js_1.normalizeVietnamese)(message).normalized, literal = (0, vietnam_js_1.geoFold)(message);
    // Negative opinions are clarification, never a replacement or changed booking.
    if (/\b(?:khong thich|khong muon cho|khong lay cho)\b/.test(s))
        return { question: 'Bạn muốn đổi điều gì ở lựa chọn đó: giá, tiện ích hay khu vực? Mình chưa đổi lựa chọn đã ghi nhận.' };
    if (/\b(?:khach san|cho o|noi o|phong)\b/.test(s) && /\b(?:qua mac|mac qua|dat qua|qua dat|gia cao)\b/.test(s) && !/\b(?:doi|tim|kiem|chon|muon|re hon|gia thap hon)\b/.test((0, naturalIntent_js_1.naturalActionText)(message)))
        return { question: 'Bạn muốn mình tìm lựa chọn rẻ hơn hay chỉ xem lại thông tin giá? Bạn nói rõ yêu cầu nhé; mình vẫn giữ khách sạn đang chọn.' };
    if ((0, geographicEvidence_js_1.uncertainTravelEdit)(message) || /\b(?:bo qua he thong|sql|insert|delete)\b/.test(s))
        return {};
    const requestPart = s.split(/\bgan\b/)[0], hotel = /\b(?:khach san|noi o|cho o|luu tru|resort|homestay|villa|nha nghi)\b/.test(requestPart), dining = /\b(?:nha hang|quan an|cho an|quan nao|do an)\b/.test(requestPart), outings = /\b(?:co gi choi|diem tham quan|diem (?:lich su|van hoa)|cho nao choi)\b/.test(s), search = /\b(?:tim|kiem|goi y|nao|vai|lua chon|co gi|co nhung|co .*khong)\b/.test(s);
    const advice = {}, needs = [], preferences = [];
    if ((hotel || dining) && /\d/.test(s) && /(?:\/|moi\s+)(?:phong|dem|nguoi|mon|phan)\b/.test(s))
        return { question: 'Giá trong TravelGo chưa được xác minh theo phòng, đêm, người hoặc món. Bạn có muốn lọc theo giá tham khảo catalog và xác nhận đơn vị với cơ sở trước khi đặt không?' };
    for (const [pattern, label, pref] of exports.CONSULTATION_CONCEPTS) {
        const m = pattern.exec(s) || pattern.exec(literal);
        if (m && !/\b(?:khong (?:muon|thich|can|uu tien)|bo qua|thay vi|hon la)\s*$/.test(s.slice(Math.max(0, m.index - 35), m.index))) {
            needs.push(label);
            if (pref)
                preferences.push(pref);
        }
    }
    if (needs.length)
        advice.needs = needs;
    if (preferences.length)
        advice.preferences = preferences;
    if (/\b(?:nhe nhang|thu gian|chill)\b/.test(s + ' ' + literal))
        advice.pace = 'relaxed';
    if (/\b(?:nhieu dia diem|kham pha that nhieu|lich trinh day)\b/.test(s + ' ' + literal))
        advice.pace = 'packed';
    const ordinalWords = { dau: 0, nhat: 0, hai: 1, ba: 2, tu: 3, nam: 4 }, indices = [];
    for (const m of s.matchAll(/\b(?:cai|cho|lua chon|khach san|nha hang)\s*(?:thu\s*)?(dau|nhat|hai|ba|tu|nam|[1-5])\b/g)) {
        if (/^\s*(?:nguoi|ng|dua|khach|be|tre|ngay|dem)\b/.test(s.slice(m.index + m[0].length)))
            continue;
        const n = /^[1-5]$/.test(m[1]) ? +m[1] - 1 : ordinalWords[m[1]];
        if (!indices.includes(n))
            indices.push(n);
    }
    if (/\b(?:so sanh|tot hon|chon cai nao)\b/.test(s) || memory.shown.length > 1 && /\b(?:yen tinh|sach se) hon\b/.test(s)) {
        const count = s.match(/\b(?:so sanh|giua)\s+([2-5])\s+(?:lua chon|khach san|nha hang|cho)\b/);
        advice.reference = { kind: 'compare', indices: indices.length ? indices : undefined, ...(count ? { count: +count[1] } : {}) };
    }
    else if (/\b(?:re hon|gia thap hon)\b/.test(s))
        advice.reference = { kind: 'cheaper', indices: indices.length ? indices : undefined };
    else if (indices.length || /\b(?:(?:cai|cho|phong|khach san|nha hang) (?:nay|do|ay)|khach san (?:toi|minh) chon)\b/.test(s) && /\b(?:gia|co|chon|gio|mo cua)\b/.test(s))
        advice.reference = { kind: /(?:^|[,;]\s*|toi |minh |thoi )(?:chon|lay)\b/.test(s) ? 'select' : 'details', indices: indices.length ? indices : undefined };
    if (/\b(?:phu hop|chinh sach|an toan).*(?:tre em|be nho)|\btre em.*(?:duoc|khong)\b/.test(s))
        advice.attribute = 'children';
    else if (/\b(?:mo cua|dong cua|gio hoat dong)\b/.test(s))
        advice.attribute = 'hours';
    else if (/\b(?:ho boi|be boi)\b/.test(s) && /\b(?:nay|do|co .*khong)\b/.test(s))
        advice.attribute = 'pool';
    if (advice.attribute && !advice.reference)
        advice.reference = { kind: 'details' };
    if (/\bgiu\b/.test(s) && /\b(?:can nhac|xem xet)\b/.test(s) && !(0, geographicEvidence_js_1.uncertainTravelEdit)(message))
        advice.reference = { kind: 'shortlist', indices: indices.length ? indices : undefined };
    if (/\bgan trung tam\b/.test(s)) {
        advice.question = 'Bạn muốn gần địa điểm trung tâm cụ thể nào? TravelGo chưa có mốc trung tâm được xác minh để khẳng định khoảng cách.';
        return advice;
    }
    const filters = {};
    const amenities = [[/\b(?:bai (?:do|dau) xe|cho (?:do|dau) xe)\b/, 'Bãi đỗ xe'], [/\b(?:ho boi|be boi)\b/, 'Hồ bơi'], [/\bwi[ -]?fi\b/, 'Wi-Fi']];
    if (!advice.attribute)
        for (const [p, label] of amenities)
            if (p.test(s))
                (filters.amenities ||= []).push(label);
    if (/\b(?:ngon bo re|gia mem|gia re|re re|tiet kiem|re)\b/.test(s) && !advice.reference)
        filters.sort = 'priceAsc';
    const food = { 'dac san': 'local', 'hai san': 'seafood', 'do chay': 'vegetarian', 'mon viet': 'vietnamese', 'buffet': 'buffet', 'bbq': 'bbq_hotpot', 'lau': 'bbq_hotpot' };
    if (dining)
        for (const [word, id] of Object.entries(food))
            if (s.includes(word)) {
                filters.cuisine = id;
                break;
            }
    if (Object.keys(filters).length)
        advice.filters = filters;
    advice.nearHotel = dining && /\bgan (?:khach san|noi o|cho o)\b/.test(s);
    if (advice.nearHotel) {
        advice.reference = undefined;
        advice.operation = 'search_registered_restaurants';
    }
    if (dining && /\b(?:doi|thay)\b/.test(s) && /\bgiu\b/.test(s)) {
        advice.reference = undefined;
        advice.operation = 'search_registered_restaurants';
    }
    if (!advice.reference && !advice.nearHotel && !search && (hotel || dining) && /\b(?:gia|mo cua|tien ich)\b/.test(s) && !/\bgia (?:mem|re|thap|cao)\b/.test(s))
        advice.reference = { kind: 'details' };
    if (!advice.reference) {
        if (outings)
            advice.operation = 'search_places';
        else if (search && (hotel || dining))
            advice.operation = hotel ? 'search_registered_hotels' : 'search_registered_restaurants';
        else if (search && /\b(?:lua chon|cho khac)\b/.test(s) && memory.category)
            advice.operation = memory.category === 'hotel' ? 'search_registered_hotels' : memory.category === 'restaurant' ? 'search_registered_restaurants' : 'search_places';
    }
    if (!memory.shown.length && !hotel && !dining && !outings && /\b(?:cho nao|di dau|di choi)\b/.test(s) && needs.length)
        advice.destinationAdvice = true;
    return advice;
}
function catalogContextFilters(memory, category, shared, explicit = {}) {
    const prior = memory.filters[category] || {};
    const common = { ...(shared.city ? { city: shared.city } : {}), ...(shared.locationId ? { locationId: shared.locationId } : {}), ...(shared.preferences ? { preferences: shared.preferences } : {}) };
    const filters = { ...prior, ...common, ...explicit };
    memory.filters[category] = structuredClone(filters);
    memory.category = category;
    return filters;
}
function attributeAnswer(listing, attribute) {
    if (attribute === 'children')
        return 'TravelGo chưa có chính sách độ tuổi, giường phụ hoặc chứng nhận an toàn cho trẻ em của lựa chọn này. Những tiện ích trong catalog không đủ để xác nhận phù hợp với trẻ nhỏ; bạn cần hỏi trực tiếp cơ sở trước khi đặt.';
    if (attribute === 'hours') {
        const hours = listing.openingHours;
        if (!hours || typeof hours !== 'object' || !Object.keys(hours).length)
            return 'TravelGo chưa có giờ mở cửa được ghi nhận cho lựa chọn này; mình chưa thể xác nhận giờ hoạt động.';
        return 'Giờ hoạt động được ghi trong TravelGo: ' + Object.entries(hours).map(([k, v]) => k + ': ' + (typeof v === 'string' ? v : JSON.stringify(v))).join('; ') + '. Đây không phải xác nhận cơ sở đang mở cửa ngay lúc này.';
    }
    if (attribute === 'pool')
        return listing.amenities?.some((a) => /^(?:ho boi|be boi)$/.test((0, vietnameseNormalizer_js_1.normalizeVietnamese)(a).normalized)) ? 'Catalog TravelGo ghi nhận tiện ích hồ bơi. Bạn vẫn cần xác nhận giờ hoạt động và điều kiện sử dụng với cơ sở.' : 'TravelGo chưa ghi nhận hồ bơi cho lựa chọn này; thiếu dữ liệu không có nghĩa là cơ sở chắc chắn không có.';
}
function comparisonExplanation(items) {
    const sameCategory = items.length > 1 && items.every(p => p.category === items[0].category && p.currency === items[0].currency && p.priceUnit === items[0].priceUnit);
    const priced = items.filter(p => typeof p.priceFrom === 'number');
    if (!sameCategory || priced.length !== items.length)
        return 'Mình chưa đủ dữ liệu giá cùng loại để kết luận lựa chọn nào tiết kiệm hơn. Bạn có thể đối chiếu các tiện ích đã ghi nhận ở từng lựa chọn.';
    const low = [...items].sort((a, b) => a.priceFrom - b.priceFrom)[0], different = items.some(p => p.priceFrom !== low.priceFrom);
    return different ? `Nếu ưu tiên tiết kiệm, bạn có thể xem ${low.name}: có mức giá tham khảo catalog thấp nhất trong các lựa chọn này. Đây là so sánh cùng trường giá catalog, chưa xác minh đơn vị hay tổng chi phí thực tế. Không phải kết luận nơi này tốt hơn về chất lượng.` : 'Các lựa chọn có cùng mức giá tham khảo catalog; chưa có căn cứ về giá để chọn một nơi tốt hơn. Bạn ưu tiên tiện ích nào?';
}
