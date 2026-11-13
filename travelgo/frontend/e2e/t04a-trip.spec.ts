import { expect, test } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';

const backendRequire = createRequire(path.resolve(process.cwd(), '../backend/package.json'));
backendRequire('dotenv').config({ path: path.resolve(process.cwd(), '../backend/.env') });
const { sequelize } = backendRequire('./dist/config/database.js');
const { TripSession, User } = backendRequire('./dist/models/index.js');
const { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } = backendRequire('./dist/utils/testDatabaseGuard.js');
const backendUrl = `http://127.0.0.1:${process.env.PLAYWRIGHT_BACKEND_PORT || '5001'}/api`;
let userId: string | undefined;

test.beforeAll(async () => {
  assertTestDatabaseWriteOptIn('T04-A browser fixture');
  if (process.env.DB_NAME !== 'travelgo_ai_m0_test') throw new Error('T04-A browser only uses travelgo_ai_m0_test');
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'T04-A browser fixture');
});
test.afterAll(async () => {
  try {
    assertTestDatabaseWriteOptIn('T04-A browser owned fixture cleanup');
    await assertDatabaseSentinel(sequelize, 'T04-A browser owned fixture cleanup');
    if (userId) { await TripSession.destroy({ where: { userId } }); await User.destroy({ where: { id: userId } }); }
  } finally { await sequelize.close(); }
});

test('real API/DB: Generate -> Save -> refresh/reopen keeps group metadata; legacy view stays unpriced', async ({ page, request }) => {
  const register = await request.post(`${backendUrl}/auth/register`, { data: {
    email: `browser.trip.${randomUUID()}@example.test`, fullName: 'Isolated Browser Trip',
    password: randomBytes(24).toString('base64url') + '1a',
  } });
  expect(register.status()).toBe(201);
  const session = (await register.json()).data;
  userId = session.user.id;
  await page.addInitScript(({ token, user }) => {
    localStorage.setItem('travelgo_token', token);
    localStorage.setItem('travelgo_user', JSON.stringify(user));
  }, session);

  await page.goto('/tour-planner');
  const decline = page.getByTestId('telemetry-decline');
  await expect(decline).toBeVisible();
  await decline.click();
  await expect(page.getByTestId('telemetry-consent')).toHaveCount(0);
  await page.locator('input[name="startDate"]').fill('2028-02-28');
  await page.locator('input[name="endDate"]').fill('2028-02-29');
  await page.getByTestId('planner-transport-motorbike').click();
  const generatedResponse = page.waitForResponse((response) => response.url().endsWith('/api/tours/plan') && response.request().method() === 'POST');
  await page.locator('form button[type="submit"]').click();
  const generatedResult = await generatedResponse;
  expect(generatedResult.status()).toBe(200);
  const generated = (await generatedResult.json()).data;
  const savedResponse = page.waitForResponse((response) => response.url().endsWith('/api/trips') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Lưu hành trình này/ }).first().click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(201);
  const tripId = (await saved.json()).data.id;
  await expect(page).toHaveURL(new RegExp(`/my-trips/${tripId}$`));
  await expect(page.getByTestId('trip-cost-summary')).toContainText('VND cho cả nhóm');
  await expect(page.getByTestId('trip-cost-summary')).toContainText('Xe máy');
  await page.reload();
  const headers = { Authorization: `Bearer ${session.token}` };
  const read = await request.get(`${backendUrl}/trips/${tripId}`, { headers });
  const reopened = (await read.json()).data;
  expect(reopened.costBasis).toBe('GROUP_VND_V1');
  expect(reopened.nightsCount).toBe(1);
  expect(reopened.transportation).toBe('motorbike');
  expect(reopened.costAssumptions).toEqual(generated.costAssumptions);
  expect(reopened.totalEstimatedCostVND).toBe(generated.totalEstimatedCostVND);
  expect(reopened.days).toEqual(generated.days);
  const selectedIds = [...new Set(generated.days.flatMap((day: any) => day.activities.map((activity: any) => activity.placeId).filter(Boolean)))];
  expect(reopened.selectedPlaceIds).toEqual(selectedIds);
  expect(reopened.pacing).toBe(generated.pacing);
  expect(reopened.adults).toBe(generated.adults);
  expect(reopened.children).toBe(generated.children);
  expect(reopened.days.map((day: any) => [day.lodgingNights, day.lodgingEstimatedCostVND])).toEqual(generated.days.map((day: any) => [day.lodgingNights, day.lodgingEstimatedCostVND]));
  const row = await TripSession.findByPk(tripId);
  expect(row.plannerMetadata.costBasis).toBe('GROUP_VND_V1');
  expect(Number(row.estimatedCostVND)).toBe(generated.totalEstimatedCostVND);
  expect(row.itinerary).toEqual(generated.days);
  expect(row.selectedPlaceIds).toEqual(selectedIds);
  expect(row.plannerMetadata.transportation).toBe('motorbike');
  expect(row.plannerMetadata.costAssumptions).toEqual(generated.costAssumptions);

  await page.getByTestId('trip-preferences').getByRole('button', { name: 'Ẩm thực', exact: true }).click();
  await page.getByTestId('save-trip-preferences').click();
  await expect(page.getByTestId('trip-preferences')).toContainText('Đã lưu sở thích.');
  await page.goto('/my-trips');
  await page.locator(`[data-testid="trip-card"][data-trip-id="${tripId}"]`).click();
  await expect(page.getByTestId('trip-cost-summary')).toContainText('VND cho cả nhóm');
  const updated = (await (await request.get(`${backendUrl}/trips/${tripId}`, { headers })).json()).data;
  expect(updated.days).toEqual(generated.days);
  expect(updated.costAssumptions).toEqual(generated.costAssumptions);
  for (const field of ['costBasis', 'nightsCount', 'transportation', 'pacing', 'adults', 'children', 'selectedPlaceIds', 'totalBudgetUserVND', 'totalEstimatedCostVND', 'costDifferenceVND', 'budgetStatus']) {
    expect(updated[field], `reopen preserves ${field}`).toEqual(reopened[field]);
  }
  expect(updated.preferences).toEqual(['am-thuc']);
  const updatedRow = await TripSession.findByPk(tripId);
  expect(updatedRow.itinerary).toEqual(row.itinerary);
  expect(updatedRow.plannerMetadata).toEqual(row.plannerMetadata);
  expect(updatedRow.selectedPlaceIds).toEqual(row.selectedPlaceIds);
  expect(Number(updatedRow.estimatedCostVND)).toBe(Number(row.estimatedCostVND));
  expect(updatedRow.preferences).toEqual(['am-thuc']);

  // Only this test's row is changed, after fresh identity/sentinel verification.
  assertTestDatabaseWriteOptIn('T04-A browser legacy fixture');
  await assertDatabaseSentinel(sequelize, 'T04-A browser legacy fixture');
  await TripSession.update({ plannerMetadata: { schemaVersion: 1, transportation: 'train' }, pacing: 'packed', estimatedCostVND: 777 }, { where: { id: tripId, userId } });
  await page.reload();
  await expect(page.getByTestId('trip-cost-summary')).toContainText('Chi phí bản cũ chưa xác nhận đơn vị');
  await expect(page.getByTestId('trip-cost-summary')).toContainText('777đ');
  await expect(page.getByTestId('trip-cost-summary')).toContainText('Tàu hỏa (đã lưu)');
  await expect(page.getByTestId('trip-cost-summary')).toContainText('Khám phá nhiều (đã lưu)');
  expect(Number((await TripSession.findByPk(tripId)).estimatedCostVND)).toBe(777);
});
