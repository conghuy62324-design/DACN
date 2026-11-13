# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t-ai-02-assistant-ui.spec.ts >> U02 Partner-only route denied, no new role permission
- Location: e2e\t-ai-02-assistant-ui.spec.ts:85:1

# Error details

```
TypeError: The "path" argument must be of type string. Received undefined
```

# Page snapshot

```yaml
- generic [ref=e4]:
  - paragraph [ref=e9]: 403 · FORBIDDEN
  - heading "Bạn không có quyền truy cập" [level=1] [ref=e10]
  - paragraph [ref=e11]: Tài khoản hiện tại chưa được cấp vai trò phù hợp cho khu vực này.
  - link "Quay về HuGo Travel" [ref=e12] [cursor=pointer]:
    - /url: /
```

# Test source

```ts
  1   | // MOCK_ONLY API/auth fixtures. Real browser/components/client; no backend/DB/LLM.
  2   | import { test, expect, type Page, type Route } from '@playwright/test';
  3   | import fs from 'node:fs';
  4   | import path from 'node:path';
  5   | 
  6   | const a = { id: 'mock-customer-a', fullName: 'Mock Customer A', email: 'a@example.test', roles: ['CUSTOMER'] };
  7   | const b = { ...a, id: 'mock-customer-b', fullName: 'Mock Customer B', email: 'b@example.test' };
  8   | const tokenA = 'MOCK_ONLY_TOKEN_A', tokenB = 'MOCK_ONLY_TOKEN_B';
  9   | const privacy = { version: 'external-chat-v1', text: 'MOCK_ONLY notice: Tin nhắn và lịch sử sẽ được gửi tới Google. Bạn có thể từ chối và dùng Planner.' };
  10  | const base = { historyTruncated: false, context: { mode: 'STATELESS', personalizationEnabled: false, behavioralDataUsed: false, persisted: false } };
  11  | const response = (request: any, patch: any = {}) => ({ ...base, status: 'needs_input', missingFields: ['destinationCity'], reply: 'Bạn muốn đi đâu?',
  12  |   history: [...(request.history || []), { role: 'user', content: request.message }, { role: 'assistant', content: patch.reply || 'Bạn muốn đi đâu?' }], ...patch });
  13  | const places = { type: 'places', source: 'RecommendationService', warnings: ['Giá Catalog chưa phải báo giá đặt dịch vụ.'], places: [
  14  |   { id: 'mock-free', name: 'MOCK_ONLY Công viên miễn phí', city: 'Đà Nẵng', priceFrom: 0, catalogPriceAvailable: true },
  15  |   { id: 'mock-unknown', name: 'MOCK_ONLY Giá chưa có', city: 'Đà Nẵng', priceFrom: null, catalogPriceAvailable: false },
  16  | ] };
  17  | const itinerary = { type: 'itinerary', source: 'TourPlannerService', warnings: ['MOCK_ONLY Chi phí chưa gồm di chuyển liên tỉnh.'],
  18  |   cost: { currency: 'VND', basis: 'GROUP_VND_V1', estimated: 1250000, budget: 1000000, overBudget: 250000, budgetStatus: 'over_budget' },
  19  |   itinerary: { id: 'mock-plan', title: 'MOCK_ONLY Lịch trình Đà Nẵng', destinationCity: 'Đà Nẵng', startDate: '2030-06-15', endDate: '2030-06-15',
  20  |     budgetAdvice: 'MOCK_ONLY Hãy cân nhắc tăng ngân sách.', costAssumptions: ['MOCK_ONLY Dự toán cho cả nhóm.'], constraintViolations: ['BUDGET_EXCEEDED'],
  21  |     days: [{ date: '2030-06-15', themeTitle: 'Khám phá thành phố', dayEstimatedCostVND: 1250000, lodgingEstimatedCostVND: 0,
  22  |       activities: [{ id: 'mock-activity', title: 'MOCK_ONLY Điểm tham quan', description: 'Dữ liệu kiểm thử UI', estimatedCostVND: 1250000, costSource: 'MOCK_ONLY Catalog fixture' }] }] } };
  23  | const reply = (route: Route, data: unknown, status = 200, code = '') => route.fulfill({ status, contentType: 'application/json',
  24  |   body: JSON.stringify(status < 400 ? { success: true, data } : { success: false, code, message: 'RAW_PROVIDER_SECRET_CANARY', stack: 'RAW_STACK_CANARY' }) });
  25  | const gate = () => { let release!: () => void; const promise = new Promise<void>(r => release = r); return { promise, release }; };
  26  | type Handler = (route: Route, request: any, index: number) => Promise<void>;
  27  | 
  28  | async function setup(page: Page, handler: Handler = async (route, request) => reply(route, response(request)), user: any = a) {
  29  |   const requests: any[] = []; const errors: string[] = [];
  30  |   (page as any).agentRequests = requests;
  31  |   page.on('console', msg => { if (msg.text().includes('RAW_')) errors.push(msg.text()); });
  32  |   (page as any).secretLogs = errors;
  33  |   await page.route('**/api/**', async route => {
  34  |     const url = new URL(route.request().url());
  35  |     if (url.pathname === '/api/agent/chat') {
  36  |       const body = route.request().postDataJSON(); requests.push(body); await handler(route, body, requests.length - 1); return;
  37  |     }
  38  |     if (url.pathname === '/api/agent/privacy') return reply(route, privacy);
  39  |     if (url.pathname === '/api/auth/me') return reply(route, route.request().headers().authorization === `Bearer ${tokenB}` ? b : user);
  40  |     if (url.pathname === '/api/auth/login') return reply(route, { token: tokenB, user: b });
  41  |     if (url.pathname === '/api/intelligence/consent') return reply(route, { hasDecision: true, analyticsEnabled: false, personalizationEnabled: false, retentionDays: 90 });
  42  |     if (route.request().method() !== 'GET') throw new Error(`Unexpected mutation ${url.pathname}`);
  43  |     return reply(route, []);
  44  |   });
  45  |   await page.addInitScript(({ user, tokenA }) => {
  46  |     if (!sessionStorage.getItem('t-ai-02-initialized')) {
  47  |       if (user) { localStorage.setItem('travelgo_token', tokenA); localStorage.setItem('travelgo_user', JSON.stringify(user)); }
  48  |       sessionStorage.setItem('t-ai-02-initialized', 'true');
  49  |     }
  50  |   }, { user, tokenA });
  51  |   return requests;
  52  | }
  53  | async function send(page: Page, message = 'Tôi muốn đi du lịch') {
  54  |   await page.getByLabel('Yêu cầu du lịch của bạn').fill(message);
  55  |   await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click();
  56  | }
  57  | async function menu(page: Page) {
  58  |   if ((page.viewportSize()?.width || 1440) < 1024) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  59  | }
  60  | async function assistantNav(page: Page) {
  61  |   await menu(page); await page.getByRole('button', { name: 'Tour & Lịch trình', exact: true }).filter({ visible: true }).click();
  62  |   await page.getByRole('link', { name: 'Trợ lý AI', exact: false }).filter({ visible: true }).click();
  63  | }
  64  | async function logout(page: Page) {
  65  |   if ((page.viewportSize()?.width || 1440) < 1024) await menu(page);
  66  |   else await page.getByRole('button', { name: 'Menu tài khoản' }).click();
  67  |   await page.getByRole('button', { name: 'Đăng xuất', exact: true }).filter({ visible: true }).click();
  68  | }
  69  | test.afterEach(async ({ page }, info) => {
> 70  |   const dir = path.join(process.env.T_AI_02_EVIDENCE!, info.project.name); fs.mkdirSync(dir, { recursive: true });
      |                    ^ TypeError: The "path" argument must be of type string. Received undefined
  71  |   const id = info.title.split(' ')[0];
  72  |   await page.screenshot({ path: path.join(dir, `${id}.png`), fullPage: true });
  73  |   fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({ tier: 'MOCK_ONLY', title: info.title, status: info.status,
  74  |     requests: (page as any).agentRequests || [], rawSecretLogs: (page as any).secretLogs || [], database: 'NOT USED', liveLLM: 'NOT RUN' }, null, 2));
  75  |   expect((page as any).secretLogs || []).toEqual([]);
  76  | });
  77  | 
  78  | test('U01 anonymous redirect and Customer navigation', async ({ page }) => {
  79  |   await setup(page, undefined, null); await page.goto('/assistant'); await expect(page).toHaveURL(/\/login$/);
  80  |   await page.locator('input[name=email]').fill(b.email); await page.locator('input[name=password]').fill('MOCK_ONLY_Password');
  81  |   await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
  82  |   await expect(page.getByRole('heading', { name: 'Trợ lý AI', exact: true })).toBeVisible();
  83  |   await assistantNav(page); await expect(page).toHaveURL(/\/assistant$/);
  84  | });
  85  | test('U02 Partner-only route denied, no new role permission', async ({ page }) => {
  86  |   await setup(page, undefined, { ...a, roles: ['PARTNER'] }); await page.goto('/assistant'); await expect(page).toHaveURL(/\/403$/);
  87  | });
  88  | test('U03 keyboard, double-submit, multi-turn uses server history', async ({ page }) => {
  89  |   const held = gate();
  90  |   const requests = await setup(page, async (route, req, i) => { if (!i) await held.promise; await reply(route, response(req)); });
  91  |   await page.goto('/assistant'); const input = page.getByLabel('Yêu cầu du lịch của bạn');
  92  |   await input.fill('Tôi đi'); await input.press('Shift+Enter'); await input.press('End'); await input.type('Đà Nẵng');
  93  |   expect(await input.inputValue()).toContain('\n'); await input.press('Enter');
  94  |   await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled(); await expect.poll(() => requests.length).toBe(1);
  95  |   held.release(); await expect(page.getByText('Bạn muốn đi đâu?', { exact: true })).toBeVisible();
  96  |   await send(page, 'Hội An'); await expect.poll(() => requests.length).toBe(2);
  97  |   expect(requests[1].history).toEqual(response(requests[0]).history); expect(requests[1].externalProcessingConsent).toBeUndefined();
  98  | });
  99  | test('U04 unsupported and tool unavailable are honest states', async ({ page }) => {
  100 |   await setup(page, async (route, req, i) => reply(route, response(req, i ? { status: 'tool_unavailable', warningCode: 'AGENT_CATALOG_INSUFFICIENT', reply: 'Catalog chưa đủ dữ liệu.' } : { status: 'unsupported', reply: 'Chưa hỗ trợ đặt dịch vụ.' })));
  101 |   await page.goto('/assistant'); await send(page); await expect(page.getByText('Chưa hỗ trợ đặt dịch vụ.')).toBeVisible();
  102 |   await send(page, 'Tạo lịch trình'); await expect(page.getByText('Catalog chưa đủ dữ liệu.')).toBeVisible();
  103 |   await expect(page.getByRole('link', { name: 'Mở Planner', exact: true })).toBeVisible();
  104 | });
  105 | test('U05 Catalog shows zero, missing price and escaped HTML', async ({ page }) => {
  106 |   await setup(page, async (route, req) => reply(route, response(req, { status: 'completed', reply: '<img src=x onerror=alert(1)>', result: places })));
  107 |   await page.goto('/assistant'); await send(page); await expect(page.getByText('Giá từ 0 ₫')).toBeVisible();
  108 |   await expect(page.getByText('Chưa có giá trong Catalog')).toBeVisible(); await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
  109 |   await expect(page.getByRole('region', { name: 'Hội thoại' }).locator('img')).toHaveCount(0);
  110 | });
  111 | test('U06 Planner costs, assumptions and warnings render without repricing', async ({ page }) => {
  112 |   await setup(page, async (route, req) => reply(route, response(req, { status: 'completed', reply: 'Lịch trình tham khảo.', result: itinerary })));
  113 |   await page.goto('/assistant'); await send(page); await expect(page.getByText('MOCK_ONLY Lịch trình Đà Nẵng', { exact: true })).toBeVisible();
  114 |   await expect(page.getByText('Vượt ngân sách: 250.000 ₫')).toBeVisible(); await expect(page.getByText(/GROUP_VND_V1/)).toBeVisible();
  115 |   await page.getByText('Giả định chi phí', { exact: true }).click(); await expect(page.getByText('MOCK_ONLY Dự toán cho cả nhóm.')).toBeVisible();
  116 |   await page.getByText('MOCK_ONLY Chi phí chưa gồm di chuyển liên tỉnh.').scrollIntoViewIfNeeded();
  117 |   await expect(page.getByText('MOCK_ONLY Chi phí chưa gồm di chuyển liên tỉnh.')).toBeVisible();
  118 |   await expect(page.getByRole('button', { name: /Lưu chuyến|Đặt dịch vụ/ })).toHaveCount(0);
  119 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  120 | });
  121 | for (const status of [400, 429, 502, 503, 504]) test(`E${status} safe error, preserve draft and manual retry`, async ({ page }) => {
  122 |   const requests = await setup(page, async (route, req, i) => i ? reply(route, response(req)) : reply(route, null, status, status === 503 ? 'AGENT_PROVIDER_NOT_CONFIGURED' : 'AGENT_TEST_ERROR'));
  123 |   await page.goto('/assistant'); await send(page, 'Giữ nháp của tôi'); await expect(page.getByRole('alert')).toBeVisible();
  124 |   await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('Giữ nháp của tôi');
  125 |   await expect(page.getByRole('article', { name: 'Tin nhắn của bạn' })).toHaveCount(1);
  126 |   await expect(page.getByText(/RAW_PROVIDER|RAW_STACK/)).toHaveCount(0); expect(requests.length).toBe(1);
  127 |   if (status === 503) await expect(page.getByText(/Trợ lý AI chưa sẵn sàng/)).toBeVisible();
  128 |   await page.getByRole('button', { name: 'Thử lại yêu cầu' }).click(); await expect(page.getByText('Bạn muốn đi đâu?', { exact: true })).toBeVisible();
  129 |   expect(requests.length).toBe(2); await expect(page.getByTestId('agent-turn')).toHaveCount(1);
  130 | });
  131 | test('E401 expired session redirects and clears chat/account', async ({ page }) => {
  132 |   await setup(page, async route => reply(route, null, 401, 'TOKEN_EXPIRED')); await page.goto('/assistant'); await send(page, 'PRIVATE_OLD_MESSAGE');
  133 |   await expect(page).toHaveURL(/\/login$/); expect(await page.evaluate(() => localStorage.getItem('travelgo_token'))).toBeNull();
  134 |   await expect(page.getByText('PRIVATE_OLD_MESSAGE')).toHaveCount(0);
  135 | });
  136 | test('E000 network error preserves draft and never fabricates response', async ({ page }) => {
  137 |   await setup(page, async route => route.abort('failed')); await page.goto('/assistant'); await send(page, 'Nháp mất mạng');
  138 |   await expect(page.getByRole('alert')).toContainText('Không thể kết nối'); await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('Nháp mất mạng');
  139 |   await expect(page.getByRole('article', { name: 'Phản hồi Agent' })).toHaveCount(0);
  140 | });
  141 | test('U07 428 decline, explicit consent, no consent carried to next turn', async ({ page }) => {
  142 |   const requests = await setup(page, async (route, req) => req.externalProcessingConsent ? reply(route, response(req)) : reply(route, null, 428, 'AGENT_EXTERNAL_CONSENT_REQUIRED'));
  143 |   await page.goto('/assistant'); await send(page, 'Nháp xin phép'); await expect(page.getByRole('dialog')).toBeVisible();
  144 |   expect(requests.length).toBe(1); await expect(page.getByRole('button', { name: 'Từ chối', exact: true })).toBeFocused();
  145 |   await page.getByRole('button', { name: 'Từ chối', exact: true }).click(); await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('Nháp xin phép');
  146 |   expect(requests.length).toBe(1); await page.getByRole('button', { name: 'Thử lại yêu cầu' }).click();
  147 |   await expect(page.getByRole('dialog')).toBeVisible(); await page.getByRole('button', { name: 'Đồng ý và gửi yêu cầu' }).click();
  148 |   await expect(page.getByText('Bạn muốn đi đâu?', { exact: true })).toBeVisible(); expect(requests[2].externalProcessingConsent).toBe(privacy.version);
  149 |   await send(page, 'Yêu cầu tiếp'); await expect(page.getByRole('dialog')).toBeVisible(); expect(requests[3].externalProcessingConsent).toBeUndefined();
  150 | });
  151 | test('U08 reset pending request and refresh remove memory history', async ({ page }) => {
  152 |   const held = gate();
  153 |   const requests = await setup(page, async (route, req, i) => { if (!i) await held.promise; await reply(route, response(req, { reply: i ? 'Kết quả mới' : 'KẾT_QUẢ_CŨ' })).catch(() => {}); });
  154 |   await page.goto('/assistant'); await send(page, 'Câu cũ'); await expect.poll(() => requests.length).toBe(1);
  155 |   await page.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click(); await send(page, 'Câu mới');
  156 |   await expect(page.getByText('Kết quả mới', { exact: true })).toBeVisible(); held.release();
  157 |   await expect(page.getByText('KẾT_QUẢ_CŨ')).toHaveCount(0); expect(requests[1].history).toEqual([]);
  158 |   await page.reload(); await expect(page.getByRole('heading', { name: 'Bạn muốn khám phá đâu?' })).toBeVisible();
  159 |   await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('');
  160 |   expect(await page.evaluate(() => Object.keys(localStorage).filter(k => /agent|chat|conversation/i.test(k)))).toEqual([]);
  161 | });
  162 | test('U09 logout/login B ignores delayed A response', async ({ page }) => {
  163 |   const held = gate(); const requests = await setup(page, async (route, req, i) => {
  164 |     if (!i) await held.promise; await reply(route, response(req, { reply: i ? 'Kết quả account B' : 'PRIVATE_A_RESULT' })).catch(() => {});
  165 |   });
  166 |   await page.goto('/assistant'); await send(page, 'PRIVATE_A_DRAFT'); await expect.poll(() => requests.length).toBe(1);
  167 |   await logout(page); await expect(page).toHaveURL(/\/login$/);
  168 |   await page.locator('input[name=email]').fill(b.email); await page.locator('input[name=password]').fill('MOCK_ONLY_Password');
  169 |   await page.getByRole('button', { name: 'Đăng nhập ngay' }).click(); await expect(page.getByRole('heading', { name: 'Trợ lý AI', exact: true })).toBeVisible();
  170 |   held.release(); await send(page, 'Account B'); await expect(page.getByText('Kết quả account B', { exact: true })).toBeVisible();
```