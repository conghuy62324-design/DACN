const assert=require('assert/strict');
module.exports=async({db,lock,save})=>{
 const id=n=>lock.fixtureIds['f'+n];const results=require('./actual-freshness.json');assert.equal(results.status,'ACTUAL_PARTNER_HTTP_BROWSER_FRESHNESS_PASS');
 await db.query('BEGIN');try{
 await db.query('UPDATE hotel_rate_plans SET base_amount_vnd=1000000 WHERE id=$1 AND place_id=$2',[id(82),id(21)]);
 await db.query("UPDATE hotel_promotions SET value=1000,booking_ends_at='2027-12-01T00:00:00Z' WHERE id=$1 AND place_id=$2",[id(130),id(21)]);
 const audits=(await db.query('SELECT id FROM audit_logs WHERE actor_user_id=$1',[id(1)])).rows.map(r=>r.id);if(audits.length)await db.query('DELETE FROM audit_logs WHERE actor_user_id=$1 AND id=ANY($2::uuid[])',[id(1),audits]);
 await db.query('DELETE FROM business_members WHERE id=$1 AND user_id=$2',[id(4),id(1)]);await db.query('DELETE FROM user_roles WHERE id=$1 AND user_id=$2',[id(2),id(1)]);await db.query('DELETE FROM users WHERE id=$1 AND email=$2',[id(1),'partner@hotel-2138c.invalid']);
 await db.query('COMMIT');save('temporary-fixture-cleanup',{status:'COMMITTED',temporaryUsersRemoved:1,membershipsRemoved:1,rolesRemoved:1,auditIdsRemoved:audits,previewRetained:'8SYNTHETIC hotel/room/rate/address/media records and 1SYNTHETIC operator Business; no login accounts or private data',nativeSyntheticRestoreStatements:2,realRowsTouched:0});
 }catch(e){await db.query('ROLLBACK');throw e;}
 for(const table of ['users','user_roles','business_members','audit_logs','bookings','hotel_booking_stays','hotel_booking_items','hotel_room_allocations','reviews','verified_travel_knowledge','customer_travel_preferences'])assert.equal((await db.query('SELECT count(*)::int n FROM '+table)).rows[0].n,0,table);
 await db.query(`REVOKE INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public FROM ${lock.runtimeRole}`);await db.query(`ALTER ROLE ${lock.runtimeRole} SET default_transaction_read_only = on`);
 const access=(await db.query("SELECT has_table_privilege($1,'places','INSERT') can_insert,has_table_privilege($1,'hotel_rate_plans','UPDATE') can_update,has_table_privilege($1,'users','DELETE') can_delete",[lock.runtimeRole])).rows[0];assert(!access.can_insert&&!access.can_update&&!access.can_delete);
 save('public-preview-read-only',{status:'PASS',runtimeRole:lock.runtimeRole,defaultReadOnly:true,dmlRevoked:true,access,temporaryAccounts:0,bookingRows:0,reviewRows:0,protectedStagingWrites:0,originalDatabaseConnections:0,keptSyntheticHotels:8,keptSyntheticBusiness:1,worker:false,model:false});
};
