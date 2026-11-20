import { ImageStorageService, prepareSafeImage } from '../services/imageStorageService.js';
import path from 'node:path';
import { mkdir, writeFile, unlink, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Transaction } from 'sequelize';
import { query } from './postgresStore.js';
import { hotelId } from './management.js';
import { hotelError, objectOnly, uuid, text, int } from './validation.js';
export function mediaRoot() { const dir = process.env.HOTEL_MEDIA_DIR; if (!dir || !path.isAbsolute(dir))
    hotelError('HOTEL_STORAGE_NOT_CONFIGURED', 'Chưa cấu hình kho ảnh persistent.', 503); return path.resolve(dir!); }
export function mediaPath(key: string) { return new ImageStorageService(mediaRoot()).resolve(key); }
export const prepareImage = prepareSafeImage;
export async function addMedia(placeId: string, input: any, bytes: Buffer, t: Transaction) { objectOnly(input, ['roomTypeId', 'rights', 'altText']); if (!['OWNED', 'PARTNER_CONFIRMED'].includes(input.rights))
    hotelError('HOTEL_MEDIA_RIGHTS', 'Cần khai báo quyền sử dụng ảnh.'); const altText = text(input.altText, 500)!, room = input.roomTypeId ? uuid(input.roomTypeId) : null; if (room && !(await query('SELECT id FROM hotel_room_types WHERE id=$1 AND place_id=$2', [room, placeId], t)).length)
    hotelError('HOTEL_SCOPE_NOT_FOUND', 'Ảnh phòng không cùng khách sạn.', 404); const count = (await query('SELECT count(*)::int n FROM hotel_media WHERE place_id=$1 AND status<>\'REJECTED\'', [placeId], t))[0].n; if (count >= 30)
    hotelError('HOTEL_MEDIA_COUNT', 'Mỗi khách sạn tối đa30ảnh đang hoạt động.'); const data = await prepareImage(bytes), id = hotelId(), key = `hotels/${placeId}/${id}.webp`, file = mediaPath(key); await new ImageStorageService(mediaRoot()).put(key, data); try {
    await query('INSERT INTO hotel_media(id,place_id,room_type_id,storage_key,mime_type,size_bytes,checksum_sha256,rights,rights_evidence,position,alt_text) VALUES($1,$2,$3,$4,\'image/webp\',$5,$6,$7,\'Partner declaration; pending admin moderation\',$8,$9)', [id, placeId, room, key, data.length, createHash('sha256').update(data).digest('hex'), input.rights, count, altText], t);
}
catch (e) {
    await unlink(file);
    throw e;
} return { file, id }; }
export async function editMedia(placeId: string, id: string, input: any, t: Transaction) { objectOnly(input, ['altText', 'position', 'archive']); const rows = await query('SELECT * FROM hotel_media WHERE id=$1 AND place_id=$2', [uuid(id), placeId], t); if (!rows.length)
    hotelError('HOTEL_SCOPE_NOT_FOUND', 'Ảnh không cùng khách sạn.', 404); if (input.archive !== undefined && typeof input.archive !== 'boolean')
    hotelError('HOTEL_BOOLEAN_INVALID', 'Trạng thái ảnh không hợp lệ.'); if (input.position !== undefined)
    int(input.position, 0, 29, 'Vị trí'); if (input.position === 0)
    await query('UPDATE hotel_media SET position=position+1 WHERE place_id=$1 AND room_type_id IS NOT DISTINCT FROM $2 AND id<>$3', [placeId, rows[0].room_type_id, id], t); await query('UPDATE hotel_media SET alt_text=$3,position=$4,status=$5 WHERE id=$1 AND place_id=$2', [id, placeId, input.altText === undefined ? rows[0].alt_text : text(input.altText, 500), input.position ?? rows[0].position, input.archive ? 'REJECTED' : rows[0].status], t); }
