const assert=require('assert/strict');
module.exports=async({client,lock,root,credentials,save})=>{
 const ids=lock.caps.fixtureIds,{hashPassword}=require(root+'/backend/dist/services/passwordService.js');
 const count=(await client.query('SELECT count(*)::int n FROM users')).rows[0].n;if(count){assert.equal(count,4);let i=1;for(const [name,c]of Object.entries(credentials)){c.id=ids['f'+i++];const own=(await client.query('SELECT id FROM users WHERE id=$1 AND email=$2',[c.id,c.email])).rows;assert.equal(own.length,1);await client.query('UPDATE users SET password_hash=$2 WHERE id=$1',[c.id,await hashPassword(c.password)]);}save('synthetic-fixture-session-'+Date.now()+'.json',{status:'TASK_OWNED_TEST_CREDENTIALS_IN_RAM',users:4,ownerAccess:false});return;}
 await client.query('BEGIN');try{
 let i=1;for(const [name,c]of Object.entries(credentials)){c.id=ids['f'+i];const role=name==='admin'?'SUPER_ADMIN':name==='customer'?'CUSTOMER':'PARTNER';await client.query('INSERT INTO users(id,full_name,email,password_hash,role) VALUES($1,$2,$3,$4,$5)',[c.id,'SYNTHETIC '+name,c.email,await hashPassword(c.password),role==='SUPER_ADMIN'?'admin':role==='PARTNER'?'partner':'user']);await client.query('INSERT INTO user_roles(id,user_id,role) VALUES($1,$2,$3)',[ids['f'+(i+4)],c.id,role]);i++;}
 for(const n of [9,10])await client.query("INSERT INTO businesses(id,name,type,email,phone,address,city,status) VALUES($1,$2,'HOTEL','synthetic@hotel-2138b.invalid','0000000000','SYNTHETIC test address','Đà Lạt','ACTIVE')",[ids['f'+n],'SYNTHETIC Business '+n]);
 for(const [n,u,b]of [[11,credentials.partnerA.id,ids.f9],[12,credentials.partnerB.id,ids.f10]])await client.query("INSERT INTO business_members(id,user_id,business_id,permissions) VALUES($1,$2,$3,'[\"MANAGE_BUSINESS\",\"MANAGE_BOOKINGS\"]'::jsonb)",[ids['f'+n],u,b]);
 await client.query('COMMIT');save('synthetic-fixtures.json',{status:'COMMITTED',users:Object.fromEntries(Object.entries(credentials).map(([k,c])=>[k,{id:c.id,role:k==='admin'?'SUPER_ADMIN':k==='customer'?'CUSTOMER':'PARTNER'}])),businesses:[ids.f9,ids.f10],realDataCopied:false,ownerAccess:false});
 }catch(e){await client.query('ROLLBACK');throw e;}
};
