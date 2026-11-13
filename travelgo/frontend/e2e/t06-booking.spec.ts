import { expect, test } from '@playwright/test';
import { randomUUID, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const backendRequire = createRequire(path.resolve(process.cwd(), '../backend/package.json'));
backendRequire('dotenv').config({ path: path.resolve(process.cwd(), '../backend/.env') });
const { sequelize } = backendRequire('./dist/config/database.js');
const { Booking, BookingStatusHistory, Tour, UserEvent } = backendRequire('./dist/models/index.js');
const { BookingFixtures, bookingFingerprint, bookingTestGuard } = backendRequire('./dist/tests/bookingFixtures.js');
const fixtures = new BookingFixtures();
const api = `http://127.0.0.1:${process.env.PLAYWRIGHT_BACKEND_PORT || '5001'}/api`;
let before: any;
test.beforeAll(async () => {
  await bookingTestGuard('T06 Edge fixtures'); before = await bookingFingerprint(); await fixtures.createResources();
});
test.afterAll(async () => {
  try { await fixtures.cleanup(); const after = await bookingFingerprint(); expect(after).toEqual(before); console.log(JSON.stringify({ browserCleanup: 'PASS', fingerprint: 'UNCHANGED', before, after })); }
  finally { await sequelize.close(); }
});

test('real commit -> lost response -> same key/ID/code; reopen, reload, history and new payload', async ({ page, request }) => {
  const registration = await request.post(`${api}/auth/register`, { data: { email: `t06.browser.${randomUUID()}@example.test`, fullName: 'T06 Browser', password: randomBytes(24).toString('base64url') + '1a', phone: '0901234567' } });
  expect(registration.status()).toBe(201); const session = (await registration.json()).data; fixtures.users.push(session.user.id);
  expect((await request.put(`${api}/intelligence/consent`, { headers: { Authorization: `Bearer ${session.token}` }, data: { analyticsEnabled: false, personalizationEnabled: false } })).status()).toBe(200);
  await page.addInitScript(({ token, user }) => { localStorage.setItem('travelgo_token', token); localStorage.setItem('travelgo_user', JSON.stringify(user)); }, session);
  await page.goto(`/tours/${fixtures.tourId}`);
  const open = page.getByRole('button', { name: 'Đặt giữ chỗ ngay' });
  await open.click();
  const submit = page.getByTestId('booking-submit');
  await expect(page.getByLabel('Họ và tên từ tài khoản')).toHaveValue(session.user.fullName);
  await expect(page.getByLabel('Họ và tên từ tài khoản')).toHaveAttribute('readonly', '');
  await expect(page.getByLabel('Email từ tài khoản')).toHaveValue(session.user.email);
  await expect(page.getByLabel('Email từ tài khoản')).toHaveAttribute('readonly', '');
  await page.locator('[name=bookingDate]').fill('2028-02-29');
  await page.locator('[name=notes]').fill('Giữ nguyên sau lỗi mạng');
  // Catalog has changed since render; confirmation must use the real server price.
  await Tour.update({ priceVND: 123457 }, { where: { id: fixtures.tourId } });
  let firstBooking: any; const sent: { key: string; payload: any; booking: any }[] = [];
  let release!: () => void; const releaseResponse = new Promise<void>(r => { release = r; });
  let signalCommit!: () => void; const committed = new Promise<void>(r => { signalCommit = r; });
  let first = true;
  await page.route('**/api/bookings', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    // This calls the real API and waits for its committed response. No mock success.
    const response = await route.fetch(); expect(response.status()).toBe(201);
    const booking = (await response.json()).data;
    sent.push({ key: route.request().headers()['idempotency-key'], payload: route.request().postDataJSON(), booking });
    if (first) {
      first = false; firstBooking = booking;
      expect((await Booking.findByPk(booking.id))?.id).toBe(booking.id);
      expect(await BookingStatusHistory.count({ where: { bookingId: booking.id, newStatus: 'PENDING' } })).toBe(1);
      signalCommit(); await releaseResponse;
      await route.abort('connectionfailed'); // Response is lost AFTER the persisted booking.
    } else await route.fulfill({ response });
  });
  await submit.click(); await committed;
  await expect(submit).toBeDisabled(); await expect(page.locator('[name=notes]')).toBeDisabled();
  // A second submit event must be blocked even without relying on the button.
  await page.locator('form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
  await page.getByRole('button', { name: 'Đóng đặt dịch vụ' }).click(); await open.click();
  await expect(submit).toBeDisabled(); expect(sent).toHaveLength(1);
  release(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('[name=notes]')).toHaveValue('Giữ nguyên sau lỗi mạng');
  await expect(page.locator('[name=customerPhone]')).toHaveValue('0901234567');
  // Reopening after an error and reloading the page must preserve the unresolved intent.
  await page.getByRole('button', { name: 'Đóng đặt dịch vụ' }).click(); await open.click();
  await expect(page.locator('[name=notes]')).toHaveValue('Giữ nguyên sau lỗi mạng');
  await page.reload(); await open.click(); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('[name=notes]')).toHaveValue('Giữ nguyên sau lỗi mạng');
  await page.getByRole('button', { name: 'Đóng đặt dịch vụ' }).click();
  await page.goto('/tickets');
  await page.getByTestId(`ticket-${fixtures.ticketId}`).getByRole('button', { name: 'Đặt vé ngay' }).click();
  // A different caller resumes the unresolved tour rather than silently replacing it.
  await expect(page.getByRole('dialog')).toContainText('T06 Fixture Tour');
  await expect(page.locator('[name=notes]')).toHaveValue('Giữ nguyên sau lỗi mạng');
  // Reload removed Playwright routes? Page routes persist across reload; real retry is forwarded.
  const retried = page.waitForResponse(r => r.url().endsWith('/api/bookings') && r.request().method() === 'POST');
  await submit.click(); expect((await retried).status()).toBe(201);
  await expect(page.getByText('Đặt dịch vụ thành công!')).toBeVisible();
  expect(sent).toHaveLength(2); expect(sent[1].key).toBe(sent[0].key); expect(sent[1].payload).toEqual(sent[0].payload);
  expect(sent[1].booking.id).toBe(firstBooking.id); expect(sent[1].booking.bookingCode).toBe(firstBooking.bookingCode);
  await expect(page.getByText(firstBooking.bookingCode, { exact: true })).toBeVisible();
  expect(firstBooking.totalAmount).toBe(246914);
  await expect(page.getByText(/246[.,]914/)).toBeVisible();
  expect(await Booking.count({ where: { userId: session.user.id } })).toBe(1);
  expect((await Tour.findByPk(fixtures.tourId)).availableCapacity).toBe(18);
  expect(await BookingStatusHistory.count({ where: { bookingId: firstBooking.id } })).toBe(1);
  expect(await UserEvent.count({ where: { userId: session.user.id } })).toBe(0);
  await expect(page.getByText(/đã được gửi|Bảo hiểm|Miễn phí hoàn hủy/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Hoàn tất & Xem lịch sử' }).click(); await expect(page).toHaveURL(/\/bookings$/);
  await expect(page.getByText(firstBooking.bookingCode, { exact: false })).toBeVisible(); await page.reload();
  await expect(page.getByText(firstBooking.bookingCode, { exact: false })).toBeVisible();
  await page.goto(`/tours/${fixtures.tourId}`); await open.click();
  await expect(page.getByText('Đặt dịch vụ thành công!')).toHaveCount(0); await expect(page.locator('[name=notes]')).toHaveValue('');
  await page.locator('[name=bookingDate]').fill('2028-03-01'); await page.locator('[name=notes]').fill('Đơn mới');
  const next = page.waitForResponse(r => r.url().endsWith('/api/bookings') && r.request().method() === 'POST'); await submit.click(); expect((await next).status()).toBe(201);
  expect(sent).toHaveLength(3); expect(sent[2].key).not.toBe(sent[0].key); expect(sent[2].booking.id).not.toBe(firstBooking.id);
  expect(await Booking.count({ where: { userId: session.user.id } })).toBe(2); expect((await Tour.findByPk(fixtures.tourId)).availableCapacity).toBe(16);
  await page.getByRole('button', { name: 'Đóng đặt dịch vụ' }).click(); await open.click();
  await expect(page.getByText('Đặt dịch vụ thành công!')).toHaveCount(0);
  await expect(page.locator('[name=notes]')).toHaveValue('');
  console.log(JSON.stringify({ browserPersistence: 'PASS', firstId: firstBooking.id, replayId: sent[1].booking.id, firstCode: firstBooking.bookingCode, replayCode: sent[1].booking.bookingCode, sameRetryKey: sent[0].key === sent[1].key, newPayloadNewKey: sent[2].key !== sent[0].key }));
});

test('changing payload after uncertain result uses a different key; editing back retains original key', async ({ page, request }) => {
  const registration = await request.post(`${api}/auth/register`, { data: { email: `t06.edit.${randomUUID()}@example.test`, fullName: 'T06 Edit', password: randomBytes(24).toString('base64url') + '1a', phone: '0901234567' } });
  expect(registration.status()).toBe(201); const session = (await registration.json()).data; fixtures.users.push(session.user.id);
  expect((await request.put(`${api}/intelligence/consent`, { headers: { Authorization: `Bearer ${session.token}` }, data: { analyticsEnabled: false, personalizationEnabled: false } })).status()).toBe(200);
  await page.addInitScript(({ token, user }) => { localStorage.setItem('travelgo_token', token); localStorage.setItem('travelgo_user', JSON.stringify(user)); }, session);
  await page.goto(`/tours/${fixtures.tourId}`); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay' }).click();
  await page.locator('[name=bookingDate]').fill('2028-03-02'); await page.locator('[name=notes]').fill('A');
  const sent: any[] = [];
  await page.route('**/api/bookings', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch(); expect(response.status()).toBe(201);
    sent.push({ key: route.request().headers()['idempotency-key'], booking: (await response.json()).data });
    await route.abort('connectionfailed');
  });
  const submit = page.getByTestId('booking-submit');
  await submit.click(); await expect(page.getByRole('alert')).toBeVisible();
  await page.locator('[name=notes]').fill('B'); await submit.click(); await expect(page.getByRole('alert')).toBeVisible();
  await page.locator('[name=notes]').fill('A'); await submit.click(); await expect(page.getByRole('alert')).toBeVisible();
  expect(sent).toHaveLength(3); expect(sent[1].key).not.toBe(sent[0].key); expect(sent[2].key).toBe(sent[0].key);
  expect(sent[2].booking.id).toBe(sent[0].booking.id); expect(await Booking.count({ where: { userId: session.user.id } })).toBe(2);
  await page.getByRole('button', { name: /Bắt đầu đơn mới/ }).click(); await expect(page.locator('[name=notes]')).toHaveValue('');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
