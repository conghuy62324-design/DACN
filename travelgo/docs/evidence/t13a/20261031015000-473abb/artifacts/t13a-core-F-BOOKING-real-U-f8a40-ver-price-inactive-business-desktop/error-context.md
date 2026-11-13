# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t13a-core.spec.ts >> F_BOOKING real UI commit/lost-response/retry/server-price/inactive-business
- Location: e2e\t13a-core.spec.ts:246:1

# Error details

```
Error: Confirmation header retains old catalog price although server total is current

expect(received).toContain(expected) // indexOf

Expected substring: "123.457"
Received string:    "Đơn giá: 100.001 đ / khách"
```

# Test source

```ts
  178 |   const saved = await savePlanner(page); await page.reload(); await step('TRIP_EDITED_DRAFT_REOPEN', 'Edited draft saved/reopened at 3,030,000, excess 2,930,000', async () => { expect(saved.totalEstimatedCostVND).toBe(3030000); expect(saved.overBudgetVND).toBe(2930000); return assertTrip(page, saved); });
  179 |   await page.goto('/my-trips'); await page.locator(`[data-trip-id="${saved.id}"]`).click(); await assertTrip(page, saved); await layout(page, 'trip-saved-warning');
  180 |   await step('MANDATORY_MULTIPLE_API', 'Actual API supports attraction+hotel mandatory exactly once', async () => {
  181 |     const input = { ...low, totalBudget: 100000, mandatoryPlaceIds: [d().hotelId, d().attractionIds[0]] };
  182 |     const response = await browserApi(page, 'POST', '/tours/plan', input); expect(response.status).toBe(200);
  183 |     for (const id of input.mandatoryPlaceIds) expect(response.body.data.days.flatMap((day: any) => day.activities).filter((a: any) => a.placeId === id)).toHaveLength(1);
  184 |   });
  185 | });
  186 | 
  187 | test('C_EMPTY real 422/form retention/no old result/regenerate', async ({ page }) => {
  188 |   await register(page, 'Empty'); await plannerForm(page, 100000); await generate(page);
  189 |   await page.getByRole('button', { name: 'Sửa yêu cầu và tạo lại', exact: true }).click();
  190 |   await guard('T13-A own catalog availability fixture');
  191 |   await Place.update({ status: 'SUSPENDED' }, { where: { id: d().attractionIds } });
  192 |   try {
  193 |     await step('EMPTY_422', 'No local sightseeing -> 422, form unchanged, no stale/meal-only result', async () => {
  194 |       const body = await generate(page, 422); expect(body.code).toBe('NO_SIGHTSEEING_FOR_DESTINATION');
  195 |       await expect(page.getByTestId('planner-generation-error')).toContainText('Chưa đủ dữ liệu'); await expect(page.locator('[name=totalBudget]')).toHaveValue('100000');
  196 |       await expect(page.locator('[name=adults]')).toHaveValue('2'); await expect(page.locator('[name=endDate]')).toHaveValue('2028-02-29');
  197 |       await expect(page.getByTestId('itinerary-activity')).toHaveCount(0); await expect(page.getByTestId('planner-budget-notice')).toHaveCount(0);
  198 |     }); await layout(page, 'catalog-422');
  199 |   } finally { await guard('T13-A restore own catalog'); await Place.update({ status: 'APPROVED' }, { where: { id: d().attractionIds } }); }
  200 |   await page.locator('[name=totalBudget]').fill('3840000');
  201 |   await step('EMPTY_REGENERATE', 'User budget correction + restored fixture data generates equal-budget plan', async () => { const plan = await generate(page); assertPlan(plan); expect(plan.budgetStatus).toBe('within_budget'); expect(plan.overBudgetVND).toBe(0); await expect(page.getByTestId('planner-generation-error')).toHaveCount(0); });
  202 |   await layout(page, 'catalog-recovered');
  203 | });
  204 | 
  205 | test('D_SAVED_EDITOR saved Trip exposes activity edit/remove/reorder/save controls', async ({ page }) => {
  206 |   await register(page, 'SavedEditor'); await plannerForm(page, 100000); await generate(page); const trip = await savePlanner(page); await page.reload(); await assertTrip(page, trip);
  207 |   await page.screenshot({ path: path.join(out(), 'saved-trip-editor-reproduction.png'), fullPage: true });
  208 |   await step('SAVED_TRIP_UI_EDITOR', 'After save/reopen, user can edit/remove/reorder activities and save existing Trip', async () => {
  209 |     const controls = page.getByRole('button', { name: /Sửa lịch trình|Chỉnh sửa lịch trình|Xóa địa điểm này|Di chuyển lên|Di chuyển xuống/ });
  210 |     expect(await controls.count(), 'Saved Trip has no activity editor; preferences editor is a different feature').toBeGreaterThan(0);
  211 |   });
  212 | });
  213 | 
  214 | test('E_LIFECYCLE real API activity edit/reopen + UI start/GPS-denied/checkin/retry/complete', async ({ page, context, baseURL }) => {
  215 |   await register(page, 'Lifecycle'); await plannerForm(page, 100000); await generate(page); let trip = await savePlanner(page);
  216 |   await step('SAVED_TRIP_API_EDIT', 'Real browser fetch edits existing Trip, DB/reopen totals/IDs/warnings follow current data', async () => {
  217 |     const days = structuredClone(trip.days); const removed = days[0].activities.find((a: any) => a.category === 'sightseeing' && a.estimatedCostVND > 0)!;
  218 |     days[0].activities = days[0].activities.filter((a: any) => a.id !== removed.id).reverse();
  219 |     const response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { days }); expect(response.status).toBe(200); trip = response.body.data;
  220 |     expect(trip.totalEstimatedCostVND).toBe(3840000 - removed.estimatedCostVND); await page.reload(); return assertTrip(page, trip);
  221 |   });
  222 |   await step('BUDGET_EDIT_CURRENT', 'Budget edits clear then restore current warning without changing prices', async () => {
  223 |     let response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { totalBudgetUserVND: 10000000 }); expect(response.status).toBe(200); trip = response.body.data; await page.reload(); await assertTrip(page, trip); await expect(page.getByTestId('planner-budget-notice')).not.toContainText('Vượt ngân sách');
  224 |     response = await browserApi(page, 'PUT', `/trips/${trip.id}`, { totalBudgetUserVND: 100000 }); trip = response.body.data; await page.reload(); await assertTrip(page, trip);
  225 |   });
  226 |   const cdp = await context.newCDPSession(page); const { targetInfo } = await cdp.send('Target.getTargetInfo');
  227 |   await cdp.send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: new URL(baseURL!).origin, browserContextId: targetInfo.browserContextId });
  228 |   await step('START_GPS_MANUAL', 'Start enables manual check-in even with real geolocation permission denied', async () => {
  229 |     await expect(page.getByTestId('checkin-activity').first()).toBeDisabled(); const started = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/start`)); await page.getByTestId('start-trip').click(); expect((await started).status()).toBe(200);
  230 |     await page.getByTestId('request-trip-location').click(); await expect(page.getByText(/Bạn vẫn có thể check-in thủ công bình thường/)).toBeVisible();
  231 |     expect(await page.evaluate(async () => (await navigator.permissions.query({ name: 'geolocation' })).state)).toBe('denied');
  232 |   });
  233 |   let checked: any;
  234 |   await step('CHECKIN_RETRY', 'UI check-in + real retry persist once and do not duplicate progress', async () => {
  235 |     const target = page.getByTestId('saved-trip-activity').first(); const activityId = await target.getAttribute('data-activity-id');
  236 |     await target.locator('input').fill('T13A manual check-in, GPS denied'); const waiting = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/checkin`)); await target.getByTestId('checkin-activity').click(); const response = await waiting; expect(response.status()).toBe(200); checked = (await response.json()).trip;
  237 |     expect(checked.checkins).toHaveLength(1); expect(checked.checkins[0].hasAttachedLocation).toBe(false); expect(checked.progressPercent).toBeLessThan(100);
  238 |     const retry = await browserApi(page, 'POST', `/trips/${trip.id}/checkin`, { activityId, notes: 'retry should not replace first note' }); expect(retry.status).toBe(200); expect(retry.body.trip.checkins).toEqual(checked.checkins); expect(retry.body.trip.progressPercent).toBe(checked.progressPercent);
  239 |     const row = await TripSession.findByPk(trip.id); expect(row.checkins).toHaveLength(1); expect(row.progressPercent).toBe(checked.progressPercent); await page.reload(); await expect(page.getByTestId('trip-progress')).toContainText(`${checked.progressPercent}%`);
  240 |     return { progress: checked.progressPercent, checkins: 1 };
  241 |   });
  242 |   await step('COMPLETE_ACTUAL_PROGRESS', 'Complete keeps partial progress, does not force 100%', async () => { const waiting = page.waitForResponse(r => r.url().endsWith(`/trips/${trip.id}/complete`)); await page.getByTestId('complete-trip').click(); expect((await waiting).status()).toBe(200); await page.reload(); await expect(page.getByTestId('trip-status')).toContainText('Đã kết thúc'); await expect(page.getByTestId('trip-progress')).toContainText(`${checked.progressPercent}%`); const row = await TripSession.findByPk(trip.id); expect(row.progressPercent).toBe(checked.progressPercent); expect(row.status).toBe('completed'); });
  243 |   await layout(page, 'trip-complete-partial');
  244 | });
  245 | 
  246 | test('F_BOOKING real UI commit/lost-response/retry/server-price/inactive-business', async ({ page }) => {
  247 |   const a = await register(page, 'Booking'); await page.goto(`/tours/${d().tourId}`); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay', exact: true }).click();
  248 |   await expect(page.getByLabel('Họ và tên từ tài khoản')).toHaveValue(a.fullName); await expect(page.getByLabel('Email từ tài khoản')).toHaveAttribute('readonly', '');
  249 |   await page.locator('[name=bookingDate]').fill('2028-02-29'); await page.locator('[name=notes]').fill('T13A pending unpaid only');
  250 |   await layout(page, 'booking-form');
  251 |   await guard('T13-A own fixture repricing after UI render'); await Tour.update({ priceVND: 123457 }, { where: { id: d().tourId } });
  252 |   const sent: any[] = []; let first = true;
  253 |   // Fault injection only: send the actual request to the real backend; cut the
  254 |   // transport AFTER DB commit. No fabricated success response/replay fixture.
  255 |   await page.route('**/api/bookings', async route => {
  256 |     if (route.request().method() !== 'POST') return route.continue();
  257 |     const response = await route.fetch(); const body = await response.json(); expect(response.status()).toBe(201);
  258 |     const booking = body.data; const row = await Booking.findByPk(booking.id); expect(row?.id).toBe(booking.id);
  259 |     sent.push({ key: route.request().headers()['idempotency-key'], payload: route.request().postDataJSON(), booking }); await fixtures.discover();
  260 |     if (first) { first = false; await route.abort('connectionfailed'); } else await route.fulfill({ response });
  261 |   });
  262 |   await step('BOOKING_COMMIT_RESPONSE_LOST', 'UI submit commits PENDING/unpaid row before transport response loss', async () => { await page.getByTestId('booking-submit').click(); await expect(page.getByRole('alert')).toBeVisible(); expect(sent).toHaveLength(1); expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); });
  263 |   await page.getByRole('button', { name: 'Đóng đặt dịch vụ', exact: true }).click(); await page.reload(); await page.getByRole('button', { name: 'Đặt giữ chỗ ngay', exact: true }).click();
  264 |   await step('BOOKING_RETRY_CONFIRM', 'Retry after reload keeps key/payload/ID/code, confirmation uses server total', async () => {
  265 |     await expect(page.locator('[name=notes]')).toHaveValue('T13A pending unpaid only'); await page.getByTestId('booking-submit').click(); await expect(page.getByText('Đặt dịch vụ thành công!', { exact: true })).toBeVisible();
  266 |     expect(sent).toHaveLength(2); expect(sent[1].key).toBe(sent[0].key); expect(sent[1].payload).toEqual(sent[0].payload); expect(sent[1].booking.id).toBe(sent[0].booking.id); expect(sent[1].booking.bookingCode).toBe(sent[0].booking.bookingCode);
  267 |     const b = sent[1].booking; const p = sent[1].payload; const total = 123457 * (p.adultsCount + p.childrenCount) - Math.round(123457 * p.childrenCount * 0.3);
  268 |     expect(b.totalAmount).toBe(total); expect(b.totalAmount).not.toBe(100001 * (p.adultsCount + p.childrenCount));
  269 |     const confirmedMoney = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(total).replace('₫', 'đ');
  270 |     await expect(page.getByText(confirmedMoney, { exact: true })).toBeVisible();
  271 |     const row = await Booking.findByPk(b.id); expect(Number(row.totalAmount)).toBe(total); expect(row.bookingStatus).toBe('PENDING'); expect(row.paymentStatus).toBe('unpaid');
  272 |     expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); expect(await BookingStatusHistory.count({ where: { bookingId: b.id } })).toBe(1); expect((await Tour.findByPk(d().tourId)).availableCapacity).toBe(30 - p.adultsCount - p.childrenCount);
  273 |     return { id: b.id, code: b.bookingCode, total, status: row.bookingStatus, paymentStatus: row.paymentStatus, sameRetryKey: true };
  274 |   });
  275 |   await layout(page, 'booking-confirmation');
  276 |   const unitLabel = await page.getByRole('dialog').getByText(/^Đơn giá:/).textContent();
  277 |   matrix.push({ id: 'BOOKING_CONFIRMED_UNIT_PRICE', expected: 'Confirmed unit price is server unitPrice 123457, or old estimate is explicitly labeled as such', actual: { label: unitLabel, serverUnitPrice: sent[1].booking.unitPrice, serverTotal: sent[1].booking.totalAmount }, status: unitLabel?.includes('123.457') ? 'PASS' : 'FAIL' });
> 278 |   expect.soft(unitLabel, 'Confirmation header retains old catalog price although server total is current').toContain('123.457');
      |                                                                                                            ^ Error: Confirmation header retains old catalog price although server total is current
  279 |   await page.getByRole('button', { name: 'Hoàn tất & Xem lịch sử', exact: true }).click(); await expect(page.getByText(sent[0].booking.bookingCode, { exact: false })).toBeVisible(); await page.reload(); await expect(page.getByText(sent[0].booking.bookingCode, { exact: false })).toBeVisible();
  280 |   await page.unroute('**/api/bookings');
  281 |   await guard('T13-A own inactive business fixture'); await Business.update({ status: 'SUSPENDED' }, { where: { id: d().businessId } });
  282 |   try { await step('BOOKING_BUSINESS_INACTIVE', 'New booking rejected 409 BUSINESS_NOT_ACTIVE atomically', async () => { const response = await browserApi(page, 'POST', '/bookings', { ...sent[0].payload, notes: 'T13A inactive reject' }, undefined, randomUUID()); expect(response.status).toBe(409); expect(response.body.code).toBe('BUSINESS_NOT_ACTIVE'); expect(await Booking.count({ where: { userId: a.user.id } })).toBe(1); }); }
  283 |   finally { await guard('T13-A restore own business'); await Business.update({ status: 'ACTIVE' }, { where: { id: d().businessId } }); }
  284 |   expect(await UserEvent.count({ where: { userId: a.user.id } })).toBe(0);
  285 | });
  286 | 
  287 | test('G_OWNERSHIP real A/B forged IDs/bodies/list/cross-Trip-and-Booking', async ({ page }) => {
  288 |   const a = await register(page, 'OwnerA'); await logout(page); const b = await register(page, 'OwnerB');
  289 |   const input = { departureCity: 'Hà Nội', destinationCity: d().city, startDate: '2028-02-28', endDate: '2028-02-29', adults: 2, children: 1, transportation: 'car', pacing: 'balanced', preferences: [], totalBudget: 100000, mandatoryPlaceIds: [d().hotelId, d().attractionIds[0]] };
  290 |   const plan = await browserApi(page, 'POST', '/tours/plan', input); expect(plan.status).toBe(200);
  291 |   const objects: any[] = [];
  292 |   for (const who of [a, b]) {
  293 |     const trip = await browserApi(page, 'POST', '/trips', { itinerary: plan.body.data }, who.token); expect(trip.status).toBe(201);
  294 |     const booking = await browserApi(page, 'POST', '/bookings', { serviceType: 'tour', serviceId: d().tourId, bookingDate: '2028-02-29', adultsCount: 1, childrenCount: 0, customerPhone: '0901234567', notes: 'T13A ownership PENDING unpaid' }, who.token, randomUUID()); expect(booking.status).toBe(201);
  295 |     objects.push({ who, trip: trip.body.data, booking: booking.body.data });
  296 |   }
  297 |   await fixtures.discover();
  298 |   for (let i = 0; i < 2; i++) await step(`OWNERSHIP_${i === 0 ? 'A_TO_B' : 'B_TO_A'}`, 'Actual endpoints reject foreign IDs, bodies and mutations without changing owner rows', async () => {
  299 |     const actor = objects[i], target = objects[1 - i]; const tripId = target.trip.id; const booking = target.booking;
  300 |     const beforeTrip = (await TripSession.findByPk(tripId)).toJSON(); const beforeBooking = (await Booking.findByPk(booking.id)).toJSON();
  301 |     const paths: any[] = [
  302 |       ['GET', `/trips/${tripId}`, undefined, 404], ['PUT', `/trips/${tripId}`, { title: 'T13A forbidden', userId: actor.who.user.id }, 404], ['DELETE', `/trips/${tripId}`, undefined, 404],
  303 |       ['POST', `/trips/${tripId}/start`, {}, 404], ['POST', `/trips/${tripId}/complete`, {}, 404], ['POST', `/trips/${tripId}/checkin`, { activityId: target.trip.days[0].activities[0].id }, 404], ['POST', `/trips/${tripId}/convert-to-blog`, {}, 404],
  304 |       ['GET', `/bookings/${booking.id}`, undefined, 404], ['GET', `/bookings/${booking.bookingCode}`, undefined, 404], ['POST', `/bookings/${booking.id}/cancel`, { userId: actor.who.user.id }, 404], ['PATCH', `/bookings/${booking.id}/status`, { status: 'CONFIRMED', userId: actor.who.user.id }, 403],
  305 |     ];
  306 |     const outcomes = [];
  307 |     for (const [method, endpoint, body, status] of paths) { const result = await browserApi(page, method, endpoint, body, actor.who.token); expect(result.status, `${method} ${endpoint}`).toBe(status); outcomes.push({ method, endpoint, expected: status, actual: result.status }); }
  308 |     const list = await browserApi(page, 'GET', `/trips?userId=${target.who.user.id}`, undefined, actor.who.token); expect(list.body.data.every((t: any) => t.userId === actor.who.user.id)).toBe(true);
  309 |     const bookingList = await browserApi(page, 'GET', `/bookings/my?userId=${target.who.user.id}`, undefined, actor.who.token); expect(bookingList.body.data.map((v: any) => v.id)).toEqual([actor.booking.id]);
  310 |     expect((await TripSession.findByPk(tripId)).toJSON()).toEqual(beforeTrip); expect((await Booking.findByPk(booking.id)).toJSON()).toEqual(beforeBooking);
  311 |     return outcomes;
  312 |   });
  313 |   await page.goto(`/my-trips/${objects[0].trip.id}`); await expect(page.getByText(/Không tìm thấy|không tồn tại|Không thể tải/).first()).toBeVisible(); await layout(page, 'foreign-trip');
  314 | });
  315 | 
```