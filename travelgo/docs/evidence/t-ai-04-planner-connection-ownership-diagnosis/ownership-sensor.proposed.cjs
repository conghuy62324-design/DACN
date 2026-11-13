'use strict';
// Proposed diagnostic contract only. NOT integrated into the historical guard.
// Physical client capability + self-query identity; application_name is corroboration.
const assert=require('node:assert/strict');
const fields=['pid','backend_start','application_name','usename','datname','client_addr','client_port','backend_type'];
class OwnershipSensor{
 constructor(){this.records=new Map();this.events=[];this.counter=0;}
 event(type,data){this.events.push({sequence:++this.counter,type,...data});}
 opened(client,factory){assert.ok(client&&typeof client==='object');assert.match(factory,/^[a-z0-9-]+$/i);assert.ok(!this.records.has(client));this.records.set(client,{factory,state:'PENDING'});this.event('OPEN',{factory});}
 register(client,self){const r=this.records.get(client);assert.equal(r?.state,'PENDING','FACTORY_OPEN_REQUIRED');assert.equal(self.pid,client.processID,'PHYSICAL_PID_MISMATCH');assert.ok(Number.isInteger(self.pid)&&self.pid>0);assert.match(self.backend_start||'',/^\d{4}-\d\d-\d\d[T ]/);assert.equal(self.datname,'travelgo_ai_m0_test');assert.equal(self.backend_type,'client backend');assert.equal(self.read_only,'on');assert.ok(self.usename&&self.application_name&&self.client_addr&&Number.isInteger(self.client_port)&&self.client_port>0,'OWNERSHIP_METADATA_REQUIRED');assert.equal(self.client_port,client.localPort,'PHYSICAL_SOCKET_PORT_MISMATCH');assert.equal(self.application_name,client.applicationName,'STARTUP_TAG_MISMATCH');r.identity=Object.fromEntries(fields.map(k=>[k,self[k]]));r.state='REGISTERED';this.event('REGISTER',{factory:r.factory,identity:r.identity});}
 released(client){const r=this.records.get(client);assert.equal(r?.state,'REGISTERED');this.event('POOL_RELEASE',{factory:r.factory,identity:r.identity});}
 closed(client){const r=this.records.get(client);assert.ok(r);r.state='CLOSED';this.event('CLOSED',{factory:r.factory,identity:r.identity??null});}
 failed(client,stage){const r=this.records.get(client);assert.ok(r);r.state='ERROR';this.event('ERROR',{factory:r.factory,stage});}
 snapshot(){return structuredClone({sequence:this.counter,records:[...this.records.values()]});}
 evaluate(activity,snapshot){const unknown=[];for(const row of activity){const match=snapshot.records.some(r=>r.state==='REGISTERED'&&fields.every(k=>r.identity?.[k]===row[k]));if(!match)unknown.push(row);}return{status:unknown.length?'UNKNOWN_CONNECTION_FAIL_CLOSED':'PASS',snapshotSequence:snapshot.sequence,unknown};}
}
module.exports={OwnershipSensor,fields};
