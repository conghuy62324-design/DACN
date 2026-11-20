import { resolveLocation } from '../geography/vietnam.js';
import { randomUUID } from 'node:crypto';
import { Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { BusinessAccessService } from '../services/businessAccessService.js';
import { hotelSnapshot, query, camel } from './postgresStore.js';
import { hotelError, objectOnly, text, uuid, int, normalizeAddress, validateRoom, validateRate, validatePromotion, civilDate } from './validation.js';
import { ACCOMMODATION_TYPES } from '../services/catalogPolicy.js';
export const hotelId = () => { const factory = (globalThis as any)[Symbol.for('hotel.test.idFactory')]; return factory && process.env.NODE_ENV === 'test' ? factory() : randomUUID(); };
const profileKeys = ['name', 'summary', 'description', 'accommodationType', 'amenities', 'checkInTime', 'checkOutTime', 'services', 'policies'];
function profileInput(p: any) { objectOnly(p, profileKeys); for (const k of ['name', 'summary', 'description'])
    text(p[k], k === 'description' ? 10000 : 500); if (!ACCOMMODATION_TYPES.includes(p.accommodationType))
    hotelError('HOTEL_TYPE_INVALID', 'Chọn loại lưu trú hợp lệ.'); for (const k of ['amenities', 'services'])
    if (!Array.isArray(p[k]) || p[k].length > 30 || p[k].some((v: any) => typeof v !== 'string' || v.length > 120))
        hotelError('HOTEL_AMENITIES_INVALID', 'Danh sách tiện nghi không hợp lệ.'); for (const k of ['amenities', 'services'])
    p[k] = [...new Set(p[k].map((v: string) => v.trim()).filter(Boolean))]; for (const k of ['checkInTime', 'checkOutTime'])
    if (typeof p[k] !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p[k]))
        hotelError('HOTEL_TIME_INVALID', 'Giờ cần có dạng HH:mm.'); objectOnly(p.policies, ['children', 'pets', 'smoking', 'general']); for (const v of Object.values(p.policies))
    text(v, 4000); return p; }
export async function owned(userId: string, id: string, t?: Transaction) { uuid(id); const rows = await query('SELECT p.business_id FROM places p JOIN hotel_profiles h ON h.place_id=p.id WHERE p.id=$1', [id], t); if (!rows.length)
    hotelError('HOTEL_NOT_FOUND', 'Không tìm thấy khách sạn.', 404); await BusinessAccessService.assert(userId, rows[0].business_id, 'MANAGE_BUSINESS'); }
export async function managed(userId: string, id: string, admin = false) { if (!admin)
    await owned(userId, id); return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true }, async (t) => { await query('SET TRANSACTION READ ONLY', [], t); const s = await hotelSnapshot(id, t); if (!s)
    hotelError('HOTEL_NOT_FOUND', 'Không tìm thấy khách sạn.', 404); return { ...s, media: await query('SELECT id,room_type_id "roomTypeId",status,rights,position,alt_text "altText" FROM hotel_media WHERE place_id=$1 ORDER BY position,id', [id], t), publishedSnapshot: admin ? (await query('SELECT published_snapshot FROM hotel_profiles WHERE place_id=$1', [id], t))[0].published_snapshot : undefined, revision: s!.authority.contentVersion + s!.authority.commercialVersion, owner: admin ? { business: (await query('SELECT name,type,status FROM businesses WHERE id=$1', [s!.authority.businessId], t))[0], representatives: await query('SELECT u.full_name FROM business_members m JOIN users u ON u.id=m.user_id WHERE m.business_id=$1', [s!.authority.businessId], t) } : undefined, audit: admin ? await query("SELECT action,reason,created_at FROM audit_logs WHERE entity_id=$1 AND action LIKE 'HOTEL_%' ORDER BY created_at DESC LIMIT 30", [id], t) : [] }; }); }
export async function listManaged(userId: string, admin = false) { return query(`SELECT p.id,p.name,p.status,h.content_version::int "contentVersion",h.approved_content_version::int "approvedContentVersion",h.commercial_version::int "commercialVersion",b.name "businessName" FROM hotel_profiles h JOIN places p ON p.id=h.place_id JOIN businesses b ON b.id=h.business_id ${admin ? '' : 'JOIN business_members m ON m.business_id=h.business_id AND m.user_id=$1'} ORDER BY p.created_at DESC,p.id LIMIT 100`, admin ? [] : [userId]); }
export async function mutation(userId: string, id: string, expected: any, fn: (t: Transaction) => Promise<any>, admin = false) {
    if (!admin)
        await owned(userId, id);
    const version = typeof expected === 'string' && /^"?\d+"?$/.test(expected) ? Number(expected.replaceAll('"', '')) : NaN;
    if (!Number.isSafeInteger(version))
        hotelError('HOTEL_PRECONDITION_REQUIRED', 'Cần phiên bản hiện tại trước khi lưu.', 428);
    return sequelize.transaction(async (t) => { const rows = await query('SELECT content_version::int,commercial_version::int FROM hotel_profiles WHERE place_id=$1 FOR UPDATE', [id], t); if (!rows.length)
        hotelError('HOTEL_NOT_FOUND', 'Không tìm thấy khách sạn.', 404); if (rows[0].content_version + rows[0].commercial_version !== version)
        hotelError('HOTEL_VERSION_CONFLICT', 'Dữ liệu đã đổi. Hãy tải lại trước khi lưu.', 412); const result = await fn(t); if (!admin) {
        const after = (await query('SELECT content_version::int FROM hotel_profiles WHERE place_id=$1', [id], t))[0];
        if (after.content_version !== rows[0].content_version)
            await query("UPDATE places SET status='DRAFT' WHERE id=$1 AND status<>'SUSPENDED'", [id], t);
    } await query('INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,new_data) VALUES($1,$2,$3,$4,$5,$6::jsonb)', [randomUUID(), userId, 'HOTEL_UPDATE', 'Place', id, JSON.stringify({ operation: result?.operation || 'UPDATE' })], t); return hotelSnapshot(id, t); });
}
export async function createHotel(userId: string, input: any) { objectOnly(input, ['businessId', 'profile', 'address']); const businessId = uuid(input.businessId); await BusinessAccessService.assert(userId, businessId, 'MANAGE_BUSINESS'); const p = profileInput(input.profile), a = normalizeAddress(input.address); if (a.latitude === null)
    hotelError('HOTEL_LEGACY_COORDINATE_REQUIRED', 'Cần tọa độ do đối tác cung cấp trước khi lưu hồ sơ mới; hệ thống không tự điền vị trí.', 422); const id = hotelId(); return sequelize.transaction(async (t) => { await query('INSERT INTO places(id,business_id,name,slug,category,summary,description,city,province,address,latitude,longitude,status,amenities,catalog_metadata,hero_image) VALUES($1,$2,$3,$4,\'hotel\',$5,$6,$7,$8,$9,$10,$11,\'DRAFT\',$12::jsonb,$13::jsonb,\'\')', [id, businessId, p.name, 'hotel-' + id, p.summary, p.description, (a.tourismDestinationId ? resolveLocation(a.tourismDestinationId)?.catalogName : null) || a.provinceOrCity, a.provinceOrCity, a.fullAddress, a.latitude, a.longitude, JSON.stringify(p.amenities), JSON.stringify({ source: process.env.NODE_ENV === 'test' ? 'REFERENCE' : 'REAL_PARTNER', accommodationType: p.accommodationType, testOnly: process.env.NODE_ENV === 'test' })], t); await query('INSERT INTO hotel_profiles(place_id,business_id,check_in_time,check_out_time,services,policies) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb)', [id, businessId, p.checkInTime, p.checkOutTime, JSON.stringify(p.services), JSON.stringify(p.policies)], t); await writeAddress(id, a, t); return hotelSnapshot(id, t); }); }
async function writeAddress(id: string, a: any, t: Transaction) { const fields = ['houseNumber', 'streetName', 'wardOrCommune', 'administrativeArea', 'provinceCode', 'provinceOrCity', 'tourismDestinationId', 'fullAddress', 'normalizedAddress', 'latitude', 'longitude', 'coordinateStatus', 'source']; const cols = fields.map(k => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase())); await query(`INSERT INTO hotel_addresses(place_id,${cols}) VALUES($1,${fields.map((_, i) => '$' + (i + 2))}) ON CONFLICT(place_id) DO UPDATE SET ${cols.map(c => c + '=EXCLUDED.' + c)}`, [id, ...fields.map(k => a[k])], t); }
export async function updateProfile(id: string, p: any, t: Transaction) { profileInput(p); await query('UPDATE places SET name=$2,summary=$3,description=$4,amenities=$5::jsonb,catalog_metadata=jsonb_set(catalog_metadata,\'{accommodationType}\',$6::jsonb),status=CASE WHEN status=\'SUSPENDED\' THEN status ELSE \'DRAFT\' END WHERE id=$1', [id, p.name, p.summary, p.description, JSON.stringify(p.amenities), JSON.stringify(p.accommodationType)], t); await query('UPDATE hotel_profiles SET check_in_time=$2,check_out_time=$3,services=$4::jsonb,policies=$5::jsonb,content_version=content_version+1 WHERE place_id=$1', [id, p.checkInTime, p.checkOutTime, JSON.stringify(p.services), JSON.stringify(p.policies)], t); }
export const updateAddress = async (id: string, input: any, t: Transaction) => writeAddress(id, normalizeAddress(input), t);
export async function saveEntity(id: string, kind: 'rooms' | 'rates' | 'promotions', input: any, entityId: string | undefined, t: Transaction) {
    const table = { rooms: 'hotel_room_types', rates: 'hotel_rate_plans', promotions: 'hotel_promotions' }[kind];
    const existing = entityId ? (await query(`SELECT * FROM ${table} WHERE id=$1 AND place_id=$2`, [uuid(entityId), id], t))[0] : null;
    if (entityId && !existing)
        hotelError('HOTEL_SCOPE_NOT_FOUND', 'Dữ liệu không thuộc khách sạn.', 404);
    const serverId = entityId || hotelId();
    objectOnly(input, kind === 'rooms' ? ['name', 'description', 'areaM2', 'bedrooms', 'bathrooms', 'beds', 'extraBedAvailable', 'maxOccupancy', 'maxAdults', 'maxChildren', 'view', 'balcony', 'hasWindow', 'kitchen', 'privateBathroom', 'amenities', 'status'] : kind === 'rates' ? ['roomTypeId', 'name', 'currency', 'priceBasis', 'baseAmountVnd', 'validFrom', 'validUntil', 'minNights', 'maxNights', 'includedAdults', 'extraAdultVndPerNight', 'childPolicy', 'childBands', 'mealPlan', 'cancellation', 'tax', 'fees', 'mandatoryFeesKnown', 'status'] : ['roomTypeId', 'ratePlanId', 'name', 'currency', 'kind', 'value', 'maxDiscountVnd', 'bookingStartsAt', 'bookingEndsAt', 'stayFrom', 'stayUntil', 'minNights', 'status']);
    const v = { ...input, id: serverId, placeId: id, version: 1 };
    if (kind === 'rooms')
        validateRoom(v);
    if (kind === 'rates')
        validateRate(v);
    if (kind === 'promotions')
        validatePromotion(v);
    if (kind !== 'rooms' && v.roomTypeId) {
        if (!(await query('SELECT id FROM hotel_room_types WHERE id=$1 AND place_id=$2', [v.roomTypeId, id], t)).length)
            hotelError('HOTEL_SCOPE_NOT_FOUND', 'Hạng phòng không cùng khách sạn.', 404);
    }
    if (kind === 'promotions' && v.ratePlanId && !((await query('SELECT id FROM hotel_rate_plans WHERE id=$1 AND room_type_id=$2 AND place_id=$3', [v.ratePlanId, v.roomTypeId, id], t)).length))
        hotelError('HOTEL_SCOPE_NOT_FOUND', 'Gói giá không cùng phạm vi.', 404);
    const fields = Object.keys(input), cols = fields.map(k => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase())), jsonFields = ['beds', 'childBands', 'cancellation', 'tax', 'fees'];
    const bind = fields.map(k => jsonFields.includes(k) ? JSON.stringify(input[k]) : kind === 'rooms' && k === 'amenities' ? input[k] : input[k]);
    await query(`INSERT INTO ${table}(id,place_id,${cols}) VALUES($1,$2,${fields.map((k, i) => '$' + (i + 3) + (jsonFields.includes(k) ? '::jsonb' : ''))}) ${entityId ? 'ON CONFLICT(id) DO UPDATE SET ' + cols.map(c => c + '=EXCLUDED.' + c).join(',') : ''}`, [serverId, id, ...bind], t);
    return { operation: kind };
}
export async function calendar(id: string, kind: 'inventory' | 'calendar', entityId: string, input: any, t: Transaction) { objectOnly(input, ['days']); if (!Array.isArray(input.days) || !input.days.length || input.days.length > 90)
    hotelError('HOTEL_BATCH_LIMIT', 'Chọn từ1 đến90 ngày.'); const table = kind === 'inventory' ? 'hotel_room_inventory' : 'hotel_rate_calendar', key = kind === 'inventory' ? 'room_type_id' : 'rate_plan_id', parent = kind === 'inventory' ? 'hotel_room_types' : 'hotel_rate_plans'; const owner = (await query(`SELECT * FROM ${parent} WHERE id=$1 AND place_id=$2`, [uuid(entityId), id], t))[0]; if (!owner)
    hotelError('HOTEL_SCOPE_NOT_FOUND', 'Không tìm thấy dữ liệu cùng phạm vi.', 404); const dates = new Set(); for (const d of [...input.days].sort((a, b) => String(a.stayDate).localeCompare(String(b.stayDate)))) {
    objectOnly(d, kind === 'inventory' ? ['stayDate', 'sellableQuantity', 'closed', 'expectedVersion'] : ['stayDate', 'amountVnd', 'closed', 'expectedVersion']);
    civilDate(d.stayDate);
    if (dates.has(d.stayDate) || typeof d.closed !== 'boolean')
        hotelError('HOTEL_BATCH_INVALID', 'Ngày trùng hoặc trạng thái sai.');
    dates.add(d.stayDate);
    int(d.expectedVersion, 0, Number.MAX_SAFE_INTEGER, 'Phiên bản ngày');
    int(kind === 'inventory' ? d.sellableQuantity : d.amountVnd, 0, kind === 'inventory' ? 100000 : 1000000000000, 'Giá trị');
    const old = (await query(`SELECT * FROM ${table} WHERE ${key}=$1 AND stay_date=$2 FOR UPDATE`, [entityId, d.stayDate], t))[0];
    if (Number(old?.version || 0) !== d.expectedVersion)
        hotelError('HOTEL_VERSION_CONFLICT', 'Lịch đã đổi, hãy tải lại.', 412);
    if (kind === 'inventory' && old?.allocated_quantity > d.sellableQuantity)
        hotelError('HOTEL_INVENTORY_COMMITTED', 'Không thể giảm dưới số phòng đã phân bổ.', 409);
    if (kind === 'inventory')
        await query('INSERT INTO hotel_room_inventory(room_type_id,place_id,stay_date,sellable_quantity,closed) VALUES($1,$2,$3,$4,$5) ON CONFLICT(room_type_id,stay_date) DO UPDATE SET sellable_quantity=EXCLUDED.sellable_quantity,closed=EXCLUDED.closed', [entityId, id, d.stayDate, d.sellableQuantity, d.closed], t);
    else
        await query('INSERT INTO hotel_rate_calendar(rate_plan_id,room_type_id,place_id,stay_date,amount_vnd,closed) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(rate_plan_id,stay_date) DO UPDATE SET amount_vnd=EXCLUDED.amount_vnd,closed=EXCLUDED.closed', [entityId, owner.room_type_id, id, d.stayDate, d.amountVnd, d.closed], t);
} }
export async function moderate(userId: string, id: string, input: any, t: Transaction) {
    objectOnly(input, ['decision', 'reason']);
    text(input.reason, 1000);
    if (!['APPROVED', 'REJECTED', 'SUSPENDED'].includes(input.decision))
        hotelError('HOTEL_MODERATION_DECISION', 'Quyết định không hợp lệ.');
    const s = await hotelSnapshot(id, t);
    if (!s)
        hotelError('HOTEL_NOT_FOUND', 'Không tìm thấy khách sạn.', 404);
    if (input.decision === 'APPROVED') {
        if (!['PENDING', 'APPROVED', 'SUSPENDED'].includes(s!.authority.placeStatus))
            hotelError('HOTEL_REVIEW_SUBMISSION_REQUIRED', 'Cần gửi nội dung hiện tại để duyệt trước khi công bố.', 409);
        for (const room of s!.rooms.filter(r => r.status === 'ACTIVE'))
            validateRoom(room);
        for (const rate of s!.rates.filter(r => r.status === 'ACTIVE'))
            validateRate(rate);
        if (!s!.address || s!.address.latitude === null || !s!.rooms.some(r => r.status === 'ACTIVE') || !s!.media.some(m => m.status === 'APPROVED' && m.rights !== 'UNVERIFIED'))
            hotelError('HOTEL_PUBLICATION_INCOMPLETE', 'Cần địa chỉ, tọa độ cung cấp, hạng phòng và ảnh đã kiểm quyền.', 409);
        const a = s!.address;
        await query('UPDATE places SET address=$2,city=$3,province=$4,latitude=$5,longitude=$6,location=ST_SetSRID(ST_MakePoint($6,$5),4326),status=\'APPROVED\',approved_at=now() WHERE id=$1', [id, a.fullAddress, (a.tourismDestinationId ? resolveLocation(a.tourismDestinationId)?.catalogName : null) || a.provinceOrCity, a.provinceOrCity, a.latitude, a.longitude], t);
        await query('UPDATE hotel_profiles SET approved_content_version=content_version,published_snapshot=$2::jsonb WHERE place_id=$1', [id, JSON.stringify({ identity: s!.identity, address: s!.address, profile: s!.profile, rooms: s!.rooms, media: s!.media })], t);
    }
    else
        await query('UPDATE places SET status=$2 WHERE id=$1', [id, input.decision], t);
    await query('INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,reason,new_data) VALUES($1,$2,$3,\'Place\',$4,$5,$6::jsonb)', [randomUUID(), userId, 'HOTEL_' + input.decision, id, input.reason, JSON.stringify({ contentVersion: s!.authority.contentVersion })], t);
}
