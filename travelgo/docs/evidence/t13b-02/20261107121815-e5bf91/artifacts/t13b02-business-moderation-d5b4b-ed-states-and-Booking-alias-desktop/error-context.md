# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t13b02-business-moderation.spec.ts >> B06 permission matrix validation locked states and Booking alias
- Location: e2e\t13b02-business-moderation.spec.ts:244:1

# Error details

```
Error: LEGACY_BOOKING_ALIAS: expect(received).toBe(expected) // Object.is equality

Expected: 403
Received: 200

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
  9   | const { Fixtures, guard, schema, models, sequelize, write } = require('../backend/scripts/t13b02-support.cjs');
  10  | const { User, UserRole, BusinessMember, Business, AuditLog, Place, Tour, Ticket, BlogPost, Booking, Review } = models;
  11  | const resourceModels:any={places:Place,tours:Tour,tickets:Ticket,blogs:BlogPost};
  12  | let fixtures: any, info: TestInfo, checkpoints: any[], traffic: any[], consoleLog: any[], images: string[], sensitiveValues: Set<string>;
  13  | const root = process.env.T13B02_EVIDENCE!;
  14  | const out = () => path.join(root, info.project.name);
  15  | const caseId = () => info.title.split(' ')[0];
  16  | const isApi = () => info.project.name === 'desktop';
  17  | function redact(value: any): any {
  18  |   if (Array.isArray(value)) return value.map(redact);
  19  |   if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,v]) => [key,/token|password|authorization|secret/i.test(key) ? '[REDACTED]' : redact(v)]));
  20  |   return value;
  21  | }
  22  | async function step(id: string, expected: string, fn: () => Promise<any>) {
  23  |   const record: any = { id, expected, startedAt: new Date().toISOString(), status: 'NOT RUN' }; checkpoints.push(record);
  24  |   try { const value = await test.step(id, fn); record.status = 'PASS'; if(value !== undefined)record.actual = redact(value); return value; }
  25  |   catch(e: any) { record.status = 'FAIL'; record.actual = e.message; throw e; }
  26  |   finally { record.finishedAt = new Date().toISOString(); }
  27  | }
  28  | async function independentStep(page:Page,id:string,expected:string,fn:()=>Promise<any>) {
> 29  |   try {return await step(id,expected,fn);}catch(e:any){await photo(page,`${id.toLowerCase()}-failure`);expect.soft(false,`${id}: ${e.message}`).toBe(true);}
      |                                                                                                                                                 ^ Error: LEGACY_BOOKING_ALIAS: expect(received).toBe(expected) // Object.is equality
  30  | }
  31  | async function api(page: Page, method: string, endpoint: string, body?: any, token?: string | null) {
  32  |   if(token)sensitiveValues.add(token);if(body?.password)sensitiveValues.add(body.password);
  33  |   const result = await page.evaluate(async ({ method,endpoint,body,token }) => {
  34  |     const auth = token === undefined ? localStorage.getItem('travelgo_token') : token;
  35  |     const response = await fetch('/api'+endpoint, {method,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  36  |     return {status:response.status,body:await response.json()};
  37  |   }, {method,endpoint,body,token});
  38  |   if(result.body.data?.token)sensitiveValues.add(result.body.data.token);
  39  |   traffic.push({channel:'browser fetch → Vite proxy → real API',method,endpoint,request:redact(body),response:redact(result)});return result;
  40  | }
  41  | function response(page: Page, endpoint: string, method: string) {
  42  |   return page.waitForResponse(r => new URL(r.url()).pathname === '/api'+endpoint && r.request().method()===method);
  43  | }
  44  | async function photo(page: Page, label: string) {
  45  |   const initial=`${caseId()}-${label}`;const prefix=fs.existsSync(path.join(out(),initial+'.png'))?initial+'-'+images.length:initial;
  46  |   const mask=page.locator('tbody tr').filter({hasNot:page.getByText(/T13B02 SYNTHETIC/)});
  47  |   for(const fullPage of [false,true]) { const name=`${prefix}${fullPage?'-full':''}.png`;await page.screenshot({path:path.join(out(),name),fullPage,mask:[mask,page.locator('article').filter({hasNot:page.getByText(/T13B02/)})]});images.push(name); }
  48  |   const size=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  49  |   expect.soft(size.scrollWidth,`${prefix} document overflow`).toBeLessThanOrEqual(size.width+1);
  50  |   checkpoints.push({id:`LAYOUT_${label}`,expected:'No document horizontal overflow; table may scroll within container',actual:size,status:size.scrollWidth<=size.width+1?'PASS':'FAIL'});
  51  | }
  52  | async function decline(page: Page) {
  53  |   const button=page.getByTestId('telemetry-decline');
  54  |   if(await button.waitFor({state:'visible',timeout:800}).then(()=>true).catch(()=>false)){const wait=response(page,'/intelligence/consent','PUT');await button.click();expect((await wait).status()).toBe(200);}
  55  | }
  56  | async function register(page: Page,label:string,extra:any={}) {
  57  |   await guard('T13-B-02 register fixture');const email=fixtures.email(label),password=randomBytes(20).toString('base64url')+'1a';
  58  |   const fullName=`T13B02 ${info.project.name} ${label}`;
  59  |   const result=await api(page,'POST','/auth/register',{fullName,email,password,phone:'0901234567',...extra},null);
  60  |   expect(result.status).toBe(201);await fixtures.discover();return {...result.body.data,email,password,fullName};
  61  | }
  62  | async function login(page: Page,person:any) {
  63  |   // Clear only this isolated test context as login setup; no R05 rerun.
  64  |   await page.evaluate(()=>{localStorage.removeItem('travelgo_token');localStorage.removeItem('travelgo_user');});
  65  |   await page.goto('/login');await page.locator('[name=email]').fill(person.email);await page.locator('[name=password]').fill(person.password);
  66  |   const wait=response(page,'/auth/login','POST');await page.getByRole('button',{name:'Đăng nhập ngay',exact:true}).click();
  67  |   const result=await wait;expect(result.status()).toBe(200);const session=(await result.json()).data;sensitiveValues.add(session.token);sensitiveValues.add(person.password);
  68  |   await expect.poll(()=>page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBe(session.token);
  69  |   await expect(page).not.toHaveURL(/\/login$/);return session;
  70  | }
  71  | test.beforeAll(async ({},worker)=>{await schema();fixtures=new Fixtures(root,worker.project.name);});
  72  | test.afterAll(async()=>{try{if(fixtures)await fixtures.cleanup();}finally{await sequelize.close();}});
  73  | test.beforeEach(async({page},testInfo)=>{
  74  |   info=testInfo;checkpoints=[];traffic=[];consoleLog=[];images=[];sensitiveValues=new Set();
  75  |   await page.context().tracing.start({screenshots:false,snapshots:false,sources:false});
  76  |   expect(fs.existsSync(path.join(root,'fingerprint-before.json'))).toBe(true);
  77  |   expect(createHash('sha256').update(fs.readFileSync(path.join(root,'case-manifest.json'))).digest('hex')).toBe(process.env.T13B02_MANIFEST_SHA256);
  78  |   await guard('T13-B-02 before fixture request');
  79  |   page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))traffic.push({channel:'browser network metadata',method:r.request().method(),endpoint:new URL(r.url()).pathname,status:r.status()});});
  80  |   page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleLog.push({type:m.type(),message:m.text().slice(0,600)});});
  81  |   page.on('pageerror',e=>consoleLog.push({type:'pageerror',message:e.message}));
  82  |   await page.goto('/');
  83  |   await step('ENV_IDENTITY','Proxy reaches this run exact guarded test database',async()=>{const r=await api(page,'GET','/__t13b02/identity',undefined,null);expect(r.status).toBe(200);expect(r.body.runId).toBe(process.env.T13B02_RUN_ID);expect(r.body.database).toBe('travelgo_ai_m0_test');expect(r.body.sentinel).toBe('PASS');expect(r.body.nodeEnv).toBe('test');expect(r.body.port).toBe(Number(process.env.PLAYWRIGHT_BACKEND_PORT));return r.body;});
  84  | });
  85  | test.afterEach(async({page},testInfo)=>{
  86  |   if(testInfo.status==='skipped'){await page.context().tracing.stop();return;}
  87  |   if(testInfo.errors.length&&!checkpoints.some(v=>v.status==='FAIL'))checkpoints.push({id:'ASSERTION_FAILURE',status:'FAIL',actual:testInfo.errors.map(e=>e.message)});
  88  |   try{await photo(page,'final');}catch(e:any){consoleLog.push({type:'evidence-error',message:e.message});}
  89  |   await fixtures.discover();const snapshot=await fixtures.snapshot();write(path.join(out(),`${caseId()}-db-final.json`),snapshot);
  90  |   let trace:any=null;
  91  |   if(testInfo.errors.length){
  92  |     // Raw trace exists only in a unique user temp directory. Credentials are removed before publishing the ZIP.
  93  |     const temp=fs.mkdtempSync(path.join(os.tmpdir(),'t13b02-trace-')),raw=path.join(temp,'raw.zip'),target=path.join(out(),`${caseId()}-trace-redacted.zip`);
  94  |     try{
  95  |       await page.context().tracing.stop({path:raw});
  96  |       const script=`import sys,json,zipfile\nsecrets=json.load(sys.stdin)\ncount=0\nwith zipfile.ZipFile(sys.argv[1]) as src, zipfile.ZipFile(sys.argv[2],'x',zipfile.ZIP_DEFLATED) as dst:\n for entry in src.infolist():\n  data=src.read(entry.filename)\n  for secret in secrets:\n   value=secret.encode('utf-8')\n   count+=data.count(value)\n   data=data.replace(value,b'[REDACTED]')\n  assert all(secret.encode('utf-8') not in data for secret in secrets)\n  dst.writestr(entry,data)\nprint(json.dumps({'entries':len(src.infolist()),'redactions':count,'credentialScan':'PASS','screenshots':False,'domSnapshots':False,'sources':False}))`;
  97  |       const sanitized=spawnSync('python',['-c',script,raw,target],{input:JSON.stringify([...sensitiveValues].filter(Boolean)),encoding:'utf8',windowsHide:true});
  98  |       expect(sanitized.status,sanitized.stderr).toBe(0);trace={file:path.basename(target),...JSON.parse(sanitized.stdout)};write(path.join(out(),`${caseId()}-trace-redaction.json`),trace);
  99  |       await testInfo.attach('redacted Playwright action/network trace',{path:target,contentType:'application/zip'});
  100 |     }finally{if(fs.existsSync(raw))fs.unlinkSync(raw);fs.rmdirSync(temp);}
  101 |   }else await page.context().tracing.stop();
  102 |   write(path.join(out(),`${caseId()}-results.json`),{id:caseId(),project:testInfo.project.name,channel:['R03','B06'].includes(caseId())?'A1':'U2+A1 where specified',viewport:page.viewportSize(),browser:page.context().browser()?.version(),mobileEmulation:testInfo.project.name==='mobile',status:testInfo.status==='passed'&&!testInfo.errors.length?'PASS':'FAIL',errors:testInfo.errors.map(e=>({message:e.message,stack:e.stack})),checkpoints,traffic,console:consoleLog,images,trace,dbSnapshot:`${caseId()}-db-final.json`});
  103 | });
  104 | 
  105 | const imageUrl='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="320" height="180" fill="#0f766e"/><text x="12" y="90" fill="white">T13B02 SYNTHETIC TEST ONLY</text></svg>').toString('base64');
  106 | async function actor(page:Page,label:string,role?:string){const person=await register(page,label);if(role){await fixtures.grant(person.user.id,role);const session=await api(page,'POST','/auth/login',{email:person.email,password:person.password},null);expect(session.status).toBe(200);Object.assign(person,session.body.data);}return person;}
  107 | async function graph(page:Page,two=false){
  108 |   const sa=await actor(page,`${caseId()}-SA`,'SUPER_ADMIN'),a=await actor(page,`${caseId()}-A`,'PARTNER'),b=await actor(page,`${caseId()}-B`,'PARTNER'),customer=await actor(page,`${caseId()}-C`);
  109 |   const ba=await fixtures.business(a.user.id,`${caseId()} A ${info.project.name}`),bb=await fixtures.business(b.user.id,`${caseId()} B ${info.project.name}`),a2=two?await fixtures.business(a.user.id,`${caseId()} A2 ${info.project.name}`):null;return {sa,a,b,customer,ba,bb,a2};
  110 | }
  111 | function payload(resource:string,businessId:string,label:string,extra:any={}){
  112 |   const title=`T13B02 ${label} ${randomUUID().slice(0,8)}`,city=`T13B02-${process.env.T13B02_RUN_ID!.slice(-6)}-${info.project.name}`;
  113 |   const data:any={places:{businessId,name:title,category:'hotel',summary:'SYNTHETIC TEST ONLY summary',description:'SYNTHETIC TEST ONLY description',city,province:city,address:'SYNTHETIC TEST ONLY address',latitude:16.05,longitude:108.20,priceFrom:123456,heroImage:imageUrl},
  114 |     tours:{businessId,title,destinationCity:city,departureCity:'SYNTHETIC departure',durationDays:2,durationNights:1,category:'culture',summary:'SYNTHETIC TEST ONLY summary',description:'SYNTHETIC TEST ONLY description',priceVND:123456,capacity:30,heroImage:imageUrl},
  115 |     tickets:{businessId,title,type:'bus',operator:'SYNTHETIC TEST ONLY operator',departureCity:city,arrivalCity:'SYNTHETIC arrival',departureTime:'2030-06-15T10:30',arrivalTime:'2030-06-15T12:30',price:123456,capacity:30,status:'ACTIVE',imageUrl},
  116 |     blogs:{businessId,title,excerpt:'SYNTHETIC TEST ONLY excerpt',content:'SYNTHETIC TEST ONLY content',destinationName:city,coverImage:imageUrl,tags:['SYNTHETIC','T13B02']}};
  117 |   return {...data[resource],...extra};
  118 | }
  119 | const nameOf=(v:any)=>v.name||v.title;
  120 | async function createApi(page:Page,resource:string,p:any,person:any){const r=await api(page,'POST',`/partner/${resource}`,p,person.token);expect(r.status).toBe(201);await fixtures.discover();return r.body.data;}
  121 | async function moderateApi(page:Page,g:any,resource:string,id:string,status:string,reason='SYNTHETIC TEST ONLY moderation'){const r=await api(page,'PATCH',`/admin/${resource}/${id}/status`,{status,reason},g.sa.token);expect(r.status).toBe(200);return r.body.data;}
  122 | async function createBooking(page:Page,g:any,resource:string,row:any){
  123 |   expect(fixtures.data.businesses).toContain(row.businessId);const type=resource==='places'?'hotel':resource==='tours'?'tour':'ticket';
  124 |   const r=await api(page,'POST','/bookings',{serviceType:type,serviceId:row.id,bookingDate:'2030-06-15',adultsCount:1,childrenCount:0,customerPhone:'0901234567',notes:'T13B02 SYNTHETIC prerequisite only'},g.customer.token);expect(r.status).toBe(201);await fixtures.discover();expect(r.body.data.bookingStatus).toBe('PENDING');expect(r.body.data.paymentStatus).toBe('unpaid');return r.body.data;
  125 | }
  126 | async function fillForm(page:Page,resource:string,p:any,isNew=true){
  127 |   const form=page.getByTestId(`partner-${resource}-form`);await expect(form).toBeVisible();
  128 |   if(isNew)await form.locator('[name=businessId]').selectOption(p.businessId);
  129 |   for(const [key,value]of Object.entries(p)){const field=form.locator(`[name="${key}"]`);if(key==='businessId'||!(await field.count()))continue;const tag=await field.evaluate(el=>el.tagName);if(tag==='SELECT')await field.selectOption(String(value));else await field.fill(Array.isArray(value)?value.join('\n'):String(value));}
```