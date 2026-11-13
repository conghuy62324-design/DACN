import {test,expect,Page} from '@playwright/test';
import fs from 'node:fs';import path from 'node:path';
const credentials=JSON.parse(fs.readFileSync(path.resolve('../.local/catalog-staging/accounts.json'),'utf8'));
const cards=(page:Page)=>page.locator('[data-testid^="recommendation-card-"]');
async function open(page:Page,category='hotel',city='Đà Nẵng'){await page.goto('/explore?category='+category+'&city='+encodeURIComponent(city));await expect(cards(page).first()).toBeVisible();await expect(page.getByTestId('explore-loading')).toHaveCount(0);}
test.beforeEach(async({page,request})=>{
 const login=await request.post('/api/auth/login',{data:{email:credentials.email,password:credentials.password}});expect(login.ok()).toBeTruthy();const session=(await login.json()).data;
 await page.addInitScript(({token})=>localStorage.setItem('travelgo_token',token),{token:session.token});
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(['127.0.0.1','localhost'].includes(url.hostname)||['data:','blob:'].includes(url.protocol))return route.continue();return route.abort('blockedbyclient');});
});
test('F01 hotel destination, five live DB cards, DEMO provenance and responsive layout',async({page},info)=>{
 await open(page);await expect(cards(page)).toHaveCount(5);await expect(page.getByRole('status').filter({hasText:'DEMO staging'})).toBeVisible();
 await expect(cards(page).first()).toContainText('Không phải đối tác thật');await expect(cards(page).first()).toContainText('đơn vị chưa xác minh');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+2)).toBeTruthy();
 await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F01.png'),fullPage:true});
});
test('F02 Da Lat hotel cap excludes NULL and over-limit prices in backend',async({page})=>{
 await open(page,'hotel','Đà Lạt');const response=page.waitForResponse(r=>r.url().includes('/api/places?')&&r.url().includes('maxPriceFrom=800000')&&r.status()===200);
 await page.getByLabel('Giá từ tối đa',{exact:true}).fill('800000');const data=await (await response).json();expect(data.data).toHaveLength(3);expect(data.data.every((p:any)=>p.city==='Đà Lạt'&&p.priceFrom<=800000)).toBeTruthy();await expect(cards(page)).toHaveCount(3);
});
test('F03 Nha Trang seafood uses stored cuisine metadata',async({page})=>{
 await open(page,'restaurant','Nha Trang');await page.getByLabel('Loại ẩm thực',{exact:true}).selectOption('seafood');await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('Hải sản');
});
test('F04 Phu Quoc resort filter',async({page},info)=>{
 await open(page,'hotel','Phú Quốc');await page.getByLabel('Loại hình lưu trú',{exact:true}).selectOption('resort');await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('Resort');await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F04.png'),fullPage:true});
});
test('F05 server price sort and pagination',async({page})=>{
 await open(page);await page.getByLabel('Sắp xếp dịch vụ').selectOption('priceDesc');await expect(cards(page).first()).toContainText('1.100.000');
 await page.getByLabel('Sắp xếp dịch vụ').selectOption('priceAsc');await expect(cards(page).first()).toContainText('350.000');
 await page.getByTestId('explore-city').selectOption('all');await expect(cards(page)).toHaveCount(20);await expect(page.getByRole('button',{name:'Trang sau',exact:true})).toBeEnabled();await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByLabel('Phân trang dịch vụ')).toContainText('Trang 2/3');
});
test('F06 actual empty search and unverified ratings stay empty',async({page})=>{
 await open(page);await page.getByTestId('explore-search').fill('khong-co-dich-vu-qa-20261112');await expect(cards(page)).toHaveCount(0);await expect(page.getByText('Không tìm thấy địa điểm nào phù hợp với bộ lọc.',{exact:true})).toBeVisible();
 await page.getByTestId('explore-search').fill('');await page.getByTestId('explore-min-rating').selectOption('4');await expect(cards(page)).toHaveCount(0);
});
test('F07 actual details, no DEMO booking, explicit AI handoff with fresh backend detail',async({page},info)=>{
 await open(page);const first=cards(page).first();const name=await first.locator('h3').innerText();await first.getByRole('link',{name:'Chi tiết',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'DEMO · Không nhận đặt dịch vụ',exact:true})).toBeDisabled();
 await page.getByRole('link',{name:'Tư vấn dịch vụ này bằng AI',exact:true}).click();await expect(page).toHaveURL(/\/assistant\?listing=/);await expect(page.getByText('Bạn vừa chọn: '+name,{exact:true})).toBeVisible();
 await page.getByRole('checkbox',{name:/Cho phép trợ lý nhớ thông tin chuyến đi/}).check();await page.getByRole('button',{name:'Xem dịch vụ trong cuộc trò chuyện',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
 await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F07.png'),fullPage:true});
});
test('F08 restaurant card links directly to same Assistant, no duplicate page',async({page})=>{
 await open(page,'restaurant','Nha Trang');await cards(page).first().getByRole('link',{name:'Tư vấn bằng AI',exact:true}).click();await expect(page).toHaveURL(/\/assistant\?listing=/);await expect(page.getByTestId('agent-greeting')).toHaveCount(1);await expect(page.getByRole('textbox',{name:'Tin nhắn của bạn',exact:true})).toHaveCount(1);
});
test('F09 existing Hotels page filters real backend and blocks DEMO booking',async({page},info)=>{
 await page.goto('/hotels?city='+encodeURIComponent('Đà Lạt'));const listings=page.getByTestId('service-catalog-card');await expect(listings).toHaveCount(5);await page.getByLabel('Giá từ tối đa',{exact:true}).fill('800000');await expect(listings).toHaveCount(3);await page.getByLabel('Loại hình lưu trú',{exact:true}).selectOption('homestay');await expect(listings).toHaveCount(1);await expect(listings.first()).toContainText('Homestay');await expect(listings.first().getByRole('button',{name:'DEMO · Không nhận đặt'})).toBeDisabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBeTruthy();await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F09.png'),fullPage:true});
});
test('F10 existing Restaurants page cuisine filters and AI link',async({page},info)=>{
 await page.goto('/restaurants?city='+encodeURIComponent('Nha Trang'));const listings=page.getByTestId('service-catalog-card');await expect(listings).toHaveCount(5);await page.getByLabel('Loại ẩm thực',{exact:true}).selectOption('seafood');await expect(listings).toHaveCount(1);await expect(listings.first()).toContainText('Hải sản');await expect(listings.first().getByRole('button',{name:'DEMO · Không nhận đặt'})).toBeDisabled();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBeTruthy();await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F10.png'),fullPage:true});await listings.first().getByRole('link',{name:'Tư vấn bằng AI',exact:true}).click();await expect(page).toHaveURL(/\/assistant\?listing=/);
});
