'use strict';
// OFFLINE ONLY. Emulates PG protocol-facing fields, never opens a socket.
const {EventEmitter}=require('node:events'),{SELF,ACTIVITY}=require('./managed-connections.cjs');
let nextPid=20000;
class SensorClient extends EventEmitter{
 static created=[];static rowPatch={};static failEnd=false;static onConnect=null;
 constructor(config){super();this.connectionParameters={...config};this.host=config.host;this.port=config.port;this.user=config.user;this.database=config.database;this.processID=++nextPid;this._ended=false;this.queries=[];this.startupSent=null;this.connection=new EventEmitter();this.connection.startup=payload=>{this.startupSent={...payload};};this.connection.stream={localAddress:'127.0.0.1',localPort:61001,remoteAddress:'127.0.0.1',remotePort:5432};SensorClient.created.push(this);}
 async connect(){this.connection.startup=this.connection.startup||((payload)=>{this.startupSent={...payload};});this.connection.startup(this.connectionParameters);this.connection.emit('parameterStatus',{parameterName:'server_version',parameterValue:'15.0'});this.connection.emit('parameterStatus',{parameterName:'standard_conforming_strings',parameterValue:'on'});if(SensorClient.onConnect)await SensorClient.onConnect(this);}
 async query(sql){sql=typeof sql==='string'?sql:sql.text;this.queries.push(sql);if(sql===SELF)return{rows:[this.self()]};if(sql===ACTIVITY)return{rows:SensorClient.created.filter(x=>!x._ended).map(x=>x.self())};return{rows:[]};}
 self(){return{database:'travelgo_ai_m0_test',role:'postgres',pid:this.processID,pg_backend_pid:this.processID,backend_start:'2026-11-11T08:00:00.123456Z',application_name:this.connectionParameters.application_name,usename:'postgres',datname:'travelgo_ai_m0_test',backend_type:'client backend',client_addr:'127.0.0.1',client_port:61001,inet_client_addr:'127.0.0.1',inet_client_port:61001,server_addr:'127.0.0.1',server_port:5432,default_transaction_read_only:'on',transaction_read_only:'on',statement_timeout:'15s',sentinel:'hugotravel-isolated-test-database-v1',...SensorClient.rowPatch};}
 async end(callback){if(SensorClient.failEnd){const e=Error('INJECTED_DISPOSE_FAILURE');if(callback)return callback(e);throw e;}this._ended=true;this.emit('end');if(callback)callback();}
}
module.exports={SensorClient};
