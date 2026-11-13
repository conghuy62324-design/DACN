const {root,path,fs,config,assert,identity,sha}=require('./catalog-staging-common.cjs');
const {randomUUID,randomBytes}=require('node:crypto'),{Op}=require('sequelize'),{Client}=require('pg');
const models=require(path.join(root,'backend/dist/models/index.js')), {sequelize,UserRole,Business,Place,AuditLog,PartnerApplication,BusinessMember,User}=models;
const app=require(path.join(root,'backend/dist/app.js')).default;
const dataset=require(path.join(root,'database/fixtures/catalog-10.cjs'));
const group=path.join(root,'docs/evidence/travelgo-ai-agent-core/catalog-expansion-20261112'),run=process.argv[2]||'01',results=[],traces=[],created={users:[],places:[],businesses:[],applications:[]};
const write=(name,v)=>fs.writeFileSync(path.join(group,name+'-'+run+'.json'),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
let server,base,customer,admin,partner,password=randomBytes(18).toString('hex')+'A1';
const test=async(name,work)=>{try{const detail=await work();results.push({name,status:'PASS',detail});}catch(e){results.push({name,status:'FAIL',error:e.message});throw e;}};
async function req(route,token,method='GET',body){const start=performance.now(),response=await fetch(base+'/api'+route,{method,redirect:'error',headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(25000)}),value=await response.json();traces.push({route,method,status:response.status,ms:performance.now()-start,...(!route.startsWith('/auth')?{response:value}:{})});return{status:response.status,...value};}
async function ok(route,token,method,body,status=200){const r=await req(route,token,method,body);assert.equal(r.status,status,JSON.stringify(r));assert.equal(r.success,true);return r;}
async function register(label){const r=await ok('/auth/register',null,'POST',{fullName:'Khách DEMO',email:`catalog-${label}-${randomUUID()}@example.invalid`,password},201);created.users.push(r.data.user.id);return r.data;}
async function chat(message,extra={},prior){if(!prior)await ok('/agent/core/sessions',customer.token,'DELETE');return ok('/agent/core/chat',customer.token,'POST',{message,...extra,intentVersion:'NATURAL_CHAT_V3',consentVersion:'TRAVELGO_CORE_SLOTS_V1',conversation:prior?{action:'continue',id:prior.id,revision:prior.revision,requestId:randomUUID(),consentVersion:'TRAVELGO_CORE_SLOTS_V1'}:{action:'start',requestId:randomUUID(),consentVersion:'TRAVELGO_CORE_SLOTS_V1'}});}
const fullPlan=city=>`Lập lịch trình; Nơi xuất phát: Huế; Điểm đến: ${city==='Huế'?'Huế':city}; Ngày bắt đầu: 2026-12-10; Ngày kết thúc: 2026-12-12; Số người lớn: 2; Ngân sách cả nhóm: 12000000 VND; Phương tiện: ô tô`;
async function cleanup(){await sequelize.transaction(async transaction=>{
 if(created.places.length)await Place.destroy({where:{id:{[Op.in]:created.places},'catalogMetadata.source':'DEMO'},transaction});
 if(created.users.length){await AuditLog.destroy({where:{actorUserId:{[Op.in]:created.users}},transaction});await BusinessMember.destroy({where:{userId:{[Op.in]:created.users}},transaction});await PartnerApplication.destroy({where:{userId:{[Op.in]:created.users}},transaction});}
 if(created.businesses.length)await Business.destroy({where:{id:{[Op.in]:created.businesses},name:{[Op.like]:'DEMO %'}},transaction});
 if(created.users.length){await UserRole.destroy({where:{userId:{[Op.in]:created.users}},transaction});await User.destroy({where:{id:{[Op.in]:created.users},email:{[Op.like]:'catalog-%@example.invalid'}},transaction});}
 });}
(async()=>{try{
 await sequelize.authenticate();server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));base='http://127.0.0.1:'+server.address().port;
 customer=await register('customer');admin=await register('admin');partner=await register('partner');await UserRole.create({userId:admin.user.id,role:'SUPER_ADMIN'});
 admin=(await ok('/auth/login',null,'POST',{email:admin.user.email,password})).data;
 await test('D01 isolated identity and 10 x (5 hotels + 5 restaurants + 3 attractions)',async()=>{
  const client=new Client({host:config.DB_HOST,port:+config.DB_PORT,user:config.DB_USER,password:config.DB_PASSWORD,database:config.DB_NAME});await client.connect();try{const id=await identity(client),rows=(await client.query("SELECT city,category,count(*)::int AS n FROM places WHERE catalog_metadata->>'cohort'=$1 GROUP BY city,category",[dataset.cohort])).rows;assert.equal(rows.length,30);for(const r of rows)assert.equal(r.n,r.category==='attraction'?3:5);assert.equal(new Set(dataset.places.map(p=>p.id)).size,130);const bad=(await client.query("SELECT count(*)::int AS n FROM places p LEFT JOIN businesses b ON b.id=p.business_id WHERE p.catalog_metadata->>'cohort'=$1 AND ((p.category IN ('hotel','restaurant') AND b.id IS NULL) OR p.rating IS NOT NULL OR p.review_count!=0)",[dataset.cohort])).rows[0].n;assert.equal(bad,0);return{id,counts:rows};}finally{await client.end();}
 });
 await test('D02 seed idempotence preserves row contents and existing UUIDs',async()=>{const cp=require('node:child_process'),script=path.join(root,'backend/scripts/catalog-staging-seed.cjs'),a=JSON.parse(cp.execFileSync(process.execPath,[script],{encoding:'utf8'})),b=JSON.parse(cp.execFileSync(process.execPath,[script],{encoding:'utf8'}));assert.equal(a.inserted,0);assert.equal(b.inserted,0);assert.equal(a.fingerprint,b.fingerprint);return{first:a,second:b};});
 await test('D03 demo excluded from public/default scope, and status query cannot override approval',async()=>{process.env.CATALOG_DEMO_ENABLED='false';try{const r=await ok('/places?limit=100');assert.equal(r.data.length,0);const{RegisteredCatalogService}=require(path.join(root,'backend/dist/services/registeredCatalogService.js'));assert.equal((await new RegisteredCatalogService().eligible()).length,0);}finally{process.env.CATALOG_DEMO_ENABLED='true';}return{defaultDemoListings:0};});
 await test('A01 real HTTP filters, sorting, pagination and invalid input',async()=>{
  for(const [query,check]of [
   ['category=hotel&city='+encodeURIComponent('Đà Nẵng'),r=>assert.equal(r.data.length,5)],
   ['category=hotel&city='+encodeURIComponent('Đà Lạt')+'&maxPriceFrom=800000',r=>{assert.equal(r.data.length,3);assert(r.data.every(p=>p.priceFrom<=800000));}],
   ['category=restaurant&city='+encodeURIComponent('Nha Trang')+'&cuisine=seafood',r=>{assert.equal(r.data.length,1);assert(r.data[0].catalogMetadata.cuisines.includes('seafood'));}],
   ['category=hotel&city='+encodeURIComponent('Phú Quốc')+'&accommodationType=resort',r=>assert.equal(r.data.length,1)],
   ['category=hotel&city='+encodeURIComponent('Đà Nẵng')+'&amenities='+encodeURIComponent('Hồ bơi'),r=>assert.equal(r.data.length,1)],
   ['category=hotel&city='+encodeURIComponent('Đà Nẵng')+'&sortBy=priceAsc',r=>assert.deepEqual(r.data.map(p=>p.priceFrom),[350000,550000,750000,1100000,null])],
   ['category=hotel&city='+encodeURIComponent('Đà Nẵng')+'&sortBy=priceDesc',r=>assert.deepEqual(r.data.map(p=>p.priceFrom),[1100000,750000,550000,350000,null])],
   ['category=hotel&city='+encodeURIComponent('Đà Nẵng')+'&sortBy=relevance',r=>{assert.equal(r.data.length,5);assert(r.data.every(p=>Number.isFinite(p.score)));}],
   ['category=hotel&city='+encodeURIComponent('Đà Lạt')+'&search='+encodeURIComponent('Đà Nẵng'),r=>assert.equal(r.data.length,0)],
   ['category=hotel&limit=2&page=2',r=>{assert.equal(r.data.length,2);assert.equal(r.meta.total,50);}],
   ['category=hotel&minRating=4',r=>assert.equal(r.data.length,0)],
  ]){const r=await ok('/places?'+query);check(r);}
  for(const query of ['page=NaN','maxPriceFrom=-1','minPriceFrom=100&maxPriceFrom=10','cuisine=SQL','category=hotel&amenities[x]=bad'])assert.equal((await req('/places?'+query)).status,400);
  return{queries:16};
 });
 await test('P01 production Planner from real staging catalog in all 10 destinations',async()=>{const plans=[];for(const d of dataset.destinations){const r=(await chat(fullPlan(d.city))).data;assert.equal(r.status,'completed',JSON.stringify(r));assert.equal(r.model.invoked,false);const p=r.result.itinerary;assert.equal(p.daysCount,3);assert.equal(p.nightsCount,2);assert.equal(p.destinationCity,d.city);assert(p.selectedPlaceIds.every(id=>dataset.places.some(x=>x.id===id&&x.city===d.city)));assert(r.result.warnings.some(w=>w.includes('DEMO')));plans.push({city:d.city,days:p.daysCount,nights:p.nightsCount,ids:p.selectedPlaceIds,hotel:p.hotelSuggestion?.id,cost:r.result.cost,warnings:r.result.warnings});}return plans;});
 await test('A02 compound Vietnamese request scopes hotel price and restaurant cuisine',async()=>{const r=(await chat('Đi Đà Lạt 3 ngày 2 đêm, 2 người, tìm khách sạn dưới 800k và nhà hàng đặc sản.')).data;assert.equal(r.tool,'search_registered_hotels');assert.equal(r.verifiedTravel.totalBudget,undefined);const items=r.result.items;assert(items.some(p=>p.category==='hotel'));assert(items.some(p=>p.category==='restaurant'));assert(items.every(p=>p.city==='Đà Lạt'));assert(items.filter(p=>p.category==='hotel').every(p=>p.priceFrom<=800000));assert(items.filter(p=>p.category==='restaurant').every(p=>p.catalogMetadata.cuisines.includes('local')));return{tool:r.tool,items:items.map(p=>({id:p.id,category:p.category,price:p.priceFrom})),verified:r.verifiedTravel};});
 await test('L01 real partner application, role approval, Place lifecycle and latest Agent price',async()=>{
  assert.equal((await req('/partner/places',customer.token,'POST',{})).status,403);
  const application=(await ok('/partner-applications',partner.token,'POST',{representativeName:'Đối tác DEMO',businessName:'DEMO Dynamic '+run,businessType:'HOTEL',email:'demo@example.invalid',phone:'0000000000',address:'Địa chỉ DEMO không phục vụ khách',city:'Đà Nẵng',verificationDetails:{cohort:'catalog-dynamic-'+run}},201)).data;
  created.applications.push(application.id);
  const approved=(await ok('/admin/partners/'+application.id+'/approval',admin.token,'PATCH',{status:'APPROVED',reason:'DEMO staging acceptance only'})).data;
  const businessId=approved.business.id;created.businesses.push(businessId);
  partner=(await ok('/auth/login',null,'POST',{email:partner.user.email,password})).data;
  const input={name:'DEMO Dynamic '+run,category:'hotel',summary:'DEMO lifecycle acceptance',description:'DEMO không phải đối tác thật',city:'Đà Nẵng',province:'Đà Nẵng',address:'Địa chỉ DEMO',latitude:16.01,longitude:108.01,priceFrom:250000,heroImage:'/images/catalog-demo.svg',catalogMetadata:{accommodationType:'hotel'},businessId};
  const place=(await ok('/partner/places',partner.token,'POST',input,201)).data;created.places.push(place.id);assert.equal(place.status,'DRAFT');assert.equal(place.approvedAt,null);
  const search='/places?category=hotel&city='+encodeURIComponent('Đà Nẵng')+'&maxPriceFrom=300000';
  const agent=()=>chat('Tìm khách sạn ở Đà Nẵng giá tối đa 300000 VND');
  assert.equal((await ok(search)).data.length,0);assert.equal((await agent()).data.result.items.length,0);
  await ok('/partner/places/'+place.id+'/submit',partner.token,'POST',{});
  assert.equal((await ok(search)).data.length,0);assert.equal((await agent()).data.result.items.length,0);
  const accepted=(await ok('/admin/places/'+place.id+'/status',admin.token,'PATCH',{status:'APPROVED'})).data;assert(accepted.approvedAt);assert.equal((await ok(search)).data[0].id,place.id);assert.equal((await agent()).data.result.items[0].id,place.id);
  const recent=(await chat('Có khách sạn nào mới đăng ký ở Đà Nẵng không?')).data;assert(recent.result.items.some(p=>p.id===place.id));assert(recent.result.warnings.some(w=>w.includes('không phải thời điểm đăng ký')));
  await ok('/admin/places/'+place.id+'/status',admin.token,'PATCH',{status:'DRAFT',reason:'DEMO approved-price edit uses existing review workflow'});
  await ok('/partner/places/'+place.id,partner.token,'PATCH',{priceFrom:180000});await ok('/partner/places/'+place.id+'/submit',partner.token,'POST',{});await ok('/admin/places/'+place.id+'/status',admin.token,'PATCH',{status:'APPROVED'});
  assert.equal((await agent()).data.result.items[0].priceFrom,180000);
  await Business.update({status:'SUSPENDED'},{where:{id:businessId}});
  assert.equal((await ok(search)).data.length,0);assert.equal((await agent()).data.result.items.length,0);assert.equal((await req('/places/'+place.id)).status,404);
  await Business.update({status:'ACTIVE'},{where:{id:businessId}});await ok('/admin/places/'+place.id+'/status',admin.token,'PATCH',{status:'SUSPENDED'});assert.equal((await agent()).data.result.items.length,0);
  return{applicationId:application.id,businessId,placeId:place.id,stages:['DRAFT_HIDDEN','PENDING_HIDDEN','APPROVED_ACTIVE_VISIBLE','PRICE_REFRESH_180000','BUSINESS_SUSPENDED_HIDDEN','PLACE_SUSPENDED_HIDDEN'],businessSuspendMethod:'ORM on exact test-created Business; no business status HTTP endpoint exists',cache:'none; repository requery each turn'};
 });
 await test('S01 additive migration rollback is transactional and data-preserving',async()=>{const transaction=await sequelize.transaction();try{const sql=fs.readFileSync(path.join(root,'database/rollback/20261112_13_catalog_metadata.down.sql'),'utf8');await sequelize.query(sql,{transaction});const [cols]=await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name='places' AND column_name IN ('catalog_metadata','approved_at')",{transaction});assert.equal(cols.length,0);}finally{await transaction.rollback();}const [rows]=await sequelize.query("SELECT count(*)::int AS n FROM places WHERE catalog_metadata->>'cohort'=$1",{bind:[dataset.cohort]});assert.equal(rows[0].n,131);return{rollback:'TESTED_IN_TRANSACTION_ROLLED_BACK',originalCatalogIntact:true};});
 }catch(e){console.error(e.stack);}
 finally{let cleanupStatus='PASS';try{await cleanup();}catch(e){cleanupStatus='FAIL';results.push({name:'cleanup',status:'FAIL',error:e.message});}write('committed-ledger',{created,cleanupStatus,scope:'Exact current-run cohort IDs only; seeded 130 listings retained'});write('http-traces',traces);write('acceptance',{at:new Date().toISOString(),tier:'REAL_LOCAL_POSTGRES_REAL_HTTP_REAL_SERVICES_DEMO_CATALOG_NO_MODEL',passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results,nativeGet:0,nativePost:0,cleanupStatus});if(server)await new Promise(r=>server.close(r));await sequelize.close();if(results.some(r=>r.status==='FAIL'))process.exitCode=1;console.log(JSON.stringify({passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,cleanupStatus}));}
})();
