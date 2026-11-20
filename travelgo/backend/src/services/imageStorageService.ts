import sharp from 'sharp';
import path from 'node:path';
import { mkdir, writeFile, unlink, readdir, stat } from 'node:fs/promises';
import { HttpError } from '../utils/httpError.js';
const fail = (code: string, message: string): never => { throw new HttpError(400, message, code); };
/** Shared raster validation/storage, independent of Hotel/Restaurant/Place ownership and DB contracts. */
export class ImageStorageService {
    constructor(readonly root: string) { if (!path.isAbsolute(root))
        throw new HttpError(503, 'Chưa cấu hình kho ảnh persistent.', 'MEDIA_STORAGE_NOT_CONFIGURED'); }
    resolve(key: string) { if (!/^[a-z]+\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.webp$/.test(key))
        fail('MEDIA_STORAGE_KEY', 'Đường dẫn ảnh không hợp lệ.'); const result = path.resolve(this.root, key); if (!result.startsWith(path.resolve(this.root) + path.sep))
        fail('MEDIA_STORAGE_KEY', 'Đường dẫn ảnh không hợp lệ.'); return result; }
    async put(key: string, data: Buffer) { const file = this.resolve(key); await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, data, { flag: 'wx', mode: 0o600 }); return file; }
    async remove(key: string) { await unlink(this.resolve(key)); }
    /** Explicit maintenance call only; no cron/worker. Preserve referenced/young files and never follow symlinks. */
    async removeOrphans(referenced: Set<string>, asOf = Date.now(), graceMs = 86400000, maxFiles = 250) {
        if (graceMs < 86400000 || maxFiles < 1 || maxFiles > 250)
            fail('MEDIA_CLEANUP_BOUND', 'Giới hạn cleanup không hợp lệ.');
        const removed: string[] = [];
        let visited = 0;
        let groups;
        try {
            groups = await readdir(this.root, { withFileTypes: true });
        }
        catch (e: any) {
            if (e.code === 'ENOENT')
                return removed;
            throw e;
        }
        for (const group of groups) {
            if (!group.isDirectory() || !/^[a-z]+$/.test(group.name))
                continue;
            for (const owner of await readdir(path.join(this.root, group.name), { withFileTypes: true })) {
                if (!owner.isDirectory() || !/^[a-f0-9-]{36}$/.test(owner.name))
                    continue;
                for (const entry of await readdir(path.join(this.root, group.name, owner.name), { withFileTypes: true })) {
                    if (++visited > maxFiles)
                        return removed;
                    if (!entry.isFile() || !/^[a-f0-9-]{36}\.webp$/.test(entry.name))
                        continue;
                    const key = [group.name, owner.name, entry.name].join('/');
                    if (referenced.has(key))
                        continue;
                    const info = await stat(this.resolve(key));
                    if (asOf - info.mtimeMs >= graceMs) {
                        await this.remove(key);
                        removed.push(key);
                    }
                }
            }
        }
        return removed;
    }
}
export async function prepareSafeImage(buffer: Buffer) { if (!Buffer.isBuffer(buffer) || buffer.length < 12 || buffer.length > 10485760)
    fail('MEDIA_SIZE', 'Ảnh tối đa10MiB.'); const b = buffer.subarray(0, 12); if (!(b[0] === 255 && b[1] === 216 || b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8).toString() === 'WEBP'))
    fail('MEDIA_SIGNATURE', 'Chỉ nhận JPEG,PNG,WebP có file signature đúng.'); try {
    const decoder = sharp(buffer, { limitInputPixels: 25000000, failOn: 'warning' }), m = await decoder.metadata();
    if (!m.width || !m.height || m.width < 16 || m.height < 16 || m.width > 8000 || m.height > 8000 || (m.pages || 1) !== 1)
        fail('MEDIA_DIMENSIONS', 'Ảnh tĩnh từ16 đến8000px và tối đa25MP.');
    return await decoder.rotate().webp({ quality: 85 }).toBuffer();
}
catch (e: any) {
    if (e instanceof HttpError)
        throw e;
    fail('MEDIA_DECODE', 'Không giải mã được ảnh an toàn.');
} }
