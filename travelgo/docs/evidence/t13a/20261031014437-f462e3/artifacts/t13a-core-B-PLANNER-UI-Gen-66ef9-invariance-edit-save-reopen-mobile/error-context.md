# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t13a-core.spec.ts >> B_PLANNER UI Generate/mandatory/group/price-invariance/edit/save/reopen
- Location: e2e\t13a-core.spec.ts:156:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 201
Received: 500
```

# Test source

```ts
  1   | import { expect, test, type Page, type TestInfo } from '@playwright/test';
  2   | import { createRequire } from 'node:module';
  3   | import { randomBytes, randomUUID, createHmac } from 'node:crypto';
  4   | import path from 'node:path';
  5   | import fs from 'node:fs';
  6   | 
  7   | const require = createRequire(path.resolve('../backend/package.json'));
  8   | const { Fixtures, guard, schema, models, sequelize, write } = require('../backend/scripts/t13a-support.cjs');
  9   | const { User, TripSession, Booking, BookingStatusHistory, Tour, Place, Business, UserEvent } = models;
  10  | let fixtures: any;
  11  | let info: TestInfo;
  12  | let matrix: any[] = [];
  13  | let traffic: any[] = [];
  14  | let external: any[] = [];
  15  | const out = () => path.join(process.env.T13A_EVIDENCE!, info.project.name);
  16  | const d = () => fixtures.data;
  17  | const money = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';
  18  | async function step(id: string, expected: string, run: () => Promise<any>) {
  19  |   const row: any = { id, expected, status: 'NOT RUN' }; matrix.push(row);
  20  |   try { const value = await test.step(id, run); row.status = 'PASS'; if (value !== undefined) row.actual = value; return value; }
  21  |   catch (error: any) { row.status = 'FAIL'; row.actual = error.message; throw error; }
  22  | }
  23  | async function layout(page: Page, label: string) {
  24  |   const dimensions = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
  25  |     culprits: [...document.querySelectorAll('main, section, form, button, input, select, [data-testid]')].map(el => ({ tag: el.tagName, id: el.getAttribute('data-testid'), text: el.textContent?.slice(0, 70), left: el.getBoundingClientRect().left, right: el.getBoundingClientRect().right })).filter(v => v.left < -1 || v.right > innerWidth + 1).slice(0, 15) }));
  26  |   matrix.push({ id: `LAYOUT_${label}`, expected: 'No document horizontal overflow', actual: dimensions, status: dimensions.scrollWidth <= dimensions.width + 1 ? 'PASS' : 'FAIL' });
  27  |   await page.screenshot({ path: path.join(out(), `${info.title.split(' ')[0]}-${label}.png`), fullPage: true });
  28  |   expect.soft(dimensions.scrollWidth, `${label}: horizontal overflow`).toBeLessThanOrEqual(dimensions.width + 1);
  29  | }
  30  | async function decline(page: Page) {
  31  |   const banner = page.getByTestId('telemetry-decline');
  32  |   if (await banner.isVisible({ timeout: 1500 }).catch(() => false)) await banner.click();
  33  | }
  34  | async function browserApi(page: Page, method: string, endpoint: string, body?: any, token?: string, key?: string) {
  35  |   const value = await page.evaluate(async ({ method, endpoint, body, token, key }) => {
  36  |     const response = await fetch('/api' + endpoint, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? localStorage.getItem('travelgo_token')}`, ...(key ? { 'Idempotency-Key': key } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  37  |     return { status: response.status, body: await response.json() };
  38  |   }, { method, endpoint, body, token, key });
  39  |   traffic.push({ method, endpoint, status: value.status, code: value.body.code, origin: 'browser fetch -> Vite proxy -> real API' });
  40  |   return value;
  41  | }
  42  | async function register(page: Page, label: string) {
  43  |   const email = fixtures.planEmail(label); const password = randomBytes(20).toString('base64url') + '1a';
  44  |   const fullName = `T13A ${info.project.name} ${label}`;
  45  |   await page.goto('/register'); await decline(page);
  46  |   await page.locator('form input[type=text]').fill(fullName);
  47  |   await page.locator('form input[type=email]').fill(email);
  48  |   await page.locator('form input[type=tel]').fill('0901234567');
  49  |   await page.locator('form input[type=password]').fill(password);
  50  |   const response = page.waitForResponse(r => r.url().endsWith('/api/auth/register') && r.request().method() === 'POST');
  51  |   await page.getByRole('button', { name: 'Đăng ký tài khoản', exact: true }).click();
> 52  |   const registered = await response; expect(registered.status()).toBe(201);
      |                                                                  ^ Error: expect(received).toBe(expected) // Object.is equality
  53  |   const session = (await registered.json()).data;
  54  |   await fixtures.discover(); await page.waitForURL('/'); await decline(page);
  55  |   expect((await User.findByPk(session.user.id))?.email).toBe(email);
  56  |   return { ...session, fullName, email, password };
  57  | }
  58  | async function logout(page: Page) {
  59  |   await page.getByRole('button', { name: info.project.name === 'mobile' ? 'Mở menu' : 'Menu tài khoản', exact: true }).click();
  60  |   await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  61  |   expect(await page.evaluate(() => localStorage.getItem('travelgo_token'))).toBeNull();
  62  | }
  63  | async function login(page: Page, person: any) {
  64  |   await page.goto('/profile'); await expect(page).toHaveURL(/\/login$/);
  65  |   await page.locator('[name=email]').fill(person.email); await page.locator('[name=password]').fill(person.password);
  66  |   const r = page.waitForResponse(r => r.url().endsWith('/api/auth/login'));
  67  |   await page.getByRole('button', { name: 'Đăng nhập ngay', exact: true }).click(); expect((await r).status()).toBe(200);
  68  |   await expect(page.getByRole('heading', { name: person.fullName, exact: true })).toBeVisible();
  69  | }
  70  | async function plannerForm(page: Page, budget = 10000000) {
  71  |   await page.goto(`/tour-planner?mandatoryPlaceId=${d().hotelId}`);
  72  |   await expect(page.getByRole('heading', { name: 'T13A TEST hotel 4', exact: true })).toBeVisible();
  73  |   await page.locator('[name=startDate]').fill('2028-02-28'); await page.locator('[name=endDate]').fill('2028-02-29');
  74  |   await page.locator('[name=adults]').fill('2'); await page.locator('[name=children]').fill('1');
  75  |   await page.locator('[name=totalBudget]').fill(String(budget));
  76  | }
  77  | async function generate(page: Page, status = 200) {
  78  |   const waiting = page.waitForResponse(r => r.url().endsWith('/api/tours/plan') && r.request().method() === 'POST');
  79  |   await page.locator('form button[type=submit]').click(); const response = await waiting; expect(response.status()).toBe(status);
  80  |   const body = await response.json(); return body.data ?? body;
  81  | }
  82  | function assertPlan(plan: any) {
  83  |   expect(plan.daysCount).toBe(2); expect(plan.nightsCount).toBe(1); expect(plan.costBasis).toBe('GROUP_VND_V1');
  84  |   expect(plan.totalEstimatedCostVND).toBe(3840000);
  85  |   expect(plan.days.map((day: any) => day.lodgingNights)).toEqual([1, 0]);
  86  |   expect(plan.days.flatMap((day: any) => day.activities).filter((a: any) => a.placeId === d().hotelId)).toHaveLength(1);
  87  |   const actual = new Map(plan.days.flatMap((day: any) => day.activities.filter((a: any) => a.category === 'sightseeing').map((a: any) => [a.placeId, a.estimatedCostVND])));
  88  |   for (const [index, id] of d().attractionIds.entries()) expect(actual.get(id)).toBe([270000, 810000, 135000, 0][index]);
  89  |   for (const day of plan.days) expect(day.dayEstimatedCostVND).toBe(day.activities.reduce((sum: number, a: any) => sum + a.estimatedCostVND, 0) + day.lodgingEstimatedCostVND);
  90  | }
  91  | async function savePlanner(page: Page) {
  92  |   const waiting = page.waitForResponse(r => r.url().endsWith('/api/trips') && r.request().method() === 'POST');
  93  |   await page.getByRole('button', { name: /Lưu hành trình này|Lưu phương án tham khảo/ }).first().click();
  94  |   const response = await waiting; expect(response.status()).toBe(201); const trip = (await response.json()).data;
  95  |   await fixtures.discover(); await expect(page).toHaveURL(new RegExp(`/my-trips/${trip.id}$`)); return trip;
  96  | }
  97  | async function assertTrip(page: Page, expected: any) {
  98  |   const read = await browserApi(page, 'GET', `/trips/${expected.id}`); expect(read.status).toBe(200);
  99  |   const actual = read.body.data; const row = (await TripSession.findByPk(expected.id))!;
  100 |   for (const key of ['days', 'costBasis', 'costAssumptions', 'nightsCount', 'adults', 'children', 'transportation', 'selectedPlaceIds', 'totalEstimatedCostVND', 'totalBudgetUserVND', 'budgetStatus', 'overBudgetVND', 'constraintViolations']) expect(actual[key], `GET ${key}`).toEqual(expected[key]);
  101 |   expect(row.itinerary).toEqual(actual.days); expect(Number(row.estimatedCostVND)).toBe(actual.totalEstimatedCostVND);
  102 |   expect(row.selectedPlaceIds).toEqual(actual.selectedPlaceIds);
  103 |   for (const key of ['costBasis', 'costAssumptions', 'nightsCount', 'adults', 'children', 'transportation']) expect(row.plannerMetadata[key]).toEqual(actual[key]);
  104 |   const ids = [...new Set(actual.days.flatMap((day: any) => day.activities.map((a: any) => a.placeId).filter(Boolean)))];
  105 |   expect(ids).toEqual(actual.selectedPlaceIds);
  106 |   await expect(page.getByTestId('planner-budget-notice')).toContainText(`Dự toán cả nhóm: ${money(actual.totalEstimatedCostVND)}`);
  107 |   if (actual.overBudgetVND > 0) await expect(page.getByTestId('planner-budget-notice')).toContainText(`Vượt ngân sách: ${money(actual.overBudgetVND)}`);
  108 |   return { id: actual.id, total: actual.totalEstimatedCostVND, selectedPlaceIds: actual.selectedPlaceIds, budgetStatus: actual.budgetStatus, overBudgetVND: actual.overBudgetVND };
  109 | }
  110 | 
  111 | test.beforeAll(async ({}, worker) => {
  112 |   await schema(); fixtures = new Fixtures(process.env.T13A_EVIDENCE!, worker.project.name); await fixtures.create();
  113 | });
  114 | test.afterAll(async () => { try { if (fixtures) await fixtures.cleanup(); } finally { await sequelize.close(); } });
  115 | test.beforeEach(async ({ page }, testInfo) => {
  116 |   info = testInfo; matrix = []; traffic = []; external = [];
  117 |   page.on('response', r => { if (new URL(r.url()).origin === new URL(info.project.use.baseURL || `http://127.0.0.1:${process.env.PLAYWRIGHT_FRONTEND_PORT}`).origin && r.url().includes('/api/')) traffic.push({ method: r.request().method(), path: new URL(r.url()).pathname, status: r.status() }); });
  118 |   page.on('requestfailed', r => { if (!r.url().includes('/api/')) external.push({ url: r.url().split('?')[0], error: r.failure()?.errorText }); });
  119 |   await page.goto('/');
  120 |   await step('ENV_PROXY_DB', 'Frontend proxy reaches this run backend and exact test DB', async () => {
  121 |     const response = await page.evaluate(async () => (await fetch('/api/__t13a/identity')).json());
  122 |     expect(response.runId).toBe(process.env.T13A_RUN_ID); expect(response.database).toBe('travelgo_ai_m0_test');
  123 |     expect(response.host).toBe('127.0.0.1'); expect(response.nodeEnv).toBe('test');
  124 |     expect(response.port).toBe(Number(process.env.PLAYWRIGHT_BACKEND_PORT)); return response;
  125 |   });
  126 | });
  127 | test.afterEach(async ({ page }, testInfo) => {
  128 |   if (testInfo.errors.length && !matrix.some(v => v.status === 'FAIL')) matrix.push({ id: 'UNHANDLED_ASSERTION', status: 'FAIL', actual: testInfo.errors.map(v => v.message) });
  129 |   await fixtures?.discover();
  130 |   write(path.join(out(), `${testInfo.title.split(' ')[0]}-results.json`), { title: testInfo.title, project: testInfo.project.name, viewport: page.viewportSize(), browser: 'Microsoft Edge Chromium headless', mobile: testInfo.project.name === 'mobile' ? 'viewport/touch emulation, not physical device' : false, matrix, traffic, external, testStatus: testInfo.status });
  131 | });
  132 | 
  133 | test('A_AUTH UI register/login/Profile/logout/account-switch/invalid-expired', async ({ page }) => {
  134 |   const a = await step('AUTH_REGISTER_A', 'Registration through UI persists CUSTOMER account', () => register(page, 'AuthA'));
  135 |   await step('PROFILE_A', 'DB-backed profile and reload show A', async () => { await page.goto('/profile'); await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible(); await expect(page.getByTestId('profile-phone')).toHaveText('0901234567'); await page.reload(); await expect(page.getByText(a.email, { exact: true })).toBeVisible(); });
  136 |   await layout(page, 'profile-A'); await logout(page);
  137 |   await step('AUTH_LOGIN_A', 'Login via UI returns A, wrong password rejected first', async () => {
  138 |     await page.goto('/login'); await page.locator('[name=email]').fill(a.email); await page.locator('[name=password]').fill('intentionally-wrong');
  139 |     const denied = page.waitForResponse(r => r.url().endsWith('/api/auth/login')); await page.getByRole('button', { name: 'Đăng nhập ngay', exact: true }).click(); expect((await denied).status()).toBe(401); await expect(page.getByRole('alert')).toBeVisible();
  140 |     await login(page, a);
  141 |   });
  142 |   await logout(page); const b = await register(page, 'AuthB');
  143 |   await step('AUTH_SWITCH_B', 'B profile never shows A identity', async () => { await page.goto('/profile'); await expect(page.getByRole('heading', { name: b.fullName, exact: true })).toBeVisible(); await expect(page.getByText(a.email, { exact: true })).toHaveCount(0); await page.reload(); await expect(page.getByText(b.email, { exact: true })).toBeVisible(); });
  144 |   await layout(page, 'profile-B'); await logout(page); await login(page, a);
  145 |   for (const kind of ['invalid', 'expired']) await step(`AUTH_${kind.toUpperCase()}`, 'Real 401 clears client session and returns to login', async () => {
  146 |     if (kind === 'expired') await login(page, a);
  147 |     const payload = Buffer.from(JSON.stringify({ ...a.user, iat: 1, exp: 2 })).toString('base64url');
  148 |     const token = kind === 'invalid' ? 'T13A-invalid-token' : payload + '.' + createHmac('sha256', process.env.JWT_SECRET!).update(payload).digest('base64url');
  149 |     await page.evaluate(token => localStorage.setItem('travelgo_token', token), token);
  150 |     const waiting = page.waitForResponse(r => r.url().endsWith('/api/auth/me')); await page.goto('/profile');
  151 |     const response = await waiting; expect(response.status()).toBe(401); expect((await response.json()).code).toBe(kind === 'invalid' ? 'INVALID_TOKEN' : 'TOKEN_EXPIRED');
  152 |     await expect(page).toHaveURL(/\/login$/); expect(await page.evaluate(() => [localStorage.getItem('travelgo_token'), localStorage.getItem('travelgo_user')])).toEqual([null, null]);
```