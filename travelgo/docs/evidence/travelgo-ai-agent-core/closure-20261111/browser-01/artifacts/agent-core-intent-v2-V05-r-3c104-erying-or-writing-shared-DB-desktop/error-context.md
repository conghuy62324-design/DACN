# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: agent-core-intent-v2.spec.ts >> V05 real staging guard blocks confirmed preview without querying or writing shared DB
- Location: e2e\agent-core-intent-v2.spec.ts:32:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator:  getByLabel('Yêu cầu Core', { exact: true })
Expected: ""
Received: "Lập lịch trình; Nơi xuất phát: Huế; Điểm đến: Đà Nẵng; Ngày bắt đầu: 2036-04-22; Ngày kết thúc: 2036-04-24; Số người lớn: 2; Ngân sách cả nhóm: 6400000 VND; Phương tiện: ô tô"
Timeout:  5000ms

Call log:
  - Expect "toHaveValue" getByLabel('Yêu cầu Core', { exact: true }) with timeout 5000ms
  - waiting for getByLabel('Yêu cầu Core', { exact: true })
    14 × locator resolved to <textarea rows="4" maxlength="2000" id="core-message" class="w-full rounded border p-3" placeholder="Tìm khách sạn ở Đà Nẵng; hoặc lập lịch trình với nơi đi/đến, ngày, số người, ngân sách và phương tiện…">Lập lịch trình; Nơi xuất phát: Huế; Điểm đến: Đà …</textarea>
       - unexpected value "Lập lịch trình; Nơi xuất phát: Huế; Điểm đến: Đà Nẵng; Ngày bắt đầu: 2036-04-22; Ngày kết thúc: 2036-04-24; Số người lớn: 2; Ngân sách cả nhóm: 6400000 VND; Phương tiện: ô tô"

```

```yaml
- textbox "Yêu cầu Core":
  - /placeholder: Tìm khách sạn ở Đà Nẵng; hoặc lập lịch trình với nơi đi/đến, ngày, số người, ngân sách và phương tiện…
  - text: "Lập lịch trình; Nơi xuất phát: Huế; Điểm đến: Đà Nẵng; Ngày bắt đầu: 2036-04-22; Ngày kết thúc: 2036-04-24; Số người lớn: 2; Ngân sách cả nhóm: 6400000 VND; Phương tiện: ô tô"
```

# Test source

```ts
  1  | // Real browser + real HTTP/Core/Planner. Catalog, model, auth/me and Trip persistence are test doubles.
  2  | import {test,expect,type Page} from '@playwright/test';
  3  | import {createRequire} from 'node:module';
  4  | import {createServer} from 'node:http';
  5  | import fs from 'node:fs';
  6  | import path from 'node:path';
  7  | const require=createRequire(import.meta.url),root=path.resolve('..');
  8  | const express=require(path.join(root,'backend/node_modules/express'));
  9  | const {AgentCoreService}=require(path.join(root,'backend/dist/services/agentCoreService.js'));
  10 | const {RegisteredCatalogService}=require(path.join(root,'backend/dist/services/registeredCatalogService.js'));
  11 | const {AgentLimits}=require(path.join(root,'backend/dist/agent/limits.js'));
  12 | const {createAgentCoreRouter}=require(path.join(root,'backend/dist/routes/agentCoreRoutes.js'));
  13 | const {signAccessToken}=require(path.join(root,'backend/dist/services/tokenService.js'));
  14 | const fixture=JSON.parse(fs.readFileSync(path.join(root,'backend/src/evaluation/t11b_scenarios_v3.json'),'utf8'));
  15 | const user={id:'f6666666-6666-4666-8666-666666666666',email:'browser-closure@example.test',fullName:'MOCK_ONLY Core closure',roles:['CUSTOMER']};
  16 | const full='Lập lịch trình; Nơi xuất phát: Huế; Điểm đến: Đà Nẵng; Ngày bắt đầu: 2036-04-22; Ngày kết thúc: 2036-04-24; Số người lớn: 2; Ngân sách cả nhóm: 6400000 VND; Phương tiện: ô tô';
  17 | async function setup(page:Page,raw:any={kind:'core',name:'plan_trip'}){
  18 |  const token=signAccessToken(user),e:any={requests:[],responses:[],modelCalls:0,catalogCalls:0,tripWrites:0,unexpected:[],errors:[]};
  19 |  const catalog=new RegisteredCatalogService(async()=>{e.catalogCalls++;return structuredClone(fixture.catalog);});
  20 |  const svc=new AgentCoreService({catalog,limits:new AgentLimits(20,1),provider:{configured:true,generate:async()=>{e.modelCalls++;return raw;}},trips:{getTripById:async()=>null,createTripFromPlanner:async()=>{e.tripWrites++;throw Error('FORBIDDEN');},updateTrip:async()=>{e.tripWrites++;throw Error('FORBIDDEN');}}});
  21 |  const app=express();app.use(express.json());app.use('/api/agent/core',createAgentCoreRouter(svc));const server=createServer(app);await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));e.base='http://127.0.0.1:'+(server.address() as any).port;e.close=async()=>{svc.dispose();await new Promise<void>(r=>server.close(()=>r()));};(page as any).closure=e;
  22 |  page.on('pageerror',x=>e.errors.push(String(x)));await page.addInitScript(({token,user})=>{localStorage.setItem('travelgo_token',token);localStorage.setItem('travelgo_user',JSON.stringify(user));},{token,user});
  23 |  await page.route('**/*',async r=>{const q=r.request(),url=new URL(q.url());if(url.hostname!=='127.0.0.1'||url.port!=='3352')return r.abort();if(!url.pathname.startsWith('/api/'))return r.continue();if(url.pathname.startsWith('/api/agent/core/')){const body=q.postData()?q.postDataJSON():undefined;e.requests.push({path:url.pathname,method:q.method(),body});const headers:any={'Content-Type':'application/json',Authorization:q.headers().authorization||''};const response=await fetch(e.base+url.pathname,{method:q.method(),headers,...(q.postData()?{body:q.postData()!}:{})}),data=await response.text();e.responses.push(JSON.parse(data));return r.fulfill({status:response.status,contentType:'application/json',body:data});}if(q.method()!=='GET'){e.unexpected.push(url.pathname);return r.abort();}return r.fulfill({contentType:'application/json',body:JSON.stringify({success:true,data:url.pathname==='/api/auth/me'?user:url.pathname==='/api/intelligence/consent'?{hasDecision:true,analyticsEnabled:false,personalizationEnabled:false}:[]})});});
  24 |  await page.goto('/assistant');await page.getByRole('button',{name:'Catalog và Trip · Core',exact:true}).click();await expect(page.getByRole('checkbox',{name:'Đồng ý giữ slots và bản Planner tạm tối đa 15 phút.'})).toBeVisible();await page.getByRole('checkbox',{name:'Đồng ý giữ slots và bản Planner tạm tối đa 15 phút.'}).check();return e;
  25 | }
> 26 | async function send(page:Page,message:string){await page.getByLabel('Yêu cầu Core',{exact:true}).fill(message);await page.getByRole('button',{name:'Gửi yêu cầu Core',exact:true}).click();await expect(page.getByLabel('Yêu cầu Core',{exact:true})).toHaveValue('');}
     |                                                                                                                                                                                                                                                       ^ Error: expect(locator).toHaveValue(expected) failed
  27 | test.afterEach(async({page},info)=>{const e=(page as any).closure;if(!e)return;try{expect(e.errors).toEqual([]);expect(e.unexpected).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);const d=path.join(process.env.CORE_BROWSER_EVIDENCE!,info.project.name);fs.mkdirSync(d,{recursive:true});await page.screenshot({path:path.join(d,info.title.split(' ')[0]+'.png'),fullPage:true});fs.writeFileSync(path.join(d,info.title.split(' ')[0]+'.json'),JSON.stringify({tier:'BROWSER_REAL_CORE_HTTP_REAL_PLANNER_IN_MEMORY_CATALOG_MODEL_TRIP_DOUBLES',status:info.status,requests:e.requests,responses:e.responses,modelCalls:e.modelCalls,catalogCalls:e.catalogCalls,tripWrites:e.tripWrites,actualDB:0,actualModel:0},null,2),{flag:'wx'});}finally{await e.close();}});
  28 | test('V01 transport correction works through real Core/Planner without model re-decision',async({page})=>{const e=await setup(page,{kind:'core',name:'compare_travel_options'});await send(page,full);await send(page,'Đổi phương tiện sang xe máy, giữ các thông tin còn lại.');const r=e.responses.filter((r:any)=>r.data?.result?.itinerary).at(-1).data;expect(r.result.itinerary.transportation).toBe('motorbike');expect(r.result.itinerary.totalBudgetUserVND).toBe(6400000);expect(r.intent.authority).toBe('SERVER_VERIFIED');expect(e.modelCalls).toBe(0);expect(e.requests.filter((x:any)=>x.path.endsWith('/chat')).every((x:any)=>x.body.intentVersion==='CORE_INTENT_V2')).toBe(true);await expect(page.getByRole('region',{name:'Lịch trình đề xuất'}).last()).toBeVisible();});
  29 | test('V02 decrease budget and subtract day preserve other verified data',async({page})=>{const e=await setup(page);await send(page,full);await send(page,'Giảm ngân sách xuống 5 triệu.');await send(page,'Bớt một ngày.');const p=e.responses.filter((r:any)=>r.data?.result?.itinerary).at(-1).data.result.itinerary;expect(p.totalBudgetUserVND).toBe(5000000);expect(p.endDate).toBe('2036-04-23');expect(p.nightsCount).toBe(1);expect(p.adults).toBe(2);expect(e.modelCalls).toBe(0);});
  30 | test('V03 complex request suggests action and waits for explicit click before replanning',async({page})=>{const e=await setup(page);await send(page,full);const before=e.catalogCalls;await send(page,'Tư vấn một chuyến đi linh hoạt theo thời tiết.');await expect(page.getByRole('button',{name:'Xác nhận tác vụ: Lập lại lịch trình',exact:true})).toBeVisible();expect(e.catalogCalls).toBe(before);expect(e.modelCalls).toBe(1);await page.getByRole('button',{name:'Xác nhận tác vụ: Lập lại lịch trình',exact:true}).click();await expect.poll(()=>e.catalogCalls).toBeGreaterThan(before);expect(e.modelCalls).toBe(1);const p=e.responses.filter((r:any)=>r.data?.result?.itinerary).at(-1).data.result.itinerary;expect(p.departureCity).toBe('Huế');expect(p.transportation).toBe('car');});
  31 | test('V04 invalid model suggestion is safely rejected without tool or retry',async({page})=>{const e=await setup(page,{kind:'core',name:'execute_sql',sql:'RAW_SECRET_CANARY'});await page.getByLabel('Yêu cầu Core',{exact:true}).fill('Tư vấn theo thời tiết.');await page.getByRole('button',{name:'Gửi yêu cầu Core',exact:true}).click();await expect(page.getByRole('alert')).toBeVisible();await expect(page.locator('body')).not.toContainText('RAW_SECRET_CANARY');expect(e.modelCalls).toBe(1);expect(e.catalogCalls).toBe(0);expect(e.requests.filter((x:any)=>x.path.endsWith('/chat'))).toHaveLength(1);});
  32 | test('V05 real staging guard blocks confirmed preview without querying or writing shared DB',async({page})=>{const e=await setup(page);await send(page,full);await send(page,'Lưu Trip');const button=page.getByRole('button',{name:'Xác nhận lưu Trip Core',exact:true});await expect(button).toBeDisabled();await page.getByRole('checkbox',{name:'Tôi đã xem lịch trình/chi phí và đồng ý ghi Trip này.'}).check();await button.click();await expect(page.getByRole('alert')).toBeVisible();expect(e.tripWrites).toBe(0);expect(e.responses.at(-1).code).toBe('AGENT_STAGING_WRITE_BLOCKED');expect(e.requests.filter((x:any)=>x.path.endsWith('/confirm'))).toHaveLength(1);});
  33 | test('V06 Booking server price preview opens existing modal without auto-booking',async({page})=>{const e=await setup(page);await send(page,full);await send(page,'Tìm khách sạn ở Đà Nẵng');await page.getByRole('button',{name:'Xem Booking',exact:true}).click();await expect(page.getByRole('button',{name:'Mở màn hình xác nhận Booking',exact:true})).toBeVisible();const price=e.responses.filter((r:any)=>r.data?.result?.type==='booking_preview').at(-1).data.result.pricing;expect(price.unitPrice).toBe(600000);expect(price.totalAmount).toBe(1200000);await page.getByRole('button',{name:'Mở màn hình xác nhận Booking',exact:true}).click();await expect(page.getByRole('dialog',{name:'Đặt dịch vụ',exact:true})).toBeVisible();expect(e.tripWrites).toBe(0);expect(e.unexpected).toEqual([]);});
  34 | 
```