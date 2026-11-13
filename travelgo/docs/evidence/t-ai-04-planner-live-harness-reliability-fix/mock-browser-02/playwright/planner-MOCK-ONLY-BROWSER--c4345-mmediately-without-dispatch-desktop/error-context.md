# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: planner.spec.cjs >> MOCK_ONLY_BROWSER corrupted and missing locator rejected immediately without dispatch
- Location: docs\evidence\t-ai-04-planner-live-harness-reliability-fix\browser-tests\planner.spec.cjs:71:1

# Error details

```
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 3

- Array []
+ Array [
+   "UNEXPECTED_API:GET:/api/favorites",
+ ]
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
          - generic [ref=e34]: MOCK_ONLY Planner
        - link "Tạo lịch trình" [ref=e37] [cursor=pointer]:
          - /url: /tour-planner
  - main [ref=e40]:
    - generic [ref=e42]:
      - generic [ref=e43]:
        - generic [ref=e44]:
          - generic [ref=e45]: HuGo Travel
          - heading "Trợ lý AI" [level=1] [ref=e48]
          - paragraph [ref=e49]: Cùng bạn tìm địa điểm và phác thảo hành trình.
        - button "Đặt lại phiên G2" [ref=e50]
      - paragraph [ref=e52]: Hội thoại chỉ giữ trong phiên trang này. Tải lại trang, đăng xuất hoặc đổi tài khoản sẽ bắt đầu hội thoại mới.
      - generic [ref=e56]:
        - paragraph [ref=e57]: "Chế độ hiện tại: G2 · hội thoại local/demo"
        - generic [ref=e58]:
          - button "Kết thúc phiên G2" [ref=e59]
          - button "Trở về G1" [ref=e60]
          - link "Dùng Planner" [ref=e61] [cursor=pointer]:
            - /url: /tour-planner
        - paragraph [ref=e62]: Thông tin xác minh chỉ lưu trong RAM máy chủ, tối đa 15 phút; có thể mất khi máy chủ khởi động lại. Tải lại trang về G1, không khôi phục phiên cũ. Đăng xuất thử xóa phiên, không bảo đảm xóa khi mất mạng.
        - status [ref=e63]: G2 local/demo đã sẵn sàng. Phiên chỉ bắt đầu khi bạn gửi yêu cầu.
      - generic [ref=e64]:
        - region "Hội thoại" [ref=e65]:
          - generic [ref=e66]:
            - heading "Bạn muốn khám phá đâu?" [level=2] [ref=e70]
            - paragraph [ref=e71]: Hãy cho biết nơi xuất phát, điểm đến, ngày đi, số người, ngân sách và phương tiện. Trợ lý sẽ hỏi thêm nếu cần.
            - link "Hoặc tự tạo lịch trình với Planner" [ref=e72] [cursor=pointer]:
              - /url: /tour-planner
        - generic [ref=e73]:
          - generic [ref=e74]: Yêu cầu du lịch của bạn
          - textbox "Yêu cầu du lịch của bạn" [ref=e75]:
            - /placeholder: Nhập yêu cầu bằng tiếng Việt…
          - generic [ref=e76]:
            - paragraph [ref=e77]: 0/2000 · Shift+Enter xuống dòng
            - button "Gửi yêu cầu" [disabled] [ref=e78]
  - contentinfo [ref=e82]:
    - generic [ref=e83]:
      - generic [ref=e84]:
        - generic [ref=e85]:
          - link "HuGo Travel" [ref=e86] [cursor=pointer]:
            - /url: /
          - paragraph [ref=e92]: Hệ thống đặt vé và dịch vụ du lịch uy tín hàng đầu Việt Nam. Khám phá những chân trời mới và chia sẻ những khoảnh khắc đáng nhớ nhất cùng chúng tôi.
          - generic [ref=e93]:
            - link [ref=e94] [cursor=pointer]:
              - /url: "#"
            - link [ref=e97] [cursor=pointer]:
              - /url: "#"
            - link [ref=e101] [cursor=pointer]:
              - /url: "#"
        - generic [ref=e105]:
          - heading "Liên kết nhanh" [level=3] [ref=e106]
          - list [ref=e107]:
            - listitem [ref=e108]:
              - link "Bản đồ khám phá" [ref=e109] [cursor=pointer]:
                - /url: /explore
            - listitem [ref=e110]:
              - link "Đặt vé máy bay & tour" [ref=e111] [cursor=pointer]:
                - /url: /tickets
            - listitem [ref=e112]:
              - link "Khách sạn & Resort" [ref=e113] [cursor=pointer]:
                - /url: /hotels
            - listitem [ref=e114]:
              - link "Nhà hàng & Ẩm thực" [ref=e115] [cursor=pointer]:
                - /url: /restaurants
            - listitem [ref=e116]:
              - link "Cẩm nang du lịch" [ref=e117] [cursor=pointer]:
                - /url: /blog
        - generic [ref=e118]:
          - heading "Dịch vụ & Hỗ trợ" [level=3] [ref=e119]
          - list [ref=e120]:
            - listitem [ref=e121]:
              - link "Điều khoản dịch vụ" [ref=e122] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e123]:
              - link "Chính sách bảo mật" [ref=e124] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e125]:
              - link "Chính sách hoàn huỷ vé" [ref=e126] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e127]:
              - link "Câu hỏi thường gặp (FAQ)" [ref=e128] [cursor=pointer]:
                - /url: "#"
            - listitem [ref=e129]:
              - link "Cổng đối tác & Quản trị" [ref=e130] [cursor=pointer]:
                - /url: /admin
        - generic [ref=e131]:
          - heading "Liên hệ" [level=3] [ref=e132]
          - list [ref=e133]:
            - listitem [ref=e134]:
              - generic [ref=e138]: contact@hugotravel.com
            - listitem [ref=e139]:
              - generic [ref=e142]: 1900 1234 (24/7)
            - listitem [ref=e143]:
              - generic [ref=e147]: Tòa nhà Landmark 81, Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh
      - generic [ref=e148]:
        - paragraph [ref=e149]: © 2026 HuGo Travel. All rights reserved.
        - paragraph [ref=e150]: Xây dựng với mô hình MVC & Thuật toán Bayesian Average
  - button "Quyền riêng tư AI" [ref=e151]
```

# Test source

```ts
  1  | // Independent actual-frontend acceptance. No production code or route is replaced.
  2  | // HTTP API is mocked; fixtures are sealed before browser launch.
  3  | const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
  4  | const {test,expect}=require(path.resolve(__dirname,'../../../../frontend/node_modules/@playwright/test'));
  5  | const {runPlannerHarness}=require('../run-live.corrected.cjs');
  6  | const checks=require('../browser-checks.cjs');
  7  | const task=path.resolve(__dirname,'..'),fixture=JSON.parse(fs.readFileSync(path.join(task,'mock-browser-manifest.json'))),lock=JSON.parse(fs.readFileSync(path.join(task,'offline-input-lock.json')));
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
  23 |     if(url.pathname==='/api/intelligence/consent')return ok({hasDecision:true,analyticsEnabled:false,personalizationEnabled:false,retentionDays:90});
  24 |     if(url.pathname==='/api/agent/verified-history/privacy')return ok(privacy);
  25 |     if(url.pathname==='/api/agent/chat'&&request.method()==='POST'){
  26 |       const item=audit.active;assert.ok(item,'HTTP_WITHOUT_ACTIVE_CASE');assert.equal(call.body.message,item.message,'LOCKED_MESSAGE');
  27 |       assert.equal(call.body.conversation.action,audit.requests.length?'continue':'start');
  28 |       assert.equal(call.body.conversation.consentVersion,privacy.version);
  29 |       if(audit.requests.length){assert.equal(call.body.conversation.id,fixture.id);assert.equal(call.body.conversation.revision,audit.requests.length);}
  30 |       assert.match(call.body.conversation.requestId,/^[0-9a-f-]{36}$/i);assert.ok(!audit.requests.some(x=>x.body.conversation.requestId===call.body.conversation.requestId));
  31 |       audit.requests.push({...call,caseId:item.id});
  32 |       return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(item.response)});
  33 |     }
  34 |     audit.errors.push('UNEXPECTED_API:'+request.method()+':'+url.pathname);return route.abort();
  35 |   });
  36 |   await page.addInitScript(({user})=>{localStorage.setItem('travelgo_token','MOCK_ONLY_PLANNER_TOKEN');localStorage.setItem('travelgo_user',JSON.stringify(user));},{user});
  37 |   await page.goto('/assistant');await expect(page.getByRole('heading',{name:'Tr\u1ee3 l\u00fd AI',exact:true})).toBeVisible();
  38 |   await page.getByRole('button',{name:'D\u00f9ng G2 local/demo',exact:true}).click();
  39 |   await page.getByRole('button',{name:'\u0110\u1ed3ng \u00fd d\u00f9ng G2 local/demo',exact:true}).click();
  40 |   return audit;
  41 | }
  42 | test('MOCK_ONLY_BROWSER saved completed itinerary and both manual confirmations',async({page},info)=>{
  43 |   const audit=await setup(page),out=path.join(task,browserDir,info.project.name);fs.mkdirSync(out,{recursive:true});
  44 |   const ports={
  45 |     guards:{manifest:async()=>{for(const[f,h]of Object.entries(lock.hashes))assert.equal(hash(f),h);return true;},request:async item=>{assert.equal(audit.requests.length,fixture.cases.indexOf(item));return true;},session:async()=>true,authOwnership:async()=>true,toolSafety:async()=>true,nativeCap:async()=>true,quotaTtl:async()=>true,dbIsolation:async()=>true,runtimeSecurity:async()=>true},
  46 |     execute:async(item,ctx)=>ctx.agent(async()=>{
  47 |       audit.active=item;
  48 |       const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/agent/chat')&&r.request().method()==='POST');
  49 |       if(item.confirmation)await checks.clickConfirmation(page,item.confirmation);
  50 |       else{const input=page.getByLabel('Y\u00eau c\u1ea7u du l\u1ecbch c\u1ee7a b\u1ea1n');await input.fill(item.message);await page.getByRole('button',{name:'G\u1eedi y\u00eau c\u1ea7u',exact:true}).click();}
  51 |       const response=await responsePromise,body=await response.json();
  52 |       return{http:response.status(),body,result:body.data.result};
  53 |     }),
  54 |     checks:{response:async(item,o)=>{assert.equal(o.http,200);assert.deepEqual(o.body,item.response);return true;},rawExpected:async()=>true,sessionRevision:async(item,o)=>{assert.equal(o.body.data.conversation.revision,fixture.cases.indexOf(item)+1);return true;},toolExecution:async()=>true,dbMutation:async()=>true,runtimeSecurity:async()=>{assert.deepEqual(audit.errors,[]);return true;}},
  55 |     assertUi:async(item,o)=>{
  56 |       if(item.oracle){await checks.assertCompletedUi(page,o.result,expect);assert.equal(o.result.itinerary.daysCount,2);assert.equal(o.result.itinerary.nightsCount,1);assert.equal(o.result.itinerary.transportation,item.transport);await expect(page.getByTestId('agent-turn').last()).toContainText(item.message);}
  57 |       else{await expect(page.getByText('Agent \u0111ang y\u00eau c\u1ea7u b\u1ea1n x\u00e1c nh\u1eadn l\u1ea1i ph\u01b0\u01a1ng ti\u1ec7n.',{exact:true}).last()).toBeVisible();await checks.assertConfirmationControls(page);}
  58 |       assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  59 |       fs.writeFileSync(path.join(out,item.id+'.dom.txt'),await page.getByTestId('agent-turn').last().innerText(),{flag:'wx',encoding:'utf8'});
  60 |       if(item.id==='M-BASE'){await page.getByTestId('agent-turn').last().locator('section[aria-label="L\u1ecbch tr\u00ecnh \u0111\u1ec1 xu\u1ea5t"]').evaluate(el=>el.scrollIntoView({block:'start'}));await page.evaluate(()=>window.scrollBy(0,-100));await page.screenshot({path:path.join(out,'completed-viewport.png')});await page.screenshot({path:path.join(out,'completed-full.png'),fullPage:true});}
  61 |       if(item.id==='M-ASK-BIKE')await page.screenshot({path:path.join(out,'confirmation.png'),fullPage:true});
  62 |       return true;
  63 |     },cleanupPrecondition:async()=>true,cleanup:async()=>true,dispose:async()=>{audit.active=null;},
  64 |   };
  65 |   const result=await runPlannerHarness({cases:fixture.cases,ports});
  66 |   fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({tier:'MOCK_ONLY_BROWSER',result,audit,nativeHttp:0,database:false,guardNote:'DB/provider/ownership guards are MOCK ports; no LIVE claim.'},null,2)+'\n',{flag:'wx'});
  67 |   expect(result.status).toBe('PASS');expect(result.exitCode).toBe(0);expect(audit.errors).toEqual([]);expect(audit.requests).toHaveLength(5);
  68 |   expect(audit.requests[2].body.message).toBe('Ph\u01b0\u01a1ng ti\u1ec7n: motorbike');expect(audit.requests[4].body.message).toBe('Ph\u01b0\u01a1ng ti\u1ec7n: car');
  69 |   for(const file of ['completed-viewport.png','completed-full.png','confirmation.png']){const bytes=fs.readFileSync(path.join(out,file));expect(bytes.subarray(1,4).toString()).toBe('PNG');expect(bytes.readUInt32BE(16)).toBe(info.project.use.viewport.width);}
  70 | });
  71 | test('MOCK_ONLY_BROWSER corrupted and missing locator rejected immediately without dispatch',async({page},info)=>{
  72 |   const audit=await setup(page),started=performance.now();
  73 |   await expect(checks.clickConfirmation(page,'Xe m?y')).rejects.toThrow('UI_LITERAL_CORRUPT_BEFORE_LOCATOR');
  74 |   await expect(checks.clickConfirmation(page,'Xe m\u00e1y')).rejects.toThrow('UI_CONFIRMATION_BUTTON_MISSING');
> 75 |   const elapsed=performance.now()-started;expect(elapsed).toBeLessThan(1000);expect(audit.requests).toHaveLength(0);expect(audit.errors).toEqual([]);
     |                                                                                                                                          ^ Error: expect(received).toEqual(expected) // deep equality
  76 |   const out=path.join(task,browserDir,info.project.name);fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'locator-negative.json'),JSON.stringify({tier:'MOCK_ONLY_BROWSER',status:'PASS',elapsedMs:elapsed,agentRequests:0,timeout30Seconds:false,corruptionRejected:true,missingButtonRejected:true},null,2)+'\n',{flag:'wx'});
  77 | });
  78 | 
```