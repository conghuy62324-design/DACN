'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const audit={pid:process.pid,mode:process.env.OWNERSHIP_MODE||'OFFLINE',sockets:[],blocked:[],http:0};
const deny=()=>{audit.http++;throw Error('ALL_HTTP_FORBIDDEN');};globalThis.fetch=deny;for(const m of ['node:http','node:https']){require(m).request=deny;require(m).get=deny;}
const original=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){const opt=Array.isArray(args[0])?args[0][0]:args[0],host=typeof opt==='object'?opt.host:args[1],port=Number(typeof opt==='object'?opt.port:opt),row={host,port};if(audit.mode!=='MULTI_READONLY_TRACE'||host!=='127.0.0.1'||port!==5432||audit.sockets.length>=10){audit.blocked.push(row);throw Error('NETWORK_CAP_OR_TARGET_STOP');}audit.sockets.push(row);return original.apply(this,args);};
process.on('exit',()=>{const dir=process.env.OWNERSHIP_AUDIT_DIR||path.join(__dirname,'network-audit');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'audit-'+process.pid+'-'+require('node:crypto').randomUUID()+'.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});});module.exports={audit};
