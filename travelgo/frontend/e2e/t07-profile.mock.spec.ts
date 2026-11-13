import { expect, test, type Page, type Route } from '@playwright/test';

// Deliberately synthetic API responses/tokens; this suite does not prove server auth.
const a = { id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', fullName: 'Profile Fixture A', email: 'a@example.test', roles: ['CUSTOMER'] };
const b = { id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', fullName: 'Profile Fixture B', email: 'b@example.test', phone: '0901111222', roles: ['CUSTOMER'] };
const tokenA = 'synthetic-fixture-a'; const tokenB = 'synthetic-fixture-b';
const reply = (route: Route, data: unknown, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ success: status < 400, data, ...(status >= 400 ? { message: 'Fixture unauthorized', code: 'INVALID_TOKEN' } : {}) }) });
const gate = () => { let release!: () => void; const promise = new Promise<void>(r => { release = r; }); return { promise, release }; };
async function fixtures(page: Page, overrides: (route: Route, pathname: string) => Promise<boolean> = async () => false) {
  await page.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (await overrides(route, pathname)) return;
    if (pathname === '/api/auth/me') return reply(route, route.request().headers().authorization === `Bearer ${tokenB}` ? b : a);
    if (pathname === '/api/auth/login') return reply(route, { token: tokenB, user: b });
    if (pathname === '/api/intelligence/consent') return reply(route, { hasDecision: true, analyticsEnabled: false, personalizationEnabled: false, policyVersion: '1.0', retentionDays: 90 });
    if (pathname === '/api/favorites') return reply(route, []);
    if (pathname === '/api/bookings/my') return reply(route, []);
    // Public landing requests are irrelevant to authentication in these UI fixtures.
    return reply(route, []);
  });
  await page.addInitScript(({ token, user }) => {
    if (!sessionStorage.getItem('t07-initialized')) {
      localStorage.setItem('travelgo_token', token);
      localStorage.setItem('travelgo_user', JSON.stringify(user));
      sessionStorage.setItem('t07-initialized', '1');
    }
  }, { token: tokenA, user: { ...a, fullName: 'Unverified cached name', phone: '0999999999' } });
}
async function loginB(page: Page) {
  await page.locator('input[name=email]').fill(b.email);
  await page.locator('input[name=password]').fill('FixturePassword1');
  await page.getByRole('button', { name: 'Đăng nhập ngay' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('travelgo_user') ?? 'null')?.id)).toBe(b.id);
}
async function logout(page: Page) {
  const desktop = page.locator('header').getByRole('button', { name: /Profile Fixture A|Menu tài khoản/ }).first();
  await desktop.click(); await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
}

test('baseline: Profile displays missing phone honestly and has no editable save form', async ({ page }) => {
  await fixtures(page); await page.goto('/profile');
  await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible();
  await expect(page.getByText('Chưa cung cấp', { exact: true })).toBeVisible();
  await expect(page.locator('main input, main form')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Lưu thay đổi/ })).toHaveCount(0);
  await expect(page.getByText(/Hạng Vàng|450|Thành viên thân thiết|Cập nhật thông tin cá nhân thành công/)).toHaveCount(0);
});

test('baseline: late bootstrap me cannot overwrite newly signed-in account', async ({ page }) => {
  const held = gate(); let requested = 0;
  await fixtures(page, async (route, pathname) => {
    if (pathname !== '/api/auth/me') return false;
    requested++; await held.promise; await reply(route, a); return true;
  });
  await page.goto('/login'); await expect.poll(() => requested).toBeGreaterThan(0);
  try {
    await loginB(page);
    const oldMe = page.waitForResponse(r => r.url().endsWith('/api/auth/me'));
    held.release(); await oldMe;
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('travelgo_user') ?? 'null')?.id)).toBe(b.id);
    // Navigate through React without starting a new bootstrap request.
    await page.locator('header').getByRole('button', { name: /Profile Fixture B|Menu tài khoản/ }).first().click();
    await page.getByRole('link', { name: 'Hồ sơ cá nhân', exact: true }).click();
    await expect(page.getByRole('heading', { name: b.fullName, exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('travelgo_user') ?? 'null')?.id)).toBe(b.id);
  } finally { held.release(); }
});

test('baseline: late 401 from previous account cannot clear the new session', async ({ page }) => {
  const held = gate(); let requested = 0;
  await fixtures(page, async (route, pathname) => {
    if (pathname !== '/api/favorites' || route.request().headers().authorization !== `Bearer ${tokenA}`) return false;
    requested++; await held.promise; await reply(route, null, 401); return true;
  });
  await page.goto('/profile'); await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible();
  await expect.poll(() => requested).toBeGreaterThan(0);
  try {
    await logout(page); await expect(page).toHaveURL(/\/login$/); await loginB(page);
    await expect(page.getByRole('heading', { name: b.fullName, exact: true })).toBeVisible();
    const old401 = page.waitForResponse(r => r.url().includes('/api/favorites') && r.status() === 401);
    held.release(); await old401;
    await expect.poll(() => page.evaluate(() => localStorage.getItem('travelgo_token'))).toBe(tokenB);
    await expect(page.getByRole('heading', { name: b.fullName, exact: true })).toBeVisible();
    await expect.poll(() => page.evaluate(() => localStorage.getItem('travelgo_token'))).toBe(tokenB);
  } finally { held.release(); }
});

test('loading hides cached identity; reload reads me; current-session 401 clears Profile', async ({ page }) => {
  const held = gate(); let requested = 0; let unauthorized = false;
  await fixtures(page, async (route, pathname) => {
    if (pathname !== '/api/auth/me') return false;
    requested++; await held.promise; await reply(route, unauthorized ? null : a, unauthorized ? 401 : 200); return true;
  });
  await page.goto('/profile'); await expect.poll(() => requested).toBeGreaterThan(0);
  try {
    await expect(page.getByText('Đang xác thực phiên đăng nhập…')).toBeVisible();
    await expect(page.getByText(/Unverified cached name|0999999999/)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toHaveCount(0);
    held.release();
    await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible();
    await expect(page.getByTestId('profile-phone')).toHaveText('Chưa cung cấp');
    const previous = requested; await page.reload(); await expect.poll(() => requested).toBeGreaterThan(previous);
    await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toBeVisible();
    unauthorized = true; await page.reload(); await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: a.fullName, exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => [localStorage.getItem('travelgo_token'), localStorage.getItem('travelgo_user')])).toEqual([null, null]);
  } finally { held.release(); }
});

test('logout prevents late bootstrap response from resurrecting a session', async ({ page }) => {
  const held = gate(); let requested = 0;
  await fixtures(page, async (route, pathname) => {
    if (pathname !== '/api/auth/me') return false;
    requested++; await held.promise; await reply(route, a); return true;
  });
  await page.goto('/login'); await expect.poll(() => requested).toBeGreaterThan(0);
  try {
    await loginB(page); await logout(page);
    const oldMe = page.waitForResponse(r => r.url().endsWith('/api/auth/me'));
    held.release(); await oldMe;
    await expect(page.getByRole('button', { name: 'Menu tài khoản' })).toHaveCount(0);
    expect(await page.evaluate(() => [localStorage.getItem('travelgo_token'), localStorage.getItem('travelgo_user')])).toEqual([null, null]);
    await page.goto('/profile'); await expect(page).toHaveURL(/\/login$/);
  } finally { held.release(); }
});

for (const mobile of [false, true]) {
  for (const roles of [['CUSTOMER'], ['PARTNER'], ['SUPER_ADMIN'], ['CUSTOMER', 'PARTNER', 'SUPER_ADMIN']]) {
    test(`roles, links and layout ${mobile ? 'mobile' : 'desktop'} ${roles.join('+')}`, async ({ page }) => {
      await page.setViewportSize(mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 });
      const person = { ...a, fullName: 'LongName'.repeat(20), email: `${'a'.repeat(60)}@${'b'.repeat(60)}.test`, roles };
      await fixtures(page, async (route, pathname) => {
        if (pathname !== '/api/auth/me') return false;
        await reply(route, person); return true;
      });
      await page.goto('/profile');
      await expect(page.getByRole('heading', { name: person.fullName, exact: true })).toBeVisible();
      const labels = { CUSTOMER: 'Khách hàng', PARTNER: 'Đối tác', SUPER_ADMIN: 'Quản trị viên' };
      await expect(page.getByTestId('profile-roles')).toHaveText(roles.map(r => labels[r as keyof typeof labels]).join(', '));
      await expect(page.getByRole('img', { name: 'Chưa có ảnh đại diện' })).toBeVisible();
      await expect(page.locator('main img')).toHaveCount(0);
      await expect(page.locator('main input, main form, main button')).toHaveCount(0);
      const fits = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
      expect(await fits()).toBe(true);
      for (const href of ['/bookings', '/favorites']) {
        await page.locator(`main a[href="${href}"]`).click(); await expect(page).toHaveURL(new RegExp(`${href}$`));
        await page.goBack(); await expect(page.getByRole('heading', { name: person.fullName, exact: true })).toBeVisible();
      }
      await page.getByRole('button', { name: mobile ? 'Mở menu' : 'Menu tài khoản', exact: true }).click();
      await expect(page.locator('header a[href="/admin"]')).toHaveCount(roles.includes('SUPER_ADMIN') ? 1 : 0);
      await expect(page.locator('header a[href="/partner"]')).toHaveCount(roles.includes('PARTNER') ? 1 : 0);
      await expect(page.locator('header a[href="/become-partner"]')).toHaveCount(roles.includes('PARTNER') ? 0 : 1);
      await expect(page.locator('header a[href="#"]')).toHaveCount(0);
      expect(await fits()).toBe(true);
      await page.locator('header a[href="/profile"]').click(); await expect(page).toHaveURL(/\/profile$/);
      if (!roles.includes('SUPER_ADMIN')) { await page.goto('/admin'); await expect(page).toHaveURL(/\/403$/); }
      if (!roles.includes('PARTNER')) { await page.goto('/partner'); await expect(page).toHaveURL(/\/403$/); }
    });
  }
}
