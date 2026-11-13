'use strict';
const assert=require('node:assert/strict');
async function runLockSmoke({maintenance:m,probe,write}){
 assert.equal(m.tables.length,25);await m.foreignConnections();await m.sql(m.a,'BEGIN READ WRITE');await m.sql(m.a,m.writeLock);await m.prove(m.a,'ShareRowExclusiveLock','SMOKE_A_ALL25_SRE');
 await m.sql(probe,'BEGIN READ WRITE');let conflict;
 try{await m.sql(probe,'LOCK TABLE public."places" IN ROW EXCLUSIVE MODE NOWAIT');}catch(e){conflict=e;}
 assert.equal(conflict?.code,'55P03','EXPECTED_PROBE_CONFLICT_REQUIRED');write({type:'PROBE_CONFLICT_VERIFIED',pid:probe.processID,sqlstate:conflict.code,dmlIssued:false});await m.sql(probe,'ROLLBACK');
 const queued=await m.queueGuardWrapped();await m.foreignConnections();write({type:'HANDOFF_B_QUEUED_BEFORE_A_COMMIT',aPid:m.a.processID,bPid:m.b.processID,events:structuredClone(m.events)});
 await m.sql(m.a,'COMMIT');write({type:'HANDOFF_A_COMMIT_ACK'});await queued.pending;await m.prove(m.b,'ShareLock','SMOKE_B_ALL25_SHARE');write({type:'HANDOFF_B_ALL25_GRANTED',aPid:m.a.processID,bPid:m.b.processID,events:structuredClone(m.events)});
 await m.sql(m.b,'COMMIT');const after=await m.locks();write({type:'RAW_LOCKS_AFTER_SMOKE_RELEASE',rows:after});assert.deepEqual(after,[],'TASK_LOCKS_NOT_RELEASED');return{status:'PASS',tables:25,probeConflict:'55P03',handoff:'QUEUED_B_BEFORE_A_COMMIT_THEN_ALL25_GRANTED',locksAfter:after};
}
module.exports={runLockSmoke};
