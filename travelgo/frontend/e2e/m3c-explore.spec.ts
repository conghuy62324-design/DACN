import { expect, Page, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const seedPassword = process.env.SEED_PASSWORD || '';

async function login(page: Page): Promise<string> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('customer.a@hugotravel.vn');
  await page.locator('input[name="password"]').fill(seedPassword);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login$/);
  const token = await page.evaluate(() => localStorage.getItem('travelgo_token'));
  expect(token).toBeTruthy();
  return token!;
}

async function updateConsent(page: Page, analyticsEnabled: boolean, personalizationEnabled: boolean): Promise<void> {
  const status = await page.evaluate(async ({ analytics, personalization }) => {
    const token = localStorage.getItem('travelgo_token');
    const response = await fetch('/api/intelligence/consent', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ analyticsEnabled: analytics, personalizationEnabled: personalization }),
    });
    return response.status;
  }, { analytics: analyticsEnabled, personalization: personalizationEnabled });
  expect(status).toBe(200);
}

test('CUSTOMER: two preferences + budget + category -> server why -> Detail -> Favorite', async ({ page, request }) => {
  test.skip(!seedPassword, 'SEED_PASSWORD is required for M3-C E2E');
  const token = await login(page);
  await updateConsent(page, true, true);

  const publicPlaces = await request.get('/api/places?category=restaurant&search=HuGo%20Seafood');
  expect(publicPlaces.status()).toBe(200);
  const restaurant = ((await publicPlaces.json()).data as Array<{ id: string }>)[0];
  expect(restaurant).toBeTruthy();
  await request.delete(`/api/favorites/${restaurant.id}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { contractVersion: '1.0', sessionId: `m3c-cleanup-${Date.now()}`, uiSurface: 'explore_results' },
  });

  const payloads: any[] = [];
  page.on('request', (outgoing) => {
    if (outgoing.method() === 'POST' && outgoing.url().endsWith('/api/intelligence/recommendations')) {
      payloads.push(outgoing.postDataJSON());
    }
  });

  await page.goto('/explore?category=restaurant&search=HuGo%20Seafood');
  await page.getByTestId('explore-city').selectOption('Hội An');
  await page.getByTestId('explore-preference-am-thuc').click();
  await page.getByTestId('explore-preference-nghi-duong').click();
  await page.getByTestId('explore-budget').fill('500000');

  await expect.poll(() => payloads.some((payload) =>
    payload?.filters?.category === 'restaurant' &&
    payload?.filters?.destinationCity === 'Hội An' &&
    payload?.filters?.search === 'HuGo Seafood' &&
    payload?.dailyBudgetPerPerson === 500000 &&
    JSON.stringify(payload?.explicitPreferences) === JSON.stringify(['am-thuc', 'nghi-duong']),
  )).toBe(true);

  await expect(page.getByTestId('recommendation-fallback')).toContainText('Hội An');

  const card = page.locator('[data-testid^="recommendation-card-"]').first();
  await expect(card).toBeVisible();
  await expect(card.locator('[data-testid^="recommendation-why-"]')).toContainText(/Phù hợp sở thích|Chi phí ước tính/);
  await expect(card.locator('[data-testid^="recommendation-reasons-"]')).toContainText('Hợp sở thích');
  await expect(card.locator('[data-testid^="recommendation-reasons-"]')).toContainText('Hợp ngân sách ước tính');
  await card.scrollIntoViewIfNeeded();
  await expect(card).toHaveAttribute('data-attribution-ready', 'true', { timeout: 10_000 });

  await card.getByRole('link', { name: 'Chi tiết' }).click();
  await expect(page).toHaveURL(/\/places\/[0-9a-f-]+/);
  const favorite = page.getByTestId('place-favorite');
  await expect(favorite).toHaveAttribute('aria-pressed', 'false');
  const favoriteMutation = page.waitForResponse((response) =>
    response.url().includes('/api/favorites/') && response.request().method() === 'POST');
  await favorite.click();
  expect((await favoriteMutation).status()).toBe(201);
  await expect(favorite).toHaveAttribute('aria-pressed', 'true');

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test('CUSTOMER: a slower stale recommendation response cannot overwrite the latest search', async ({ page }) => {
  test.skip(!seedPassword, 'SEED_PASSWORD is required for M3-C E2E');
  await login(page);
  await updateConsent(page, true, true);

  await page.route('**/api/intelligence/recommendations', async (route) => {
    const payload = route.request().postDataJSON();
    if (payload?.filters?.search === 'HuGo Riverside') await new Promise((resolve) => setTimeout(resolve, 1200));
    await route.continue();
  });

  await page.goto('/explore');
  const search = page.getByTestId('explore-search');
  await search.fill('HuGo Riverside');
  await page.waitForTimeout(350);
  await search.fill('HuGo Seafood');
  await expect(page.getByText('HuGo Seafood', { exact: true }).first()).toBeVisible();
  await page.waitForTimeout(1400);
  await expect(page.getByText('HuGo Seafood', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('HuGo Riverside Hotel', { exact: true })).toHaveCount(0);
});

test('ANONYMOUS: public Bayesian/price fallback without protected recommendation or fake requestId', async ({ page }) => {
  const protectedRequests: string[] = [];
  page.on('request', (outgoing) => {
    if (outgoing.url().includes('/api/intelligence/recommendations')) protectedRequests.push(outgoing.url());
  });

  await page.goto('/explore?category=attraction');
  await expect(page.locator('[data-testid^="recommendation-card-"]').first()).toBeVisible();
  await expect(page.getByTestId('explore-ranking-mode')).toContainText('Bayesian');
  await expect(page.getByTestId('explore-preference-am-thuc')).toBeDisabled();
  await expect(page.getByTestId('explore-budget')).toBeDisabled();
  await expect(page.getByTestId('explore-public-sort')).toBeVisible();
  expect(protectedRequests).toHaveLength(0);

  const priceRequest = page.waitForRequest((outgoing) =>
    outgoing.method() === 'GET' && outgoing.url().includes('/api/places') && outgoing.url().includes('sortBy=priceAsc'));
  await page.getByTestId('explore-public-sort').selectOption('priceAsc');
  await priceRequest;
  await expect(page.getByTestId('explore-ranking-mode')).toContainText('giá từ thấp đến cao');
  expect(protectedRequests).toHaveLength(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByTestId('explore-smart-filters')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});

test('PERSONALIZATION OPT-OUT: one-shot inputs work but client emits no visible acknowledgement', async ({ page }) => {
  test.skip(!seedPassword, 'SEED_PASSWORD is required for M3-C E2E');
  await login(page);
  await updateConsent(page, false, false);

  const payloads: any[] = [];
  const visibleRequests: string[] = [];
  page.on('request', (outgoing) => {
    if (outgoing.method() !== 'POST') return;
    if (outgoing.url().endsWith('/api/intelligence/recommendations')) payloads.push(outgoing.postDataJSON());
    if (outgoing.url().endsWith('/api/intelligence/recommendations/visible')) visibleRequests.push(outgoing.url());
  });

  await page.goto('/explore?category=hotel');
  await expect(page.getByTestId('explore-one-shot-note')).toBeVisible();
  await page.getByTestId('explore-preference-nghi-duong').click();
  await page.getByTestId('explore-preference-bien').click();
  await page.getByTestId('explore-budget').fill('1500000');

  await expect.poll(() => payloads.some((payload) =>
    payload?.filters?.category === 'hotel' &&
    payload?.dailyBudgetPerPerson === 1500000 &&
    JSON.stringify(payload?.explicitPreferences) === JSON.stringify(['nghi-duong', 'bien']),
  )).toBe(true);

  const card = page.locator('[data-testid^="recommendation-card-"]').first();
  await expect(card).toBeVisible();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2500);
  await expect(card).toHaveAttribute('data-attribution-ready', 'false');
  expect(visibleRequests).toHaveLength(0);
});
