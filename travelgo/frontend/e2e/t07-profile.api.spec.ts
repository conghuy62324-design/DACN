import { expect, test, type Page, type APIRequestContext } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(path.resolve(process.cwd(), '../backend/package.json'));
require('dotenv').config({ path: path.resolve(process.cwd(), '../backend/.env') });
const { sequelize } = require('./dist/config/database.js');
const { Booking, BookingStatusHistory, Tour, UserEvent } = require('./dist/models/index.js');
const { BookingFixtures, bookingFingerprint, bookingTestGuard } = require('./dist/tests/bookingFixtures.js');
const fixtures = new BookingFixtures();
const api = `http://127.0.0.1:${process.env.PLAYWRIGHT_BACKEND_PORT || '5001'}/api`;
let before: any;

test.beforeAll(async () => {
  await bookingTestGuard('T07 real browser fixtures');
  before = await bookingFingerprint();
  await fixtures.createResources();
});
test.afterAll(async () => {
  try {
    await fixtures.cleanup(); const after = await bookingFingerprint(); expect(after).toEqual(before);
    console.log(JSON.stringify({ t07Cleanup: 'PASS', fingerprint: 'UNCHANGED', before, after }));
  } finally { await sequelize.close(); }
});

async function account(request: APIRequestContext, fullName: string, phone?: string) {
  const input = { fullName, email: `t07.${randomUUID()}@example.test`, password: `${randomBytes(24).toString('base64url')}1a`, phone };
  const registration = await request.post(`${api}/auth/register`, { data: input });
  expect(registration.status()).toBe(201);
  const session = (await registration.json()).data; fixtures.users.push(session.user.id);
  expect((await request.put(`${api}/intelligence/consent`, { headers: { Authorization: `Bearer ${session.token}` }, data: { analyticsEnabled: false, personalizationEnabled: false } })).status()).toBe(200);
  return { ...input, ...session };
}
async function login(page: Page, person: any) {
  await page.goto('/profile'); await expect(page).toHaveURL(/\/login$/);
  await page.locator('[name=email]').fill(person.email); await page.locator('[name=password]').fill(person.password);
  await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
  await expect(page.getByRole('heading', { name: person.fullName, exact: true })).toBeVisible();
}
async function logout(page: Page, mobile: boolean) {
  await page.getByRole('button', { name: mobile ? 'Mở menu' : 'Menu tài khoản', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  expect(await page.evaluate(() => [localStorage.getItem('travelgo_token'), localStorage.getItem('travelgo_user')])).toEqual([null, null]);
}

for (const mobile of [false, true]) {
  test(`real auth/Profile reload/account switch ${mobile ? 'mobile' : 'desktop'}${mobile ? '' : ' + pending Booking isolation'}`, async ({ page, request }, testInfo) => {
    await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
    const a = await account(request, 'T07 Account A', '0901234567');
    const b = await account(request, 'T07 Account B');
    await login(page, a);
    await expect(page.getByTestId('profile-phone')).toHaveText(a.phone);
    await expect(page.getByText(a.email, { exact: true })).toBeVisible();
    await expect(page.getByTestId('profile-roles')).toHaveText('Khách hàng');
    await expect(page.locator('main form, main input, main button')).toHaveCount(0);
    await expect(page.getByText(/Hạng Vàng|450|Chuyến đi đã đặt|Cập nhật thông tin cá nhân thành công/)).toHaveCount(0);
    const me = page.waitForResponse(r => r.url().endsWith('/api/auth/me'));
    await page.reload(); const verified = await me; expect(verified.status()).toBe(200);
    expect((await verified.json()).data.id).toBe(a.user.id);
    await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible();
    for (const href of ['/bookings', '/favorites']) {
      await page.locator(`main a[href="${href}"]`).click(); await expect(page).toHaveURL(new RegExp(`${href}$`));
      await page.goBack(); await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible();
    }
    const sent: { key: string; booking: any }[] = [];
    if (!mobile) {
      await page.goto(`/tours/${fixtures.tourId}`); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay' }).click();
      await page.locator('[name=bookingDate]').fill('2028-03-07');
      await page.locator('[name=notes]').fill('Pending account A');
      await page.route('**/api/bookings', async route => {
        if (route.request().method() !== 'POST') return route.continue();
        const response = await route.fetch(); expect(response.status()).toBe(201);
        sent.push({ key: route.request().headers()['idempotency-key'], booking: (await response.json()).data });
        if (sent.length === 1) {
          expect(await Booking.count({ where: { id: sent[0].booking.id, userId: a.user.id } })).toBe(1);
          await route.abort('connectionfailed'); // Real commit; only transport response is lost.
        } else await route.fulfill({ response });
      });
      await page.getByTestId('booking-submit').click(); await expect(page.getByRole('alert')).toBeVisible();
      await page.getByRole('button', { name: 'Đóng đặt dịch vụ' }).click();
      await page.goto('/profile');
    }
    await logout(page, mobile); await expect(page).toHaveURL(/\/login$/);
    // Local logout does not revoke the previous server token.
    expect((await request.get(`${api}/auth/me`, { headers: { Authorization: `Bearer ${a.token}` } })).status()).toBe(200);
    await login(page, b);
    await expect(page.getByText(b.email, { exact: true })).toBeVisible();
    await expect(page.getByTestId('profile-phone')).toHaveText('Chưa cung cấp');
    await expect(page.getByRole('img', { name: 'Chưa có ảnh đại diện' })).toBeVisible();
    await expect(page.getByText(a.email, { exact: true })).toHaveCount(0);
    await page.reload(); await expect(page.getByRole('heading', { name: b.fullName, exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`profile-${mobile ? 'mobile' : 'desktop'}.png`), fullPage: true });
    if (!mobile) {
      await page.goto(`/tours/${fixtures.tourId}`); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay' }).click();
      await expect(page.getByLabel('Họ và tên từ tài khoản')).toHaveValue(b.fullName);
      await expect(page.locator('[name=notes]')).toHaveValue('');
      await expect(page.getByText('Đặt dịch vụ thành công!')).toHaveCount(0);
      await page.getByRole('button', { name: 'Đóng đặt dịch vụ' }).click(); await page.goto('/profile');
      await logout(page, false); await login(page, a);
      await page.goto(`/tours/${fixtures.tourId}`); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay' }).click();
      await expect(page.locator('[name=notes]')).toHaveValue('Pending account A');
      await expect(page.getByRole('alert')).toBeVisible(); await page.getByTestId('booking-submit').click();
      await expect(page.getByText('Đặt dịch vụ thành công!')).toBeVisible();
      expect(sent).toHaveLength(2); expect(sent[1].key).toBe(sent[0].key);
      expect(sent[1].booking.id).toBe(sent[0].booking.id); expect(sent[1].booking.bookingCode).toBe(sent[0].booking.bookingCode);
      expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1);
      expect(await Booking.count({ where: { userId: b.user.id } })).toBe(0);
      expect(await BookingStatusHistory.count({ where: { bookingId: sent[0].booking.id } })).toBe(1);
      expect((await Tour.findByPk(fixtures.tourId)).availableCapacity).toBe(18);
      expect(await UserEvent.count({ where: { userId: [a.user.id, b.user.id] } })).toBe(0);
      console.log(JSON.stringify({ t07AccountIsolation: 'PASS', pendingRetry: 'same key/ID/code', bookingCount: 1, historyCount: 1, events: 0 }));
      await page.getByRole('button', { name: 'Hoàn tất & Xem lịch sử' }).click();
      await expect(page.getByText(sent[0].booking.bookingCode, { exact: false })).toBeVisible();
    }
    // Real invalid-token response drives the same client 401 path (no mock).
    await page.evaluate(() => localStorage.setItem('travelgo_token', 't07-deliberately-invalid'));
    const rejected = page.waitForResponse(r => r.url().endsWith('/api/auth/me'));
    await page.goto('/profile'); expect((await rejected).status()).toBe(401);
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => [localStorage.getItem('travelgo_token'), localStorage.getItem('travelgo_user')])).toEqual([null, null]);
    await expect(page.getByRole('heading', { name: /T07 Account/ })).toHaveCount(0);
  });
}
