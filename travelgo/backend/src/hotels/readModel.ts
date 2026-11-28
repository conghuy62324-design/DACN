import { ACCOMMODATION_TYPES } from '../services/catalogPolicy.js';
import { destinationAddressIds, resolveLocation } from '../geography/vietnam.js';
import { addressFold, hotelError, int, objectOnly, streetKey, wardKey, text } from './validation.js';
export type HotelIdentitySearch = {
    locationId?: string;
    streetName?: string;
    wardOrCommune?: string;
    nameOrAddress?: string;
    accommodationType?: string;
    page?: number;
    limit?: number;
    sort?: 'name' | 'recent';
};
/** Implemented identity/address SQL only. Price/availability filters require the date-aware quote contract, not this query. */
export function hotelIdentitySearchQuery(input: HotelIdentitySearch) {
    objectOnly(input, ['locationId', 'streetName', 'wardOrCommune', 'nameOrAddress', 'accommodationType', 'page', 'limit', 'sort']);
    for (const field of ['locationId', 'streetName', 'wardOrCommune', 'nameOrAddress', 'accommodationType', 'sort'] as const) {
        if (input[field] !== undefined)
            text(input[field], field === 'sort' ? 10 : 160);
    }
    const page = int(input.page ?? 1, 1, 10000, 'Trang'), limit = int(input.limit ?? 20, 1, 50, 'Kích thước trang'), params: any[] = [];
    const bind = (v: any) => { params.push(v); return '$' + params.length; };
    const where = ["p.category='hotel'", "p.status='APPROVED'", "b.status='ACTIVE'", "h.approved_content_version=h.content_version", "COALESCE(p.catalog_metadata->>'source','')<>'DEMO'", "NOT (COALESCE(p.slug,'')||' '||p.name ~* '(^demo-|\\mDEMO\\M)')"];
    if (input.locationId) {
        const g = resolveLocation(input.locationId);
        if (!g || g.kind === 'all')
            hotelError('HOTEL_LOCATION_INVALID', 'Khu vực chưa hợp lệ.');
        if(g!.kind==='province')where.push(`a.province_code=${bind(g!.id)}`);
        else {
            const destinations=destinationAddressIds(g!);
            where.push(destinations.length>1?`a.tourism_destination_id=ANY(${bind(destinations)}::text[])`:`a.tourism_destination_id=${bind(destinations[0])}`);
        }
    }
    if (input.streetName && !input.locationId)
        hotelError('HOTEL_STREET_NEEDS_AREA', 'Chọn khu vực để tránh nhầm đường trùng tên.');
    if (input.streetName)
        where.push(`a.street_key=${bind(streetKey(text(input.streetName, 160)!))}`);
    if (input.wardOrCommune) {
        if (!input.locationId)
            hotelError('HOTEL_WARD_NEEDS_AREA', 'Chọn khu vực của phường/xã.');
        where.push(`a.ward_key=${bind(wardKey(text(input.wardOrCommune, 160)!))}`);
    }
    if (input.nameOrAddress) {
        const q = streetKey(addressFold(text(input.nameOrAddress, 120)!));
        if (q.length < 2)
            hotelError('HOTEL_QUERY_SHORT', 'Từ tìm kiếm quá ngắn.');
        const p = bind(q);
        where.push(`to_tsvector('simple',hotel_normalize_vi(concat_ws(' ',p.name,a.full_address,p.city,p.province))) @@ plainto_tsquery('simple',${p})`);
    }
    if (input.accommodationType) {
        if (!ACCOMMODATION_TYPES.includes(input.accommodationType as any))
            hotelError('HOTEL_TYPE_INVALID', 'Loại lưu trú chưa hợp lệ.');
        where.push(`p.catalog_metadata->>'accommodationType'=${bind(input.accommodationType)}`);
    }
    if (input.sort && !['name', 'recent'].includes(input.sort))
        hotelError('HOTEL_SORT_INVALID', 'Cách sắp xếp chưa hợp lệ.');
    const order = input.sort === 'recent' ? 'p.approved_at DESC NULLS LAST,p.id' : 'p.name,p.id', take = bind(limit), skip = bind((page - 1) * limit);
    return { sql: `SELECT p.id AS "placeId",p.name,p.slug,p.catalog_metadata AS "catalogMetadata",a.full_address AS "fullAddress",a.province_code AS "provinceCode",a.tourism_destination_id AS "tourismDestinationId",h.content_version AS "contentVersion",h.commercial_version AS "commercialVersion",count(*) OVER() AS "total" FROM hotel_profiles h JOIN places p ON p.id=h.place_id JOIN businesses b ON b.id=h.business_id LEFT JOIN hotel_addresses a ON a.place_id=h.place_id WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${take} OFFSET ${skip}`, params, page, limit, scope: 'PUBLIC_PUBLISHED_IDENTITY_ADDRESS_ONLY' as const };
}
