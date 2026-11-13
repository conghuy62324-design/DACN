import { expect, test } from '@playwright/test';
import { randomUUID, randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const backendRequire = createRequire(path.resolve(process.cwd(), '../backend/package.json'));
backendRequire('dotenv').config({ path: path.resolve(process.cwd(), '../backend/.env') });
const { ENV } = backendRequire('./dist/config/env.js');
const { Client } = backendRequire('pg');
// This file owns its connection: another spec may close the app's cached Sequelize pool.
const db = new Client({ host: ENV.DB_HOST, port: ENV.DB_PORT, database: ENV.DB_NAME, user: ENV.DB_USER, password: ENV.DB_PASSWORD, ssl: false });
const { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } = backendRequire('./dist/utils/testDatabaseGuard.js');
const api = `http://127.0.0.1:${process.env.PLAYWRIGHT_BACKEND_PORT || '5001'}/api`;
let userId: string | undefined;
let connected = false;
const readRow = async (id: string) => (await db.query('SELECT status, progress_percent AS "progressPercent", planner_metadata AS "plannerMetadata", itinerary, estimated_cost_vnd AS "estimatedCostVND" FROM trip_sessions WHERE id=$1 AND user_id=$2', [id, userId])).rows[0];

test.beforeAll(async () => {
  assertTestDatabaseWriteOptIn('T04-B Edge fixture');
  expect(process.env.DB_NAME).toBe('travelgo_ai_m0_test');
  await db.connect(); connected = true; await assertDatabaseSentinel(db, 'T04-B Edge fixture');
});
test.afterAll(async () => {
  try {
    if (connected) {
      assertTestDatabaseWriteOptIn('T04-B Edge cleanup'); await assertDatabaseSentinel(db, 'T04-B Edge cleanup');
      if (userId) { await db.query('DELETE FROM trip_sessions WHERE user_id=$1', [userId]); await db.query('DELETE FROM users WHERE id=$1', [userId]); }
    }
  } finally { await db.end(); }
});

test('Start -> denied GPS -> manual activity check-in -> reopen -> end at actual progress', async ({ page, context, request, baseURL }) => {
  const registration = await request.post(`${api}/auth/register`, { data: { email: `lifecycle.browser.${randomUUID()}@example.test`, fullName: 'Lifecycle Browser', password: randomBytes(24).toString('base64url') + '1a' } });
  expect(registration.status()).toBe(201); const session = (await registration.json()).data; userId = session.user.id;
  const placeId = randomUUID();
  const activity = { id: 'place-first', placeId, title: 'Điểm lặp', description: 'Fixture', category: 'sightseeing', timeSlot: 'morning', durationMinutes: 30, latitude: 16, longitude: 108, estimatedCostVND: 100 };
  const snapshot = { title: 'T04-B Browser Trip', departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng', startDate: '2028-02-28', endDate: '2028-02-29', daysCount: 2, nightsCount: 1,
    adults: 2, children: 1, costBasis: 'GROUP_VND_V1', costAssumptions: ['Ước tính cả nhóm'], pacing: 'balanced', transportation: 'motorbike', preferences: [], totalBudgetUserVND: 1000, totalEstimatedCostVND: 425,
    days: [
      { dayNumber: 1, date: '2028-02-28', themeTitle: 'Ngày 1', centroid: { latitude: 16, longitude: 108 }, lodgingNights: 1, lodgingEstimatedCostVND: 200, dayEstimatedCostVND: 425,
        activities: [activity, { ...activity, id: 'place-second' }, { ...activity, id: 'custom', placeId: undefined, title: 'Bữa ăn tự tạo', category: 'food', estimatedCostVND: 25 }] },
      { dayNumber: 2, date: '2028-02-29', themeTitle: 'Ngày 2', centroid: { latitude: 16, longitude: 108 }, lodgingNights: 0, lodgingEstimatedCostVND: 0, dayEstimatedCostVND: 0, activities: [] },
    ] };
  const headers = { Authorization: `Bearer ${session.token}` };
  const created = await request.post(`${api}/trips`, { headers, data: { itinerary: snapshot } }); expect(created.status()).toBe(201);
  const tripId = (await created.json()).data.id;
  await page.addInitScript(({ token, user }) => { localStorage.setItem('travelgo_token', token); localStorage.setItem('travelgo_user', JSON.stringify(user)); }, session);
  const cdp = await context.newCDPSession(page);
  const { targetInfo } = await cdp.send('Target.getTargetInfo');
  expect(targetInfo.browserContextId).toBeTruthy();
  await cdp.send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: new URL(baseURL!).origin, browserContextId: targetInfo.browserContextId });
  await page.goto(`/my-trips/${tripId}`);
  await expect(page.getByTestId('trip-status')).toContainText('Chưa bắt đầu');
  await expect(page.getByTestId('checkin-activity').first()).toBeDisabled();
  const start = page.waitForResponse((r) => r.url().endsWith(`/trips/${tripId}/start`) && r.request().method() === 'POST');
  await page.getByTestId('start-trip').click(); expect((await start).status()).toBe(200);
  await expect(page.getByTestId('trip-status')).toContainText('Đang diễn ra');
  expect(await page.evaluate(async () => (await navigator.permissions.query({ name: 'geolocation' })).state)).toBe('denied');
  await page.getByTestId('request-trip-location').click();
  await expect(page.getByText(/Bạn vẫn có thể check-in thủ công bình thường/)).toBeVisible();
  const custom = page.locator('[data-activity-id="custom"]');
  await custom.locator('input').fill('Ghi chú thủ công');
  const checkinResponse = page.waitForResponse((r) => r.url().endsWith(`/trips/${tripId}/checkin`) && r.request().method() === 'POST');
  await custom.getByTestId('checkin-activity').click();
  const checked = await checkinResponse; expect(checked.status()).toBe(200);
  expect(checked.request().postDataJSON()).toEqual({ activityId: 'custom', notes: 'Ghi chú thủ công' });
  await expect(page.getByTestId('trip-progress')).toContainText('1/3 hoạt động');
  await expect(page.getByTestId('trip-progress')).toContainText('33%');
  await expect(custom.getByTestId('checkin-activity')).toBeDisabled();
  await expect(page.locator('[data-activity-id="place-first"]').getByTestId('checkin-activity')).toBeEnabled();
  await expect(page.locator('[data-activity-id="place-second"]').getByTestId('checkin-activity')).toBeEnabled();
  await page.reload();
  await expect(page.getByTestId('trip-status')).toContainText('Đang diễn ra');
  await expect(page.getByTestId('trip-progress')).toContainText('33%');
  await page.goto('/my-trips');
  const card = page.locator(`[data-testid="trip-card"][data-trip-id="${tripId}"]`);
  await expect(card).toContainText('1/3 hoạt động'); await card.click();
  await expect(page.getByTestId('trip-progress')).toContainText('33%');
  const reopened = (await (await request.get(`${api}/trips/${tripId}`, { headers })).json()).data;
  expect(reopened.checkins).toHaveLength(1); expect(reopened.checkins[0].hasAttachedLocation).toBe(false);
  expect(reopened.days).toEqual(snapshot.days.map((day) => JSON.parse(JSON.stringify(day))));
  expect(reopened.costBasis).toBe('GROUP_VND_V1'); expect(reopened.totalEstimatedCostVND).toBe(425);
  expect(reopened.transportation).toBe('motorbike'); expect(reopened.nightsCount).toBe(1); expect(reopened.selectedPlaceIds).toEqual([placeId]);
  const dbBeforeComplete = await readRow(tripId); expect(dbBeforeComplete.progressPercent).toBe(33);
  const complete = page.waitForResponse((r) => r.url().endsWith(`/trips/${tripId}/complete`));
  await page.getByTestId('complete-trip').click(); expect((await complete).status()).toBe(200);
  await page.reload();
  await expect(page.getByTestId('trip-status')).toContainText('Đã kết thúc');
  await expect(page.getByTestId('trip-progress')).toContainText('33%');
  const finalRow = await readRow(tripId); expect(finalRow.status).toBe('completed'); expect(finalRow.progressPercent).toBe(33);
  expect(finalRow.plannerMetadata).toEqual(dbBeforeComplete.plannerMetadata); expect(finalRow.itinerary).toEqual(dbBeforeComplete.itinerary);
  expect(finalRow.estimatedCostVND).toBe(dbBeforeComplete.estimatedCostVND);
});
