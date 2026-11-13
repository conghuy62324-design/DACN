# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: location-search.spec.ts >> G07 cards occupy main content, no giant introduction or nested scroll
- Location: e2e\location-search.spec.ts:16:1

# Error details

```
Error: expect(received).toBeLessThan(expected)

Expected: < 774
Received:   784.28125
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - generic [ref=e6]:
      - link "HuGoTravel" [ref=e7] [cursor=pointer]:
        - /url: /
      - generic [ref=e13]:
        - link "Danh sách yêu thích" [ref=e14] [cursor=pointer]:
          - /url: /favorites
        - button "Mở menu" [ref=e17]
  - main [ref=e19]:
    - generic [ref=e21]:
      - generic [ref=e22]:
        - paragraph [ref=e23]: Khám phá TravelGo
        - heading "Nơi ở, chỗ ăn và điểm tham quan" [level=1] [ref=e27]
        - paragraph [ref=e28]: Chọn tỉnh/thành hoặc địa danh để tìm và so sánh dịch vụ.
      - navigation "Loại dịch vụ" [ref=e29]:
        - button "Tất cả" [ref=e30]
        - button "Khách sạn" [pressed] [ref=e31]
        - button "Nhà hàng" [ref=e32]
        - button "Điểm tham quan" [ref=e33]
        - button "Tour" [ref=e34]
      - generic [ref=e35]:
        - generic [ref=e36]:
          - generic [ref=e37]:
            - generic [ref=e38]: Điểm đến dịch vụ
            - combobox "Điểm đến dịch vụ" [ref=e39]:
              - generic [ref=e40]:
                - generic [ref=e41]: Đà Nẵng
                - generic [ref=e42]: Địa danh · 48
              - generic [aria-hidden] [ref=e43]: ⌄
          - generic [ref=e44]:
            - text: Tìm kiếm
            - textbox "Tìm kiếm dịch vụ" [ref=e45]
        - group [ref=e46]:
          - generic "Bộ lọc giá, loại hình và tiện ích" [ref=e47] [cursor=pointer]
          - option "Tất cả" [selected]
          - option "Từ 4/5, có lượt đánh giá"
          - option "Từ 4.5/5, có lượt đánh giá"
          - option "Tất cả" [selected]
          - option "Khách sạn"
          - option "Resort"
          - option "Homestay"
          - option "Villa"
          - option "Căn hộ lưu trú"
          - option "Nhà nghỉ"
          - option "Tất cả" [selected]
          - option "Wi-Fi"
          - option "Hồ bơi"
          - option "Bãi đỗ xe"
          - option "Điều hòa"
          - option "Ăn sáng"
          - option "Uy tín Bayesian"
          - option "Mức độ phù hợp" [selected]
          - option "Giá tăng dần"
          - option "Giá giảm dần"
          - option "Mới được duyệt"
        - status [ref=e48]: DEMO · Giá giả định, ảnh minh họa; không phải Booking thật. Đơn vị giá và còn chỗ chưa xác minh.
      - group [ref=e49]:
        - generic "Gợi ý theo sở thích và ngân sách" [ref=e50] [cursor=pointer]
      - region "Danh sách dịch vụ" [ref=e51]:
        - generic [ref=e52]:
          - heading "Khách sạn và cơ sở lưu trú" [level=2] [ref=e53]
          - paragraph [ref=e54]: 5 kết quả từ TravelGo
        - generic [ref=e55]:
          - generic [ref=e56] [cursor=pointer]:
            - generic [ref=e57]:
              - generic [ref=e58]:
                - img "DEMO Đà Nẵng — Homestay" [ref=e59]
                - button "Lưu địa điểm" [ref=e60]
              - generic [ref=e63]:
                - generic [ref=e64]:
                  - generic [ref=e65]: Đà Nẵng
                  - heading "DEMO Đà Nẵng — Homestay" [level=3] [ref=e70]
                  - paragraph [ref=e71]: Homestay
                  - paragraph [ref=e72]: DEMO · Không phải đối tác thật
                  - generic [ref=e73]: Chưa có đánh giá xác minh
                - generic [ref=e74]:
                  - generic [ref=e75]:
                    - generic [ref=e76]: Giá tham khảo từ
                    - text: 750.000 đ
                    - generic [ref=e77]: Giả định DEMO · đơn vị chưa xác minh
                  - link "Chi tiết" [ref=e78]:
                    - /url: /places/4c7192e3-7c4e-5cf1-a835-91aabba03c83
            - generic [ref=e81]:
              - link "Tư vấn bằng AI" [ref=e82]:
                - /url: /assistant?listing=4c7192e3-7c4e-5cf1-a835-91aabba03c83
              - generic [ref=e83]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
          - generic [ref=e87] [cursor=pointer]:
            - generic [ref=e88]:
              - generic [ref=e89]:
                - img "DEMO Đà Nẵng — Villa" [ref=e90]
                - button "Lưu địa điểm" [ref=e91]
              - generic [ref=e94]:
                - generic [ref=e95]:
                  - generic [ref=e96]: Đà Nẵng
                  - heading "DEMO Đà Nẵng — Villa" [level=3] [ref=e101]
                  - paragraph [ref=e102]: Villa
                  - paragraph [ref=e103]: DEMO · Không phải đối tác thật
                  - generic [ref=e104]: Chưa có đánh giá xác minh
                - generic [ref=e105]:
                  - generic [ref=e106]:
                    - generic [ref=e107]: Giá tham khảo từ
                    - text: 1.100.000 đ
                    - generic [ref=e108]: Giả định DEMO · đơn vị chưa xác minh
                  - link "Chi tiết" [ref=e109]:
                    - /url: /places/82c088e2-a121-52c3-ab58-9064ed63c626
            - generic [ref=e112]:
              - link "Tư vấn bằng AI" [ref=e113]:
                - /url: /assistant?listing=82c088e2-a121-52c3-ab58-9064ed63c626
              - generic [ref=e114]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
          - generic [ref=e118] [cursor=pointer]:
            - generic [ref=e119]:
              - generic [ref=e120]:
                - img "DEMO Đà Nẵng — Resort" [ref=e121]
                - button "Lưu địa điểm" [ref=e122]
              - generic [ref=e125]:
                - generic [ref=e126]:
                  - generic [ref=e127]: Đà Nẵng
                  - heading "DEMO Đà Nẵng — Resort" [level=3] [ref=e132]
                  - paragraph [ref=e133]: Resort
                  - paragraph [ref=e134]: DEMO · Không phải đối tác thật
                  - generic [ref=e135]: Chưa có đánh giá xác minh
                - generic [ref=e136]:
                  - generic [ref=e137]:
                    - generic [ref=e138]: Giá tham khảo từ
                    - text: 550.000 đ
                    - generic [ref=e139]: Giả định DEMO · đơn vị chưa xác minh
                  - link "Chi tiết" [ref=e140]:
                    - /url: /places/ac07f8d8-67ef-5995-ab68-623082f5f295
            - generic [ref=e143]:
              - link "Tư vấn bằng AI" [ref=e144]:
                - /url: /assistant?listing=ac07f8d8-67ef-5995-ab68-623082f5f295
              - generic [ref=e145]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
          - generic [ref=e149] [cursor=pointer]:
            - generic [ref=e150]:
              - generic [ref=e151]:
                - img "DEMO Đà Nẵng — Khách sạn" [ref=e152]
                - button "Lưu địa điểm" [ref=e153]
              - generic [ref=e156]:
                - generic [ref=e157]:
                  - generic [ref=e158]: Đà Nẵng
                  - heading "DEMO Đà Nẵng — Khách sạn" [level=3] [ref=e163]
                  - paragraph [ref=e164]: Khách sạn
                  - paragraph [ref=e165]: DEMO · Không phải đối tác thật
                  - generic [ref=e166]: Chưa có đánh giá xác minh
                - generic [ref=e167]:
                  - generic [ref=e168]:
                    - generic [ref=e169]: Giá tham khảo từ
                    - text: 350.000 đ
                    - generic [ref=e170]: Giả định DEMO · đơn vị chưa xác minh
                  - link "Chi tiết" [ref=e171]:
                    - /url: /places/06a78793-c20f-51f7-a264-f7b3dc573512
            - generic [ref=e174]:
              - link "Tư vấn bằng AI" [ref=e175]:
                - /url: /assistant?listing=06a78793-c20f-51f7-a264-f7b3dc573512
              - generic [ref=e176]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
          - generic [ref=e180] [cursor=pointer]:
            - generic [ref=e181]:
              - generic [ref=e182]:
                - img "DEMO Đà Nẵng — Căn hộ" [ref=e183]
                - button "Lưu địa điểm" [ref=e184]
              - generic [ref=e187]:
                - generic [ref=e188]:
                  - generic [ref=e189]: Đà Nẵng
                  - heading "DEMO Đà Nẵng — Căn hộ" [level=3] [ref=e194]
                  - paragraph [ref=e195]: Căn hộ lưu trú
                  - paragraph [ref=e196]: DEMO · Không phải đối tác thật
                  - generic [ref=e197]: Chưa có đánh giá xác minh
                - generic [ref=e198]:
                  - generic [ref=e199]:
                    - generic [ref=e200]: Giá tham khảo từ
                    - text: Chưa có giá
                    - generic [ref=e201]: Giả định DEMO · đơn vị chưa xác minh
                  - link "Chi tiết" [ref=e202]:
                    - /url: /places/c80d7575-f980-56d9-a9af-6d5a6a7d39b9
            - generic [ref=e205]:
              - link "Tư vấn bằng AI" [ref=e206]:
                - /url: /assistant?listing=c80d7575-f980-56d9-a9af-6d5a6a7d39b9
              - generic [ref=e207]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
        - navigation "Phân trang dịch vụ" [ref=e211]:
          - button "Trang trước" [disabled] [ref=e212]
          - generic [ref=e213]: Trang 1/1 · 5 dịch vụ
          - button "Trang sau" [disabled] [ref=e214]
  - contentinfo [ref=e215]:
    - generic [ref=e216]:
      - generic [ref=e217]:
        - generic [ref=e218]:
          - link "HuGo Travel" [ref=e219] [cursor=pointer]:
            - /url: /
          - paragraph [ref=e225]: Hệ thống đặt vé và dịch vụ du lịch uy tín hàng đầu Việt Nam. Khám phá những chân trời mới và chia sẻ những khoảnh khắc đáng nhớ nhất cùng chúng tôi.
          - generic [ref=e226]:
            - link [ref=e227] [cursor=pointer]:
              - /url: "#"
            - link [ref=e230] [cursor=pointer]:
              - /url: "#"
            - link [ref=e234] [cursor=pointer]:
              - /url: "#"
        - generic [ref=e238]:
          - heading "Liên kết nhanh" [level=3] [ref=e239]
          - list [ref=e240]:
            - listitem [ref=e241]:
              - link "Bản đồ khám phá" [ref=e242] [cursor=pointer]:
                - /url: /explore
            - listitem [ref=e243]:
              - link "Đặt vé máy bay & tour" [ref=e244] [cursor=pointer]:
                - /url: /tickets
            - listitem [ref=e245]:
              - link "Khách sạn & Resort" [ref=e246] [cursor=pointer]:
                - /url: /hotels
            - listitem [ref=e247]:
              - link "Nhà hàng & Ẩm thực" [ref=e248] [cursor=pointer]:
                - /url: /restaurants
            - listitem [ref=e249]:
              - link "Cẩm nang du lịch" [ref=e250] [cursor=pointer]:
                - /url: /blog
        - generic [ref=e251]:
          - heading "Dịch vụ & Hỗ trợ" [level=3] [ref=e252]
          - list [ref=e253]:
            - listitem [ref=e254]:
              - link "Điều khoản dịch vụ" [ref=e255] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e256]:
              - link "Chính sách bảo mật" [ref=e257] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e258]:
              - link "Chính sách hoàn huỷ vé" [ref=e259] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e260]:
              - link "Câu hỏi thường gặp (FAQ)" [ref=e261] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e262]:
              - link "Cổng đối tác & Quản trị" [ref=e263] [cursor=pointer]:
                - /url: /admin
        - generic [ref=e264]:
          - heading "Liên hệ" [level=3] [ref=e265]
          - list [ref=e266]:
            - listitem [ref=e267]:
              - generic [ref=e271]: contact@hugotravel.com
            - listitem [ref=e272]:
              - generic [ref=e275]: 1900 1234 (24/7)
            - listitem [ref=e276]:
              - generic [ref=e280]: Tòa nhà Landmark 81, Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh
      - generic [ref=e281]:
        - paragraph [ref=e282]: © 2026 HuGo Travel. All rights reserved.
        - paragraph [ref=e283]: Xây dựng với mô hình MVC & Thuật toán Bayesian Average
  - button "Quyền riêng tư AI" [ref=e284]
```

# Test source

```ts
  1  | import {test,expect,Page} from '@playwright/test';import fs from 'node:fs';import path from 'node:path';
  2  | const credentials=JSON.parse(fs.readFileSync(path.resolve('../.local/catalog-staging/accounts.json'),'utf8'));
  3  | const cards=(p:Page)=>p.locator('[data-testid^="recommendation-card-"]');
  4  | async function open(p:Page,url='/explore?category=hotel&locationId=destination:da-nang'){await p.goto(url);await expect(p.getByRole('combobox',{name:'Điểm đến dịch vụ',exact:true})).toBeVisible();await expect(p.getByText('Đang tải dịch vụ…',{exact:true})).toHaveCount(0);const decline=p.getByRole('button',{name:'Từ chối / xóa event của tôi',exact:true});if(await decline.isVisible())await decline.click();}
  5  | async function select(p:Page,id:string,label='Điểm đến dịch vụ'){await p.getByRole('combobox',{name:label,exact:true}).click();await expect(p.locator('[role="option"]').first()).toBeVisible();await p.locator('[role="option"]').filter({has:p.locator('span')}).count();const wanted=p.locator('[role="option"]').filter({hasText:id});await wanted.first().click();}
  6  | async function choose(p:Page,name:string,kind:'province'|'destination'|'all'='destination',label='Điểm đến dịch vụ'){await p.getByRole('combobox',{name:label,exact:true}).click();const options=p.locator(`[role="option"][data-location-kind="${kind}"]`);await expect(options.first()).toBeVisible();await options.filter({has:p.getByText(name,{exact:true})}).click();}
  7  | test.beforeEach(async({page,request})=>{const login=await request.post('/api/auth/login',{data:{email:credentials.email,password:credentials.password}});expect(login.ok()).toBeTruthy();const data=(await login.json()).data;await page.addInitScript(({token})=>localStorage.setItem('travelgo_token',token),{token:data.token});await page.route('**/*',r=>{const u=new URL(r.request().url());return u.hostname==='127.0.0.1'&&['5177','5057'].includes(u.port)||['data:','blob:'].includes(u.protocol)?r.continue():r.abort('blockedbyclient');});});
  8  | test('G01 all 34 provinces persist independently of catalog inventory',async({page})=>{await open(page);await page.getByRole('combobox',{name:'Điểm đến dịch vụ',exact:true}).click();await expect(page.locator('[role="option"][data-location-kind="province"]')).toHaveCount(34);await expect(page.locator('[role="option"][data-location-kind="destination"]')).toHaveCount(10);await expect(page.locator('[role="option"]').filter({hasText:'Hà Tĩnh'})).toBeVisible();});
  9  | test('G02 normalized H Ho Da Ha searches, aliases, clear and keyboard',async({page})=>{await open(page);await page.getByRole('combobox',{name:'Điểm đến dịch vụ',exact:true}).click();const input=page.getByRole('searchbox',{name:'Tìm Điểm đến dịch vụ',exact:true});
  10 |  for(const [query,required]of [['H','Hà Nội'],['Ho','Hội An'],[' Da ','Đà Lạt'],['Ha','Hà Tĩnh'],['hỒ','Hồ Chí Minh'],['HCM','Hồ Chí Minh'],['SG','Hồ Chí Minh'],['DN','Đà Nẵng'],['ĐL','Đà Lạt']]){await input.fill(query);await expect(page.locator('[role="option"]').filter({has:page.getByText(required,{exact:true})}).first()).toBeVisible();}
  11 |  await page.getByRole('button',{name:'Xóa từ khóa địa điểm'}).click();await expect(input).toHaveValue('');await expect(page.locator('[role="option"][data-location-kind="province"]')).toHaveCount(34);await input.fill('ĐL');await expect(page.locator('[role="option"]')).toHaveCount(1);await input.press('ArrowDown');await input.press('Enter');await expect(page.getByRole('combobox',{name:'Điểm đến dịch vụ',exact:true})).toContainText('Đà Lạt');await expect(cards(page)).toHaveCount(5);});
  12 | test('G03 exact Da Nang area vs merged province and restaurant tab',async({page},info)=>{await open(page);await expect(cards(page)).toHaveCount(5);await page.getByTestId('explore-category-restaurant').click();await expect(cards(page)).toHaveCount(5);await expect(cards(page).first()).toContainText('Đà Nẵng');await choose(page,'Đà Nẵng','province');await expect(cards(page)).toHaveCount(10);await expect(page.getByTestId('catalog-result-total')).toHaveText('10 kết quả từ TravelGo');await page.screenshot({path:path.join(process.env.LOCATION_EVIDENCE!,info.project.name+'-G03.png'),fullPage:true});});
  13 | test('G04 province maps Da Lat, Sa Pa, Phu Quoc and exact area stays narrow',async({page})=>{await open(page);for(const [province,city]of [['Lâm Đồng','Đà Lạt'],['Lào Cai','Sa Pa'],['An Giang','Phú Quốc']]){await choose(page,province,'province');await expect(cards(page)).toHaveCount(5);await expect(cards(page).first()).toContainText(city);}await choose(page,'Hội An');await expect(cards(page)).toHaveCount(5);await expect(cards(page).first()).toContainText('Hội An');});
  14 | test('G05 province with zero data stays available and all restores 50 hotels',async({page})=>{await open(page);await choose(page,'Hà Tĩnh','province');await expect(cards(page)).toHaveCount(0);await expect(page.getByTestId('explore-empty')).toHaveText('Chưa có khách sạn tại địa điểm này.');await choose(page,'Tất cả địa điểm','all');await expect(page.getByTestId('catalog-result-total')).toHaveText('50 kết quả từ TravelGo');await expect(cards(page)).toHaveCount(20);await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByLabel('Phân trang dịch vụ')).toContainText('Trang 2/3');});
  15 | test('G06 location + category + search + price are combined in real API',async({page})=>{await open(page);await choose(page,'Đà Lạt');await page.getByLabel('Tìm kiếm dịch vụ',{exact:true}).fill('Homestay');await page.getByText('Bộ lọc giá, loại hình và tiện ích',{exact:true}).click();await page.getByLabel('Giá từ tối đa',{exact:true}).fill('800000');await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('Đà Lạt');await expect(cards(page).first()).toContainText('750.000');});
> 16 | test('G07 cards occupy main content, no giant introduction or nested scroll',async({page},info)=>{await open(page);await expect(cards(page)).toHaveCount(5);await expect(page.getByText('Khám phá catalog DEMO',{exact:true})).toHaveCount(0);expect(await cards(page).first().evaluate(e=>{const parent=e.parentElement!;return getComputedStyle(parent).overflowY!=='auto'&&getComputedStyle(parent).display==='grid';})).toBeTruthy();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBeTruthy();const firstBox=await cards(page).first().boundingBox();expect(firstBox!.y).toBeLessThan(page.viewportSize()!.height-70);await cards(page).first().scrollIntoViewIfNeeded();await expect(cards(page).first().locator('h3')).toBeVisible();await expect(cards(page).first().getByRole('link',{name:'Tư vấn bằng AI',exact:true})).toBeVisible();await page.screenshot({path:path.join(process.env.LOCATION_EVIDENCE!,info.project.name+'-G07-viewport.png')});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(process.env.LOCATION_EVIDENCE!,info.project.name+'-G07.png'),fullPage:true});});
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ^ Error: expect(received).toBeLessThan(expected)
  17 | test('G08 hotels and restaurants share geographic picker and real filters',async({page})=>{for(const route of ['/hotels','/restaurants']){await open(page,route);await choose(page,'Lâm Đồng','province');await expect(page.getByTestId('service-catalog-card')).toHaveCount(5);await expect(page.getByTestId('service-catalog-card').first()).toContainText('Đà Lạt');await choose(page,'Hà Tĩnh','province');await expect(page.getByTestId('service-catalog-card')).toHaveCount(0);await expect(page.getByText(route==='/hotels'?/Chưa có khách sạn tại địa điểm này/:/Chưa có nhà hàng tại địa điểm này/)).toBeVisible();}});
  18 | test('G09 home search, Planner, Tours and Tickets use same picker',async({page})=>{await page.goto('/');const home=page.getByRole('combobox',{name:'Điểm đến tìm kiếm',exact:true});await expect(home).toBeVisible();await choose(page,'Đà Lạt','destination','Điểm đến tìm kiếm');await page.getByRole('button',{name:'Khách sạn',exact:true}).click();await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await expect(page).toHaveURL(/locationId=destination%3Ada-lat/);await expect(cards(page)).toHaveCount(5);for(const [route,label]of [['/tour-planner','Điểm đến khám phá'],['/tours','Điểm đến tour'],['/tickets','Điểm đến']]){await page.goto(route);await choose(page,'Hà Tĩnh','province',label);await expect(page.getByRole('combobox',{name:label,exact:true})).toContainText('Hà Tĩnh');}});
  19 | test('G10 network fault shows error; retry resumes actual API/DB results',async({page})=>{
  20 |  let fail=true;await page.route('**/api/places?**',r=>fail?r.abort('connectionfailed'):r.continue());await page.goto('/explore?category=hotel&locationId=68');await expect(page.getByRole('alert').filter({hasText:'Chưa tải được dịch vụ'})).toBeVisible();fail=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await expect(cards(page)).toHaveCount(5);await expect(cards(page).first()).toContainText('Đà Lạt');await expect(page.getByTestId('catalog-result-total')).toHaveText('5 kết quả từ TravelGo');
  21 | });
  22 | test('G11 Agent sends same province code and never invents options for empty province',async({page})=>{
  23 |  await page.goto('/assistant');await page.getByRole('checkbox',{name:/Cho phép trợ lý nhớ thông tin chuyến đi/}).check();await page.getByText('Tuỳ chọn lọc và chuyến đi đã lưu',{exact:true}).click();await choose(page,'Lâm Đồng','province','Khu vực Agent');
  24 |  const response=page.waitForResponse(r=>r.url().endsWith('/api/agent/core/chat')&&r.request().method()==='POST');await page.getByRole('textbox',{name:'Tin nhắn của bạn',exact:true}).fill('Tìm khách sạn');await page.getByRole('button',{name:'Gửi',exact:true}).click();const r=await(await response).json();expect(r.data.result.filters.locationId).toBe('68');expect(r.data.result.items).toHaveLength(5);expect(r.data.result.items.every((p:any)=>p.city==='Đà Lạt')).toBeTruthy();expect(r.data.model.invoked).toBe(false);
  25 |  await choose(page,'Hà Tĩnh','province','Khu vực Agent');const empty=page.waitForResponse(r=>r.url().endsWith('/api/agent/core/chat')&&r.request().method()==='POST');await page.getByRole('textbox',{name:'Tin nhắn của bạn',exact:true}).fill('Tìm khách sạn');await page.getByRole('button',{name:'Gửi',exact:true}).click();const e=await(await empty).json();expect(e.data.result.filters.locationId).toBe('42');expect(e.data.status).toBe('no_results');expect(e.data.result.items).toHaveLength(0);
  26 | });
  27 | 
```