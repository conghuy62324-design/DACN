import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(path.resolve('../backend/package.json'));
const { Fixtures, guard, schema, models, sequelize, write } = require('../backend/scripts/t13a-support.cjs');
const { User, TripSession, Booking, BookingStatusHistory, Tour, Place, Business, UserEvent } = models;
let fixtures: any;
let info: TestInfo;
let matrix: any[] = [];
let traffic: any[] = [];
let external: any[] = [];
const out = () => path.join(process.env.T13A_EVIDENCE!, info.project.name);
const d = () => fixtures.data;
const money = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';
async function step(id: string, expected: string, run: () => Promise<any>) {
  const row: any = { id, expected, status: 'NOT RUN' }; matrix.push(row);
  try { const value = await test.step(id, run); row.status = 'PASS'; if (value !== undefined) row.actual = value; return value; }
  catch (error: any) { row.status = 'FAIL'; row.actual = error.message; throw error; }
}
async function layout(page: Page, label: string) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    culprits: [...document.querySelectorAll('main, section, form, button, input, select, [data-testid]')].map(el => ({ tag: el.tagName, id: el.getAttribute('data-testid'), text: el.textContent?.slice(0, 70), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })).filter(v => v.left < -1 || v.right > innerWidth + 1).slice(0, 15) }));
  matrix.push({ id: `LAYOUT_${label}`, expected: 'No document horizontal overflow', actual: dimensions, status: dimensions.scrollWidth <= dimensions.width + 1 ? 'PASS' : 'FAIL' });
  await page.screenshot({ path: path.join(out(), `${info.title.split(' ')[0]}-${label}.png`), fullPage: true });
  await page.screenshot({ path: path.join(out(), `${info.title.split(' ')[0]}-${label}-viewport.png`), fullPage: false });
  expect.soft(dimensions.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(dimensions.width + 1);
}
async function decline(page: Page) {
  const banner = page.getByTestId('telemetry-decline');
  if (await banner.waitFor({ state: 'visible', timeout: 1500 }).then(() => true).catch(() => false)) await banner.click();
}
async function browserApi(page: Page, method: string, endpoint: string, body?: any, token?: string, key?: string) {
  const value = await page.evaluate(async ({ method, endpoint, body, token, key }) => {
    const response = await fetch('/api' + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? localStorage.getItem('travelgo_token')}`, ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { method, endpoint, body, token, key });
  traffic.push({ method, endpoint, status: value.status, code: value.body.code, origin: 'browser fetch -> Vite proxy -> real API' });
  return value;
}
async function register(page: Page, label: string) {
  const email = fixtures.planEmail(label); const password = randomBytes(20).toString('base64url') + '1a';
  const fullName = `T13A ${info.project.name} ${label}`;
  await page.goto('/register'); await decline(page);
  await page.locator('form input[type=text]').fill(fullName);
  await page.locator('form input[type=email]').fill(email);
  await page.locator('form input[type=tel]').fill('0901234567');
  await page.locator('form input[type=password]').fill(password);
  const response = page.waitForResponse(r => r.url().endsWith('/api/auth/register') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đăng ký tài khoản', exact: true }).click();
  const registered = await response; expect(registered.status()).toBe(201);
  const session = (await registered.json()).data;
  fixtures.data.users.push(session.user.id); fixtures.save();
  await fixtures.discover(); await page.waitForURL('/'); await decline(page);
  expect((await User.findByPk(session.user.id))?.email).toBe(email);
  return { ...session, fullName, email, password };
}
async function logout(page: Page) {
  await page.getByRole('button', { name: info.project.name === 'mobile' ? 'Mở menu' : 'Menu tài khoản', exact: true }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('travelgo_token'))).toBeNull();
}
async function login(page: Page, person: any) {
  await page.goto('/profile'); await expect(page).toHaveURL(/\/login$/);
  await page.locator('[name=email]').fill(person.email); await page.locator('[name=password]').fill(person.password);
  const r = page.waitForResponse(r => r.url().endsWith('/api/auth/login'));
  await page.getByRole('button', { name: 'Đăng nhập ngay', exact: true }).click(); expect((await r).status()).toBe(200);
  await expect(page.getByRole('heading', { name: person.fullName, exact: true })).toBeVisible();
}
async function plannerForm(page: Page, budget = 10000000) {
  await page.goto(`/tour-planner?mandatoryPlaceId=${d().hotelId}`);
  await expect(page.getByRole('heading', { name: 'T13A TEST hotel 4', exact: true })).toBeVisible();
  await page.locator('[name=startDate]').fill('2028-02-28'); await page.locator('[name=endDate]').fill('2028-02-29');
  await page.locator('[name=adults]').fill('2'); await page.locator('[name=children]').fill('1');
  await page.locator('[name=totalBudget]').fill(String(budget));
}
async function generate(page: Page, status = 200) {
  const waiting = page.waitForResponse(r => r.url().endsWith('/api/tours/plan') && r.request().method() === 'POST');
  await page.locator('form button[type=submit]').click(); const response = await waiting; expect(response.status()).toBe(status);
  const body = await response.json(); return body.data ?? body;
}
function assertPlan(plan: any) {
  expect(plan.daysCount).toBe(2); expect(plan.nightsCount).toBe(1); expect(plan.costBasis).toBe('GROUP_VND_V1');
  expect(plan.totalEstimatedCostVND).toBe(3840000);
  expect(plan.days.map((day: any) => day.lodgingNights)).toEqual([1, 0]);
  expect(plan.days.flatMap((day: any) => day.activities).filter((a: any) => a.placeId === d().hotelId)).toHaveLength(1);
  const actual = new Map(plan.days.flatMap((day: any) => day.activities.filter((a: any) => a.category === 'sightseeing').map((a: any) => [a.placeId, a.estimatedCostVND])));
  for (const [index, id] of d().attractionIds.entries()) expect(actual.get(id)).toBe([270000, 810000, 135000, 0][index]);
  for (const day of plan.days) expect(day.dayEstimatedCostVND).toBe(day.activities.reduce((sum: number, a: any) => sum + a.estimatedCostVND, 0) + day.lodgingEstimatedCostVND);
}
async function savePlanner(page: Page) {
  const waiting = page.waitForResponse(r => r.url().endsWith('/api/trips') && r.request().method() === 'POST');
  await page.getByRole('button', { name: /Lưu hành trình này|Lưu phương án tham khảo/ }).first().click();
  const response = await waiting; expect(response.status()).toBe(201); const trip = (await response.json()).data;
  await fixtures.discover(); await expect(page).toHaveURL(new RegExp(`/my-trips/${trip.id}$`)); return trip;
}
async function assertTrip(page: Page, expected: any) {
  const read = await browserApi(page, 'GET', `/trips/${expected.id}`); expect(read.status).toBe(200);
  const actual = read.body.data; const row = (await TripSession.findByPk(expected.id))!;
  for (const key of ['days', 'costBasis', 'costAssumptions', 'nightsCount', 'adults', 'children', 'transportation', 'selectedPlaceIds', 'totalEstimatedCostVND', 'totalBudgetUserVND', 'budgetStatus', 'overBudgetVND', 'constraintViolations']) expect(actual[key], `GET ${key}`).toEqual(expected[key]);
  expect(row.itinerary).toEqual(actual.days); expect(Number(row.estimatedCostVND)).toBe(actual.totalEstimatedCostVND);
  expect(row.selectedPlaceIds).toEqual(actual.selectedPlaceIds);
  for (const key of ['costBasis', 'costAssumptions', 'nightsCount', 'adults', 'children', 'transportation']) expect(row.plannerMetadata[key]).toEqual(actual[key]);
  const ids = [...new Set(actual.days.flatMap((day: any) => day.activities.map((a: any) => a.placeId).filter(Boolean)))];
  expect(ids).toEqual(actual.selectedPlaceIds);
  await expect(page.getByTestId('planner-budget-notice')).toContainText(`Dự toán cả nhóm: ${money(actual.totalEstimatedCostVND)}`);
  if (actual.overBudgetVND > 0) await expect(page.getByTestId('planner-budget-notice')).toContainText(`Vượt ngân sách: ${money(actual.overBudgetVND)}`);
  return { id: actual.id, total: actual.totalEstimatedCostVND, selectedPlaceIds: actual.selectedPlaceIds, budgetStatus: actual.budgetStatus, overBudgetVND: actual.overBudgetVND };
}

test.beforeAll(async ({}, worker) => {
  await schema(); fixtures = new Fixtures(process.env.T13A_EVIDENCE!, worker.project.name); await fixtures.create();
});
test.afterAll(async () => { try { if (fixtures) await fixtures.cleanup(); } finally { await sequelize.close(); } });
test.beforeEach(async ({ page }, testInfo) => {
  info = testInfo; matrix = []; traffic = []; external = [];
  page.on('response', r => { if (new URL(r.url()).origin === new URL(info.project.use.baseURL || `http://127.0.0.1:${process.env.PLAYWRIGHT_FRONTEND_PORT}`).origin && r.url().includes('/api/')) traffic.push({ method: r.request().method(), path: new URL(r.url()).pathname, status: r.status() }); });
  page.on('requestfailed', r => { if (!r.url().includes('/api/')) external.push({ url: r.url().split('?')[0], error: r.failure()?.errorText }); });
  await page.goto('/');
  await step('ENV_PROXY_DB', 'Frontend proxy reaches this run backend and exact test DB', async () => {
    const response = await page.evaluate(async () => (await fetch('/api/__t13a/identity')).json());
    expect(response.runId).toBe(process.env.T13A_RUN_ID); expect(response.database).toBe('travelgo_ai_m0_test');
    expect(response.host).toBe('127.0.0.1'); expect(response.nodeEnv).toBe('test');
    expect(response.port).toBe(Number(process.env.PLAYWRIGHT_BACKEND_PORT)); return response;
  });
});
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.errors.length && !matrix.some(v => v.status === 'FAIL')) matrix.push({ id: 'UNHANDLED_ASSERTION', status: 'FAIL', actual: testInfo.errors.map(v => v.message) });
  await fixtures?.discover();
  write(path.join(out(), `${testInfo.title.split(' ')[0]}-results.json`), { title: testInfo.title, project: testInfo.project.name, viewport: page.viewportSize(), browser: 'Microsoft Edge Chromium headless', mobile: testInfo.project.name === 'mobile' ? 'viewport/touch emulation, not physical device' : false, matrix, traffic, external, testStatus: testInfo.status });
});

test('A_AUTH UI register/login/Profile/logout/account-switch/invalid-expired', async ({ page }) => {
  const a = await step('AUTH_REGISTER_A', 'Registration through UI persists CUSTOMER account', () => register(page, 'AuthA'));
  await step('PROFILE_A', 'DB-backed profile and reload show A', async () => { await page.goto('/profile'); await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible(); await expect(page.getByTestId('profile-phone')).toHaveText('0901234567'); await page.reload(); await expect(page.getByText(a.email, { exact: true })).toBeVisible(); });
  await layout(page, 'profile-A'); await logout(page);
  await step('AUTH_LOGIN_A', 'Login via UI returns A, wrong password rejected first', async () => {
    await page.goto('/login'); await page.locator('[name=email]').fill(a.email); await page.locator('[name=password]').fill('intentionally-wrong');
    const denied = page.waitForResponse(r => r.url().endsWith('/api/auth/login')); await page.getByRole('button', { name: 'Đăng nhập ngay', exact: true }).click(); expect((await denied).status()).toBe(401); await expect(page.getByRole('alert')).toBeVisible();
    await login(page, a);
  });
  await logout(page); const b = await register(page, 'AuthB');
  await step('AUTH_SWITCH_B', 'B profile never shows A identity', async () => { await page.goto('/profile'); await expect(page.getByRole('heading', { name: b.fullName, exact: true })).toBeVisible(); await expect(page.getByText(a.email, { exact: true })).toHaveCount(0); await page.reload(); await expect(page.getByText(b.email, { exact: true })).toBeVisible(); });
  await layout(page, 'profile-B'); await logout(page); await login(page, a);
  for (const kind of ['invalid', 'expired']) await step(`AUTH_${kind.toUpperCase()}`, 'Real 401 clears client session and returns to login', async () => {
    if (kind === 'expired') await login(page, a);
    const payload = Buffer.from(JSON.stringify({ ...a.user, iat: 1, exp: 2 })).toString('base64url');
    const token = kind === 'invalid' ? 'T13A-invalid-token' : payload + '.' + createHmac('sha256', process.env.JWT_SECRET!).update(payload).digest('base64url');
    await page.evaluate(token => localStorage.setItem('travelgo_token', token), token);
    const waiting = page.waitForResponse(r => r.url().endsWith('/api/auth/me')); await page.goto('/profile');
    const response = await waiting; expect(response.status()).toBe(401); expect((await response.json()).code).toBe(kind === 'invalid' ? 'INVALID_TOKEN' : 'TOKEN_EXPIRED');
    await expect(page).toHaveURL(/\/login$/); expect(await page.evaluate(() => [localStorage.getItem('travelgo_token'), localStorage.getItem('travelgo_user')])).toEqual([null, null]);
  });
});

test('B_PLANNER UI Generate/mandatory/group/price-invariance/edit/save/reopen', async ({ page }) => {
  await register(page, 'Planner'); await plannerForm(page);
  await step('PLANNER_VALIDATION', 'Invalid adults blocked by browser form without POST', async () => { await page.locator('[name=adults]').fill('0'); expect(await page.locator('[name=adults]').evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false); const count = traffic.filter(v => v.path === '/api/tours/plan').length; await page.locator('form button[type=submit]').click(); expect(traffic.filter(v => v.path === '/api/tours/plan').length).toBe(count); await layout(page, 'planner-validation'); await page.locator('[name=adults]').fill('2'); });
  const high = await step('PLANNER_HIGH', '2 days/1 night, 2.7 equivalents, mandatory hotel, 3,840,000 group', async () => { const plan = await generate(page); assertPlan(plan); await expect(page.getByTestId('activity-cost-source').first()).toContainText('Catalog priceFrom'); await expect(page.getByTestId('hotel-estimate-source')).toContainText('600000'); await page.getByText('Giả định chi phí và khoản chưa bao gồm', { exact: true }).click(); await expect(page.getByText(/Mọi khoản activity/)).toBeVisible(); return plan; });
  await layout(page, 'planner-valid');
  const initial = await savePlanner(page); await page.reload(); await step('TRIP_FIRST_REOPEN', 'Save/reload DB metadata/totals/IDs equal accepted plan', () => assertTrip(page, initial));
  await plannerForm(page, 100000);
  const low = await step('PLANNER_LOW_INVARIANCE', 'Budget-only change never cuts price of same service', async () => {
    const plan = await generate(page); assertPlan(plan); expect(plan.overBudgetVND).toBe(3740000); expect(plan.constraintViolations).toEqual(['BUDGET_EXCEEDED']);
    const costs = (p: any) => p.days.flatMap((day: any) => day.activities.filter((a: any) => a.placeId).map((a: any) => [a.placeId, a.estimatedCostVND])).sort();
    expect(costs(plan)).toEqual(costs(high)); await expect(page.getByTestId('planner-budget-notice')).toContainText('Vượt ngân sách: 3.740.000đ'); return plan;
  });
  await layout(page, 'planner-over-budget');
  await step('PLANNER_UI_REORDER_REMOVE', 'Draft reorder/remove update total; mandatory hotel remains protected', async () => {
    const first = page.getByTestId('itinerary-activity').first(); await first.getByTitle('Di chuyển xuống', { exact: true }).click();
    expect(await page.getByTestId('itinerary-activity').first().getAttribute('data-place-id')).not.toBe(low.days[0].activities[0].placeId ?? '');
    const removable = page.getByTestId('itinerary-activity').filter({ hasText: 'T13A TEST attraction 1' }); await removable.getByTitle('Xóa địa điểm này', { exact: true }).click();
    await expect(page.getByTestId('planner-budget-notice')).toContainText('Dự toán cả nhóm: 3.030.000đ');
    await expect(page.getByTestId('itinerary-activity').filter({ hasText: 'T13A TEST hotel 4' }).getByRole('button', { name: /Địa điểm bắt buộc/ })).toBeDisabled();
  });
  const saved = await savePlanner(page); await page.reload(); await step('TRIP_EDITED_DRAFT_REOPEN', 'Edited draft saved/reopened at 3,030,000, excess 2,930,000', async () => { expect(saved.totalEstimatedCostVND).toBe(3030000); expect(saved.overBudgetVND).toBe(2930000); return assertTrip(page, saved); });
  await page.goto('/my-trips'); await page.locator(`[data-trip-id="${saved.id}"]`).click(); await assertTrip(page, saved); await layout(page, 'trip-saved-warning');
  await step('MANDATORY_MULTIPLE_API', 'Actual API supports attraction+hotel mandatory exactly once', async () => {
    const input = { ...low, totalBudget: 100000, mandatoryPlaceIds: [d().hotelId, d().attractionIds[0]] };
    const response = await browserApi(page, 'POST', '/tours/plan', input); expect(response.status).toBe(200);
    for (const id of input.mandatoryPlaceIds) expect(response.body.data.days.flatMap((day: any) => day.activities).filter((a: any) => a.placeId === id)).toHaveLength(1);
  });
});

test('C_EMPTY real 422/form retention/no old result/regenerate', async ({ page }) => {
  await register(page, 'Empty'); await plannerForm(page, 100000); await generate(page);
  await page.getByRole('button', { name: 'Sửa yêu cầu và tạo lại', exact: true }).click();
  await guard('T13-A own catalog availability fixture');
  await Place.update({ status: 'SUSPENDED' }, { where: { id: d().attractionIds } });
  try {
    await step('EMPTY_422', 'No local sightseeing -> 422, form unchanged, no stale/meal-only result', async () => {
      const body = await generate(page, 422); expect(body.code).toBe('NO_SIGHTSEEING_FOR_DESTINATION');
      await expect(page.getByTestId('planner-generation-error')).toContainText('Chưa đủ dữ liệu'); await expect(page.locator('[name=totalBudget]')).toHaveValue('100000');
      await expect(page.locator('[name=adults]')).toHaveValue('2'); await expect(page.locator('[name=endDate]')).toHaveValue('2028-02-29');
      await expect(page.getByTestId('itinerary-activity')).toHaveCount(0); await expect(page.getByTestId('planner-budget-notice')).toHaveCount(0);
    }); await layout(page, 'catalog-422');
  } finally { await guard('T13-A restore own catalog'); await Place.update({ status: 'APPROVED' }, { where: { id: d().attractionIds } }); }
  await page.locator('[name=totalBudget]').fill('3840000');
  await step('EMPTY_REGENERATE', 'User budget correction + restored fixture data generates equal-budget plan', async () => { const plan = await generate(page); assertPlan(plan); expect(plan.budgetStatus).toBe('within_budget'); expect(plan.overBudgetVND).toBe(0); await expect(page.getByTestId('planner-generation-error')).toHaveCount(0); });
  await layout(page, 'catalog-recovered');
});

test('D_SAVED_EDITOR saved Trip exposes activity edit/remove/reorder/save controls', async ({ page }) => {
  await register(page, 'SavedEditor'); await plannerForm(page, 100000); await generate(page); const trip = await savePlanner(page); await page.reload(); await assertTrip(page, trip);
  await page.screenshot({ path: path.join(out(), 'saved-trip-editor-reproduction.png'), fullPage: true });
  await step('SAVED_TRIP_UI_EDITOR', 'After save/reopen, user can edit/remove/reorder activities and save existing Trip', async () => {
    const controls = page.getByRole('button', { name: /Sửa lịch trình|Chỉnh sửa lịch trình|Xóa địa điểm này|Di chuyển lên|Di chuyển xuống/ });
    expect(await controls.count(), 'Saved Trip has no activity editor; preferences editor is a different feature').toBeGreaterThan(0);
  });
});

test('E_LIFECYCLE real API activity edit/reopen + UI start/GPS-denied/checkin/retry/complete', async ({ page, context, baseURL }) => {
  await register(page, 'Lifecycle'); await plannerForm(page, 100000); await generate(page); let trip = await savePlanner(page);
  await step('SAVED_TRIP_API_EDIT', 'Real browser fetch edits existing Trip, DB/reopen totals/IDs/warnings follow current data', async () => {
    const days = structuredClone(trip.days); const removed = days[0].activities.find((a: any) => a.category === 'sightseeing' && a.estimatedCostVND > 0)!;
    days[0].activities = days[0].activities.filter((a: any) => a.id !== removed.id).reverse();
    const response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { days }); expect(response.status).toBe(200); trip = response.body.data;
    expect(trip.totalEstimatedCostVND).toBe(3840000 - removed.estimatedCostVND); await page.reload(); return assertTrip(page, trip);
  });
  await step('BUDGET_EDIT_CURRENT', 'Budget edits clear then restore current warning without changing prices', async () => {
    let response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { totalBudgetUserVND: 10000000 }); expect(response.status).toBe(200); trip = response.body.data; await page.reload(); await assertTrip(page, trip); await expect(page.getByTestId('planner-budget-notice')).not.toContainText('Vượt ngân sách');
    response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { totalBudgetUserVND: 100000 }); trip = response.body.data; await page.reload(); await assertTrip(page, trip);
  });
  const cdp = await context.newCDPSession(page); const { targetInfo } = await cdp.send('Target.getTargetInfo');
  await cdp.send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: new URL(baseURL!).origin, browserContextId: targetInfo.browserContextId });
  await step('START_GPS_MANUAL', 'Start enables manual check-in even with real geolocation permission denied', async () => {
    await expect(page.getByTestId('checkin-activity').first()).toBeDisabled(); const started = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/start`)); await page.getByTestId('start-trip').click(); expect((await started).status()).toBe(200);
    await page.getByTestId('request-trip-location').click(); await expect(page.getByText(/Bạn vẫn có thể check-in thủ công bình thường/)).toBeVisible();
    expect(await page.evaluate(async () => (await navigator.permissions.query({ name: 'geolocation' })).state)).toBe('denied');
  });
  let checked: any;
  await step('CHECKIN_RETRY', 'UI check-in + real retry persist once and do not duplicate progress', async () => {
    const target = page.getByTestId('saved-trip-activity').first(); const activityId = await target.getAttribute('data-activity-id');
    await target.locator('input').fill('T13A manual check-in, GPS denied'); const waiting = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/checkin`)); await target.getByTestId('checkin-activity').click(); const response = await waiting; expect(response.status()).toBe(200); checked = (await response.json()).trip;
    expect(checked.checkins).toHaveLength(1); expect(checked.checkins[0].hasAttachedLocation).toBe(false); expect(checked.progressPercent).toBeLessThan(100);
    const retry = await browserApi(page, 'POST', `/trips/${trip.id}/checkin`, { activityId, notes: 'retry should not replace first note' }); expect(retry.status).toBe(200); expect(retry.body.trip.checkins).toEqual(checked.checkins); expect(retry.body.trip.progressPercent).toBe(checked.progressPercent);
    const row = await TripSession.findByPk(trip.id); expect(row.checkins).toHaveLength(1); expect(row.progressPercent).toBe(checked.progressPercent); await page.reload(); await expect(page.getByTestId('trip-progress')).toContainText(`${checked.progressPercent}%`);
    return { progress: checked.progressPercent, checkins: 1 };
  });
  await step('COMPLETE_ACTUAL_PROGRESS', 'Complete keeps partial progress, does not force 100%', async () => { const waiting = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/complete`)); await page.getByTestId('complete-trip').click(); expect((await waiting).status()).toBe(200); await page.reload(); await expect(page.getByTestId('trip-status')).toContainText('Đã kết thúc'); await expect(page.getByTestId('trip-progress')).toContainText(`${checked.progressPercent}%`); const row = await TripSession.findByPk(trip.id); expect(row.progressPercent).toBe(checked.progressPercent); expect(row.status).toBe('completed'); });
  await layout(page, 'trip-complete-partial');
});

test('F_BOOKING real UI commit/lost-response/retry/server-price/inactive-business', async ({ page }) => {
  const a = await register(page, 'Booking'); await page.goto(`/tours/${d().tourId}`); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay', exact: true }).click();
  await expect(page.getByLabel('Họ và tên từ tài khoản')).toHaveValue(a.fullName); await expect(page.getByLabel('Email từ tài khoản')).toHaveAttribute('readonly', '');
  await page.locator('[name=bookingDate]').fill('2028-02-29'); await page.locator('[name=notes]').fill('T13A pending unpaid only');
  await layout(page, 'booking-form');
  await guard('T13-A own fixture repricing after UI render'); await Tour.update({ priceVND: 123457 }, { where: { id: d().tourId } });
  const sent: any[] = []; let first = true;
  // Fault injection only: send the actual request to the real backend; cut the
  // transport AFTER DB commit. No fabricated success response/replay fixture.
  await page.route('**/api/bookings', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch(); const body = await response.json(); expect(response.status()).toBe(201);
    const booking = body.data; const row = await Booking.findByPk(booking.id); expect(row?.id).toBe(booking.id);
    sent.push({ key: route.request().headers()['idempotency-key'], payload: route.request().postDataJSON(), booking }); await fixtures.discover();
    if (first) { first = false; await route.abort('connectionfailed'); } else await route.fulfill({ response });
  });
  await step('BOOKING_COMMIT_RESPONSE_LOST', 'UI submit commits PENDING/unpaid row before transport response loss', async () => { await page.getByTestId('booking-submit').click(); await expect(page.getByRole('alert')).toBeVisible(); expect(sent).toHaveLength(1); expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); });
  await page.getByRole('button', { name: 'Đóng đặt dịch vụ', exact: true }).click(); await page.reload(); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay', exact: true }).click();
  await step('BOOKING_RETRY_CONFIRM', 'Retry after reload keeps key/payload/ID/code, confirmation uses server total', async () => {
    await expect(page.locator('[name=notes]')).toHaveValue('T13A pending unpaid only'); await page.getByTestId('booking-submit').click(); await expect(page.getByText('Đặt dịch vụ thành công!', { exact: true })).toBeVisible();
    expect(sent).toHaveLength(2); expect(sent[1].key).toBe(sent[0].key); expect(sent[1].payload).toEqual(sent[0].payload); expect(sent[1].booking.id).toBe(sent[0].booking.id); expect(sent[1].booking.bookingCode).toBe(sent[0].booking.bookingCode);
    const b = sent[1].booking; const p = sent[1].payload; const total = 123457 * (p.adultsCount + p.childrenCount) - Math.round(123457 * p.childrenCount * 0.3);
    expect(b.totalAmount).toBe(total); expect(b.totalAmount).not.toBe(100001 * (p.adultsCount + p.childrenCount));
    const confirmedMoney = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(total).replace('₫', 'đ');
    await expect(page.getByText(confirmedMoney, { exact: true })).toBeVisible();
    const row = await Booking.findByPk(b.id); expect(Number(row.totalAmount)).toBe(total); expect(row.bookingStatus).toBe('PENDING'); expect(row.paymentStatus).toBe('unpaid');
    expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); expect(await BookingStatusHistory.count({ where: { bookingId: b.id } })).toBe(1); expect((await Tour.findByPk(d().tourId)).availableCapacity).toBe(30 - p.adultsCount - p.childrenCount);
    return { id: b.id, code: b.bookingCode, total, status: row.bookingStatus, paymentStatus: row.paymentStatus, sameRetryKey: true };
  });
  await layout(page, 'booking-confirmation');
  const unitLabel = await page.getByRole('dialog').getByText(/^Đơn giá:/).textContent();
  matrix.push({ id: 'BOOKING_CONFIRMED_UNIT_PRICE', expected: 'Confirmed unit price is server unitPrice 123457, or old estimate is explicitly labeled as such', actual: { label: unitLabel, serverUnitPrice: sent[1].booking.unitPrice, serverTotal: sent[1].booking.totalAmount }, status: unitLabel?.includes('123.457') ? 'PASS' : 'FAIL' });
  expect.soft(unitLabel, 'Confirmation header retains old catalog price although server total is current').toContain('123.457');
  await page.getByRole('button', { name: 'Hoàn tất & Xem lịch sử', exact: true }).click(); await expect(page.getByText(sent[0].booking.bookingCode, { exact: false })).toBeVisible(); await page.reload(); await expect(page.getByText(sent[0].booking.bookingCode, { exact: false })).toBeVisible();
  await page.unroute('**/api/bookings');
  await guard('T13-A own inactive business fixture'); await Business.update({ status: 'SUSPENDED' }, { where: { id: d().businessId } });
  try { await step('BOOKING_BUSINESS_INACTIVE', 'New booking rejected 409 BUSINESS_NOT_ACTIVE atomically', async () => { const response = await browserApi(page, 'POST', '/bookings', { ...sent[0].payload, notes: 'T13A inactive reject' }, undefined, randomUUID()); expect(response.status).toBe(409); expect(response.body.code).toBe('BUSINESS_NOT_ACTIVE'); expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); }); }
  finally { await guard('T13-A restore own business'); await Business.update({ status: 'ACTIVE' }, { where: { id: d().businessId } }); }
  expect(await UserEvent.count({ where: { userId: a.user.id } })).toBe(0);
});

test('G_OWNERSHIP real A/B forged IDs/bodies/list/cross-Trip-and-Booking', async ({ page }) => {
  const a = await register(page, 'OwnerA'); await logout(page); const b = await register(page, 'OwnerB');
  const input = { departureCity: 'Hà Nội', destinationCity: d().city, startDate: '2028-02-28', endDate: '2028-02-29', adults: 2, children: 1, transportation: 'car', pacing: 'balanced', preferences: [], totalBudget: 100000, mandatoryPlaceIds: [d().hotelId, d().attractionIds[0]] };
  const plan = await browserApi(page, 'POST', '/tours/plan', input); expect(plan.status).toBe(200);
  const objects: any[] = [];
  for (const who of [a, b]) {
    const trip = await browserApi(page, 'POST', '/trips', { itinerary: plan.body.data }, who.token); expect(trip.status).toBe(201);
    const booking = await browserApi(page, 'POST', '/bookings', { serviceType: 'tour', serviceId: d().tourId, bookingDate: '2028-02-29', adultsCount: 1, childrenCount: 0, customerPhone: '0901234567', notes: 'T13A ownership PENDING unpaid' }, who.token, randomUUID()); expect(booking.status).toBe(201);
    objects.push({ who, trip: trip.body.data, booking: booking.body.data });
  }
  await fixtures.discover();
  for (let i = 0; i < 2; i++) await step(`OWNERSHIP_${i === 0 ? 'A_TO_B' : 'B_TO_A'}`, 'Actual endpoints reject foreign IDs, bodies and mutations without changing owner rows', async () => {
    const actor = objects[i], target = objects[1 - i]; const tripId = target.trip.id; const booking = target.booking;
    const beforeTrip = (await TripSession.findByPk(tripId)).toJSON(); const beforeBooking = (await Booking.findByPk(booking.id)).toJSON();
    const paths: any[] = [
      ['GET', `/trips/${tripId}`, undefined, 404], ['PUT', `/trips/${tripId}`, { title: 'T13A forbidden', userId: actor.who.user.id }, 404], ['DELETE', `/trips/${tripId}`, undefined, 404],
      ['POST', `/trips/${tripId}/start`, {}, 404], ['POST', `/trips/${tripId}/complete`, {}, 404], ['POST', `/trips/${tripId}/checkin`, { activityId: target.trip.days[0].activities[0].id }, 404], ['POST', `/trips/${tripId}/convert-to-blog`, {}, 404],
      ['GET', `/bookings/${booking.id}`, undefined, 404], ['GET', `/bookings/${booking.bookingCode}`, undefined, 404], ['POST', `/bookings/${booking.id}/cancel`, { userId: actor.who.user.id }, 404], ['PATCH', `/bookings/${booking.id}/status`, { status: 'CONFIRMED', userId: actor.who.user.id }, 403],
    ];
    const outcomes = [];
    for (const [method, endpoint, body, status] of paths) { const result = await browserApi(page, method, endpoint, body, actor.who.token); expect(result.status, `${method} ${endpoint}`).toBe(status); outcomes.push({ method, endpoint, expected: status, actual: result.status }); }
    const list = await browserApi(page, 'GET', `/trips?userId=${target.who.user.id}`, undefined, actor.who.token); expect(list.body.data.every((t: any) => t.userId === actor.who.user.id)).toBe(true);
    const bookingList = await browserApi(page, 'GET', `/bookings/my?userId=${target.who.user.id}`, undefined, actor.who.token); expect(bookingList.body.data.map((v: any) => v.id)).toEqual([actor.booking.id]);
    expect((await TripSession.findByPk(tripId)).toJSON()).toEqual(beforeTrip); expect((await Booking.findByPk(booking.id)).toJSON()).toEqual(beforeBooking);
    return outcomes;
  });
  await page.goto(`/my-trips/${objects[0].trip.id}`); await expect(page.getByText(/Không tìm thấy|không tồn tại|Không thể tải/).first()).toBeVisible(); await layout(page, 'foreign-trip');
});
