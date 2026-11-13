# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: t13b01-rbac-onboarding.spec.ts >> R01 role dashboards public area reload navigation
- Location: e2e\t13b01-rbac-onboarding.spec.ts:151:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator:  getByText('T13B01 mobile R01-C', { exact: true }).first()
Expected: visible
Received: hidden
Timeout:  10000ms

Call log:
  - Expect "toBeVisible" getByText('T13B01 mobile R01-C', { exact: true }).first() with timeout 10000ms
  - waiting for getByText('T13B01 mobile R01-C', { exact: true }).first()
    22 × locator resolved to <span class="text-sm font-medium text-slate-800 pr-1 max-w-[100px] truncate">T13B01 mobile R01-C</span>
       - unexpected value "hidden"

```

```yaml
- banner:
  - link "HuGoTravel":
    - /url: /
    - img
    - text: HuGoTravel
  - link "Danh sách yêu thích":
    - /url: /favorites
    - img
  - button "Mở menu":
    - img
- main:
  - region "Hồ sơ cá nhân":
    - img "Chưa có ảnh đại diện"
    - heading "T13B01 mobile R01-C" [level=1]
    - paragraph: Hồ sơ hiện chỉ hỗ trợ xem.
    - link "Lịch sử đặt dịch vụ":
      - /url: /bookings
    - link "Danh sách yêu thích":
      - /url: /favorites
    - term: Họ và tên
    - definition: T13B01 mobile R01-C
    - term: Email
    - definition: t13b01.1b3bd5.mobile.r01-c.1fbc21ee@example.test
    - term: Số điện thoại
    - definition: "0901234567"
    - term: Vai trò
    - definition: Khách hàng
- contentinfo:
  - link "HuGo Travel":
    - /url: /
    - img
    - text: HuGo Travel
  - paragraph: Hệ thống đặt vé và dịch vụ du lịch uy tín hàng đầu Việt Nam. Khám phá những chân trời mới và chia sẻ những khoảnh khắc đáng nhớ nhất cùng chúng tôi.
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - link:
    - /url: "#"
    - img
  - heading "Liên kết nhanh" [level=3]
  - list:
    - listitem:
      - link "Bản đồ khám phá":
        - /url: /explore
    - listitem:
      - link "Đặt vé máy bay & tour":
        - /url: /tickets
    - listitem:
      - link "Khách sạn & Resort":
        - /url: /hotels
    - listitem:
      - link "Nhà hàng & Ẩm thực":
        - /url: /restaurants
    - listitem:
      - link "Cẩm nang du lịch":
        - /url: /blog
  - heading "Dịch vụ & Hỗ trợ" [level=3]
  - list:
    - listitem:
      - link "Điều khoản dịch vụ":
        - /url: "#"
    - listitem:
      - link "Chính sách bảo mật":
        - /url: "#"
    - listitem:
      - link "Chính sách hoàn huỷ vé":
        - /url: "#"
    - listitem:
      - link "Câu hỏi thường gặp (FAQ)":
        - /url: "#"
    - listitem:
      - link "Cổng đối tác & Quản trị":
        - /url: /admin
  - heading "Liên hệ" [level=3]
  - list:
    - listitem:
      - img
      - text: contact@hugotravel.com
    - listitem:
      - img
      - text: 1900 1234 (24/7)
    - listitem:
      - img
      - text: Tòa nhà Landmark 81, Điện Biên Phủ, Phường 22, Quận Bình Thạnh, TP. Hồ Chí Minh
  - paragraph: © 2026 HuGo Travel. All rights reserved.
  - paragraph: Xây dựng với mô hình MVC & Thuật toán Bayesian Average
- button "Quyền riêng tư AI"
```

# Test source

```ts
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
  98  |   // The wrapping label includes option text; scope the existing single form select.
  99  |   await page.locator('form select').selectOption(payload.businessType);
  100 |   await page.getByPlaceholder('Vĩ độ',{exact:true}).fill(String(payload.latitude));await page.getByPlaceholder('Kinh độ',{exact:true}).fill(String(payload.longitude));
  101 | }
  102 | async function submitUI(page:Page,payload:any,status=201) {
  103 |   const wait=response(page,'/partner-applications','POST');await page.getByRole('button',{name:'Gửi hồ sơ xét duyệt',exact:true}).click();const result=await wait;expect(result.status()).toBe(status);
  104 |   const body=await result.json();traffic.push({channel:'UI form → real API',method:'POST',endpoint:'/partner-applications',request:redact(result.request().postDataJSON()),response:{status:result.status(),body:redact(body)}});
  105 |   await fixtures.discover();return body.data;
  106 | }
  107 | async function openApplications(page:Page,sa:any) {await login(page,sa);await page.goto('/admin/partner-applications');await expect(page.getByRole('heading',{name:'Duyệt hồ sơ đối tác',exact:true})).toBeVisible();}
  108 | function appRow(page:Page,name:string) {return page.getByRole('row').filter({has:page.getByText(name,{exact:true})});}
  109 | async function decisionUI(page:Page,app:any,status:string,reason?:string,cancel?:'prompt'|'confirm') {
  110 |   const row=appRow(page,app.businessName);await expect(row).toBeVisible();const dialogs:string[]=[];
  111 |   const handler=async(dialog:any)=>{dialogs.push(dialog.type());if((cancel==='prompt'&&dialog.type()==='prompt')||(cancel==='confirm'&&dialog.type()==='confirm'))await dialog.dismiss();else if(dialog.type()==='prompt')await dialog.accept(reason);else await dialog.accept();};
  112 |   page.on('dialog',handler);const wait=cancel?null:response(page,`/admin/partners/${app.id}/approval`,'PATCH');
  113 |   try {const button=status==='APPROVED'?row.getByTitle('Phê duyệt',{exact:true}):status==='REJECTED'?row.getByTitle('Từ chối',{exact:true}):row.getByRole('button',{name:'Bổ sung',exact:true});await button.click();
  114 |     if(wait){const result=await wait;expect(result.status()).toBe(200);traffic.push({channel:'UI decision → real API',method:'PATCH',endpoint:`/admin/partners/${app.id}/approval`,request:redact(result.request().postDataJSON()),response:{status:result.status(),body:redact(await result.json())}});await expect(appRow(page,app.businessName)).toContainText(status);}
  115 |   }finally{page.off('dialog',handler);}await fixtures.discover();return dialogs;
  116 | }
  117 | async function assertDecision(appId:string,userId:string,actor:string,status:string,expectedAudit:number) {
  118 |   const app=await PartnerApplication.findByPk(appId);expect(app.status).toBe(status);expect(app.reviewedBy).toBe(actor);expect(app.reviewedAt).toBeTruthy();
  119 |   const audits=await AuditLog.findAll({where:{entityType:'PartnerApplication',entityId:appId},order:[['createdAt','ASC']]});expect(audits).toHaveLength(expectedAudit);
  120 |   expect(audits.at(-1).actorUserId).toBe(actor);expect(audits.at(-1).newData.status).toBe(status);
  121 |   const grants=await UserRole.findAll({where:{userId,role:'PARTNER'}});const members=await BusinessMember.findAll({where:{userId}});
  122 |   if(status==='APPROVED') {expect(grants).toHaveLength(1);expect(grants[0].grantedBy).toBe(actor);expect(members).toHaveLength(1);expect(members[0].permissions.slice().sort()).toEqual(['MANAGE_BOOKINGS','MANAGE_BUSINESS']);const business=await Business.findByPk(members[0].businessId);expect(business.status).toBe('ACTIVE');expect(business.name).toBe(app.businessName);expect(audits.at(-1).newData.businessId).toBe(business.id);}
  123 |   else {expect(grants).toHaveLength(0);expect(members).toHaveLength(0);expect(await Business.count({where:{name:app.businessName}})).toBe(0);}
  124 |   return {application:app.toJSON(),grants:grants.map((v:any)=>v.toJSON()),members:members.map((v:any)=>v.toJSON()),audit:audits.map((v:any)=>v.toJSON())};
  125 | }
  126 | async function statusUI(page:Page,person:any,app:any,status:string,reason?:string) {
  127 |   await login(page,person);await page.goto('/become-partner');await decline(page);await expect(page.getByRole('heading',{name:app.businessName,exact:true})).toBeVisible();await expect(page.getByText(status,{exact:true})).toBeVisible();if(reason)await expect(page.getByText('Phản hồi: '+reason,{exact:true})).toBeVisible();
  128 |   await page.reload();await expect(page.getByText(status,{exact:true})).toBeVisible();await photo(page,`customer-${status.toLowerCase()}`);
  129 | }
  130 | test.beforeAll(async ({},worker)=>{await schema();fixtures=new Fixtures(root,worker.project.name);});
  131 | test.afterAll(async()=>{try{if(fixtures)await fixtures.cleanup();}finally{await sequelize.close();}});
  132 | test.beforeEach(async({page},testInfo)=>{
  133 |   info=testInfo;checkpoints=[];traffic=[];consoleLog=[];images=[];
  134 |   expect(fs.existsSync(path.join(root,'fingerprint-before.json'))).toBe(true);
  135 |   expect(createHash('sha256').update(fs.readFileSync(path.join(root,'case-manifest.json'))).digest('hex')).toBe(process.env.T13B01_MANIFEST_SHA256);
  136 |   await guard('T13-B-01 before fixture request');
  137 |   page.on('response',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))traffic.push({channel:'browser network metadata',method:r.request().method(),endpoint:new URL(r.url()).pathname,status:r.status()});});
  138 |   page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleLog.push({type:m.type(),message:m.text().slice(0,600)});});
  139 |   page.on('pageerror',e=>consoleLog.push({type:'pageerror',message:e.message}));
  140 |   await page.goto('/');
  141 |   await step('ENV_IDENTITY','Proxy reaches this run exact guarded test database',async()=>{const r=await api(page,'GET','/__t13b01/identity',undefined,null);expect(r.status).toBe(200);expect(r.body.runId).toBe(process.env.T13B01_RUN_ID);expect(r.body.database).toBe('travelgo_ai_m0_test');expect(r.body.sentinel).toBe('PASS');expect(r.body.nodeEnv).toBe('test');expect(r.body.port).toBe(Number(process.env.PLAYWRIGHT_BACKEND_PORT));return r.body;});
  142 | });
  143 | test.afterEach(async({page},testInfo)=>{
  144 |   if(testInfo.status==='skipped')return;
  145 |   if(testInfo.errors.length&&!checkpoints.some(v=>v.status==='FAIL'))checkpoints.push({id:'ASSERTION_FAILURE',status:'FAIL',actual:testInfo.errors.map(e=>e.message)});
  146 |   try{await photo(page,'final');}catch(e:any){consoleLog.push({type:'evidence-error',message:e.message});}
  147 |   await fixtures.discover();const snapshot=await fixtures.snapshot();write(path.join(out(),`${caseId()}-db-final.json`),snapshot);
  148 |   write(path.join(out(),`${caseId()}-results.json`),{id:caseId(),project:testInfo.project.name,channel:caseId()==='R04'?'A1':'U2'+(caseId()==='R01'?'':'+A1 desktop probes'),viewport:page.viewportSize(),browser:page.context().browser()?.version(),mobileEmulation:testInfo.project.name==='mobile',status:testInfo.status==='passed'&&!testInfo.errors.length?'PASS':'FAIL',errors:testInfo.errors.map(e=>({message:e.message,stack:e.stack})),checkpoints,traffic,console:consoleLog,images,dbSnapshot:`${caseId()}-db-final.json`});
  149 | });
  150 | 
  151 | test('R01 role dashboards public area reload navigation',async({page})=>{
  152 |   const sa=await admin(page,'R01-SA'),c=await register(page,'R01-C'),p=await partner(page,sa,'R01-P');
  153 |   for(const [person,route,role] of [[c,'/profile','CUSTOMER'],[p,'/partner','PARTNER'],[sa,'/admin','SUPER_ADMIN']] as const)await step(`ROLE_${role}`,'UI login, route reload and /me match database grants',async()=>{
> 154 |     const session=await login(page,person);await page.goto(route);await decline(page);await expect(page).toHaveURL(new RegExp(route+'$'));await page.reload();await expect(page).toHaveURL(new RegExp(route+'$'));await expect(page.getByText(person.fullName,{exact:true}).first()).toBeVisible();
      |                                                                                                                                                                                                                                                                                      ^ Error: expect(locator).toBeVisible() failed
  155 |     const me=await api(page,'GET','/auth/me');expect(me.status).toBe(200);const grants=await UserRole.findAll({where:{userId:person.user.id}});expect(me.body.data.roles.slice().sort()).toEqual(grants.map((v:any)=>v.role).sort());expect(session.user.roles).toContain(role);
  156 |     if(role!=='CUSTOMER'&&info.project.name==='mobile'){await page.getByRole('button',{name:'Mở menu',exact:true}).click();await expect(page.getByRole('navigation')).toBeVisible();await page.locator('aside').getByRole('button',{name:'Đóng menu',exact:true}).click();}
  157 |     if(role==='CUSTOMER'){await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();await expect(page.getByRole('button',{name:'Đăng xuất',exact:true})).toBeVisible();await page.getByRole('button',{name:info.project.name==='mobile'?'Mở menu':'Menu tài khoản',exact:true}).click();}
  158 |     await photo(page,role.toLowerCase());await page.goto('/explore');await decline(page);await expect(page).toHaveURL(/\/explore$/);return {userId:person.user.id,roles:me.body.data.roles};
  159 |   });
  160 | });
  161 | 
  162 | test('R02 deny role routes anonymous and escalation',async({page})=>{
  163 |   const sa=await admin(page,'R02-SA'),c=await register(page,'R02-C'),p=await partner(page,sa,'R02-P');const target=randomUUID();
  164 |   await step('ANONYMOUS_UI','Protected routes return login',async()=>{for(const route of ['/admin','/partner']){await page.goto(route);await expect(page).toHaveURL(/\/login$/);}await photo(page,'anonymous-login');});
  165 |   await step('WRONG_ROLE_UI','Customer admin/partner, Partner admin, SA-only partner give403 without logout',async()=>{
  166 |     for(const [person,denied] of [[c,['/admin','/partner']],[p,['/admin']],[sa,['/partner']]] as any){await login(page,person);for(const route of denied){await page.goto(route);await expect(page).toHaveURL(/\/403$/);await expect(page.getByRole('heading',{name:'Bạn không có quyền truy cập',exact:true})).toBeVisible();expect(await page.evaluate(()=>!!localStorage.getItem('travelgo_token'))).toBe(true);await photo(page,`denied-${person===c?'customer':person===p?'partner':'sa'}-${route.slice(1)}`);}}
  167 |   });
  168 |   await step('CACHE_ESCALATION','Forged cached roles cannot change API permission; /me restores CUSTOMER',async()=>{await login(page,c);await page.evaluate(()=>{const cache=JSON.parse(localStorage.getItem('travelgo_user')!);cache.roles=['SUPER_ADMIN','PARTNER'];localStorage.setItem('travelgo_user',JSON.stringify(cache));});expect((await api(page,'GET','/admin/dashboard')).status).toBe(403);await page.goto('/admin');await expect(page).toHaveURL(/\/403$/);expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('travelgo_user')!).roles)).toEqual(['CUSTOMER']);});
  169 |   if(isApi())await step('DENY_API_EXPANSION','All frozen protected probes return401/403 and fixture rows unchanged',async()=>{
  170 |     const before=await fixtures.snapshot();const protectedRoutes:any[]=[['GET','/admin/dashboard'],['PATCH',`/admin/partners/${fixtures.data.applications[0]}/approval`,{status:'APPROVED'}],...['places','tours','blogs'].map(resource=>['PATCH',`/admin/${resource}/${target}/status`,{status:'APPROVED'}]),['POST','/places',{}],['DELETE',`/places/${target}`],['POST','/tours',{}],['PUT',`/tours/${target}`,{}],['DELETE',`/tours/${target}`],['PATCH',`/reviews/${target}/moderation`,{status:'PUBLISHED'}]];
  171 |     for(const person of [c,p])for(const [method,endpoint,body] of protectedRoutes){const r=await api(page,method,endpoint,body,person.token);expect(r.status,`${method} ${endpoint}`).toBe(403);expect(r.body.code).toBe('FORBIDDEN');}
  172 |     for(const person of [c,sa])expect((await api(page,'GET','/partner/dashboard',undefined,person.token)).status).toBe(403);
  173 |     const anonymous:any[]=[...protectedRoutes,['GET','/partner/dashboard'],['GET','/reviews/me'],['POST',`/places/${target}/reviews`,{rating:4,comment:'SYNTHETIC TEST ONLY review'}],['PATCH',`/reviews/${target}`,{rating:4,comment:'SYNTHETIC TEST ONLY review'}],['DELETE',`/reviews/${target}`],['GET','/favorites'],...['POST','DELETE'].map(method=>[method,`/favorites/${target}`,{contractVersion:'1.0',sessionId:'t13b01-anonymous',uiSurface:'favorites'}]),['GET','/intelligence/consent'],['PUT','/intelligence/consent',{analyticsEnabled:false,personalizationEnabled:false}]];
  174 |     for(const [method,endpoint,body] of anonymous)expect((await api(page,method,endpoint,body,null)).status,`${method} ${endpoint}`).toBe(401);
  175 |     expect(await fixtures.snapshot()).toEqual(before);write(path.join(out(),'R02-rejected-mutation-before-after.json'),{before,after:await fixtures.snapshot(),same:true});return {wrongRoleProbes:protectedRoutes.length*2+2,anonymousProbes:anonymous.length};
  176 |   });
  177 | });
  178 | 
  179 | test('R04 server-owned identity and role mass assignment',async({page})=>{
  180 |   test.skip(info.project.name==='mobile','A1 once in desktop: API authorization does not depend on viewport');
  181 |   await step('MASS_ASSIGNMENT','Spoof fields never grant role, change identity or approve application',async()=>{
  182 |     const foreign=randomUUID();const c=await register(page,'R04-C',{role:'admin',roles:['SUPER_ADMIN','PARTNER'],userId:foreign,businessId:randomUUID()});expect(c.user.roles).toEqual(['CUSTOMER']);expect(c.user.id).not.toBe(foreign);
  183 |     const row=await User.findByPk(c.user.id);expect(row.role).toBe('user');const payload=application(c,'R04');const r=await api(page,'POST','/partner-applications',{...payload,userId:foreign,status:'APPROVED',reviewedBy:c.user.id},c.token);expect(r.status).toBe(201);expect(r.body.data.userId).toBe(c.user.id);expect(r.body.data.status).toBe('PENDING');expect(r.body.data.reviewedBy).toBeFalsy();
  184 |     const roles=await UserRole.findAll({where:{userId:c.user.id}});expect(roles.map((v:any)=>v.role)).toEqual(['CUSTOMER']);expect(await BusinessMember.count({where:{userId:c.user.id}})).toBe(0);expect(await Business.count({where:{name:payload.businessName}})).toBe(0);expect(await AuditLog.count({where:{entityType:'PartnerApplication',entityId:r.body.data.id}})).toBe(0);return {userId:c.user.id,applicationId:r.body.data.id,legacyRole:row.role,roles:c.user.roles};
  185 |   });
  186 | });
  187 | 
  188 | test('A02 application validation persistence duplicate and cancel',async({page})=>{
  189 |   const sa=await admin(page,'A02-SA'),c=await register(page,'A02-C'),other=await register(page,'A02-OTHER');await login(page,c);const payload=application(c,'A02');await form(page,payload);
  190 |   await step('FORM_VALIDATION','Required field blocks submit; invalid server email preserves all input and shows error',async()=>{
  191 |     await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).fill('');expect(await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).evaluate((el:HTMLInputElement)=>el.checkValidity())).toBe(false);const before=traffic.filter(v=>v.endpoint==='/api/partner-applications'&&v.method==='POST').length;await page.getByRole('button',{name:'Gửi hồ sơ xét duyệt',exact:true}).click();expect(traffic.filter(v=>v.endpoint==='/api/partner-applications'&&v.method==='POST')).toHaveLength(before);
  192 |     await page.getByLabel('Tên cơ sở kinh doanh',{exact:true}).fill(payload.businessName);await page.getByLabel('Email liên hệ',{exact:true}).fill('invalid-email');await submitUI(page,payload,400);await expect(page.getByLabel('Tên cơ sở kinh doanh',{exact:true})).toHaveValue(payload.businessName);await expect(page.getByLabel('Email liên hệ',{exact:true})).toHaveValue('invalid-email');await expect(page.getByText('Dữ liệu gửi lên không hợp lệ',{exact:true})).toBeVisible();await photo(page,'invalid-form');expect(await PartnerApplication.count({where:{userId:c.user.id}})).toBe(0);await page.getByLabel('Email liên hệ',{exact:true}).fill(payload.email);
  193 |   });
  194 |   const app=await step('SUBMIT_RELOAD','Valid UI application201 PENDING, persisted and reload recovers status',async()=>{const app=await submitUI(page,payload);expect(app.status).toBe('PENDING');await expect(page.getByText('PENDING',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('heading',{name:payload.businessName,exact:true})).toBeVisible();await expect(page.getByText('PENDING',{exact:true})).toBeVisible();const own=await api(page,'GET','/partner-applications/me');expect(own.body.data.map((v:any)=>v.id)).toEqual([app.id]);expect((await PartnerApplication.findByPk(app.id)).businessName).toBe(payload.businessName);await photo(page,'pending-reload');return app;});
  195 |   if(isApi())await step('APPLICATION_INVALID_API','Missing/email/type/coordinates400; duplicate409; other owner list empty',async()=>{
  196 |     const before=await fixtures.snapshot();for(const patch of [{businessName:''},{email:'bad'},{businessType:'INVALID'},{latitude:91},{longitude:181}])expect((await api(page,'POST','/partner-applications',{...payload,...patch},other.token)).status).toBe(400);
  197 |     const duplicate=await api(page,'POST','/partner-applications',payload,c.token);expect(duplicate.status).toBe(409);expect(duplicate.body.code).toBe('ACTIVE_APPLICATION_EXISTS');expect((await api(page,'GET','/partner-applications/me',undefined,other.token)).body.data).toEqual([]);expect(await fixtures.snapshot()).toEqual(before);return {duplicate:duplicate.body.code,invalidVariants:5};
  198 |   });
  199 |   await step('CANCEL_ADMIN_DIALOGS','Cancel reason prompt or approval confirm causes no PATCH or DB change',async()=>{await openApplications(page,sa);const before=await fixtures.snapshot();const count=traffic.filter(v=>v.method==='PATCH').length;expect(await decisionUI(page,app,'REJECTED','unused','prompt')).toEqual(['prompt']);expect(await decisionUI(page,app,'APPROVED',undefined,'confirm')).toEqual(['confirm']);expect(traffic.filter(v=>v.method==='PATCH')).toHaveLength(count);expect(await fixtures.snapshot()).toEqual(before);await photo(page,'cancel-dialogs');});
  200 | });
  201 | 
  202 | test('A03 approval atomic persistence terminal retry and race',async({page})=>{
  203 |   const sa=await admin(page,'A03-SA'),c=await register(page,'A03-C');const {app}=await submitApi(page,c,'A03');
  204 |   await step('APPROVE_UI_DB','UI approval atomically creates one Business/member/PARTNER grant/audit',async()=>{await openApplications(page,sa);await decisionUI(page,app,'APPROVED');const state=await assertDecision(app.id,c.user.id,sa.user.id,'APPROVED',1);await page.reload();await expect(appRow(page,app.businessName)).toContainText('APPROVED');await photo(page,'admin-approved');await statusUI(page,c,app,'APPROVED');return state;});
  205 |   if(isApi())await step('TERMINAL_AND_CONCURRENT_APPROVAL','Terminal retry409; concurrent approval exactly one200/one409 and one graph',async()=>{
  206 |     const before=await fixtures.snapshot();const repeat=await decisionApi(page,sa,app.id,'APPROVED');expect(repeat.status).toBe(409);expect(repeat.body.code).toBe('APPLICATION_ALREADY_DECIDED');expect(await fixtures.snapshot()).toEqual(before);
  207 |     const raceUser=await register(page,'A03-RACE');const race=await submitApi(page,raceUser,'A03-RACE');const result=await Promise.all([decisionApi(page,sa,race.app.id,'APPROVED'),decisionApi(page,sa,race.app.id,'APPROVED')]);expect(result.map(v=>v.status).sort()).toEqual([200,409]);expect(result.find(v=>v.status===409)?.body.code).toBe('APPLICATION_ALREADY_DECIDED');const state=await assertDecision(race.app.id,raceUser.user.id,sa.user.id,'APPROVED',1);expect(await Business.count({where:{name:race.payload.businessName}})).toBe(1);return {statuses:result.map(v=>v.status),state};
  208 |   });
  209 | });
  210 | 
  211 | test('R05 granted role old token reload and real relogin',async({page})=>{
  212 |   const sa=await admin(page,'R05-SA'),c=await register(page,'R05-C');await login(page,c);const payload=application(c,'R05');await form(page,payload);const app=await submitUI(page,payload);const oldToken=await page.evaluate(()=>localStorage.getItem('travelgo_token'));
  213 |   await openApplications(page,sa);await decisionUI(page,app,'APPROVED');await assertDecision(app.id,c.user.id,sa.user.id,'APPROVED',1);
  214 |   await step('OLD_TOKEN_DB_ROLE','Old token /me returns DB PARTNER but partner API stays403',async()=>{const me=await api(page,'GET','/auth/me',undefined,oldToken);expect(me.body.data.roles).toContain('PARTNER');expect((await api(page,'GET','/partner/businesses',undefined,oldToken)).status).toBe(403);
  215 |     // Restore the actual pre-grant token to simulate the existing customer tab, then reload through real /me.
  216 |     await page.evaluate(token=>{localStorage.setItem('travelgo_token',token!);localStorage.removeItem('travelgo_user');},oldToken);await page.goto('/profile');await decline(page);await page.reload();await expect(page.getByText(c.email,{exact:true})).toBeVisible();expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('travelgo_user')!).roles)).toContain('PARTNER');expect(await page.evaluate(()=>localStorage.getItem('travelgo_token'))).toBe(oldToken);expect((await api(page,'GET','/partner/businesses')).status).toBe(403);await photo(page,'old-token-role-mismatch');});
  217 |   await step('LOGOUT_RELOGIN','Real logout then UI login gets new PARTNER token and own Business200',async()=>{await logoutUI(page);const session=await login(page,c);expect(session.token).not.toBe(oldToken);expect(session.user.roles).toContain('PARTNER');await page.goto('/partner');await page.reload();await expect(page).toHaveURL(/\/partner$/);const businesses=await api(page,'GET','/partner/businesses');expect(businesses.status).toBe(200);const members=await BusinessMember.findAll({where:{userId:c.user.id}});expect(businesses.body.data.map((v:any)=>v.id)).toEqual(members.map((v:any)=>v.businessId));expect(businesses.body.data).toHaveLength(1);await photo(page,'partner-relogin');return {userId:c.user.id,businessId:members[0].businessId};});
  218 | });
  219 | 
  220 | test('A04 rejection needs-info reasons and later decision',async({page})=>{
  221 |   const sa=await admin(page,'A04-SA'),rejectUser=await register(page,'A04-REJECT'),needsUser=await register(page,'A04-NEEDS');const rejected=await submitApi(page,rejectUser,'A04-REJECT'),needs=await submitApi(page,needsUser,'A04-NEEDS');
  222 |   if(isApi())await step('INVALID_DECISIONS','Missing reason and invalid decision400 do not mutate',async()=>{const before=await fixtures.snapshot();for(const status of ['REJECTED','NEEDS_MORE_INFO']){const r=await decisionApi(page,sa,rejected.app.id,status);expect(r.status).toBe(400);expect(r.body.code).toBe('REASON_REQUIRED');}const invalid=await decisionApi(page,sa,rejected.app.id,'INVALID');expect(invalid.status).toBe(400);expect(invalid.body.code).toBe('INVALID_DECISION');expect(await fixtures.snapshot()).toEqual(before);});
  223 |   await independentStep(page,'REJECT_UI','Reject with reason persists/audits and grants no business or PARTNER',async()=>{const reason='SYNTHETIC TEST ONLY rejected';await openApplications(page,sa);await decisionUI(page,rejected.app,'REJECTED',reason);const state=await assertDecision(rejected.app.id,rejectUser.user.id,sa.user.id,'REJECTED',1);await photo(page,'admin-rejected');await statusUI(page,rejectUser,rejected.app,'REJECTED',reason);return state;});
  224 |   await independentStep(page,'NEEDS_INFO_UI','Needs-info persists with feedback and no business/grant',async()=>{const reason='SYNTHETIC TEST ONLY additional information';await openApplications(page,sa);await decisionUI(page,needs.app,'NEEDS_MORE_INFO',reason);const state=await assertDecision(needs.app.id,needsUser.user.id,sa.user.id,'NEEDS_MORE_INFO',1);await photo(page,'admin-needs-info');await statusUI(page,needsUser,needs.app,'NEEDS_MORE_INFO',reason);return state;});
  225 |   await step('DECIDE_NEEDS_INFO','SA can approve needs-info later; terminal rejected cannot be decided again',async()=>{await openApplications(page,sa);await decisionUI(page,needs.app,'APPROVED');const state=await assertDecision(needs.app.id,needsUser.user.id,sa.user.id,'APPROVED',2);await page.reload();await expect(appRow(page,needs.app.businessName)).toContainText('APPROVED');await statusUI(page,needsUser,needs.app,'APPROVED');if(isApi()){const before=await fixtures.snapshot();const repeat=await decisionApi(page,sa,rejected.app.id,'APPROVED');expect(repeat.status).toBe(409);expect(repeat.body.code).toBe('APPLICATION_ALREADY_DECIDED');expect(await fixtures.snapshot()).toEqual(before);}return state;});
  226 | });
  227 | 
```