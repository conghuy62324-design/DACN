const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const shared=require('./t13b01-support.cjs');
const {models,sequelize,guard}=shared;
const {Op}=require('sequelize');
const resources={places:models.Place,tours:models.Tour,tickets:models.Ticket,blogs:models.BlogPost};
const write=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');};
async function schema(){
  const result=await shared.schema();
  const [foreignKeys]=await sequelize.query("SELECT conrelid::regclass::text AS child,confrelid::regclass::text AS parent,conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace ORDER BY conrelid::regclass::text,conname");
  const [reviewIndexes]=await sequelize.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('reviews','user_favorites','bookings') ORDER BY indexname");
  assert.ok(foreignKeys.some(v=>v.conname==='reviews_booking_id_fkey'&&v.definition.includes('RESTRICT')));
  return {...result,foreignKeys,reviewIndexes};
}
class Fixtures{
  constructor(root,project){
    this.file=path.join(root,project,'ledger.json');this.data=fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file)):{runId:process.env.T13B02_RUN_ID,project,emails:[],users:[],businesses:[],planned:{},resources:{places:[],tours:[],tickets:[],blogs:[]},bookings:[],reviews:[],cleanupIds:{},cleanup:'PENDING'};this.save();
  }
  save(){write(this.file,this.data);}
  email(label){const email=`t13b02.${this.data.runId.slice(-6)}.${this.data.project}.${label.slice(0,10)}.${randomUUID().slice(0,8)}@example.test`.toLowerCase();assert.ok(email.split('@')[0].length<=64);this.data.emails.push(email);this.data.cleanup='PENDING';this.save();return email;}
  plan(table){const id=randomUUID();(this.data.planned[table]||=[]).push(id);this.data.cleanup='PENDING';this.save();return id;}
  async discover(){
    await guard('T13-B-02 discover exact fixture IDs');const d=this.data;
    if(d.emails.length)d.users=[...new Set([...d.users,...(await models.User.findAll({where:{email:d.emails},attributes:['id']})).map(v=>v.id)])];
    for(const [key,model] of Object.entries(resources))if(d.businesses.length)d.resources[key]=[...new Set([...d.resources[key],...(await model.findAll({where:{businessId:d.businesses},attributes:['id']})).map(v=>v.id)])];
    if(d.users.length){d.bookings=[...new Set([...d.bookings,...(await models.Booking.findAll({where:{userId:d.users},attributes:['id']})).map(v=>v.id)])];d.reviews=[...new Set([...d.reviews,...(await models.Review.findAll({where:{userId:d.users},attributes:['id']})).map(v=>v.id)])];}
    this.save();
  }
  async grant(userId,role){await this.discover();await guard('T13-B-02 fixture role grant');assert.ok(this.data.users.includes(userId));await models.UserRole.findOrCreate({where:{userId,role},defaults:{userId,role}});this.data.roleSetup||=[];this.data.roleSetup.push({userId,role,source:'Guarded fixture only; no onboarding or role editor acceptance'});this.save();}
  async business(userId,label,permissions=['MANAGE_BUSINESS','MANAGE_BOOKINGS']){
    await guard('T13-B-02 isolated Business fixture');assert.ok(this.data.users.includes(userId));const id=this.plan('businesses');
    await sequelize.transaction(async transaction=>{await models.Business.create({id,name:`T13B02 SYNTHETIC ${label}`,type:'TOUR_OPERATOR',email:'t13b02@example.test',phone:'0901234567',address:'SYNTHETIC TEST ONLY',city:`T13B02-${this.data.runId.slice(-6)}-${this.data.project}`,status:'ACTIVE'},{transaction});const memberId=this.plan('business_members');await models.BusinessMember.create({id:memberId,businessId:id,userId,permissions},{transaction});});
    this.data.businesses.push(id);this.save();return (await models.Business.findByPk(id)).toJSON();
  }
  async member(userId,businessId,permissions){await guard('T13-B-02 membership fixture');assert.ok(this.data.users.includes(userId)&&this.data.businesses.includes(businessId));const id=this.plan('business_members');await models.BusinessMember.create({id,businessId,userId,permissions});return id;}
  async review(userId,placeId){
    await guard('T13-B-02 retention-only Review prerequisite');assert.ok(this.data.users.includes(userId)&&this.data.resources.places.includes(placeId));const id=this.plan('reviews');
    await models.Review.create({id,targetType:'place',targetId:placeId,userId,userName:'T13B02 SYNTHETIC',rating:4,comment:'SYNTHETIC TEST ONLY moderation retention fixture',verificationStatus:'UNVERIFIED',moderationStatus:'PUBLISHED',source:'LEGACY',environment:'test',aiUsageAllowed:false,criteriaProvided:{service:false,price:false,location:false,experience:false}});this.data.reviews.push(id);this.save();return id;
  }
  async snapshot(){
    await this.discover();const d=this.data,rows=async(model,where)=> (await model.findAll({where,order:[[model.primaryKeyAttribute,'ASC']]})).map(v=>v.toJSON());
    const result={users:(await models.User.findAll({where:{id:d.users},attributes:['id','email','role','fullName'],order:[['id','ASC']]})).map(v=>v.toJSON()),roles:await rows(models.UserRole,{userId:d.users}),businesses:await rows(models.Business,{id:d.businesses}),members:await rows(models.BusinessMember,{businessId:d.businesses}),bookings:await rows(models.Booking,{id:d.bookings}),reviews:await rows(models.Review,{id:d.reviews}),histories:await rows(models.BookingStatusHistory,{bookingId:d.bookings}),audit:await rows(models.AuditLog,{actorUserId:d.users})};
    for(const [key,model]of Object.entries(resources))result[key]=await rows(model,{id:d.resources[key]});return result;
  }
  async cleanup(){
    await this.discover();await guard('T13-B-02 cleanup exact ledger IDs');const d=this.data;
    // Recover a crash between Business.create/transaction commit and response/ledger update.
    for(const id of d.planned.businesses||[])if(await models.Business.findByPk(id)&&!d.businesses.includes(id))d.businesses.push(id);
    this.save();await this.discover();
    assert.equal(await models.BusinessMember.count({where:{businessId:d.businesses,userId:{[Op.notIn]:d.users}}}),0,'Non-fixture member: stop cleanup');
    for(const model of [models.Booking,models.Review]){const key=model===models.Booking?'businessId':'targetId';const ids=model===models.Booking?d.businesses:[...d.resources.places,...d.resources.tours];assert.equal(await model.count({where:{[key]:ids,userId:{[Op.notIn]:d.users}}}),0,'Non-fixture dependent: stop cleanup');}
    assert.equal(await models.UserRole.count({where:{grantedBy:d.users,userId:{[Op.notIn]:d.users}}}),0,'Non-fixture role grant: stop cleanup');
    const remove=async(model,where,key=model.primaryKeyAttribute)=>{const ids=(await model.findAll({where,attributes:[key],transaction:this.tx})).map(v=>v.get(key));d.cleanupIds[model.tableName]=[...new Set([...(d.cleanupIds[model.tableName]||[]),...ids])];this.save();if(ids.length)await model.destroy({where:{[key]:ids},transaction:this.tx});};
    await sequelize.transaction(async tx=>{this.tx=tx;
      await remove(models.Review,{id:d.reviews});await remove(models.Favorite,{userId:d.users});
      await remove(models.UserEvent,{userId:d.users});await remove(models.RecommendationImpression,{userId:d.users});await remove(models.AuditLog,{actorUserId:d.users});
      await remove(models.BookingStatusHistory,{bookingId:d.bookings});await remove(models.Booking,{id:d.bookings});
      const requests=(await models.RecommendationRequest.findAll({where:{userId:d.users},attributes:['requestId'],transaction:tx})).map(v=>v.requestId);
      await remove(models.RecommendationVisibleImpression,{requestId:requests});await remove(models.RecommendationCandidate,{requestId:requests});await remove(models.RecommendationRequest,{requestId:requests});await remove(models.TelemetryConsent,{userId:d.users});
      await remove(models.TripSession,{userId:d.users});await remove(models.BlogPost,{id:d.resources.blogs});await remove(models.Ticket,{id:d.resources.tickets});
      if(d.resources.tours.length){const [links]=await sequelize.query('SELECT tour_id,place_id FROM tour_places WHERE tour_id IN (:ids)',{replacements:{ids:d.resources.tours},transaction:tx});d.tourPlaces=links;this.save();await sequelize.query('DELETE FROM tour_places WHERE tour_id IN (:ids)',{replacements:{ids:d.resources.tours},transaction:tx});}
      await remove(models.Tour,{id:d.resources.tours});await remove(models.Place,{id:d.resources.places});
      await remove(models.PartnerApplication,{userId:d.users});await remove(models.BusinessMember,{businessId:d.businesses});await remove(models.UserRole,{userId:d.users});await remove(models.Business,{id:d.businesses});await remove(models.User,{id:d.users});
    });this.tx=undefined;
    const residual={};for(const [table,ids]of Object.entries(d.cleanupIds)){const model=Object.values(models).find(v=>v?.tableName===table);assert.ok(model,table);residual[table]=await model.count({where:{[model.primaryKeyAttribute]:ids}});assert.equal(residual[table],0);}
    assert.equal(await models.User.count({where:{email:d.emails}}),0);d.cleanup='PASS';d.residual=residual;this.save();return {project:d.project,result:'PASS',users:d.users.length,businesses:d.businesses.length,resources:Object.fromEntries(Object.entries(d.resources).map(([k,v])=>[k,v.length])),bookings:d.bookings.length,reviews:d.reviews.length,residual};
  }
}
module.exports={models,resources,sequelize,guard,schema,Fixtures,write};
