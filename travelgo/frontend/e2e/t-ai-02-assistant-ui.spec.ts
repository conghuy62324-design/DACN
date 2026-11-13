// MOCK_ONLY API/auth fixtures. Real browser/components/client; no backend/DB/LLM.
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const a = { id: 'mock-customer-a', fullName: 'Mock Customer A', email: 'a@example.test', roles: ['CUSTOMER'] };
const b = { ...a, id: 'mock-customer-b', fullName: 'Mock Customer B', email: 'b@example.test' };
const tokenA = 'MOCK_ONLY_TOKEN_A', tokenB = 'MOCK_ONLY_TOKEN_B';
const privacy = { version: 'external-chat-v1', text: 'MOCK_ONLY notice: Tin nhắn và lịch sử sẽ được gửi tới Google. Bạn có thể từ chối và dùng Planner.' };
const base = { historyTruncated: false, context: { mode: 'STATELESS', personalizationEnabled: false, behavioralDataUsed: false, persisted: false } };
const response = (request: any, patch: any = {}) => ({ ...base, status: 'needs_input', missingFields: ['destinationCity'], reply: 'Bạn muốn đi đâu?',
  history: [...(request.history || []), { role: 'user', content: request.message }, { role: 'assistant', content: patch.reply || 'Bạn muốn đi đâu?' }], ...patch });
const places = { type: 'places', source: 'RecommendationService', warnings: ['Giá Catalog chưa phải báo giá đặt dịch vụ.'], places: [
  { id: 'mock-free', name: 'MOCK_ONLY Công viên miễn phí', city: 'Đà Nẵng', priceFrom: 0, catalogPriceAvailable: true },
  { id: 'mock-unknown', name: 'MOCK_ONLY Giá chưa có', city: 'Đà Nẵng', priceFrom: null, catalogPriceAvailable: false },
] };
const itinerary = { type: 'itinerary', source: 'TourPlannerService', warnings: ['MOCK_ONLY Chi phí chưa gồm di chuyển liên tỉnh.'],
  cost: { currency: 'VND', basis: 'GROUP_VND_V1', estimated: 1250000, budget: 1000000, overBudget: 250000, budgetStatus: 'over_budget' },
  itinerary: { id: 'mock-plan', title: 'MOCK_ONLY Lịch trình Đà Nẵng', destinationCity: 'Đà Nẵng', startDate: '2030-06-15', endDate: '2030-06-15',
    budgetAdvice: 'MOCK_ONLY Hãy cân nhắc tăng ngân sách.', costAssumptions: ['MOCK_ONLY Dự toán cho cả nhóm.'], constraintViolations: ['BUDGET_EXCEEDED'],
    days: [{ date: '2030-06-15', themeTitle: 'Khám phá thành phố', dayEstimatedCostVND: 1250000, lodgingEstimatedCostVND: 0,
      activities: [{ id: 'mock-activity', title: 'MOCK_ONLY Điểm tham quan', description: 'Dữ liệu kiểm thử UI', estimatedCostVND: 1250000, costSource: 'MOCK_ONLY Catalog fixture' }] }] } };
const reply = (route: Route, data: unknown, status = 200, code = '') => route.fulfill({ status, contentType: 'application/json',
  body: JSON.stringify(status < 400 ? { success: true, data } : { success: false, code, message: 'RAW_PROVIDER_SECRET_CANARY', stack: 'RAW_STACK_CANARY' }) });
const gate = () => { let release!: () => void; const promise = new Promise<void>(r => release = r); return { promise, release }; };
type Handler = (route: Route, request: any, index: number) => Promise<void>;

async function setup(page: Page, handler: Handler = async (route, request) => reply(route, response(request)), user: any = a) {
  const requests: any[] = []; const errors: string[] = [];
  (page as any).agentRequests = requests;
  page.on('console', msg => { if (msg.text().includes('RAW_')) errors.push(msg.text()); });
  (page as any).secretLogs = errors;
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/agent/chat') {
      const body = route.request().postDataJSON(); requests.push(body); await handler(route, body, requests.length - 1); return;
    }
    if (url.pathname === '/api/agent/privacy') return reply(route, privacy);
    if (url.pathname === '/api/auth/me') return reply(route, route.request().headers().authorization === `Bearer ${tokenB}` ? b : user);
    if (url.pathname === '/api/auth/login') return reply(route, { token: tokenB, user: b });
    if (url.pathname === '/api/intelligence/consent') return reply(route, { hasDecision: true, analyticsEnabled: false, personalizationEnabled: false, retentionDays: 90 });
    if (route.request().method() !== 'GET') throw new Error(`Unexpected mutation ${url.pathname}`);
    return reply(route, []);
  });
  await page.addInitScript(({ user, tokenA }) => {
    if (!sessionStorage.getItem('t-ai-02-initialized')) {
      if (user) { localStorage.setItem('travelgo_token', tokenA); localStorage.setItem('travelgo_user', JSON.stringify(user)); }
      sessionStorage.setItem('t-ai-02-initialized', 'true');
    }
  }, { user, tokenA });
  return requests;
}
async function send(page: Page, message = 'Tôi muốn đi du lịch') {
  await page.getByLabel('Yêu cầu du lịch của bạn').fill(message);
  await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
}
async function menu(page: Page) {
  if ((page.viewportSize()?.width || 1440) < 1024) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
}
async function assistantNav(page: Page) {
  await menu(page); await page.getByRole('button', { name: 'Tour & Lịch trình', exact: true }).filter({ visible: true }).click();
  await page.getByRole('link', { name: 'Trợ lý AI', exact: false }).filter({ visible: true }).click();
}
async function logout(page: Page) {
  if ((page.viewportSize()?.width || 1440) < 1024) await menu(page);
  else await page.getByRole('button', { name: 'Menu tài khoản' }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).filter({ visible: true }).click();
}
test.afterEach(async ({ page }, info) => {
  const dir = path.join(process.env.T_AI_02_EVIDENCE!, info.project.name); fs.mkdirSync(dir, { recursive: true });
  const id = info.title.split(' ')[0];
  await page.screenshot({ path: path.join(dir, `${id}.png`), fullPage: true });
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ tier: 'MOCK_ONLY', title: info.title, status: info.status,
    requests: (page as any).agentRequests || [], rawSecretLogs: (page as any).secretLogs || [], database: 'NOT USED', liveLLM: 'NOT RUN' }, null, 2));
  expect((page as any).secretLogs || []).toEqual([]);
});

test('U01 anonymous redirect and Customer navigation', async ({ page }) => {
  await setup(page, undefined, null); await page.goto('/assistant'); await expect(page).toHaveURL(/\/login$/);
  await page.locator('input[name=email]').fill(b.email); await page.locator('input[name=password]').fill('MOCK_ONLY_Password');
  await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
  await expect(page.getByRole('heading', { name: 'Trợ lý AI', exact: true })).toBeVisible();
  await assistantNav(page); await expect(page).toHaveURL(/\/assistant$/);
});
test('U02 Partner-only route denied, no new role permission', async ({ page }) => {
  await setup(page, undefined, { ...a, roles: ['PARTNER'] }); await page.goto('/assistant'); await expect(page).toHaveURL(/\/403$/);
});
test('U03 keyboard, double-submit, multi-turn uses server history', async ({ page }) => {
  const held = gate();
  const requests = await setup(page, async (route, req, i) => { if (!i) await held.promise; await reply(route, response(req)); });
  await page.goto('/assistant'); const input = page.getByLabel('Yêu cầu du lịch của bạn');
  await input.fill('Tôi đi'); await input.press('Shift+Enter'); await input.press('End'); await input.type('Đà Nẵng');
  expect(await input.inputValue()).toContain('\n'); await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled(); await expect.poll(() => requests.length).toBe(1);
  held.release(); await expect(page.getByText('Bạn muốn đi đâu?', { exact: true })).toBeVisible();
  await send(page, 'Hội An'); await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].history).toEqual(response(requests[0]).history); expect(requests[1].externalProcessingConsent).toBeUndefined();
});
test('U04 unsupported and tool unavailable are honest states', async ({ page }) => {
  await setup(page, async (route, req, i) => reply(route, response(req, i ? { status: 'tool_unavailable', warningCode: 'AGENT_CATALOG_INSUFFICIENT', reply: 'Catalog chưa đủ dữ liệu.' } : { status: 'unsupported', reply: 'Chưa hỗ trợ đặt dịch vụ.' })));
  await page.goto('/assistant'); await send(page); await expect(page.getByText('Chưa hỗ trợ đặt dịch vụ.')).toBeVisible();
  await send(page, 'Tạo lịch trình'); await expect(page.getByText('Catalog chưa đủ dữ liệu.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Mở Planner', exact: true })).toBeVisible();
});
test('U05 Catalog shows zero, missing price and escaped HTML', async ({ page }) => {
  await setup(page, async (route, req) => reply(route, response(req, { status: 'completed', reply: '<img src=x onerror=alert(1)>', result: places })));
  await page.goto('/assistant'); await send(page); await expect(page.getByText('Giá từ 0 ₫')).toBeVisible();
  await expect(page.getByText('Chưa có giá trong Catalog')).toBeVisible(); await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Hội thoại' }).locator('img')).toHaveCount(0);
});
test('U06 Planner costs, assumptions and warnings render without repricing', async ({ page }) => {
  await setup(page, async (route, req) => reply(route, response(req, { status: 'completed', reply: 'Lịch trình tham khảo.', result: itinerary })));
  await page.goto('/assistant'); await send(page); await expect(page.getByText('MOCK_ONLY Lịch trình Đà Nẵng', { exact: true })).toBeVisible();
  await expect(page.getByText('Vượt ngân sách: 250.000 ₫')).toBeVisible(); await expect(page.getByText(/GROUP_VND_V1/)).toBeVisible();
  await page.getByText('Giả định chi phí', { exact: true }).click(); await expect(page.getByText('MOCK_ONLY Dự toán cho cả nhóm.')).toBeVisible();
  await page.getByText('MOCK_ONLY Chi phí chưa gồm di chuyển liên tỉnh.').scrollIntoViewIfNeeded();
  await expect(page.getByText('MOCK_ONLY Chi phí chưa gồm di chuyển liên tỉnh.')).toBeVisible();
  await expect(page.getByRole('button', { name: /Lưu chuyến|Đặt dịch vụ/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
for (const status of [400, 429, 502, 503, 504]) test(`E${status} safe error, preserve draft and manual retry`, async ({ page }) => {
  const requests = await setup(page, async (route, req, i) => i ? reply(route, response(req)) : reply(route, null, status, status === 503 ? 'AGENT_PROVIDER_NOT_CONFIGURED' : 'AGENT_TEST_ERROR'));
  await page.goto('/assistant'); await send(page, 'Giữ nháp của tôi'); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('Giữ nháp của tôi');
  await expect(page.getByRole('article', { name: 'Tin nhắn của bạn' })).toHaveCount(1);
  await expect(page.getByText(/RAW_PROVIDER|RAW_STACK/)).toHaveCount(0); expect(requests.length).toBe(1);
  if (status === 503) await expect(page.getByText(/Trợ lý AI chưa sẵn sàng/)).toBeVisible();
  await page.getByRole('button', { name: 'Thử lại yêu cầu' }).click(); await expect(page.getByText('Bạn muốn đi đâu?', { exact: true })).toBeVisible();
  expect(requests.length).toBe(2); await expect(page.getByTestId('agent-turn')).toHaveCount(1);
});
test('E401 expired session redirects and clears chat/account', async ({ page }) => {
  await setup(page, async route => reply(route, null, 401, 'TOKEN_EXPIRED')); await page.goto('/assistant'); await send(page, 'PRIVATE_OLD_MESSAGE');
  await expect(page).toHaveURL(/\/login$/); expect(await page.evaluate(() => localStorage.getItem('travelgo_token'))).toBeNull();
  await expect(page.getByText('PRIVATE_OLD_MESSAGE')).toHaveCount(0);
});
test('E000 network error preserves draft and never fabricates response', async ({ page }) => {
  await setup(page, async route => route.abort('failed')); await page.goto('/assistant'); await send(page, 'Nháp mất mạng');
  await expect(page.getByRole('alert')).toContainText('Không thể kết nối'); await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('Nháp mất mạng');
  await expect(page.getByRole('article', { name: 'Phản hồi Agent' })).toHaveCount(0);
});
test('U07 428 decline, explicit consent, no consent carried to next turn', async ({ page }) => {
  const requests = await setup(page, async (route, req) => req.externalProcessingConsent ? reply(route, response(req)) : reply(route, null, 428, 'AGENT_EXTERNAL_CONSENT_REQUIRED'));
  await page.goto('/assistant'); await send(page, 'Nháp xin phép'); await expect(page.getByRole('dialog')).toBeVisible();
  expect(requests.length).toBe(1); await expect(page.getByRole('button', { name: 'Từ chối', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Từ chối', exact: true }).click(); await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('Nháp xin phép');
  expect(requests.length).toBe(1); await page.getByRole('button', { name: 'Thử lại yêu cầu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.getByRole('button', { name: 'Đồng ý và gửi yêu cầu' }).click();
  await expect(page.getByText('Bạn muốn đi đâu?', { exact: true })).toBeVisible(); expect(requests[2].externalProcessingConsent).toBe(privacy.version);
  await send(page, 'Yêu cầu tiếp'); await expect(page.getByRole('dialog')).toBeVisible(); expect(requests[3].externalProcessingConsent).toBeUndefined();
});
test('U08 reset pending request and refresh remove memory history', async ({ page }) => {
  const held = gate();
  const requests = await setup(page, async (route, req, i) => { if (!i) await held.promise; await reply(route, response(req, { reply: i ? 'Kết quả mới' : 'KẾT_QUẢ_CŨ' })).catch(() => {}); });
  await page.goto('/assistant'); await send(page, 'Câu cũ'); await expect.poll(() => requests.length).toBe(1);
  await page.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click(); await send(page, 'Câu mới');
  await expect(page.getByText('Kết quả mới', { exact: true })).toBeVisible(); held.release();
  await expect(page.getByText('KẾT_QUẢ_CŨ')).toHaveCount(0); expect(requests[1].history).toEqual([]);
  await page.reload(); await expect(page.getByRole('heading', { name: 'Bạn muốn khám phá đâu?' })).toBeVisible();
  await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('');
  expect(await page.evaluate(() => Object.keys(localStorage).filter(k => /agent|chat|conversation/i.test(k)))).toEqual([]);
});
test('U09 logout/login B ignores delayed A response', async ({ page }) => {
  const held = gate(); const requests = await setup(page, async (route, req, i) => {
    if (!i) await held.promise; await reply(route, response(req, { reply: i ? 'Kết quả account B' : 'PRIVATE_A_RESULT' })).catch(() => {});
  });
  await page.goto('/assistant'); await send(page, 'PRIVATE_A_DRAFT'); await expect.poll(() => requests.length).toBe(1);
  await logout(page); await expect(page).toHaveURL(/\/login$/);
  await page.locator('input[name=email]').fill(b.email); await page.locator('input[name=password]').fill('MOCK_ONLY_Password');
  await page.getByRole('button', { name: 'Đăng nhập ngay' }).click(); await expect(page.getByRole('heading', { name: 'Trợ lý AI', exact: true })).toBeVisible();
  held.release(); await send(page, 'Account B'); await expect(page.getByText('Kết quả account B', { exact: true })).toBeVisible();
  await expect(page.getByText(/PRIVATE_A/)).toHaveCount(0); expect(requests[1].history).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('travelgo_token'))).toBe(tokenB);
});
test('U10 reader scrolling preserved; malformed API result safely rejected', async ({ page }) => {
  const held = gate(); const requests = await setup(page, async (route, req, i) => {
    if (i === 1) await held.promise;
    await reply(route, response(req, i === 2 ? { status: 'completed', result: { type: 'fake' } } : { status: 'completed', result: itinerary, reply: 'Kết quả dài' }));
  });
  await page.goto('/assistant'); await send(page); await expect(page.getByText('Kết quả dài', { exact: true })).toBeVisible();
  await send(page, 'Lượt 2'); await expect.poll(() => requests.length).toBe(2);
  const panel = page.getByRole('region', { name: 'Hội thoại' }); await panel.evaluate(el => { el.scrollTop = 0; el.dispatchEvent(new Event('scroll', { bubbles: true })); });
  held.release(); await expect(page.getByRole('button', { name: 'Xem tin nhắn mới' })).toBeVisible(); expect(await panel.evaluate(el => el.scrollTop)).toBe(0);
  await page.getByRole('button', { name: 'Xem tin nhắn mới' }).click(); await send(page, 'Malformed');
  await expect(page.getByRole('alert')).toContainText('Chưa nhận được kết quả hợp lệ');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
