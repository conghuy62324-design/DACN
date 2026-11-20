import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { HotelReadStore, HotelReadSnapshot } from '../services/hotelReadService.js';
import { hotelError } from './validation.js';
import { isDemoListing } from '../services/catalogPolicy.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const query = async (sql: string, bind: any[] = [], transaction?: Transaction): Promise<any[]> => sequelize.query(sql, { bind, transaction, type: QueryTypes.SELECT });
export const camel = (r: any): Record<string, any> => Object.fromEntries(Object.entries(r).map(([k, v]) => [k.replace(/_([a-z])/g, (_, c) => c.toUpperCase()), v]));
const numeric = (r: any, fields: string[]) => { const v = camel(r); for (const f of fields)
    if (v[f] !== null && v[f] !== undefined)
        v[f] = Number(v[f]); return v; };
export async function assertHotelDatabase(client: any) {
    const r = (await client.query("SELECT current_database() db,current_user role,r.rolsuper,r.rolcreatedb,r.rolcreaterole,shobj_description(d.oid,'pg_database') sentinel FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()")).rows[0];
    if (process.env.NODE_ENV !== 'test' || !/(^|_)test(_|$)/.test(r.db) || r.db !== process.env.DB_NAME || r.role !== 'hotel_runtime' || r.rolsuper || r.rolcreatedb || r.rolcreaterole || r.sentinel !== 'hugotravel-isolated-test-database-v1')
        throw Error('HOTEL_ISOLATED_RUNTIME_REQUIRED');
    const counts = (await client.query("SELECT (SELECT count(*) FROM pg_tables WHERE schemaname='public')::int tables,(SELECT count(*) FROM schema_migrations)::int migrations")).rows[0];
    if (counts.tables !== 52 || counts.migrations !== 18)
        throw Error('HOTEL_SCHEMA_52_18_REQUIRED');
    const tracked = (await client.query('SELECT checksum FROM schema_migrations WHERE filename=$1', ['20261118_18_hotel_domain_foundation.sql'])).rows[0];
    if (tracked?.checksum !== createHash('sha256').update(readFileSync(path.resolve(__dirname, '../../../database/migrations/20261118_18_hotel_domain_foundation.sql'))).digest('hex'))
        throw Error('HOTEL_SCHEMA_SOURCE_DIGEST_MISMATCH');
}
export async function hotelSnapshots(placeIds: string[], t: Transaction, stay?: import('./contracts.js').StayRequest): Promise<HotelReadSnapshot[]> {
    if (!placeIds.length) return [];
    if (placeIds.length > 60) hotelError('HOTEL_SEARCH_SCOPE_LIMIT', 'Hãy chọn địa điểm hoặc thu hẹp tìm kiếm.', 422);
    const rows = await query('SELECT p.*,h.business_id,h.content_version,h.approved_content_version,h.commercial_version,h.check_in_time,h.check_out_time,h.services,h.policies,h.star_rating,h.star_verified_at,h.published_snapshot,b.status business_status,transaction_timestamp() as_of FROM hotel_profiles h JOIN places p ON p.id=h.place_id JOIN businesses b ON b.id=h.business_id WHERE p.id=ANY($1::uuid[])', [placeIds], t);
    const data: Record<string, any[]> = {};
    for (const [table, extra] of [['hotel_addresses',''],['hotel_room_types',''],['hotel_rate_plans',',valid_from::text,valid_until::text'],['hotel_rate_calendar',',stay_date::text'],['hotel_room_inventory',',stay_date::text'],['hotel_promotions',',stay_from::text,stay_until::text'],['hotel_media','']]) {
        const dated = stay && ['hotel_rate_calendar','hotel_room_inventory'].includes(table);
        data[table] = await query(`SELECT * ${extra} FROM ${table} WHERE place_id=ANY($1::uuid[])${dated ? ' AND stay_date >= $2::date AND stay_date < $3::date' : ''} LIMIT 6001`, dated ? [placeIds,stay!.checkIn,stay!.checkOut] : [placeIds], t);
        if (data[table].length > 6000) hotelError('HOTEL_SEARCH_COMPLEXITY_LIMIT', 'Dữ liệu vượt giới hạn tìm kiếm; hãy thu hẹp địa điểm.', 422);
    }
    return rows.map(row => {
    const placeId = row.id;
    const p = camel(row);
    const load = (table: string) => data[table].filter(r => r.place_id === placeId);
    const addresses = load('hotel_addresses'), rooms = load('hotel_room_types'), rates = load('hotel_rate_plans'), nightly = load('hotel_rate_calendar'), inventory = load('hotel_room_inventory'), promotions = load('hotel_promotions'), media = load('hotel_media');
    const roomKeys = ['id', 'placeId', 'name', 'description', 'areaM2', 'bedrooms', 'bathrooms', 'beds', 'extraBedAvailable', 'maxOccupancy', 'maxAdults', 'maxChildren', 'view', 'balcony', 'hasWindow', 'kitchen', 'privateBathroom', 'amenities', 'status', 'version'];
    const rateKeys = ['id', 'placeId', 'roomTypeId', 'name', 'currency', 'priceBasis', 'baseAmountVnd', 'validFrom', 'validUntil', 'minNights', 'maxNights', 'includedAdults', 'extraAdultVndPerNight', 'childPolicy', 'childBands', 'mealPlan', 'cancellation', 'tax', 'fees', 'mandatoryFeesKnown', 'status', 'version'];
    const pick = (r: any, keys: string[]) => Object.fromEntries(keys.map(k => [k, r[k]]));
    const a: any = addresses[0] ? camel(addresses[0]) : null;
    if (a) {
        delete a.location;
        delete a.searchDocument;
        delete a.placeId;
        delete a.version;
        delete a.wardKey;
        a.updatedAt = new Date(a.updatedAt).toISOString();
    }
    return { asOf: new Date(p.asOf).toISOString(), authority: { placeId, businessId: p.businessId, placeStatus: p.status, businessStatus: p.businessStatus, contentVersion: Number(p.contentVersion), approvedContentVersion: p.approvedContentVersion === null ? null : Number(p.approvedContentVersion), commercialVersion: Number(p.commercialVersion), isDemo: isDemoListing(p) || p.catalogMetadata?.testOnly === true }, identity: { id: p.id, name: p.name, slug: p.slug, summary: p.summary, description: p.description, accommodationType: p.catalogMetadata?.accommodationType || 'hotel', amenities: p.amenities || [] }, address: a, profile: { checkInTime: p.checkInTime, checkOutTime: p.checkOutTime, timeZone: 'Asia/Ho_Chi_Minh', timeSource: p.publishedSnapshot?.profile?.checkInTime===p.checkInTime&&p.publishedSnapshot?.profile?.checkOutTime===p.checkOutTime?'APPROVED_CONTENT_SNAPSHOT':'UNKNOWN', policies: p.policies, services: p.services, starRating: p.starRating, starVerified: !!p.starVerifiedAt }, rooms: rooms.map(r => pick(numeric(r, ['areaM2', 'version']), roomKeys)) as any, rates: rates.map(r => pick(numeric(r, ['baseAmountVnd', 'extraAdultVndPerNight', 'version']), rateKeys)) as any, nightly: nightly.map(r => pick(numeric(r, ['amountVnd', 'version']), ['ratePlanId', 'stayDate', 'amountVnd', 'closed', 'version'])) as any, inventory: inventory.map(r => pick(numeric(r, ['version']), ['roomTypeId', 'stayDate', 'sellableQuantity', 'allocatedQuantity', 'closed', 'version'])) as any, promotions: promotions.map(r => { const v = numeric(r, ['value', 'maxDiscountVnd', 'version']); v.bookingStartsAt = new Date(v.bookingStartsAt).toISOString(); v.bookingEndsAt = new Date(v.bookingEndsAt).toISOString(); return pick(v, ['id', 'placeId', 'roomTypeId', 'ratePlanId', 'name', 'currency', 'kind', 'value', 'maxDiscountVnd', 'bookingStartsAt', 'bookingEndsAt', 'stayFrom', 'stayUntil', 'minNights', 'status', 'version']); }) as any, media: media.map(r => { const v = camel(r); return { id: v.id, placeId: v.placeId, roomTypeId: v.roomTypeId, url: '/api/hotel-media/' + v.id, status: v.status, rights: v.rights, position: v.position, altText: v.altText }; }) };
    });
}
export async function hotelSnapshot(placeId: string, t: Transaction): Promise<HotelReadSnapshot | null> { return (await hotelSnapshots([placeId], t))[0] || null; }
export class PostgresHotelStore implements HotelReadStore {
    snapshot(placeId: string) { return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ, readOnly: true }, async (t) => { await query('SET TRANSACTION READ ONLY', [], t); return hotelSnapshot(placeId, t); }); }
}
