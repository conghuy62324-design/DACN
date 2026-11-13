# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t13b01-rbac-onboarding.spec.ts >> A04 rejection needs-info reasons and later decision
- Location: e2e\t13b01-rbac-onboarding.spec.ts:239:1

# Error details

```
Error: REJECT_UI: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'T13B01 SYNTHETIC mobile A04-REJECT 1af49005', exact: true })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('heading', { name: 'T13B01 SYNTHETIC mobile A04-REJECT 1af49005', exact: true }) with timeout 10000ms
  - waiting for getByRole('heading', { name: 'T13B01 SYNTHETIC mobile A04-REJECT 1af49005', exact: true })


expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { createRequire } from 'node:module';
  3   | import { createHash, randomBytes, randomUUID } from 'node:crypto';
  4   | import fs from 'node:fs';
  5   | import path from 'node:path';
  6   | import os from 'node:os';
  7   | import { spawnSync } from 'node:child_process';
  8   | const require = createRequire(path.resolve('../backend/package.json'));
  9   | const { Fixtures, guard, schema, models, sequelize, write } = require('../backend/scripts/t13b01-support.cjs');
  10  | const { User, UserRole, PartnerApplication, BusinessMember, Business, AuditLog } = models;
  11  | let fixtures: any, info: TestInfo, checkpoints: any[], traffic: any[], consoleLog: any[], images: string[], sensitiveValues: Set<string>;
  12  | const root = process.env.T13B01_EVIDENCE!;
  13  | const out = () => path.join(root, info.project.name);
  14  | const caseId = () => info.title.split(' ')[0];
  15  | const isApi = () => info.project.name === 'desktop';
  16  | function redact(value: any): any {
  17  |   if (Array.isArray(value)) return value.map(redact);
  18  |   if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,v]) => [key,/token|password|authorization|secret/i.test(key) ? '[REDACTED]' : redact(v)]));
  19  |   return value;
  20  | }
  21  | async function step(id: string, expected: string, fn: () => Promise<any>) {
  22  |   const record: any = { id, expected, startedAt: new Date().toISOString(), status: 'NOT RUN' }; checkpoints.push(record);
  23  |   try { const value = await test.step(id, fn); record.status = 'PASS'; if(value !== undefined)record.actual = redact(value); return value; }
  24  |   catch(e: any) { record.status = 'FAIL'; record.actual = e.message; throw e; }
  25  |   finally { record.finishedAt = new Date().toISOString(); }
  26  | }
  27  | async function independentStep(page:Page,id:string,expected:string,fn:()=>Promise<any>) {
> 28  |   try {return await step(id,expected,fn);}catch(e:any){await photo(page,`${id.toLowerCase()}-failure`);expect.soft(false,`${id}: ${e.message}`).toBe(true);}
      |                                                                                                                                                 ^ Error: REJECT_UI: expect(locator).toBeVisible() failed
  29  | }
  30  | async function api(page: Page, method: string, endpoint: string, body?: any, token?: string | null) {
  31  |   if(token)sensitiveValues.add(token);if(body?.password)sensitiveValues.add(body.password);
  32  |   const result = await page.evaluate(async ({ method,endpoint,body,token }) => {
  33  |     const auth = token === undefined ? localStorage.getItem('travelgo_token') : token;
  34  |     const response = await fetch('/api'+endpoint, {method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  35  |     return {status:response.status,body:await response.json()};
  36  |   }, {method,endpoint,body,token});
  37  |   if(result.body.data?.token)sensitiveValues.add(result.body.data.token);
  38  |   traffic.push({channel:'browser fetch → Vite proxy → real API',method,endpoint,request:redact(body),response:redact(result)});return result;
  39  | }
  40  | function response(page: Page, endpoint: string, method: string) {
  41  |   return page.waitForResponse(r => new URL(r.url()).pathname === '/api'+endpoint && r.request().method()===method);
  42  | }
  43  | async function photo(page: Page, label: string) {
  44  |   const prefix=`${caseId()}-${label}`;
  45  |   const mask=page.locator('tbody tr').filter({hasNot:page.getByText(/T13B01 SYNTHETIC/)});
  46  |   for(const fullPage of [false,true]) { const name=`${prefix}${fullPage?'-full':''}.png`;await page.screenshot({path:path.join(out(),name),fullPage,mask:[mask]});images.push(name); }
  47  |   const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  48  |   expect.soft(size.scrollWidth,`${prefix} document overflow`).toBeLessThanOrEqual(size.width+1);
  49  |   checkpoints.push({id:`LAYOUT_${label}`,expected:'No document horizontal overflow; table may scroll within container',actual:size,status:size.scrollWidth<=size.width+1?'PASS':'FAIL'});
  50  | }
  51  | async function decline(page: Page) {
  52  |   const button=page.getByTestId('telemetry-decline');
  53  |   if(await button.waitFor({state:'visible',timeout:800}).then(()=>true).catch(()=>false)){const wait=response(page,'/intelligence/consent','PUT');await button.click();expect((await wait).status()).toBe(200);}
  54  | }
  55  | async function register(page: Page,label:string,extra:any={}) {
  56  |   await guard('T13-B-01 register fixture');const email=fixtures.plan(label),password=randomBytes(20).toString('base64url')+'1a';
  57  |   const fullName=`T13B01 ${info.project.name} ${label}`;
  58  |   const result=await api(page,'POST','/auth/register',{fullName,email,password,phone:'0901234567',...extra},null);
  59  |   expect(result.status).toBe(201);await fixtures.discover();return {...result.body.data,email,password,fullName};
  60  | }
  61  | async function login(page: Page,person:any) {
  62  |   // Clear only this isolated test context as setup. R05 separately exercises the real logout control.
  63  |   await page.evaluate(()=>{localStorage.removeItem('travelgo_token');localStorage.removeItem('travelgo_user');});
  64  |   await page.goto('/login');await page.locator('[name=email]').fill(person.email);await page.locator('[name=password]').fill(person.password);
  65  |   const wait=response(page,'/auth/login','POST');await page.getByRole('button',{name:'Đăng nhập ngay',exact:true}).click();
  66  |   const result=await wait;expect(result.status()).toBe(200);const session=(await result.json()).data;sensitiveValues.add(session.token);sensitiveValues.add(person.password);
  67  |   await expect.poll(()=>page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBe(session.token);
  68  |   await expect(page).not.toHaveURL(/\/login$/);return session;
  69  | }
  70  | async function logoutUI(page:Page) {
  71  |   if(/\/(admin|partner)(\/|$)/.test(new URL(page.url()).pathname)) {
  72  |     if(info.project.name==='mobile')await page.getByRole('button',{name:'Mở menu',exact:true}).click();
  73  |     await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  74  |   } else {
  75  |     await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();
  76  |     await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  77  |   }
  78  |   await expect.poll(()=>page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBeNull();
  79  | }
  80  | async function admin(page:Page,label:string) {
  81  |   const person=await register(page,label);await fixtures.promoteAdmin(person.user.id);
  82  |   const result=await api(page,'POST','/auth/login',{email:person.email,password:person.password},null);expect(result.status).toBe(200);
  83  |   expect(result.body.data.user.roles).toEqual(['SUPER_ADMIN']);return {...person,...result.body.data};
  84  | }
  85  | function application(person:any,label:string) {
  86  |   return {representativeName:person.fullName,businessName:`T13B01 SYNTHETIC ${info.project.name} ${label} ${randomUUID().slice(0,8)}`,businessType:'HOTEL',email:person.email,phone:'0901234567',address:'SYNTHETIC TEST ONLY - no real business',city:`T13B01-${process.env.T13B01_RUN_ID}-${info.project.name}`,latitude:16.05,longitude:108.20,verificationDetails:{taxCode:'SYNTHETIC TEST ONLY'}};
  87  | }
  88  | async function submitApi(page:Page,person:any,label:string) {
  89  |   const payload=application(person,label);const result=await api(page,'POST','/partner-applications',payload,person.token);expect(result.status).toBe(201);await fixtures.discover();return {app:result.body.data,payload};
  90  | }
  91  | async function decisionApi(page:Page,sa:any,id:string,status:string,reason?:string) {
  92  |   const result=await api(page,'PATCH',`/admin/partners/${id}/approval`,{status,...(reason?{reason}:{})},sa.token);await fixtures.discover();return result;
  93  | }
  94  | async function partner(page:Page,sa:any,label:string) {
  95  |   const person=await register(page,label);const {app}=await submitApi(page,person,label);expect((await decisionApi(page,sa,app.id,'APPROVED')).status).toBe(200);
  96  |   const session=await api(page,'POST','/auth/login',{email:person.email,password:person.password},null);return {...person,...session.body.data};
  97  | }
  98  | async function form(page:Page,payload:any) {
  99  |   await page.goto('/become-partner');await decline(page);
  100 |   for(const [key,label] of Object.entries({representativeName:'Họ tên người đại diện',businessName:'Tên cơ sở kinh doanh',email:'Email liên hệ',phone:'Số điện thoại',city:'Tỉnh / thành phố',address:'Địa chỉ cơ sở'}))await page.getByLabel(label,{exact:true}).fill(payload[key]);
  101 |   await page.getByLabel('Mã số thuế / thông tin xác minh',{exact:true}).fill('SYNTHETIC TEST ONLY');
  102 |   // The wrapping label includes option text; scope the existing single form select.
  103 |   await page.locator('form select').selectOption(payload.businessType);
  104 |   await page.getByPlaceholder('Vĩ độ',{exact:true}).fill(String(payload.latitude));await page.getByPlaceholder('Kinh độ',{exact:true}).fill(String(payload.longitude));
  105 | }
  106 | async function submitUI(page:Page,payload:any,status=201) {
  107 |   const wait=response(page,'/partner-applications','POST');await page.getByRole('button',{name:'Gửi hồ sơ xét duyệt',exact:true}).click();const result=await wait;expect(result.status()).toBe(status);
  108 |   const body=await result.json();traffic.push({channel:'UI form → real API',method:'POST',endpoint:'/partner-applications',request:redact(result.request().postDataJSON()),response:{status:result.status(),body:redact(body)}});
  109 |   await fixtures.discover();return body.data;
  110 | }
  111 | async function openApplications(page:Page,sa:any) {await login(page,sa);await page.goto('/admin/partner-applications');await expect(page.getByRole('heading',{name:'Duyệt hồ sơ đối tác',exact:true})).toBeVisible();}
  112 | function appRow(page:Page,name:string) {return page.getByRole('row').filter({has:page.getByText(name,{exact:true})});}
  113 | async function decisionUI(page:Page,app:any,status:string,reason?:string,cancel?:'prompt'|'confirm') {
  114 |   const row=appRow(page,app.businessName);await expect(row).toBeVisible();const dialogs:string[]=[];
  115 |   const handler=async(dialog:any)=>{dialogs.push(dialog.type());if((cancel==='prompt'&&dialog.type()==='prompt')||(cancel==='confirm'&&dialog.type()==='confirm'))await dialog.dismiss();else if(dialog.type()==='prompt')await dialog.accept(reason);else await dialog.accept();};
  116 |   page.on('dialog',handler);const wait=cancel?null:response(page,`/admin/partners/${app.id}/approval`,'PATCH');
  117 |   try {const button=status==='APPROVED'?row.getByTitle('Phê duyệt',{exact:true}):status==='REJECTED'?row.getByTitle('Từ chối',{exact:true}):row.getByRole('button',{name:'Bổ sung',exact:true});await button.click();
  118 |     if(wait){const result=await wait;expect(result.status()).toBe(200);traffic.push({channel:'UI decision → real API',method:'PATCH',endpoint:`/admin/partners/${app.id}/approval`,request:redact(result.request().postDataJSON()),response:{status:result.status(),body:redact(await result.json())}});await expect(appRow(page,app.businessName)).toContainText(status);}
  119 |   }finally{page.off('dialog',handler);}await fixtures.discover();return dialogs;
  120 | }
  121 | async function assertDecision(appId:string,userId:string,actor:string,status:string,expectedAudit:number) {
  122 |   const app=await PartnerApplication.findByPk(appId);expect(app.status).toBe(status);expect(app.reviewedBy).toBe(actor);expect(app.reviewedAt).toBeTruthy();
  123 |   const audits=await AuditLog.findAll({where:{entityType:'PartnerApplication',entityId:appId},order:[['createdAt','ASC']]});expect(audits).toHaveLength(expectedAudit);
  124 |   expect(audits.at(-1).actorUserId).toBe(actor);expect(audits.at(-1).newData.status).toBe(status);
  125 |   const grants=await UserRole.findAll({where:{userId,role:'PARTNER'}});const members=await BusinessMember.findAll({where:{userId}});
  126 |   if(status==='APPROVED') {expect(grants).toHaveLength(1);expect(grants[0].grantedBy).toBe(actor);expect(members).toHaveLength(1);expect(members[0].permissions.slice().sort()).toEqual(['MANAGE_BOOKINGS','MANAGE_BUSINESS']);const business=await Business.findByPk(members[0].businessId);expect(business.status).toBe('ACTIVE');expect(business.name).toBe(app.businessName);expect(audits.at(-1).newData.businessId).toBe(business.id);}
  127 |   else {expect(grants).toHaveLength(0);expect(members).toHaveLength(0);expect(await Business.count({where:{name:app.businessName}})).toBe(0);}
  128 |   return {application:app.toJSON(),grants:grants.map((v:any)=>v.toJSON()),members:members.map((v:any)=>v.toJSON()),audit:audits.map((v:any)=>v.toJSON())};
```