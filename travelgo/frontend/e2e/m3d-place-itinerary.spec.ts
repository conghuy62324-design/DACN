import { expect, Page, test } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

const seedPassword = process.env.SEED_PASSWORD || '';

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.locator('input[name="email"]').fill('customer.a@hugotravel.vn');
  await page.locator('input[name="password"]').fill(seedPassword);
  await page.locator('form button[type="submit"]').click();
  await expect(page).not.toHaveURL(/\/login$/);
}

async function seededHotel(request: any): Promise<{ id: string; name: string }> {
  const response = await request.get('/api/places?category=hotel&search=HuGo%20Riverside');
  expect(response.status()).toBe(200);
  const hotel = ((await response.json()).data as Array<{ id: string; name: string }>)[0];
  expect(hotel).toBeTruthy();
  return hotel;
}

test('CUSTOMER desktop: Recommendation -> Detail -> mandatory Planner -> Save -> Refresh -> Reopen', async ({ page, request }) => {
  test.skip(!seedPassword, 'SEED_PASSWORD is required for M3-D E2E');
  const hotel = await seededHotel(request);
  await login(page);

  await page.goto('/explore?category=hotel&search=HuGo%20Riverside');
  const card = page.locator('[data-testid^="recommendation-card-"]', { hasText: hotel.name }).first();
  await expect(card).toBeVisible();
  await card.getByRole('link', { name: 'Chi tiết' }).click();
  await expect(page).toHaveURL(new RegExp(`/places/${hotel.id}`));

  await expect(page.getByTestId('add-place-to-itinerary')).toBeVisible();
  await page.getByTestId('add-place-to-itinerary').click();
  await expect(page).toHaveURL(new RegExp(`/tour-planner\\?mandatoryPlaceId=${hotel.id}`));
  await expect(page.getByTestId('mandatory-place-panel')).toContainText(hotel.name);
  await page.reload();
  await expect(page.getByTestId('mandatory-place-panel')).toContainText(hotel.name);

  await page.locator('input[name="startDate"]').fill('2027-06-01');
  await page.locator('input[name="endDate"]').fill('2027-06-01');
  const planResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/tours/plan') && response.request().method() === 'POST');
  await page.locator('form button[type="submit"]').click();
  expect((await planResponse).status()).toBe(200);
  await expect(page.locator(`[data-testid="itinerary-activity"][data-place-id="${hotel.id}"]`)).toHaveCount(1);

  const saveResponse = page.waitForResponse((response) =>
    response.url().endsWith('/api/trips') && response.request().method() === 'POST');
  await page.getByRole('button', { name: /Lưu hành trình này/ }).first().click();
  expect((await saveResponse).status()).toBe(201);
  await expect(page).toHaveURL(/\/my-trips\/[0-9a-f-]+$/);
  const tripId = page.url().split('/').pop()!;
  await expect(page.locator(`[data-testid="saved-trip-activity"][data-place-id="${hotel.id}"]`)).toHaveCount(1);

  await page.reload();
  await expect(page.locator(`[data-testid="saved-trip-activity"][data-place-id="${hotel.id}"]`)).toHaveCount(1);
  await page.goto('/my-trips');
  await page.locator(`[data-testid="trip-card"][data-trip-id="${tripId}"]`).click();
  await expect(page).toHaveURL(new RegExp(`/my-trips/${tripId}$`));
  await expect(page.locator(`[data-testid="saved-trip-activity"][data-place-id="${hotel.id}"]`)).toHaveCount(1);
});

test('ANONYMOUS: CTA requests login and never creates a Trip', async ({ page, request }) => {
  const hotel = await seededHotel(request);
  const tripWrites: string[] = [];
  page.on('request', (outgoing) => {
    if (outgoing.url().endsWith('/api/trips') && outgoing.method() === 'POST') tripWrites.push(outgoing.url());
  });

  await page.goto(`/places/${hotel.id}`);
  await page.getByTestId('add-place-to-itinerary').click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('form')).toBeVisible();
  expect(tripWrites).toHaveLength(0);
  if (seedPassword) {
    await page.locator('input[name="email"]').fill('customer.a@hugotravel.vn');
    await page.locator('input[name="password"]').fill(seedPassword);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(new RegExp(`/tour-planner\\?mandatoryPlaceId=${hotel.id}`));
    await expect(page.getByTestId('mandatory-place-panel')).toContainText(hotel.name);
    expect(tripWrites).toHaveLength(0);
  }
});

test('CUSTOMER mobile: CTA and mandatory-place planner remain usable without horizontal overflow', async ({ page, request }) => {
  test.skip(!seedPassword, 'SEED_PASSWORD is required for M3-D E2E');
  const hotel = await seededHotel(request);
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.goto(`/places/${hotel.id}`);
  await expect(page.getByTestId('add-place-to-itinerary')).toBeVisible();
  await page.getByTestId('add-place-to-itinerary').click();
  await expect(page.getByTestId('mandatory-place-panel')).toContainText(hotel.name);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();

  await page.getByTestId('remove-mandatory-place').click();
  await expect(page).not.toHaveURL(/mandatoryPlaceId=/);
  await expect(page.getByTestId('mandatory-place-panel')).toHaveCount(0);
  await page.goto(`/tour-planner?mandatoryPlaceId=${hotel.id}`);
  await expect(page.getByTestId('mandatory-place-panel')).toContainText(hotel.name);

  await page.locator('input[name="startDate"]').fill('2027-06-02');
  await page.locator('input[name="endDate"]').fill('2027-06-02');
  await page.locator('form button[type="submit"]').click();
  await expect(page.locator(`[data-testid="itinerary-activity"][data-place-id="${hotel.id}"]`)).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBeTruthy();
});
