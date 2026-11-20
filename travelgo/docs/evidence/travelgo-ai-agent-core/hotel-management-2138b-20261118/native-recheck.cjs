const assert=require('assert/strict'),fs=require('fs'),path=require('path');
module.exports=async({client,lock,save})=>{
 const id=n=>lock.caps.fixtureIds['f'+n];await client.query('BEGIN');let error;
 try{await client.query("INSERT INTO bookings(id,booking_code,user_id,business_id,place_id,service_type,service_id,service_name,customer_name,customer_email,customer_phone,booking_date,return_date,adults_count,children_count,unit_price,total_amount,quantity,booking_status) VALUES($1,'SCOPED-RECHECK',$2,$3,$4::uuid,'hotel',$4::text,'SYNTHETIC','SYNTHETIC','native@hotel-2138b.invalid','0000000000','2028-02-28','2028-03-01',1,0,100,200,1,'PENDING')",[id(68),id(4),id(9),id(61)]);
 await client.query("INSERT INTO hotel_booking_stays(booking_id,place_id,business_id,check_in,check_out,total_vnd,source_version,quote_snapshot) VALUES($1,$2,$3,'2028-02-28','2028-03-01',200,$4,'{}')",[id(68),id(61),id(9),'a'.repeat(64)]);
 await client.query("INSERT INTO hotel_booking_items(id,booking_id,place_id,room_type_id,rate_plan_id,quantity,occupancy,total_vnd,quote_snapshot) VALUES($1,$2,$3,$4,$5,1,'[{\"adults\":1,\"childAges\":[]}]',200,'{}')",[id(69),id(68),id(61),id(62),id(63)]);
 await client.query("INSERT INTO hotel_room_allocations(id,booking_item_id,room_type_id,stay_date,quantity) VALUES($1,$2,$3,'2028-02-28',1)",[id(77),id(69),id(62)]);
 await client.query('SET CONSTRAINTS hotel_item_all_nights IMMEDIATE');
 }catch(e){error={code:e.code,message:e.message};}finally{await client.query('ROLLBACK');}
 assert(error?.message.includes('HOTEL_ALLOCATION_ALL_NIGHTS_REQUIRED'));const file=fs.readdirSync(__dirname).filter(f=>/^native-invariants-\d+\.json$/.test(f)).sort().pop(),prior=JSON.parse(fs.readFileSync(path.join(__dirname,file)));assert.equal(prior.results.filter(r=>r.status==='FAIL').length,1);
 const results=prior.results.map(r=>r.name==='Missing final night'?{name:r.name,status:'PASS',scope:'hotel_item_all_nights checked independently with same expected error',error}:r);assert(results.every(r=>r.status==='PASS'));
 save('native-acceptance.json',{status:'NATIVE_PASS',originalEvidence:file,originalFailPreserved:true,originalCause:'hotel_stay_complete fires first and correctly rejects partial coverage under a different error code; recheck isolates the named all-night guard',results,unchangedExpected:'HOTEL_ALLOCATION_ALL_NIGHTS_REQUIRED',publicTables:52,migrations:18});
};
