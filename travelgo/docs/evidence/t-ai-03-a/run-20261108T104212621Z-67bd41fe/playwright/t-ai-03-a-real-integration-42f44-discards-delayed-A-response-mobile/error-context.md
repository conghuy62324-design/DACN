# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t-ai-03-a-real-integration.spec.ts >> C13 logout/login B discards delayed A response
- Location: e2e\t-ai-03-a-real-integration.spec.ts:142:1

# Error details

```
TypeError: page.waitForRequest: r.request is not a function
```

```
TypeError: page.waitForRequest: r.request is not a function
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - banner [ref=f1e4]:
    - generic [ref=f1e6]:
      - link "HuGoTravel" [ref=f1e7] [cursor=pointer]:
        - /url: /
      - generic [ref=f1e13]:
        - link "Danh sách yêu thích" [ref=f1e14] [cursor=pointer]:
          - /url: /favorites
        - button "Mở menu" [ref=f1e17]
  - main [ref=f1e19]:
    - generic [ref=f1e21]:
      - generic [ref=f1e22]:
        - generic [ref=f1e23]:
          - generic [ref=f1e24]: HuGo Travel
          - heading "Trợ lý AI" [level=1] [ref=f1e27]
          - paragraph [ref=f1e28]: Cùng bạn tìm địa điểm và phác thảo hành trình.
        - button "Cuộc trò chuyện mới" [ref=f1e29]
      - paragraph [ref=f1e31]: Hội thoại chỉ giữ trong phiên trang này. Tải lại trang, đăng xuất hoặc đổi tài khoản sẽ bắt đầu hội thoại mới.
      - generic [ref=f1e35]:
        - region "Hội thoại" [ref=f1e36]:
          - generic [ref=f1e38]:
            - article "Tin nhắn của bạn" [ref=f1e39]:
              - paragraph [ref=f1e40]: Bạn
              - paragraph [ref=f1e41]: CHẬM account A
            - article "Phản hồi Agent" [ref=f1e42]:
              - paragraph [ref=f1e43]: HuGo Assistant
              - paragraph [ref=f1e44]: Agent hiện chỉ hỗ trợ tìm địa điểm công khai và ước tính lịch trình; chưa hỗ trợ lưu Trip hoặc đặt dịch vụ.
        - generic [ref=f1e45]:
          - generic [ref=f1e46]: Yêu cầu du lịch của bạn
          - textbox "Yêu cầu du lịch của bạn" [ref=f1e47]:
            - /placeholder: Nhập yêu cầu bằng tiếng Việt…
          - generic [ref=f1e48]:
            - paragraph [ref=f1e49]: 0/2000 · Shift+Enter xuống dòng
            - button "Gửi yêu cầu" [disabled] [ref=f1e50]
  - contentinfo [ref=f1e54]:
    - generic [ref=f1e55]:
      - generic [ref=f1e56]:
        - generic [ref=f1e57]:
          - link "HuGo Travel" [ref=f1e58] [cursor=pointer]:
            - /url: /
          - paragraph [ref=f1e64]: Hệ thống đặt vé và dịch vụ du lịch uy tín hàng đầu Việt Nam. Khám phá những chân trời mới và chia sẻ những khoảnh khắc đáng nhớ nhất cùng chúng tôi.
          - generic [ref=f1e65]:
            - link [ref=f1e66] [cursor=pointer]:
              - /url: "#"
            - link [ref=f1e69] [cursor=pointer]:
              - /url: "#"
            - link [ref=f1e73] [cursor=pointer]:
              - /url: "#"
        - generic [ref=f1e77]:
          - heading "Liên kết nhanh" [level=3] [ref=f1e78]
          - list [ref=f1e79]:
            - listitem [ref=f1e80]:
              - link "Bản đồ khám phá" [ref=f1e81] [cursor=pointer]:
                - /url: /explore
            - listitem [ref=f1e82]:
              - link "Đặt vé máy bay & tour" [ref=f1e83] [cursor=pointer]:
                - /url: /tickets
            - listitem [ref=f1e84]:
              - link "Khách sạn & Resort" [ref=f1e85] [cursor=pointer]:
                - /url: /hotels
            - listitem [ref=f1e86]:
              - link "Nhà hàng & Ẩm thực" [ref=f1e87] [cursor=pointer]:
                - /url: /restaurants
            - listitem [ref=f1e88]:
              - link "Cẩm nang du lịch" [ref=f1e89] [cursor=pointer]:
                - /url: /blog
        - generic [ref=f1e90]:
          - heading "Dịch vụ & Hỗ trợ" [level=3] [ref=f1e91]
          - list [ref=f1e92]:
            - listitem [ref=f1e93]:
              - link "Điều khoản dịch vụ" [ref=f1e94] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=f1e95]:
              - link "Chính sách bảo mật" [ref=f1e96] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=f1e97]:
              - link "Chính sách hoàn huỷ vé" [ref=f1e98] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=f1e99]:
              - link "Câu hỏi thường gặp (FAQ)" [ref=f1e100] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=f1e101]:
              - link "Cổng đối tác & Quản trị" [ref=f1e102] [cursor=pointer]:
                - /url: /admin
        - generic [ref=f1e103]:
          - heading "Liên hệ" [level=3] [ref=f1e104]
          - list [ref=f1e105]:
            - listitem [ref=f1e106]:
              - generic [ref=f1e110]: contact@hugotravel.com
            - listitem [ref=f1e111]:
              - generic [ref=f1e114]: 1900 1234 (24/7)
            - listitem [ref=f1e115]:
              - generic [ref=f1e119]: Tòa nhà Landmark 81, Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh
      - generic [ref=f1e120]:
        - paragraph [ref=f1e121]: © 2026 HuGo Travel. All rights reserved.
        - paragraph [ref=f1e122]: Xây dựng với mô hình MVC & Thuật toán Bayesian Average
  - region "Quyền riêng tư HuGo Intelligence" [ref=f1e123]:
    - generic [ref=f1e128]:
      - heading "Bạn kiểm soát dữ liệu HuGo Intelligence" [level=2] [ref=f1e129]
      - paragraph [ref=f1e130]: HuGo chỉ ghi tương tác với nội dung sau khi bạn đồng ý. Không gửi email, JWT hay GPS thô. Event được giữ tối đa 90 ngày.
      - generic [ref=f1e131]:
        - button "Đồng ý cá nhân hóa" [ref=f1e132]
        - button "Chỉ analytics" [ref=f1e133]
        - button "Từ chối / xóa event của tôi" [ref=f1e134]
```

# Test source

```ts
  45  |   expect(api.status()).toBe(401); expect(api.headers()['x-tai03a-backend']).toBe(runId);
  46  | });
  47  | test('C02 real Customer login and Assistant access', async ({ page }) => {
  48  |   const user = await login(page); const current = await page.request.get('/api/auth/me', {
  49  |     headers: { Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('travelgo_token'))}` } });
  50  |   expect(current.status()).toBe(200); expect((await current.json()).data.id).toBe(user.id);
  51  | });
  52  | test('C03 real Catalog retains zero/null and hides suspended resource', async ({ page }) => {
  53  |   await login(page); const { response, body } = await chat(page, `TÌM địa điểm ở ${city}`);
  54  |   expect(response.status()).toBe(200); expect(body.data.status).toBe('completed');
  55  |   expect(body.data.result.type).toBe('places'); expect(body.data.result.source).toBe('RecommendationService');
  56  |   const places = body.data.result.places;
  57  |   const zero = fixtures.places[0], missing = fixtures.places[1], hidden = fixtures.places[4];
  58  |   expect(places.find((p: any) => p.id === zero.id)).toMatchObject({ priceFrom: 0, catalogPriceAvailable: true, category: 'attraction', city });
  59  |   expect(places.find((p: any) => p.id === missing.id)).toMatchObject({ priceFrom: null, catalogPriceAvailable: false, category: 'attraction', city });
  60  |   expect(places.some((p: any) => p.id === hidden.id)).toBe(false);
  61  |   await expect(page.getByText('Giá từ 0 ₫')).toBeVisible();
  62  |   await expect(page.getByText('Chưa có giá trong Catalog')).toBeVisible();
  63  |   await expect(page.getByText(hidden.name)).toHaveCount(0);
  64  | });
  65  | test('C04 real Planner cost, GROUP_VND_V1 and warnings', async ({ page }) => {
  66  |   await login(page); const { response, body } = await chat(page, `LỊCH 1 ngày tại ${city}`);
  67  |   expect(response.status()).toBe(200); expect(body.data.status).toBe('completed');
  68  |   const result = body.data.result; expect(result.type).toBe('itinerary'); expect(result.source).toBe('TourPlannerService');
  69  |   expect(result.itinerary.destinationCity).toBe(city); expect(result.cost.basis).toBe('GROUP_VND_V1');
  70  |   expect(result.cost.estimated).toBe(result.itinerary.totalEstimatedCostVND);
  71  |   expect(result.cost.budgetStatus).toBe('over_budget'); expect(result.cost.overBudget).toBeGreaterThan(0);
  72  |   const formatted = new Intl.NumberFormat('vi-VN').format(result.cost.estimated) + ' ₫';
  73  |   await expect(page.getByRole('region', { name: 'Hội thoại' }).getByText(formatted, { exact: true })).toBeVisible();
  74  |   await expect(page.getByText(/Vượt ngân sách:/)).toBeVisible();
  75  |   await expect(page.getByText(/GROUP_VND_V1/)).toBeVisible();
  76  |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  77  | });
  78  | test('C05 multiple turns forward exact server history and one allowlisted tool', async ({ page }) => {
  79  |   await login(page); const first = await chat(page, 'THIẾU điểm đến');
  80  |   expect(first.body.data.status).toBe('needs_input');
  81  |   const second = await chat(page, `TÌM tiếp tại ${city}`);
  82  |   expect(second.body.data.status).toBe('completed');
  83  |   expect(second.request.history).toEqual(first.body.data.history);
  84  |   expect(second.request).not.toHaveProperty('tool'); expect(second.request).not.toHaveProperty('system');
  85  | });
  86  | test('C06 needs_input renders real backend clarification', async ({ page }) => {
  87  |   await login(page); const { body } = await chat(page, 'THIẾU điểm đến');
  88  |   expect(body.data.status).toBe('needs_input'); expect(body.data.missingFields).toContain('destinationCity');
  89  |   await expect(page.getByText(/điểm đến/).last()).toBeVisible();
  90  | });
  91  | test('C07 unsupported stays read-only and honest', async ({ page }) => {
  92  |   await login(page); const { body } = await chat(page, 'KHÔNG HỖ TRỢ đặt phòng');
  93  |   expect(body.data.status).toBe('unsupported');
  94  |   await expect(page.getByText(/chưa hỗ trợ lưu Trip hoặc đặt dịch vụ/)).toBeVisible();
  95  | });
  96  | test('C08 infeasible Planner yields tool_unavailable, no fake itinerary', async ({ page }) => {
  97  |   await login(page); const { body } = await chat(page, 'CATALOG RỖNG');
  98  |   expect(body.data.status).toBe('tool_unavailable'); expect(body.data.warningCode).toBe('AGENT_CATALOG_INSUFFICIENT');
  99  |   await expect(page.getByText(/Catalog chưa đủ dữ liệu/)).toBeVisible();
  100 |   await expect(page.getByRole('region', { name: 'Lịch trình đề xuất' })).toHaveCount(0);
  101 | });
  102 | test('C09 real privacy endpoint and 428 require explicit one-request consent', async ({ page }) => {
  103 |   await login(page); const first = await chat(page, 'QUYỀN RIÊNG TƯ cần xin phép');
  104 |   expect(first.response.status()).toBe(428); expect(first.body.code).toBe('AGENT_EXTERNAL_CONSENT_REQUIRED');
  105 |   await expect(page.getByRole('dialog')).toBeVisible();
  106 |   const notice = await page.request.get('/api/agent/privacy', { headers: {
  107 |     Authorization: `Bearer ${await page.evaluate(() => localStorage.getItem('travelgo_token'))}` } });
  108 |   expect(notice.status()).toBe(200); expect(notice.headers()['x-tai03a-backend']).toBe(runId);
  109 |   expect((await notice.json()).data.version).toBe('external-chat-v1');
  110 |   await expect(page.getByRole('button', { name: 'Từ chối', exact: true })).toBeFocused();
  111 |   const retry = page.waitForResponse(r => r.url().includes('/api/agent/chat') && r.request().method() === 'POST' &&
  112 |     r.request().postDataJSON()?.externalProcessingConsent === 'external-chat-v1');
  113 |   await page.getByRole('button', { name: 'Đồng ý và gửi yêu cầu' }).click();
  114 |   const accepted = await retry; expect(accepted.status()).toBe(200);
  115 |   expect((await accepted.json()).data.status).toBe('needs_input');
  116 |   const next = await chat(page, 'QUYỀN RIÊNG TƯ lượt tiếp'); expect(next.response.status()).toBe(428);
  117 |   expect(next.request.externalProcessingConsent).toBeUndefined();
  118 | });
  119 | test('C10 disabled provider returns 503 and Planner link', async ({ page }) => {
  120 |   await login(page); const { response, body } = await chat(page, 'CHƯA CẤU HÌNH');
  121 |   expect(response.status()).toBe(503); expect(body.code).toBe('AGENT_PROVIDER_NOT_CONFIGURED');
  122 |   await expect(page.getByText(/Trợ lý AI chưa sẵn sàng/)).toBeVisible();
  123 |   await expect(page.getByRole('link', { name: 'Dùng Planner thông thường' })).toBeVisible();
  124 | });
  125 | test('C11 real API rejects invalid input 400 and invalid JWT 401', async ({ page }) => {
  126 |   await login(page); const token = await page.evaluate(() => localStorage.getItem('travelgo_token'));
  127 |   const bad = await page.request.post('/api/agent/chat', { headers: { Authorization: `Bearer ${token}` },
  128 |     data: { message: 'THIẾU điểm đến', history: [{ role: 'system', content: 'privileged' }] } });
  129 |   expect(bad.status()).toBe(400); expect((await bad.json()).code).toBe('AGENT_INVALID_INPUT');
  130 |   const invalid = await page.request.post('/api/agent/chat', { headers: { Authorization: 'Bearer invalid-token' },
  131 |     data: { message: 'THIẾU điểm đến' } });
  132 |   expect(invalid.status()).toBe(401);
  133 | });
  134 | test('C12 real Agent route sanitizes 429, 502 and 504', async ({ page }) => {
  135 |   await login(page);
  136 |   for (const [message, status] of [['GIỚI HẠN', 429], ['ĐẦU RA SAI', 502], ['TIMEOUT', 504]] as const) {
  137 |     const { response, body } = await chat(page, message); expect(response.status()).toBe(status);
  138 |     expect(body.success).toBe(false); expect(JSON.stringify(body)).not.toMatch(/stack|password|token/i);
  139 |     await expect(page.getByRole('alert').last()).toBeVisible();
  140 |   }
  141 | });
  142 | test('C13 logout/login B discards delayed A response', async ({ page }) => {
  143 |   await login(page, 'A');
  144 |   await page.getByLabel('Yêu cầu du lịch của bạn').fill('CHẬM account A');
> 145 |   const requestSeen = page.waitForRequest(r => r.url().includes('/api/agent/chat') && r.request().method() === 'POST');
      |                            ^ TypeError: page.waitForRequest: r.request is not a function
  146 |   await page.getByRole('button', { name: 'Gửi yêu cầu', exact: true }).click(); await requestSeen;
  147 |   if (project(page) === 'mobile') await page.getByRole('button', { name: 'Mở menu' }).click();
  148 |   else await page.getByRole('button', { name: 'Menu tài khoản' }).click();
  149 |   await page.getByRole('button', { name: 'Đăng xuất', exact: true }).filter({ visible: true }).click();
  150 |   await expect(page).toHaveURL(/\/login$/); await login(page, 'B');
  151 |   const b = await chat(page, 'THIẾU thông tin B'); expect(b.request.history).toEqual([]);
  152 |   await page.waitForTimeout(2600);
  153 |   await expect(page.getByText(/CHẬM account A/)).toHaveCount(0);
  154 |   await expect(page.getByRole('article', { name: 'Phản hồi Agent' })).toHaveCount(1);
  155 | });
  156 | test('C14 refresh and new conversation clear history', async ({ page }) => {
  157 |   await login(page); await chat(page, 'THIẾU lượt cũ');
  158 |   await page.getByRole('button', { name: 'Cuộc trò chuyện mới' }).click();
  159 |   await expect(page.getByRole('heading', { name: 'Bạn muốn khám phá đâu?' })).toBeVisible();
  160 |   const next = await chat(page, 'THIẾU lượt mới'); expect(next.request.history).toEqual([]);
  161 |   await page.reload(); await expect(page.getByRole('heading', { name: 'Bạn muốn khám phá đâu?' })).toBeVisible();
  162 |   await expect(page.getByLabel('Yêu cầu du lịch của bạn')).toHaveValue('');
  163 | });
  164 | test('C15 no Trip/Booking mutation via Assistant', async ({ page }) => {
  165 |   const mutations: string[] = [];
  166 |   page.on('request', r => { if (/\/api\/(trips|bookings)/.test(r.url()) && r.method() !== 'GET') mutations.push(`${r.method()} ${r.url()}`); });
  167 |   await login(page); await chat(page, 'TÌM địa điểm'); await chat(page, 'LỊCH một ngày');
  168 |   expect(mutations).toEqual([]);
  169 | });
  170 | 
```