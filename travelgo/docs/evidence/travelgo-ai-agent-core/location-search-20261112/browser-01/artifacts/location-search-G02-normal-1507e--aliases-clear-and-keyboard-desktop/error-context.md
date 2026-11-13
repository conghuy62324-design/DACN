# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: location-search.spec.ts >> G02 normalized H Ho Da Ha searches, aliases, clear and keyboard
- Location: e2e\location-search.spec.ts:9:1

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('option')
Expected: 1
Received: 22
Timeout:  7000ms

Call log:
  - Expect "toHaveCount" getByRole('option') with timeout 7000ms
  - waiting for getByRole('option')
    3 × locator resolved to 21 elements
      - unexpected value "21"
    15 × locator resolved to 22 elements
       - unexpected value "22"

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
      - generic [ref=e42]:
        - generic [ref=e43]:
          - paragraph [ref=e44]: Khám phá TravelGo
          - heading "Nơi ở, chỗ ăn và điểm tham quan" [level=1] [ref=e48]
          - paragraph [ref=e49]: Chọn tỉnh/thành hoặc địa danh để tìm và so sánh dịch vụ.
        - navigation "Loại dịch vụ" [ref=e50]:
          - button "Tất cả" [ref=e51]
          - button "Khách sạn" [pressed] [ref=e52]
          - button "Nhà hàng" [ref=e53]
          - button "Điểm tham quan" [ref=e54]
          - button "Tour" [ref=e55]
        - generic [ref=e56]:
          - generic [ref=e57]:
            - generic [ref=e58]:
              - generic [ref=e59]: Điểm đến dịch vụ
              - combobox "Điểm đến dịch vụ" [expanded] [ref=e60]:
                - generic [ref=e61]:
                  - generic [ref=e62]: Đà Nẵng
                  - generic [ref=e63]: Địa danh · 48
                - generic [aria-hidden] [ref=e64]: ⌄
            - generic [ref=e65]:
              - text: Tìm kiếm
              - textbox "Tìm kiếm dịch vụ" [ref=e66]
            - generic [ref=e67]:
              - text: Đánh giá khách hàng
              - combobox "Đánh giá dịch vụ" [ref=e68]:
                - option "Tất cả" [selected]
                - option "Từ 4/5, có lượt đánh giá"
                - option "Từ 4.5/5, có lượt đánh giá"
          - group [ref=e69]:
            - generic "Bộ lọc giá, loại hình và tiện ích" [ref=e70] [cursor=pointer]
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
          - status [ref=e71]: DEMO staging — giá giả định, ảnh minh họa; không phải đối tác hoặc Booking thật. Đơn vị giá, vị trí thực và còn chỗ chưa được xác minh.
          - navigation "Phân trang dịch vụ" [ref=e72]:
            - button "Trang trước" [disabled] [ref=e73]
            - generic [ref=e74]: Trang 1/1 · 5 dịch vụ
            - button "Trang sau" [disabled] [ref=e75]
        - group [ref=e76]:
          - generic "Gợi ý theo sở thích và ngân sách" [ref=e77] [cursor=pointer]
        - region "Danh sách dịch vụ" [ref=e78]:
          - generic [ref=e79]:
            - heading "Khách sạn và cơ sở lưu trú" [level=2] [ref=e80]
            - paragraph [ref=e81]: 5 kết quả từ TravelGo
          - generic [ref=e82]:
            - generic [ref=e83] [cursor=pointer]:
              - generic [ref=e84]:
                - generic [ref=e85]:
                  - img "DEMO Đà Nẵng — Homestay" [ref=e86]
                  - button "Lưu địa điểm" [ref=e87]
                - generic [ref=e90]:
                  - generic [ref=e91]:
                    - generic [ref=e92]: Đà Nẵng
                    - heading "DEMO Đà Nẵng — Homestay" [level=3] [ref=e97]
                    - paragraph [ref=e98]: Homestay
                    - paragraph [ref=e99]: DEMO · Không phải đối tác thật
                    - generic [ref=e100]: Chưa có đánh giá xác minh
                  - generic [ref=e101]:
                    - generic [ref=e102]:
                      - generic [ref=e103]: Giá tham khảo từ
                      - text: 750.000 đ
                      - generic [ref=e104]: Giả định DEMO · đơn vị chưa xác minh
                    - link "Chi tiết" [ref=e105]:
                      - /url: /places/4c7192e3-7c4e-5cf1-a835-91aabba03c83
              - generic [ref=e108]:
                - link "Tư vấn bằng AI" [ref=e109]:
                  - /url: /assistant?listing=4c7192e3-7c4e-5cf1-a835-91aabba03c83
                - generic [ref=e110]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
            - generic [ref=e114] [cursor=pointer]:
              - generic [ref=e115]:
                - generic [ref=e116]:
                  - img "DEMO Đà Nẵng — Villa" [ref=e117]
                  - button "Lưu địa điểm" [ref=e118]
                - generic [ref=e121]:
                  - generic [ref=e122]:
                    - generic [ref=e123]: Đà Nẵng
                    - heading "DEMO Đà Nẵng — Villa" [level=3] [ref=e128]
                    - paragraph [ref=e129]: Villa
                    - paragraph [ref=e130]: DEMO · Không phải đối tác thật
                    - generic [ref=e131]: Chưa có đánh giá xác minh
                  - generic [ref=e132]:
                    - generic [ref=e133]:
                      - generic [ref=e134]: Giá tham khảo từ
                      - text: 1.100.000 đ
                      - generic [ref=e135]: Giả định DEMO · đơn vị chưa xác minh
                    - link "Chi tiết" [ref=e136]:
                      - /url: /places/82c088e2-a121-52c3-ab58-9064ed63c626
              - generic [ref=e139]:
                - link "Tư vấn bằng AI" [ref=e140]:
                  - /url: /assistant?listing=82c088e2-a121-52c3-ab58-9064ed63c626
                - generic [ref=e141]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
            - generic [ref=e145] [cursor=pointer]:
              - generic [ref=e146]:
                - generic [ref=e147]:
                  - img "DEMO Đà Nẵng — Resort" [ref=e148]
                  - button "Lưu địa điểm" [ref=e149]
                - generic [ref=e152]:
                  - generic [ref=e153]:
                    - generic [ref=e154]: Đà Nẵng
                    - heading "DEMO Đà Nẵng — Resort" [level=3] [ref=e159]
                    - paragraph [ref=e160]: Resort
                    - paragraph [ref=e161]: DEMO · Không phải đối tác thật
                    - generic [ref=e162]: Chưa có đánh giá xác minh
                  - generic [ref=e163]:
                    - generic [ref=e164]:
                      - generic [ref=e165]: Giá tham khảo từ
                      - text: 550.000 đ
                      - generic [ref=e166]: Giả định DEMO · đơn vị chưa xác minh
                    - link "Chi tiết" [ref=e167]:
                      - /url: /places/ac07f8d8-67ef-5995-ab68-623082f5f295
              - generic [ref=e170]:
                - link "Tư vấn bằng AI" [ref=e171]:
                  - /url: /assistant?listing=ac07f8d8-67ef-5995-ab68-623082f5f295
                - generic [ref=e172]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
            - generic [ref=e176] [cursor=pointer]:
              - generic [ref=e177]:
                - generic [ref=e178]:
                  - img "DEMO Đà Nẵng — Khách sạn" [ref=e179]
                  - button "Lưu địa điểm" [ref=e180]
                - generic [ref=e183]:
                  - generic [ref=e184]:
                    - generic [ref=e185]: Đà Nẵng
                    - heading "DEMO Đà Nẵng — Khách sạn" [level=3] [ref=e190]
                    - paragraph [ref=e191]: Khách sạn
                    - paragraph [ref=e192]: DEMO · Không phải đối tác thật
                    - generic [ref=e193]: Chưa có đánh giá xác minh
                  - generic [ref=e194]:
                    - generic [ref=e195]:
                      - generic [ref=e196]: Giá tham khảo từ
                      - text: 350.000 đ
                      - generic [ref=e197]: Giả định DEMO · đơn vị chưa xác minh
                    - link "Chi tiết" [ref=e198]:
                      - /url: /places/06a78793-c20f-51f7-a264-f7b3dc573512
              - generic [ref=e201]:
                - link "Tư vấn bằng AI" [ref=e202]:
                  - /url: /assistant?listing=06a78793-c20f-51f7-a264-f7b3dc573512
                - generic [ref=e203]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
            - generic [ref=e207] [cursor=pointer]:
              - generic [ref=e208]:
                - generic [ref=e209]:
                  - img "DEMO Đà Nẵng — Căn hộ" [ref=e210]
                  - button "Lưu địa điểm" [ref=e211]
                - generic [ref=e214]:
                  - generic [ref=e215]:
                    - generic [ref=e216]: Đà Nẵng
                    - heading "DEMO Đà Nẵng — Căn hộ" [level=3] [ref=e221]
                    - paragraph [ref=e222]: Căn hộ lưu trú
                    - paragraph [ref=e223]: DEMO · Không phải đối tác thật
                    - generic [ref=e224]: Chưa có đánh giá xác minh
                  - generic [ref=e225]:
                    - generic [ref=e226]:
                      - generic [ref=e227]: Giá tham khảo từ
                      - text: Chưa có giá
                      - generic [ref=e228]: Giả định DEMO · đơn vị chưa xác minh
                    - link "Chi tiết" [ref=e229]:
                      - /url: /places/c80d7575-f980-56d9-a9af-6d5a6a7d39b9
              - generic [ref=e232]:
                - link "Tư vấn bằng AI" [ref=e233]:
                  - /url: /assistant?listing=c80d7575-f980-56d9-a9af-6d5a6a7d39b9
                - generic [ref=e234]: Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị
    - contentinfo [ref=e238]:
      - generic [ref=e239]:
        - generic [ref=e240]:
          - generic [ref=e241]:
            - link "HuGo Travel" [ref=e242] [cursor=pointer]:
              - /url: /
            - paragraph [ref=e248]: Hệ thống đặt vé và dịch vụ du lịch uy tín hàng đầu Việt Nam. Khám phá những chân trời mới và chia sẻ những khoảnh khắc đáng nhớ nhất cùng chúng tôi.
            - generic [ref=e249]:
              - link [ref=e250] [cursor=pointer]:
                - /url: "#"
              - link [ref=e253] [cursor=pointer]:
                - /url: "#"
              - link [ref=e257] [cursor=pointer]:
                - /url: "#"
          - generic [ref=e261]:
            - heading "Liên kết nhanh" [level=3] [ref=e262]
            - list [ref=e263]:
              - listitem [ref=e264]:
                - link "Bản đồ khám phá" [ref=e265] [cursor=pointer]:
                  - /url: /explore
              - listitem [ref=e266]:
                - link "Đặt vé máy bay & tour" [ref=e267] [cursor=pointer]:
                  - /url: /tickets
              - listitem [ref=e268]:
                - link "Khách sạn & Resort" [ref=e269] [cursor=pointer]:
                  - /url: /hotels
              - listitem [ref=e270]:
                - link "Nhà hàng & Ẩm thực" [ref=e271] [cursor=pointer]:
                  - /url: /restaurants
              - listitem [ref=e272]:
                - link "Cẩm nang du lịch" [ref=e273] [cursor=pointer]:
                  - /url: /blog
          - generic [ref=e274]:
            - heading "Dịch vụ & Hỗ trợ" [level=3] [ref=e275]
            - list [ref=e276]:
              - listitem [ref=e277]:
                - link "Điều khoản dịch vụ" [ref=e278] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e279]:
                - link "Chính sách bảo mật" [ref=e280] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e281]:
                - link "Chính sách hoàn huỷ vé" [ref=e282] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e283]:
                - link "Câu hỏi thường gặp (FAQ)" [ref=e284] [cursor=pointer]:
                  - /url: "#"
              - listitem [ref=e285]:
                - link "Cổng đối tác & Quản trị" [ref=e286] [cursor=pointer]:
                  - /url: /admin
          - generic [ref=e287]:
            - heading "Liên hệ" [level=3] [ref=e288]
            - list [ref=e289]:
              - listitem [ref=e290]:
                - generic [ref=e294]: contact@hugotravel.com
              - listitem [ref=e295]:
                - generic [ref=e298]: 1900 1234 (24/7)
              - listitem [ref=e299]:
                - generic [ref=e303]: Tòa nhà Landmark 81, Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh
        - generic [ref=e304]:
          - paragraph [ref=e305]: © 2026 HuGo Travel. All rights reserved.
          - paragraph [ref=e306]: Xây dựng với mô hình MVC & Thuật toán Bayesian Average
    - button "Quyền riêng tư AI" [ref=e307]
  - generic [ref=e308]:
    - generic [ref=e309]:
      - searchbox "Tìm Điểm đến dịch vụ" [active] [ref=e310]: ĐL
      - button "Xóa từ khóa địa điểm" [ref=e311]: ×
    - status [ref=e312]: 34 tỉnh/thành · địa danh du lịch được phân biệt riêng
    - listbox "Điểm đến dịch vụ" [ref=e313]:
      - option "Đà Lạt Địa danh du lịch · tỉnh/thành 68" [ref=e314]:
        - generic [ref=e315]: Đà Lạt
        - generic [ref=e316]: Địa danh du lịch · tỉnh/thành 68
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
  8  | test('G01 all 34 provinces persist independently of catalog inventory',async({page})=>{await open(page);await page.getByRole('combobox',{name:'Điểm đến dịch vụ',exact:true}).click();await expect(page.locator('[role="option"][data-location-kind="province"]')).toHaveCount(34);await expect(page.locator('[role="option"][data-location-kind="destination"]')).toHaveCount(10);await expect(page.getByRole('option').filter({hasText:'Hà Tĩnh'})).toBeVisible();});
  9  | test('G02 normalized H Ho Da Ha searches, aliases, clear and keyboard',async({page})=>{await open(page);await page.getByRole('combobox',{name:'Điểm đến dịch vụ',exact:true}).click();const input=page.getByRole('searchbox',{name:'Tìm Điểm đến dịch vụ',exact:true});
  10 |  for(const [query,required]of [['H','Hà Nội'],['Ho','Hội An'],[' Da ','Đà Lạt'],['Ha','Hà Tĩnh'],['hỒ','Hồ Chí Minh'],['HCM','Hồ Chí Minh'],['SG','Hồ Chí Minh'],['DN','Đà Nẵng'],['ĐL','Đà Lạt']]){await input.fill(query);await expect(page.getByRole('option').filter({has:page.getByText(required,{exact:true})}).first()).toBeVisible();}
> 11 |  await page.getByRole('button',{name:'Xóa từ khóa địa điểm'}).click();await expect(input).toHaveValue('');await expect(page.locator('[role="option"][data-location-kind="province"]')).toHaveCount(34);await input.fill('ĐL');await expect(page.getByRole('option')).toHaveCount(1);await input.press('ArrowDown');await input.press('Enter');await expect(page.getByRole('combobox',{name:'Điểm đến dịch vụ',exact:true})).toContainText('Đà Lạt');await expect(cards(page)).toHaveCount(5);});
     |                                                                                                                                                                                                                                                                      ^ Error: expect(locator).toHaveCount(expected) failed
  12 | test('G03 exact Da Nang area vs merged province and restaurant tab',async({page},info)=>{await open(page);await expect(cards(page)).toHaveCount(5);await page.getByTestId('explore-category-restaurant').click();await expect(cards(page)).toHaveCount(5);await expect(cards(page).first()).toContainText('Đà Nẵng');await choose(page,'Đà Nẵng','province');await expect(cards(page)).toHaveCount(10);await expect(page.getByTestId('catalog-result-total')).toHaveText('10 kết quả từ TravelGo');await page.screenshot({path:path.join(process.env.LOCATION_EVIDENCE!,info.project.name+'-G03.png'),fullPage:true});});
  13 | test('G04 province maps Da Lat, Sa Pa, Phu Quoc and exact area stays narrow',async({page})=>{await open(page);for(const [province,city]of [['Lâm Đồng','Đà Lạt'],['Lào Cai','Sa Pa'],['An Giang','Phú Quốc']]){await choose(page,province,'province');await expect(cards(page)).toHaveCount(5);await expect(cards(page).first()).toContainText(city);}await choose(page,'Hội An');await expect(cards(page)).toHaveCount(5);await expect(cards(page).first()).toContainText('Hội An');});
  14 | test('G05 province with zero data stays available and all restores 50 hotels',async({page})=>{await open(page);await choose(page,'Hà Tĩnh','province');await expect(cards(page)).toHaveCount(0);await expect(page.getByTestId('explore-empty')).toHaveText('Chưa có khách sạn tại địa điểm này.');await choose(page,'Tất cả địa điểm','all');await expect(page.getByTestId('catalog-result-total')).toHaveText('50 kết quả từ TravelGo');await expect(cards(page)).toHaveCount(20);await page.getByRole('button',{name:'Trang sau',exact:true}).click();await expect(page.getByLabel('Phân trang dịch vụ')).toContainText('Trang 2/3');});
  15 | test('G06 location + category + search + price are combined in real API',async({page})=>{await open(page);await choose(page,'Đà Lạt');await page.getByLabel('Tìm kiếm dịch vụ',{exact:true}).fill('Homestay');await page.getByText('Bộ lọc giá, loại hình và tiện ích',{exact:true}).click();await page.getByLabel('Giá từ tối đa',{exact:true}).fill('800000');await expect(cards(page)).toHaveCount(1);await expect(cards(page).first()).toContainText('Đà Lạt');await expect(cards(page).first()).toContainText('750.000');});
  16 | test('G07 cards occupy main content, no giant introduction or nested scroll',async({page},info)=>{await open(page);await expect(cards(page)).toHaveCount(5);await expect(page.getByText('Khám phá catalog DEMO',{exact:true})).toHaveCount(0);expect(await cards(page).first().evaluate(e=>{const parent=e.parentElement!;return getComputedStyle(parent).overflowY!=='auto'&&getComputedStyle(parent).display==='grid';})).toBeTruthy();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBeTruthy();await cards(page).first().scrollIntoViewIfNeeded();await expect(cards(page).first().locator('h3')).toBeVisible();await expect(cards(page).first().getByRole('link',{name:'Tư vấn bằng AI',exact:true})).toBeVisible();await page.screenshot({path:path.join(process.env.LOCATION_EVIDENCE!,info.project.name+'-G07.png'),fullPage:true});});
  17 | test('G08 hotels and restaurants share geographic picker and real filters',async({page})=>{for(const route of ['/hotels','/restaurants']){await open(page,route);await choose(page,'Lâm Đồng','province');await expect(page.getByTestId('service-catalog-card')).toHaveCount(5);await expect(page.getByTestId('service-catalog-card').first()).toContainText('Đà Lạt');await choose(page,'Hà Tĩnh','province');await expect(page.getByTestId('service-catalog-card')).toHaveCount(0);await expect(page.getByText(route==='/hotels'?/Chưa có khách sạn tại địa điểm này/:/Chưa có nhà hàng tại địa điểm này/)).toBeVisible();}});
  18 | test('G09 home search, Planner, Tours and Tickets use same picker',async({page})=>{await page.goto('/');const home=page.getByRole('combobox',{name:'Điểm đến tìm kiếm',exact:true});await expect(home).toBeVisible();await choose(page,'Đà Lạt','destination','Điểm đến tìm kiếm');await page.getByRole('button',{name:'Khách sạn',exact:true}).click();await page.getByRole('button',{name:'Tìm kiếm',exact:true}).click();await expect(page).toHaveURL(/locationId=destination%3Ada-lat/);await expect(cards(page)).toHaveCount(5);for(const [route,label]of [['/tour-planner','Điểm đến khám phá'],['/tours','Điểm đến tour'],['/tickets','Điểm đến']]){await page.goto(route);await choose(page,'Hà Tĩnh','province',label);await expect(page.getByRole('combobox',{name:label,exact:true})).toContainText('Hà Tĩnh');}});
  19 | 
```