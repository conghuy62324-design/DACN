'use strict';
const assert=require('node:assert/strict');
class ConnectionBudget{
 constructor({write,stop,isStopped,limit=10}){assert.equal(limit,10);Object.assign(this,{write,stop,isStopped,limit,attempts:[],seen:new WeakSet(),finalPermit:false});}
 reserve(client,info){try{assert.ok(!this.seen.has(client),'PHYSICAL_RECONNECT_FORBIDDEN');if(info.kind==='final-verifier')assert.equal(this.finalPermit,true,'FINAL_VERIFY_REQUIRES_CLEANUP_PROOF');assert.ok(!this.isStopped()||(this.finalPermit&&info.kind==='final-verifier'),'GLOBAL_STOP_CONNECT_BLOCKED');assert.ok(this.attempts.length<this.limit,'PHYSICAL_CONNECTION_CAP_10');if(info.kind==='final-verifier')this.finalPermit=false;const entry={number:this.attempts.length+1,at:new Date().toISOString(),...info};this.seen.add(client);this.attempts.push(entry);this.write({type:'PHYSICAL_CONNECT_ATTEMPT',...entry});return entry;}catch(e){this.stop(e,'connection-budget');throw e;}}
 permitFinal({allOwnedDisposed,noOwnedResidual}){assert.equal(allOwnedDisposed,true);assert.equal(noOwnedResidual,true);assert.ok(this.attempts.length<10,'NO_ALLOWANCE_FOR_FINAL_VERIFY');this.finalPermit=true;this.write({type:'FINAL_VERIFICATION_CONNECTION_AUTHORIZED',remaining:10-this.attempts.length});}
}
module.exports={ConnectionBudget};
