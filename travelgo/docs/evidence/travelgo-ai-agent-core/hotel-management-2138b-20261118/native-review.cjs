const assert=require('assert/strict');
module.exports=async({client,lock,save})=>{
 const id=n=>lock.caps.fixtureIds['f'+n],results=[];
 for(const mode of ['actualStay','wrongAuthor','wrongPlace']){
 await client.query('BEGIN');let error;
 try{await client.query("INSERT INTO bookings(id,booking_code,user_id,business_id,place_id,service_type,service_id,service_name,customer_name,customer_email,customer_phone,booking_date,return_date,adults_count,children_count,unit_price,total_amount,quantity,booking_status) VALUES($1,'REVIEW-NATIVE',$2,$3,$4::uuid,'hotel',$4::text,'SYNTHETIC','SYNTHETIC','native@hotel-2138b.invalid','0000000000','2026-11-01','2026-11-03',1,0,100,200,1,'PENDING')",[id(78),id(4),id(9),id(61)]);
 await client.query("INSERT INTO hotel_booking_stays(booking_id,place_id,business_id,check_in,check_out,total_vnd,source_version,quote_snapshot) VALUES($1,$2,$3,'2026-11-01','2026-11-03',200,$4,'{}')",[id(78),id(61),id(9),'b'.repeat(64)]);
 await client.query("INSERT INTO hotel_booking_items(id,booking_id,place_id,room_type_id,rate_plan_id,quantity,occupancy,total_vnd,quote_snapshot) VALUES($1,$2,$3,$4,$5,1,'[{\"adults\":1,\"childAges\":[]}]',200,'{}')",[id(79),id(78),id(61),id(62),id(63)]);
 for(const [n,d]of [[77,'2026-11-01'],[78,'2026-11-02']]){await client.query('INSERT INTO hotel_room_inventory(room_type_id,place_id,stay_date,sellable_quantity) VALUES($1,$2,$3,1)',[id(62),id(61),d]);await client.query('INSERT INTO hotel_room_allocations(id,booking_item_id,room_type_id,stay_date,quantity) VALUES($1,$2,$3,$4,1)',[id(n),id(79),id(62),d]);}
 await client.query("UPDATE bookings SET booking_status='COMPLETED' WHERE id=$1",[id(78)]);
 await client.query("INSERT INTO reviews(id,target_type,target_id,user_id,user_name,rating,comment,booking_id,moderation_status,ai_usage_allowed) VALUES($1,'hotel',$2,$3,'SYNTHETIC',4,'SYNTHETIC nonpublic integrity fixture; rolled back',$4,'PENDING',false)",[id(80),mode==='wrongPlace'?id(71):id(61),mode==='wrongAuthor'?id(1):id(4),id(78)]);
 await client.query('INSERT INTO hotel_review_stays(review_id,booking_item_id) VALUES($1,$2)',[id(80),id(79)]);await client.query('SET CONSTRAINTS ALL IMMEDIATE');
 }catch(e){error={code:e.code,message:e.message};}finally{await client.query('ROLLBACK');}
 if(mode==='actualStay')assert.equal(error,undefined);else assert(error?.message.includes('HOTEL_REVIEW_STAY_NOT_VERIFIED'));
 results.push({mode,status:'NATIVE_PASS',actualBookedItemOnly:true,reviewPublished:false,rolledBack:true,...(error?{rejection:error}:{} )});
 }
 const count=(await client.query('SELECT count(*)::int n FROM reviews')).rows[0].n;assert.equal(count,0);save('native-review-attribution.json',{status:'NATIVE_PASS',results,reviewRowsAfter:count,noRealReviewCorpusCreated:true,modelCalls:0});
};
