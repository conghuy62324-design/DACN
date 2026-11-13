'use strict';
const c=require('./common.cjs'),{spawnSync}=require('node:child_process'),vectors=require('./acceptance-vectors.cjs'),results=[];
const implementation=['proposal.json','admission-model.cjs','acceptance-vectors.cjs','acceptance-child.cjs','acceptance-parent.cjs','offline-boundary.cjs','common.cjs'];
c.write('acceptance-source-lock-before.json',{at:new Date().toISOString(),files:Object.fromEntries(implementation.map(f=>[f,c.sha(c.read(c.prefix+f))])),expectedCases:vectors,expectedLockedBeforeExecution:true});
for(const v of vectors){const child=spawnSync(process.execPath,[c.path.join(__dirname,'acceptance-child.cjs'),v.name],{cwd:c.root,encoding:'utf8',env:{...process.env,NODE_OPTIONS:'--require='+c.path.join(__dirname,'offline-boundary.cjs')},timeout:10000});c.fs.writeFileSync(c.path.join(__dirname,'cases',v.name+'.log'),child.stdout+'\nSTDERR:\n'+child.stderr,{flag:'wx'});try{c.assert.equal(child.error,undefined);const r=c.json(c.prefix+'cases/'+v.name+'.json');c.assert.equal(r.decision,v.decision);c.assert.equal(r.recovery,v.recovery);c.assert.equal(child.status,r.stopped?1:0);c.assert.equal(r.lateCallbacks,0);c.assert.equal(r.actualPostgres,0);c.assert.equal(r.actualSql,0);
 if(r.decision==='STOP_BEFORE_READY'){c.assert.equal(r.intervalActive,false);c.assert.equal(r.callbacks.live,0);c.assert.equal(r.callbacks.cleanup,0);}
 if(['STOP_QUARANTINE','BOUNDARY_BREACH'].includes(r.decision))c.assert.equal(r.intervalActive,true);
 if(v.name==='positive_lifecycle')c.assert.deepEqual(r.facts,{writerAdmitted:true,runtimeAdmitted:true,writerInsert:true,writerOtherTable:false,runtimeDml:false});
 if(v.name==='all25_all_phases_denial')c.assert.deepEqual(r.facts,{targets:25,phases:6,tested:450,opened:0,outsideRx:0});
 if(v.name==='leaked_readonly_private_key'){c.assert.equal(r.facts.outsideRx,true);c.assert.equal(r.facts.changed,false);}
 if(v.name==='leaked_writer_private_key')c.assert.equal(r.facts.possiblePlaceChange,true);
 if(v.name==='database_restart')c.assert.equal(r.facts.outsideStillDenied,true);
 if(v.name==='cleanup_row_hash_drift')c.assert.equal(r.callbacks.cleanup,0);
 results.push({...v,status:'PASS',observedDecision:r.decision,childExit:child.status,evidence:'cases/'+v.name+'.json'});
 }catch(e){results.push({...v,status:'FAIL',error:e.message,childExit:child.status});}}
const lock=c.json(c.prefix+'acceptance-source-lock-before.json');for(const[f,h]of Object.entries(lock.files))c.assert.equal(c.sha(c.read(c.prefix+f)),h,f);
const audits=c.fs.readdirSync(c.path.join(__dirname,'offline-audit')).map(f=>c.json(c.prefix+'offline-audit/'+f));for(const a of audits){c.assert.equal(a.postgresConnectAttempts,0);c.assert.equal(a.networkAttempts,0);c.assert.equal(a.childCommandAttempts,0);}
c.assert.equal(audits.length,vectors.length);
c.write('independent-adversarial-acceptance.json',{at:new Date().toISOString(),tier:'OFFLINE_DESIGN_MODEL_ONLY',status:results.every(x=>x.status==='PASS')?'PASS':'FAIL',passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,requiredNamedCases:18,all25PhaseCredentialCombinations:450,modelTestsDoNotProveActualEnvironment:true,brokenAssumptionCasesRetainFailureDecision:true,independence:'Fixed parent golden decisions; separate child model, source lock before execution, per-process network fence. No human/sub-agent independent reviewer claimed.',results,integrity:c.integrity()});
console.log(JSON.stringify({passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,childAudits:audits.length}));if(results.some(x=>x.status==='FAIL'))process.exitCode=1;
