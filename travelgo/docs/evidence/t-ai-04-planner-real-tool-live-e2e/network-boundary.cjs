// This task has no Ollama permission, including GET. Only exact local PostgreSQL.
const net=require('node:net');
const audit={fetchAttempts:0,forbiddenSocketAttempts:0,postgresSockets:0};
globalThis.fetch=async()=>{audit.fetchAttempts++;throw Error('ANALYSIS_NO_HTTP_OR_OLLAMA');};
const connect=net.Socket.prototype.connect;
net.Socket.prototype.connect=function(...args){
 const input=Array.isArray(args[0])?args[0]:args;const opts=input[0];
 const port=typeof opts==='object'?Number(opts.port):Number(opts),host=typeof opts==='object'?opts.host:typeof input[1]==='string'?input[1]:'localhost';
 if(port!==5432||host!=='127.0.0.1'){audit.forbiddenSocketAttempts++;throw Error('ANALYSIS_SOCKET_OUTSIDE_APPROVED_DATABASE');}
 audit.postgresSockets++;return connect.apply(this,args);
};
module.exports=audit;
