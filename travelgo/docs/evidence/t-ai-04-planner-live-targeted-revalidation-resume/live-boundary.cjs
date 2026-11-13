// LIVE transport boundary; only explicitly approved local services/test web ports.
const net=require('node:net'),fs=require('node:fs'),path=require('node:path');
const audit={pid:process.pid,sockets:[],blocked:[]},connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){const x=Array.isArray(args[0])?args[0][0]:args[0];if(typeof x==='object'&&x.path||typeof x==='string'&&!/^\d+$/.test(x))return connect.apply(this,args);const port=Number(typeof x==='object'?x.port:x),host=typeof x==='object'?x.host||'localhost':typeof args[1]==='string'?args[1]:'localhost';if(!['127.0.0.1','localhost','::1'].includes(host)||![5432,11434,3354,3355].includes(port)){audit.blocked.push({host,port});throw Error('LIVE_NETWORK_OUTSIDE_APPROVED_LOOPBACK');}audit.sockets.push({host,port});return connect.apply(this,args);};
process.on('exit',()=>{fs.writeFileSync(path.join(__dirname,'live-network-audit.json'),JSON.stringify(audit,null,2)+'\n',{flag:'wx'});});
module.exports=audit;
