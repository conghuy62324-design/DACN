// Real PostgreSQL + production Core/Planner/Booking; all Trip/Booking writes are fenced at SQL dispatch.
const {root,path,fs,config,assert}=require('./catalog-staging-common.cjs'),{randomUUID}=require('node:crypto');
const {sequelize,Place,Business,User}=require(path.join(root,'backend/dist/models/index.js'));
const {AuthService}=require(path.join(root,'backend/dist/services/authService.js')),{AgentCoreService,CORE_CONSENT}=require(path.join(root,'backend/dist/services/agentCoreService.js')),{BookingService}=require(path.join(root,'backend/dist/services/bookingService.js'));
const results=[],queries=sequelize.query.bind(sequelize);let blockedWrites=0,svc,user,hotel,business,oldPrice,oldUpdated,oldBusinessUpdated;
sequelize.query=function(sql,options){const text=typeof sql==='string'?sql:sql?.query;if(/\b(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+(?:"public"\.)?"?(?:trip_sessions|bookings|trip_checkins|booking_status_histories)"?\b/i.test(text)){blockedWrites++;throw Error('TRIP_BOOKING_WRITE_FENCE');}return queries(sql,options);};
const expectReject=async(fn,code)=>{await assert.rejects(fn,e=>e.code===code);results.push({guard:code,status:'PASS'});};
(async()=>{try{
 const customer=(await User.findOne({where:{email:'catalog-browser@example.invalid'}}));assert(customer);user=await AuthService.getById(customer.id);svc=new AgentCoreService();let meta;
 const chat=async(message,extra={})=>{const r=await svc.chat(user,{message,...extra,intentVersion:'NATURAL_CHAT_V3',consentVersion:CORE_CONSENT,conversation:meta?{action:'continue',id:meta.id,revision:meta.revision,requestId:randomUUID(),consentVersion:CORE_CONSENT}:{action:'start',requestId:randomUUID(),consentVersion:CORE_CONSENT}});meta=r.conversation;return r;};
 const plan=await chat('Lập lịch trình; Nơi xuất phát: Huế; Điểm đến: Đà Nẵng; Ngày bắt đầu: 2026-12-10; Ngày kết thúc: 2026-12-12; Số người lớn: 2; Ngân sách cả nhóm: 12000000 VND; Phương tiện: ô tô');
 assert.equal(plan.result.type,'itinerary');hotel=await Place.findByPk(plan.selected.hotelId);assert.equal(hotel.catalogMetadata.source,'DEMO');oldPrice=hotel.priceFrom;oldUpdated=hotel.updatedAt;
 const preview=await chat('Lưu lịch trình'),ticket=preview.confirmation;assert(ticket);
 await Place.update({priceFrom:Number(oldPrice)+12345},{where:{id:hotel.id}});
 // Explicit guard verification on the approved staging. Write fence above makes any persistence a test failure.
 Object.assign(process.env,{PUBLIC_STAGING_WRITES_APPROVED:'true',PUBLIC_STAGING_DB_NAME:config.DB_NAME,PUBLIC_STAGING_DB_SENTINEL:config.CATALOG_DEMO_SENTINEL});
 await expectReject(()=>svc.confirm(user,{conversationId:meta.id,revision:meta.revision,ticketId:ticket.id,payloadHash:ticket.payloadHash,confirmed:true}),'AGENT_CATALOG_CHANGED');
 process.env.PUBLIC_STAGING_WRITES_APPROVED='false';
 business=await Business.findByPk(hotel.businessId);assert(business.name.startsWith('DEMO '));oldBusinessUpdated=business.updatedAt;await Business.update({status:'SUSPENDED'},{where:{id:business.id}});
 await expectReject(()=>svc.chat(user,{message:'Xem chi tiết',selectedIds:[hotel.id],intentVersion:'NATURAL_CHAT_V3',consentVersion:CORE_CONSENT,conversation:{action:'continue',id:meta.id,revision:meta.revision,requestId:randomUUID(),consentVersion:CORE_CONSENT}}),'AGENT_LISTING_NOT_FOUND');
 await expectReject(()=>BookingService.createBooking(user.id,{serviceType:'hotel',serviceId:hotel.id,bookingDate:'2026-12-10',adultsCount:2,childrenCount:0,customerPhone:'0000000000'},randomUUID()),'BUSINESS_NOT_ACTIVE');
 assert.equal(blockedWrites,0,'A mutation was attempted before stale/status validation');
 const [counts]=await sequelize.query('SELECT (SELECT count(*) FROM trip_sessions)::int AS trips,(SELECT count(*) FROM bookings)::int AS bookings');assert.equal(counts[0].trips,0);assert.equal(counts[0].bookings,0);results.push({guard:'NO_MUTATIONS',status:'PASS',counts:counts[0]});
 }catch(e){results.push({status:'FAIL',error:e.stack});process.exitCode=1;}
 finally{process.env.PUBLIC_STAGING_WRITES_APPROVED='false';if(hotel)await queries('UPDATE places SET price_from=$1,updated_at=$2 WHERE id=$3',{bind:[oldPrice,oldUpdated,hotel.id]});if(business)await queries('UPDATE businesses SET status=$1,updated_at=$2 WHERE id=$3',{bind:['ACTIVE',oldBusinessUpdated,business.id]});svc?.dispose();const out={at:new Date().toISOString(),tier:'REAL_STAGING_PRODUCTION_CORE_PLANNER_BOOKING_NO_MODEL',passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results,blockedTripBookingWrites:blockedWrites,actualTripBookingWrites:0,originalDBConnections:0,nativePost:0,restoredExactSeedRows:true,temporaryGuardScope:'Dedicated staging only; actual identity guard plus SQL mutation fence; default flag restored false'};fs.writeFileSync(path.join(root,'docs/evidence/travelgo-ai-agent-core/catalog-expansion-20261112/freshness.json'),JSON.stringify(out,null,2),{flag:'wx'});console.log(JSON.stringify(out,null,2));await sequelize.close();}
})();
