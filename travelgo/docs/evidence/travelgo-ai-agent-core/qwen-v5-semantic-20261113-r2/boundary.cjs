const fs=require('node:fs'),path=require('node:path'),net=require('node:net'),root=path.resolve(__dirname,'../../../..');
const audit={pid:process.pid,postgres:0,forbiddenNetwork:0,allowedOllamaConnections:0};
const pg=require(path.join(root,'backend/node_modules/pg'));pg.Client.prototype.connect=pg.Pool.prototype.connect=function(){audit.postgres++;throw Error('SEMANTIC_DB_FORBIDDEN');};
const connect=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){const f=Array.isArray(args[0])?args[0][0]:args[0],o=typeof f==='object'?f:{port:f,host:args[1]};if(+o.port!==11434||o.host!=='127.0.0.1'){audit.forbiddenNetwork++;throw Error('SEMANTIC_NETWORK_FORBIDDEN');}audit.allowedOllamaConnections++;return connect.apply(this,args);};
require(path.join(root,'backend/node_modules/tsx/dist/cjs/index.cjs'));
process.on('exit',()=>fs.writeFileSync(path.join(__dirname,'boundary-'+process.pid+'.json'),JSON.stringify(audit,null,2),{flag:'wx'}));
