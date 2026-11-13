const {fs,path,root,config,assert,identity,sha}=require('./catalog-staging-common.cjs'),{Client}=require('pg');
const data=require(path.join(root,'database/fixtures/catalog-10.cjs'));
const snake=s=>s.replace(/[A-Z]/g,c=>'_'+c.toLowerCase());
(async()=>{const client=new Client({host:config.DB_HOST,port:+config.DB_PORT,user:config.DB_USER,password:config.DB_PASSWORD,database:config.DB_NAME});await client.connect();try{
 await identity(client);await client.query('BEGIN');await client.query("SELECT pg_advisory_xact_lock(hashtext('travelgo-catalog-10-v1-seed'))");
 assert.equal((await client.query('SELECT count(*)::int AS n FROM trip_sessions')).rows[0].n,0,'Seed is catalog-only; unexpected Trip cohort');
 const mode=process.argv[2]||'seed';assert(['seed','cleanup','inspect'].includes(mode));let inserted=0;
 if(mode==='seed'){
  for(const b of data.businesses){const old=(await client.query('SELECT name FROM businesses WHERE id=$1',[b.id])).rows[0];if(old)assert.equal(old.name,b.name,'Business collision');const keys=Object.keys(b),r=await client.query(`INSERT INTO businesses(${keys.map(snake).join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT(id) DO NOTHING`,Object.values(b));inserted+=r.rowCount;}
  for(const p of data.places){const old=(await client.query('SELECT slug,catalog_metadata FROM places WHERE id=$1',[p.id])).rows[0];if(old){assert.equal(old.slug,p.slug,'Place collision');assert.equal(old.catalog_metadata.cohort,data.cohort);}
   const keys=Object.keys(p);const r=await client.query(`INSERT INTO places(${keys.map(snake).join(',')}) VALUES(${keys.map((_,i)=>'$'+(i+1)).join(',')}) ON CONFLICT(id) DO NOTHING`,Object.entries(p).map(([k,v])=>['catalogMetadata','galleryImages','highlights','amenities','openingHours','contactInfo'].includes(k)?JSON.stringify(v):v));inserted+=r.rowCount;}
 }else if(mode==='cleanup'){
  const ids=data.places.map(p=>p.id),businessIds=data.businesses.map(b=>b.id);
  const cohort=(await client.query("SELECT id FROM places WHERE catalog_metadata->>'cohort'=$1",[data.cohort])).rows.map(r=>r.id);assert(cohort.every(id=>ids.includes(id)),'Unexpected cohort records: inspect before cleanup');
  const refs=(await client.query('SELECT count(*)::int AS n FROM bookings WHERE place_id=ANY($1::uuid[])',[ids])).rows[0].n;assert.equal(refs,0,'Refuse cleanup with Booking references');
  const foreign=(await client.query('SELECT count(*)::int AS n FROM places WHERE business_id=ANY($1::uuid[]) AND NOT(id=ANY($2::uuid[]))',[businessIds,ids])).rows[0].n;assert.equal(foreign,0,'Foreign Place references');
  await client.query("DELETE FROM places WHERE id=ANY($1::uuid[]) AND catalog_metadata->>'cohort'=$2",[ids,data.cohort]);
  for(const b of data.businesses)await client.query("DELETE FROM businesses WHERE id=$1 AND name=$2 AND name LIKE 'DEMO %'",[b.id,b.name]);
 }
 const counts=(await client.query("SELECT city,category,count(*)::int AS n FROM places WHERE catalog_metadata->>'cohort'=$1 GROUP BY city,category ORDER BY city,category",[data.cohort])).rows;
 const fingerprint=sha(JSON.stringify((await client.query("SELECT to_jsonb(p) AS row FROM places p WHERE catalog_metadata->>'cohort'=$1 ORDER BY id",[data.cohort])).rows));
 await client.query('COMMIT');console.log(JSON.stringify({mode,inserted,cohort:data.cohort,counts,fingerprint,places:data.places.length,businesses:data.businesses.length}));
 }catch(e){await client.query('ROLLBACK');throw e;}finally{await client.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
