// READ-ONLY ANALYSIS. Does not call Planner, Agent, provider, fetch or fixture APIs.
const boundary=require('./network-boundary.cjs'),c=require('./common.cjs');
Object.assign(process.env,{DB_PORT:'5432',LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'});
const db=require('./readonly-db.cjs');
const q=async(sql,replacements)=>{const [rows]=await db.sequelize.query(sql,replacements?{replacements}:undefined);return rows;};
(async()=>{
 const result={at:new Date().toISOString(),status:'BLOCKED',databaseWrites:0,ollamaRequests:0,plannerExecutions:0};let before;
 try{
  result.integrity=c.integrity();c.assert.equal(db.ENV.DB_PORT,5432);
  const guard=await db.guard();c.assert.equal(guard.schemaSha256,c.json(c.previous+'db-preflight.json').schemaSha256);c.write('db-gate-before.json',guard);
  const session=(await q("SELECT current_database() AS database,current_user AS role,current_setting('default_transaction_read_only') AS default_read_only,current_setting('transaction_read_only') AS transaction_read_only,inet_server_port() AS server_port,pg_is_in_recovery() AS in_recovery"))[0];
  c.assert.equal(session.database,'travelgo_ai_m0_test');c.assert.equal(session.default_read_only,'on');c.assert.equal(session.transaction_read_only,'on');c.assert.equal(session.server_port,5432);
  const role=(await q('SELECT rolname,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user'))[0];
  c.write('database-safety.json',{at:new Date().toISOString(),status:'PASS',configured:guard.configured,session,sentinel:guard.identity.sentinel,migrations:guard.migrations.length,schemaSha256:guard.schemaSha256,role,leastPrivilege:false,controls:'Startup default READ ONLY + fixed per-connection READ ONLY verification + SELECT/SHOW ORM query allowlist. Superuser role itself is not a safety guarantee.',schemaBaselineMatch:true,network:'Only127.0.0.1:5432; HTTP/Ollama blocked, including GET'});
  before=await db.fingerprint();c.write('fingerprint-before.json',before);c.assert.equal(before.tables.trip_sessions.rows,'27');c.assert.equal(Object.keys(before.tables).length,25);
  const places=await q(`SELECT p.id,p.name,p.slug,p.category,p.city,p.province,p.status,p.business_id,b.status AS business_status,b.type AS business_type,
   p.price_from::text AS price_from,p.rating::text AS rating,p.review_count,p.bayesian_rating::text AS bayesian_rating,p.latitude,p.longitude,
   p.duration,p.opening_hours,p.location IS NOT NULL AS has_geometry,
   length(trim(p.summary))>0 AS has_summary,length(trim(p.address))>0 AS has_address,length(trim(p.hero_image))>0 AS has_hero_image,
   p.created_at,p.updated_at FROM places p LEFT JOIN businesses b ON b.id=p.business_id ORDER BY p.city,p.category,p.id`);
  const normalize=x=>String(x??'').normalize('NFC').trim().toLocaleLowerCase('vi-VN');
  for(const p of places){p.public_status_match=p.status==='APPROVED';p.planner_public_eligible=p.public_status_match&&(!p.business_id||p.business_status==='ACTIVE');p.destination_match=[p.city,p.province].some(x=>normalize(x)===normalize('Đà Nẵng'));p.sightseeing=['attraction','tour'].includes(p.category);p.coordinate_range_valid=Number.isFinite(p.latitude)&&Number.isFinite(p.longitude)&&Math.abs(p.latitude)<=90&&Math.abs(p.longitude)<=180;}
  const grouped=[];for(const city of [...new Set(places.map(x=>x.city))]){const rows=places.filter(p=>p.city===city);grouped.push({city,normalizedCity:normalize(city),total:rows.length,categories:Object.fromEntries(['attraction','tour','hotel','restaurant'].map(k=>[k,rows.filter(x=>x.category===k).length])),statuses:Object.fromEntries([...new Set(rows.map(x=>x.status))].map(k=>[k,rows.filter(x=>x.status===k).length])),eligible:rows.filter(x=>x.planner_public_eligible).length,sightseeingEligible:rows.filter(x=>x.planner_public_eligible&&x.sightseeing).length});}
  c.write('catalog-inventory.json',{at:new Date().toISOString(),source:'CURRENT_REAL_READONLY_POSTGRESQL',total:places.length,groups:grouped,places,currency:'No currency column on places; Planner priceFrom semantics are VND by code, units remain assumptions',notes:'Raw all-status inventory; no credentials/user/contact details collected'});
  const {RecommendationRepository}=require(c.path.join(c.root,'backend/dist/repositories/recommendationRepository.js'));
  const loaded=await RecommendationRepository.getApprovedPlaces();
  c.assert.deepEqual(loaded.map(x=>x.id).sort(),places.filter(p=>p.public_status_match).map(x=>x.id).sort());
  c.write('production-loader-projection.json',{at:new Date().toISOString(),source:'UNCHANGED_PRODUCTION_DATABASE_LOADER',count:loaded.length,places:loaded.map(p=>({id:p.id,name:p.name,category:p.category,city:p.city,province:p.province,status:p.status,businessId:p.businessId??null,businessStatus:p.business?.status??null,priceFrom:p.priceFrom,catalogPriceAvailable:p.catalogPriceAvailable,latitude:p.latitude,longitude:p.longitude}))});
  const tours=await q('SELECT destination_city,status,count(*)::int AS count,min(start_date) AS earliest_start,max(end_date) AS latest_end,min(capacity) AS min_capacity,min(available_capacity) AS min_available_capacity FROM tours GROUP BY destination_city,status ORDER BY destination_city,status');
  c.write('separate-tours-inventory.json',{at:new Date().toISOString(),rows:tours,note:'Planner loads places.category=attraction/tour, not the separate tours table. Tour date/capacity cannot supply missing Place sightseeing.'});
  const constraints=await q("SELECT conname,conrelid::regclass::text AS table_name,confrelid::regclass::text AS referenced_table,contype,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid='public.places'::regclass OR confrelid='public.places'::regclass ORDER BY conrelid::regclass::text,conname");
  const triggers=await q("SELECT c.relname AS table_name,t.tgname,pg_get_triggerdef(t.oid) AS definition FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND NOT t.tgisinternal AND c.relname IN ('places','trip_sessions') ORDER BY c.relname,t.tgname");
  c.write('schema-dependencies.json',{at:new Date().toISOString(),constraints,triggers,placeColumns:guard.schema.filter(x=>x.table_name==='places'),sourceOfTruth:'Current pg_catalog/information_schema, checked against12 approved migrations'});
  const reserved=c.json(c.prefix+'reserved-fixture-ids.json'),ids=[...reserved.primaryMinimum,...reserved.optionalDailyCoverage];
  const collision=await q('SELECT id,slug FROM places WHERE id IN (:ids) OR slug IN (:slugs)',{ids,slugs:ids.map(id=>'test-fixture-tai04-planner-'+id)});c.assert.equal(collision.length,0);
  const refs=(await q("SELECT count(*)::int AS count FROM trip_sessions WHERE selected_place_ids::text LIKE :id1 OR selected_place_ids::text LIKE :id2 OR itinerary::text LIKE :id1 OR itinerary::text LIKE :id2",{id1:'%'+ids[0]+'%',id2:'%'+ids[1]+'%'}))[0];c.assert.equal(refs.count,0);
  c.write('fixture-collision-check.json',{at:new Date().toISOString(),status:'PASS_READONLY_DESIGN_CHECK',ids,idOrSlugCollisions:collision.length,existingTripReferences:refs.count,mustRecheckAtFutureExecution:true,noReservationWrittenToDB:true});
  const eligible=places.filter(x=>x.planner_public_eligible),destination=eligible.filter(x=>x.destination_match);
  result.inventory={raw:places.length,approvedLoader:loaded.length,eligible:eligible.length,eligibleAtDestination:destination.map(p=>({id:p.id,name:p.name,category:p.category,price:p.price_from})),eligibleSightseeingAtDestination:destination.filter(x=>x.sightseeing).length,eligibleSightseeingElsewhere:eligible.filter(x=>x.sightseeing&&!x.destination_match).length};
  c.assert.equal(result.inventory.eligibleSightseeingAtDestination,0);result.status='READONLY_ANALYSIS_PASS_FIXTURE_REQUIRED';result.exactRootCause='No APPROVED publicly eligible attraction/tour Place matching destination city or province NFC/trim/casefold=Đà Nẵng; source throws422 before recommendation/clustering/costing.';
 }catch(error){result.reason=String(error.message).slice(0,1500);result.code=error.code??null;process.exitCode=1;}
 finally{
  if(before){try{const g=await db.guard();c.write('db-gate-after.json',g);const after=await db.fingerprint();c.write('fingerprint-after.json',after);const changed=Object.keys(before.tables).filter(k=>JSON.stringify(before.tables[k])!==JSON.stringify(after.tables[k]));c.assert.deepEqual(changed,[]);c.write('fingerprint-compare.json',{at:new Date().toISOString(),status:'PASS',tables:25,changed,tripSessions:{before:before.tables.trip_sessions.rows,after:after.tables.trip_sessions.rows},schemaUnchanged:g.schemaSha256===c.json(c.prefix+'db-gate-before.json').schemaSha256});}catch(error){result.fingerprintFailure=error.message;result.status='BLOCKED';process.exitCode=1;}}
  await db.sequelize.close();result.dbAudit=db.audit;result.networkAudit=boundary;c.write('readiness-analysis.json',result);console.log(JSON.stringify(result));
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
