import express, { Router } from 'express';
import { sequelize } from '../config/database.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';
import { query, PostgresHotelStore } from '../hotels/postgresStore.js';
import { HotelReadService } from '../services/hotelReadService.js';
import { hotelIdentitySearchQuery } from '../hotels/readModel.js';
import { normalizeStayRequest, objectOnly, uuid, hotelError, text } from '../hotels/validation.js';
import * as m from '../hotels/management.js';
import { addMedia, editMedia, mediaPath } from '../hotels/media.js';
import { unlink } from 'node:fs/promises';
import { HttpError } from '../utils/httpError.js';
import { parseHotelSearch, searchHotels } from '../hotels/commercialSearch.js';
const wrap = (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res)).then(data => { if (!res.headersSent)
    res.json({ success: true, data }); }).catch(e => { const code = e.parent?.code; if (['23503', '23505', '23514'].includes(code))
    return next(new HttpError(code === '23514' ? 400 : 409, 'Dữ liệu không hợp lệ hoặc đang được tham chiếu; hãy tải lại và kiểm tra phạm vi.', 'HOTEL_DATA_CONFLICT')); next(e); });
const enabled = (_req: any, res: any, next: any) => process.env.HOTEL_DOMAIN_ENABLED === 'true' ? next() : res.status(404).json({ success: false, code: 'HOTEL_DOMAIN_DISABLED', message: 'Module khách sạn chưa được bật.' });
const reader = () => new HotelReadService(new PostgresHotelStore(), true, process.env.NODE_ENV === 'test');
export const publicHotels = Router();
publicHotels.use(enabled);
publicHotels.get('/', wrap(async (req: any, res: any) => { res.set('Cache-Control', 'no-store'); return searchHotels(parseHotelSearch(req.query),process.env.NODE_ENV==='test'); }));
publicHotels.get('/:id', wrap(async (req: any, res: any) => { res.set('Cache-Control', 'no-store'); objectOnly(req.query,['checkIn','checkOut','rooms','promotionId','offers']);if(req.query.offers!==undefined&&req.query.offers!=='true')hotelError('HOTEL_OFFERS_QUERY','offers chỉ nhận true.');const {promotionId,offers,...raw}=req.query;const q=parseHotelSearch(raw);return reader().detail(uuid(req.params.id),q.checkIn?normalizeStayRequest({checkIn:q.checkIn,checkOut:q.checkOut,rooms:q.rooms||[{adults:2,childAges:[]}],...(promotionId?{promotionId:uuid(promotionId)}:{})}):undefined,offers==='true'); }));
export function hotelQuoteHandler(allowSynthetic: boolean) {
    return wrap(async (req: any, res: any) => {
        res.set('Cache-Control', 'no-store');
        objectOnly(req.body, ['ratePlanId', 'stay']);
        const result = await new HotelReadService(new PostgresHotelStore(), true, allowSynthetic)
            .detail(uuid(req.params.id), normalizeStayRequest(req.body.stay));
        const offer = result.rooms.flatMap(room => room.offers).find(rate => rate.ratePlanId === uuid(req.body.ratePlanId));
        if (!offer || !('quote' in offer)) {
            hotelError('HOTEL_QUOTE_UNAVAILABLE', 'Chưa có báo giá hợp lệ cho lựa chọn này.', 409);
        }
        return offer;
    });
}
publicHotels.post('/:id/quotes', hotelQuoteHandler(process.env.NODE_ENV === 'test'));
export const hotelMedia = Router();
hotelMedia.use(enabled);
hotelMedia.get('/:id', wrap(async (req: any, res: any) => { const rows = await query("SELECT m.storage_key FROM hotel_media m JOIN hotel_profiles h ON h.place_id=m.place_id JOIN places p ON p.id=h.place_id JOIN businesses b ON b.id=h.business_id WHERE m.id=$1 AND m.status='APPROVED' AND m.rights<>'UNVERIFIED' AND p.status='APPROVED' AND b.status='ACTIVE' AND h.approved_content_version=h.content_version"+(process.env.NODE_ENV==='test'?'':" AND COALESCE(p.catalog_metadata->>'source','')<>'DEMO' AND COALESCE(p.catalog_metadata->>'testOnly','false')<>'true' AND NOT(COALESCE(p.slug,'')||' '||p.name ~* '(^demo-|\\mDEMO\\M)')"), [uuid(req.params.id)]); if (!rows.length)
    hotelError('HOTEL_MEDIA_NOT_FOUND', 'Không tìm thấy ảnh công khai.', 404); res.set('Cache-Control', 'no-store'); await new Promise<void>((resolve, reject) => res.sendFile(mediaPath(rows[0].storage_key), (e: any) => e ? reject(e) : resolve())); }));
export function managementHotels(admin = false) {
    const r = Router();
    r.use(enabled, authenticate, requireRoles(admin ? 'SUPER_ADMIN' : 'PARTNER'));
    r.get('/', wrap((req: any) => m.listManaged(req.user.id, admin)));
    if (!admin)
        r.post('/', wrap((req: any) => m.createHotel(req.user.id, req.body)));
    r.get('/:id', wrap((req: any) => m.managed(req.user.id, uuid(req.params.id), admin)));
    r.get('/:id/media/:mediaId/file', wrap(async (req: any, res: any) => { if (!admin)
        await m.owned(req.user.id, uuid(req.params.id)); const rows = await query('SELECT storage_key FROM hotel_media WHERE id=$1 AND place_id=$2', [uuid(req.params.mediaId), req.params.id]); if (!rows.length)
        hotelError('HOTEL_SCOPE_NOT_FOUND', 'Ảnh không cùng khách sạn.', 404); res.set('Cache-Control', 'no-store'); await new Promise<void>((resolve, reject) => res.sendFile(mediaPath(rows[0].storage_key), (e: any) => e ? reject(e) : resolve())); }));
    const write = (op: (req: any, t: any) => Promise<any>) => wrap(async (req: any) => { const s = await m.mutation(req.user.id, uuid(req.params.id), req.headers['if-match'], t => op(req, t), admin); return { ...s, revision: s!.authority.contentVersion + s!.authority.commercialVersion }; });
    if (admin) {
        r.post('/:id/moderate', write((req, t) => m.moderate(req.user.id, req.params.id, req.body, t)));
        r.post('/:id/media/:mediaId/review', write(async (req, t) => { objectOnly(req.body, ['decision', 'reason']); text(req.body.reason, 1000); if (!['APPROVED', 'REJECTED'].includes(req.body.decision))
            hotelError('HOTEL_MEDIA_REVIEW', 'Quyết định không hợp lệ.'); const rows = await query('UPDATE hotel_media SET status=$3 WHERE id=$1 AND place_id=$2 RETURNING id', [uuid(req.params.mediaId), req.params.id, req.body.decision], t); if (!rows.length)
            hotelError('HOTEL_SCOPE_NOT_FOUND', 'Ảnh không cùng khách sạn.', 404); }));
        return r;
    }
    r.put('/:id/profile', write((req, t) => m.updateProfile(req.params.id, req.body, t)));
    r.put('/:id/address', write((req, t) => m.updateAddress(req.params.id, req.body, t)));
    r.post('/:id/submit', write(async (req, t) => { objectOnly(req.body, []); const status = (await query('SELECT status FROM places WHERE id=$1', [req.params.id], t))[0].status; if (!['DRAFT', 'REJECTED'].includes(status))
        hotelError('HOTEL_SUBMISSION_STATE', 'Trạng thái hiện tại không cho phép gửi duyệt.', 409); await query("UPDATE places SET status='PENDING' WHERE id=$1", [req.params.id], t); }));
    for (const kind of ['rooms', 'rates', 'promotions'] as const) {
        r.post('/:id/' + kind, write((req, t) => m.saveEntity(req.params.id, kind, req.body, undefined, t)));
        r.put('/:id/' + kind + '/:entityId', write((req, t) => m.saveEntity(req.params.id, kind, req.body, req.params.entityId, t)));
    }
    r.put('/:id/rooms/:entityId/inventory', write((req, t) => m.calendar(req.params.id, 'inventory', req.params.entityId, req.body, t)));
    r.put('/:id/rates/:entityId/calendar', write((req, t) => m.calendar(req.params.id, 'calendar', req.params.entityId, req.body, t)));
    r.post('/:id/media', express.raw({ type: 'application/octet-stream', limit: '10mb' }), wrap(async (req: any) => { let file: string | undefined; try {
        const s = await m.mutation(req.user.id, uuid(req.params.id), req.headers['if-match'], async (t) => { const added = await addMedia(req.params.id, req.query, req.body, t); file = added.file; }, false);
        return { ...s, revision: s!.authority.contentVersion + s!.authority.commercialVersion };
    }
    catch (e) {
        if (file)
            await unlink(file).catch(() => { });
        throw e;
    } }));
    r.put('/:id/media/:mediaId', write((req, t) => editMedia(req.params.id, req.params.mediaId, req.body, t)));
    return r;
}
