const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),config=JSON.parse(fs.readFileSync(path.join(root,'.local/catalog-staging/config.json')));
assert.equal(config.DB_NAME,'travelgo_staging_catalog_20261112');assert.equal(config.DB_PORT,'15452');assert.equal(config.DB_USER,'catalog_runtime');assert.equal(config.DB_HOST,'127.0.0.1');assert.equal(config.CATALOG_STAGING_WRITE_APPROVED,'true');
config.CATALOG_METADATA_ENABLED='true';Object.assign(process.env,config);
// Every socket is fenced to staging or local HTTP test ports; original PostgreSQL and Ollama are forbidden.
const net=require('node:net'),original=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const first=Array.isArray(args[0])?args[0][0]:args[0],o=typeof first==='object'?first:{port:first,host:args[1]},port=Number(o.port);if(!['127.0.0.1','localhost','::1'].includes(o.host||'localhost')||[5432,15432,11434].includes(port))throw Error('CATALOG_STAGING_NETWORK_BOUNDARY');return original.apply(this,args);};
async function identity(client){const r=(await client.query("SELECT current_database() AS db,current_user AS role,r.rolsuper,r.rolcreatedb,r.rolcreaterole,shobj_description(d.oid,'pg_database') AS sentinel FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()")).rows[0];assert.equal(r.db,config.DB_NAME);assert.equal(r.role,config.DB_USER);assert.equal(r.rolsuper,false);assert.equal(r.rolcreatedb,false);assert.equal(r.rolcreaterole,false);assert.equal(r.sentinel,config.CATALOG_DEMO_SENTINEL);return r;}
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
module.exports={fs,path,root,config,assert,identity,sha};
