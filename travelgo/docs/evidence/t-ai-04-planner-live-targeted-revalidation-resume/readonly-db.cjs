const c=require('./common.cjs');
Object.assign(process.env,{NODE_ENV:'test',DB_HOST:'127.0.0.1',DB_NAME:'travelgo_ai_m0_test',DB_SSL:'false',ALLOW_TEST_DB_WRITES:'false'});
require(c.path.join(c.root,'backend/node_modules/dotenv')).config({path:c.path.join(c.root,'backend/.env'),quiet:true});
const {sequelize}=require(c.path.join(c.root,'backend/dist/models/index.js')),{ENV}=require(c.path.join(c.root,'backend/dist/config/env.js'));
const guards=require(c.path.join(c.root,'backend/dist/utils/testDatabaseGuard.js'));
const audit={queries:0,forbidden:0,connections:0};let verified=false;
c.assert.equal(ENV.DB_NAME,'travelgo_ai_m0_test');c.assert.equal(ENV.DB_HOST,'127.0.0.1');c.assert.equal(ENV.NODE_ENV,'test');c.assert.equal(process.env.ALLOW_TEST_DB_WRITES,'false');guards.assertIsolatedTestDatabase('G2 LIVE read-only');
sequelize.options.dialectOptions={...sequelize.options.dialectOptions,options:'-c default_transaction_read_only=on -c statement_timeout=15000'};
sequelize.addHook('afterConnect',async client=>{audit.connections++;await client.query('SET default_transaction_read_only = on');await client.query("SET statement_timeout = '15000ms'");const row=(await client.query("SELECT current_database() AS db, current_user AS role, current_setting('default_transaction_read_only') AS read_only")).rows[0];c.assert.equal(row.db,'travelgo_ai_m0_test');c.assert.equal(row.role,ENV.DB_USER);c.assert.equal(row.read_only,'on');});
// Sequelize beforeQuery runs BEFORE Query.run assigns query.sql. Guard the actual
// sql argument at the call boundary instead; never permit an empty/unknown SQL.
const queryOriginal=sequelize.query.bind(sequelize);
sequelize.query=function(sql,options){const text=typeof sql==='string'?sql:sql?.query;audit.queries++;if(typeof text!=='string'||!/^\s*(SELECT|SHOW)\b/i.test(text)||/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TRUNCATE|COPY|GRANT|REVOKE|CALL|VACUUM)\b/i.test(text)){audit.forbidden++;return Promise.reject(Error('READ_ONLY_SQL_GUARD'));}return queryOriginal(sql,options);};
async function guard(){
const [rows]=await sequelize.query("SELECT current_database() AS database, current_user AS role, inet_server_addr()::text AS server_address, inet_server_port() AS server_port, current_setting('default_transaction_read_only') AS read_only, shobj_description(oid,'pg_database') AS sentinel FROM pg_database WHERE datname=current_database()");
const identity=rows[0];c.assert.equal(identity.database,'travelgo_ai_m0_test');c.assert.equal(identity.role,ENV.DB_USER);c.assert.equal(identity.read_only,'on');c.assert.equal(identity.sentinel,'hugotravel-isolated-test-database-v1');
const baseline=c.json('docs/evidence/t-ai-03-a/probe.json').migrations,migrations=[];
for(const entry of baseline){const hash=c.sha(c.read('database/migrations/'+entry.filename));c.assert.equal(hash,entry.checksum,entry.filename);const [r]=await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename',{replacements:{filename:entry.filename}});c.assert.equal(r[0]?.checksum,hash,entry.filename);migrations.push({filename:entry.filename,checksum:hash});}
const [all]=await sequelize.query('SELECT filename,checksum FROM schema_migrations ORDER BY filename');c.assert.equal(all.length,12);c.assert.equal(migrations.length,12);
const [schema]=await sequelize.query("SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name,ordinal_position");
const result={at:new Date().toISOString(),status:'PASS',configured:{host:ENV.DB_HOST,port:ENV.DB_PORT,database:ENV.DB_NAME,role:ENV.DB_USER},identity,migrations,schemaSha256:c.sha(JSON.stringify(schema)),schema,readOnlyEnforcement:'startup default_transaction_read_only=on + per-connection verification + SELECT/SHOW-only ORM hook',writeOptIn:false};verified=true;return result;}
async function fingerprint(){c.assert.ok(verified);const [names]=await sequelize.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename"),tables={};for(const {tablename}of names){c.assert.ok(/^[a-z_]+$/.test(tablename));const [r]=await sequelize.query(`SELECT count(*)::text AS rows,coalesce(string_agg(md5(to_jsonb(t)::text),',' ORDER BY md5(to_jsonb(t)::text)),'') AS row_hashes FROM public."${tablename}" AS t`);tables[tablename]={rows:r[0].rows,sha256OfRowHashes:c.sha(r[0].row_hashes)};}return{database:ENV.DB_NAME,tables};}
module.exports={sequelize,ENV,audit,guard,fingerprint};
