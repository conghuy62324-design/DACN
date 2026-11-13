# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t13a-core.spec.ts >> D_SAVED_EDITOR saved Trip exposes activity edit/remove/reorder/save controls
- Location: e2e\t13a-core.spec.ts:204:1

# Error details

```
Error: Saved Trip has no activity editor; preferences editor is a different feature

expect(received).toBeGreaterThan(expected)

Expected: > 0
Received:   0
```

# Test source

```ts
  109 |   return { id: actual.id, total: actual.totalEstimatedCostVND, selectedPlaceIds: actual.selectedPlaceIds, budgetStatus: actual.budgetStatus, overBudgetVND: actual.overBudgetVND };
  110 | }
  111 | 
  112 | test.beforeAll(async ({}, worker) => {
  113 |   await schema(); fixtures = new Fixtures(process.env.T13A_EVIDENCE!, worker.project.name); await fixtures.create();
  114 | });
  115 | test.afterAll(async () => { try { if (fixtures) await fixtures.cleanup(); } finally { await sequelize.close(); } });
  116 | test.beforeEach(async ({ page }, testInfo) => {
  117 |   info = testInfo; matrix = []; traffic = []; external = [];
  118 |   page.on('response', r => { if (new URL(r.url()).origin === new URL(info.project.use.baseURL || `http://127.0.0.1:${process.env.PLAYWRIGHT_FRONTEND_PORT}`).origin && r.url().includes('/api/')) traffic.push({ method: r.request().method(), path: new URL(r.url()).pathname, status: r.status() }); });
  119 |   page.on('requestfailed', r => { if (!r.url().includes('/api/')) external.push({ url: r.url().split('?')[0], error: r.failure()?.errorText }); });
  120 |   await page.goto('/');
  121 |   await step('ENV_PROXY_DB', 'Frontend proxy reaches this run backend and exact test DB', async () => {
  122 |     const response = await page.evaluate(async () => (await fetch('/api/__t13a/identity')).json());
  123 |     expect(response.runId).toBe(process.env.T13A_RUN_ID); expect(response.database).toBe('travelgo_ai_m0_test');
  124 |     expect(response.host).toBe('127.0.0.1'); expect(response.nodeEnv).toBe('test');
  125 |     expect(response.port).toBe(Number(process.env.PLAYWRIGHT_BACKEND_PORT)); return response;
  126 |   });
  127 | });
  128 | test.afterEach(async ({ page }, testInfo) => {
  129 |   if (testInfo.errors.length && !matrix.some(v => v.status === 'FAIL')) matrix.push({ id: 'UNHANDLED_ASSERTION', status: 'FAIL', actual: testInfo.errors.map(v => v.message) });
  130 |   await fixtures?.discover();
  131 |   write(path.join(out(), `${testInfo.title.split(' ')[0]}-results.json`), { title: testInfo.title, project: testInfo.project.name, viewport: page.viewportSize(), browser: 'Microsoft Edge Chromium headless', mobile: testInfo.project.name === 'mobile' ? 'viewport/touch emulation, not physical device' : false, matrix, traffic, external, testStatus: testInfo.status });
  132 | });
  133 | 
  134 | test('A_AUTH UI register/login/Profile/logout/account-switch/invalid-expired', async ({ page }) => {
  135 |   const a = await step('AUTH_REGISTER_A', 'Registration through UI persists CUSTOMER account', () => register(page, 'AuthA'));
  136 |   await step('PROFILE_A', 'DB-backed profile and reload show A', async () => { await page.goto('/profile'); await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible(); await expect(page.getByTestId('profile-phone')).toHaveText('0901234567'); await page.reload(); await expect(page.getByText(a.email, { exact: true })).toBeVisible(); });
  137 |   await layout(page, 'profile-A'); await logout(page);
  138 |   await step('AUTH_LOGIN_A', 'Login via UI returns A, wrong password rejected first', async () => {
  139 |     await page.goto('/login'); await page.locator('[name=email]').fill(a.email); await page.locator('[name=password]').fill('intentionally-wrong');
  140 |     const denied = page.waitForResponse(r => r.url().endsWith('/api/auth/login')); await page.getByRole('button', { name: 'Đăng nhập ngay', exact: true }).click(); expect((await denied).status()).toBe(401); await expect(page.getByRole('alert')).toBeVisible();
  141 |     await login(page, a);
  142 |   });
  143 |   await logout(page); const b = await register(page, 'AuthB');
  144 |   await step('AUTH_SWITCH_B', 'B profile never shows A identity', async () => { await page.goto('/profile'); await expect(page.getByRole('heading', { name: b.fullName, exact: true })).toBeVisible(); await expect(page.getByText(a.email, { exact: true })).toHaveCount(0); await page.reload(); await expect(page.getByText(b.email, { exact: true })).toBeVisible(); });
  145 |   await layout(page, 'profile-B'); await logout(page); await login(page, a);
  146 |   for (const kind of ['invalid', 'expired']) await step(`AUTH_${kind.toUpperCase()}`, 'Real 401 clears client session and returns to login', async () => {
  147 |     if (kind === 'expired') await login(page, a);
  148 |     const payload = Buffer.from(JSON.stringify({ ...a.user, iat: 1, exp: 2 })).toString('base64url');
  149 |     const token = kind === 'invalid' ? 'T13A-invalid-token' : payload + '.' + createHmac('sha256', process.env.JWT_SECRET!).update(payload).digest('base64url');
  150 |     await page.evaluate(token => localStorage.setItem('travelgo_token', token), token);
  151 |     const waiting = page.waitForResponse(r => r.url().endsWith('/api/auth/me')); await page.goto('/profile');
  152 |     const response = await waiting; expect(response.status()).toBe(401); expect((await response.json()).code).toBe(kind === 'invalid' ? 'INVALID_TOKEN' : 'TOKEN_EXPIRED');
  153 |     await expect(page).toHaveURL(/\/login$/); expect(await page.evaluate(() => [localStorage.getItem('travelgo_token'), localStorage.getItem('travelgo_user')])).toEqual([null, null]);
  154 |   });
  155 | });
  156 | 
  157 | test('B_PLANNER UI Generate/mandatory/group/price-invariance/edit/save/reopen', async ({ page }) => {
  158 |   await register(page, 'Planner'); await plannerForm(page);
  159 |   await step('PLANNER_VALIDATION', 'Invalid adults blocked by browser form without POST', async () => { await page.locator('[name=adults]').fill('0'); expect(await page.locator('[name=adults]').evaluate((el: HTMLInputElement) => el.checkValidity())).toBe(false); const count = traffic.filter(v => v.path === '/api/tours/plan').length; await page.locator('form button[type=submit]').click(); expect(traffic.filter(v => v.path === '/api/tours/plan').length).toBe(count); await layout(page, 'planner-validation'); await page.locator('[name=adults]').fill('2'); });
  160 |   const high = await step('PLANNER_HIGH', '2 days/1 night, 2.7 equivalents, mandatory hotel, 3,840,000 group', async () => { const plan = await generate(page); assertPlan(plan); await expect(page.getByTestId('activity-cost-source').first()).toContainText('Catalog priceFrom'); await expect(page.getByTestId('hotel-estimate-source')).toContainText('600000'); await page.getByText('Giả định chi phí và khoản chưa bao gồm', { exact: true }).click(); await expect(page.getByText(/Mọi khoản activity/)).toBeVisible(); return plan; });
  161 |   await layout(page, 'planner-valid');
  162 |   const initial = await savePlanner(page); await page.reload(); await step('TRIP_FIRST_REOPEN', 'Save/reload DB metadata/totals/IDs equal accepted plan', () => assertTrip(page, initial));
  163 |   await plannerForm(page, 100000);
  164 |   const low = await step('PLANNER_LOW_INVARIANCE', 'Budget-only change never cuts price of same service', async () => {
  165 |     const plan = await generate(page); assertPlan(plan); expect(plan.overBudgetVND).toBe(3740000); expect(plan.constraintViolations).toEqual(['BUDGET_EXCEEDED']);
  166 |     const costs = (p: any) => p.days.flatMap((day: any) => day.activities.filter((a: any) => a.placeId).map((a: any) => [a.placeId, a.estimatedCostVND])).sort();
  167 |     expect(costs(plan)).toEqual(costs(high)); await expect(page.getByTestId('planner-budget-notice')).toContainText('Vượt ngân sách: 3.740.000đ'); return plan;
  168 |   });
  169 |   await layout(page, 'planner-over-budget');
  170 |   await step('PLANNER_UI_REORDER_REMOVE', 'Draft reorder/remove update total; mandatory hotel remains protected', async () => {
  171 |     const first = page.getByTestId('itinerary-activity').first(); await first.getByTitle('Di chuyển xuống', { exact: true }).click();
  172 |     expect(await page.getByTestId('itinerary-activity').first().getAttribute('data-place-id')).not.toBe(low.days[0].activities[0].placeId ?? '');
  173 |     const removable = page.getByTestId('itinerary-activity').filter({ hasText: 'T13A TEST attraction 1' }); await removable.getByTitle('Xóa địa điểm này', { exact: true }).click();
  174 |     await expect(page.getByTestId('planner-budget-notice')).toContainText('Dự toán cả nhóm: 3.030.000đ');
  175 |     await expect(page.getByTestId('itinerary-activity').filter({ hasText: 'T13A TEST hotel 4' }).getByRole('button', { name: /Địa điểm bắt buộc/ })).toBeDisabled();
  176 |   });
  177 |   const saved = await savePlanner(page); await page.reload(); await step('TRIP_EDITED_DRAFT_REOPEN', 'Edited draft saved/reopened at 3,030,000, excess 2,930,000', async () => { expect(saved.totalEstimatedCostVND).toBe(3030000); expect(saved.overBudgetVND).toBe(2930000); return assertTrip(page, saved); });
  178 |   await page.goto('/my-trips'); await page.locator(`[data-trip-id="${saved.id}"]`).click(); await assertTrip(page, saved); await layout(page, 'trip-saved-warning');
  179 |   await step('MANDATORY_MULTIPLE_API', 'Actual API supports attraction+hotel mandatory exactly once', async () => {
  180 |     const input = { ...low, totalBudget: 100000, mandatoryPlaceIds: [d().hotelId, d().attractionIds[0]] };
  181 |     const response = await browserApi(page, 'POST', '/tours/plan', input); expect(response.status).toBe(200);
  182 |     for (const id of input.mandatoryPlaceIds) expect(response.body.data.days.flatMap((day: any) => day.activities).filter((a: any) => a.placeId === id)).toHaveLength(1);
  183 |   });
  184 | });
  185 | 
  186 | test('C_EMPTY real 422/form retention/no old result/regenerate', async ({ page }) => {
  187 |   await register(page, 'Empty'); await plannerForm(page, 100000); await generate(page);
  188 |   await page.getByRole('button', { name: 'Sửa yêu cầu và tạo lại', exact: true }).click();
  189 |   await guard('T13-A own catalog availability fixture');
  190 |   await Place.update({ status: 'SUSPENDED' }, { where: { id: d().attractionIds } });
  191 |   try {
  192 |     await step('EMPTY_422', 'No local sightseeing -> 422, form unchanged, no stale/meal-only result', async () => {
  193 |       const body = await generate(page, 422); expect(body.code).toBe('NO_SIGHTSEEING_FOR_DESTINATION');
  194 |       await expect(page.getByTestId('planner-generation-error')).toContainText('Chưa đủ dữ liệu'); await expect(page.locator('[name=totalBudget]')).toHaveValue('100000');
  195 |       await expect(page.locator('[name=adults]')).toHaveValue('2'); await expect(page.locator('[name=endDate]')).toHaveValue('2028-02-29');
  196 |       await expect(page.getByTestId('itinerary-activity')).toHaveCount(0); await expect(page.getByTestId('planner-budget-notice')).toHaveCount(0);
  197 |     }); await layout(page, 'catalog-422');
  198 |   } finally { await guard('T13-A restore own catalog'); await Place.update({ status: 'APPROVED' }, { where: { id: d().attractionIds } }); }
  199 |   await page.locator('[name=totalBudget]').fill('3840000');
  200 |   await step('EMPTY_REGENERATE', 'User budget correction + restored fixture data generates equal-budget plan', async () => { const plan = await generate(page); assertPlan(plan); expect(plan.budgetStatus).toBe('within_budget'); expect(plan.overBudgetVND).toBe(0); await expect(page.getByTestId('planner-generation-error')).toHaveCount(0); });
  201 |   await layout(page, 'catalog-recovered');
  202 | });
  203 | 
  204 | test('D_SAVED_EDITOR saved Trip exposes activity edit/remove/reorder/save controls', async ({ page }) => {
  205 |   await register(page, 'SavedEditor'); await plannerForm(page, 100000); await generate(page); const trip = await savePlanner(page); await page.reload(); await assertTrip(page, trip);
  206 |   await page.screenshot({ path: path.join(out(), 'saved-trip-editor-reproduction.png'), fullPage: true });
  207 |   await step('SAVED_TRIP_UI_EDITOR', 'After save/reopen, user can edit/remove/reorder activities and save existing Trip', async () => {
  208 |     const controls = page.getByRole('button', { name: /Sửa lịch trình|Chỉnh sửa lịch trình|Xóa địa điểm này|Di chuyển lên|Di chuyển xuống/ });
> 209 |     expect(await controls.count(), 'Saved Trip has no activity editor; preferences editor is a different feature').toBeGreaterThan(0);
      |                                                                                                                    ^ Error: Saved Trip has no activity editor; preferences editor is a different feature
  210 |   });
  211 | });
  212 | 
  213 | test('E_LIFECYCLE real API activity edit/reopen + UI start/GPS-denied/checkin/retry/complete', async ({ page, context, baseURL }) => {
  214 |   await register(page, 'Lifecycle'); await plannerForm(page, 100000); await generate(page); let trip = await savePlanner(page);
  215 |   await step('SAVED_TRIP_API_EDIT', 'Real browser fetch edits existing Trip, DB/reopen totals/IDs/warnings follow current data', async () => {
  216 |     const days = structuredClone(trip.days); const removed = days[0].activities.find((a: any) => a.category === 'sightseeing' && a.estimatedCostVND > 0)!;
  217 |     days[0].activities = days[0].activities.filter((a: any) => a.id !== removed.id).reverse();
  218 |     const response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { days }); expect(response.status).toBe(200); trip = response.body.data;
  219 |     expect(trip.totalEstimatedCostVND).toBe(3840000 - removed.estimatedCostVND); await page.reload(); return assertTrip(page, trip);
  220 |   });
  221 |   await step('BUDGET_EDIT_CURRENT', 'Budget edits clear then restore current warning without changing prices', async () => {
  222 |     let response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { totalBudgetUserVND: 10000000 }); expect(response.status).toBe(200); trip = response.body.data; await page.reload(); await assertTrip(page, trip); await expect(page.getByTestId('planner-budget-notice')).not.toContainText('Vượt ngân sách');
  223 |     response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { totalBudgetUserVND: 100000 }); trip = response.body.data; await page.reload(); await assertTrip(page, trip);
  224 |   });
  225 |   const cdp = await context.newCDPSession(page); const { targetInfo } = await cdp.send('Target.getTargetInfo');
  226 |   await cdp.send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: new URL(baseURL!).origin, browserContextId: targetInfo.browserContextId });
  227 |   await step('START_GPS_MANUAL', 'Start enables manual check-in even with real geolocation permission denied', async () => {
  228 |     await expect(page.getByTestId('checkin-activity').first()).toBeDisabled(); const started = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/start`)); await page.getByTestId('start-trip').click(); expect((await started).status()).toBe(200);
  229 |     await page.getByTestId('request-trip-location').click(); await expect(page.getByText(/Bạn vẫn có thể check-in thủ công bình thường/)).toBeVisible();
  230 |     expect(await page.evaluate(async () => (await navigator.permissions.query({ name: 'geolocation' })).state)).toBe('denied');
  231 |   });
  232 |   let checked: any;
  233 |   await step('CHECKIN_RETRY', 'UI check-in + real retry persist once and do not duplicate progress', async () => {
  234 |     const target = page.getByTestId('saved-trip-activity').first(); const activityId = await target.getAttribute('data-activity-id');
  235 |     await target.locator('input').fill('T13A manual check-in, GPS denied'); const waiting = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/checkin`)); await target.getByTestId('checkin-activity').click(); const response = await waiting; expect(response.status()).toBe(200); checked = (await response.json()).trip;
  236 |     expect(checked.checkins).toHaveLength(1); expect(checked.checkins[0].hasAttachedLocation).toBe(false); expect(checked.progressPercent).toBeLessThan(100);
  237 |     const retry = await browserApi(page, 'POST', `/trips/${trip.id}/checkin`, { activityId, notes: 'retry should not replace first note' }); expect(retry.status).toBe(200); expect(retry.body.trip.checkins).toEqual(checked.checkins); expect(retry.body.trip.progressPercent).toBe(checked.progressPercent);
  238 |     const row = await TripSession.findByPk(trip.id); expect(row.checkins).toHaveLength(1); expect(row.progressPercent).toBe(checked.progressPercent); await page.reload(); await expect(page.getByTestId('trip-progress')).toContainText(`${checked.progressPercent}%`);
  239 |     return { progress: checked.progressPercent, checkins: 1 };
  240 |   });
  241 |   await step('COMPLETE_ACTUAL_PROGRESS', 'Complete keeps partial progress, does not force 100%', async () => { const waiting = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/complete`)); await page.getByTestId('complete-trip').click(); expect((await waiting).status()).toBe(200); await page.reload(); await expect(page.getByTestId('trip-status')).toContainText('Đã kết thúc'); await expect(page.getByTestId('trip-progress')).toContainText(`${checked.progressPercent}%`); const row = await TripSession.findByPk(trip.id); expect(row.progressPercent).toBe(checked.progressPercent); expect(row.status).toBe('completed'); });
  242 |   await layout(page, 'trip-complete-partial');
  243 | });
  244 | 
  245 | test('F_BOOKING real UI commit/lost-response/retry/server-price/inactive-business', async ({ page }) => {
  246 |   const a = await register(page, 'Booking'); await page.goto(`/tours/${d().tourId}`); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay', exact: true }).click();
  247 |   await expect(page.getByLabel('Họ và tên từ tài khoản')).toHaveValue(a.fullName); await expect(page.getByLabel('Email từ tài khoản')).toHaveAttribute('readonly', '');
  248 |   await page.locator('[name=bookingDate]').fill('2028-02-29'); await page.locator('[name=notes]').fill('T13A pending unpaid only');
  249 |   await layout(page, 'booking-form');
  250 |   await guard('T13-A own fixture repricing after UI render'); await Tour.update({ priceVND: 123457 }, { where: { id: d().tourId } });
  251 |   const sent: any[] = []; let first = true;
  252 |   // Fault injection only: send the actual request to the real backend; cut the
  253 |   // transport AFTER DB commit. No fabricated success response/replay fixture.
  254 |   await page.route('**/api/bookings', async route => {
  255 |     if (route.request().method() !== 'POST') return route.continue();
  256 |     const response = await route.fetch(); const body = await response.json(); expect(response.status()).toBe(201);
  257 |     const booking = body.data; const row = await Booking.findByPk(booking.id); expect(row?.id).toBe(booking.id);
  258 |     sent.push({ key: route.request().headers()['idempotency-key'], payload: route.request().postDataJSON(), booking }); await fixtures.discover();
  259 |     if (first) { first = false; await route.abort('connectionfailed'); } else await route.fulfill({ response });
  260 |   });
  261 |   await step('BOOKING_COMMIT_RESPONSE_LOST', 'UI submit commits PENDING/unpaid row before transport response loss', async () => { await page.getByTestId('booking-submit').click(); await expect(page.getByRole('alert')).toBeVisible(); expect(sent).toHaveLength(1); expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); });
  262 |   await page.getByRole('button', { name: 'Đóng đặt dịch vụ', exact: true }).click(); await page.reload(); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay', exact: true }).click();
  263 |   await step('BOOKING_RETRY_CONFIRM', 'Retry after reload keeps key/payload/ID/code, confirmation uses server total', async () => {
  264 |     await expect(page.locator('[name=notes]')).toHaveValue('T13A pending unpaid only'); await page.getByTestId('booking-submit').click(); await expect(page.getByText('Đặt dịch vụ thành công!', { exact: true })).toBeVisible();
  265 |     expect(sent).toHaveLength(2); expect(sent[1].key).toBe(sent[0].key); expect(sent[1].payload).toEqual(sent[0].payload); expect(sent[1].booking.id).toBe(sent[0].booking.id); expect(sent[1].booking.bookingCode).toBe(sent[0].booking.bookingCode);
  266 |     const b = sent[1].booking; const p = sent[1].payload; const total = 123457 * (p.adultsCount + p.childrenCount) - Math.round(123457 * p.childrenCount * 0.3);
  267 |     expect(b.totalAmount).toBe(total); expect(b.totalAmount).not.toBe(100001 * (p.adultsCount + p.childrenCount));
  268 |     const confirmedMoney = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(total).replace('₫', 'đ');
  269 |     await expect(page.getByText(confirmedMoney, { exact: true })).toBeVisible();
  270 |     const row = await Booking.findByPk(b.id); expect(Number(row.totalAmount)).toBe(total); expect(row.bookingStatus).toBe('PENDING'); expect(row.paymentStatus).toBe('unpaid');
  271 |     expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); expect(await BookingStatusHistory.count({ where: { bookingId: b.id } })).toBe(1); expect((await Tour.findByPk(d().tourId)).availableCapacity).toBe(30 - p.adultsCount - p.childrenCount);
  272 |     return { id: b.id, code: b.bookingCode, total, status: row.bookingStatus, paymentStatus: row.paymentStatus, sameRetryKey: true };
  273 |   });
  274 |   await layout(page, 'booking-confirmation'); await page.getByRole('button', { name: 'Hoàn tất & Xem lịch sử', exact: true }).click(); await expect(page.getByText(sent[0].booking.bookingCode, { exact: false })).toBeVisible(); await page.reload(); await expect(page.getByText(sent[0].booking.bookingCode, { exact: false })).toBeVisible();
  275 |   await page.unroute('**/api/bookings');
  276 |   await guard('T13-A own inactive business fixture'); await Business.update({ status: 'SUSPENDED' }, { where: { id: d().businessId } });
  277 |   try { await step('BOOKING_BUSINESS_INACTIVE', 'New booking rejected 409 BUSINESS_NOT_ACTIVE atomically', async () => { const response = await browserApi(page, 'POST', '/bookings', { ...sent[0].payload, notes: 'T13A inactive reject' }, undefined, randomUUID()); expect(response.status).toBe(409); expect(response.body.code).toBe('BUSINESS_NOT_ACTIVE'); expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); }); }
  278 |   finally { await guard('T13-A restore own business'); await Business.update({ status: 'ACTIVE' }, { where: { id: d().businessId } }); }
  279 |   expect(await UserEvent.count({ where: { userId: a.user.id } })).toBe(0);
  280 | });
  281 | 
  282 | test('G_OWNERSHIP real A/B forged IDs/bodies/list/cross-Trip-and-Booking', async ({ page }) => {
  283 |   const a = await register(page, 'OwnerA'); await logout(page); const b = await register(page, 'OwnerB');
  284 |   const input = { departureCity: 'Hà Nội', destinationCity: d().city, startDate: '2028-02-28', endDate: '2028-02-29', adults: 2, children: 1, transportation: 'car', pacing: 'balanced', preferences: [], totalBudget: 100000, mandatoryPlaceIds: [d().hotelId, d().attractionIds[0]] };
  285 |   const plan = await browserApi(page, 'POST', '/tours/plan', input); expect(plan.status).toBe(200);
  286 |   const objects: any[] = [];
  287 |   for (const who of [a, b]) {
  288 |     const trip = await browserApi(page, 'POST', '/trips', { itinerary: plan.body.data }, who.token); expect(trip.status).toBe(201);
  289 |     const booking = await browserApi(page, 'POST', '/bookings', { serviceType: 'tour', serviceId: d().tourId, bookingDate: '2028-02-29', adultsCount: 1, childrenCount: 0, customerPhone: '0901234567', notes: 'T13A ownership PENDING unpaid' }, who.token, randomUUID()); expect(booking.status).toBe(201);
  290 |     objects.push({ who, trip: trip.body.data, booking: booking.body.data });
  291 |   }
  292 |   await fixtures.discover();
  293 |   for (let i = 0; i < 2; i++) await step(`OWNERSHIP_${i === 0 ? 'A_TO_B' : 'B_TO_A'}`, 'Actual endpoints reject foreign IDs, bodies and mutations without changing owner rows', async () => {
  294 |     const actor = objects[i], target = objects[1 - i]; const tripId = target.trip.id; const booking = target.booking;
  295 |     const beforeTrip = (await TripSession.findByPk(tripId)).toJSON(); const beforeBooking = (await Booking.findByPk(booking.id)).toJSON();
  296 |     const paths: any[] = [
  297 |       ['GET', `/trips/${tripId}`, undefined, 404], ['PUT', `/trips/${tripId}`, { title: 'T13A forbidden', userId: actor.who.user.id }, 404], ['DELETE', `/trips/${tripId}`, undefined, 404],
  298 |       ['POST', `/trips/${tripId}/start`, {}, 404], ['POST', `/trips/${tripId}/complete`, {}, 404], ['POST', `/trips/${tripId}/checkin`, { activityId: target.trip.days[0].activities[0].id }, 404], ['POST', `/trips/${tripId}/convert-to-blog`, {}, 404],
  299 |       ['GET', `/bookings/${booking.id}`, undefined, 404], ['GET', `/bookings/${booking.bookingCode}`, undefined, 404], ['POST', `/bookings/${booking.id}/cancel`, { userId: actor.who.user.id }, 404], ['PATCH', `/bookings/${booking.id}/status`, { status: 'CONFIRMED', userId: actor.who.user.id }, 403],
  300 |     ];
  301 |     const outcomes = [];
  302 |     for (const [method, endpoint, body, status] of paths) { const result = await browserApi(page, method, endpoint, body, actor.who.token); expect(result.status, `${method} ${endpoint}`).toBe(status); outcomes.push({ method, endpoint, expected: status, actual: result.status }); }
  303 |     const list = await browserApi(page, 'GET', `/trips?userId=${target.who.user.id}`, undefined, actor.who.token); expect(list.body.data.every((t: any) => t.userId === actor.who.user.id)).toBe(true);
  304 |     const bookingList = await browserApi(page, 'GET', `/bookings/my?userId=${target.who.user.id}`, undefined, actor.who.token); expect(bookingList.body.data.map((v: any) => v.id)).toEqual([actor.booking.id]);
  305 |     expect((await TripSession.findByPk(tripId)).toJSON()).toEqual(beforeTrip); expect((await Booking.findByPk(booking.id)).toJSON()).toEqual(beforeBooking);
  306 |     return outcomes;
  307 |   });
  308 |   await page.goto(`/my-trips/${objects[0].trip.id}`); await expect(page.getByText(/Không tìm thấy|không tồn tại|Không thể tải/).first()).toBeVisible(); await layout(page, 'foreign-trip');
  309 | });
```