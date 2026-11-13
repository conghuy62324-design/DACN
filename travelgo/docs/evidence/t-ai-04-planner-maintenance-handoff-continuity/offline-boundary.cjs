'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'../../..'),audit={pid:process.pid,postgresConnectAttempts:0,networkAttempts:0};const pg=require(path.join(root,'backend/node_modules/pg'));
const denyPg=()=>{audit.postgresConnectAttempts++;throw Error('REAL_POSTGRES_FORBIDDEN');};pg.Client.prototype.connect=denyPg;pg.Pool.prototype.connect=denyPg;
const deny=()=>{audit.networkAttempts++;throw Error('ALL_RUNTIME_NETWORK_FORBIDDEN');};require('node:net').Socket.prototype.connect=deny;globalThis.fetch=deny;for(const m of ['node:http','node:https']){require(m).get=deny;require(m).request=deny;}
process.on('exit',()=>{const dir=path.join(__dirname,'offline-audit');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'audit-'+process.pid+'-'+require('node:crypto').randomUUID()+'.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});});module.exports={audit};
