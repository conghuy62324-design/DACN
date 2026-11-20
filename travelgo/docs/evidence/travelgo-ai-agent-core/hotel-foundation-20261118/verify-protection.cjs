// Read-only acceptance. No login, quota scan, PostgreSQL DML, original DB or model API.
const c=require('../closure-v57-20261114/staging.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.PGOPTIONS='-c default_transaction_read_only=on';
require(path.join(c.root,'backend/node_modules/pg')).defaults.options=process.env.PGOPTIONS;
(async()=>{
 const before=JSON.parse(fs.readFileSync(path.join(__dirname,'physical-schema-before.json'),'utf8'));
 const identity=JSON.parse(fs.readFileSync(path.join(__dirname,'identity.json'),'utf8'));
 const client=await c.connect();
 try{
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const actualIdentity=await c.identity(client),tables=await c.fingerprint(client);
  assert.deepEqual(tables,before.tables);assert.equal(Object.keys(tables).length,40);
  const migrations=(await client.query('SELECT filename,checksum FROM schema_migrations ORDER BY filename')).rows;
  assert.equal(migrations.length,17);
  for(const m of migrations)assert.equal(c.sha(fs.readFileSync(path.join(c.root,'database/migrations',m.filename),'utf8')),m.checksum);
  const count=(await client.query("SELECT count(*)::int n FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'hotel_%' AND table_type='BASE TABLE'")).rows[0].n;
  assert.equal(count,0);
  const owner=(await client.query('SELECT u.id,r.id AS role_id,r.role FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 AND r.id=$2',['bae330d6-c3cb-462e-839e-cf07d73a64d2','fe016c5b-63a1-4e9a-9938-465aaae58f69'])).rows;
  assert.equal(owner.length,1);assert.equal(owner[0].role,'SUPER_ADMIN');
  const knowledge=(await client.query('SELECT id,status,version,public_use,expires_at FROM verified_travel_knowledge ORDER BY id')).rows;
  assert.equal(knowledge.length,1);assert.equal(knowledge[0].id,'467bd60b-27ab-42ad-a450-b3076a4215c3');assert.equal(knowledge[0].version,2);assert.equal(knowledge[0].status,'APPROVED');
  await client.query('COMMIT');
  for(const [name,hash] of Object.entries(identity.coreSourceHashes))assert.equal(c.sha(fs.readFileSync(path.join(c.root,name))),hash,name);
  const master=fs.readFileSync(path.join(c.root,'docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md'));
  const oldMaster=fs.readFileSync(path.join(__dirname,'master-before.md'));assert(master.subarray(0,oldMaster.length).equals(oldMaster));
  const releaseLock=JSON.parse(fs.readFileSync(path.join(__dirname,'../release-v70-20261118/evidence-seal.json'),'utf8'));
  const files=Object.entries(releaseLock.hashes);assert.equal(files.length,67);
  for(const [name,hash] of files)assert.equal(c.sha(fs.readFileSync(path.join(__dirname,'../release-v70-20261118',name))),hash,name);
  const result={at:new Date().toISOString(),status:'ACTUAL_READ_ONLY_PROTECTION_PASS',identity:actualIdentity,tables,unchangedTables:40,migrations:17,hotelTablesApplied:0,placeRows:tables.places.rows,businessRows:tables.businesses.rows,owner,knowledge,coreSourceHashesChecked:Object.keys(identity.coreSourceHashes).length,masterHistoricalPrefixUnchanged:true,historicalLockEntries:files.length,dml:0,originalDbConnections:0,modelCalls:0};
  fs.writeFileSync(path.join(__dirname,'physical-schema-after.json'),JSON.stringify(result,null,2),{flag:'wx'});
  console.log(JSON.stringify({...result,tables:undefined,owner:undefined,knowledge:undefined}));
 }finally{await client.end();}
})().catch(e=>{console.error(JSON.stringify({status:'PROTECTION_CHECK_FAILED',code:e.code||e.message}));process.exitCode=1;});
