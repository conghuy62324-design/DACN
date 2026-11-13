'use strict';
const assert=require('node:assert/strict');
// Independent of lock-manager state transitions: consume immutable event trace.
function checkTrace(events,approved){let inside=false,started=0,ended=0;const counterexamples=[];for(const e of events){if(e.type==='PROTECTION_BEGIN'){assert.deepEqual(e.approvedTables,approved);assert.equal(new Set(e.approvedTables).size,approved.length);inside=true;started++;}if(e.type==='PROTECTION_END'){assert.equal(e.fixtureVisible,false,'UNSAFE_PROTECTION_END');inside=false;ended++;}
 if(inside&&e.type==='GRANTED'&&e.role==='EXTERNAL_WRITER'&&e.mode==='ROW_EXCLUSIVE'){assert.ok(approved.includes(e.tableId));counterexamples.push({eventSequence:e.sequence,tableId:e.tableId,writer:e.tx,mode:e.mode,registration:e.registration,transactionStatus:e.transactionStatus,grantOrigin:e.origin,fixtureVisible:e.fixtureVisible,stateAtGrant:e.stateAtGrant,rootCause:'EXTERNAL_WRITE_LOCK_GRANTED_INSIDE_REQUIRED_PROTECTION_INTERVAL'});}}
 return{status:counterexamples.length?'NO_GAP_COUNTEREXAMPLE':started?'NO_VIOLATION_IN_THIS_FINITE_PREFIX':'PROTECTION_INTERVAL_NOT_ESTABLISHED',counterexamples,intervalsStarted:started,intervalsEnded:ended,intervalStillOpen:inside,universalProof:false};}
module.exports={checkTrace};
