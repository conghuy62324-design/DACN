import { expect, Page, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const seedPassword = process.env.SEED_PASSWORD || '';
const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
const pendingBusiness = `E2E Pending Business ${suffix}`;
const placeName = `E2E Place ${suffix}`;
const tourName = `E2E Tour ${suffix}`;
const ticketName = `E2E Ticket ${suffix}`;
const blogName = `E2E Blog ${suffix}`;

async function login(page: Page, email: string, password = seedPassword): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function createPartnerResource(page: Page, resource: string, values: Record<string, string>): Promise<void> {
  await page.goto(`/partner/${resource}/new`);
  const form = page.getByTestId(`partner-${resource}-form`);
  await expect(form).toBeVisible();
  await expect.poll(() => form.locator('[name="businessId"]').inputValue()).not.toBe('');
  for (const [name, value] of Object.entries(values)) {
    const control = form.locator(`[name="${name}"]`);
    if (await control.evaluate((element) => element.tagName === 'SELECT')) await control.selectOption(value);
    else await control.fill(value);
  }
  await form.getByRole('button').click();
  await expect(page).toHaveURL(new RegExp(`/partner/${resource}$`));
  await expect(page.getByText(values.name || values.title, { exact: true })).toBeVisible();
}

async function submitResource(page: Page, resource: string, title: string): Promise<void> {
  await page.goto(`/partner/${resource}`);
  const row = page.locator('tr', { hasText: title });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /Gửi duyệt/ }).click();
  await expect(row.getByText('PENDING', { exact: true })).toBeVisible();
}

async function updatePartnerResource(page: Page, resource: string, title: string, field: string, value: string): Promise<void> {
  await page.goto(`/partner/${resource}`);
  const row = page.locator('tr', { hasText: title });
  await row.getByRole('link', { name: /Chi tiết/ }).click();
  await page.locator(`[name="${field}"]`).fill(value);
  await page.getByTestId(`partner-${resource}-form`).getByRole('button').click();
  await expect(page).toHaveURL(new RegExp(`/partner/${resource}$`));
  await expect(page.locator('tr', { hasText: title })).toBeVisible();
}

async function archivePartnerResource(page: Page, resource: string, title: string, expectedStatus: string): Promise<void> {
  await page.goto(`/partner/${resource}`);
  const row = page.locator('tr', { hasText: title });
  await expect(row).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: `Ngừng hiển thị ${title}` }).click();
  await expect(page.locator('tr', { hasText: title }).getByText(expectedStatus, { exact: true })).toBeVisible();
}

test('CUSTOMER: error/loading/empty states, responsive session, booking and persisted trip', async ({ page, request }) => {
  test.skip(!seedPassword, 'SEED_PASSWORD is required for E2E');

  const emptyEmail = `e2e.empty.${suffix}@example.test`;
  const registration = await request.post('/api/auth/register', {
    data: { fullName: 'E2E Empty Customer', email: emptyEmail, password: 'E2ECustomer2026!', phone: '0901234567' },
  });
  expect(registration.status()).toBe(201);
  const registrationBody = await registration.json();
  const application = await request.post('/api/partner-applications', {
    headers: { Authorization: `Bearer ${registrationBody.data.token}` },
    data: {
      representativeName: 'E2E Representative', businessName: pendingBusiness, businessType: 'TOUR_OPERATOR',
      email: emptyEmail, phone: '0901234567', address: '35 E2E Integration Street', city: 'Da Nang',
    },
  });
  expect(application.status()).toBe(201);

  await page.goto('/login');
  await page.locator('input[name="email"]').fill(emptyEmail);
  await page.locator('input[name="password"]').fill('wrong-password');
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByRole('alert')).toBeVisible();

  await login(page, emptyEmail, 'E2ECustomer2026!');
  await page.route('**/api/trips', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.continue();
  });
  await page.goto('/my-trips');
  await expect(page.locator('.animate-pulse').first()).toBeVisible();
  await expect(page.getByText('Chưa có chuyến đi nào trong danh mục')).toBeVisible();
  await page.unroute('**/api/trips');

  await login(page, 'customer.a@hugotravel.vn');
  const currentConsent = await page.evaluate(async () => {
    const token = localStorage.getItem('travelgo_token');
    const response = await fetch('/api/intelligence/consent', { headers: { Authorization: `Bearer ${token}` } });
    return (await response.json()).data as { analyticsEnabled: boolean };
  });
  if (!currentConsent.analyticsEnabled) {
    if (await page.getByTestId('telemetry-consent').count() === 0) {
      await page.getByTestId('telemetry-settings').click();
    }
    await expect(page.getByTestId('telemetry-consent')).toBeVisible();
    await page.getByTestId('telemetry-accept-personalization').click();
  }
  const customerToken = await page.evaluate(() => localStorage.getItem('travelgo_token'));
  expect(customerToken).toBeTruthy();
  const existingFavorites = await request.get('/api/favorites', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(existingFavorites.status()).toBe(200);
  for (const record of (await existingFavorites.json()).data.items as Array<{ place: { id: string } }>) {
    const removed = await request.delete(`/api/favorites/${record.place.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
      data: { contractVersion: '1.0', sessionId: `e2e-cleanup-${suffix}`, uiSurface: 'favorites' },
    });
    expect(removed.status()).toBe(200);
  }
  await page.reload();
  const recommendationResponse = page.waitForResponse((response) => response.url().includes('/api/intelligence/recommendations') &&
    !response.url().endsWith('/visible') && response.request().method() === 'POST', { timeout: 15_000 });
  await page.goto('/explore?category=hotel');
  const recommendationHttp = await recommendationResponse;
  expect(recommendationHttp.status()).toBe(201);
  const recommendationBody = await recommendationHttp.json();
  const recommendationRequestId = recommendationBody.data.requestId as string;
  expect(recommendationRequestId).toMatch(/^[0-9a-f-]{36}$/i);
  const firstRecommendation = page.locator('[data-testid^="recommendation-card-"]').first();
  await expect(firstRecommendation).toBeVisible();
  const visibleAck = page.waitForResponse((response) => response.url().endsWith('/api/intelligence/recommendations/visible') &&
    response.request().method() === 'POST', { timeout: 15_000 });
  await firstRecommendation.scrollIntoViewIfNeeded();
  const visibleHttp = await visibleAck;
  expect(visibleHttp.request().postDataJSON()?.requestId).toBe(recommendationRequestId);
  expect(visibleHttp.status()).toBe(202);
  await expect(firstRecommendation).toHaveAttribute('data-attribution-ready', 'true');

  const viewEvent = page.waitForResponse((response) => {
    if (!response.url().includes('/api/intelligence/events') || response.request().method() !== 'POST') return false;
    return response.request().postDataJSON()?.eventType === 'VIEW';
  }, { timeout: 15_000 });
  const attributedClick = page.waitForResponse((response) => {
    if (!response.url().includes('/api/intelligence/events') || response.request().method() !== 'POST') return false;
    const body = response.request().postDataJSON();
    return body?.eventType === 'CLICK' && body?.requestId === recommendationRequestId;
  }, { timeout: 10_000 });
  await firstRecommendation.getByText('Chi tiết', { exact: true }).click();
  expect((await attributedClick).status()).toBe(202);
  await expect(page.getByText('HuGo Riverside Hotel', { exact: true }).first()).toBeVisible();
  expect((await viewEvent).status()).toBe(202);
  const favoriteMutation = page.waitForResponse((response) =>
    response.url().includes('/api/favorites/') && response.request().method() === 'POST', { timeout: 10_000 });
  await page.getByTestId('place-favorite').click();
  const favoriteHttp = await favoriteMutation;
  expect(favoriteHttp.status()).toBe(201);
  const favoriteBody = await favoriteHttp.json();
  expect(favoriteBody.data.changed).toBe(true);
  expect(favoriteBody.data.telemetry.recorded).toBe(true);
  expect(await page.getByTestId('place-favorite').getAttribute('aria-pressed')).toBe('true');
  await page.reload();
  await expect(page.getByTestId('place-favorite')).toHaveAttribute('aria-pressed', 'true');

  const customerBookings = await request.get('/api/bookings/my', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(customerBookings.status()).toBe(200);
  const reviewBooking = ((await customerBookings.json()).data as Array<any>)
    .find((booking) => booking.bookingCode === 'HG-SEED-0001');
  expect(reviewBooking).toBeTruthy();
  const adminLogin = await request.post('/api/auth/login', {
    data: { email: 'admin@hugotravel.vn', password: seedPassword },
  });
  expect(adminLogin.status()).toBe(200);
  const adminToken = (await adminLogin.json()).data.token as string;
  if (reviewBooking.bookingStatus === 'PENDING') {
    expect((await request.patch(`/api/bookings/${reviewBooking.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` }, data: { status: 'CONFIRMED' },
    })).status()).toBe(200);
    reviewBooking.bookingStatus = 'CONFIRMED';
  }
  if (reviewBooking.bookingStatus === 'CONFIRMED') {
    expect((await request.patch(`/api/bookings/${reviewBooking.id}/status`, {
      headers: { Authorization: `Bearer ${adminToken}` }, data: { status: 'COMPLETED' },
    })).status()).toBe(200);
  }
  const existingReviews = await request.get('/api/reviews/me', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  expect(existingReviews.status()).toBe(200);
  for (const review of (await existingReviews.json()).data as Array<{ id: string; bookingId?: string }>) {
    if (review.bookingId === reviewBooking.id) {
      expect((await request.delete(`/api/reviews/${review.id}`, {
        headers: { Authorization: `Bearer ${customerToken}` },
      })).status()).toBe(200);
    }
  }
  await page.reload();
  await page.getByRole('button', { name: /Đánh giá \(/ }).click();
  await page.getByTestId('review-booking').selectOption(reviewBooking.id);
  await page.locator('textarea').fill('Khách sạn sạch đẹp, phục vụ chu đáo và vị trí thuận tiện.');
  const reviewMutation = page.waitForResponse((response) =>
    response.url().includes('/reviews') && response.request().method() === 'POST', { timeout: 10_000 });
  await page.getByTestId('review-submit').click();
  expect((await reviewMutation).status()).toBe(201);
  await expect(page.getByTestId('verified-review').first()).toContainText('Đã xác thực booking');
  await page.reload();
  await page.getByRole('button', { name: /Đánh giá \(/ }).click();
  await expect(page.getByTestId('verified-review').first()).toContainText('Đã xác thực booking');

  await page.goto('/favorites');
  await expect(page.getByText('HuGo Riverside Hotel', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: /Khách hàng Minh Anh/ }).click();
  await page.getByRole('button', { name: 'Đăng xuất' }).click();
  await expect(page.getByText('HuGo Riverside Hotel', { exact: true })).toHaveCount(0);
  await login(page, 'customer.a@hugotravel.vn');
  await page.goto('/favorites');
  await expect(page.getByText('HuGo Riverside Hotel', { exact: true })).toBeVisible();
  await page.goto('/tours');
  await expect(page.getByText('Khám phá Hội An 2N1Đ', { exact: true })).toBeVisible();

  await page.goto('/tickets');
  const ticketCard = page.locator('[data-testid^="ticket-"]', { hasText: 'Vé tham quan Hội An - fixture' });
  await ticketCard.getByRole('button', { name: 'Đặt vé ngay' }).click();
  await page.locator('input[name="customerPhone"]').fill('0901234567');
  await page.getByTestId('booking-submit').click();
  await expect(page.getByText('Đặt dịch vụ thành công!')).toBeVisible();
  await page.getByRole('button', { name: /Hoàn tất/ }).click();
  await page.goto('/bookings');
  await expect(page.getByText('Vé tham quan Hội An - fixture', { exact: true }).first()).toBeVisible();

  await page.goto('/tour-planner');
  await page.locator('select[name="destinationCity"]').selectOption('Hội An');
  await page.locator('input[name="startDate"]').fill('2027-02-10');
  await page.locator('input[name="endDate"]').fill('2027-02-11');
  await page.getByTestId('planner-preference-am-thuc').click();
  await page.getByTestId('planner-preference-van-hoa').click();
  await page.locator('form button[type="submit"]').click();
  await expect(page.getByTestId('generated-preferences')).toContainText('Ẩm thực');
  await expect(page.getByTestId('generated-preferences')).toContainText('Văn hóa & Lịch sử');
  const saveTrip = page.getByRole('button', { name: /Lưu hành trình này/ });
  await expect(saveTrip).toBeVisible();
  await saveTrip.click();
  await expect(page).toHaveURL(/\/my-trips\/[0-9a-f-]+$/);
  await expect(page.getByTestId('trip-preference-am-thuc')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('trip-preference-van-hoa')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await expect(page).toHaveURL(/\/my-trips\/[0-9a-f-]+$/);
  await expect(page.getByTestId('trip-preference-am-thuc')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('trip-preference-van-hoa')).toHaveAttribute('aria-pressed', 'true');

  await page.getByTestId('trip-preference-nghi-duong').click();
  await page.getByTestId('save-trip-preferences').click();
  await expect(page.getByRole('status')).toHaveText('Đã lưu sở thích.');
  await page.reload();
  await expect(page.getByTestId('trip-preference-nghi-duong')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('clear-trip-preferences').click();
  await expect(page.getByRole('status')).toHaveText('Đã xóa toàn bộ sở thích.');
  await page.reload();
  await expect(page.getByTestId('empty-trip-preferences')).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test('PARTNER: dashboard, create/update/submit resources and process booking', async ({ page }) => {
  test.skip(!seedPassword, 'SEED_PASSWORD is required for E2E');
  await login(page, 'tour@hugotravel.vn');
  await expect(page).toHaveURL(/\/partner$/);
  await expect(page.getByText('Tổng quan cơ sở')).toBeVisible();

  await createPartnerResource(page, 'places', {
    name: placeName, category: 'attraction', summary: 'E2E place summary',
    description: 'E2E place description persisted through the Partner UI.', city: 'Hội An', province: 'Quảng Nam',
    address: '1 E2E Street', latitude: '15.8801', longitude: '108.3380', priceFrom: '150000',
    heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b',
  });
  await updatePartnerResource(page, 'places', placeName, 'summary', 'E2E place summary updated');

  await createPartnerResource(page, 'tours', {
    title: tourName, category: 'culture', departureCity: 'Da Nang', destinationCity: 'Hội An',
    durationDays: '2', durationNights: '1', summary: 'E2E tour summary', description: 'E2E tour description.',
    priceVND: '950000', capacity: '10', heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b',
  });
  await createPartnerResource(page, 'tickets', {
    title: ticketName, type: 'sightseeing', operator: 'HuGo E2E', departureCity: 'Da Nang', arrivalCity: 'Hội An',
    departureTime: '2027-02-10T08:00', duration: '1 day', price: '325000', capacity: '12', status: 'ACTIVE',
  });
  await createPartnerResource(page, 'blogs', {
    title: blogName, excerpt: 'E2E blog excerpt', content: 'E2E blog content long enough for moderation verification.',
    destinationName: 'Hội An', coverImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b',
  });

  await updatePartnerResource(page, 'tours', tourName, 'summary', 'E2E tour summary updated');
  await updatePartnerResource(page, 'tickets', ticketName, 'operator', 'HuGo E2E Updated');
  await updatePartnerResource(page, 'blogs', blogName, 'excerpt', 'E2E blog excerpt updated');

  await submitResource(page, 'places', placeName);
  await submitResource(page, 'tours', tourName);
  await submitResource(page, 'blogs', blogName);

  await page.goto('/partner/bookings');
  const pendingBooking = page.locator('tr', { hasText: 'Vé tham quan Hội An - fixture' }).filter({ hasText: 'PENDING' }).first();
  await expect(pendingBooking).toBeVisible();
  await pendingBooking.locator('button').click();
  await page.getByRole('button', { name: 'Xác nhận' }).click();
  await expect(page.locator('tr', { hasText: 'Vé tham quan Hội An - fixture' }).filter({ hasText: 'CONFIRMED' }).first()).toBeVisible();
});

test('SUPER_ADMIN: approve Partner and moderated resources; public sees approved data', async ({ page }) => {
  test.skip(!seedPassword, 'SEED_PASSWORD is required for E2E');
  await login(page, 'admin@hugotravel.vn');
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText('Trung tâm điều hành')).toBeVisible();

  await page.goto('/admin/partner-applications');
  const applicationRow = page.locator('tr', { hasText: pendingBusiness });
  await expect(applicationRow).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await applicationRow.locator('button[title="Phê duyệt"]').click();
  await expect(applicationRow.getByText('APPROVED', { exact: true })).toBeVisible();

  for (const [resource, title] of [['places', placeName], ['tours', tourName], ['blogs', blogName]] as const) {
    await page.goto(`/admin/${resource}`);
    const card = page.locator('article', { hasText: title });
    await expect(card).toBeVisible();
    await card.getByRole('link', { name: /Xem và quyết định/ }).click();
    await page.getByRole('button', { name: 'Phê duyệt' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/${resource}`));
  }

  await page.goto('/explore');
  await expect(page.getByText(placeName, { exact: true })).toBeVisible();
  await page.goto('/tours');
  await expect(page.getByText(tourName, { exact: true })).toBeVisible();
  await page.goto('/blog');
  await expect(page.getByText(blogName, { exact: true })).toBeVisible();

  await login(page, 'tour@hugotravel.vn');
  await archivePartnerResource(page, 'places', placeName, 'SUSPENDED');
  await archivePartnerResource(page, 'tours', tourName, 'SUSPENDED');
  await archivePartnerResource(page, 'tickets', ticketName, 'INACTIVE');
  await archivePartnerResource(page, 'blogs', blogName, 'SUSPENDED');
});
