const {fs,path,root,config,assert,identity,sha}=require('./catalog-staging-common.cjs');
const {Client}=require('pg');
(async()=>{const client=new Client({host:config.DB_HOST,port:+config.DB_PORT,user:config.DB_USER,password:config.DB_PASSWORD,database:config.DB_NAME});await client.connect();try{
 const verified=await identity(client),files=fs.readdirSync(path.join(root,'database/migrations')).filter(f=>f.endsWith('.sql')).sort();
 await client.query("SELECT pg_advisory_lock(hashtext('travelgo_catalog_staging_migrations'))");
 const exists=(await client.query("SELECT to_regclass('public.schema_migrations') AS t")).rows[0].t;
 if(!exists){const tables=(await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename!='spatial_ref_sys'")).rows;assert.equal(tables.length,0,'Nonempty untracked staging');await client.query('CREATE TABLE schema_migrations(filename VARCHAR(255) PRIMARY KEY,checksum CHAR(64) NOT NULL,applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');}
 const changes=[];
 for(const file of files){const sql=fs.readFileSync(path.join(root,'database/migrations',file),'utf8'),digest=sha(sql),old=(await client.query('SELECT checksum FROM schema_migrations WHERE filename=$1',[file])).rows[0];if(old){assert.equal(old.checksum,digest);continue;}
 await client.query('BEGIN');try{await client.query(sql.replace(/^\s*BEGIN;\s*$/im,'').replace(/^\s*COMMIT;\s*$/im,''));await client.query('INSERT INTO schema_migrations(filename,checksum) VALUES($1,$2)',[file,digest]);await client.query('COMMIT');changes.push(file);}catch(e){await client.query('ROLLBACK');throw e;}}
 console.log(JSON.stringify({identity:verified,migrations:files.length,applied:changes}));
 }finally{await client.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
