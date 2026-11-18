// Reuses the existing staging identity/fingerprint helper. No DML, credentials or original DB.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const c=require('../closure-v57-20261114/staging.cjs');
const phase=process.argv[2];assert(['before','after'].includes(phase));
process.env.PGOPTIONS='-c default_transaction_read_only=on';
require(path.join(c.root,'backend/node_modules/pg')).defaults.options=process.env.PGOPTIONS;
(async()=>{const db=await c.connect();try{
 assert.equal((await db.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'on');
 await db.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 const identity=await c.identity(db),tables=await c.fingerprint(db),migrations=(await db.query('SELECT filename,checksum FROM schema_migrations ORDER BY filename')).rows;
 assert.equal(Object.keys(tables).length,40);assert.equal(migrations.length,17);
 for(const m of migrations)assert.equal(c.sha(fs.readFileSync(path.join(c.root,'database/migrations',m.filename),'utf8')),m.checksum);
 assert.equal(tables.places.rows,130);assert.equal(tables.businesses.rows,20);assert.equal(tables.trip_sessions.rows,0);
 const retained=(await db.query("SELECT s.id,s.version,s.review_status AS status,c.id AS candidate_id,c.version AS candidate_version,c.status AS candidate_status,c.content_hash FROM travel_web_sources s JOIN travel_web_candidates c ON c.source_id=s.id WHERE s.id=$1 AND c.id=$2",['3c427f07-c1e2-42eb-b380-42e46c28a2ca','92760bb5-b51a-440e-ab7d-c4c053a5d36b'])).rows;
 const owner=(await db.query("SELECT u.id,r.id AS role_id,r.role FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 AND r.id=$2",['bae330d6-c3cb-462e-839e-cf07d73a64d2','fe016c5b-63a1-4e9a-9938-465aaae58f69'])).rows;
 assert.equal(owner.length,1);assert.equal(owner[0].role,'SUPER_ADMIN');assert.equal(retained.length,1);assert.equal(retained[0].status,'UNREVIEWED');assert.equal(retained[0].candidate_status,'DRAFT');
 await db.query('COMMIT');
 const runtime=JSON.parse(fs.readFileSync(path.join(c.root,'.local/catalog-staging/agent-integrated-profile.json'),'utf8'));
 const health=await fetch('http://127.0.0.1:5057/api/health',{redirect:'error'}),frontend=await fetch('http://127.0.0.1:5177/',{redirect:'error'});assert.equal(health.status,200);assert.equal(frontend.status,200);
 const out={at:new Date().toISOString(),status:'PASS_READ_ONLY',identity,tables,migrations,retained,owner,runtime,health:health.status,frontend:frontend.status,dml:0,originalDb:0};
 if(phase==='after'){const before=JSON.parse(fs.readFileSync(path.join(__dirname,'staging-before.json')));assert.deepEqual(tables,before.tables);out.matchedTables=40;out.runtimeUnchanged=runtime.pid===before.runtime.pid&&runtime.mode===before.runtime.mode;assert(out.runtimeUnchanged);assert.equal(runtime.mode,'protected');}
 fs.writeFileSync(path.join(__dirname,'staging-'+phase+'.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({phase,status:out.status,tables:40,matched:out.matchedTables,places:130,business:20,trip:0,knowledge:tables.verified_travel_knowledge.rows,pid:runtime.pid,mode:runtime.mode}));
}finally{await db.end();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
