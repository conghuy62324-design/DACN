// Exact, expiring Trip scope for the existing isolated staging launcher.
const assert=require('node:assert/strict');
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(x);
function tripWriteScope(p,now=Date.now()){
 assert.equal(p.status,'APPROVED_BOUNDED_TRIP_STAGING');assert(['21.27','21.27-A'].includes(p.task));
 assert(uuid(p.customerId)&&uuid(p.syntheticCustomerId)&&uuid(p.syntheticRoleId));assert(p.customerId!==p.syntheticCustomerId);
 assert(/^[a-f0-9]{64}$/.test(p.principalHash));assert(Array.isArray(p.tripIds)&&p.tripIds.length>0&&p.tripIds.length<=2&&p.tripIds.every(uuid)&&new Set(p.tripIds).size===p.tripIds.length);
 assert(Date.parse(p.expiresAt)>now&&Date.parse(p.expiresAt)<=now+4*3600000);
 assert.equal(p.originalDbAllowed,false);assert.equal(p.catalogWritesAllowed,false);assert.equal(p.bookingWritesAllowed,false);assert.equal(p.knowledgeWritesAllowed,false);assert.equal(p.modelAllowed,false);
 assert.equal(p.maxNormalChats,8);assert.equal(p.maxValidConfirmations,2);assert.equal(p.reserve,10);assert.equal(p.cap,20);
 assert.equal(p.dbName,'travelgo_staging_catalog_20261112');assert.equal(p.dbSentinel,'travelgo-public-staging:catalog-20261112');return p;
}
const columns=new Set(['id','user_id','name','destination_city','departure_city','start_date','end_date','days_count','total_budget_vnd','estimated_cost_vnd','actual_spent_vnd','pacing','status','preferences','itinerary','selected_place_ids','selected_tour_ids','checkins','progress_percent','notes','is_public','planner_metadata','created_at','updated_at']);
function tripSqlAllowed(p,sql,values,now=Date.now()){
 try{tripWriteScope(p,now);assert(Array.isArray(values));assert(!/;/.test(sql.replace(/;\s*$/,''))&&!/\b(?:OR|WITH|ON\s+CONFLICT)\b/i.test(sql));
  const ins=/^\s*INSERT INTO "?trip_sessions"?\s*\(([^)]+)\)\s*VALUES\s*\(([^)]+)\)\s*RETURNING\b/i.exec(sql);
  if(ins){const names=ins[1].split(',').map(x=>x.trim().replaceAll('"','')),refs=ins[2].split(',').map(x=>x.trim());assert.equal(names.length,refs.length);assert(names.every(x=>columns.has(x)));assert(refs.every(x=>/^\$\d+$/.test(x)));const row=Object.fromEntries(names.map((k,i)=>[k,values[+refs[i].slice(1)-1]]));return p.tripIds.includes(row.id)&&row.user_id===p.customerId;}
  const update=/^\s*UPDATE "?trip_sessions"? SET ([\s\S]+?) WHERE "?id"?\s*=\s*\$(\d+)\s*(?:RETURNING\b[\s\S]*)?;?\s*$/i.exec(sql);
  if(update){assert(p.tripIds.includes(values[+update[2]-1]));for(const field of update[1].split(',')){const m=/^\s*"?([a-z_]+)"?\s*=\s*\$\d+\s*$/i.exec(field);assert(m&&columns.has(m[1])&&!['id','user_id','created_at'].includes(m[1]));}return true;}
  const del=/^\s*DELETE FROM "?trip_sessions"? WHERE "?id"?\s*=\s*\$(\d+)\s*;?\s*$/i.exec(sql);return !!del&&p.tripIds.includes(values[+del[1]-1]);
 }catch{return false;}
}
function installTripScopeHooks(TripSession,plan){
 tripWriteScope(plan);let creates=0;const assigned=new WeakMap();
 TripSession.addHook('beforeValidate','boundedTripIds',instance=>{if(instance.isNewRecord){tripWriteScope(plan);assert.equal(instance.userId,plan.customerId);let id=assigned.get(instance);if(!id){assert(creates<plan.tripIds.length,'TASK_TRIP_CREATE_CAP');id=plan.tripIds[creates++];assigned.set(instance,id);}instance.setDataValue('id',id);if(!instance.name.startsWith('SYNTHETIC21.27 '))instance.name='SYNTHETIC21.27 '+instance.name;}});
 for(const event of ['beforeUpdate','beforeDestroy'])TripSession.addHook(event,'boundedTripOwner',instance=>{tripWriteScope(plan);assert.equal(instance.userId,plan.customerId);assert(plan.tripIds.includes(instance.id));});
}
module.exports={tripWriteScope,tripSqlAllowed,installTripScopeHooks};
