import { HttpError } from '../utils/httpError.js';
import { PROVINCES, resolveLocation, geoFold, locationsWithCatalog } from '../geography/vietnam.js';
import { ROOM_AMENITIES, ROOM_VIEWS, type AddressInput, type HotelAddress, type RoomType, type StayRequest, type RatePlan, type Promotion } from './contracts.js';
export const hotelError = (code: string, message: string, status = 400): never => { throw new HttpError(status, message, code); };
export function objectOnly(v: any, keys: readonly string[]) {
    if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k)))
        hotelError('HOTEL_INPUT_FIELDS', 'Thông tin có trường không được hỗ trợ.');
}
export function int(v: any, min: number, max: number, label: string) {
    if (typeof v !== 'number' || !Number.isSafeInteger(v) || v < min || v > max)
        hotelError('HOTEL_NUMBER_INVALID', label + ' không hợp lệ.');
    return v as number;
}
export function text(v: any, max: number, optional = false): string | null {
    if (optional && (v === undefined || v === null || v === ''))
        return null;
    if (typeof v !== 'string' || !v.trim() || v.trim().length > max || /[\u0000-\u001f\u007f]/.test(v))
        hotelError('HOTEL_TEXT_INVALID', 'Nội dung không hợp lệ.');
    return (v as string).normalize('NFC').trim().replace(/\s+/g, ' ');
}
export function uuid(v: any) {
    if (typeof v !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v))
        hotelError('HOTEL_ID_INVALID', 'Mã dữ liệu không hợp lệ.');
    return (v as string).toLowerCase();
}
export function civilDate(v: any): string {
    if (typeof v !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(v))
        hotelError('HOTEL_DATE_INVALID', 'Ngày cần theo dạng YYYY-MM-DD.');
    const n = Date.parse(v + 'T00:00:00Z');
    if (!Number.isFinite(n) || new Date(n).toISOString().slice(0, 10) !== v)
        hotelError('HOTEL_DATE_INVALID', 'Ngày không tồn tại.');
    return v;
}
export function stayDates(checkIn: string, checkOut: string) {
    civilDate(checkIn);
    civilDate(checkOut);
    const days = (Date.parse(checkOut + 'T00:00:00Z') - Date.parse(checkIn + 'T00:00:00Z')) / 86400000;
    if (days < 1 || days > 90)
        hotelError('HOTEL_STAY_LENGTH', 'Lưu trú cần từ1 đến90 đêm.');
    return Array.from({ length: days }, (_, i) => new Date(Date.parse(checkIn + 'T00:00:00Z') + i * 86400000).toISOString().slice(0, 10));
}
export function normalizeStayRequest(v: any): StayRequest {
    objectOnly(v, ['checkIn', 'checkOut', 'rooms', 'promotionId']);
    stayDates(v.checkIn, v.checkOut);
    if (!Array.isArray(v.rooms) || !v.rooms.length || v.rooms.length > 10)
        hotelError('HOTEL_ROOM_COUNT', 'Cần chọn từ1 đến10 phòng.');
    const rooms = v.rooms.map((r: any) => {
        objectOnly(r, ['adults', 'childAges']);
        int(r.adults, 1, 20, 'Người lớn');
        if (!Array.isArray(r.childAges) || r.childAges.length > 10)
            hotelError('HOTEL_CHILD_AGES', 'Cần tuổi của từng trẻ.');
        return { adults: r.adults, childAges: r.childAges.map((a: any) => int(a, 0, 17, 'Tuổi trẻ')) };
    });
    return { checkIn: v.checkIn, checkOut: v.checkOut, rooms, ...(v.promotionId !== undefined ? { promotionId: uuid(v.promotionId) } : {}) };
}
/** Field-aware lexical normalization. No inferred city, ward registry, coordinates or distances. */
export function addressFold(v: string) { return geoFold(v).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
export function streetKey(v: string) { return addressFold(v).replace(/^(?:duong|d|street)\s+/, ''); }
export function wardKey(v: string) { return addressFold(v).replace(/^p\s+/, 'phuong ').replace(/^x\s+/, 'xa '); }
export function normalizeAddress(v: AddressInput, asOf = new Date().toISOString()): HotelAddress {
    if (!Number.isFinite(Date.parse(asOf)))
        hotelError('HOTEL_CLOCK_INVALID', 'Thời gian cập nhật cần lấy từ server.');
    objectOnly(v, ['houseNumber', 'streetName', 'wardOrCommune', 'administrativeArea', 'provinceOrCity', 'tourismDestination', 'latitude', 'longitude', 'coordinateStatus', 'source']);
    if (v.tourismDestination !== undefined)
        text(v.tourismDestination, 120);
    const admin = text(v.provinceOrCity, 120)!;
    const province = PROVINCES.find(p => [p.id, p.name, p.catalogName, ...p.aliases, ...(p.legacyNames || [])].some(n => geoFold(n) === geoFold(admin)));
    if (!province)
        hotelError('HOTEL_ADMIN_AREA_REQUIRED', 'Chọn tỉnh/thành hành chính; địa danh du lịch cần được chọn riêng.');
    const destination = v.tourismDestination ? resolveLocation(text(v.tourismDestination, 120)!) || locationsWithCatalog([{ city: text(v.tourismDestination, 120)!, province: province!.catalogName }]).find(g => g.kind === 'destination' && geoFold(g.name) === geoFold(v.tourismDestination)) : undefined;
    if (v.tourismDestination && (!destination || destination.kind !== 'destination' || destination.provinceCode !== province!.id))
        hotelError('HOTEL_DESTINATION_CONFLICT', 'Địa danh du lịch không khớp tỉnh/thành đã chọn.');
    const latitude = v.latitude ?? null, longitude = v.longitude ?? null;
    if ((latitude === null) !== (longitude === null))
        hotelError('HOTEL_COORDINATE_PAIR', 'Cần cung cấp cả vĩ độ và kinh độ.');
    if (latitude !== null && (typeof latitude !== 'number' || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || typeof longitude !== 'number' || !Number.isFinite(longitude) || Math.abs(longitude) > 180))
        hotelError('HOTEL_COORDINATES_INVALID', 'Tọa độ không hợp lệ.');
    const coordinateStatus = v.coordinateStatus || (latitude === null ? 'UNKNOWN' : 'PARTNER_PROVIDED');
    if (!['UNKNOWN', 'PARTNER_PROVIDED'].includes(coordinateStatus) || coordinateStatus === 'UNKNOWN' && latitude !== null || coordinateStatus === 'PARTNER_PROVIDED' && latitude === null)
        hotelError('HOTEL_COORDINATE_AUTHORITY', 'Không tự xác minh tọa độ.');
    const parts = { houseNumber: text(v.houseNumber, 40, true), streetName: text(v.streetName, 160, true), wardOrCommune: text(v.wardOrCommune, 160, true), administrativeArea: text(v.administrativeArea, 160, true) };
    const fullAddress = [[parts.houseNumber, parts.streetName].filter(Boolean).join(' '), parts.wardOrCommune, parts.administrativeArea, province!.catalogName].filter(Boolean).join(', ');
    return { ...parts, provinceCode: province!.id, provinceOrCity: province!.catalogName, tourismDestinationId: destination?.id || null, fullAddress, normalizedAddress: addressFold(fullAddress), streetKey: parts.streetName ? streetKey(parts.streetName) : null, latitude, longitude, coordinateStatus: coordinateStatus as 'UNKNOWN' | 'PARTNER_PROVIDED', source: text(v.source, 200)!, updatedAt: new Date(asOf).toISOString() };
}
export function validateRoom(v: RoomType) {
    objectOnly(v, ['id', 'placeId', 'name', 'description', 'areaM2', 'bedrooms', 'bathrooms', 'beds', 'extraBedAvailable', 'maxOccupancy', 'maxAdults', 'maxChildren', 'view', 'balcony', 'hasWindow', 'kitchen', 'privateBathroom', 'amenities', 'status', 'version']);
    uuid(v.id);
    uuid(v.placeId);
    text(v.name, 160);
    text(v.description, 10000);
    int(v.version, 1, Number.MAX_SAFE_INTEGER, 'Phiên bản');
    int(v.maxOccupancy, 1, 30, 'Sức chứa');
    int(v.maxAdults, 1, 20, 'Người lớn');
    int(v.maxChildren, 0, 10, 'Trẻ em');
    if (v.maxAdults > v.maxOccupancy || v.maxChildren > v.maxOccupancy)
        hotelError('HOTEL_OCCUPANCY_INVALID', 'Sức chứa phòng không khớp.');
    if (v.areaM2 !== null && (typeof v.areaM2 !== 'number' || !Number.isFinite(v.areaM2) || v.areaM2 <= 0 || v.areaM2 > 10000))
        hotelError('HOTEL_ROOM_AREA', 'Diện tích phòng không hợp lệ.');
    for (const n of [v.bedrooms, v.bathrooms])
        if (n !== null)
            int(n, 0, 30, 'Số phòng');
    for (const n of [v.extraBedAvailable, v.balcony, v.hasWindow, v.kitchen, v.privateBathroom])
        if (n !== null && typeof n !== 'boolean')
            hotelError('HOTEL_BOOLEAN_INVALID', 'Tiện ích phải là true/false hoặc chưa rõ.');
    if (!ROOM_VIEWS.includes(v.view) || !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(v.status) || !Array.isArray(v.amenities) || v.amenities.some(a => !ROOM_AMENITIES.includes(a)) || new Set(v.amenities).size !== v.amenities.length)
        hotelError('HOTEL_ROOM_CLASSIFICATION', 'Phân loại phòng không hợp lệ.');
    if (!Array.isArray(v.beds) || v.beds.length < 1 || v.beds.length > 8)
        hotelError('HOTEL_BEDS_INVALID', 'Cần thông tin giường.');
    for (const b of v.beds) {
        objectOnly(b, ['type', 'quantity']);
        if (!['SINGLE', 'DOUBLE', 'QUEEN', 'KING', 'BUNK', 'SOFA', 'OTHER'].includes(b.type))
            hotelError('HOTEL_BEDS_INVALID', 'Loại giường không hợp lệ.');
        int(b.quantity, 1, 30, 'Số giường');
    }
    return v;
}
export function validateRate(v: RatePlan) {
    objectOnly(v, ['id', 'roomTypeId', 'placeId', 'name', 'currency', 'priceBasis', 'baseAmountVnd', 'validFrom', 'validUntil', 'minNights', 'maxNights', 'includedAdults', 'extraAdultVndPerNight', 'childPolicy', 'childBands', 'mealPlan', 'cancellation', 'tax', 'fees', 'mandatoryFeesKnown', 'status', 'version']);
    uuid(v.id);
    uuid(v.placeId);
    uuid(v.roomTypeId);
    text(v.name, 160);
    if (v.currency !== 'VND' || v.priceBasis !== 'PER_ROOM_NIGHT')
        hotelError('HOTEL_RATE_BASIS', 'Giai đoạn này chỉ hỗ trợ VND mỗi phòng/đêm, không quy đổi giá legacy.');
    int(v.baseAmountVnd, 0, 1000000000000, 'Giá');
    civilDate(v.validFrom);
    civilDate(v.validUntil);
    if (v.validUntil <= v.validFrom)
        hotelError('HOTEL_RATE_DATES', 'Khoảng ngày giá không hợp lệ.');
    int(v.version, 1, Number.MAX_SAFE_INTEGER, 'Phiên bản');
    int(v.minNights, 1, 90, 'Số đêm');
    int(v.maxNights, v.minNights, 90, 'Số đêm');
    int(v.includedAdults, 1, 20, 'Người lớn đã bao gồm');
    if (v.extraAdultVndPerNight !== null)
        int(v.extraAdultVndPerNight, 0, 1000000000000, 'Phụ thu');
    if (!['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(v.status) || !['ROOM_ONLY', 'BREAKFAST_INCLUDED'].includes(v.mealPlan) || !['NOT_ALLOWED', 'INCLUDED', 'BANDS_REQUIRED', 'UNKNOWN'].includes(v.childPolicy))
        hotelError('HOTEL_RATE_POLICY', 'Chính sách giá không hợp lệ.');
    if (!Array.isArray(v.childBands) || v.childBands.length > 18)
        hotelError('HOTEL_CHILD_POLICY', 'Chính sách trẻ em không hợp lệ.');
    const bands = [...v.childBands].sort((a, b) => a.minAge - b.minAge);
    for (let i = 0; i < bands.length; i++) {
        const b = bands[i];
        objectOnly(b, ['minAge', 'maxAge', 'amountVndPerNight']);
        int(b.minAge, 0, 17, 'Tuổi');
        int(b.maxAge, b.minAge, 17, 'Tuổi');
        int(b.amountVndPerNight, 0, 1000000000000, 'Phụ thu');
        if (i && bands[i - 1].maxAge >= b.minAge)
            hotelError('HOTEL_CHILD_BANDS_OVERLAP', 'Khoảng tuổi bị chồng lấn.');
    }
    objectOnly(v.cancellation, ['kind', 'cutoffHours', 'terms']);
    if (!['FREE_UNTIL_CUTOFF', 'NON_REFUNDABLE', 'CONDITIONAL'].includes(v.cancellation.kind))
        hotelError('HOTEL_CANCELLATION_POLICY', 'Chính sách hủy không hợp lệ.');
    text(v.cancellation.terms, 4000);
    if (v.cancellation.cutoffHours !== null)
        int(v.cancellation.cutoffHours, 0, 8760, 'Thời hạn hủy');
    if (v.cancellation.kind === 'FREE_UNTIL_CUTOFF' && v.cancellation.cutoffHours === null)
        hotelError('HOTEL_CANCELLATION_CUTOFF', 'Chưa có thời hạn hủy miễn phí.');
    objectOnly(v.tax, ['mode', 'basisPoints']);
    if (!['INCLUDED', 'EXCLUDED', 'UNKNOWN'].includes(v.tax.mode))
        hotelError('HOTEL_TAX_POLICY', 'Thuế chưa hợp lệ.');
    if (v.tax.basisPoints !== null)
        int(v.tax.basisPoints, 0, 10000, 'Thuế');
    if (v.tax.mode === 'EXCLUDED' && v.tax.basisPoints === null)
        hotelError('HOTEL_TAX_UNKNOWN', 'Chưa có mức thuế.');
    if (typeof v.mandatoryFeesKnown !== 'boolean' || !Array.isArray(v.fees) || v.fees.length > 8)
        hotelError('HOTEL_FEE_POLICY', 'Phụ phí chưa hợp lệ.');
    const codes = new Set();
    for (const f of v.fees) {
        objectOnly(f, ['code', 'amountVnd', 'basis', 'included']);
        text(f.code, 40);
        if (codes.has(f.code))
            hotelError('HOTEL_FEE_DUPLICATE', 'Phụ phí trùng.');
        codes.add(f.code);
        int(f.amountVnd, 0, 1000000000000, 'Phụ phí');
        if (!['PER_ROOM_NIGHT', 'PER_ROOM_STAY', 'PER_BOOKING'].includes(f.basis) || typeof f.included !== 'boolean')
            hotelError('HOTEL_FEE_POLICY', 'Đơn vị phụ phí chưa hợp lệ.');
    }
    return v;
}
export function validatePromotion(v: Promotion) {
    objectOnly(v, ['id', 'placeId', 'roomTypeId', 'ratePlanId', 'name', 'currency', 'kind', 'value', 'maxDiscountVnd', 'bookingStartsAt', 'bookingEndsAt', 'stayFrom', 'stayUntil', 'minNights', 'status', 'version']);
    uuid(v.id);
    uuid(v.placeId);
    if (v.roomTypeId !== null)
        uuid(v.roomTypeId);
    if (v.ratePlanId !== null)
        uuid(v.ratePlanId);
    if (v.ratePlanId !== null && v.roomTypeId === null)
        hotelError('HOTEL_PROMOTION_SCOPE', 'Gói giá cần có hạng phòng cùng phạm vi.');
    text(v.name, 160);
    if (v.currency !== 'VND' || !['PERCENT_BPS', 'FIXED_STAY'].includes(v.kind) || !['DRAFT', 'ACTIVE', 'ARCHIVED'].includes(v.status))
        hotelError('HOTEL_PROMOTION_INVALID', 'Ưu đãi chưa hợp lệ.');
    int(v.value, 1, v.kind === 'PERCENT_BPS' ? 10000 : 1000000000000, 'Ưu đãi');
    if (v.maxDiscountVnd !== null)
        int(v.maxDiscountVnd, 1, 1000000000000, 'Giới hạn giảm');
    civilDate(v.stayFrom);
    civilDate(v.stayUntil);
    const timestamp = (s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/.test(s) && Number.isFinite(Date.parse(s));
    if (v.stayUntil <= v.stayFrom || !timestamp(v.bookingStartsAt) || !timestamp(v.bookingEndsAt) || Date.parse(v.bookingEndsAt) <= Date.parse(v.bookingStartsAt))
        hotelError('HOTEL_PROMOTION_DATES', 'Thời hạn ưu đãi không hợp lệ.');
    int(v.minNights, 1, 90, 'Đêm tối thiểu');
    int(v.version, 1, Number.MAX_SAFE_INTEGER, 'Phiên bản');
    return v;
}
