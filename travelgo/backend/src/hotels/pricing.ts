import { createHash } from 'node:crypto';
import { HOTEL_CONTRACT, type QuoteInput, type HotelQuote, type Promotion } from './contracts.js';
import { hotelError, int, normalizeStayRequest, stayDates, validatePromotion, validateRate, validateRoom } from './validation.js';
import { checkStayInventory } from './inventory.js';
const MAX = 9999999999999n;
const money = (n: bigint) => {
    if (n < 0n || n > MAX)
        hotelError('HOTEL_PRICE_LIMIT', 'Giá vượt giới hạn hỗ trợ.', 409);
    return Number(n);
};
const stable = (v: any): any => Array.isArray(v) ? v.map(stable) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, stable(v[k])])) : v;
export const hotelSourceVersion = (v: unknown) => createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
export function assertPublishedHotel(a: QuoteInput['authority']) {
    if (a.placeStatus !== 'APPROVED' || a.businessStatus !== 'ACTIVE' || a.approvedContentVersion === null || a.approvedContentVersion !== a.contentVersion)
        hotelError('HOTEL_NOT_PUBLISHED', 'Thông tin khách sạn chưa đủ điều kiện hiển thị.', 409);
    int(a.contentVersion, 1, Number.MAX_SAFE_INTEGER, 'Phiên bản nội dung');
    int(a.commercialVersion, 1, Number.MAX_SAFE_INTEGER, 'Phiên bản thương mại');
}
export function eligiblePromotion(p: Promotion, input: QuoteInput, dates: string[]) { validatePromotion(p); const now = Date.parse(input.asOf); return p.status === 'ACTIVE' && p.placeId === input.authority.placeId && (!p.roomTypeId || p.roomTypeId === input.room.id) && (!p.ratePlanId || p.ratePlanId === input.rate.id) && now >= Date.parse(p.bookingStartsAt) && now < Date.parse(p.bookingEndsAt) && dates.length >= p.minNights && dates.every(d => d >= p.stayFrom && d < p.stayUntil); }
/** One deterministic server calculation for future HotelStay V1 Booking strategy; not a second Booking engine. */
export function quoteHotelStay(input: QuoteInput): HotelQuote {
    const request = normalizeStayRequest(input.request), room = validateRoom(input.room), rate = validateRate(input.rate);
    assertPublishedHotel(input.authority);
    if (!/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(input.asOf) || !Number.isFinite(Date.parse(input.asOf)))
        hotelError('HOTEL_CLOCK_INVALID', 'Cần thời gian server có múi giờ.');
    if (room.status !== 'ACTIVE' || rate.status !== 'ACTIVE' || room.placeId !== input.authority.placeId || rate.placeId !== room.placeId || rate.roomTypeId !== room.id)
        hotelError('HOTEL_RATE_SCOPE', 'Hạng phòng hoặc gói giá không đủ điều kiện.', 409);
    if (rate.includedAdults > room.maxAdults)
        hotelError('HOTEL_RATE_OCCUPANCY', 'Số khách bao gồm vượt sức chứa phòng.', 409);
    const dates = stayDates(request.checkIn, request.checkOut), roomCount = request.rooms.length;
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(input.asOf));
    if (request.checkIn < today)
        hotelError('HOTEL_STAY_IN_PAST', 'Ngày nhận phòng đã qua.');
    if (dates.length < rate.minNights || dates.length > rate.maxNights || dates.some(d => d < rate.validFrom || d >= rate.validUntil))
        hotelError('HOTEL_RATE_DATES', 'Gói giá không áp dụng cho mọi đêm đã chọn.', 409);
    if (rate.tax.mode === 'UNKNOWN' || !rate.mandatoryFeesKnown)
        hotelError('HOTEL_PRICE_COMPONENTS_UNKNOWN', 'Chưa xác minh đủ thuế/phụ phí bắt buộc để báo tổng lưu trú.', 409);
    let perNightExtra = 0n, extraAdultPerNight = 0n, childPerNight = 0n, adults = 0, children = 0;
    for (const occupancy of request.rooms) {
        const a = occupancy.adults, c = occupancy.childAges.length;
        adults += a;
        children += c;
        if (a > room.maxAdults || c > room.maxChildren || a + c > room.maxOccupancy)
            hotelError('HOTEL_OCCUPANCY_EXCEEDED', 'Một phòng không đủ sức chứa cho số khách đã phân bổ.', 409);
        if (a > rate.includedAdults) {
            if (rate.extraAdultVndPerNight === null)
                hotelError('HOTEL_EXTRA_GUEST_PRICE_UNKNOWN', 'Chưa có phụ thu người lớn.', 409);
            const adultCharge=BigInt(a - rate.includedAdults) * BigInt(rate.extraAdultVndPerNight!); perNightExtra += adultCharge; extraAdultPerNight += adultCharge;
        }
        if (c && rate.childPolicy === 'NOT_ALLOWED')
            hotelError('HOTEL_CHILDREN_NOT_ALLOWED', 'Gói này chưa hỗ trợ trẻ em.', 409);
        if (c && rate.childPolicy === 'UNKNOWN')
            hotelError('HOTEL_CHILD_POLICY_UNKNOWN', 'Chưa có chính sách trẻ em.', 409);
        if (rate.childPolicy === 'BANDS_REQUIRED')
            for (const age of occupancy.childAges) {
                const band = rate.childBands.find(b => age >= b.minAge && age <= b.maxAge);
                if (!band)
                    hotelError('HOTEL_CHILD_PRICE_UNKNOWN', 'Chưa có giá cho độ tuổi của trẻ.', 409);
                perNightExtra += BigInt(band!.amountVndPerNight); childPerNight += BigInt(band!.amountVndPerNight);
            }
    }
    const availability = checkStayInventory(room.id, request.checkIn, request.checkOut, roomCount, input.inventory), nightMap = new Map();
    for (const n of input.nightly) {
        if (n.ratePlanId !== rate.id || nightMap.has(n.stayDate) || typeof n.closed !== 'boolean')
            hotelError('HOTEL_RATE_NIGHT_INVALID', 'Giá từng đêm không đúng scope.');
        int(n.amountVnd, 0, 1000000000000, 'Giá đêm');
        int(n.version, 1, Number.MAX_SAFE_INTEGER, 'Phiên bản');
        nightMap.set(n.stayDate, n);
    }
    const nightly = dates.map(stayDate => {
        const n = nightMap.get(stayDate);
        if (n?.closed)
            hotelError('HOTEL_RATE_CLOSED', 'Gói giá đóng bán trong kỳ lưu trú.', 409);
        const basePerRoomVnd = n?.amountVnd ?? rate.baseAmountVnd;
        return { stayDate, basePerRoomVnd, roomBaseVnd: money(BigInt(basePerRoomVnd) * BigInt(roomCount)), extraGuestsVnd: money(perNightExtra) };
    });
    const base = nightly.reduce((n, d) => n + BigInt(d.roomBaseVnd), 0n), extra = perNightExtra * BigInt(dates.length);
    let promotion: Promotion | undefined, discount = 0n;
    if (request.promotionId) {
        const p = input.promotions.filter(p => p.id === request.promotionId);
        if (p.length !== 1 || !eligiblePromotion(p[0], input, dates))
            hotelError('HOTEL_PROMOTION_NOT_ELIGIBLE', 'Ưu đãi đã hết hạn hoặc không áp dụng; cần lấy báo giá mới.', 409);
        promotion = p[0];
        discount = promotion.kind === 'PERCENT_BPS' ? base * BigInt(promotion.value) / 10000n : BigInt(promotion.value);
        if (promotion.maxDiscountVnd !== null && discount > BigInt(promotion.maxDiscountVnd))
            discount = BigInt(promotion.maxDiscountVnd);
        if (discount > base)
            discount = base;
    }
    // V1: no stacking; discount only base lodging. Extra guests/fees are not silently discounted.
    const taxable = base - discount + extra, tax = rate.tax.mode === 'EXCLUDED' ? (taxable * BigInt(rate.tax.basisPoints!) + 5000n) / 10000n : 0n;
    const fees = rate.fees.filter(f => !f.included).reduce((sum, f) => sum + BigInt(f.amountVnd) * BigInt(f.basis === 'PER_ROOM_NIGHT' ? roomCount * dates.length : f.basis === 'PER_ROOM_STAY' ? roomCount : 1), 0n);
    const expires = Math.min(Date.parse(input.asOf) + 60000, promotion ? Date.parse(promotion.bookingEndsAt) : Infinity);
    return { contract: HOTEL_CONTRACT, currency: 'VND', priceBasis: 'PER_ROOM_NIGHT', binding: false, placeId: room.placeId, roomTypeId: room.id, ratePlanId: rate.id, checkIn: request.checkIn, checkOut: request.checkOut, nights: dates.length, roomCount, adults, children, nightly, baseVnd: money(base), extraGuestsVnd: money(extra), extraAdultsVnd: money(extraAdultPerNight*BigInt(dates.length)), childrenVnd: money(childPerNight*BigInt(dates.length)), discountVnd: money(discount), taxVnd: money(tax), feesVnd: money(fees), totalVnd: money(taxable + tax + fees), promotionId: promotion?.id || null, minimumAvailableRooms: availability.minimumAvailableRooms, asOf: input.asOf, expiresAt: new Date(expires).toISOString(), sourceVersion: hotelSourceVersion({ authority: input.authority, room, rate, nightly: input.nightly.filter(n => dates.includes(n.stayDate)), inventory: availability.observed, promotion: promotion || null, request }), cancellation: structuredClone(rate.cancellation), isDemo: input.authority.isDemo, caveats: ['Báo giá tại thời điểm đọc, chưa giữ phòng hoặc tạo Booking.', 'Backend phải kiểm lại phiên bản, giá, điều kiện và khóa tồn của mọi đêm trong transaction xác nhận.', 'Không quy đổi Place.priceFrom hoặc giá review/web lịch sử thành giá phòng xác nhận.', ...(input.authority.isDemo ? ['DEMO: dữ liệu kiểm thử, không phải phòng hoặc báo giá kinh doanh thật.'] : [])] };
}
