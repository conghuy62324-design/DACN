'use strict';
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const audit={at:new Date().toISOString(),mode:process.env.OWNERSHIP_TRACE_MODE||'OFFLINE',sockets:[],blocked:[],fetch:0};
globalThis.fetch=async()=>{audit.fetch++;throw Error('ALL_HTTP_FORBIDDEN');};
const original=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const opt=Array.isArray(args[0])?args[0][0]:args[0],port=typeof opt==='object'?Number(opt.port):Number(opt),host=typeof opt==='object'?opt.host:args[1];const row={host,port};if(audit.mode!=='READ_ONLY_METADATA'||host!=='127.0.0.1'||port!==5432){audit.blocked.push(row);throw Error('NETWORK_BOUNDARY_STOP');}audit.sockets.push(row);return original.apply(this,args);};
const child=require('node:child_process');for(const k of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])child[k]=()=>{throw Error('CHILD_PROCESS_FORBIDDEN');};
process.on('exit',()=>{fs.writeFileSync(path.join(__dirname,process.env.OWNERSHIP_AUDIT_FILE||'offline-network-audit.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});});
