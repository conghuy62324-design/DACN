import assert from 'node:assert/strict';
import sharp from 'sharp';
import path from 'node:path';
import os from 'node:os';
import { mkdtemp, utimes, stat, rm } from 'node:fs/promises';
import { writeFileSync } from 'node:fs';
import { ImageStorageService, prepareSafeImage } from '../services/imageStorageService.js';
const results: {
    name: string;
    status: string;
    error?: string;
}[] = [];
async function test(name: string, fn: () => Promise<void>) { try {
    await fn();
    results.push({ name, status: 'PASS' });
}
catch (e: any) {
    results.push({ name, status: 'FAIL', error: e.message });
} }
async function main() {
    const root = await mkdtemp(path.join(os.tmpdir(), 'hugotravel-media-test-')), store = new ImageStorageService(root), id = '2138b000-0000-4000-8000-000000000001';
    try {
        const png = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#173451' } }).png().toBuffer();
        await test('Decode and re-encode real PNG to WebP', async () => { const output = await prepareSafeImage(png), m = await sharp(output).metadata(); assert.equal(m.format, 'webp'); assert.equal(m.width, 64); assert.equal(m.height, 48); });
        await test('Reject executable/SVG/non-image signature before decode', async () => { await assert.rejects(() => prepareSafeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>unsafe</script></svg>')), (e: any) => e.code === 'MEDIA_SIGNATURE'); });
        await test('Reject forged JPEG signature with invalid image payload', async () => { await assert.rejects(() => prepareSafeImage(Buffer.concat([Buffer.from([255, 216]), Buffer.alloc(40)])), (e: any) => e.code === 'MEDIA_DECODE'); });
        await test('Reject tiny and oversized dimensions', async () => { for (const [width, height] of [[2, 2], [8001, 16]]) {
            const input = await sharp({ create: { width, height, channels: 3, background: '#123456' } }).png().toBuffer();
            await assert.rejects(() => prepareSafeImage(input), (e: any) => e.code === 'MEDIA_DIMENSIONS');
        } });
        await test('Re-encoding strips EXIF and author metadata', async () => { const input = await sharp(png).withMetadata({ exif: { IFD0: { Artist: 'SYNTHETIC metadata fixture' } } }).jpeg().toBuffer(); assert((await sharp(input).metadata()).exif); const output = await prepareSafeImage(input); assert.equal((await sharp(output).metadata()).exif, undefined); });
        await test('Reject path traversal and unsafe storage namespace', async () => { assert.throws(() => store.resolve('hotels/../../secrets.webp')); assert.throws(() => store.resolve('https://outside.invalid/image.webp')); });
        await test('Persistent object is exclusive; original survives duplicate write', async () => { const key = `hotels/${id}/${id}.webp`; await store.put(key, await prepareSafeImage(png)); await assert.rejects(() => store.put(key, png), (e: any) => e.code === 'EEXIST'); assert((await stat(store.resolve(key))).size > 0); });
        await test('Orphan cleanup preserves referenced and young media', async () => { const a = `hotels/${id}/${id}.webp`, b = `hotels/${id}/2138b000-0000-4000-8000-000000000002.webp`, c = `hotels/${id}/2138b000-0000-4000-8000-000000000003.webp`; await store.put(b, png); await store.put(c, png); const old = new Date(Date.now() - 2 * 86400000); await utimes(store.resolve(a), old, old); await utimes(store.resolve(b), old, old); assert.deepEqual(await store.removeOrphans(new Set([a])), [b]); assert((await stat(store.resolve(a))).isFile()); assert((await stat(store.resolve(c))).isFile()); });
    }
    finally {
        const absolute = path.resolve(root);
        assert(absolute.startsWith(path.resolve(os.tmpdir()) + path.sep + 'hugotravel-media-test-'));
        await rm(absolute, { recursive: true, force: true });
    }
    const report = { at: new Date().toISOString(), scope: 'OFFLINE_SYNTHETIC_RASTER_AND_STORAGE', databaseConnections: 0, modelCalls: 0, results, passed: results.filter(r => r.status === 'PASS').length, total: results.length };
    if (process.env.HOTEL_MEDIA_TEST_REPORT)
        writeFileSync(process.env.HOTEL_MEDIA_TEST_REPORT, JSON.stringify(report, null, 2), { flag: 'wx' });
    console.log(JSON.stringify(report));
    if (report.passed !== report.total)
        process.exitCode = 1;
}
main().catch(() => { console.error('MEDIA_TEST_RUNNER_FAILED'); process.exitCode = 1; });
