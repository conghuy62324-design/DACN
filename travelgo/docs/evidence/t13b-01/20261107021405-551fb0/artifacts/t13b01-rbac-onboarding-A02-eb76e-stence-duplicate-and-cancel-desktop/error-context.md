# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t13b01-rbac-onboarding.spec.ts >> A02 application validation persistence duplicate and cancel
- Location: e2e\t13b01-rbac-onboarding.spec.ts:187:1

# Error details

```
Test timeout of 120000ms exceeded.
```

```
Error: locator.selectOption: Test timeout of 120000ms exceeded.
Call log:
  - waiting for getByLabel('Loại hình kinh doanh', { exact: true })

```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from '@playwright/test';
  2   | import { createRequire } from 'node:module';
  3   | import { createHash, randomBytes, randomUUID } from 'node:crypto';
  4   | import fs from 'node:fs';
  5   | import path from 'node:path';
  6   | const require = createRequire(path.resolve('../backend/package.json'));
  7   | const { Fixtures, guard, schema, models, sequelize, write } = require('../backend/scripts/t13b01-support.cjs');
  8   | const { User, UserRole, PartnerApplication, BusinessMember, Business, AuditLog } = models;
  9   | let fixtures: any, info: TestInfo, checkpoints: any[], traffic: any[], consoleLog: any[], images: string[];
  10  | const root = process.env.T13B01_EVIDENCE!;
  11  | const out = () => path.join(root, info.project.name);
  12  | const caseId = () => info.title.split(' ')[0];
  13  | const isApi = () => info.project.name === 'desktop';
  14  | function redact(value: any): any {
  15  |   if (Array.isArray(value)) return value.map(redact);
  16  |   if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,v]) => [key,/token|password|authorization|secret/i.test(key) ? '[REDACTED]' : redact(v)]));
  17  |   return value;
  18  | }
  19  | async function step(id: string, expected: string, fn: () => Promise<any>) {
  20  |   const record: any = { id, expected, startedAt: new Date().toISOString(), status: 'NOT RUN' }; checkpoints.push(record);
  21  |   try { const value = await test.step(id, fn); record.status = 'PASS'; if(value !== undefined)record.actual = redact(value); return value; }
  22  |   catch(e: any) { record.status = 'FAIL'; record.actual = e.message; throw e; }
  23  |   finally { record.finishedAt = new Date().toISOString(); }
  24  | }
  25  | async function independentStep(page:Page,id:string,expected:string,fn:()=>Promise<any>) {
  26  |   try {return await step(id,expected,fn);}catch(e:any){await photo(page,`${id.toLowerCase()}-failure`);expect.soft(false,`${id}: ${e.message}`).toBe(true);}
  27  | }
  28  | async function api(page: Page, method: string, endpoint: string, body?: any, token?: string | null) {
  29  |   const result = await page.evaluate(async ({ method,endpoint,body,token }) => {
  30  |     const auth = token === undefined ? localStorage.getItem('travelgo_token') : token;
  31  |     const response = await fetch('/api'+endpoint, {method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  32  |     return {status:response.status,body:await response.json()};
  33  |   }, {method,endpoint,body,token});
  34  |   traffic.push({channel:'browser fetch → Vite proxy → real API',method,endpoint,request:redact(body),response:redact(result)});return result;
  35  | }
  36  | function response(page: Page, endpoint: string, method: string) {
  37  |   return page.waitForResponse(r => new URL(r.url()).pathname === '/api'+endpoint && r.request().method()===method);
  38  | }
  39  | async function photo(page: Page, label: string) {
  40  |   const prefix=`${caseId()}-${label}`;
  41  |   const mask=page.locator('tbody tr').filter({hasNot:page.getByText(/T13B01 SYNTHETIC/)});
  42  |   for(const fullPage of [false,true]) { const name=`${prefix}${fullPage?'-full':''}.png`;await page.screenshot({path:path.join(out(),name),fullPage,mask:[mask]});images.push(name); }
  43  |   const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  44  |   expect.soft(size.scrollWidth,`${prefix} document overflow`).toBeLessThanOrEqual(size.width+1);
  45  |   checkpoints.push({id:`LAYOUT_${label}`,expected:'No document horizontal overflow; table may scroll within container',actual:size,status:size.scrollWidth<=size.width+1?'PASS':'FAIL'});
  46  | }
  47  | async function decline(page: Page) {
  48  |   const button=page.getByTestId('telemetry-decline');
  49  |   if(await button.waitFor({state:'visible',timeout:800}).then(()=>true).catch(()=>false)){const wait=response(page,'/intelligence/consent','PUT');await button.click();expect((await wait).status()).toBe(200);}
  50  | }
  51  | async function register(page: Page,label:string,extra:any={}) {
  52  |   await guard('T13-B-01 register fixture');const email=fixtures.plan(label),password=randomBytes(20).toString('base64url')+'1a';
  53  |   const fullName=`T13B01 ${info.project.name} ${label}`;
  54  |   const result=await api(page,'POST','/auth/register',{fullName,email,password,phone:'0901234567',...extra},null);
  55  |   expect(result.status).toBe(201);await fixtures.discover();return {...result.body.data,email,password,fullName};
  56  | }
  57  | async function login(page: Page,person:any) {
  58  |   // Clear only this isolated test context as setup. R05 separately exercises the real logout control.
  59  |   await page.evaluate(()=>{localStorage.removeItem('travelgo_token');localStorage.removeItem('travelgo_user');});
  60  |   await page.goto('/login');await page.locator('[name=email]').fill(person.email);await page.locator('[name=password]').fill(person.password);
  61  |   const wait=response(page,'/auth/login','POST');await page.getByRole('button',{name:'Đăng nhập ngay',exact:true}).click();
  62  |   const result=await wait;expect(result.status()).toBe(200);const session=(await result.json()).data;
  63  |   await expect.poll(()=>page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBe(session.token);
  64  |   await expect(page).not.toHaveURL(/\/login$/);return session;
  65  | }
  66  | async function logoutUI(page:Page) {
  67  |   if(/\/(admin|partner)(\/|$)/.test(new URL(page.url()).pathname)) {
  68  |     if(info.project.name==='mobile')await page.getByRole('button',{name:'Mở menu',exact:true}).click();
  69  |     await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  70  |   } else {
  71  |     await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();
  72  |     await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  73  |   }
  74  |   await expect.poll(()=>page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBeNull();
  75  | }
  76  | async function admin(page:Page,label:string) {
  77  |   const person=await register(page,label);await fixtures.promoteAdmin(person.user.id);
  78  |   const result=await api(page,'POST','/auth/login',{email:person.email,password:person.password},null);expect(result.status).toBe(200);
  79  |   expect(result.body.data.user.roles).toEqual(['SUPER_ADMIN']);return {...person,...result.body.data};
  80  | }
  81  | function application(person:any,label:string) {
  82  |   return {representativeName:person.fullName,businessName:`T13B01 SYNTHETIC ${info.project.name} ${label} ${randomUUID().slice(0,8)}`,businessType:'HOTEL',email:person.email,phone:'0901234567',address:'SYNTHETIC TEST ONLY - no real business',city:`T13B01-${process.env.T13B01_RUN_ID}-${info.project.name}`,latitude:16.05,longitude:108.20,verificationDetails:{taxCode:'SYNTHETIC TEST ONLY'}};
  83  | }
  84  | async function submitApi(page:Page,person:any,label:string) {
  85  |   const payload=application(person,label);const result=await api(page,'POST','/partner-applications',payload,person.token);expect(result.status).toBe(201);await fixtures.discover();return {app:result.body.data,payload};
  86  | }
  87  | async function decisionApi(page:Page,sa:any,id:string,status:string,reason?:string) {
  88  |   const result=await api(page,'PATCH',`/admin/partners/${id}/approval`,{status,...(reason?{reason}:{})},sa.token);await fixtures.discover();return result;
  89  | }
  90  | async function partner(page:Page,sa:any,label:string) {
  91  |   const person=await register(page,label);const {app}=await submitApi(page,person,label);expect((await decisionApi(page,sa,app.id,'APPROVED')).status).toBe(200);
  92  |   const session=await api(page,'POST','/auth/login',{email:person.email,password:person.password},null);return {...person,...session.body.data};
  93  | }
  94  | async function form(page:Page,payload:any) {
  95  |   await page.goto('/become-partner');await decline(page);
  96  |   for(const [key,label] of Object.entries({representativeName:'Họ tên người đại diện',businessName:'Tên cơ sở kinh doanh',email:'Email liên hệ',phone:'Số điện thoại',city:'Tỉnh / thành phố',address:'Địa chỉ cơ sở'}))await page.getByLabel(label,{exact:true}).fill(payload[key]);
  97  |   await page.getByLabel('Mã số thuế / thông tin xác minh',{exact:true}).fill('SYNTHETIC TEST ONLY');
> 98  |   await page.getByLabel('Loại hình kinh doanh',{exact:true}).selectOption(payload.businessType);
      |                                                              ^ Error: locator.selectOption: Test timeout of 120000ms exceeded.
  99  |   await page.getByPlaceholder('Vĩ độ',{exact:true}).fill(String(payload.latitude));await page.getByPlaceholder('Kinh độ',{exact:true}).fill(String(payload.longitude));
  100 | }
  101 | async function submitUI(page:Page,payload:any,status=201) {
  102 |   const wait=response(page,'/partner-applications','POST');await page.getByRole('button',{name:'Gửi hồ sơ xét duyệt',exact:true}).click();const result=await wait;expect(result.status()).toBe(status);
  103 |   const body=await result.json();traffic.push({channel:'UI form → real API',method:'POST',endpoint:'/partner-applications',request:redact(result.request().postDataJSON()),response:{status:result.status(),body:redact(body)}});
  104 |   await fixtures.discover();return body.data;
  105 | }
  106 | async function openApplications(page:Page,sa:any) {await login(page,sa);await page.goto('/admin/partner-applications');await expect(page.getByRole('heading',{name:'Duyệt hồ sơ đối tác',exact:true})).toBeVisible();}
  107 | function appRow(page:Page,name:string) {return page.getByRole('row').filter({has:page.getByText(name,{exact:true})});}
  108 | async function decisionUI(page:Page,app:any,status:string,reason?:string,cancel?:'prompt'|'confirm') {
  109 |   const row=appRow(page,app.businessName);await expect(row).toBeVisible();const dialogs:string[]=[];
  110 |   const handler=async(dialog:any)=>{dialogs.push(dialog.type());if((cancel==='prompt'&&dialog.type()==='prompt')||(cancel==='confirm'&&dialog.type()==='confirm'))await dialog.dismiss();else if(dialog.type()==='prompt')await dialog.accept(reason);else await dialog.accept();};
  111 |   page.on('dialog',handler);const wait=cancel?null:response(page,`/admin/partners/${app.id}/approval`,'PATCH');
  112 |   try {const button=status==='APPROVED'?row.getByTitle('Phê duyệt',{exact:true}):status==='REJECTED'?row.getByTitle('Từ chối',{exact:true}):row.getByRole('button',{name:'Bổ sung',exact:true});await button.click();
  113 |     if(wait){const result=await wait;expect(result.status()).toBe(200);traffic.push({channel:'UI decision → real API',method:'PATCH',endpoint:`/admin/partners/${app.id}/approval`,request:redact(result.request().postDataJSON()),response:{status:result.status(),body:redact(await result.json())}});await expect(appRow(page,app.businessName)).toContainText(status);}
  114 |   }finally{page.off('dialog',handler);}await fixtures.discover();return dialogs;
  115 | }
  116 | async function assertDecision(appId:string,userId:string,actor:string,status:string,expectedAudit:number) {
  117 |   const app=await PartnerApplication.findByPk(appId);expect(app.status).toBe(status);expect(app.reviewedBy).toBe(actor);expect(app.reviewedAt).toBeTruthy();
  118 |   const audits=await AuditLog.findAll({where:{entityType:'PartnerApplication',entityId:appId},order:[['createdAt','ASC']]});expect(audits).toHaveLength(expectedAudit);
  119 |   expect(audits.at(-1).actorUserId).toBe(actor);expect(audits.at(-1).newData.status).toBe(status);
  120 |   const grants=await UserRole.findAll({where:{userId,role:'PARTNER'}});const members=await BusinessMember.findAll({where:{userId}});
  121 |   if(status==='APPROVED') {expect(grants).toHaveLength(1);expect(grants[0].grantedBy).toBe(actor);expect(members).toHaveLength(1);expect(members[0].permissions.slice().sort()).toEqual(['MANAGE_BOOKINGS','MANAGE_BUSINESS']);const business=await Business.findByPk(members[0].businessId);expect(business.status).toBe('ACTIVE');expect(business.name).toBe(app.businessName);expect(audits.at(-1).newData.businessId).toBe(business.id);}
  122 |   else {expect(grants).toHaveLength(0);expect(members).toHaveLength(0);expect(await Business.count({where:{name:app.businessName}})).toBe(0);}
  123 |   return {application:app.toJSON(),grants:grants.map((v:any)=>v.toJSON()),members:members.map((v:any)=>v.toJSON()),audit:audits.map((v:any)=>v.toJSON())};
  124 | }
  125 | async function statusUI(page:Page,person:any,app:any,status:string,reason?:string) {
  126 |   await login(page,person);await page.goto('/become-partner');await decline(page);await expect(page.getByRole('heading',{name:app.businessName,exact:true})).toBeVisible();await expect(page.getByText(status,{exact:true})).toBeVisible();if(reason)await expect(page.getByText('Phản hồi: '+reason,{exact:true})).toBeVisible();
  127 |   await page.reload();await expect(page.getByText(status,{exact:true})).toBeVisible();await photo(page,`customer-${status.toLowerCase()}`);
  128 | }
  129 | test.beforeAll(async ({},worker)=>{await schema();fixtures=new Fixtures(root,worker.project.name);});
  130 | test.afterAll(async()=>{try{if(fixtures)await fixtures.cleanup();}finally{await sequelize.close();}});
  131 | test.beforeEach(async({page},testInfo)=>{
  132 |   info=testInfo;checkpoints=[];traffic=[];consoleLog=[];images=[];
  133 |   expect(fs.existsSync(path.join(root,'fingerprint-before.json'))).toBe(true);
  134 |   expect(createHash('sha256').update(fs.readFileSync(path.join(root,'case-manifest.json'))).digest('hex')).toBe(process.env.T13B01_MANIFEST_SHA256);
  135 |   await guard('T13-B-01 before fixture request');
  136 |   page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))traffic.push({channel:'browser network metadata',method:r.request().method(),endpoint:new URL(r.url()).pathname,status:r.status()});});
  137 |   page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleLog.push({type:m.type(),message:m.text().slice(0,600)});});
  138 |   page.on('pageerror',e=>consoleLog.push({type:'pageerror',message:e.message}));
  139 |   await page.goto('/');
  140 |   await step('ENV_IDENTITY','Proxy reaches this run exact guarded test database',async()=>{const r=await api(page,'GET','/__t13b01/identity',undefined,null);expect(r.status).toBe(200);expect(r.body.runId).toBe(process.env.T13B01_RUN_ID);expect(r.body.database).toBe('travelgo_ai_m0_test');expect(r.body.sentinel).toBe('PASS');expect(r.body.nodeEnv).toBe('test');expect(r.body.port).toBe(Number(process.env.PLAYWRIGHT_BACKEND_PORT));return r.body;});
  141 | });
  142 | test.afterEach(async({page},testInfo)=>{
  143 |   if(testInfo.status==='skipped')return;
  144 |   if(testInfo.errors.length&&!checkpoints.some(v=>v.status==='FAIL'))checkpoints.push({id:'ASSERTION_FAILURE',status:'FAIL',actual:testInfo.errors.map(e=>e.message)});
  145 |   try{await photo(page,'final');}catch(e:any){consoleLog.push({type:'evidence-error',message:e.message});}
  146 |   await fixtures.discover();const snapshot=await fixtures.snapshot();write(path.join(out(),`${caseId()}-db-final.json`),snapshot);
  147 |   write(path.join(out(),`${caseId()}-results.json`),{id:caseId(),project:testInfo.project.name,channel:caseId()==='R04'?'A1':'U2'+(caseId()==='R01'?'':'+A1 desktop probes'),viewport:page.viewportSize(),browser:page.context().browser()?.version(),mobileEmulation:testInfo.project.name==='mobile',status:testInfo.status==='passed'&&!testInfo.errors.length?'PASS':'FAIL',errors:testInfo.errors.map(e=>({message:e.message,stack:e.stack})),checkpoints,traffic,console:consoleLog,images,dbSnapshot:`${caseId()}-db-final.json`});
  148 | });
  149 | 
  150 | test('R01 role dashboards public area reload navigation',async({page})=>{
  151 |   const sa=await admin(page,'R01-SA'),c=await register(page,'R01-C'),p=await partner(page,sa,'R01-P');
  152 |   for(const [person,route,role] of [[c,'/profile','CUSTOMER'],[p,'/partner','PARTNER'],[sa,'/admin','SUPER_ADMIN']] as const)await step(`ROLE_${role}`,'UI login, route reload and /me match database grants',async()=>{
  153 |     const session=await login(page,person);await page.goto(route);await decline(page);await expect(page).toHaveURL(new RegExp(route+'$'));await page.reload();await expect(page).toHaveURL(new RegExp(route+'$'));await expect(page.getByText(person.fullName,{exact:true}).first()).toBeVisible();
  154 |     const me=await api(page,'GET','/auth/me');expect(me.status).toBe(200);const grants=await UserRole.findAll({where:{userId:person.user.id}});expect(me.body.data.roles.slice().sort()).toEqual(grants.map((v:any)=>v.role).sort());expect(session.user.roles).toContain(role);
  155 |     if(role!=='CUSTOMER'&&info.project.name==='mobile'){await page.getByRole('button',{name:'Mở menu',exact:true}).click();await expect(page.getByRole('navigation')).toBeVisible();await page.locator('aside').getByRole('button',{name:'Đóng menu',exact:true}).click();}
  156 |     if(role==='CUSTOMER'){await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();}
  157 |     await photo(page,role.toLowerCase());await page.goto('/explore');await decline(page);await expect(page).toHaveURL(/\/explore$/);return {userId:person.user.id,roles:me.body.data.roles};
  158 |   });
  159 | });
  160 | 
  161 | test('R02 deny role routes anonymous and escalation',async({page})=>{
  162 |   const sa=await admin(page,'R02-SA'),c=await register(page,'R02-C'),p=await partner(page,sa,'R02-P');const target=randomUUID();
  163 |   await step('ANONYMOUS_UI','Protected routes return login',async()=>{for(const route of ['/admin','/partner']){await page.goto(route);await expect(page).toHaveURL(/\/login$/);}await photo(page,'anonymous-login');});
  164 |   await step('WRONG_ROLE_UI','Customer admin/partner, Partner admin, SA-only partner give403 without logout',async()=>{
  165 |     for(const [person,denied] of [[c,['/admin','/partner']],[p,['/admin']],[sa,['/partner']]] as any){await login(page,person);for(const route of denied){await page.goto(route);await expect(page).toHaveURL(/\/403$/);await expect(page.getByRole('heading',{name:'Bạn không có quyền truy cập',exact:true})).toBeVisible();expect(await page.evaluate(()=>!!localStorage.getItem('travelgo_token'))).toBe(true);await photo(page,`denied-${person===c?'customer':person===p?'partner':'sa'}-${route.slice(1)}`);}}
  166 |   });
  167 |   await step('CACHE_ESCALATION','Forged cached roles cannot change API permission; /me restores CUSTOMER',async()=>{await login(page,c);await page.evaluate(()=>{const cache=JSON.parse(localStorage.getItem('travelgo_user')!);cache.roles=['SUPER_ADMIN','PARTNER'];localStorage.setItem('travelgo_user',JSON.stringify(cache));});expect((await api(page,'GET','/admin/dashboard')).status).toBe(403);await page.goto('/admin');await expect(page).toHaveURL(/\/403$/);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('travelgo_user')!).roles)).toEqual(['CUSTOMER']);});
  168 |   if(isApi())await step('DENY_API_EXPANSION','All frozen protected probes return401/403 and fixture rows unchanged',async()=>{
  169 |     const before=await fixtures.snapshot();const protectedRoutes:any[]=[['GET','/admin/dashboard'],['PATCH',`/admin/partners/${fixtures.data.applications[0]}/approval`,{status:'APPROVED'}],...['places','tours','blogs'].map(resource=>['PATCH',`/admin/${resource}/${target}/status`,{status:'APPROVED'}]),['POST','/places',{}],['DELETE',`/places/${target}`],['POST','/tours',{}],['PUT',`/tours/${target}`,{}],['DELETE',`/tours/${target}`],['PATCH',`/reviews/${target}/moderation`,{status:'PUBLISHED'}]];
  170 |     for(const person of [c,p])for(const [method,endpoint,body] of protectedRoutes){const r=await api(page,method,endpoint,body,person.token);expect(r.status,`${method} ${endpoint}`).toBe(403);expect(r.body.code).toBe('FORBIDDEN');}
  171 |     for(const person of [c,sa])expect((await api(page,'GET','/partner/dashboard',undefined,person.token)).status).toBe(403);
  172 |     const anonymous:any[]=[...protectedRoutes,['GET','/partner/dashboard'],['GET','/reviews/me'],['POST',`/places/${target}/reviews`,{rating:4,comment:'SYNTHETIC TEST ONLY review'}],['PATCH',`/reviews/${target}`,{rating:4,comment:'SYNTHETIC TEST ONLY review'}],['DELETE',`/reviews/${target}`],['GET','/favorites'],...['POST','DELETE'].map(method=>[method,`/favorites/${target}`,{contractVersion:'1.0',sessionId:'t13b01-anonymous',uiSurface:'favorites'}]),['GET','/intelligence/consent'],['PUT','/intelligence/consent',{analyticsEnabled:false,personalizationEnabled:false}]];
  173 |     for(const [method,endpoint,body] of anonymous)expect((await api(page,method,endpoint,body,null)).status,`${method} ${endpoint}`).toBe(401);
  174 |     expect(await fixtures.snapshot()).toEqual(before);write(path.join(out(),'R02-rejected-mutation-before-after.json'),{before,after:await fixtures.snapshot(),same:true});return {wrongRoleProbes:protectedRoutes.length*2+2,anonymousProbes:anonymous.length};
  175 |   });
  176 | });
  177 | 
  178 | test('R04 server-owned identity and role mass assignment',async({page})=>{
  179 |   test.skip(info.project.name==='mobile','A1 once in desktop: API authorization does not depend on viewport');
  180 |   await step('MASS_ASSIGNMENT','Spoof fields never grant role, change identity or approve application',async()=>{
  181 |     const foreign=randomUUID();const c=await register(page,'R04-C',{role:'admin',roles:['SUPER_ADMIN','PARTNER'],userId:foreign,businessId:randomUUID()});expect(c.user.roles).toEqual(['CUSTOMER']);expect(c.user.id).not.toBe(foreign);
  182 |     const row=await User.findByPk(c.user.id);expect(row.role).toBe('user');const payload=application(c,'R04');const r=await api(page,'POST','/partner-applications',{...payload,userId:foreign,status:'APPROVED',reviewedBy:c.user.id},c.token);expect(r.status).toBe(201);expect(r.body.data.userId).toBe(c.user.id);expect(r.body.data.status).toBe('PENDING');expect(r.body.data.reviewedBy).toBeFalsy();
  183 |     const roles=await UserRole.findAll({where:{userId:c.user.id}});expect(roles.map((v:any)=>v.role)).toEqual(['CUSTOMER']);expect(await BusinessMember.count({where:{userId:c.user.id}})).toBe(0);expect(await Business.count({where:{name:payload.businessName}})).toBe(0);expect(await AuditLog.count({where:{entityType:'PartnerApplication',entityId:r.body.data.id}})).toBe(0);return {userId:c.user.id,applicationId:r.body.data.id,legacyRole:row.role,roles:c.user.roles};
  184 |   });
  185 | });
  186 | 
  187 | test('A02 application validation persistence duplicate and cancel',async({page})=>{
  188 |   const sa=await admin(page,'A02-SA'),c=await register(page,'A02-C'),other=await register(page,'A02-OTHER');await login(page,c);const payload=application(c,'A02');await form(page,payload);
  189 |   await step('FORM_VALIDATION','Required field blocks submit; invalid server email preserves all input and shows error',async()=>{
  190 |     await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).fill('');expect(await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).evaluate((el:HTMLInputElement)=>el.checkValidity())).toBe(false);const before=traffic.filter(v=>v.endpoint==='/api/partner-applications'&&v.method==='POST').length;await page.getByRole('button',{name:'Gửi hồ sơ xét duyệt',exact:true}).click();expect(traffic.filter(v=>v.endpoint==='/api/partner-applications'&&v.method==='POST')).toHaveLength(before);
  191 |     await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).fill(payload.businessName);await page.getByLabel('Email liên hệ',{exact:true}).fill('invalid-email');await submitUI(page,payload,400);await expect(page.getByLabel('Tên cơ sở kinh doanh',{exact:true})).toHaveValue(payload.businessName);await expect(page.getByLabel('Email liên hệ',{exact:true})).toHaveValue('invalid-email');await expect(page.getByText(/Email không hợp lệ/)).toBeVisible();await photo(page,'invalid-form');expect(await PartnerApplication.count({where:{userId:c.user.id}})).toBe(0);await page.getByLabel('Email liên hệ',{exact:true}).fill(payload.email);
  192 |   });
  193 |   const app=await step('SUBMIT_RELOAD','Valid UI application201 PENDING, persisted and reload recovers status',async()=>{const app=await submitUI(page,payload);expect(app.status).toBe('PENDING');await expect(page.getByText('PENDING',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:payload.businessName,exact:true})).toBeVisible();await expect(page.getByText('PENDING',{exact:true})).toBeVisible();const own=await api(page,'GET','/partner-applications/me');expect(own.body.data.map((v:any)=>v.id)).toEqual([app.id]);expect((await PartnerApplication.findByPk(app.id)).businessName).toBe(payload.businessName);await photo(page,'pending-reload');return app;});
  194 |   if(isApi())await step('APPLICATION_INVALID_API','Missing/email/type/coordinates400; duplicate409; other owner list empty',async()=>{
  195 |     const before=await fixtures.snapshot();for(const patch of [{businessName:''},{email:'bad'},{businessType:'INVALID'},{latitude:91},{longitude:181}])expect((await api(page,'POST','/partner-applications',{...payload,...patch},other.token)).status).toBe(400);
  196 |     const duplicate=await api(page,'POST','/partner-applications',payload,c.token);expect(duplicate.status).toBe(409);expect(duplicate.body.code).toBe('ACTIVE_APPLICATION_EXISTS');expect((await api(page,'GET','/partner-applications/me',undefined,other.token)).body.data).toEqual([]);expect(await fixtures.snapshot()).toEqual(before);return {duplicate:duplicate.body.code,invalidVariants:5};
  197 |   });
  198 |   await step('CANCEL_ADMIN_DIALOGS','Cancel reason prompt or approval confirm causes no PATCH or DB change',async()=>{await openApplications(page,sa);const before=await fixtures.snapshot();const count=traffic.filter(v=>v.method==='PATCH').length;expect(await decisionUI(page,app,'REJECTED','unused','prompt')).toEqual(['prompt']);expect(await decisionUI(page,app,'APPROVED',undefined,'confirm')).toEqual(['confirm']);expect(traffic.filter(v=>v.method==='PATCH')).toHaveLength(count);expect(await fixtures.snapshot()).toEqual(before);await photo(page,'cancel-dialogs');});
```