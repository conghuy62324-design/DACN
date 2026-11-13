import { test, expect, type Page, type Locator } from '@playwright/test';

// All security payloads stay in intercepted responses. No persistence/auth evidence.
const name = `Đà Nẵng "A" & <b>đẹp</b> <img src='/t05-missing' onerror='window.__popupProbe++'>`;
const description = `Mô tả 'Việt' & < > <img src='/t05-missing' onerror='window.__popupProbe++'>`;
const city = 'Huế & <em>Hội An</em>';
const firstId = '11111111-1111-4111-8111-111111111111';
const secondId = '22222222-2222-4222-8222-222222222222';
const tripId = '33333333-3333-4333-8333-333333333333';
const place = { id: firstId, slug: 'fixture', name, description, summary: description, city, province: 'Huế', address: 'Fixture', category: 'attraction', rating: 4.5, bayesianRating: 4.25, reviewCount: 10, priceFrom: 123000, latitude: 16.0544, longitude: 108.2022, heroImage: '/t05-image.png', galleryImages: [], highlights: [], amenities: [] };
const second = { ...place, id: secondId, name: 'Điểm hợp lệ “B” & bạn', city: 'Đà Nẵng', latitude: 16.0644, longitude: 108.2122 };
const activity = { id: 'act-a', placeId: firstId, title: name, description, category: 'sightseeing', timeSlot: 'morning', latitude: place.latitude, longitude: place.longitude, durationMinutes: 30, estimatedCostVND: 123000 };
const itinerary = { id: tripId, title: 'Popup test itinerary', departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng', startDate: '2028-02-28', endDate: '2028-02-28', daysCount: 1, nightsCount: 0,
  costBasis: 'GROUP_VND_V1', costAssumptions: ['Ước tính cả nhóm'], adults: 2, children: 0, pacing: 'balanced', transportation: 'motorbike', preferences: [], totalBudgetUserVND: 1000000, totalEstimatedCostVND: 123000, costDifferenceVND: 877000, budgetStatus: 'within_budget', budgetAdvice: 'Ước tính', summary: 'Fixture', selectedPlaceIds: [firstId, secondId],
  days: [{ dayNumber: 1, date: '2028-02-28', themeTitle: 'Ngày 1', centroid: { latitude: place.latitude, longitude: place.longitude }, lodgingNights: 0, lodgingEstimatedCostVND: 0, dayEstimatedCostVND: 123000,
    activities: [activity, { ...activity, id: 'act-b', placeId: secondId, title: second.name, description: 'Mô tả bình thường', latitude: second.latitude, longitude: second.longitude, estimatedCostVND: 0 }] }] };

async function fixtures(page: Page, signedIn: boolean) {
  const unhandled: string[] = [];
  await page.addInitScript(({ signedIn }) => {
    (window as any).__popupProbe = 0;
    if (signedIn) localStorage.setItem('travelgo_token', 'frontend-response-fixture-only');
  }, { signedIn });
  // Tiles/assets use deterministic image responses; the provider in application code is unchanged.
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
  await page.route('**/t05-image.png', (route) => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('https://a.tile.openstreetmap.de/**', (route) => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('**/t05-missing', (route) => route.fulfill({ status: 404, body: '' }));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: any;
    if (path === '/api/auth/me') data = { id: firstId, fullName: 'Popup Fixture', email: 'popup@example.test', roles: ['CUSTOMER'] };
    else if (path === '/api/intelligence/consent') data = { hasDecision: true, analyticsEnabled: false, personalizationEnabled: false, policyVersion: '1.0', retentionDays: 90 };
    else if (path === '/api/favorites') data = { items: [] };
    else if (path === '/api/places') data = [place, second];
    else if (path === '/api/tours/plan') data = itinerary;
    else if (path === `/api/trips/${tripId}`) data = { ...itinerary, status: 'active', userId: firstId, actualSpentVND: 0, progressPercent: 50,
      progress: { eligibleActivityIds: ['act-a', 'act-b'], checkedActivityIds: ['act-a'], unmatchedCheckinCount: 0, ineligibleActivityCount: 0 },
      checkins: [{ activityId: 'act-a', resolvedActivityId: 'act-a', placeId: firstId, placeName: name, checkedInAt: '2028-02-28T00:00:00Z', hasAttachedLocation: false }], notes: '', isPublic: false };
    else { unhandled.push(`${route.request().method()} ${path}`); await route.fulfill({ status: 500, json: { success: false } }); return; }
    await route.fulfill({ json: { success: true, data } });
  });
  return unhandled;
}

async function assertPlainPopup(page: Page, popup: Locator, surface: string) {
  await expect(popup).toBeVisible();
  // Explicitly dispatch an error as well as natural 404 errors: no dependence on network timing.
  await popup.locator('[onerror]').evaluateAll((nodes) => nodes.forEach((node) => node.dispatchEvent(new Event('error'))));
  const witness = { surface, handlerExecutions: await page.evaluate(() => (window as any).__popupProbe), inlineHandlers: await popup.locator('[onerror]').count(), literalName: (await popup.textContent())?.includes(name) };
  console.log(JSON.stringify({ frontendSecurityWitness: witness, persistenceEvidence: false }));
  expect(witness.handlerExecutions).toBe(0);
  expect(witness.inlineHandlers).toBe(0);
  expect(witness.literalName).toBe(true);
  await expect(popup.locator('script, iframe, b, em, img[onerror]')).toHaveCount(0);
}

test('Explore popup treats API text as text; selection and flyTo still open valid content', async ({ page }) => {
  const unhandled = await fixtures(page, false);
  await page.goto('/explore');
  const popup = page.locator('.leaflet-popup-content');
  await assertPlainPopup(page, popup, 'Explore');
  await expect(popup).toContainText(city);
  await expect(popup).toContainText('123.000');
  await expect(popup.locator('img')).toHaveAttribute('alt', name);
  await expect(popup.locator('img')).toHaveAttribute('src', /\/t05-image.png$/);
  await page.getByTestId(`recommendation-card-${secondId}`).click();
  await expect(popup).toHaveCount(1); // Leaflet briefly retains the fading previous popup.
  await expect(popup).toContainText(second.name);
  await expect(page.locator('.custom-leaflet-marker .ring-orange-400')).toHaveCount(1);
  await page.locator('.leaflet-popup-close-button').click();
  await expect(popup).toHaveCount(0);
  await page.locator('.custom-leaflet-marker').filter({ has: page.locator('.ring-orange-400') }).click();
  await expect(popup).toContainText(second.name);
  expect(unhandled).toEqual([]);
});

test('Planner popup protects itinerary text and retains marker selection, costs and day lines', async ({ page }) => {
  const unhandled = await fixtures(page, false);
  await page.goto('/tour-planner');
  const decline = page.getByTestId('telemetry-decline'); if (await decline.isVisible()) await decline.click();
  await page.locator('input[name="startDate"]').fill('2028-02-28');
  await page.locator('input[name="endDate"]').fill('2028-02-28');
  await page.locator('form button[type="submit"]').click();
  const marker = page.locator('.custom-itinerary-marker').filter({ hasText: '1.1' });
  await marker.click();
  const popup = page.locator('.leaflet-popup-content');
  await assertPlainPopup(page, popup, 'Planner');
  await expect(popup).toContainText(description);
  await expect(popup).toContainText('123.000đ');
  await expect(page.locator('.leaflet-overlay-pane path')).toHaveCount(1);
  await expect(page.getByTestId('itinerary-activity').first()).toHaveClass(/border-sky/);
  await expect(page.getByText('1 Ngày 0 Đêm')).toBeVisible();
  expect(await page.locator('.leaflet-container').evaluate((el) => el.clientHeight)).toBe(480);
  expect(unhandled).toEqual([]);
});

test('TripDetail popup keeps plain text and T04-B check-in projection indicators', async ({ page }) => {
  const unhandled = await fixtures(page, true);
  await page.goto(`/my-trips/${tripId}`);
  const checked = page.locator('.custom-checkin-marker').filter({ hasText: '✓' });
  await checked.click();
  const popup = page.locator('.leaflet-popup-content');
  await assertPlainPopup(page, popup, 'TripDetail');
  await expect(popup).toContainText(description);
  await expect(popup).toContainText('ĐÃ GHÉ THĂM');
  await expect(page.getByTestId('trip-progress')).toContainText('1/2 hoạt động');
  await expect(page.getByTestId('trip-cost-summary')).toContainText('VND cho cả nhóm');
  await expect(page.getByTestId('trip-cost-summary')).toContainText('123.000');
  await page.locator('.custom-checkin-marker').filter({ hasText: 'N1' }).click();
  await expect(popup).toHaveCount(1);
  await expect(popup).toContainText('ĐIỂM DỰ KIẾN');
  await expect(popup).toContainText(second.name);
  expect(await page.locator('.leaflet-container').evaluate((el) => el.clientHeight)).toBe(450);
  expect(unhandled).toEqual([]);
});

test('map DOM helpers enforce URL policy and never create attributes from quotes or marker labels', async ({ page }) => {
  await fixtures(page, false); await page.goto('/explore');
  const result = await page.evaluate(async ({ place, activity, name }) => {
    // Load the real helper through Vite, with a real DOM rather than a DOM mock.
    const modulePath = '/src/utils/mapPopup.ts';
    const helper = await import(/* @vite-ignore */ modulePath);
    const invalid = ['', 'javascript:window.__popupProbe++', ' JaVaScRiPt:alert(1)', 'data:image/svg+xml,<svg onload=alert(1)>', 'vbscript:msgbox(1)', 'file:///tmp/test.png', 'blob:https://example.test/x', '//example.test/image.png', '/\\example.test/image.png', 'https://example.test/\nimage.png', 'https://', 'images/photo.png', '#photo', null];
    const checks = invalid.map((value) => {
      const popup = helper.placePopup({ ...place, heroImage: value }); const image = popup.querySelector('img');
      return { rejected: helper.safeMapUrl(value) === undefined, noSrc: !image.hasAttribute('src'), alt: image.alt === name, noInlineHandler: !image.hasAttribute('onerror') };
    });
    const accepted = ['http://example.test/image.png', 'https://example.test/image.png?x=1&y=2', '/t05-image.png'];
    const urls = accepted.map((value) => ({ input: value, output: helper.safeMapUrl(value) }));
    const quoted = helper.placePopup({ ...place, heroImage: `https://example.test/photo.png\" onerror=\"window.__popupProbe++`, name });
    const round = helper.roundMapMarker(`<img src=x onerror='window.__popupProbe++'>`, '#2563eb', 28);
    const slot = helper.plannerPopup(1, { ...activity, timeSlot: `<img src=x onerror='window.__popupProbe++'>` }, '#2563eb');
    const pin = helper.placeMarker(4.5, 'bg-teal-600', true);
    const host = document.createElement('div'); host.append(quoted, round, slot, pin); document.body.append(host);
    const noInjectedElements = round.querySelectorAll('img').length === 0 && slot.querySelectorAll('img').length === 0;
    const noEventAttributes = [...host.querySelectorAll('*')].every((el) => [...el.attributes].every((a) => !a.name.startsWith('on')));
    const image = quoted.querySelector('img'); image.dispatchEvent(new Event('error'));
    const failedLoadUsesAlt = !image.hasAttribute('src') && image.alt === name;
    const validImage = helper.placePopup({ ...place, heroImage: '/t05-image.png' }).querySelector('img');
    host.append(validImage); await validImage.decode();
    const validImageLoaded = validImage.naturalWidth > 0;
    host.remove();
    return { checks, urls, noInjectedElements, noEventAttributes, failedLoadUsesAlt, validImageLoaded, probe: (window as any).__popupProbe };
  }, { place, activity, name });
  expect(result.checks).toHaveLength(14);
  for (const check of result.checks) expect(check).toEqual({ rejected: true, noSrc: true, alt: true, noInlineHandler: true });
  expect(result.urls[0].output).toBe(result.urls[0].input);
  expect(result.urls[1].output).toBe(result.urls[1].input);
  expect(result.urls[2].output).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/t05-image.png$/);
  expect(result.noInjectedElements).toBe(true); expect(result.noEventAttributes).toBe(true);
  expect(result.failedLoadUsesAlt).toBe(true); expect(result.validImageLoaded).toBe(true); expect(result.probe).toBe(0);
});
