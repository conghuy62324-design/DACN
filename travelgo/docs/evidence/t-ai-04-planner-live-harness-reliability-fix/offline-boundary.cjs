// Task-only preload. Blocks DB and all native/external network, including GET.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const audit={pid:process.pid,postgresConnectAttempts:0,forbiddenNetworkAttempts:0,allowedLoopbackSockets:0,blocked:[]};
const pg=require(path.join(root,'backend/node_modules/pg'));
pg.Client.prototype.connect=function(){audit.postgresConnectAttempts++;throw Error('OFFLINE_POSTGRES_FORBIDDEN');};
const ownedTestPorts=new Set();
function check(host,port){if(!['localhost','127.0.0.1','::1','[::1]'].includes(host)||[5432,11434].includes(Number(port))||!([3352,3354].includes(Number(port))||ownedTestPorts.has(Number(port)))){audit.forbiddenNetworkAttempts++;audit.blocked.push({host,port});throw Error('OFFLINE_NETWORK_FORBIDDEN');}}
const net=require('node:net'),connect=net.Socket.prototype.connect,listen=net.Server.prototype.listen;
net.Server.prototype.listen=function(...args){const first=args[0],port=typeof first==='object'?first.port:first,host=typeof first==='object'?first.host:args[1];if(Number(port)===0&&['127.0.0.1','::1'].includes(host)){this.once('listening',()=>{const address=this.address();if(address&&typeof address==='object'){ownedTestPorts.add(address.port);this.once('close',()=>ownedTestPorts.delete(address.port));}});}return listen.apply(this,args);};
net.Socket.prototype.connect=function(...args){const arg=Array.isArray(args[0])?args[0][0]:args[0];if(typeof arg==='object'&&arg.path||typeof arg==='string'&&!/^\d+$/.test(arg))return connect.apply(this,args);const port=typeof arg==='object'?arg.port:arg,host=typeof arg==='object'?arg.host||'localhost':typeof args[1]==='string'?args[1]:'localhost';check(host,port);audit.allowedLoopbackSockets++;return connect.apply(this,args);};
const originalFetch=globalThis.fetch;globalThis.fetch=function(url,init){const u=new URL(typeof url==='string'?url:url.url||String(url));check(u.hostname,u.port);return originalFetch(url,init);};
process.on('exit',()=>{const dir=process.env.OFFLINE_GUARD_AUDIT_DIR;if(dir){fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'guard-'+process.pid+'-'+require('node:crypto').randomUUID()+'.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});}});
