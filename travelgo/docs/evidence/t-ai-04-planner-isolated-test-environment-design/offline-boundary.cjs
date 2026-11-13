'use strict';
// Runtime process fence only; documentation access through the web tool is separate.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),audit={pid:process.pid,postgresConnectAttempts:0,networkAttempts:0,childCommandAttempts:0};
const pg=require(path.resolve(__dirname,'../../../backend/node_modules/pg'));
const noPg=()=>{audit.postgresConnectAttempts++;throw Error('REAL_POSTGRES_FORBIDDEN_DESIGN_ONLY');};pg.Client.prototype.connect=noPg;pg.Pool.prototype.connect=noPg;
const noNet=()=>{audit.networkAttempts++;throw Error('NETWORK_FORBIDDEN_DESIGN_ONLY');};require('node:net').Socket.prototype.connect=noNet;require('node:tls').connect=noNet;require('node:dgram').createSocket=noNet;globalThis.fetch=noNet;for(const mod of ['node:http','node:https']){require(mod).request=noNet;require(mod).get=noNet;}
// No child shell, Docker, DB tools, or application service may be launched by a sensor.
const cp=require('node:child_process');const orig=cp.spawnSync;
for(const key of ['exec','execSync','execFile','execFileSync','spawn','fork'])cp[key]=()=>{audit.childCommandAttempts++;throw Error('CHILD_COMMAND_FORBIDDEN');};
cp.spawnSync=function(command,args,opts){if(command!==process.execPath||!Array.isArray(args)||args.length!==2||args[0]!==path.join(__dirname,'acceptance-child.cjs')){audit.childCommandAttempts++;throw Error('ONLY_FIXED_OFFLINE_SENSOR_CHILD_ALLOWED');}return orig.call(this,command,args,opts);};
process.on('exit',()=>{const d=path.join(__dirname,'offline-audit');fs.mkdirSync(d,{recursive:true});fs.writeFileSync(path.join(d,'audit-'+process.pid+'-'+crypto.randomUUID()+'.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});});
