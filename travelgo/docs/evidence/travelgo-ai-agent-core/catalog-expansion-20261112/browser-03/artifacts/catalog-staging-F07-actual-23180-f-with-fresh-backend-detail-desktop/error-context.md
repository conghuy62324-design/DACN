# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: catalog-staging.spec.ts >> F07 actual details, no DEMO booking, explicit AI handoff with fresh backend detail
- Location: e2e\catalog-staging.spec.ts:36:1

# Error details

```
Test timeout of 40000ms exceeded.
```

```
Error: locator.check: Test timeout of 40000ms exceeded.
Call log:
  - waiting for getByRole('checkbox', { name: /Đồng ý giữ thông tin chuyến đi/ })

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - link "HuGoTravel" [ref=e7] [cursor=pointer]:
        - /url: /
      - navigation [ref=e13]:
        - link "Trang chủ" [ref=e14] [cursor=pointer]:
          - /url: /
        - link "Khám phá" [ref=e15] [cursor=pointer]:
          - /url: /explore
        - button "Tour & Lịch trình" [ref=e17]
        - button "Dịch vụ" [ref=e21]
        - link "Blog" [ref=e24] [cursor=pointer]:
          - /url: /blog
      - generic [ref=e25]:
        - link "Địa điểm yêu thích" [ref=e26] [cursor=pointer]:
          - /url: /favorites
        - button "Menu tài khoản" [ref=e30]:
          - generic [ref=e34]: Khách DEMO
        - link "Tạo lịch trình" [ref=e37] [cursor=pointer]:
          - /url: /tour-planner
  - main [ref=e40]:
    - generic [ref=e41]:
      - generic [ref=e42]:
        - generic [ref=e43]:
          - heading "Trợ lý du lịch TravelGo" [level=1] [ref=e44]
          - paragraph [ref=e45]: Cùng bạn tìm nơi ở, chỗ ăn và lên kế hoạch chuyến đi.
        - button "Cuộc trò chuyện mới" [ref=e46]
      - generic [ref=e47]:
        - group [ref=e48]:
          - generic "Cách trợ lý sử dụng thông tin" [ref=e49] [cursor=pointer]
        - paragraph [ref=e50]: AI hiểu ngôn ngữ tự nhiên hiện chưa được bật. Bạn vẫn có thể bổ sung thông tin và tra cứu các dịch vụ TravelGo bằng yêu cầu rõ ràng.
        - generic [ref=e51]:
          - checkbox "Cho phép trợ lý nhớ thông tin chuyến đi trong phiên này (tối đa 15 phút)." [ref=e52]
          - text: Cho phép trợ lý nhớ thông tin chuyến đi trong phiên này (tối đa 15 phút).
      - group [ref=e53]:
        - generic "Tuỳ chọn lọc và chuyến đi đã lưu" [ref=e54] [cursor=pointer]
      - log "Hội thoại TravelGo" [ref=e55]:
        - article [ref=e56]:
          - paragraph [ref=e57]: TravelGo
          - paragraph [ref=e58]: Xin chào Khách DEMO! Mình là trợ lý du lịch TravelGo. Mình có thể giúp bạn tìm khách sạn, nhà hàng và lên kế hoạch chuyến đi. Bạn muốn khám phá nơi nào?
        - complementary [ref=e59]:
          - paragraph [ref=e60]: "Bạn vừa chọn: DEMO Đà Nẵng — Khách sạn"
          - paragraph [ref=e61]: DEMO, giá giả định; không phải dịch vụ Booking thật.
          - button "Xem dịch vụ trong cuộc trò chuyện" [disabled] [ref=e62]
      - generic [ref=e63]:
        - text: Tin nhắn của bạn
        - textbox "Tin nhắn của bạn" [ref=e64]:
          - /placeholder: "Cứ nhắn tự nhiên, ví dụ: hcm đi đà nẵng, 2 lớn 1 bé, ngân sách 12tr…"
        - button "Gửi" [disabled] [ref=e65]
  - contentinfo [ref=e66]:
    - generic [ref=e67]:
      - generic [ref=e68]:
        - generic [ref=e69]:
          - link "HuGo Travel" [ref=e70] [cursor=pointer]:
            - /url: /
          - paragraph [ref=e76]: Hệ thống đặt vé và dịch vụ du lịch uy tín hàng đầu Việt Nam. Khám phá những chân trời mới và chia sẻ những khoảnh khắc đáng nhớ nhất cùng chúng tôi.
          - generic [ref=e77]:
            - link [ref=e78] [cursor=pointer]:
              - /url: "#"
            - link [ref=e81] [cursor=pointer]:
              - /url: "#"
            - link [ref=e85] [cursor=pointer]:
              - /url: "#"
        - generic [ref=e89]:
          - heading "Liên kết nhanh" [level=3] [ref=e90]
          - list [ref=e91]:
            - listitem [ref=e92]:
              - link "Bản đồ khám phá" [ref=e93] [cursor=pointer]:
                - /url: /explore
            - listitem [ref=e94]:
              - link "Đặt vé máy bay & tour" [ref=e95] [cursor=pointer]:
                - /url: /tickets
            - listitem [ref=e96]:
              - link "Khách sạn & Resort" [ref=e97] [cursor=pointer]:
                - /url: /hotels
            - listitem [ref=e98]:
              - link "Nhà hàng & Ẩm thực" [ref=e99] [cursor=pointer]:
                - /url: /restaurants
            - listitem [ref=e100]:
              - link "Cẩm nang du lịch" [ref=e101] [cursor=pointer]:
                - /url: /blog
        - generic [ref=e102]:
          - heading "Dịch vụ & Hỗ trợ" [level=3] [ref=e103]
          - list [ref=e104]:
            - listitem [ref=e105]:
              - link "Điều khoản dịch vụ" [ref=e106] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e107]:
              - link "Chính sách bảo mật" [ref=e108] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e109]:
              - link "Chính sách hoàn huỷ vé" [ref=e110] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e111]:
              - link "Câu hỏi thường gặp (FAQ)" [ref=e112] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e113]:
              - link "Cổng đối tác & Quản trị" [ref=e114] [cursor=pointer]:
                - /url: /admin
        - generic [ref=e115]:
          - heading "Liên hệ" [level=3] [ref=e116]
          - list [ref=e117]:
            - listitem [ref=e118]:
              - generic [ref=e122]: contact@hugotravel.com
            - listitem [ref=e123]:
              - generic [ref=e126]: 1900 1234 (24/7)
            - listitem [ref=e127]:
              - generic [ref=e131]: Tòa nhà Landmark 81, Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh
      - generic [ref=e132]:
        - paragraph [ref=e133]: © 2026 HuGo Travel. All rights reserved.
        - paragraph [ref=e134]: Xây dựng với mô hình MVC & Thuật toán Bayesian Average
  - region "Quyền riêng tư HuGo Intelligence" [ref=e135]:
    - generic [ref=e140]:
      - heading "Bạn kiểm soát dữ liệu HuGo Intelligence" [level=2] [ref=e141]
      - paragraph [ref=e142]: HuGo chỉ ghi tương tác với nội dung sau khi bạn đồng ý. Không gửi email, JWT hay GPS thô. Event được giữ tối đa 90 ngày.
      - generic [ref=e143]:
        - button "Đồng ý cá nhân hóa" [ref=e144]
        - button "Chỉ analytics" [ref=e145]
        - button "Từ chối / xóa event của tôi" [ref=e146]
```

# Test source

```ts
  1  | import {test,expect,Page} from '@playwright/test';
  2  | import fs from 'node:fs';import path from 'node:path';
  3  | const credentials=JSON.parse(fs.readFileSync(path.resolve('../.local/catalog-staging/accounts.json'),'utf8'));
  4  | const cards=(page:Page)=>page.locator('[data-testid^="recommendation-card-"]');
  5  | async function open(page:Page,category='hotel',city='Đà Nẵng'){await page.goto('/explore?category='+category+'&city='+encodeURIComponent(city));await expect(cards(page).first()).toBeVisible();await expect(page.getByTestId('explore-loading')).toHaveCount(0);}
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
> 39 |  await page.getByRole('checkbox',{name:/Đồng ý giữ thông tin chuyến đi/}).check();await page.getByRole('button',{name:'Xem dịch vụ trong cuộc trò chuyện',exact:true}).click();await expect(page.getByRole('heading',{name,exact:true})).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
     |                                                                           ^ Error: locator.check: Test timeout of 40000ms exceeded.
  40 |  await page.screenshot({path:path.join(process.env.CATALOG_BROWSER_EVIDENCE!,info.project.name+'-F07.png'),fullPage:true});
  41 | });
  42 | test('F08 restaurant card links directly to same Assistant, no duplicate page',async({page})=>{
  43 |  await open(page,'restaurant','Nha Trang');await cards(page).first().getByRole('link',{name:'Tư vấn bằng AI',exact:true}).click();await expect(page).toHaveURL(/\/assistant\?listing=/);await expect(page.getByTestId('agent-greeting')).toHaveCount(1);await expect(page.getByRole('textbox',{name:'Tin nhắn của bạn',exact:true})).toHaveCount(1);
  44 | });
  45 | 
```