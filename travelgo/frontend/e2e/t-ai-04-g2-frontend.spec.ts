// MOCK_ONLY browser integration. Actual React/Auth/Axios/controller. No real LLM/tool/DB.
import { test, expect, type Page, type Route } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
const a = { id: 'mock-a', fullName: 'MOCK_ONLY A', email: 'a@example.test', roles: ['CUSTOMER'] };
const b = { ...a, id: 'mock-b', fullName: 'MOCK_ONLY B', email: 'b@example.test' };
const tokenA = 'MOCK_ONLY_TOKEN_A', tokenB = 'MOCK_ONLY_TOKEN_B';
const id = '11111111-1111-4111-8111-111111111111', foreign = '22222222-2222-4222-8222-222222222222';
const privacy = { version: 'LOCAL_DEMO_SLOTS_V1', mode: 'LOCAL_DEMO', ttlSeconds: 900, enabled: true, text: 'MOCK_ONLY nguyên văn notice từ backend: slots chỉ giữ trong RAM, 15 phút, không lưu vào tài khoản.' };
const gate = () => { let release!: () => void; const promise = new Promise<void>(r => release = r); return { promise, release }; };
const ok = (route: Route, data: any) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
const fail = (route: Route, status: number, code: string, conversation?: any) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: false, code, conversation, message: 'RAW_SECRET_CANARY', stack: 'RAW_STACK_CANARY' }) });
type Env = { requests: any[]; calls: any[]; expiresAt: string; meta: (revision: number, patch?: any) => any; response: (request: any, patch?: any) => any; errors: string[] };
type Handler = (route: Route, request: any, index: number, env: Env) => Promise<any>;
async function setup(page: Page, options: { chat?: Handler; enabled?: boolean; reset?: (route: Route, env: Env) => Promise<any>; revoke?: (route: Route, env: Env) => Promise<any> } = {}) {
  const env: Env = { requests: [], calls: [], expiresAt: new Date(Date.now() + 900000).toISOString(), errors: [],
    meta: (revision, patch = {}) => ({ id, revision, expiresAt: env.expiresAt, mode: 'LOCAL_DEMO', persisted: false, ...patch }),
    response: (req, patch = {}) => ({ status: 'needs_input', reply: 'Bạn chưa chọn phương tiện.', missingFields: ['transportation'], history: [], historyTruncated: false,
      context: { mode: req.conversation ? 'LOCAL_DEMO_VERIFIED_HISTORY' : 'STATELESS', personalizationEnabled: false, behavioralDataUsed: false, persisted: false },
      ...(req.conversation ? { conversation: env.meta(req.conversation.action === 'start' ? 1 : req.conversation.revision + 1) } : {}), ...patch }) };
  (page as any).g2env = env;
  page.on('console', msg => { if (/RAW_SECRET|RAW_STACK/.test(msg.text())) env.errors.push(msg.text()); });
  page.on('pageerror', error => env.errors.push(String(error)));
  await page.route('**/*', async route => {
    const req = route.request(), url = new URL(req.url());
    if (url.hostname !== '127.0.0.1' || url.port !== '3352') return route.abort('blockedbyclient');
    if (!url.pathname.startsWith('/api/')) return route.continue();
    const body = req.postData() ? req.postDataJSON() : undefined, owner = req.headers().authorization === `Bearer ${tokenB}` ? 'B' : 'A';
    env.calls.push({ method: req.method(), path: url.pathname, body, owner });
    if (url.pathname === '/api/agent/chat') {
      env.requests.push(body); return options.chat ? options.chat(route, body, env.requests.length - 1, env) : ok(route, env.response(body));
    }
    if (url.pathname === '/api/agent/verified-history/privacy') return ok(route, { ...privacy, enabled: options.enabled !== false });
    if (url.pathname.endsWith('/reset')) return options.reset ? options.reset(route, env) : ok(route, env.meta(2));
    if (url.pathname.startsWith('/api/agent/verified-history') && req.method() === 'DELETE') return options.revoke ? options.revoke(route, env) : ok(route, { revoked: true });
    if (url.pathname === '/api/auth/me') return ok(route, owner === 'B' ? b : a);
    if (url.pathname === '/api/auth/login') return ok(route, { token: tokenB, user: b });
    if (url.pathname === '/api/intelligence/consent') return ok(route, { hasDecision: true, analyticsEnabled: false, personalizationEnabled: false, retentionDays: 90 });
    if (req.method() !== 'GET' || url.pathname.startsWith('/api/agent')) { env.errors.push(`UNEXPECTED_API:${req.method()}:${url.pathname}`); return route.abort(); }
    return ok(route, []);
  });
  await page.addInitScript(({ a, tokenA }) => {
    if (!sessionStorage.getItem('mock-g2-init')) {
      localStorage.setItem('travelgo_token', tokenA); localStorage.setItem('travelgo_user', JSON.stringify(a)); sessionStorage.setItem('mock-g2-init', 'true');
    }
  }, { a, tokenA });
  await page.goto('/assistant'); await expect(page.getByRole('heading', { name: 'Trợ lý AI', exact: true })).toBeVisible(); return env;
}
async function opt(page: Page) {
  await page.getByRole('button', { name: 'Dùng G2 local/demo', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.getByRole('button', { name: 'Đồng ý dùng G2 local/demo', exact: true }).click();
  await expect(page.getByText('Chế độ hiện tại: G2 · hội thoại local/demo', { exact: true })).toBeVisible();
}
async function send(page: Page, message = 'Lập lịch trình, tôi đã chọn xe máy') { await page.getByLabel('Yêu cầu du lịch của bạn').fill(message); await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); }
async function logout(page: Page) {
  if ((page.viewportSize()?.width || 1440) < 1024) await page.getByRole('button', { name: 'Mở menu', exact: true }).click();
  else await page.getByRole('button', { name: 'Menu tài khoản' }).click();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).filter({ visible: true }).click();
}
async function loginB(page: Page) { await page.locator('input[name=email]').fill(b.email); await page.locator('input[name=password]').fill('MOCK_ONLY_Password'); await page.getByRole('button', { name: 'Đăng nhập ngay' }).click(); }
async function spa(page: Page, path: string) { await page.evaluate(path => { history.pushState({}, '', path); dispatchEvent(new PopStateEvent('popstate')); }, path); }
async function screenshot(page: Page, name: string, project: string) { const dir = path.join(process.env.T_AI_04_G2_EVIDENCE!, 'g2', project); fs.mkdirSync(dir, { recursive: true }); await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true }); }
test.afterEach(async ({ page }, info) => {
  const env: Env = (page as any).g2env; if (!env) return;
  await screenshot(page, info.title.split(' ')[0], info.project.name);
  const dir = path.join(process.env.T_AI_04_G2_EVIDENCE!, 'g2', info.project.name);
  fs.writeFileSync(path.join(dir, `${info.title.split(' ')[0]}.json`), JSON.stringify({ tier: 'MOCK_ONLY', status: info.status, title: info.title, requests: env.requests, calls: env.calls, errors: env.errors, liveInference: 0, database: false, toolFidelity: 'NOT EVALUATED' }, null, 2), { flag: 'wx' });
  expect(env.errors).toEqual([]); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('D01 disabled notice keeps G1 and existing draft', async ({ page }) => {
  const env = await setup(page, { enabled: false }); await page.getByLabel('Yêu cầu du lịch của bạn').fill('G1 draft');
  await page.getByRole('button', { name: 'Dùng G2 local/demo', exact: true }).click(); await expect(page.getByText(/G2 demo chưa được bật/)).toBeVisible(); await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('G1 draft'); await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); await expect.poll(() => env.requests.length).toBe(1); expect(env.requests[0].conversation).toBeUndefined();
});
test('D01a enabled exact privacy separate acknowledgement no POST before send', async ({ page }, info) => {
  const env = await setup(page); await page.getByRole('button', { name: 'Dùng G2 local/demo', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toContainText(privacy.text); await expect(dialog).toContainText('15 phút'); await expect(dialog).toContainText('không tự bật');
  await expect(page.getByRole('button', { name: 'Từ chối', exact: true })).toBeFocused(); await screenshot(page, 'D01a-notice', info.project.name);
  await page.getByRole('button', { name: 'Từ chối', exact: true }).click(); expect(env.requests.length).toBe(0); await opt(page); expect(env.requests.length).toBe(0);
});
test('D02 start continue current message exact ID revision UUID no history authority', async ({ page }) => {
  const env = await setup(page); await opt(page); await send(page); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled();
  await send(page, 'Đổi ngân sách thành 9 triệu, đến Huế, về 20/6/2030'); await expect.poll(() => env.requests.length).toBe(2);
  expect(Object.keys(env.requests[0]).sort()).toEqual(['conversation', 'message']); expect(env.requests[0].conversation.action).toBe('start'); expect(env.requests[0].conversation.id).toBeUndefined();
  expect(env.requests[1].conversation).toMatchObject({ action: 'continue', id, revision: 1, consentVersion: privacy.version });
  expect(env.requests[1].conversation.requestId).not.toBe(env.requests[0].conversation.requestId); expect(env.requests[1].message).toBe('Đổi ngân sách thành 9 triệu, đến Huế, về 20/6/2030');
  for (const req of env.requests) expect(Object.keys(req).sort()).toEqual(['conversation', 'message']);
});
test('D03 neutral redundant clarify no auto-resend then both explicit confirmations', async ({ page }) => {
  const env = await setup(page); await opt(page); await send(page); await expect(page.getByText('Agent đang yêu cầu bạn xác nhận lại phương tiện.', { exact: true })).toBeVisible();
  await expect(page.getByText('Bạn chưa chọn phương tiện.', { exact: true })).toHaveCount(0); expect(env.requests.length).toBe(1);
  await page.getByRole('button', { name: 'Xe máy', exact: true }).click(); await expect.poll(() => env.requests.length).toBe(2); await expect(page.getByRole('button', { name: 'Ô tô', exact: true })).toBeEnabled();
  expect(env.requests[1].message).toBe('Phương tiện: motorbike'); await page.getByRole('button', { name: 'Ô tô', exact: true }).click(); await expect.poll(() => env.requests.length).toBe(3);
  await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled(); expect(env.requests[2].message).toBe('Phương tiện: car'); expect(env.requests[2].conversation.revision).toBe(2);
  expect(env.requests.length).toBe(3); await expect(page.getByRole('link', { name: 'Dùng Planner', exact: true })).toBeVisible(); await send(page, 'Tôi sửa bằng tay'); await expect.poll(() => env.requests.length).toBe(4);
});
test('D07 unchanged gate result asks exact missing fields without fabricated itinerary', async ({ page }) => {
  const env = await setup(page, { chat: async (route, req, _i, e) => ok(route, e.response(req, { missingFields: ['totalBudget', 'destinationCity'], reply: 'Cần xác nhận ngân sách và điểm đến theo phản hồi máy chủ.' })) });
  await opt(page); await send(page, 'Đổi từ ô tô sang xe máy, đến Huế, ngân sách 7 triệu'); await expect(page.getByText('Cần xác nhận ngân sách và điểm đến theo phản hồi máy chủ.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toHaveCount(0); expect(env.requests.length).toBe(1); expect(env.calls.filter(x => /planner|catalog|trips|bookings/.test(x.path))).toEqual([]);
});
test('D09 committed timeout revision retained explicit fresh retry no duplicate message', async ({ page }) => {
  const env = await setup(page, { chat: async (route, req, i, e) => i === 0 ? fail(route, 504, 'AGENT_TIMEOUT', e.meta(1)) : ok(route, e.response(req)) });
  await opt(page); await send(page); await expect(page.getByRole('alert')).toContainText('quá thời gian'); expect(env.requests.length).toBe(1); await expect(page.getByText(/RAW_SECRET|RAW_STACK/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Thử lại yêu cầu' }).click(); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled();
  expect(env.requests[1].conversation.revision).toBe(1); expect(env.requests[1].conversation.requestId).not.toBe(env.requests[0].conversation.requestId); await expect(page.getByTestId('agent-turn')).toHaveCount(1);
});
test('D09a foreign continue metadata blocked not adopted or retried', async ({ page }) => {
  const env = await setup(page, { chat: async (route, req, i, e) => i === 0 ? ok(route, e.response(req)) : fail(route, 504, 'AGENT_TIMEOUT', e.meta(2, { id: foreign })) });
  await opt(page); await send(page); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled(); await send(page, 'Lượt hai'); await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Thử lại yêu cầu' })).toBeDisabled(); await expect(page.getByText(/Không xác nhận được revision mới/)).toBeVisible(); expect(env.requests.length).toBe(2);
});
for (const code of ['AGENT_G2_REVISION_CONFLICT', 'AGENT_G2_REPLAY']) test(`D10-${code} no automatic retry no duplicate turn`, async ({ page }) => {
  const env = await setup(page, { chat: async route => fail(route, 409, code, { id: foreign }) }); await opt(page); await send(page);
  await expect(page.getByRole('alert')).toContainText('Phiên đã thay đổi'); await expect(page.getByRole('button', { name: 'Thử lại yêu cầu' })).toBeDisabled(); await expect(page.getByTestId('agent-turn')).toHaveCount(1); expect(env.requests.length).toBe(1);
});
test('D11 session unavailable fresh acknowledgement start without old client proof', async ({ page }) => {
  const env = await setup(page, { chat: async (route, req, i, e) => i === 1 ? fail(route, 404, 'AGENT_G2_SESSION_UNAVAILABLE') : ok(route, e.response(req)) });
  await opt(page); await send(page); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled(); await send(page, 'Continue'); await expect(page.getByRole('alert')).toContainText('không còn khả dụng');
  await page.getByRole('button', { name: 'Bắt đầu phiên G2 mới' }).click(); await page.getByRole('button', { name: 'Đồng ý dùng G2 local/demo' }).click(); await send(page, 'New');
  await expect.poll(() => env.requests.length).toBe(3); expect(env.requests[2].conversation.action).toBe('start'); expect(env.requests[2].history).toBeUndefined(); await expect(page.getByTestId('agent-turn')).toHaveCount(1);
});
test('D11a expiry cannot send and reload returns G1 no reconstructed state', async ({ page }) => {
  await page.clock.install(); const env = await setup(page); await opt(page); await send(page, 'PRIVATE_OLD'); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled();
  await page.clock.fastForward(901000); await expect(page.getByText(/Phiên G2 đã đến thời hạn/)).toBeVisible(); await page.getByLabel('Yêu cầu du lịch của bạn').fill('Expired send'); await expect(page.getByRole('button', { name: 'Gửi yêu cầu', exact: true })).toBeDisabled(); expect(env.requests.length).toBe(1);
  await page.reload(); await expect(page.getByText('Chế độ hiện tại: G1 · không lưu ngữ cảnh máy chủ')).toBeVisible(); await expect(page.getByText('PRIVATE_OLD', { exact: true })).toHaveCount(0); await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('');
  const stored = await page.evaluate(() => ({ keys: Object.keys(localStorage).filter(k => /agent|conversation|chat/.test(k)), hint: sessionStorage.getItem('travelgo_agent_g2_participation') }));
  expect(stored.keys).toEqual([]); expect(Object.keys(JSON.parse(stored.hint!)).sort()).toEqual(['owner', 'stamp', 'until']);
});
test('D12 reset cancels in-flight turn follows response revision and blocks late reply', async ({ page }) => {
  const held = gate(); const env = await setup(page, { chat: async (route, req, i, e) => { if (i === 1) await held.promise; return ok(route, e.response(req, { reply: i === 1 ? 'STALE_REPLY' : 'Current reply' })).catch(() => {}); }, reset: async (route, e) => ok(route, e.meta(3)) });
  await opt(page); await send(page); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled(); await send(page, 'Pending'); await expect.poll(() => env.requests.length).toBe(2);
  await page.getByRole('button', { name: 'Đặt lại phiên G2' }).click(); await expect(page.getByText(/Đã đặt lại/)).toBeVisible(); held.release(); await send(page, 'After reset'); await expect.poll(() => env.requests.length).toBe(3);
  expect(env.requests[2].conversation.revision).toBe(3); expect(env.calls.find(x => x.path.endsWith('/reset'))).toMatchObject({ owner: 'A', method: 'POST', body: {} }); await expect(page.getByText('STALE_REPLY')).toHaveCount(0);
});
test('D12a end active session uses revoke-one clears UI without JWT claim', async ({ page }) => {
  const env = await setup(page); await opt(page); await send(page, 'PRIVATE_END'); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Kết thúc phiên G2' }).click(); await expect(page.getByText('Đã kết thúc phiên G2 được yêu cầu.')).toBeVisible(); await expect(page.getByTestId('agent-turn')).toHaveCount(0);
  expect(env.calls.filter(x => x.method === 'DELETE').map(x => x.path)).toEqual([`/api/agent/verified-history/${id}`]); expect(await page.evaluate(() => !!localStorage.getItem('travelgo_token'))).toBe(true);
});
test('D12b end unknown pending start revoke-all fences late response', async ({ page }) => {
  const held = gate(); const env = await setup(page, { chat: async (route, req, _i, e) => { await held.promise; return ok(route, e.response(req, { reply: 'STALE_START' })).catch(() => {}); } });
  await opt(page); await send(page); await expect.poll(() => env.requests.length).toBe(1); await page.getByRole('button', { name: 'Kết thúc phiên G2' }).click(); await expect(page.getByText('Đã kết thúc phiên G2 được yêu cầu.')).toBeVisible(); held.release();
  expect(env.calls.filter(x => x.method === 'DELETE').map(x => x.path)).toEqual(['/api/agent/verified-history']); await expect(page.getByText('STALE_START')).toHaveCount(0);
});
for (const failure of [false, true]) test(`D13-${failure ? 'offline' : 'success'} logout best effort old A response never enters B`, async ({ page }) => {
  const held = gate(), revokeHeld = gate(); const env = await setup(page, { chat: async (route, req, i, e) => { if (i === 0) await held.promise; return ok(route, e.response(req, { reply: i === 0 ? 'PRIVATE_A_REPLY' : 'B reply' })).catch(() => {}); }, revoke: async route => { if (failure) { await revokeHeld.promise; return fail(route, 401, 'TOKEN_EXPIRED').catch(() => {}); } return ok(route, { revoked: true }); } });
  await opt(page); await send(page, 'PRIVATE_A_MESSAGE'); await expect.poll(() => env.requests.length).toBe(1); await logout(page); await expect(page).toHaveURL(/\/login$/); await expect.poll(() => env.calls.filter(x => x.method === 'DELETE').length).toBe(1);
  expect(env.calls.find(x => x.method === 'DELETE')?.owner).toBe('A'); expect(await page.evaluate(() => localStorage.getItem('travelgo_token'))).toBeNull();
  await loginB(page); await expect(page.getByRole('heading', { name: 'Trợ lý AI', exact: true })).toBeVisible(); held.release(); revokeHeld.release(); await send(page, 'Account B'); await expect(page.getByText('B reply', { exact: true })).toBeVisible();
  await expect(page.getByText(/PRIVATE_A/)).toHaveCount(0); expect(env.requests[1].history).toEqual([]); expect(env.requests[1].conversation).toBeUndefined(); expect(await page.evaluate(() => localStorage.getItem('travelgo_token'))).toBe(tokenB);
});
test('D13a direct SPA account switch revokes A and starts B with no shared state', async ({ page }) => {
  const env = await setup(page); await opt(page); await send(page, 'PRIVATE_A'); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled();
  await spa(page, '/login'); await loginB(page); await expect(page).toHaveURL(/\/$/); await spa(page, '/assistant'); await expect(page.getByText('Chế độ hiện tại: G1 · không lưu ngữ cảnh máy chủ')).toBeVisible();
  await expect.poll(() => env.calls.filter(x => x.method === 'DELETE').length).toBe(1); expect(env.calls.find(x => x.method === 'DELETE')?.owner).toBe('A'); await expect(page.getByText('PRIVATE_A', { exact: true })).toHaveCount(0); await expect(page.getByRole('button', { name: 'Thử xóa các phiên G2 trước' })).toHaveCount(0);
});
test('D13b reload loses proof but logout still attempts cleanup using tab hint', async ({ page }) => {
  const env = await setup(page); await opt(page); await send(page); await expect(page.getByRole('button', { name: 'Xe máy', exact: true })).toBeEnabled(); await page.reload();
  await expect(page.getByRole('button', { name: 'Thử xóa các phiên G2 trước' })).toBeVisible(); await logout(page); await expect(page).toHaveURL(/\/login$/); await expect.poll(() => env.calls.filter(x => x.method === 'DELETE').length).toBe(1);
});
test('D14 quota no auto retry and synchronous duplicate submit blocked', async ({ page }) => {
  const held = gate(); const env = await setup(page, { chat: async route => { await held.promise; return fail(route, 429, 'AGENT_RATE_LIMITED'); } }); await opt(page); await page.getByLabel('Yêu cầu du lịch của bạn').fill('Quota'); await page.getByLabel('Yêu cầu du lịch của bạn').press('Enter');
  await expect(page.getByRole('button', { name: 'Đang gửi…' })).toBeDisabled(); await expect.poll(() => env.requests.length).toBe(1); held.release(); await expect(page.getByRole('alert')).toContainText('giới hạn sử dụng'); expect(env.requests.length).toBe(1);
});
test('D15 mocked completed render vs malformed provenance rejection never fake fidelity', async ({ page }) => {
  const env = await setup(page, { chat: async (route, req, i, e) => ok(route, e.response(req, { status: 'completed', reply: 'MOCK_ONLY rendering fixture, not Catalog fidelity.', result: i ? { type: 'fake', source: 'MOCK_PROVIDER' } : { type: 'places', source: 'RecommendationService', warnings: ['MOCK_ONLY không phải dữ liệu thật.'], places: [{ id: 'mock-free', name: 'MOCK_ONLY rendering item', priceFrom: 0, catalogPriceAvailable: true }] } })) });
  await opt(page); await send(page); await expect(page.getByText('MOCK_ONLY rendering item')).toBeVisible(); await expect(page.getByText('Giá từ 0 ₫')).toBeVisible(); await send(page, 'Malformed'); await expect(page.getByRole('alert')).toContainText('Chưa nhận được kết quả hợp lệ');
  await expect(page.getByRole('button', { name: 'Thử lại yêu cầu' })).toBeDisabled(); expect(env.requests.length).toBe(2); expect(env.calls.filter(x => /catalog|planner|trips|bookings/.test(x.path))).toEqual([]);
});
