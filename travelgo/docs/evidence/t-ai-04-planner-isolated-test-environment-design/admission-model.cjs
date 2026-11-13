'use strict';
// Symbolic specification, NOT PostgreSQL/Docker enforcement or a deployable adapter.
const inputs=require('./design-inputs.json'),tables=inputs.tableIds;
function defaults(){return{identity:'SIMULATED_NEW_ID',endpoint:'127.0.0.1:15432',container:'SIMULATED_NEW_CONTAINER',network:'SIMULATED_PRIVATE_NETWORK',volume:'SIMULATED_NEW_VOLUME',serverPin:'SIMULATED_SERVER_PIN',serverVerified:true,ownerApproved:true,baselineApproved:true,adaptersAccepted:true,proofVersion:'ISOLATED_ADMISSION_V1',authMethod:'cert',localReject:true,finalReject:true,devNetworkAttached:false,sharedVolume:false,publicWrite:false,publicExecuteWriteFunction:false,ownerMembership:false,roleEscalation:false,adminReachable:false,existingSessions:[],preparedTransactions:0,jobs:[],runtimeRole:'runtime',writerRole:'writer',runtimeWrites:[],writerDml:['INSERT:public.places','DELETE:public.places'],readOnly:true,keys:{runtime:'SYMBOLIC_RUNTIME_PRIVATE_CAPABILITY',observer:'SYMBOLIC_OBSERVER_PRIVATE_CAPABILITY',writer:'SYMBOLIC_WRITER_PRIVATE_CAPABILITY'},hbaRoles:['runtime','observer','writer'],source:'SIMULATED_APPROVED_FORWARDER',knownOriginalUnreachable:true};}
function validate(x){const need={ownerApproved:true,baselineApproved:true,adaptersAccepted:true,proofVersion:'ISOLATED_ADMISSION_V1',identity:'SIMULATED_NEW_ID',endpoint:'127.0.0.1:15432',container:'SIMULATED_NEW_CONTAINER',network:'SIMULATED_PRIVATE_NETWORK',volume:'SIMULATED_NEW_VOLUME',serverPin:'SIMULATED_SERVER_PIN',serverVerified:true,authMethod:'cert',localReject:true,finalReject:true,devNetworkAttached:false,sharedVolume:false,publicWrite:false,publicExecuteWriteFunction:false,ownerMembership:false,roleEscalation:false,adminReachable:false,runtimeRole:'runtime',writerRole:'writer',knownOriginalUnreachable:true};for(const[k,v]of Object.entries(need))if(x[k]!==v)return 'INVALID_'+k;if(x.existingSessions.length||x.preparedTransactions||x.jobs.length)return 'DIRTY_ADMISSION_BOUNDARY';if(x.runtimeWrites.length||!x.readOnly)return 'RUNTIME_NOT_READONLY';if(JSON.stringify(x.writerDml)!==JSON.stringify(['INSERT:public.places','DELETE:public.places']))return 'WRITER_PRIVILEGE_DRIFT';return null;}
function request(c,a){
 // Admission uses only transport/auth facts. actor/taskOwned is deliberately NOT an auth input.
 if(a.endpoint!==c.endpoint||a.serverPin!==c.serverPin||!c.serverVerified)return{decision:'REJECT_ENDPOINT',opened:false};
 if(a.source!==c.source)return{decision:'REJECT_NETWORK',opened:false};
 if(!a.tls||c.authMethod!=='cert'||!c.hbaRoles.includes(a.role)||a.cn!==a.role||a.key!==c.keys[a.role])return{decision:'REJECT_AUTH',opened:false};
 return{decision:'ADMIT',opened:true,taskOwned:a.taskOwned===true,role:a.role};
}
function attempt(role,key,taskOwned=false){return{endpoint:'127.0.0.1:15432',serverPin:'SIMULATED_SERVER_PIN',source:'SIMULATED_APPROVED_FORWARDER',tls:true,role,cn:role,key,taskOwned};}
function dml(session,table,operation='INSERT'){
 // Conservative parse-stage RX can precede executor ACL denial (PG15 setTargetTable).
 if(!session.opened)return{rx:false,changed:false,reason:'NO_SESSION'};
 const allowed=session.role==='writer'&&table==='public.places'&&['INSERT','DELETE'].includes(operation);
 return{rx:true,changed:allowed,reason:allowed?'TASK_WRITE':'EXECUTOR_PERMISSION_OR_READONLY_DENIAL'};
}
class Interval{
 constructor(config){this.config=structuredClone(config);this.phase='BEFORE_READY';this.active=false;this.fixture='ABSENT';this.stopped=false;this.liveCallbacks=0;this.cleanupCallbacks=0;this.events=[];this.record('INIT');}
 record(type,data={}){this.events.push({seq:this.events.length+1,type,phase:this.phase,active:this.active,fixture:this.fixture,stopped:this.stopped,...data});}
 ready(){const error=validate(this.config);if(error){this.stop('STOP_BEFORE_READY',error);return false;}this.active=true;this.phase='READY';this.record('ISOLATION_READY');return true;}
 step(phase){if(this.stopped)throw Error('NO_DISPATCH_AFTER_STOP');const transitions={READY:'INSERT_PENDING',INSERT_PENDING:'COMMITTED',COMMITTED:'PLANNER',PLANNER:'CLEANUP_PENDING',CLEANUP_PENDING:'FINAL_VERIFY'};if(transitions[this.phase]!==phase)throw Error('INVALID_PHASE');this.phase=phase;if(phase==='INSERT_PENDING')this.fixture='UNCOMMITTED';if(phase==='COMMITTED')this.fixture='COMMITTED';if(phase==='PLANNER')this.liveCallbacks++;if(phase==='CLEANUP_PENDING')this.cleanupCallbacks++;if(phase==='FINAL_VERIFY')this.fixture='ABSENT';this.record(phase);}
 stop(decision,reason){this.stopped=true;this.record(decision,{reason});this.decision=decision;}
 crash(where){if(where==='before_insert'){this.fixture='ABSENT';this.active=false;this.phase='SAFE_ABORT';this.stop('STOP_SAFE_ABORT','No fixture work; isolated admission remains closed');}else if(where==='before_commit'){this.fixture='ABSENT';this.active=false;this.phase='SAFE_ABORT';this.stop('STOP_SAFE_ABORT','MODEL_KNOWN_SERVER_ROLLBACK; real evidence required');}else{this.phase='QUARANTINE';this.stop('STOP_QUARANTINE','Committed/ambiguous fixtures; no automatic cleanup/reconnect');}}
 verify(ok){if(!ok){this.stop('STOP_QUARANTINE','FINAL_FINGERPRINT_MISMATCH');return;}if(this.phase!=='FINAL_VERIFY')throw Error('VERIFICATION_ORDER');this.active=false;this.phase='VERIFIED';this.record('SAFE_END');this.decision='VERIFIED_MODEL_ONLY';}
 outside(a){const r=request(this.config,a),write=dml(r,'public.users');this.record('ADMISSION_ATTEMPT',{decision:r.decision,opened:r.opened,outsideRx:r.opened&&!r.taskOwned&&write.rx});if(r.opened&&!r.taskOwned)this.stop('BOUNDARY_BREACH','Unknown authenticated session; ACL is not a zero-RX barrier');return{...r,write};}
}
module.exports={defaults,validate,request,attempt,dml,Interval,tables};
