const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
process.env.LLM_LIVE_ENABLED='false';process.env.LLM_USAGE_APPROVED='false';process.env.GOOGLE_MAPS_USAGE_APPROVED='false';
const audit={pid:process.pid,postgres:0,externalNetwork:0};
const pg=require('pg');const denyDb=()=>{audit.postgres++;throw Error('POSTGRES_FORBIDDEN_M1_OFFLINE');};pg.Client.prototype.connect=denyDb;pg.Pool.prototype.connect=denyDb;
const original=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){const o=typeof args[0]==='object'?args[0]:{port:args[0],host:args[1]},port=Number(o?.port),host=o?.host||'localhost';if(!['localhost','127.0.0.1','::1'].includes(host)||[5432,15432,11434].includes(port)){audit.externalNetwork++;throw Error('EXTERNAL_NETWORK_FORBIDDEN_M1_OFFLINE');}return original.apply(this,args);};
const d=path.resolve(__dirname,'../../docs/evidence/travelgo-public-release/m1-20261111/offline-audit');process.on('exit',()=>{fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,process.pid+'-'+Date.now()+'.json'),JSON.stringify(audit),{flag:'wx'});});
