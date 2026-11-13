import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { createRequire } from 'node:module';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(path.resolve('../backend/package.json'));
const { Fixtures, guard, schema, models, sequelize, write } = require('../backend/scripts/t13b01-support.cjs');
const { User, UserRole, PartnerApplication, BusinessMember, Business, AuditLog } = models;
let fixtures: any, info: TestInfo, checkpoints: any[], traffic: any[], consoleLog: any[], images: string[];
const root = process.env.T13B01_EVIDENCE!;
const out = () => path.join(root, info.project.name);
const caseId = () => info.title.split(' ')[0];
const isApi = () => info.project.name === 'desktop';
function redact(value: any): any {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,v]) => [key,/token|password|authorization|secret/i.test(key) ? '[REDACTED]' : redact(v)]));
  return value;
}
async function step(id: string, expected: string, fn: () => Promise<any>) {
  const record: any = { id, expected, startedAt: new Date().toISOString(), status: 'NOT RUN' }; checkpoints.push(record);
  try { const value = await test.step(id, fn); record.status = 'PASS'; if(value !== undefined)record.actual = redact(value); return value; }
  catch(e: any) { record.status = 'FAIL'; record.actual = e.message; throw e; }
  finally { record.finishedAt = new Date().toISOString(); }
}
async function independentStep(page:Page,id:string,expected:string,fn:()=>Promise<any>) {
  try {return await step(id,expected,fn);}catch(e:any){await photo(page,`${id.toLowerCase()}-failure`);expect.soft(false,`${id}: ${e.message}`).toBe(true);}
}
async function api(page: Page, method: string, endpoint: string, body?: any, token?: string | null) {
  const result = await page.evaluate(async ({ method,endpoint,body,token }) => {
    const auth = token === undefined ? localStorage.getItem('travelgo_token') : token;
    const response = await fetch('/api'+endpoint, {method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  }, {method,endpoint,body,token});
  traffic.push({channel:'browser fetch → Vite proxy → real API',method,endpoint,request:redact(body),response:redact(result)});return result;
}
function response(page: Page, endpoint: string, method: string) {
  return page.waitForResponse(r => new URL(r.url()).pathname === '/api'+endpoint && r.request().method()===method);
}
async function photo(page: Page, label: string) {
  const prefix=`${caseId()}-${label}`;
  const mask=page.locator('tbody tr').filter({hasNot:page.getByText(/T13B01 SYNTHETIC/)});
  for(const fullPage of [false,true]) { const name=`${prefix}${fullPage?'-full':''}.png`;await page.screenshot({path:path.join(out(),name),fullPage,mask:[mask]});images.push(name); }
  const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect.soft(size.scrollWidth,`${prefix} document overflow`).toBeLessThanOrEqual(size.width+1);
  checkpoints.push({id:`LAYOUT_${label}`,expected:'No document horizontal overflow; table may scroll within container',actual:size,status:size.scrollWidth<=size.width+1?'PASS':'FAIL'});
}
async function decline(page: Page) {
  const button=page.getByTestId('telemetry-decline');
  if(await button.waitFor({state:'visible',timeout:800}).then(()=>true).catch(()=>false)){const wait=response(page,'/intelligence/consent','PUT');await button.click();expect((await wait).status()).toBe(200);}
}
async function register(page: Page,label:string,extra:any={}) {
  await guard('T13-B-01 register fixture');const email=fixtures.plan(label),password=randomBytes(20).toString('base64url')+'1a';
  const fullName=`T13B01 ${info.project.name} ${label}`;
  const result=await api(page,'POST','/auth/register',{fullName,email,password,phone:'0901234567',...extra},null);
  expect(result.status).toBe(201);await fixtures.discover();return {...result.body.data,email,password,fullName};
}
async function login(page: Page,person:any) {
  // Clear only this isolated test context as setup. R05 separately exercises the real logout control.
  await page.evaluate(()=>{localStorage.removeItem('travelgo_token');localStorage.removeItem('travelgo_user');});
  await page.goto('/login');await page.locator('[name=email]').fill(person.email);await page.locator('[name=password]').fill(person.password);
  const wait=response(page,'/auth/login','POST');await page.getByRole('button',{name:'Đăng nhập ngay',exact:true}).click();
  const result=await wait;expect(result.status()).toBe(200);const session=(await result.json()).data;
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBe(session.token);
  await expect(page).not.toHaveURL(/\/login$/);return session;
}
async function logoutUI(page:Page) {
  if(/\/(admin|partner)(\/|$)/.test(new URL(page.url()).pathname)) {
    if(info.project.name==='mobile')await page.getByRole('button',{name:'Mở menu',exact:true}).click();
    await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  } else {
    await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();
    await page.getByRole('button',{name:'Đăng xuất',exact:true}).click();
  }
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBeNull();
}
async function admin(page:Page,label:string) {
  const person=await register(page,label);await fixtures.promoteAdmin(person.user.id);
  const result=await api(page,'POST','/auth/login',{email:person.email,password:person.password},null);expect(result.status).toBe(200);
  expect(result.body.data.user.roles).toEqual(['SUPER_ADMIN']);return {...person,...result.body.data};
}
function application(person:any,label:string) {
  return {representativeName:person.fullName,businessName:`T13B01 SYNTHETIC ${info.project.name} ${label} ${randomUUID().slice(0,8)}`,businessType:'HOTEL',email:person.email,phone:'0901234567',address:'SYNTHETIC TEST ONLY - no real business',city:`T13B01-${process.env.T13B01_RUN_ID}-${info.project.name}`,latitude:16.05,longitude:108.20,verificationDetails:{taxCode:'SYNTHETIC TEST ONLY'}};
}
async function submitApi(page:Page,person:any,label:string) {
  const payload=application(person,label);const result=await api(page,'POST','/partner-applications',payload,person.token);expect(result.status).toBe(201);await fixtures.discover();return {app:result.body.data,payload};
}
async function decisionApi(page:Page,sa:any,id:string,status:string,reason?:string) {
  const result=await api(page,'PATCH',`/admin/partners/${id}/approval`,{status,...(reason?{reason}:{})},sa.token);await fixtures.discover();return result;
}
async function partner(page:Page,sa:any,label:string) {
  const person=await register(page,label);const {app}=await submitApi(page,person,label);expect((await decisionApi(page,sa,app.id,'APPROVED')).status).toBe(200);
  const session=await api(page,'POST','/auth/login',{email:person.email,password:person.password},null);return {...person,...session.body.data};
}
async function form(page:Page,payload:any) {
  await page.goto('/become-partner');await decline(page);
  for(const [key,label] of Object.entries({representativeName:'Họ tên người đại diện',businessName:'Tên cơ sở kinh doanh',email:'Email liên hệ',phone:'Số điện thoại',city:'Tỉnh / thành phố',address:'Địa chỉ cơ sở'}))await page.getByLabel(label,{exact:true}).fill(payload[key]);
  await page.getByLabel('Mã số thuế / thông tin xác minh',{exact:true}).fill('SYNTHETIC TEST ONLY');
  // The wrapping label includes option text; scope the existing single form select.
  await page.locator('form select').selectOption(payload.businessType);
  await page.getByPlaceholder('Vĩ độ',{exact:true}).fill(String(payload.latitude));await page.getByPlaceholder('Kinh độ',{exact:true}).fill(String(payload.longitude));
}
async function submitUI(page:Page,payload:any,status=201) {
  const wait=response(page,'/partner-applications','POST');await page.getByRole('button',{name:'Gửi hồ sơ xét duyệt',exact:true}).click();const result=await wait;expect(result.status()).toBe(status);
  const body=await result.json();traffic.push({channel:'UI form → real API',method:'POST',endpoint:'/partner-applications',request:redact(result.request().postDataJSON()),response:{status:result.status(),body:redact(body)}});
  await fixtures.discover();return body.data;
}
async function openApplications(page:Page,sa:any) {await login(page,sa);await page.goto('/admin/partner-applications');await expect(page.getByRole('heading',{name:'Duyệt hồ sơ đối tác',exact:true})).toBeVisible();}
function appRow(page:Page,name:string) {return page.getByRole('row').filter({has:page.getByText(name,{exact:true})});}
async function decisionUI(page:Page,app:any,status:string,reason?:string,cancel?:'prompt'|'confirm') {
  const row=appRow(page,app.businessName);await expect(row).toBeVisible();const dialogs:string[]=[];
  const handler=async(dialog:any)=>{dialogs.push(dialog.type());if((cancel==='prompt'&&dialog.type()==='prompt')||(cancel==='confirm'&&dialog.type()==='confirm'))await dialog.dismiss();else if(dialog.type()==='prompt')await dialog.accept(reason);else await dialog.accept();};
  page.on('dialog',handler);const wait=cancel?null:response(page,`/admin/partners/${app.id}/approval`,'PATCH');
  try {const button=status==='APPROVED'?row.getByTitle('Phê duyệt',{exact:true}):status==='REJECTED'?row.getByTitle('Từ chối',{exact:true}):row.getByRole('button',{name:'Bổ sung',exact:true});await button.click();
    if(wait){const result=await wait;expect(result.status()).toBe(200);traffic.push({channel:'UI decision → real API',method:'PATCH',endpoint:`/admin/partners/${app.id}/approval`,request:redact(result.request().postDataJSON()),response:{status:result.status(),body:redact(await result.json())}});await expect(appRow(page,app.businessName)).toContainText(status);}
  }finally{page.off('dialog',handler);}await fixtures.discover();return dialogs;
}
async function assertDecision(appId:string,userId:string,actor:string,status:string,expectedAudit:number) {
  const app=await PartnerApplication.findByPk(appId);expect(app.status).toBe(status);expect(app.reviewedBy).toBe(actor);expect(app.reviewedAt).toBeTruthy();
  const audits=await AuditLog.findAll({where:{entityType:'PartnerApplication',entityId:appId},order:[['createdAt','ASC']]});expect(audits).toHaveLength(expectedAudit);
  expect(audits.at(-1).actorUserId).toBe(actor);expect(audits.at(-1).newData.status).toBe(status);
  const grants=await UserRole.findAll({where:{userId,role:'PARTNER'}});const members=await BusinessMember.findAll({where:{userId}});
  if(status==='APPROVED') {expect(grants).toHaveLength(1);expect(grants[0].grantedBy).toBe(actor);expect(members).toHaveLength(1);expect(members[0].permissions.slice().sort()).toEqual(['MANAGE_BOOKINGS','MANAGE_BUSINESS']);const business=await Business.findByPk(members[0].businessId);expect(business.status).toBe('ACTIVE');expect(business.name).toBe(app.businessName);expect(audits.at(-1).newData.businessId).toBe(business.id);}
  else {expect(grants).toHaveLength(0);expect(members).toHaveLength(0);expect(await Business.count({where:{name:app.businessName}})).toBe(0);}
  return {application:app.toJSON(),grants:grants.map((v:any)=>v.toJSON()),members:members.map((v:any)=>v.toJSON()),audit:audits.map((v:any)=>v.toJSON())};
}
async function statusUI(page:Page,person:any,app:any,status:string,reason?:string) {
  await login(page,person);await page.goto('/become-partner');await decline(page);await expect(page.getByRole('heading',{name:app.businessName,exact:true})).toBeVisible();await expect(page.getByText(status,{exact:true})).toBeVisible();if(reason)await expect(page.getByText('Phản hồi: '+reason,{exact:true})).toBeVisible();
  await page.reload();await expect(page.getByText(status,{exact:true})).toBeVisible();await photo(page,`customer-${status.toLowerCase()}`);
}
test.beforeAll(async ({},worker)=>{await schema();fixtures=new Fixtures(root,worker.project.name);});
test.afterAll(async()=>{try{if(fixtures)await fixtures.cleanup();}finally{await sequelize.close();}});
test.beforeEach(async({page},testInfo)=>{
  info=testInfo;checkpoints=[];traffic=[];consoleLog=[];images=[];
  expect(fs.existsSync(path.join(root,'fingerprint-before.json'))).toBe(true);
  expect(createHash('sha256').update(fs.readFileSync(path.join(root,'case-manifest.json'))).digest('hex')).toBe(process.env.T13B01_MANIFEST_SHA256);
  await guard('T13-B-01 before fixture request');
  page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))traffic.push({channel:'browser network metadata',method:r.request().method(),endpoint:new URL(r.url()).pathname,status:r.status()});});
  page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleLog.push({type:m.type(),message:m.text().slice(0,600)});});
  page.on('pageerror',e=>consoleLog.push({type:'pageerror',message:e.message}));
  await page.goto('/');
  await step('ENV_IDENTITY','Proxy reaches this run exact guarded test database',async()=>{const r=await api(page,'GET','/__t13b01/identity',undefined,null);expect(r.status).toBe(200);expect(r.body.runId).toBe(process.env.T13B01_RUN_ID);expect(r.body.database).toBe('travelgo_ai_m0_test');expect(r.body.sentinel).toBe('PASS');expect(r.body.nodeEnv).toBe('test');expect(r.body.port).toBe(Number(process.env.PLAYWRIGHT_BACKEND_PORT));return r.body;});
});
test.afterEach(async({page},testInfo)=>{
  if(testInfo.status==='skipped')return;
  if(testInfo.errors.length&&!checkpoints.some(v=>v.status==='FAIL'))checkpoints.push({id:'ASSERTION_FAILURE',status:'FAIL',actual:testInfo.errors.map(e=>e.message)});
  try{await photo(page,'final');}catch(e:any){consoleLog.push({type:'evidence-error',message:e.message});}
  await fixtures.discover();const snapshot=await fixtures.snapshot();write(path.join(out(),`${caseId()}-db-final.json`),snapshot);
  write(path.join(out(),`${caseId()}-results.json`),{id:caseId(),project:testInfo.project.name,channel:caseId()==='R04'?'A1':'U2'+(caseId()==='R01'?'':'+A1 desktop probes'),viewport:page.viewportSize(),browser:page.context().browser()?.version(),mobileEmulation:testInfo.project.name==='mobile',status:testInfo.status==='passed'&&!testInfo.errors.length?'PASS':'FAIL',errors:testInfo.errors.map(e=>({message:e.message,stack:e.stack})),checkpoints,traffic,console:consoleLog,images,dbSnapshot:`${caseId()}-db-final.json`});
});

test('R01 role dashboards public area reload navigation',async({page})=>{
  const sa=await admin(page,'R01-SA'),c=await register(page,'R01-C'),p=await partner(page,sa,'R01-P');
  for(const [person,route,role] of [[c,'/profile','CUSTOMER'],[p,'/partner','PARTNER'],[sa,'/admin','SUPER_ADMIN']] as const)await step(`ROLE_${role}`,'UI login, route reload and /me match database grants',async()=>{
    const session=await login(page,person);await page.goto(route);await decline(page);await expect(page).toHaveURL(new RegExp(route+'$'));await page.reload();await expect(page).toHaveURL(new RegExp(route+'$'));await expect(page.getByText(person.fullName,{exact:true}).first()).toBeVisible();
    const me=await api(page,'GET','/auth/me');expect(me.status).toBe(200);const grants=await UserRole.findAll({where:{userId:person.user.id}});expect(me.body.data.roles.slice().sort()).toEqual(grants.map((v:any)=>v.role).sort());expect(session.user.roles).toContain(role);
    if(role!=='CUSTOMER'&&info.project.name==='mobile'){await page.getByRole('button',{name:'Mở menu',exact:true}).click();await expect(page.getByRole('navigation')).toBeVisible();await page.locator('aside').getByRole('button',{name:'Đóng menu',exact:true}).click();}
    if(role==='CUSTOMER'){await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();}
    await photo(page,role.toLowerCase());await page.goto('/explore');await decline(page);await expect(page).toHaveURL(/\/explore$/);return {userId:person.user.id,roles:me.body.data.roles};
  });
});

test('R02 deny role routes anonymous and escalation',async({page})=>{
  const sa=await admin(page,'R02-SA'),c=await register(page,'R02-C'),p=await partner(page,sa,'R02-P');const target=randomUUID();
  await step('ANONYMOUS_UI','Protected routes return login',async()=>{for(const route of ['/admin','/partner']){await page.goto(route);await expect(page).toHaveURL(/\/login$/);}await photo(page,'anonymous-login');});
  await step('WRONG_ROLE_UI','Customer admin/partner, Partner admin, SA-only partner give403 without logout',async()=>{
    for(const [person,denied] of [[c,['/admin','/partner']],[p,['/admin']],[sa,['/partner']]] as any){await login(page,person);for(const route of denied){await page.goto(route);await expect(page).toHaveURL(/\/403$/);await expect(page.getByRole('heading',{name:'Bạn không có quyền truy cập',exact:true})).toBeVisible();expect(await page.evaluate(()=>!!localStorage.getItem('travelgo_token'))).toBe(true);await photo(page,`denied-${person===c?'customer':person===p?'partner':'sa'}-${route.slice(1)}`);}}
  });
  await step('CACHE_ESCALATION','Forged cached roles cannot change API permission; /me restores CUSTOMER',async()=>{await login(page,c);await page.evaluate(()=>{const cache=JSON.parse(localStorage.getItem('travelgo_user')!);cache.roles=['SUPER_ADMIN','PARTNER'];localStorage.setItem('travelgo_user',JSON.stringify(cache));});expect((await api(page,'GET','/admin/dashboard')).status).toBe(403);await page.goto('/admin');await expect(page).toHaveURL(/\/403$/);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('travelgo_user')!).roles)).toEqual(['CUSTOMER']);});
  if(isApi())await step('DENY_API_EXPANSION','All frozen protected probes return401/403 and fixture rows unchanged',async()=>{
    const before=await fixtures.snapshot();const protectedRoutes:any[]=[['GET','/admin/dashboard'],['PATCH',`/admin/partners/${fixtures.data.applications[0]}/approval`,{status:'APPROVED'}],...['places','tours','blogs'].map(resource=>['PATCH',`/admin/${resource}/${target}/status`,{status:'APPROVED'}]),['POST','/places',{}],['DELETE',`/places/${target}`],['POST','/tours',{}],['PUT',`/tours/${target}`,{}],['DELETE',`/tours/${target}`],['PATCH',`/reviews/${target}/moderation`,{status:'PUBLISHED'}]];
    for(const person of [c,p])for(const [method,endpoint,body] of protectedRoutes){const r=await api(page,method,endpoint,body,person.token);expect(r.status,`${method} ${endpoint}`).toBe(403);expect(r.body.code).toBe('FORBIDDEN');}
    for(const person of [c,sa])expect((await api(page,'GET','/partner/dashboard',undefined,person.token)).status).toBe(403);
    const anonymous:any[]=[...protectedRoutes,['GET','/partner/dashboard'],['GET','/reviews/me'],['POST',`/places/${target}/reviews`,{rating:4,comment:'SYNTHETIC TEST ONLY review'}],['PATCH',`/reviews/${target}`,{rating:4,comment:'SYNTHETIC TEST ONLY review'}],['DELETE',`/reviews/${target}`],['GET','/favorites'],...['POST','DELETE'].map(method=>[method,`/favorites/${target}`,{contractVersion:'1.0',sessionId:'t13b01-anonymous',uiSurface:'favorites'}]),['GET','/intelligence/consent'],['PUT','/intelligence/consent',{analyticsEnabled:false,personalizationEnabled:false}]];
    for(const [method,endpoint,body] of anonymous)expect((await api(page,method,endpoint,body,null)).status,`${method} ${endpoint}`).toBe(401);
    expect(await fixtures.snapshot()).toEqual(before);write(path.join(out(),'R02-rejected-mutation-before-after.json'),{before,after:await fixtures.snapshot(),same:true});return {wrongRoleProbes:protectedRoutes.length*2+2,anonymousProbes:anonymous.length};
  });
});

test('R04 server-owned identity and role mass assignment',async({page})=>{
  test.skip(info.project.name==='mobile','A1 once in desktop: API authorization does not depend on viewport');
  await step('MASS_ASSIGNMENT','Spoof fields never grant role, change identity or approve application',async()=>{
    const foreign=randomUUID();const c=await register(page,'R04-C',{role:'admin',roles:['SUPER_ADMIN','PARTNER'],userId:foreign,businessId:randomUUID()});expect(c.user.roles).toEqual(['CUSTOMER']);expect(c.user.id).not.toBe(foreign);
    const row=await User.findByPk(c.user.id);expect(row.role).toBe('user');const payload=application(c,'R04');const r=await api(page,'POST','/partner-applications',{...payload,userId:foreign,status:'APPROVED',reviewedBy:c.user.id},c.token);expect(r.status).toBe(201);expect(r.body.data.userId).toBe(c.user.id);expect(r.body.data.status).toBe('PENDING');expect(r.body.data.reviewedBy).toBeFalsy();
    const roles=await UserRole.findAll({where:{userId:c.user.id}});expect(roles.map((v:any)=>v.role)).toEqual(['CUSTOMER']);expect(await BusinessMember.count({where:{userId:c.user.id}})).toBe(0);expect(await Business.count({where:{name:payload.businessName}})).toBe(0);expect(await AuditLog.count({where:{entityType:'PartnerApplication',entityId:r.body.data.id}})).toBe(0);return {userId:c.user.id,applicationId:r.body.data.id,legacyRole:row.role,roles:c.user.roles};
  });
});

test('A02 application validation persistence duplicate and cancel',async({page})=>{
  const sa=await admin(page,'A02-SA'),c=await register(page,'A02-C'),other=await register(page,'A02-OTHER');await login(page,c);const payload=application(c,'A02');await form(page,payload);
  await step('FORM_VALIDATION','Required field blocks submit; invalid server email preserves all input and shows error',async()=>{
    await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).fill('');expect(await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).evaluate((el:HTMLInputElement)=>el.checkValidity())).toBe(false);const before=traffic.filter(v=>v.endpoint==='/api/partner-applications'&&v.method==='POST').length;await page.getByRole('button',{name:'Gửi hồ sơ xét duyệt',exact:true}).click();expect(traffic.filter(v=>v.endpoint==='/api/partner-applications'&&v.method==='POST')).toHaveLength(before);
    await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).fill(payload.businessName);await page.getByLabel('Email liên hệ',{exact:true}).fill('invalid-email');await submitUI(page,payload,400);await expect(page.getByLabel('Tên cơ sở kinh doanh',{exact:true})).toHaveValue(payload.businessName);await expect(page.getByLabel('Email liên hệ',{exact:true})).toHaveValue('invalid-email');await expect(page.getByText('Dữ liệu gửi lên không hợp lệ',{exact:true})).toBeVisible();await photo(page,'invalid-form');expect(await PartnerApplication.count({where:{userId:c.user.id}})).toBe(0);await page.getByLabel('Email liên hệ',{exact:true}).fill(payload.email);
  });
  const app=await step('SUBMIT_RELOAD','Valid UI application201 PENDING, persisted and reload recovers status',async()=>{const app=await submitUI(page,payload);expect(app.status).toBe('PENDING');await expect(page.getByText('PENDING',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:payload.businessName,exact:true})).toBeVisible();await expect(page.getByText('PENDING',{exact:true})).toBeVisible();const own=await api(page,'GET','/partner-applications/me');expect(own.body.data.map((v:any)=>v.id)).toEqual([app.id]);expect((await PartnerApplication.findByPk(app.id)).businessName).toBe(payload.businessName);await photo(page,'pending-reload');return app;});
  if(isApi())await step('APPLICATION_INVALID_API','Missing/email/type/coordinates400; duplicate409; other owner list empty',async()=>{
    const before=await fixtures.snapshot();for(const patch of [{businessName:''},{email:'bad'},{businessType:'INVALID'},{latitude:91},{longitude:181}])expect((await api(page,'POST','/partner-applications',{...payload,...patch},other.token)).status).toBe(400);
    const duplicate=await api(page,'POST','/partner-applications',payload,c.token);expect(duplicate.status).toBe(409);expect(duplicate.body.code).toBe('ACTIVE_APPLICATION_EXISTS');expect((await api(page,'GET','/partner-applications/me',undefined,other.token)).body.data).toEqual([]);expect(await fixtures.snapshot()).toEqual(before);return {duplicate:duplicate.body.code,invalidVariants:5};
  });
  await step('CANCEL_ADMIN_DIALOGS','Cancel reason prompt or approval confirm causes no PATCH or DB change',async()=>{await openApplications(page,sa);const before=await fixtures.snapshot();const count=traffic.filter(v=>v.method==='PATCH').length;expect(await decisionUI(page,app,'REJECTED','unused','prompt')).toEqual(['prompt']);expect(await decisionUI(page,app,'APPROVED',undefined,'confirm')).toEqual(['confirm']);expect(traffic.filter(v=>v.method==='PATCH')).toHaveLength(count);expect(await fixtures.snapshot()).toEqual(before);await photo(page,'cancel-dialogs');});
});

test('A03 approval atomic persistence terminal retry and race',async({page})=>{
  const sa=await admin(page,'A03-SA'),c=await register(page,'A03-C');const {app}=await submitApi(page,c,'A03');
  await step('APPROVE_UI_DB','UI approval atomically creates one Business/member/PARTNER grant/audit',async()=>{await openApplications(page,sa);await decisionUI(page,app,'APPROVED');const state=await assertDecision(app.id,c.user.id,sa.user.id,'APPROVED',1);await page.reload();await expect(appRow(page,app.businessName)).toContainText('APPROVED');await photo(page,'admin-approved');await statusUI(page,c,app,'APPROVED');return state;});
  if(isApi())await step('TERMINAL_AND_CONCURRENT_APPROVAL','Terminal retry409; concurrent approval exactly one200/one409 and one graph',async()=>{
    const before=await fixtures.snapshot();const repeat=await decisionApi(page,sa,app.id,'APPROVED');expect(repeat.status).toBe(409);expect(repeat.body.code).toBe('APPLICATION_ALREADY_DECIDED');expect(await fixtures.snapshot()).toEqual(before);
    const raceUser=await register(page,'A03-RACE');const race=await submitApi(page,raceUser,'A03-RACE');const result=await Promise.all([decisionApi(page,sa,race.app.id,'APPROVED'),decisionApi(page,sa,race.app.id,'APPROVED')]);expect(result.map(v=>v.status).sort()).toEqual([200,409]);expect(result.find(v=>v.status===409)?.body.code).toBe('APPLICATION_ALREADY_DECIDED');const state=await assertDecision(race.app.id,raceUser.user.id,sa.user.id,'APPROVED',1);expect(await Business.count({where:{name:race.payload.businessName}})).toBe(1);return {statuses:result.map(v=>v.status),state};
  });
});

test('R05 granted role old token reload and real relogin',async({page})=>{
  const sa=await admin(page,'R05-SA'),c=await register(page,'R05-C');await login(page,c);const payload=application(c,'R05');await form(page,payload);const app=await submitUI(page,payload);const oldToken=await page.evaluate(()=>localStorage.getItem('travelgo_token'));
  await openApplications(page,sa);await decisionUI(page,app,'APPROVED');await assertDecision(app.id,c.user.id,sa.user.id,'APPROVED',1);
  await step('OLD_TOKEN_DB_ROLE','Old token /me returns DB PARTNER but partner API stays403',async()=>{const me=await api(page,'GET','/auth/me',undefined,oldToken);expect(me.body.data.roles).toContain('PARTNER');expect((await api(page,'GET','/partner/businesses',undefined,oldToken)).status).toBe(403);
    // Restore the actual pre-grant token to simulate the existing customer tab, then reload through real /me.
    await page.evaluate(token=>{localStorage.setItem('travelgo_token',token!);localStorage.removeItem('travelgo_user');},oldToken);await page.goto('/profile');await decline(page);await page.reload();await expect(page.getByText(c.email,{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('travelgo_user')!).roles)).toContain('PARTNER');expect(await page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBe(oldToken);expect((await api(page,'GET','/partner/businesses')).status).toBe(403);await photo(page,'old-token-role-mismatch');});
  await step('LOGOUT_RELOGIN','Real logout then UI login gets new PARTNER token and own Business200',async()=>{await logoutUI(page);const session=await login(page,c);expect(session.token).not.toBe(oldToken);expect(session.user.roles).toContain('PARTNER');await page.goto('/partner');await page.reload();await expect(page).toHaveURL(/\/partner$/);const businesses=await api(page,'GET','/partner/businesses');expect(businesses.status).toBe(200);const members=await BusinessMember.findAll({where:{userId:c.user.id}});expect(businesses.body.data.map((v:any)=>v.id)).toEqual(members.map((v:any)=>v.businessId));expect(businesses.body.data).toHaveLength(1);await photo(page,'partner-relogin');return {userId:c.user.id,businessId:members[0].businessId};});
});

test('A04 rejection needs-info reasons and later decision',async({page})=>{
  const sa=await admin(page,'A04-SA'),rejectUser=await register(page,'A04-REJECT'),needsUser=await register(page,'A04-NEEDS');const rejected=await submitApi(page,rejectUser,'A04-REJECT'),needs=await submitApi(page,needsUser,'A04-NEEDS');
  if(isApi())await step('INVALID_DECISIONS','Missing reason and invalid decision400 do not mutate',async()=>{const before=await fixtures.snapshot();for(const status of ['REJECTED','NEEDS_MORE_INFO']){const r=await decisionApi(page,sa,rejected.app.id,status);expect(r.status).toBe(400);expect(r.body.code).toBe('REASON_REQUIRED');}const invalid=await decisionApi(page,sa,rejected.app.id,'INVALID');expect(invalid.status).toBe(400);expect(invalid.body.code).toBe('INVALID_DECISION');expect(await fixtures.snapshot()).toEqual(before);});
  await independentStep(page,'REJECT_UI','Reject with reason persists/audits and grants no business or PARTNER',async()=>{const reason='SYNTHETIC TEST ONLY rejected';await openApplications(page,sa);await decisionUI(page,rejected.app,'REJECTED',reason);const state=await assertDecision(rejected.app.id,rejectUser.user.id,sa.user.id,'REJECTED',1);await photo(page,'admin-rejected');await statusUI(page,rejectUser,rejected.app,'REJECTED',reason);return state;});
  await independentStep(page,'NEEDS_INFO_UI','Needs-info persists with feedback and no business/grant',async()=>{const reason='SYNTHETIC TEST ONLY additional information';await openApplications(page,sa);await decisionUI(page,needs.app,'NEEDS_MORE_INFO',reason);const state=await assertDecision(needs.app.id,needsUser.user.id,sa.user.id,'NEEDS_MORE_INFO',1);await photo(page,'admin-needs-info');await statusUI(page,needsUser,needs.app,'NEEDS_MORE_INFO',reason);return state;});
  await step('DECIDE_NEEDS_INFO','SA can approve needs-info later; terminal rejected cannot be decided again',async()=>{await openApplications(page,sa);await decisionUI(page,needs.app,'APPROVED');const state=await assertDecision(needs.app.id,needsUser.user.id,sa.user.id,'APPROVED',2);await page.reload();await expect(appRow(page,needs.app.businessName)).toContainText('APPROVED');await statusUI(page,needsUser,needs.app,'APPROVED');if(isApi()){const before=await fixtures.snapshot();const repeat=await decisionApi(page,sa,rejected.app.id,'APPROVED');expect(repeat.status).toBe(409);expect(repeat.body.code).toBe('APPLICATION_ALREADY_DECIDED');expect(await fixtures.snapshot()).toEqual(before);}return state;});
});
