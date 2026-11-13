const {root,path,fs,config,identity,assert}=require('./catalog-staging-common.cjs'),{Client}=require('pg'),{execFileSync}=require('node:child_process');
(async()=>{const client=new Client({host:config.DB_HOST,port:+config.DB_PORT,user:config.DB_USER,password:config.DB_PASSWORD,database:config.DB_NAME});await client.connect();try{
 await identity(client);const usersBefore=(await client.query('SELECT id FROM users ORDER BY id')).rows,script=path.join(root,'backend/scripts/catalog-staging-seed.cjs');
 const before=JSON.parse(execFileSync(process.execPath,[script,'inspect'],{encoding:'utf8'}));assert.equal(before.counts.reduce((s,r)=>s+r.n,0),130);
 const cleaned=JSON.parse(execFileSync(process.execPath,[script,'cleanup'],{encoding:'utf8'}));assert.equal(cleaned.counts.length,0);
 const restored=JSON.parse(execFileSync(process.execPath,[script],{encoding:'utf8'}));assert.equal(restored.inserted,150);
 const repeated=JSON.parse(execFileSync(process.execPath,[script],{encoding:'utf8'}));assert.equal(repeated.inserted,0);assert.equal(restored.fingerprint,repeated.fingerprint);
 assert.deepEqual((await client.query('SELECT id FROM users ORDER BY id')).rows,usersBefore);
 const counts=(await client.query('SELECT (SELECT count(*) FROM trip_sessions)::int AS trips,(SELECT count(*) FROM bookings)::int AS bookings,(SELECT count(*) FROM places)::int AS places,(SELECT count(*) FROM businesses)::int AS businesses')).rows[0];assert.deepEqual(counts,{trips:0,bookings:0,places:130,businesses:20});
 const output={at:new Date().toISOString(),status:'PASS',cleanupScope:'Exact seed IDs + namespace/cohort on verified independent staging only',before,cleaned,restored,repeated,usersPreserved:usersBefore.length,finalCounts:counts,nativePost:0};fs.writeFileSync(path.join(root,'docs/evidence/travelgo-ai-agent-core/catalog-expansion-20261112/cleanup-check.json'),JSON.stringify(output,null,2),{flag:'wx'});console.log(JSON.stringify({status:'PASS',finalCounts:counts,usersPreserved:usersBefore.length}));
 }finally{await client.end();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
