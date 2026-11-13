const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
process.env.LLM_LIVE_ENABLED='false';process.env.LLM_USAGE_APPROVED='false';process.env.GOOGLE_MAPS_USAGE_APPROVED='false';process.env.AGENT_CORE_LLM_ENABLED='false';
const audit={pid:process.pid,postgres:0,externalNetwork:0};const pg=require(path.resolve(__dirname,'../../../backend/node_modules/pg'));
const noDb=()=>{audit.postgres++;throw Error('CORE_OFFLINE_DATABASE_FORBIDDEN');};pg.Client.prototype.connect=noDb;pg.Pool.prototype.connect=noDb;
const connect=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){const o=typeof args[0]==='object'?args[0]:{port:args[0],host:args[1]},host=o?.host||'localhost',port=Number(o?.port);if(!['127.0.0.1','localhost','::1'].includes(host)||[5432,15432,11434].includes(port)){audit.externalNetwork++;throw Error('CORE_OFFLINE_NETWORK_FORBIDDEN');}return connect.apply(this,args);};
process.on('exit',()=>{const d=path.join(__dirname,'offline-audit');fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,process.pid+'-'+Date.now()+'.json'),JSON.stringify(audit),{flag:'wx'});});
