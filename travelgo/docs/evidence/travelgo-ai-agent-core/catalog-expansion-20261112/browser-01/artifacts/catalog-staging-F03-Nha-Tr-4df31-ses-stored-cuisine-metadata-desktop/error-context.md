# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog-staging.spec.ts >> F03 Nha Trang seafood uses stored cuisine metadata
- Location: e2e\catalog-staging.spec.ts:21:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-testid^="recommendation-card-"]').first()
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" locator('[data-testid^="recommendation-card-"]').first() with timeout 8000ms
  - waiting for locator('[data-testid^="recommendation-card-"]').first()

```

# Test source

```ts
  1  | import {test,expect,Page} from '@playwright/test';
  2  | import fs from 'node:fs';import path from 'node:path';
  3  | const credentials=JSON.parse(fs.readFileSync(path.resolve('../.local/catalog-staging/accounts.json'),'utf8'));
  4  | const cards=(page:Page)=>page.locator('[data-testid^="recommendation-card-"]');
> 5  | async function open(page:Page,category='hotel',city='Đà Nẵng'){await page.goto('/explore?category='+category+'&city='+encodeURIComponent(city));await expect(cards(page).first()).toBeVisible();await expect(page.getByTestId('explore-loading')).toHaveCount(0);}
     |                                                                                                                                                                                   ^ Error: expect(locator).toBeVisible() failed
  6  | test.beforeEach(async({page,request})=>{
  7  |  const login=await request.post('/api/auth/login',{data:{email:credentials.email,password:credentials.password}});expect(login.ok()).toBeTruthy();const session=(await login.json()).data;
  8  |  await page.addInitScript(({token})=>localStorage.setItem('travelgo_token',token),{token:session.token});
  9  |  await page.route('**/*',route=>{const url=new URL(route.request().url());if(['127.0.0.1','localhost'].includes(url.hostname)||['data:','blob:'].includes(url.protocol))return route.continue();return route.abort('blockedbyclient');});
  10 | });
  11 | test('F01 hotel destination, five live DB cards, DEMO provenance and responsive layout',async({page},info)=>{
  12 |  await open(page);await expect(cards(page)).toHaveCount(5);await expect(page.getByRole('status').filter({hasText:'DEMO staging'})).toBeVisible();
  13 |  await expect(cards(page).first()).toContainText('Không phải đối tác thật');await expect(cards(page).first()).toContainText('đơn vị chưa xác minh');
  14 |  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBeTruthy();
  15 |  await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F01.png'),fullPage:true});
  16 | });
  17 | test('F02 Da Lat hotel cap excludes NULL and over-limit prices in backend',async({page})=>{
  18 |  await open(page,'hotel','Đà Lạt');const response=page.waitForResponse(r=>r.url().includes('/api/places?')&&r.url().includes('maxPriceFrom=800000')&&r.status()===200);
  19 |  await page.getByLabel('Giá từ tối đa',{exact:true}).fill('800000');const data=await (await response).json();expect(data.data).toHaveLength(3);expect(data.data.every((p:any)=>p.city==='Đà Lạt'&&p.priceFrom<=800000)).toBeTruthy();await expect(cards(page)).toHaveCount(3);
  20 | });
  21 | test('F03 Nha Trang seafood uses stored cuisine metadata',async({page})=>{
  22 |  await open(page,'restaurant','Nha Trang');await page.getByLabel('Loại ẩm thực',{exact:true}).selectOption('seafood');await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('Hải sản');
  23 | });
  24 | test('F04 Phu Quoc resort filter',async({page},info)=>{
  25 |  await open(page,'hotel','Phú Quốc');await page.getByLabel('Loại hình lưu trú',{exact:true}).selectOption('resort');await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('Resort');await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F04.png'),fullPage:true});
  26 | });
  27 | test('F05 server price sort and pagination',async({page})=>{
  28 |  await open(page);await page.getByLabel('Sắp xếp dịch vụ').selectOption('priceDesc');await expect(cards(page).first()).toContainText('1.100.000');
  29 |  await page.getByLabel('Sắp xếp dịch vụ').selectOption('priceAsc');await expect(cards(page).first()).toContainText('350.000');
  30 |  await page.getByTestId('explore-city').selectOption('all');await expect(cards(page)).toHaveCount(20);await expect(page.getByRole('button',{name:'Trang sau',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByLabel('Phân trang dịch vụ')).toContainText('Trang 2/3');
  31 | });
  32 | test('F06 actual empty search and unverified ratings stay empty',async({page})=>{
  33 |  await open(page);await page.getByTestId('explore-search').fill('khong-co-dich-vu-qa-20261112');await expect(cards(page)).toHaveCount(0);await expect(page.getByText('Không tìm thấy địa điểm nào phù hợp với bộ lọc.',{exact:true})).toBeVisible();
  34 |  await page.getByTestId('explore-search').fill('');await page.getByTestId('explore-min-rating').selectOption('4');await expect(cards(page)).toHaveCount(0);
  35 | });
  36 | test('F07 actual details, no DEMO booking, explicit AI handoff with fresh backend detail',async({page},info)=>{
  37 |  await open(page);const first=cards(page).first();const name=await first.locator('h3').innerText();await first.getByRole('link',{name:'Chi tiết',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'DEMO · Không nhận đặt dịch vụ',exact:true})).toBeDisabled();
  38 |  await page.getByRole('link',{name:'Tư vấn dịch vụ này bằng AI',exact:true}).click();await expect(page).toHaveURL(/\/assistant\?listing=/);await expect(page.getByText('Bạn vừa chọn: '+name,{exact:true})).toBeVisible();
  39 |  await page.getByRole('checkbox',{name:/Đồng ý giữ thông tin chuyến đi/}).check();await page.getByRole('button',{name:'Xem dịch vụ trong cuộc trò chuyện',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
  40 |  await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F07.png'),fullPage:true});
  41 | });
  42 | test('F08 restaurant card links directly to same Assistant, no duplicate page',async({page})=>{
  43 |  await open(page,'restaurant','Nha Trang');await cards(page).first().getByRole('link',{name:'Tư vấn bằng AI',exact:true}).click();await expect(page).toHaveURL(/\/assistant\?listing=/);await expect(page.getByTestId('agent-greeting')).toHaveCount(1);await expect(page.getByRole('textbox',{name:'Tin nhắn của bạn',exact:true})).toHaveCount(1);
  44 | });
  45 | 
```