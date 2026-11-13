'use strict';
const fs=require('node:fs'),path=require('node:path'),m=require('./admission-model.cjs');
const name=process.argv[2],c=m.defaults(),i=new m.Interval(c);let decision,facts={};
const toCommitted=()=>{i.ready();i.step('INSERT_PENDING');i.step('COMMITTED');};
const probe=(a,committed=false)=>{if(committed)toCommitted();else i.ready();const out=i.outside(a);decision=i.decision||out.decision;facts={opened:out.opened,outsideRx:out.opened&&!out.taskOwned&&out.write.rx,changed:out.write.changed};};
const invalid={existing_session_before_test:['existingSessions',[{pid:'SYMBOLIC_OLD',role:'writer',registered:false}]],runtime_using_writer_identity:['runtimeRole','writer'],maintenance_identity_mismatch:['writerRole','postgres'],container_identity_mismatch:['container','OLD_CONTAINER'],network_identity_mismatch:['network','DEV_NETWORK'],public_write_grant:['publicWrite',true],security_definer_write_path:['publicExecuteWriteFunction',true],owner_membership:['ownerMembership',true],role_escalation:['roleEscalation',true],admin_admission_enabled:['adminReachable',true],prepared_transaction:['preparedTransactions',1],background_writer_job:['jobs',['writer']],shared_dev_volume:['sharedVolume',true],dev_network_attached:['devNetworkAttached',true],owner_identity_not_approved:['ownerApproved',false],baseline_not_approved:['baselineApproved',false],old_cleanup_lock_proof:['proofVersion','OLD_ALL25_HANDOFF'],unaccepted_tls_adapter:['adaptersAccepted',false],writer_privilege_expansion:['writerDml',['INSERT:public.places','DELETE:public.places','UPDATE:public.users']]};
if(invalid[name]){const[k,v]=invalid[name];i.config[k]=v;i.ready();decision=i.decision;facts={intervalBegan:i.active};}
else switch(name){
 case 'positive_lifecycle':{i.ready();const w=m.request(c,m.attempt('writer',c.keys.writer,true)),r=m.request(c,m.attempt('runtime',c.keys.runtime,true));facts={writerAdmitted:w.opened,runtimeAdmitted:r.opened,writerInsert:m.dml(w,'public.places').changed,writerOtherTable:m.dml(w,'public.users').changed,runtimeDml:m.dml(r,'public.places').changed};for(const p of ['INSERT_PENDING','COMMITTED','PLANNER','CLEANUP_PENDING','FINAL_VERIFY'])i.step(p);i.verify(true);decision=i.decision;break;}
 case 'unauthorized_application_writer':case 'writer_attempt_during_test':probe(m.attempt('dev_app','SHARED_DEV_PASSWORD'));break;
 case 'unauthorized_database_credential':probe(m.attempt('writer','NOT_THE_TASK_PRIVATE_KEY'));break;
 case 'shared_superuser_path':probe(m.attempt('postgres','SHARED_DEV_SUPERUSER_PASSWORD'));break;
 case 'writer_after_fixture_commit':probe(m.attempt('writer','NOT_THE_TASK_PRIVATE_KEY'),true);break;
 case 'database_endpoint_mismatch':{const a=m.attempt('writer','NOT_THE_TASK_PRIVATE_KEY');a.endpoint='127.0.0.1:5432';probe(a);break;}
 case 'outside_network':{const a=m.attempt('writer','NOT_THE_TASK_PRIVATE_KEY');a.source='UNAPPROVED_SOURCE';probe(a);break;}
 case 'server_certificate_mismatch':{const a=m.attempt('runtime',c.keys.runtime);a.serverPin='OTHER_CERTIFICATE';probe(a);break;}
 case 'plaintext_connection':{const a=m.attempt('runtime',c.keys.runtime);a.tls=false;probe(a);break;}
 case 'runtime_cert_requests_writer_role':{const a=m.attempt('writer',c.keys.runtime);a.cn='runtime';probe(a);break;}
 case 'unknown_privileged_client':case 'leaked_writer_private_key':{toCommitted();const out=i.outside(m.attempt('writer',c.keys.writer));decision=i.decision;facts={opened:out.opened,outsideRx:out.write.rx,changedOnUsers:out.write.changed,possiblePlaceChange:m.dml(out,'public.places').changed,trustAssumptionBroken:true};break;}
 case 'leaked_readonly_private_key':{toCommitted();const out=i.outside(m.attempt('runtime',c.keys.runtime));decision=i.decision;facts={opened:out.opened,outsideRx:out.write.rx,changed:out.write.changed,aclDenialNotNoRx:true,trustAssumptionBroken:true};break;}
 case 'crash_before_insert':i.ready();i.crash('before_insert');decision=i.decision;break;
 case 'crash_after_insert_before_commit':i.ready();i.step('INSERT_PENDING');i.crash('before_commit');decision=i.decision;break;
 case 'crash_after_commit':case 'ambiguous_commit':toCommitted();if(name==='ambiguous_commit')i.fixture='COMMIT_UNKNOWN';i.crash('after_commit');decision=i.decision;break;
 case 'crash_during_planner':toCommitted();i.step('PLANNER');i.crash('during_planner');decision=i.decision;break;
 case 'cleanup_failure':case 'cleanup_row_hash_drift':toCommitted();i.step('PLANNER');i.stop('STOP_QUARANTINE',name);decision=i.decision;facts={deleteAuthorized:false};break;
 case 'database_restart':{toCommitted();i.stop('STOP_QUARANTINE','New incarnation needs fresh owner scope and provenance');const out=i.outside(m.attempt('writer','NOT_THE_TASK_PRIVATE_KEY'));decision=i.decision;facts={outsideStillDenied:!out.opened,automaticReconnect:false};break;}
 case 'failed_final_fingerprint':toCommitted();for(const p of ['PLANNER','CLEANUP_PENDING','FINAL_VERIFY'])i.step(p);i.verify(false);decision=i.decision;break;
 case 'restart_with_policy_drift':toCommitted();i.config.adminReachable=true;i.stop('BOUNDARY_BREACH','Policy seal changed across restart; no guarantee retained');decision=i.decision;facts={protectionClaimWithdrawn:true};break;
 case 'same_instance_shared_admin_counterexample':i.ready();i.config.adminReachable=true;i.stop('BOUNDARY_BREACH','Same-instance shared superuser can bypass database ACL; Option B NOT ACCEPTABLE');decision=i.decision;facts={optionBAcceptable:false,notAnActualSuperuserConnection:true};break;
 case 'all25_all_phases_denial':{const phases=['READY','INSERT_PENDING','COMMITTED','PLANNER','CLEANUP_PENDING','FINAL_VERIFY'];let tested=0,opened=0,rx=0;for(const phase of phases){const j=new m.Interval(c);j.ready();for(const p of phases.slice(1,phases.indexOf(phase)+1))j.step(p);for(const table of m.tables)for(const a of [m.attempt('dev_app','SHARED_DEV_PASSWORD'),m.attempt('postgres','SHARED_DEV_SUPERUSER_PASSWORD'),m.attempt('writer','NOT_THE_TASK_PRIVATE_KEY')]){const out=m.request(j.config,a);tested++;opened+=Number(out.opened);rx+=Number(m.dml(out,table).rx);}}decision=opened?'BOUNDARY_BREACH':'REJECT_AUTH';facts={targets:m.tables.length,phases:phases.length,tested,opened,outsideRx:rx};break;}
 default:throw Error('UNKNOWN_FIXED_CASE_'+name);
}
// Guarded sensor channels: no actual provider, tool, browser or database import.
const before={live:i.liveCallbacks,cleanup:i.cleanupCallbacks};let late=0;if(i.stopped)for(const channel of ['agent','native','tool','operator'])try{if(i.stopped)throw Error('STOP');late++;}catch{}
const recovery=decision==='STOP_BEFORE_READY'?'REPROVISION_BEFORE_I':decision==='BOUNDARY_BREACH'?'RETAIN_QUARANTINE_SECURITY_REVIEW':decision==='STOP_QUARANTINE'?'RETAIN_QUARANTINE_LEDGER_REVIEW':decision==='STOP_SAFE_ABORT'?'VERIFY_ROLLBACK_NEW_SCOPE':decision==='VERIFIED_MODEL_ONLY'?'CLOSE_OWNED_AFTER_FINGERPRINT':'DENIED_CONTINUE_ONLY_IF_GUARDS_PASS';
const out={name,tier:'OFFLINE_SYMBOLIC_SPECIFICATION_NOT_ENFORCEMENT',decision,recovery,facts,phase:i.phase,intervalActive:i.active,fixture:i.fixture,stopped:i.stopped,callbacks:before,lateCallbacks:late,events:i.events,actualPostgres:0,actualSql:0};
fs.mkdirSync(path.join(__dirname,'cases'),{recursive:true});fs.writeFileSync(path.join(__dirname,'cases',name+'.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({name,decision}));if(i.stopped)process.exitCode=1;
