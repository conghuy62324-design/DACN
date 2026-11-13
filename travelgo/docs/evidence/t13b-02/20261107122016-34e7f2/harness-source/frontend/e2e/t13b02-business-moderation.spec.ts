import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { createRequire } from 'node:module';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
const require = createRequire(path.resolve('../backend/package.json'));
const { Fixtures, guard, schema, models, sequelize, write } = require('../backend/scripts/t13b02-support.cjs');
const { User, UserRole, BusinessMember, Business, AuditLog, Place, Tour, Ticket, BlogPost, Booking, Review } = models;
const resourceModels:any={places:Place,tours:Tour,tickets:Ticket,blogs:BlogPost};
let fixtures: any, info: TestInfo, checkpoints: any[], traffic: any[], consoleLog: any[], images: string[], sensitiveValues: Set<string>;
const root = process.env.T13B02_EVIDENCE!;
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
  if(token)sensitiveValues.add(token);if(body?.password)sensitiveValues.add(body.password);
  const result = await page.evaluate(async ({ method,endpoint,body,token }) => {
    const auth = token === undefined ? localStorage.getItem('travelgo_token') : token;
    const response = await fetch('/api'+endpoint, {method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
    return {status:response.status,body:await response.json()};
  }, {method,endpoint,body,token});
  if(result.body.data?.token)sensitiveValues.add(result.body.data.token);
  traffic.push({channel:'browser fetch → Vite proxy → real API',method,endpoint,request:redact(body),response:redact(result)});return result;
}
function response(page: Page, endpoint: string, method: string) {
  return page.waitForResponse(r => new URL(r.url()).pathname === '/api'+endpoint && r.request().method()===method);
}
async function photo(page: Page, label: string) {
  const initial=`${caseId()}-${label}`;const prefix=fs.existsSync(path.join(out(),initial+'.png'))?initial+'-'+images.length:initial;
  const mask=page.locator('tbody tr').filter({hasNot:page.getByText(/T13B02/)});
  for(const fullPage of [false,true]) { const name=`${prefix}${fullPage?'-full':''}.png`;await page.screenshot({path:path.join(out(),name),fullPage,mask:[mask,page.locator('article').filter({hasNot:page.getByText(/T13B02/)})]});images.push(name); }
  const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  expect.soft(size.scrollWidth,`${prefix} document overflow`).toBeLessThanOrEqual(size.width+1);
  checkpoints.push({id:`LAYOUT_${label}`,expected:'No document horizontal overflow; table may scroll within container',actual:size,status:size.scrollWidth<=size.width+1?'PASS':'FAIL'});
}
async function decline(page: Page) {
  const button=page.getByTestId('telemetry-decline');
  if(await button.waitFor({state:'visible',timeout:800}).then(()=>true).catch(()=>false)){const wait=response(page,'/intelligence/consent','PUT');await button.click();expect((await wait).status()).toBe(200);}
}
async function register(page: Page,label:string,extra:any={}) {
  await guard('T13-B-02 register fixture');const email=fixtures.email(label),password=randomBytes(20).toString('base64url')+'1a';
  const fullName=`T13B02 ${info.project.name} ${label}`;
  const result=await api(page,'POST','/auth/register',{fullName,email,password,phone:'0901234567',...extra},null);
  expect(result.status).toBe(201);await fixtures.discover();return {...result.body.data,email,password,fullName};
}
async function login(page: Page,person:any) {
  // Clear only this isolated test context as login setup; no R05 rerun.
  await page.evaluate(()=>{localStorage.removeItem('travelgo_token');localStorage.removeItem('travelgo_user');});
  await page.goto('/login');await page.locator('[name=email]').fill(person.email);await page.locator('[name=password]').fill(person.password);
  const wait=response(page,'/auth/login','POST');await page.getByRole('button',{name:'Đăng nhập ngay',exact:true}).click();
  const result=await wait;expect(result.status()).toBe(200);const session=(await result.json()).data;sensitiveValues.add(session.token);sensitiveValues.add(person.password);
  await expect.poll(()=>page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBe(session.token);
  await expect(page).not.toHaveURL(/\/login$/);return session;
}
test.beforeAll(async ({},worker)=>{await schema();fixtures=new Fixtures(root,worker.project.name);});
test.afterAll(async()=>{try{if(fixtures)await fixtures.cleanup();}finally{await sequelize.close();}});
test.beforeEach(async({page},testInfo)=>{
  info=testInfo;checkpoints=[];traffic=[];consoleLog=[];images=[];sensitiveValues=new Set();
  await page.context().tracing.start({screenshots:false,snapshots:false,sources:false});
  expect(fs.existsSync(path.join(root,'fingerprint-before.json'))).toBe(true);
  expect(createHash('sha256').update(fs.readFileSync(path.join(root,'case-manifest.json'))).digest('hex')).toBe(process.env.T13B02_MANIFEST_SHA256);
  await guard('T13-B-02 before fixture request');
  page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))traffic.push({channel:'browser network metadata',method:r.request().method(),endpoint:new URL(r.url()).pathname,status:r.status()});});
  page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleLog.push({type:m.type(),message:m.text().slice(0,600)});});
  page.on('pageerror',e=>consoleLog.push({type:'pageerror',message:e.message}));
  await page.goto('/');
  await step('ENV_IDENTITY','Proxy reaches this run exact guarded test database',async()=>{const r=await api(page,'GET','/__t13b02/identity',undefined,null);expect(r.status).toBe(200);expect(r.body.runId).toBe(process.env.T13B02_RUN_ID);expect(r.body.database).toBe('travelgo_ai_m0_test');expect(r.body.sentinel).toBe('PASS');expect(r.body.nodeEnv).toBe('test');expect(r.body.port).toBe(Number(process.env.PLAYWRIGHT_BACKEND_PORT));return r.body;});
});
test.afterEach(async({page},testInfo)=>{
  if(testInfo.status==='skipped'){await page.context().tracing.stop();return;}
  if(testInfo.errors.length&&!checkpoints.some(v=>v.status==='FAIL'))checkpoints.push({id:'ASSERTION_FAILURE',status:'FAIL',actual:testInfo.errors.map(e=>e.message)});
  try{await photo(page,'final');}catch(e:any){consoleLog.push({type:'evidence-error',message:e.message});}
  await fixtures.discover();const snapshot=await fixtures.snapshot();write(path.join(out(),`${caseId()}-db-final.json`),snapshot);
  let trace:any=null;
  if(testInfo.errors.length){
    // Raw trace exists only in a unique user temp directory. Credentials are removed before publishing the ZIP.
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'t13b02-trace-')),raw=path.join(temp,'raw.zip'),target=path.join(out(),`${caseId()}-trace-redacted.zip`);
    try{
      await page.context().tracing.stop({path:raw});
      const script=`import sys,json,zipfile\nsecrets=json.load(sys.stdin)\ncount=0\nwith zipfile.ZipFile(sys.argv[1]) as src, zipfile.ZipFile(sys.argv[2],'x',zipfile.ZIP_DEFLATED) as dst:\n for entry in src.infolist():\n  data=src.read(entry.filename)\n  for secret in secrets:\n   value=secret.encode('utf-8')\n   count+=data.count(value)\n   data=data.replace(value,b'[REDACTED]')\n  assert all(secret.encode('utf-8') not in data for secret in secrets)\n  dst.writestr(entry,data)\nprint(json.dumps({'entries':len(src.infolist()),'redactions':count,'credentialScan':'PASS','screenshots':False,'domSnapshots':False,'sources':False}))`;
      const sanitized=spawnSync('python',['-c',script,raw,target],{input:JSON.stringify([...sensitiveValues].filter(Boolean)),encoding:'utf8',windowsHide:true});
      expect(sanitized.status,sanitized.stderr).toBe(0);trace={file:path.basename(target),...JSON.parse(sanitized.stdout)};write(path.join(out(),`${caseId()}-trace-redaction.json`),trace);
      await testInfo.attach('redacted Playwright action/network trace',{path:target,contentType:'application/zip'});
    }finally{if(fs.existsSync(raw))fs.unlinkSync(raw);fs.rmdirSync(temp);}
  }else await page.context().tracing.stop();
  write(path.join(out(),`${caseId()}-results.json`),{id:caseId(),project:testInfo.project.name,channel:['R03','B06'].includes(caseId())?'A1':'U2+A1 where specified',viewport:page.viewportSize(),browser:page.context().browser()?.version(),mobileEmulation:testInfo.project.name==='mobile',status:testInfo.status==='passed'&&!testInfo.errors.length?'PASS':'FAIL',errors:testInfo.errors.map(e=>({message:e.message,stack:e.stack})),checkpoints,traffic,console:consoleLog,images,trace,dbSnapshot:`${caseId()}-db-final.json`});
});

const imageUrl='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#0f766e"/><text x="12" y="90" fill="white">T13B02 SYNTHETIC TEST ONLY</text></svg>').toString('base64');
async function actor(page:Page,label:string,role?:string){const person=await register(page,label);if(role){await fixtures.grant(person.user.id,role);const session=await api(page,'POST','/auth/login',{email:person.email,password:person.password},null);expect(session.status).toBe(200);Object.assign(person,session.body.data);}return person;}
async function graph(page:Page,two=false){
  const sa=await actor(page,`${caseId()}-SA`,'SUPER_ADMIN'),a=await actor(page,`${caseId()}-A`,'PARTNER'),b=await actor(page,`${caseId()}-B`,'PARTNER'),customer=await actor(page,`${caseId()}-C`);
  const ba=await fixtures.business(a.user.id,`${caseId()} A ${info.project.name}`),bb=await fixtures.business(b.user.id,`${caseId()} B ${info.project.name}`),a2=two?await fixtures.business(a.user.id,`${caseId()} A2 ${info.project.name}`):null;return {sa,a,b,customer,ba,bb,a2};
}
function payload(resource:string,businessId:string,label:string,extra:any={}){
  const title=`T13B02 ${label} ${randomUUID().slice(0,8)}`,city=`T13B02-${process.env.T13B02_RUN_ID!.slice(-6)}-${info.project.name}`;
  const data:any={places:{businessId,name:title,category:'hotel',summary:'SYNTHETIC TEST ONLY summary',description:'SYNTHETIC TEST ONLY description',city,province:city,address:'SYNTHETIC TEST ONLY address',latitude:16.05,longitude:108.20,priceFrom:123456,heroImage:imageUrl},
    tours:{businessId,title,destinationCity:city,departureCity:'SYNTHETIC departure',durationDays:2,durationNights:1,category:'culture',summary:'SYNTHETIC TEST ONLY summary',description:'SYNTHETIC TEST ONLY description',priceVND:123456,capacity:30,heroImage:imageUrl},
    tickets:{businessId,title,type:'bus',operator:'SYNTHETIC TEST ONLY operator',departureCity:city,arrivalCity:'SYNTHETIC arrival',departureTime:'2030-06-15T10:30',arrivalTime:'2030-06-15T12:30',price:123456,capacity:30,status:'ACTIVE',imageUrl},
    blogs:{businessId,title,excerpt:'SYNTHETIC TEST ONLY excerpt',content:'SYNTHETIC TEST ONLY content',destinationName:city,coverImage:imageUrl,tags:['SYNTHETIC','T13B02']}};
  return {...data[resource],...extra};
}
const nameOf=(v:any)=>v.name||v.title;
async function createApi(page:Page,resource:string,p:any,person:any){const r=await api(page,'POST',`/partner/${resource}`,p,person.token);expect(r.status).toBe(201);await fixtures.discover();return r.body.data;}
async function moderateApi(page:Page,g:any,resource:string,id:string,status:string,reason='SYNTHETIC TEST ONLY moderation'){const r=await api(page,'PATCH',`/admin/${resource}/${id}/status`,{status,reason},g.sa.token);expect(r.status).toBe(200);return r.body.data;}
async function createBooking(page:Page,g:any,resource:string,row:any){
  expect(fixtures.data.businesses).toContain(row.businessId);const type=resource==='places'?'hotel':resource==='tours'?'tour':'ticket';
  const r=await api(page,'POST','/bookings',{serviceType:type,serviceId:row.id,bookingDate:'2030-06-15',adultsCount:1,childrenCount:0,customerPhone:'0901234567',notes:'T13B02 SYNTHETIC prerequisite only'},g.customer.token);expect(r.status).toBe(201);await fixtures.discover();expect(r.body.data.bookingStatus).toBe('PENDING');expect(r.body.data.paymentStatus).toBe('unpaid');return r.body.data;
}
async function fillForm(page:Page,resource:string,p:any,isNew=true){
  const form=page.getByTestId(`partner-${resource}-form`);await expect(form).toBeVisible();
  if(isNew)await form.locator('[name=businessId]').selectOption(p.businessId);
  for(const [key,value]of Object.entries(p)){const field=form.locator(`[name="${key}"]`);if(key==='businessId'||!(await field.count()))continue;const tag=await field.evaluate(el=>el.tagName);if(tag==='SELECT')await field.selectOption(String(value));else await field.fill(Array.isArray(value)?value.join('\n'):String(value));}
}
async function saveUI(page:Page,resource:string,id?:string){
  const method=id?'PATCH':'POST',endpoint=`/partner/${resource}${id?'/'+id:''}`;
  expect(await page.getByTestId(`partner-${resource}-form`).evaluate((el:HTMLFormElement)=>el.checkValidity()),'Existing required fields must remain valid after reload').toBe(true);
  const wait=response(page,endpoint,method);await page.getByRole('button',{name:'Lưu nội dung',exact:true}).click();const r=await wait;expect(r.status()).toBe(id?200:201);const body=await r.json();traffic.push({channel:'UI form → real API',method,endpoint,request:redact(r.request().postDataJSON()),response:{status:r.status(),body:redact(body)}});await fixtures.discover();await expect(page).toHaveURL(new RegExp(`/partner/${resource}$`));return body.data;
}
async function createUI(page:Page,resource:string,p:any){await page.goto(`/partner/${resource}/new`);await fillForm(page,resource,p);return saveUI(page,resource);}
async function editUI(page:Page,resource:string,row:any){await page.goto(`/partner/${resource}/${row.id}/edit`);await expect(page.locator(`[name=${resource==='places'?'name':'title'}]`)).toHaveValue(nameOf(row));}
function listRow(page:Page,resource:string,row:any){return page.getByTestId(`partner-${resource}-row`).filter({has:page.getByText(nameOf(row),{exact:true})});}
async function listUI(page:Page,resource:string,row:any,status?:string){await page.goto(`/partner/${resource}`);await page.getByPlaceholder('Tìm theo tên…').fill(nameOf(row));await page.getByPlaceholder('Tìm theo tên…').press('Enter');if(status)await page.locator('main select').selectOption(status);await expect(listRow(page,resource,row)).toBeVisible();return listRow(page,resource,row);}
async function submitUIResource(page:Page,resource:string,row:any){const tr=await listUI(page,resource,row);const wait=response(page,`/partner/${resource}/${row.id}/submit`,'POST');await tr.getByRole('button',{name:'Gửi duyệt',exact:true}).click();const r=await wait;expect(r.status()).toBe(200);await expect(listRow(page,resource,row)).toContainText('PENDING');return (await r.json()).data;}
async function archiveUI(page:Page,resource:string,row:any){
  const tr=await listUI(page,resource,row);const before=(await resourceModels[resource].findByPk(row.id)).toJSON();page.once('dialog',dialog=>dialog.dismiss());await tr.getByRole('button',{name:`Ngừng hiển thị ${nameOf(row)}`,exact:true}).click();expect((await resourceModels[resource].findByPk(row.id)).toJSON()).toEqual(before);
  const wait=response(page,`/partner/${resource}/${row.id}`,'DELETE');page.once('dialog',dialog=>dialog.accept());await tr.getByRole('button',{name:`Ngừng hiển thị ${nameOf(row)}`,exact:true}).click();expect((await wait).status()).toBe(200);await page.reload();await expect(listRow(page,resource,row)).toContainText(resource==='tickets'?'INACTIVE':'SUSPENDED');
  const db=await resourceModels[resource].findByPk(row.id);expect(db).toBeTruthy();expect(db.status).toBe(resource==='tickets'?'INACTIVE':'SUSPENDED');
}
async function publicState(page:Page,resource:string,row:any,status:string){
  const visible=resource==='tickets'?status==='ACTIVE':status==='APPROVED';const detail=await api(page,'GET',`/${resource}/${row.id}`,undefined,null);expect(detail.status,`${resource} public detail ${status}`).toBe(visible?200:404);
  for(const queryStatus of ['', '&status=DRAFT']){const result=await api(page,'GET',`/${resource}?search=${encodeURIComponent(nameOf(row))}${queryStatus}`,undefined,null);expect(result.status).toBe(200);const items=Array.isArray(result.body.data)?result.body.data:result.body.data.items;expect(items.some((v:any)=>v.id===row.id),`${resource} public list ${status}${queryStatus}`).toBe(visible);}
}
async function moderateUI(page:Page,g:any,resource:string,row:any,status:string){
  await login(page,g.sa);await page.goto(`/admin/${resource}/${row.id}`);await expect(page.locator('div.fixed.inset-0').getByRole('heading',{name:nameOf(row),exact:true})).toBeVisible();const before=(await resourceModels[resource].findByPk(row.id)).status;
  const reason='SYNTHETIC TEST ONLY '+status;
  if(status==='REJECTED'){const snapshot=await fixtures.snapshot();await page.getByRole('button',{name:'Từ chối',exact:true}).click();await expect(page.getByText('Vui lòng nhập lý do từ chối.',{exact:true})).toBeVisible();expect(await fixtures.snapshot()).toEqual(snapshot);}
  await page.getByPlaceholder('Bắt buộc khi từ chối').fill(reason);const wait=response(page,`/admin/${resource}/${row.id}/status`,'PATCH');await page.getByRole('button',{name:status==='REJECTED'?'Từ chối':status==='APPROVED'?'Phê duyệt':'Tạm ngưng',exact:true}).click();const r=await wait;expect(r.status()).toBe(200);traffic.push({channel:'Admin UI → API',endpoint:`/admin/${resource}/${row.id}/status`,request:{status,reason},response:redact(await r.json())});
  await page.reload();await expect(page.locator('div.fixed.inset-0').getByRole('heading',{name:nameOf(row),exact:true})).toBeVisible();const db=await resourceModels[resource].findByPk(row.id);expect(db.status).toBe(status);
  const entity={places:'Place',tours:'Tour',blogs:'BlogPost'}[resource];const audits=await AuditLog.findAll({where:{entityType:entity,entityId:row.id},order:[['createdAt','DESC']]});expect(audits[0].actorUserId).toBe(g.sa.user.id);expect(audits[0].previousData.status).toBe(before);expect(audits[0].newData.status).toBe(status);expect(audits[0].reason).toBe(reason);await photo(page,`${resource}-${status.toLowerCase()}`);
}
async function denied(page:Page,person:any,method:string,endpoint:string,body?:any,code?:string){
  const before=await fixtures.snapshot();const result=await api(page,method,endpoint,body,person.token);const after=await fixtures.snapshot();
  if(['POST','PATCH','DELETE'].includes(method)&&JSON.stringify(before)!==JSON.stringify(after)){write(path.join(out(),`${caseId()}-unsafe-mutation.json`),{method,endpoint,before,after,result:redact(result),action:'Stopped this fixture branch; no non-fixture target used'});throw new Error(`SECURITY: unauthorized mutation changed fixture state ${method} ${endpoint}`);}
  expect(after).toEqual(before);expect(result.status,`${method} ${endpoint}`).toBe(403);if(code)expect(result.body.code).toBe(code);return result;
}

test('R03 cross Business resource and Booking ownership',async({page})=>{
  test.skip(!isApi(),'A1 once desktop');const g=await graph(page);const sets:any[]=[];
  for(const [person,business]of [[g.a,g.ba],[g.b,g.bb]]){const set:any={person,business,items:{}};for(const resource of ['places','tours','tickets','blogs'])set.items[resource]=await createApi(page,resource,payload(resource,business.id,`R03-${resource}`),person);await moderateApi(page,g,'places',set.items.places.id,'APPROVED');set.booking=await createBooking(page,g,'places',set.items.places);sets.push(set);}
  for(const [actorSet,target]of [[sets[0],sets[1]],[sets[1],sets[0]]])await step(`CROSS_${actorSet.person.user.id.slice(0,6)}`,'Foreign existing resources/Booking403, no mutation/leak; list membership and own owner immutable',async()=>{
    const person=actorSet.person;
    for(const resource of ['places','tours','tickets','blogs']){const targetRow=target.items[resource];await denied(page,person,'GET',`/partner/${resource}/${targetRow.id}`);await denied(page,person,'PATCH',`/partner/${resource}/${targetRow.id}`,resource==='places'?{name:'UNAUTHORIZED SYNTHETIC'}:{title:'UNAUTHORIZED SYNTHETIC'});await denied(page,person,'DELETE',`/partner/${resource}/${targetRow.id}`);if(resource!=='tickets')await denied(page,person,'POST',`/partner/${resource}/${targetRow.id}/submit`,{});await denied(page,person,'POST',`/partner/${resource}`,payload(resource,target.business.id,'R03-FOREIGN'));
      const list=await api(page,'GET',`/partner/${resource}?businessId=${target.business.id}&limit=100`,undefined,person.token);expect(list.status).toBe(200);expect(list.body.data.items.every((v:any)=>v.businessId===actorSet.business.id)).toBe(true);expect(list.body.data.items.some((v:any)=>v.id===targetRow.id)).toBe(false);
      // Place is APPROVED for Booking setup, so use another own DRAFT for ownership-field spoof.
      const own=resource==='places'?await createApi(page,resource,payload(resource,actorSet.business.id,'R03-OWN'),person):actorSet.items[resource];
      const patch=await api(page,'PATCH',`/partner/${resource}/${own.id}`,{businessId:target.business.id,...(resource==='places'?{name:nameOf(own)}:{title:nameOf(own)})},person.token);expect(patch.status).toBe(200);expect((await resourceModels[resource].findByPk(own.id)).businessId).toBe(actorSet.business.id);
    }
    await denied(page,person,'GET',`/partner/businesses/${target.business.id}`);await denied(page,person,'GET',`/partner/dashboard?businessId=${target.business.id}`);
    await denied(page,person,'GET',`/partner/bookings?businessId=${target.business.id}`);await denied(page,person,'GET',`/partner/businesses/${target.business.id}/bookings`);await denied(page,person,'GET',`/partner/bookings/${target.booking.id}`);await denied(page,person,'PATCH',`/partner/bookings/${target.booking.id}/status`,{businessId:target.business.id,status:'CONFIRMED'});
    await denied(page,person,'PATCH',`/partner/bookings/${actorSet.booking.id}/status`,{businessId:target.business.id,status:'CONFIRMED'},'BOOKING_ACCESS_DENIED');
    return {actor:person.user.id,foreignBusiness:target.business.id,foreignBooking:target.booking.id};
  });
});

test('A05 real resource moderation public visibility and retention',async({page})=>{
  const g=await graph(page);
  for(const resource of ['places','tours','blogs'])await independentStep(page,`MODERATE_${resource}`,'DRAFT/PENDING/REJECTED/APPROVED/SUSPENDED public contract, real UI decisions/audit and dependency retention',async()=>{
    const row=await createApi(page,resource,payload(resource,g.ba.id,`A05-${resource}`),g.a);await publicState(page,resource,row,'DRAFT');
    await login(page,g.a);await submitUIResource(page,resource,row);await publicState(page,resource,row,'PENDING');
    expect((await api(page,'PATCH',`/partner/${resource}/${row.id}`,resource==='places'?{name:nameOf(row)}:{title:nameOf(row)},g.a.token)).status).toBe(409);
    await moderateUI(page,g,resource,row,'REJECTED');await publicState(page,resource,row,'REJECTED');
    await login(page,g.a);await editUI(page,resource,row);await page.locator(`textarea[name=${resource==='blogs'?'content':'description'}]`).fill('SYNTHETIC TEST ONLY revised after rejection');await saveUI(page,resource,row.id);await submitUIResource(page,resource,row);
    await moderateUI(page,g,resource,row,'APPROVED');await publicState(page,resource,row,'APPROVED');expect((await api(page,'PATCH',`/partner/${resource}/${row.id}`,resource==='places'?{name:nameOf(row)}:{title:nameOf(row)},g.a.token)).status).toBe(409);
    let booking:any=null,review:any=null;if(resource!=='blogs'){booking=await createBooking(page,g,resource,row);if(resource==='places')review=await fixtures.review(g.customer.user.id,row.id);}
    const dependencyBefore={booking:booking?(await Booking.findByPk(booking.id)).toJSON():null,review:review?(await Review.findByPk(review)).toJSON():null};await moderateUI(page,g,resource,row,'SUSPENDED');await publicState(page,resource,row,'SUSPENDED');expect({booking:booking?(await Booking.findByPk(booking.id)).toJSON():null,review:review?(await Review.findByPk(review)).toJSON():null}).toEqual(dependencyBefore);write(path.join(out(),`A05-${resource}-retention.json`),{before:dependencyBefore,after:{booking:booking?(await Booking.findByPk(booking.id)).toJSON():null,review:review?(await Review.findByPk(review)).toJSON():null},same:true});
    if(isApi()){const before=await fixtures.snapshot();for(const body of [{status:'REJECTED'},{status:'INVALID'},{status:'DRAFT'}])expect((await api(page,'PATCH',`/admin/${resource}/${row.id}/status`,body,g.sa.token)).status).toBe(400);expect(await fixtures.snapshot()).toEqual(before);await moderateApi(page,g,resource,row.id,'DRAFT');await publicState(page,resource,row,'DRAFT');}
    return {id:row.id,resource,bookingId:booking?.id,reviewId:review};
  });
});

test('B01 dashboard and lists reflect Business membership',async({page})=>{
  const g=await graph(page,true);const empty=await actor(page,'B01-EMPTY','PARTNER');
  const hotel=await createApi(page,'places',payload('places',g.ba.id,'B01-A'),g.a);await moderateApi(page,g,'places',hotel.id,'APPROVED');await createBooking(page,g,'places',hotel);
  const second=await createApi(page,'places',payload('places',g.a2.id,'B01-A2'),g.a);await moderateApi(page,g,'places',second.id,'APPROVED');await createBooking(page,g,'places',second);await createBooking(page,g,'places',second);
  for(const resource of ['places','tours','tickets','blogs']){await createApi(page,resource,payload(resource,g.ba.id,`B01-A-${resource}`),g.a);await createApi(page,resource,payload(resource,g.bb.id,`B01-B-${resource}`),g.b);}
  await login(page,g.a);await page.goto('/partner');await expect(page.getByRole('heading',{name:'Tổng quan cơ sở',exact:true})).toBeVisible();
  await step('MEMBERSHIP_METRICS','Select both own businesses, metrics match SQL and lists exclude foreign Business',async()=>{
    for(const business of [g.ba,g.a2]){await page.locator('main select').selectOption(business.id);await expect(page.getByRole('heading',{name:business.name,exact:true})).toBeVisible();const result=await api(page,'GET',`/partner/dashboard?businessId=${business.id}`);expect(result.status).toBe(200);const data=result.body.data;expect(data.businesses.map((v:any)=>v.id).sort()).toEqual([g.ba.id,g.a2.id].sort());expect(data.selectedBusiness.id).toBe(business.id);expect(data.metrics.source).toBe('DATABASE');for(const [key,model]of Object.entries(resourceModels) as any)expect(data.metrics[key]).toBe(await model.count({where:{businessId:business.id}}));for(const [key,status]of [['totalBookings',null],['pendingBookings','PENDING'],['confirmedBookings','CONFIRMED'],['completedBookings','COMPLETED']] as any)expect(data.metrics[key]).toBe(await Booking.count({where:{businessId:business.id,...(status?{bookingStatus:status}:{})}}));expect(data.metrics.revenue).toBe(Number(await Booking.sum('totalAmount',{where:{businessId:business.id,bookingStatus:'COMPLETED'}})||0));await photo(page,`dashboard-${business.id.slice(0,6)}`);}
    await page.reload();await expect.poll(async()=>[g.ba.id,g.a2.id].includes(await page.locator('main select').inputValue())).toBe(true);
    for(const resource of ['places','tours','tickets','blogs']){const list=await api(page,'GET',`/partner/${resource}?limit=100`);const expected=await resourceModels[resource].findAll({where:{businessId:[g.ba.id,g.a2.id]},attributes:['id']});expect(list.body.data.items.map((v:any)=>v.id).sort()).toEqual(expected.map((v:any)=>v.id).sort());}
    expect((await api(page,'GET',`/partner/dashboard?businessId=${g.bb.id}`)).status).toBe(403);
  });
  await step('EMPTY_MEMBERSHIP','PARTNER without membership has empty database-backed dashboard and lists',async()=>{await login(page,empty);await page.goto('/partner');await expect(page.getByRole('heading',{name:'Chưa có cơ sở được cấp quyền',exact:true})).toBeVisible();const result=await api(page,'GET','/partner/dashboard');expect(result.body.data).toEqual({businesses:[],selectedBusiness:null,metrics:null});for(const resource of ['places','tours','tickets','blogs'])expect((await api(page,'GET',`/partner/${resource}`)).body.data.items).toEqual([]);await photo(page,'empty-membership');});
});

test('B02 Place UI CRUD reload zero price submit archive',async({page})=>{
  const g=await graph(page);await login(page,g.a);
  for(const category of ['hotel','restaurant','attraction']){
    let row:any;await step(`CREATE_EDIT_${category}`,'Real form creates own DRAFT and edits same ID, persists and lists correctly',async()=>{const p=payload('places',g.ba.id,`B02-${category}`,{category,priceFrom:category==='hotel'?0:123456});row=await createUI(page,'places',p);expect(row.businessId).toBe(g.ba.id);expect(row.status).toBe('DRAFT');await editUI(page,'places',row);await page.locator('textarea[name=description]').fill('SYNTHETIC TEST ONLY edited Place content');row=await saveUI(page,'places',row.id);await editUI(page,'places',row);await page.reload();await expect(page.locator('textarea[name=description]')).toHaveValue('SYNTHETIC TEST ONLY edited Place content');const read=await api(page,'GET',`/partner/places/${row.id}`);expect(read.body.data.id).toBe(row.id);expect(Number((await Place.findByPk(row.id)).priceFrom)).toBe(p.priceFrom);await photo(page,`place-${category}-edit`);});
    if(category==='hotel')await independentStep(page,'ZERO_PRICE','Reloaded priceFrom=0 displays0 and no-op save persists0',async()=>{const displayed=await page.locator('[name=priceFrom]').inputValue();write(path.join(out(),'B02-zero-input.json'),{id:row.id,expected:'0',actual:displayed,databasePrice:Number((await Place.findByPk(row.id)).priceFrom)});await photo(page,'zero-price');expect(displayed).toBe('0');});
    await step(`SAVE_SUBMIT_ARCHIVE_${category}`,'Save/read/list/submit PENDING and archive retain row; cancel does not mutate',async()=>{row=await saveUI(page,'places',row.id);if(category==='hotel')expect(Number((await Place.findByPk(row.id)).priceFrom)).toBe(0);await listUI(page,'places',row,'DRAFT');await submitUIResource(page,'places',row);await page.reload();await expect(listRow(page,'places',row)).toContainText('PENDING');await archiveUI(page,'places',row);await publicState(page,'places',row,'SUSPENDED');await photo(page,`place-${category}-archived`);});
  }
});

test('B03 Tour UI CRUD zero nights snapshot preservation',async({page})=>{
  const g=await graph(page);await login(page,g.a);let row:any;
  await step('TOUR_CREATE_EDIT','Tour DRAFT real form, same ID on edits, counts/prices/capacity persisted',async()=>{row=await createUI(page,'tours',payload('tours',g.ba.id,'B03-TOUR'));await editUI(page,'tours',row);await page.locator('textarea[name=description]').fill('SYNTHETIC TEST ONLY revised Tour');row=await saveUI(page,'tours',row.id);await editUI(page,'tours',row);await page.reload();await expect(page.locator('textarea[name=description]')).toHaveValue('SYNTHETIC TEST ONLY revised Tour');const db=await Tour.findByPk(row.id);expect(db.durationDays).toBe(2);expect(db.durationNights).toBe(1);expect(db.capacity).toBe(30);expect(Number(db.priceVND)).toBe(123456);await photo(page,'tour-edit');});
  await step('BOOKING_SNAPSHOT_AND_ARCHIVE','Changing fixture catalog price never reprices stored Booking; submit/archive retain FK rows',async()=>{await moderateApi(page,g,'tours',row.id,'APPROVED');const booking=await createBooking(page,g,'tours',row);const before=(await Booking.findByPk(booking.id)).toJSON();await moderateApi(page,g,'tours',row.id,'DRAFT');await editUI(page,'tours',row);await page.locator('[name=priceVND]').fill('222222');row=await saveUI(page,'tours',row.id);expect((await Booking.findByPk(booking.id)).toJSON()).toEqual(before);await submitUIResource(page,'tours',row);await archiveUI(page,'tours',row);expect((await Booking.findByPk(booking.id)).toJSON()).toEqual(before);write(path.join(out(),'B03-booking-preservation.json'),{before,after:(await Booking.findByPk(booking.id)).toJSON(),same:true});await photo(page,'tour-archived');});
  let zero:any;await step('ZERO_NIGHTS_CREATE','1 day/0 nights is accepted and stored as0',async()=>{zero=await createUI(page,'tours',payload('tours',g.ba.id,'B03-ZERO',{durationDays:1,durationNights:0}));expect((await Tour.findByPk(zero.id)).durationNights).toBe(0);await editUI(page,'tours',zero);await page.reload();});
  await independentStep(page,'ZERO_NIGHTS_RELOAD_SAVE','0 nights remains displayed0 and required field allows a no-op save',async()=>{const field=page.locator('[name=durationNights]');const input=await field.inputValue(),valid=await field.evaluate((el:HTMLInputElement)=>el.checkValidity());write(path.join(out(),'B03-zero-nights-input.json'),{id:zero.id,expectedInput:'0',actualInput:input,valid,databaseNights:(await Tour.findByPk(zero.id)).durationNights});await photo(page,'zero-nights');expect(input).toBe('0');expect(valid).toBe(true);await saveUI(page,'tours',zero.id);expect((await Tour.findByPk(zero.id)).durationNights).toBe(0);});
  await step('ZERO_SUBMIT_ARCHIVE','Independent list submit/archive remain executable without editing around zero-field failure',async()=>{await submitUIResource(page,'tours',zero);await archiveUI(page,'tours',zero);expect((await Tour.findByPk(zero.id)).durationNights).toBe(0);await photo(page,'zero-tour-archived');});
});

test('B04 Ticket UI ACTIVE edit timestamps and INACTIVE archive',async({page})=>{
  const g=await graph(page);await login(page,g.a);let row:any;
  await step('TICKET_CREATE','Real Ticket form creates ACTIVE with correct seats/price, not a moderation draft',async()=>{row=await createUI(page,'tickets',payload('tickets',g.ba.id,'B04-TICKET'));const db=await Ticket.findByPk(row.id);expect(db.status).toBe('ACTIVE');expect(db.capacity).toBe(30);expect(db.availableSeats).toBe(30);expect(Number(db.price)).toBe(123456);await publicState(page,'tickets',row,'ACTIVE');});
  await independentStep(page,'TIMESTAMP_NOOP_SAVE','Open/reload/save without edits preserves departureTime and arrivalTime instants',async()=>{const before=(await Ticket.findByPk(row.id)).toJSON();const apiBefore=await api(page,'GET',`/partner/tickets/${row.id}`);await editUI(page,'tickets',row);await page.reload();await expect(page.locator('[name=departureTime]')).not.toHaveValue('');const inputs={departureTime:await page.locator('[name=departureTime]').inputValue(),arrivalTime:await page.locator('[name=arrivalTime]').inputValue()};await photo(page,'ticket-noop-before');await saveUI(page,'tickets',row.id);const after=(await Ticket.findByPk(row.id)).toJSON();const apiAfter=await api(page,'GET',`/partner/tickets/${row.id}`);write(path.join(out(),'B04-timestamp-before-after.json'),{browserTimezone:await page.evaluate(()=>Intl.DateTimeFormat().resolvedOptions().timeZone),serverTimezone:process.env.TZ,inputs,before,after,apiBefore:redact(apiBefore),apiAfter:redact(apiAfter),deltaDepartureMs:new Date(after.departureTime).getTime()-new Date(before.departureTime).getTime()});expect(new Date(after.departureTime).toISOString()).toBe(new Date(before.departureTime).toISOString());expect(new Date(after.arrivalTime).toISOString()).toBe(new Date(before.arrivalTime).toISOString());});
  await step('TICKET_ARCHIVE','Archive is soft INACTIVE and public detail404; Ticket has no submit moderation API',async()=>{if(isApi()){const diagnostic=await api(page,'POST',`/partner/tickets/${row.id}/submit`,{});expect(diagnostic.status).toBe(404);}await archiveUI(page,'tickets',row);await publicState(page,'tickets',row,'INACTIVE');await photo(page,'ticket-inactive');});
});

test('B05 Blog UI CRUD reload submit archive and authorship',async({page})=>{
  const g=await graph(page);await login(page,g.a);let row:any;
  await step('BLOG_CREATE_EDIT','Business Blog DRAFT, server author/business and same ID survive edit/reload',async()=>{row=await createUI(page,'blogs',payload('blogs',g.ba.id,'B05-BLOG'));expect(row.status).toBe('DRAFT');expect(row.authorId).toBe(g.a.user.id);expect(row.businessId).toBe(g.ba.id);await editUI(page,'blogs',row);await page.locator('[name=content]').fill('SYNTHETIC TEST ONLY new Blog content\nSecond synthetic paragraph');const id=row.id;row=await saveUI(page,'blogs',id);expect(row.id).toBe(id);await editUI(page,'blogs',row);await page.reload();await expect(page.locator('[name=content]')).toHaveValue('SYNTHETIC TEST ONLY new Blog content\nSecond synthetic paragraph');expect((await BlogPost.findByPk(id)).authorId).toBe(g.a.user.id);await photo(page,'blog-edited');});
  await step('BLOG_SUBMIT_ARCHIVE','UI submit PENDING then soft archive SUSPENDED; content/author/business remain',async()=>{const before=(await BlogPost.findByPk(row.id)).toJSON();await submitUIResource(page,'blogs',row);await archiveUI(page,'blogs',row);const after=(await BlogPost.findByPk(row.id)).toJSON();for(const key of ['content','authorId','authorName','businessId'])expect(after[key]).toEqual(before[key]);await publicState(page,'blogs',row,'SUSPENDED');await photo(page,'blog-archived');});
});

test('B06 permission matrix validation locked states and Booking alias',async({page})=>{
  test.skip(!isApi(),'A1 once desktop');const g=await graph(page);const businessOnly=await actor(page,'B06-BUS','PARTNER'),bookingsOnly=await actor(page,'B06-BOOK','PARTNER'),none=await actor(page,'B06-NONE','PARTNER');await fixtures.member(businessOnly.user.id,g.ba.id,['MANAGE_BUSINESS']);await fixtures.member(bookingsOnly.user.id,g.ba.id,['MANAGE_BOOKINGS']);await fixtures.member(none.user.id,g.ba.id,[]);
  const items:any={};for(const resource of ['places','tours','tickets','blogs'])items[resource]=await createApi(page,resource,payload(resource,g.ba.id,`B06-${resource}`),g.a);
  const hotel=await createApi(page,'places',payload('places',g.ba.id,'B06-BOOKING'),g.a);await moderateApi(page,g,'places',hotel.id,'APPROVED');const booking=await createBooking(page,g,'places',hotel);
  await step('MANAGE_BUSINESS_GATES','Create/archive and Place/Tour/Ticket update require MANAGE_BUSINESS',async()=>{for(const member of [bookingsOnly,none])for(const resource of ['places','tours','tickets','blogs']){await denied(page,member,'POST',`/partner/${resource}`,payload(resource,g.ba.id,'B06-DENIED'));await denied(page,member,'DELETE',`/partner/${resource}/${items[resource].id}`);if(resource!=='blogs')await denied(page,member,'PATCH',`/partner/${resource}/${items[resource].id}`,resource==='places'?{priceFrom:123}:{title:nameOf(items[resource])});}
    for(const resource of ['places','tours','tickets','blogs']){const created=await createApi(page,resource,payload(resource,g.ba.id,'B06-BUS-POSITIVE'),businessOnly);expect((await api(page,'DELETE',`/partner/${resource}/${created.id}`,undefined,businessOnly.token)).status).toBe(200);}
  });
  await step('MANAGE_BOOKINGS_GATES','New Booking list/get/status deny missing MANAGE_BOOKINGS and preserve rows',async()=>{for(const member of [businessOnly,none]){await denied(page,member,'GET',`/partner/bookings?businessId=${g.ba.id}`);await denied(page,member,'GET',`/partner/bookings/${booking.id}`);await denied(page,member,'PATCH',`/partner/bookings/${booking.id}/status`,{businessId:g.ba.id,status:'CONFIRMED'});}expect((await api(page,'GET',`/partner/bookings?businessId=${g.ba.id}`,undefined,bookingsOnly.token)).status).toBe(200);expect((await api(page,'GET',`/partner/bookings/${booking.id}`,undefined,bookingsOnly.token)).status).toBe(200);});
  await step('VALIDATION_AND_LOCKED','Negative prices/capacity/coordinates/invalid Ticket departure400 and locked updates409 never mutate',async()=>{
    const invalids:any[]=[['places',{priceFrom:-1}],['places',{latitude:91}],['places',{longitude:181}],['tours',{priceVND:-1}],['tours',{capacity:-1}],['tours',{durationDays:0}],['tickets',{price:-1}],['tickets',{capacity:-1}],['tickets',{departureTime:'not-a-date'}],['blogs',{title:''}]];
    for(const [resource,patch]of invalids){const before=await fixtures.snapshot();const created=await api(page,'POST',`/partner/${resource}`,payload(resource,g.ba.id,'B06-INVALID',patch),g.a.token);expect(created.status).toBe(400);expect(created.body.code).toBe('VALIDATION_ERROR');if(resource!=='blogs'){const updated=await api(page,'PATCH',`/partner/${resource}/${items[resource].id}`,patch,g.a.token);expect(updated.status).toBe(400);expect(updated.body.code).toBe('VALIDATION_ERROR');}expect(await fixtures.snapshot()).toEqual(before);}
    for(const resource of ['places','tours','blogs']){expect((await api(page,'POST',`/partner/${resource}/${items[resource].id}/submit`,{},g.a.token)).status).toBe(200);for(const status of ['PENDING','APPROVED']){if(status==='APPROVED')await moderateApi(page,g,resource,items[resource].id,status);const before=await fixtures.snapshot();expect((await api(page,'PATCH',`/partner/${resource}/${items[resource].id}`,resource==='places'?{name:nameOf(items[resource])}:{title:nameOf(items[resource])},g.a.token)).status).toBe(409);expect(await fixtures.snapshot()).toEqual(before);}}
  });
  await step('GAP03_CHARACTERIZATION','Record membership-only submit and Blog update without imposing a new MANAGE_BUSINESS policy',async()=>{const behavior:any[]=[];for(const resource of ['places','tours','blogs']){const row=await createApi(page,resource,payload(resource,g.ba.id,'B06-CHAR'),g.a);if(resource==='blogs'){const updated=await api(page,'PATCH',`/partner/blogs/${row.id}`,{content:'SYNTHETIC TEST ONLY membership update'},none.token);behavior.push({operation:'Blog update',status:updated.status});expect(updated.status).toBe(200);}const submitted=await api(page,'POST',`/partner/${resource}/${row.id}/submit`,{},none.token);behavior.push({operation:`${resource} submit`,status:submitted.status});expect(submitted.status).toBe(200);}return {classification:'CHARACTERIZATION per approved GAP-03, not a newly invented permission requirement',behavior};});
  await independentStep(page,'LEGACY_BOOKING_ALIAS','Legacy alias must require MANAGE_BOOKINGS; MANAGE_BUSINESS alone403 and no returned private Booking',async()=>{const before=await fixtures.snapshot();const result=await api(page,'GET',`/partner/businesses/${g.ba.id}/bookings`,undefined,businessOnly.token);expect(await fixtures.snapshot()).toEqual(before);write(path.join(out(),'B06-alias-permission.json'),{expectedStatus:403,actor:businessOnly.user.id,permissions:['MANAGE_BUSINESS'],businessId:g.ba.id,fixtureBookingId:booking.id,response:redact(result),noMutation:true,safety:'No further alias escalation or mutation after this probe; target contains fixture-only Bookings'});expect(result.status).toBe(403);});
});

