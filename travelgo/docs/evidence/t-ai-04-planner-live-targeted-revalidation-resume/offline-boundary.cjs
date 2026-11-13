// Task-only preload: no network destinations, even loopback; no PostgreSQL.
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../..');
const audit={pid:process.pid,postgresConnectAttempts:0,networkAttempts:0,fixtureWrites:0};
const pg=require(path.join(root,'backend/node_modules/pg'));
const rejectPg=()=>{audit.postgresConnectAttempts++;throw Error('OFFLINE_POSTGRES_FORBIDDEN');};pg.Client.prototype.connect=rejectPg;pg.Pool.prototype.connect=rejectPg;
const rejectNetwork=()=>{audit.networkAttempts++;throw Error('OFFLINE_ALL_NETWORK_FORBIDDEN');};
globalThis.fetch=rejectNetwork;require('node:net').Socket.prototype.connect=rejectNetwork;
for(const module of ['node:http','node:https']){const x=require(module);x.request=rejectNetwork;x.get=rejectNetwork;}
process.on('exit',()=>{const dir=process.env.ADAPTER_FIX_AUDIT_DIR;if(dir){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'guard-'+process.pid+'-'+require('node:crypto').randomUUID()+'.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});}});
module.exports={audit};
