// PROVIDER_MOCK_ONLY decisions. No page.route/fetch mocking: Edge -> Vite -> real Express/Auth/Agent -> real PostgreSQL.
import { test, expect, type Page, type Response } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const runId = process.env.T_AI_03A_RUN_ID!;
const city = process.env.T_AI_03A_CITY!;
const fixtures = JSON.parse(process.env.T_AI_03A_FIXTURES!);
const password = process.env.T_AI_03A_PASSWORD!;
const evidence = process.env.T_AI_03A_EVIDENCE!;
const project = (page: Page) => page.viewportSize()!.width === 390 ? 'mobile' : 'desktop';
const account = (page: Page, which: 'A' | 'B' = 'A') => fixtures.users.find((u: any) => u.project === project(page) && u.account === which);

async function login(page: Page, which: 'A' | 'B' = 'A') {
  const user = account(page, which);
  await page.goto('/login');
  await page.locator('input[name=email]').fill(user.email);
  await page.locator('input[name=password]').fill(password);
  const response = page.waitForResponse(r => r.url().includes('/api/auth/login') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
  const auth = await response; expect(auth.status()).toBe(200); expect(auth.headers()['x-tai03a-backend']).toBe(runId);
  const body = await auth.json(); expect(body.data.user.id).toBe(user.id);
  await page.goto('/assistant');
  await expect(page.getByRole('heading', { name: 'Trợ lý AI', exact: true })).toBeVisible();
  return user;
}
async function chat(page: Page, message: string) {
  await page.getByLabel('Yêu cầu du lịch của bạn').fill(message);
  const response = page.waitForResponse(r => r.url().includes('/api/agent/chat') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  const result = await response; expect(result.headers()['x-tai03a-backend']).toBe(runId);
  return { response: result, body: await result.json(), request: result.request().postDataJSON() };
}
test.afterEach(async ({ page }, info) => {
  const dir = path.join(evidence, info.project.name); fs.mkdirSync(dir, { recursive: true });
  const id = info.title.split(' ')[0];
  await page.screenshot({ path: path.join(dir, `${id}.png`), fullPage: true });
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ tier: 'PROVIDER_MOCK_ONLY + REAL_BACKEND + REAL_POSTGRESQL',
    title: info.title, status: info.status, runId, database: 'travelgo_ai_m0_test', liveLLM: 'NOT RUN' }, null, 2));
});

test('C01 anonymous route and Agent API require authentication', async ({ page }) => {
  await page.goto('/assistant'); await expect(page).toHaveURL(/\/login$/);
  const api = await page.request.post('/api/agent/chat', { data: { message: 'THIẾU điểm đến' } });
  expect(api.status()).toBe(401); expect(api.headers()['x-tai03a-backend']).toBe(runId);
});
test('C02 real Customer login and Assistant access', async ({ page }) => {
  const user = await login(page); const current = await page.request.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('travelgo_token'))}` } });
  expect(current.status()).toBe(200); expect((await current.json()).data.id).toBe(user.id);
});
test('C03 real Catalog retains zero/null and hides suspended resource', async ({ page }) => {
  await login(page); const { response, body } = await chat(page, `TÌM địa điểm ở ${city}`);
  expect(response.status()).toBe(200); expect(body.data.status).toBe('completed');
  expect(body.data.result.type).toBe('places'); expect(body.data.result.source).toBe('RecommendationService');
  const places = body.data.result.places;
  const zero = fixtures.places[0], missing = fixtures.places[1], hidden = fixtures.places[4];
  expect(places.find((p: any) => p.id === zero.id)).toMatchObject({ priceFrom: 0, catalogPriceAvailable: true, category: 'attraction', city });
  expect(places.find((p: any) => p.id === missing.id)).toMatchObject({ priceFrom: null, catalogPriceAvailable: false, category: 'attraction', city });
  expect(places.some((p: any) => p.id === hidden.id)).toBe(false);
  await expect(page.getByText('Giá từ 0 ₫')).toBeVisible();
  await expect(page.getByText('Chưa có giá trong Catalog')).toBeVisible();
  await expect(page.getByText(hidden.name)).toHaveCount(0);
});
test('C04 real Planner cost, GROUP_VND_V1 and warnings', async ({ page }) => {
  await login(page); const { response, body } = await chat(page, `LỊCH 1 ngày tại ${city}`);
  expect(response.status()).toBe(200); expect(body.data.status).toBe('completed');
  const result = body.data.result; expect(result.type).toBe('itinerary'); expect(result.source).toBe('TourPlannerService');
  expect(result.itinerary.destinationCity).toBe(city); expect(result.cost.basis).toBe('GROUP_VND_V1');
  expect(result.cost.estimated).toBe(result.itinerary.totalEstimatedCostVND);
  expect(result.cost.budgetStatus).toBe('over_budget'); expect(result.cost.overBudget).toBeGreaterThan(0);
  const formatted = new Intl.NumberFormat('vi-VN').format(result.cost.estimated) + ' ₫';
  await expect(page.getByRole('region', { name: 'Hội thoại' }).getByText(formatted, { exact: true })).toBeVisible();
  await expect(page.getByText(/Vượt ngân sách:/)).toBeVisible();
  await expect(page.getByText(/GROUP_VND_V1/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('C05 multiple turns forward exact server history and one allowlisted tool', async ({ page }) => {
  await login(page); const first = await chat(page, 'THIẾU điểm đến');
  expect(first.body.data.status).toBe('needs_input');
  const second = await chat(page, `TÌM tiếp tại ${city}`);
  expect(second.body.data.status).toBe('completed');
  expect(second.request.history).toEqual(first.body.data.history);
  expect(second.request).not.toHaveProperty('tool'); expect(second.request).not.toHaveProperty('system');
});
test('C06 needs_input renders real backend clarification', async ({ page }) => {
  await login(page); const { body } = await chat(page, 'THIẾU điểm đến');
  expect(body.data.status).toBe('needs_input'); expect(body.data.missingFields).toContain('destinationCity');
  await expect(page.getByText(/điểm đến/).last()).toBeVisible();
});
test('C07 unsupported stays read-only and honest', async ({ page }) => {
  await login(page); const { body } = await chat(page, 'KHÔNG HỖ TRỢ đặt phòng');
  expect(body.data.status).toBe('unsupported');
  await expect(page.getByText(/chưa hỗ trợ lưu Trip hoặc đặt dịch vụ/)).toBeVisible();
});
test('C08 infeasible Planner yields tool_unavailable, no fake itinerary', async ({ page }) => {
  await login(page); const { body } = await chat(page, 'CATALOG RỖNG');
  expect(body.data.status).toBe('tool_unavailable'); expect(body.data.warningCode).toBe('AGENT_CATALOG_INSUFFICIENT');
  await expect(page.getByText(/Catalog chưa đủ dữ liệu/)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Lịch trình đề xuất' })).toHaveCount(0);
});
test('C09 real privacy endpoint and 428 require explicit one-request consent', async ({ page }) => {
  await login(page); const first = await chat(page, 'QUYỀN RIÊNG TƯ cần xin phép');
  expect(first.response.status()).toBe(428); expect(first.body.code).toBe('AGENT_EXTERNAL_CONSENT_REQUIRED');
  await expect(page.getByRole('dialog')).toBeVisible();
  const notice = await page.request.get('/api/agent/privacy', { headers: {
    Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('travelgo_token'))}` } });
  expect(notice.status()).toBe(200); expect(notice.headers()['x-tai03a-backend']).toBe(runId);
  expect((await notice.json()).data.version).toBe('external-chat-v1');
  await expect(page.getByRole('button', { name: 'Từ chối', exact: true })).toBeFocused();
  const retry = page.waitForResponse(r => r.url().includes('/api/agent/chat') && r.request().method() === 'POST' &&
    r.request().postDataJSON()?.externalProcessingConsent === 'external-chat-v1');
  await page.getByRole('button', { name: 'Đồng ý và gửi yêu cầu' }).click();
  const accepted = await retry; expect(accepted.status()).toBe(200);
  expect((await accepted.json()).data.status).toBe('needs_input');
  const next = await chat(page, 'QUYỀN RIÊNG TƯ lượt tiếp'); expect(next.response.status()).toBe(428);
  expect(next.request.externalProcessingConsent).toBeUndefined();
});
test('C10 disabled provider returns 503 and Planner link', async ({ page }) => {
  await login(page); const { response, body } = await chat(page, 'CHƯA CẤU HÌNH');
  expect(response.status()).toBe(503); expect(body.code).toBe('AGENT_PROVIDER_NOT_CONFIGURED');
  await expect(page.getByText(/Trợ lý AI chưa sẵn sàng/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dùng Planner thông thường' })).toBeVisible();
});
test('C11 real API rejects invalid input 400 and invalid JWT 401', async ({ page }) => {
  await login(page); const token = await page.evaluate(() => localStorage.getItem('travelgo_token'));
  const bad = await page.request.post('/api/agent/chat', { headers: { Authorization: `Bearer ${token}` },
    data: { message: 'THIẾU điểm đến', history: [{ role: 'system', content: 'privileged' }] } });
  expect(bad.status()).toBe(400); expect((await bad.json()).code).toBe('AGENT_INVALID_INPUT');
  const invalid = await page.request.post('/api/agent/chat', { headers: { Authorization: 'Bearer invalid-token' },
    data: { message: 'THIẾU điểm đến' } });
  expect(invalid.status()).toBe(401);
});
test('C12 real Agent route sanitizes 429, 502 and 504', async ({ page }) => {
  await login(page);
  for (const [message, status] of [['GIỚI HẠN', 429], ['ĐẦU RA SAI', 502], ['TIMEOUT', 504]] as const) {
    const { response, body } = await chat(page, message); expect(response.status()).toBe(status);
    expect(body.success).toBe(false); expect(JSON.stringify(body)).not.toMatch(/stack|password|token/i);
    await expect(page.getByRole('alert').last()).toBeVisible();
  }
});
test('C13 logout/login B discards delayed A response', async ({ page }) => {
  await login(page, 'A');
  await page.getByLabel('Yêu cầu du lịch của bạn').fill('CHẬM account A');
  const requestSeen = page.waitForRequest(r => r.url().includes('/api/agent/chat') && r.method() === 'POST');
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); await requestSeen;
  if (project(page) === 'mobile') await page.getByRole('button', { name: 'Mở menu' }).click();
  else await page.getByRole('button', { name: 'Menu tài khoản' }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login$/); await login(page, 'B');
  const b = await chat(page, 'THIẾU thông tin B'); expect(b.request.history).toEqual([]);
  await page.waitForTimeout(2600);
  await expect(page.getByText(/CHẬM account A/)).toHaveCount(0);
  await expect(page.getByRole('article', { name: 'Phản hồi Agent' })).toHaveCount(1);
});
test('C14 refresh and new conversation clear history', async ({ page }) => {
  await login(page); await chat(page, 'THIẾU lượt cũ');
  await page.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click();
  await expect(page.getByRole('heading', { name: 'Bạn muốn khám phá đâu?' })).toBeVisible();
  const next = await chat(page, 'THIẾU lượt mới'); expect(next.request.history).toEqual([]);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Bạn muốn khám phá đâu?' })).toBeVisible();
  await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('');
});
test('C15 no Trip/Booking mutation via Assistant', async ({ page }) => {
  const mutations: string[] = [];
  page.on('request', r => { if (/\/api\/(trips|bookings)/.test(r.url()) && r.method() !== 'GET') mutations.push(`${r.method()} ${r.url()}`); });
  await login(page); await chat(page, 'TÌM địa điểm'); await chat(page, 'LỊCH một ngày');
  expect(mutations).toEqual([]);
});
