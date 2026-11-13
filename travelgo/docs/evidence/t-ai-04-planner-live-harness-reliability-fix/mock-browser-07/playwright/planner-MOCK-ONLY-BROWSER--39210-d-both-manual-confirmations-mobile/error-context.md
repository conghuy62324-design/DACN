# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: planner.spec.cjs >> MOCK_ONLY_BROWSER saved completed itinerary and both manual confirmations
- Location: docs\evidence\t-ai-04-planner-live-harness-reliability-fix\browser-tests\planner.spec.cjs:43:1

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "PASS"
Received: "FAIL"
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
        - generic [ref=e23]:
          - generic [ref=e24]: HuGo Travel
          - heading "Trợ lý AI" [level=1] [ref=e27]
          - paragraph [ref=e28]: Cùng bạn tìm địa điểm và phác thảo hành trình.
        - button "Đặt lại phiên G2" [ref=e29]
      - paragraph [ref=e31]: Hội thoại chỉ giữ trong phiên trang này. Tải lại trang, đăng xuất hoặc đổi tài khoản sẽ bắt đầu hội thoại mới.
      - generic [ref=e35]:
        - paragraph [ref=e36]: "Chế độ hiện tại: G2 · hội thoại local/demo"
        - generic [ref=e37]:
          - button "Kết thúc phiên G2" [ref=e38]
          - button "Trở về G1" [ref=e39]
          - link "Dùng Planner" [ref=e40] [cursor=pointer]:
            - /url: /tour-planner
        - paragraph [ref=e41]: Thông tin xác minh chỉ lưu trong RAM máy chủ, tối đa 15 phút; có thể mất khi máy chủ khởi động lại. Tải lại trang về G1, không khôi phục phiên cũ. Đăng xuất thử xóa phiên, không bảo đảm xóa khi mất mạng.
      - generic [ref=e42]:
        - region "Hội thoại" [ref=e43]:
          - generic [ref=e45]:
            - article "Tin nhắn của bạn" [ref=e46]:
              - paragraph [ref=e47]: Bạn
              - paragraph [ref=e48]: "Nơi xuất phát: Huế; Ngày bắt đầu: 2036-04-22; Ngày kết thúc: 2036-04-23; Số người lớn: 2; Ngân sách cả nhóm: 6400000 VND; Phương tiện: car; Điểm đến: Đà Nẵng"
            - article "Phản hồi Agent" [ref=e49]:
              - paragraph [ref=e50]: HuGo Assistant
              - paragraph [ref=e51]: "MOCK_ONLY_BROWSER: saved public Planner response; no live execution."
              - region "Lịch trình đề xuất" [ref=e52]:
                - generic [ref=e53]:
                  - heading "Hành trình 2N1Đ khám phá Đà Nẵng" [level=3] [ref=e54]
                  - paragraph [ref=e55]: Đà Nẵng · 2036-04-22 – 2036-04-23
                - region "Chi phí lịch trình" [ref=e56]:
                  - paragraph [ref=e57]: Dự toán cho cả nhóm · GROUP_VND_V1
                  - paragraph [ref=e58]: 3.500.000 ₫
                  - paragraph [ref=e59]: "Ngân sách: 6.400.000 ₫"
                  - paragraph [ref=e60]: Trong ngân sách đã nhập
                  - paragraph [ref=e61]: Tổng chi phí ước tính nằm trong ngân sách đã nhập. Bạn còn khoảng 2.900.000đ cho chi tiêu phát sinh hoặc mua sắm quà lưu niệm.
                  - group [ref=e62]:
                    - generic "Giả định chi phí" [ref=e63] [cursor=pointer]
                - generic [ref=e64]:
                  - heading "Ngày 1 · 2036-04-22" [level=4] [ref=e65]
                  - paragraph [ref=e66]: "Ngày 1: Khám phá văn hóa & danh thắng Đà Nẵng"
                  - list [ref=e67]:
                    - listitem [ref=e68]:
                      - paragraph [ref=e69]: Khám phá [TEST FIXTURE] Planner DN A02 - synthetic sightseeing
                      - paragraph [ref=e70]: TEST FIXTURE ONLY. Synthetic catalog record for Planner QA; not a real tourist attraction, address or market price.
                      - paragraph [ref=e71]: "Dự toán: 300.000 ₫"
                      - paragraph [ref=e72]: "Catalog priceFrom ([TEST FIXTURE] Planner DN A02 - synthetic sightseeing): 150000 VND; giả định người lớn quy đổi/lượt tham quan, chưa xác minh đơn vị/giá dịch vụ."
                    - listitem [ref=e73]:
                      - paragraph [ref=e74]: Thưởng thức ẩm thực tại HuGo Seafood
                      - paragraph [ref=e75]: Nhà hàng hải sản địa phương.
                      - paragraph [ref=e76]: "Dự toán: 700.000 ₫"
                      - paragraph [ref=e77]: "Catalog priceFrom (HuGo Seafood): 350000 VND; giả định người lớn quy đổi/bữa trưa, chưa xác minh đơn vị/giá dịch vụ."
                    - listitem [ref=e78]:
                      - paragraph [ref=e79]: Ăn tối, dạo chợ đêm & Thưởng ngoạn phố lên đèn
                      - paragraph [ref=e80]: Tận hưởng không khí đêm náo nhiệt, thưởng thức đồ ăn vặt và mua sắm đặc sản.
                      - paragraph [ref=e81]: "Dự toán: 400.000 ₫"
                      - paragraph [ref=e82]: "Giả định planner T11-B: 200000 VND/người lớn quy đổi/bữa tối; chưa chọn dịch vụ, chưa xác minh giá."
                  - paragraph [ref=e83]: "Dự toán ngày: 2.600.000 ₫"
                  - paragraph [ref=e84]: "Chi phí lưu trú: 1.200.000 ₫"
                - generic [ref=e85]:
                  - heading "Ngày 2 · 2036-04-23" [level=4] [ref=e86]
                  - paragraph [ref=e87]: "Ngày 2: Khám phá văn hóa & danh thắng Đà Nẵng"
                  - list [ref=e88]:
                    - listitem [ref=e89]:
                      - paragraph [ref=e90]: Khám phá [TEST FIXTURE] Planner DN A01 - synthetic sightseeing
                      - paragraph [ref=e91]: TEST FIXTURE ONLY. Synthetic catalog record for Planner QA; not a real tourist attraction, address or market price.
                      - paragraph [ref=e92]: "Dự toán: 200.000 ₫"
                      - paragraph [ref=e93]: "Catalog priceFrom ([TEST FIXTURE] Planner DN A01 - synthetic sightseeing): 100000 VND; giả định người lớn quy đổi/lượt tham quan, chưa xác minh đơn vị/giá dịch vụ."
                    - listitem [ref=e94]:
                      - paragraph [ref=e95]: Nghỉ ngơi và dùng bữa trưa đặc sản địa phương
                      - paragraph [ref=e96]: Thưởng thức các món ngon truyền thống nổi tiếng chuẩn vị bản địa.
                      - paragraph [ref=e97]: "Dự toán: 300.000 ₫"
                      - paragraph [ref=e98]: "Giả định planner T11-B: 150000 VND/người lớn quy đổi/bữa trưa; chưa chọn dịch vụ thiếu giá catalog hợp lệ, chưa xác minh."
                    - listitem [ref=e99]:
                      - paragraph [ref=e100]: Ăn tối, dạo chợ đêm & Thưởng ngoạn phố lên đèn
                      - paragraph [ref=e101]: Tận hưởng không khí đêm náo nhiệt, thưởng thức đồ ăn vặt và mua sắm đặc sản.
                      - paragraph [ref=e102]: "Dự toán: 400.000 ₫"
                      - paragraph [ref=e103]: "Giả định planner T11-B: 200000 VND/người lớn quy đổi/bữa tối; chưa chọn dịch vụ, chưa xác minh giá."
                  - paragraph [ref=e104]: "Dự toán ngày: 900.000 ₫"
                  - paragraph [ref=e105]: "Chi phí lưu trú: 0 ₫"
                - paragraph [ref=e106]:
                  - text: "Gợi ý lưu trú:"
                  - link "HuGo Riverside Hotel" [ref=e107] [cursor=pointer]:
                    - /url: /places/39a5483f-e3d0-4cf8-a9b9-65e6b0a33593
                - complementary "Cảnh báo" [ref=e108]:
                  - heading "Lưu ý cho chuyến đi" [level=3] [ref=e109]
                  - list [ref=e110]:
                    - listitem [ref=e111]: Đây là ước tính của Planner, chưa lưu Trip và chưa đặt dịch vụ.
                    - listitem [ref=e112]: Mọi khoản activity, tổng ngày và tổng chuyến là VND cho cả nhóm, làm tròn từng khoản đến 1 VND; ngân sách cũng cho cả nhóm.
                    - listitem [ref=e113]: Ước tính hoạt động/ăn uống quy đổi mỗi người lớn = 1, trẻ em = 0,7; đây là giả định lập kế hoạch, không phải chính sách giá của nhà cung cấp.
                    - listitem [ref=e114]: priceFrom chưa có đơn vị và sức chứa đáng tin cậy. Tạm ước tính một phòng cho cả nhóm mỗi đêm; không bảo đảm đủ chỗ hoặc đúng giá phòng/đêm.
                    - listitem [ref=e115]: Lưu trú dùng priceFrom khách sạn, thiếu giá dùng 400.000đ/nhóm/đêm; chỉ tính N−1 đêm. Phí này tách khỏi activity khách sạn có giá 0đ.
                    - listitem [ref=e116]: "Tham quan dùng priceFrom, thiếu giá tạm tính 300.000đ/người lớn quy đổi/lượt. Bữa trưa dùng priceFrom nhà hàng, thiếu giá tạm tính 150.000đ; bữa tối tạm tính 200.000đ/người lớn quy đổi. Nguồn giả định: định mức planner T11-B trong source, chưa khảo sát giá thị trường; xem nhãn từng khoản. Giá 0 được giữ nguyên; không cắt giá theo ngân sách."
                    - listitem [ref=e117]: Chưa bao gồm vé máy bay/tàu, chi phí chặng khởi hành hoặc giá vận chuyển thực tế; tổng này không phải giá trọn gói hay bảo đảm đủ ngân sách.
                    - listitem [ref=e118]: Tổng chi phí ước tính nằm trong ngân sách đã nhập. Bạn còn khoảng 2.900.000đ cho chi tiêu phát sinh hoặc mua sắm quà lưu niệm.
                - paragraph [ref=e119]: Bản tham khảo từ Planner. Chưa lưu chuyến đi hoặc đặt dịch vụ.
        - generic [ref=e120]:
          - generic [ref=e121]: Yêu cầu du lịch của bạn
          - textbox "Yêu cầu du lịch của bạn" [ref=e122]:
            - /placeholder: Nhập yêu cầu bằng tiếng Việt…
          - generic [ref=e123]:
            - paragraph [ref=e124]: 0/2000 · Shift+Enter xuống dòng
            - button "Gửi yêu cầu" [disabled] [ref=e125]
  - contentinfo [ref=e129]:
    - generic [ref=e130]:
      - generic [ref=e131]:
        - generic [ref=e132]:
          - link "HuGo Travel" [ref=e133] [cursor=pointer]:
            - /url: /
          - paragraph [ref=e139]: Hệ thống đặt vé và dịch vụ du lịch uy tín hàng đầu Việt Nam. Khám phá những chân trời mới và chia sẻ những khoảnh khắc đáng nhớ nhất cùng chúng tôi.
          - generic [ref=e140]:
            - link [ref=e141] [cursor=pointer]:
              - /url: "#"
            - link [ref=e144] [cursor=pointer]:
              - /url: "#"
            - link [ref=e148] [cursor=pointer]:
              - /url: "#"
        - generic [ref=e152]:
          - heading "Liên kết nhanh" [level=3] [ref=e153]
          - list [ref=e154]:
            - listitem [ref=e155]:
              - link "Bản đồ khám phá" [ref=e156] [cursor=pointer]:
                - /url: /explore
            - listitem [ref=e157]:
              - link "Đặt vé máy bay & tour" [ref=e158] [cursor=pointer]:
                - /url: /tickets
            - listitem [ref=e159]:
              - link "Khách sạn & Resort" [ref=e160] [cursor=pointer]:
                - /url: /hotels
            - listitem [ref=e161]:
              - link "Nhà hàng & Ẩm thực" [ref=e162] [cursor=pointer]:
                - /url: /restaurants
            - listitem [ref=e163]:
              - link "Cẩm nang du lịch" [ref=e164] [cursor=pointer]:
                - /url: /blog
        - generic [ref=e165]:
          - heading "Dịch vụ & Hỗ trợ" [level=3] [ref=e166]
          - list [ref=e167]:
            - listitem [ref=e168]:
              - link "Điều khoản dịch vụ" [ref=e169] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e170]:
              - link "Chính sách bảo mật" [ref=e171] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e172]:
              - link "Chính sách hoàn huỷ vé" [ref=e173] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e174]:
              - link "Câu hỏi thường gặp (FAQ)" [ref=e175] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e176]:
              - link "Cổng đối tác & Quản trị" [ref=e177] [cursor=pointer]:
                - /url: /admin
        - generic [ref=e178]:
          - heading "Liên hệ" [level=3] [ref=e179]
          - list [ref=e180]:
            - listitem [ref=e181]:
              - generic [ref=e185]: contact@hugotravel.com
            - listitem [ref=e186]:
              - generic [ref=e189]: 1900 1234 (24/7)
            - listitem [ref=e190]:
              - generic [ref=e194]: Tòa nhà Landmark 81, Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh
      - generic [ref=e195]:
        - paragraph [ref=e196]: © 2026 HuGo Travel. All rights reserved.
        - paragraph [ref=e197]: Xây dựng với mô hình MVC & Thuật toán Bayesian Average
  - button "Quyền riêng tư AI" [ref=e198]
```

# Test source

```ts
  1  | // Independent actual-frontend acceptance. No production code or route is replaced.
  2  | // HTTP API is mocked; fixtures are sealed before browser launch.
  3  | const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
  4  | const {test,expect}=require(path.resolve(__dirname,'../../../../frontend/node_modules/@playwright/test'));
  5  | const {runPlannerHarness}=require('../run-live.corrected.cjs');
  6  | const checks=require('../browser-checks.cjs');
  7  | const task=path.resolve(__dirname,'..'),fixture=JSON.parse(fs.readFileSync(path.join(task,'mock-browser-manifest.json'))),lock=JSON.parse(fs.readFileSync(path.join(task,'offline-input-lock-05.json')));
  8  | const browserDir='mock-browser-'+(process.env.PLANNER_MOCK_RUN||'02');
  9  | const user={id:'mock-planner-owner',fullName:'MOCK_ONLY Planner',email:'planner@example.test',roles:['CUSTOMER']};
  10 | const privacy={version:'LOCAL_DEMO_SLOTS_V1',mode:'LOCAL_DEMO',ttlSeconds:900,enabled:true,text:'MOCK_ONLY_BROWSER slots local/demo in RAM, 15 minutes.'};
  11 | const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(task,f))).digest('hex');
  12 | async function setup(page){
  13 |   const audit={tier:'MOCK_ONLY_BROWSER',calls:[],blockedExternal:[],errors:[],requests:[],active:null};
  14 |   await page.clock.setFixedTime(new Date(fixture.clock));
  15 |   page.on('pageerror',error=>audit.errors.push(error.message));
  16 |   await page.route('**/*',async route=>{
  17 |     const request=route.request(),url=new URL(request.url());
  18 |     if(url.origin!==fixture.origin){audit.blockedExternal.push({origin:url.origin,path:url.pathname});return route.abort('blockedbyclient');}
  19 |     if(!url.pathname.startsWith('/api/'))return route.continue();
  20 |     const call={method:request.method(),path:url.pathname,body:request.postData()?request.postDataJSON():null};audit.calls.push(call);
  21 |     const ok=data=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({success:true,data})});
  22 |     if(url.pathname==='/api/auth/me')return ok(user);
  23 |     if(url.pathname==='/api/favorites'&&request.method()==='GET')return ok([]);
  24 |     if(url.pathname==='/api/intelligence/consent')return ok({hasDecision:true,analyticsEnabled:false,personalizationEnabled:false,retentionDays:90});
  25 |     if(url.pathname==='/api/agent/verified-history/privacy')return ok(privacy);
  26 |     if(url.pathname==='/api/agent/chat'&&request.method()==='POST'){
  27 |       const item=audit.active;assert.ok(item,'HTTP_WITHOUT_ACTIVE_CASE');assert.equal(call.body.message,item.message,'LOCKED_MESSAGE');
  28 |       assert.equal(call.body.conversation.action,audit.requests.length?'continue':'start');
  29 |       assert.equal(call.body.conversation.consentVersion,privacy.version);
  30 |       if(audit.requests.length){assert.equal(call.body.conversation.id,fixture.id);assert.equal(call.body.conversation.revision,audit.requests.length);}
  31 |       assert.match(call.body.conversation.requestId,/^[0-9a-f-]{36}$/i);assert.ok(!audit.requests.some(x=>x.body.conversation.requestId===call.body.conversation.requestId));
  32 |       audit.requests.push({...call,caseId:item.id});
  33 |       return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(item.response)});
  34 |     }
  35 |     audit.errors.push('UNEXPECTED_API:'+request.method()+':'+url.pathname);return route.abort();
  36 |   });
  37 |   await page.addInitScript(({user})=>{localStorage.setItem('travelgo_token','MOCK_ONLY_PLANNER_TOKEN');localStorage.setItem('travelgo_user',JSON.stringify(user));},{user});
  38 |   await page.goto('/assistant');await expect(page.getByRole('heading',{name:'Tr\u1ee3 l\u00fd AI',exact:true})).toBeVisible();
  39 |   await page.getByRole('button',{name:'D\u00f9ng G2 local/demo',exact:true}).click();
  40 |   await page.getByRole('button',{name:'\u0110\u1ed3ng \u00fd d\u00f9ng G2 local/demo',exact:true}).click();
  41 |   return audit;
  42 | }
  43 | test('MOCK_ONLY_BROWSER saved completed itinerary and both manual confirmations',async({page},info)=>{
  44 |   const audit=await setup(page),out=path.join(task,browserDir,info.project.name);fs.mkdirSync(out,{recursive:true});
  45 |   const ports={
  46 |     guards:{manifest:async()=>{for(const[f,h]of Object.entries(lock.hashes))assert.equal(hash(f),h);return true;},request:async item=>{assert.equal(audit.requests.length,fixture.cases.indexOf(item));return true;},session:async()=>true,authOwnership:async()=>true,toolSafety:async()=>true,nativeCap:async()=>true,quotaTtl:async()=>true,dbIsolation:async()=>true,runtimeSecurity:async()=>true},
  47 |     execute:async(item,ctx)=>ctx.agent(async()=>{
  48 |       audit.active=item;
  49 |       const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/agent/chat')&&r.request().method()==='POST');
  50 |       if(item.confirmation)await checks.clickConfirmation(page,item.confirmation);
  51 |       else{const input=page.getByLabel('Y\u00eau c\u1ea7u du l\u1ecbch c\u1ee7a b\u1ea1n');await input.fill(item.message);await page.getByRole('button',{name:'G\u1eedi y\u00eau c\u1ea7u',exact:true}).click();}
  52 |       const response=await responsePromise,body=await response.json();
  53 |       return{http:response.status(),body,result:body.data.result};
  54 |     }),
  55 |     checks:{response:async(item,o)=>{assert.equal(o.http,200);assert.deepEqual(o.body,item.response);return true;},rawExpected:async()=>true,sessionRevision:async(item,o)=>{assert.equal(o.body.data.conversation.revision,fixture.cases.indexOf(item)+1);return true;},toolExecution:async()=>true,dbMutation:async()=>true,runtimeSecurity:async()=>{assert.deepEqual(audit.errors,[]);return true;}},
  56 |     assertUi:async(item,o)=>{
  57 |       if(item.oracle){await checks.assertCompletedUi(page,o.result,expect);assert.equal(o.result.itinerary.daysCount,2);assert.equal(o.result.itinerary.nightsCount,1);assert.equal(o.result.itinerary.transportation,item.transport);await expect(page.getByTestId('agent-turn').last()).toContainText(item.message);}
  58 |       else{await expect(page.getByText('Agent \u0111ang y\u00eau c\u1ea7u b\u1ea1n x\u00e1c nh\u1eadn l\u1ea1i ph\u01b0\u01a1ng ti\u1ec7n.',{exact:true}).last()).toBeVisible();await checks.assertConfirmationControls(page);}
  59 |       assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  60 |       fs.writeFileSync(path.join(out,item.id+'.dom.txt'),await page.getByTestId('agent-turn').last().innerText(),{flag:'wx',encoding:'utf8'});
  61 |       if(item.id==='M-BASE'){
  62 |         const turn=page.getByTestId('agent-turn').last(),cost=turn.locator('section[aria-label="Chi ph\u00ed l\u1ecbch tr\u00ecnh"]');
  63 |         const show=async locator=>{await locator.evaluate(el=>el.scrollIntoView({block:'center'}));await page.evaluate(()=>window.scrollBy(0,-80));};
  64 |         const total=cost.getByText('3.500.000 \u20ab',{exact:true});await show(total);await expect(total).toBeInViewport();
  65 |         await page.screenshot({path:path.join(out,'completed-viewport.png')});await page.screenshot({path:path.join(out,'completed-full.png'),fullPage:true});
  66 |         for(const n of [1,2]){
  67 |           const title=turn.getByText(n===1?'Kh\u00e1m ph\u00e1 [TEST FIXTURE] Planner DN A02 - synthetic sightseeing':'Kh\u00e1m ph\u00e1 [TEST FIXTURE] Planner DN A01 - synthetic sightseeing',{exact:true});
  68 |           await show(title);await expect(title).toBeInViewport();await page.screenshot({path:path.join(out,'day-'+n+'.png')});
  69 |         }
  70 |         const warning=turn.getByText(o.result.warnings[0],{exact:true});await show(warning);await expect(warning).toBeInViewport();await page.screenshot({path:path.join(out,'warnings.png')});
  71 |       }
  72 |       if(item.id==='M-ASK-BIKE'){await page.getByRole('button',{name:checks.UI.motorbike,exact:true}).evaluate(el=>el.scrollIntoView({block:'center'}));await page.evaluate(()=>window.scrollBy(0,-80));await expect(page.getByRole('button',{name:checks.UI.motorbike,exact:true})).toBeInViewport();await page.screenshot({path:path.join(out,'confirmation-viewport.png')});await page.screenshot({path:path.join(out,'confirmation.png'),fullPage:true});}
  73 |       return true;
  74 |     },cleanupPrecondition:async()=>true,cleanup:async()=>true,dispose:async()=>{audit.active=null;},
  75 |   };
  76 |   const result=await runPlannerHarness({cases:fixture.cases,ports});
  77 |   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({tier:'MOCK_ONLY_BROWSER',result,audit,nativeHttp:0,database:false,guardNote:'DB/provider/ownership guards are MOCK ports; no LIVE claim.'},null,2)+'\n',{flag:'wx'});
> 78 |   expect(result.status).toBe('PASS');expect(result.exitCode).toBe(0);expect(audit.errors).toEqual([]);expect(audit.requests).toHaveLength(5);
     |                         ^ Error: expect(received).toBe(expected) // Object.is equality
  79 |   expect(audit.requests[2].body.message).toBe('Ph\u01b0\u01a1ng ti\u1ec7n: motorbike');expect(audit.requests[4].body.message).toBe('Ph\u01b0\u01a1ng ti\u1ec7n: car');
  80 |   for(const file of ['completed-viewport.png','completed-full.png','confirmation.png']){const bytes=fs.readFileSync(path.join(out,file));expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.readUInt32BE(16)).toBe(info.project.use.viewport.width);}
  81 | });
  82 | test('MOCK_ONLY_BROWSER corrupted and missing locator rejected immediately without dispatch',async({page},info)=>{
  83 |   const audit=await setup(page),started=performance.now();
  84 |   await expect(checks.clickConfirmation(page,'Xe m?y')).rejects.toThrow('UI_LITERAL_CORRUPT_BEFORE_LOCATOR');
  85 |   await expect(checks.clickConfirmation(page,'Xe m\u00e1y')).rejects.toThrow('UI_CONFIRMATION_BUTTON_MISSING');
  86 |   const elapsed=performance.now()-started;expect(elapsed).toBeLessThan(1000);expect(audit.requests).toHaveLength(0);expect(audit.errors).toEqual([]);
  87 |   const out=path.join(task,browserDir,info.project.name);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'locator-negative.json'),JSON.stringify({tier:'MOCK_ONLY_BROWSER',status:'PASS',elapsedMs:elapsed,agentRequests:0,timeout30Seconds:false,corruptionRejected:true,missingButtonRejected:true},null,2)+'\n',{flag:'wx'});
  88 | });
  89 | 
```