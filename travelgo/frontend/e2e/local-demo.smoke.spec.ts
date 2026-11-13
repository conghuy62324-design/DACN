import { expect, test } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const backendRequire = createRequire(path.resolve(process.cwd(), '../backend/package.json'));
const dotenv = backendRequire('dotenv');
const { Client } = backendRequire('pg');
const appEnv = dotenv.parse(readFileSync(path.resolve(process.cwd(), '../backend/.env')));
const api = 'http://localhost:5000/api';
const outputDir = path.resolve(process.cwd(), '../.local-demo-backups');
const recordFile = path.join(outputDir, 'latest-demo-smoke.json');
const credentialFile = path.join(outputDir, 'latest-demo-account.json');
const restaurantId = '75ccce40-608b-44ce-a773-6a206ea88e9c';
const hotelId = '274e60f5-cbe2-43b7-8d5c-0114d38ad9a3';
const existingBookingId = '6c9f4bd3-af04-46b0-a1e0-9b7f06dcd275';
const results: Record<string, unknown> = { database: 'travelgo_dev', cases: {} };
let currentCase = 'preflight';
const mark = (name: string, detail: Record<string, unknown> = {}) => {
  (results.cases as Record<string, unknown>)[name] = { status: 'PASS', ...detail };
  writeFileSync(recordFile, JSON.stringify(results, null, 2));
};
async function dbRead<T = any>(sql: string, params: unknown[] = []): Promise<T[]> {
  const client = new Client({ host: appEnv.DB_HOST, port: Number(appEnv.DB_PORT), database: appEnv.DB_NAME, user: appEnv.DB_USER, password: appEnv.DB_PASSWORD, ssl: false, application_name: 'hugo_local_demo_smoke_read' });
  await client.connect();
  try { return (await client.query(sql, params)).rows; } finally { await client.end(); }
}

test('local application: login, Explore, Planner/Trip lifecycle, Booking and mobile home', async ({ page, request }, testInfo) => {
  try {
    expect(appEnv.DB_NAME).toBe('travelgo_dev');
    expect(['localhost', '127.0.0.1', '::1']).toContain(appEnv.DB_HOST);
    expect(process.env.DB_NAME).toBeUndefined();
    expect(process.env.TEST_DATABASE_NAME).toBeUndefined();
    expect(process.env.ALLOW_TEST_DB_WRITES).toBeUndefined();
    expect((await dbRead<{ db: string }>('SELECT current_database() AS db'))[0].db).toBe('travelgo_dev');
    expect((await dbRead('SELECT filename FROM schema_migrations')).length).toBe(12);
    const oldBooking = (await dbRead('SELECT to_jsonb(b)::text AS row FROM bookings b WHERE id=$1', [existingBookingId]))[0]?.row;
    expect(oldBooking).toBeTruthy();
    mark('preflight', { existingBookingId });

    currentCase = 'login_profile_reload';
    const account = { fullName: 'HuGo Local Demo', email: `hugo.local.demo.${randomUUID()}@example.test`, password: `${randomBytes(24).toString('base64url')}Aa1`, phone: '0901234567' };
    const created = await request.post(`${api}/auth/register`, { data: account });
    expect(created.status()).toBe(201);
    const session = (await created.json()).data;
    results.userId = session.user.id;
    results.email = account.email;
    // Only the local, Git-ignored credential file contains the generated password.
    writeFileSync(credentialFile, JSON.stringify({ userId: session.user.id, email: account.email, password: account.password }, null, 2));
    const consent = await request.put(`${api}/intelligence/consent`, { headers: { Authorization: `Bearer ${session.token}` }, data: { analyticsEnabled: false, personalizationEnabled: false } });
    expect(consent.status()).toBe(200);
    await page.goto('/login');
    await page.locator('[name=email]').fill(account.email);
    await page.locator('[name=password]').fill(account.password);
    await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
    await page.getByRole('button', { name: 'Menu tài khoản' }).click();
    await page.getByRole('link', { name: 'Hồ sơ cá nhân' }).click();
    await expect(page.getByRole('heading', { name: account.fullName, exact: true })).toBeVisible();
    await expect(page.getByText(account.email, { exact: true })).toBeVisible();
    await expect(page.getByTestId('profile-phone')).toHaveText(account.phone);
    const me = page.waitForResponse(r => r.url().endsWith('/api/auth/me'));
    await page.reload(); expect((await me).status()).toBe(200);
    await expect(page.getByRole('heading', { name: account.fullName, exact: true })).toBeVisible();
    mark(currentCase, { userId: session.user.id });

    currentCase = 'explore_place_planner_generate';
    await page.goto('/explore');
    const card = page.getByTestId(`recommendation-card-${restaurantId}`);
    await expect(card).toBeVisible();
    await card.click();
    await card.getByRole('link', { name: /Chi tiết/ }).click();
    await expect(page).toHaveURL(new RegExp(`/places/${restaurantId}$`));
    await page.getByTestId('add-place-to-itinerary').click();
    await expect(page).toHaveURL(new RegExp(`mandatoryPlaceId=${restaurantId}`));
    await expect(page.getByTestId('mandatory-place-panel')).toContainText('HuGo Seafood');
    await page.locator('[name=startDate]').fill('2026-11-05');
    await page.locator('[name=endDate]').fill('2026-11-07');
    await page.getByTestId('planner-transport-motorbike').click();
    const generation = page.waitForResponse(r => r.url().endsWith('/api/tours/plan') && r.request().method() === 'POST');
    await page.locator('form button[type=submit]').click();
    const generatedResponse = await generation; expect(generatedResponse.status()).toBe(200);
    const generated = (await generatedResponse.json()).data;
    expect(generated.daysCount).toBe(3); expect(generated.nightsCount).toBe(2);
    expect(generated.transportation).toBe('motorbike'); expect(generated.pacing).toBe('balanced');
    expect(generated.selectedPlaceIds).toContain(restaurantId);
    mark(currentCase, { days: generated.daysCount, nights: generated.nightsCount, mode: generated.transportation, totalEstimatedCostVND: generated.totalEstimatedCostVND });

    currentCase = 'save_refresh_reopen_trip';
    const saving = page.waitForResponse(r => r.url().endsWith('/api/trips') && r.request().method() === 'POST');
    await page.getByRole('button', { name: /Lưu hành trình này/ }).first().click();
    const savedResponse = await saving; expect(savedResponse.status()).toBe(201);
    const tripId = (await savedResponse.json()).data.id;
    results.tripId = tripId; writeFileSync(recordFile, JSON.stringify(results, null, 2));
    await expect(page).toHaveURL(new RegExp(`/my-trips/${tripId}$`));
    await expect(page.getByTestId('trip-cost-summary')).toContainText('VND cho cả nhóm');
    await expect(page.getByTestId('trip-cost-summary')).toContainText('Xe máy');
    await page.reload(); await expect(page.getByTestId('trip-cost-summary')).toContainText('Xe máy');
    await page.goto('/my-trips');
    await page.locator(`[data-testid="trip-card"][data-trip-id="${tripId}"]`).click();
    const loaded = await request.get(`${api}/trips/${tripId}`, { headers: { Authorization: `Bearer ${session.token}` } });
    expect(loaded.status()).toBe(200);
    const trip = (await loaded.json()).data;
    expect(trip.daysCount).toBe(3); expect(trip.nightsCount).toBe(2);
    expect(trip.costBasis).toBe('GROUP_VND_V1'); expect(trip.transportation).toBe('motorbike');
    expect(trip.pacing).toBe('balanced'); expect(trip.totalEstimatedCostVND).toBe(generated.totalEstimatedCostVND);
    expect(trip.days).toEqual(generated.days);
    const row = (await dbRead('SELECT user_id,status,progress_percent,estimated_cost_vnd,planner_metadata FROM trip_sessions WHERE id=$1', [tripId]))[0];
    expect(row.user_id).toBe(session.user.id); expect(row.status).toBe('upcoming');
    expect(Number(row.estimated_cost_vnd)).toBe(generated.totalEstimatedCostVND);
    expect(row.planner_metadata.costBasis).toBe('GROUP_VND_V1');
    mark(currentCase, { tripId, days: trip.daysCount, nights: trip.nightsCount, totalEstimatedCostVND: trip.totalEstimatedCostVND, mode: trip.transportation });

    currentCase = 'start_manual_checkin_complete';
    expect(trip.progress.eligibleActivityIds.length).toBeGreaterThan(0);
    const first = trip.progress.eligibleActivityIds[0];
    await page.getByTestId('start-trip').click();
    await expect(page.getByTestId('trip-status')).toContainText('Đang diễn ra');
    const activity = page.locator(`[data-activity-id="${first}"]`);
    await expect(activity.getByTestId('checkin-activity')).toBeEnabled();
    await activity.getByTestId('checkin-activity').click();
    const progress = Math.round(100 / trip.progress.eligibleActivityIds.length);
    await expect(page.getByTestId('trip-progress')).toContainText(`${progress}%`);
    const afterCheckin = (await dbRead('SELECT status,progress_percent,checkins FROM trip_sessions WHERE id=$1', [tripId]))[0];
    expect(afterCheckin.status).toBe('active'); expect(afterCheckin.progress_percent).toBe(progress);
    expect(afterCheckin.checkins).toHaveLength(1);
    expect(afterCheckin.checkins[0].latitude).toBeUndefined();
    await page.getByTestId('complete-trip').click();
    await page.reload();
    await expect(page.getByTestId('trip-status')).toContainText('Đã kết thúc');
    await expect(page.getByTestId('trip-progress')).toContainText(`${progress}%`);
    const completed = (await dbRead('SELECT status,progress_percent,estimated_cost_vnd,planner_metadata FROM trip_sessions WHERE id=$1', [tripId]))[0];
    expect(completed.status).toBe('completed'); expect(completed.progress_percent).toBe(progress);
    expect(Number(completed.estimated_cost_vnd)).toBe(generated.totalEstimatedCostVND);
    expect(completed.planner_metadata).toEqual(row.planner_metadata);
    mark(currentCase, { tripId, checked: 1, eligible: trip.progress.eligibleActivityIds.length, progressPercent: progress, tripStatus: 'completed' });

    currentCase = 'new_booking_history';
    await page.goto(`/places/${hotelId}`);
    await page.getByRole('button', { name: 'Đặt dịch vụ ngay' }).click();
    await expect(page.getByRole('dialog', { name: 'Đặt dịch vụ' })).toBeVisible();
    await page.locator('[name=bookingDate]').fill('2026-11-08');
    const bookingResponse = page.waitForResponse(r => r.url().endsWith('/api/bookings') && r.request().method() === 'POST');
    await page.getByTestId('booking-submit').click();
    const booked = await bookingResponse; expect(booked.status()).toBe(201);
    const booking = (await booked.json()).data;
    results.bookingId = booking.id; results.bookingCode = booking.bookingCode;
    writeFileSync(recordFile, JSON.stringify(results, null, 2));
    await expect(page.getByText('Đặt dịch vụ thành công!')).toBeVisible();
    await expect(page.getByText(booking.bookingCode, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Hoàn tất & Xem lịch sử' }).click();
    await expect(page).toHaveURL(/\/bookings$/);
    await expect(page.getByText(booking.bookingCode, { exact: false })).toBeVisible();
    const dbBooking = (await dbRead('SELECT user_id,service_type,service_id,booking_status,payment_status,quantity,total_amount,request_fingerprint FROM bookings WHERE id=$1', [booking.id]))[0];
    expect(dbBooking.user_id).toBe(session.user.id); expect(dbBooking.service_type).toBe('hotel'); expect(dbBooking.service_id).toBe(hotelId);
    expect(dbBooking.booking_status).toBe('PENDING'); expect(dbBooking.payment_status).toBe('unpaid');
    expect(dbBooking.request_fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect((await dbRead('SELECT count(*)::int AS count FROM booking_status_history WHERE booking_id=$1', [booking.id]))[0].count).toBe(1);
    expect((await dbRead('SELECT to_jsonb(b)::text AS row FROM bookings b WHERE id=$1', [existingBookingId]))[0].row).toBe(oldBooking);
    mark(currentCase, { bookingId: booking.id, code: booking.bookingCode, serviceType: dbBooking.service_type, quantity: dbBooking.quantity, totalAmount: Number(dbBooking.total_amount), bookingStatus: dbBooking.booking_status, paymentStatus: dbBooking.payment_status, inventoryDelta: 0, existingBookingUnchanged: true });

    currentCase = 'mobile_home';
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Mở menu' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Mở menu' }).click();
    await expect(page.locator('header a[href="/profile"]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('local-demo-mobile-home.png'), fullPage: true });
    mark(currentCase, { width: 390, height: 844, overflowX: false });
    console.log(JSON.stringify({ localDemoSmoke: 'PASS', results }));
  } catch (error) {
    (results.cases as Record<string, unknown>)[currentCase] = { status: 'FAIL', reason: error instanceof Error ? error.message.slice(0, 300) : String(error) };
    writeFileSync(recordFile, JSON.stringify(results, null, 2));
    throw error;
  }
});
