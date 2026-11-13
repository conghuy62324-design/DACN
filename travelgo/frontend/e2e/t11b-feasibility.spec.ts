import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

// Outputs from the real planner, replayed through UI routes. Save/GET here are
// synthetic; the separate guarded PostgreSQL regression proves persistence.
const evaluation = JSON.parse(readFileSync('../docs/evidence/t11b/after-v3/scenario_results_v3.json', 'utf8'));
const plan = evaluation.results.find((row: any) => row.id === 'P05_LOW_BUDGET').actual.rawServiceResponse;
const user = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fullName: 'T11-B UI Fixture', email: 't11b@example.test', roles: ['CUSTOMER'] };
const tripId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

async function setup(page: Page, empty = false, fixture = plan) {
  let saved: any;
  const requests: any[] = [];
  await page.addInitScript(user => {
    localStorage.setItem('travelgo_token', 'synthetic-t11b'); localStorage.setItem('travelgo_user', JSON.stringify(user));
  }, user);
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url()).pathname;
    let data: any = [];
    if (url === '/api/auth/me') data = user;
    if (url === '/api/intelligence/consent') data = { hasDecision: true, analyticsEnabled: false, personalizationEnabled: false };
    if (url === '/api/tours/plan') {
      const input = route.request().postDataJSON(); requests.push(input);
      if (empty && requests.length === 1) return route.fulfill({ status: 422, json: { success: false, code: 'NO_SIGHTSEEING_FOR_DESTINATION', message: 'Chưa đủ dữ liệu để tạo lịch trình tham quan.' } });
      data = { ...structuredClone(fixture), destinationCity: input.destinationCity, totalBudgetUserVND: input.totalBudget,
        costDifferenceVND: input.totalBudget - fixture.totalEstimatedCostVND, budgetStatus: input.totalBudget >= fixture.totalEstimatedCostVND ? 'within_budget' : 'over_budget',
        overBudgetVND: Math.max(0, fixture.totalEstimatedCostVND - input.totalBudget) };
    }
    if (url === '/api/trips' && route.request().method() === 'POST') {
      saved = { ...route.request().postDataJSON().itinerary, id: tripId, userId: user.id, status: 'upcoming', actualSpentVND: 0,
        checkins: [], progressPercent: 0, isPublic: false, updatedAt: new Date().toISOString() };
      data = saved;
    }
    if (url === `/api/trips/${tripId}`) data = saved;
    return route.fulfill({ status: url === '/api/trips' && route.request().method() === 'POST' ? 201 : 200, json: { success: true, data } });
  });
  await page.goto('/tour-planner');
  await page.locator('input[name=startDate]').fill(fixture.startDate);
  await page.locator('input[name=endDate]').fill(fixture.endDate);
  await page.locator('input[name=adults]').fill(String(fixture.adults));
  await page.locator('input[name=children]').fill(String(fixture.children));
  await page.locator('input[name=totalBudget]').fill('100000');
  if (empty) await page.locator('select[name=destinationCity]').selectOption('Hà Nội');
  return { requests, saved: () => saved };
}
const generate = (page: Page) => page.locator('form button[type=submit]').click();

test('over-budget: correct amounts, edit, save reference and reopen keep current warning', async ({ page }) => {
  const state = await setup(page); await generate(page);
  const notice = page.getByTestId('planner-budget-notice');
  await expect(notice).toContainText('Ngân sách: 100.000đ');
  await expect(notice).toContainText('Dự toán cả nhóm: 750.000đ');
  await expect(notice).toContainText('Vượt ngân sách: 650.000đ');
  await expect(notice).toContainText('chưa đáp ứng ngân sách');
  await expect(page.getByTestId('activity-cost-source').first()).toContainText('Catalog priceFrom');
  await expect(page.getByTestId('hotel-estimate-source')).toContainText('0 đêm');
  await page.getByTestId('itinerary-activity').filter({ hasText: 'Khám phá' }).getByTitle('Xóa địa điểm này', { exact: true }).click();
  await expect(notice).toContainText('Dự toán cả nhóm: 650.000đ');
  await expect(notice).toContainText('Vượt ngân sách: 550.000đ');
  await page.screenshot({ path: '../docs/evidence/t11b/browser/over-budget-edited.png', fullPage: true });
  await page.getByRole('button', { name: 'Lưu phương án tham khảo', exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/my-trips/${tripId}$`));
  expect(state.saved().totalBudgetUserVND).toBe(100000);
  expect(state.saved().constraintViolations).toEqual(['BUDGET_EXCEEDED']);
  await expect(notice).toContainText('Vượt ngân sách: 550.000đ');
  await page.reload(); await expect(notice).toContainText('Vượt ngân sách: 550.000đ');
});

test('edit reduces excess to zero; save/reopen does not retain old warning', async ({ page }) => {
  await setup(page); await generate(page);
  await expect(page.getByTestId('planner-budget-notice')).toContainText('Vượt ngân sách');
  while (await page.getByTitle('Xóa địa điểm này', { exact: true }).count()) {
    await page.getByTitle('Xóa địa điểm này', { exact: true }).first().click();
  }
  await expect(page.getByTestId('planner-budget-notice')).toContainText('Dự toán trong ngân sách');
  await page.getByRole('button', { name: 'Lưu hành trình này', exact: true }).first().click();
  await expect(page).toHaveURL(new RegExp(`/my-trips/${tripId}$`));
  await page.reload();
  await expect(page.getByTestId('planner-budget-notice')).toContainText('Dự toán trong ngân sách');
  await expect(page.getByTestId('planner-budget-notice')).not.toContainText('Vượt ngân sách');
});

test('empty destination keeps form; change destination and regenerate', async ({ page }) => {
  const state = await setup(page, true); await generate(page);
  await expect(page.getByTestId('planner-generation-error')).toContainText('Chưa đủ dữ liệu để tạo lịch trình tham quan');
  await expect(page.locator('form')).toBeVisible();
  await expect(page.locator('input[name=totalBudget]')).toHaveValue('100000');
  await expect(page.getByTestId('itinerary-activity')).toHaveCount(0);
  await expect(page.getByTestId('planner-budget-notice')).toHaveCount(0);
  await page.screenshot({ path: '../docs/evidence/t11b/browser/insufficient-catalog.png', fullPage: true });
  await page.locator('select[name=destinationCity]').selectOption('Đà Nẵng');
  await generate(page);
  await expect(page.getByTestId('planner-generation-error')).toHaveCount(0);
  await expect(page.getByTestId('itinerary-activity')).toHaveCount(4);
  expect(state.requests.map(v => v.destinationCity)).toEqual(['Hà Nội', 'Đà Nẵng']);
});

test('revise over-budget request preserves inputs; regenerate with user-chosen budget', async ({ page }) => {
  const state = await setup(page); await generate(page);
  await page.getByRole('button', { name: 'Sửa yêu cầu và tạo lại', exact: true }).click();
  await expect(page.locator('input[name=totalBudget]')).toHaveValue('100000');
  await expect(page.locator('input[name=startDate]')).toHaveValue('2027-03-01');
  await page.locator('input[name=totalBudget]').fill('750000'); await generate(page);
  await expect(page.getByTestId('planner-budget-notice')).toContainText('Dự toán trong ngân sách');
  await expect(page.getByTestId('planner-budget-notice')).toContainText('Dự toán cả nhóm: 750.000đ');
  expect(state.requests.map(v => v.totalBudget)).toEqual([100000, 750000]);
});

test('missing prices show explicit planner assumptions for activities and hotel', async ({ page }) => {
  const missing = evaluation.results.find((row: any) => row.id === 'P23_MISSING_GROUP_NIGHTS').actual.rawServiceResponse;
  await setup(page, false, missing); await generate(page);
  await expect(page.getByTestId('activity-cost-source').first()).toContainText('Giả định planner T11-B: 300000');
  await expect(page.getByTestId('hotel-estimate-source')).toContainText('Giả định planner T11-B: 400000');
  await expect(page.getByTestId('hotel-estimate-source')).toContainText('chưa xác minh');
  await expect(page.getByTestId('hotel-estimate-source')).not.toContainText('NaN');
});
