// No DB connection/writes: verify denial happens before any Booking query.
const assert=require('node:assert/strict');
const {BusinessMember,Business,Booking}=require('../dist/models/index.js');
const {PartnerService}=require('../dist/services/partnerService.js');
const originals=[BusinessMember.findOne,Business.findByPk,Booking.findAndCountAll];
(async()=>{let queries=0;let permissions=[];
try{
 BusinessMember.findOne=async({where})=>where.businessId==='own'?{permissions}:null;
 Business.findByPk=async id=>({toJSON:()=>({id})});
 Booking.findAndCountAll=async(options)=>{queries++;assert.equal(options.where.businessId,'own');return{rows:[{id:'fixture-booking',businessId:'own'}],count:1};};
 for(const perms of [[],['MANAGE_BUSINESS']]){permissions=perms;await assert.rejects(()=>PartnerService.getBookings('member','own'),e=>e.statusCode===403&&e.code==='BUSINESS_ACCESS_DENIED');assert.equal(queries,0);}
 permissions=['MANAGE_BOOKINGS'];await assert.rejects(()=>PartnerService.getBookings('member','foreign'),e=>e.statusCode===403);assert.equal(queries,0);
 const result=await PartnerService.getBookings('member','own');assert.equal(result.items[0].id,'fixture-booking');assert.equal(queries,1);
 console.log('PASS: alias denies missing permission/foreign membership before querying Booking, permits scoped member');
}finally{[BusinessMember.findOne,Business.findByPk,Booking.findAndCountAll]=originals;}})().catch(e=>{console.error(e);process.exitCode=1;});
