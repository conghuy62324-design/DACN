// No DB writes/connections. Exercise real service methods with model I/O replaced.
const assert=require('node:assert/strict');
const {BusinessMember,Business,Booking,Ticket}=require('../dist/models/index.js');
const {PartnerService}=require('../dist/services/partnerService.js');
const {TicketService}=require('../dist/services/ticketService.js');
const originals=[BusinessMember.findOne,Business.findByPk,Booking.findAndCountAll,Ticket.create,Ticket.findByPk];
(async()=>{let queries=0,permissions=[];
try{
 BusinessMember.findOne=async({where})=>where.businessId==='own'?{permissions}:null;
 Business.findByPk=async id=>({toJSON:()=>({id})});
 Booking.findAndCountAll=async options=>{queries++;assert.equal(options.where.businessId,'own');return{rows:[{id:'booking',businessId:'own'}],count:1};};
 for(const p of [[],['MANAGE_BUSINESS']]){permissions=p;await assert.rejects(()=>PartnerService.getBookings('member','own'),e=>e.statusCode===403&&e.code==='MISSING_MANAGE_BOOKINGS');assert.equal(queries,0);}
 permissions=['MANAGE_BOOKINGS'];await assert.rejects(()=>PartnerService.getBookings('member','foreign'),e=>e.statusCode===403&&e.code==='BUSINESS_ACCESS_DENIED');assert.equal(queries,0);assert.equal((await PartnerService.getBookings('member','own')).total,1);assert.equal(queries,1);
 permissions=['MANAGE_BUSINESS'];let captured;
 Ticket.create=async values=>{captured=values;return values;};
 const row={id:'ticket',businessId:'own',capacity:30,availableSeats:30,async update(values){captured=values;},toJSON(){return {...this,...captured};}};
 Ticket.findByPk=async()=>row;
 const fields=['departureTime','arrivalTime','validFrom','validUntil'];
 for(const [input,expected] of [['2030-06-15T10:30','2030-06-15T10:30:00.000Z'],['2030-06-15T10:30:12.345+07:00','2030-06-15T03:30:12.345Z'],['2030-06-15T10:30:12.345Z','2030-06-15T10:30:12.345Z'],[new Date('2030-06-15T01:02:03.456Z'),'2030-06-15T01:02:03.456Z']]){
  const values=Object.fromEntries(fields.map(k=>[k,input]));await TicketService.createForPartner('member','own',{...values,capacity:30,price:1});for(const key of fields)assert.equal(captured[key].toISOString(),expected);
  await TicketService.updateForPartner('member','ticket',values);for(const key of fields)assert.equal(captured[key].toISOString(),expected);
 }
 console.log('PASS: alias exact permission code and query gating; all 4 Ticket timestamp fields create/update: offset-free UTC minute, offset, Z precision, Date instance');
}finally{[BusinessMember.findOne,Business.findByPk,Booking.findAndCountAll,Ticket.create,Ticket.findByPk]=originals;}})().catch(e=>{console.error(e);process.exitCode=1;});
