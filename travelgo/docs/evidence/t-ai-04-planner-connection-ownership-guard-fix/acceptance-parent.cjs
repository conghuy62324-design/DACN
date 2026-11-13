'use strict';
const c=require('./common.cjs'),{spawnSync}=require('node:child_process'),assert=c.assert;
const run=process.argv[2]||'02';assert.match(run,/^\d\d$/);const caseDir='cases-'+run;c.fs.mkdirSync(c.path.join(__dirname,caseDir));
const positive=['owned','registration-before-snapshot','release-pool','destroy-disconnect','verified-direct','verified-proxy','immutable-snapshot','sequelize-pool','sequelize-startup','cleanup-valid'];
const negative=['pending-bootstrap','afterconnect-failure','pid-reuse','backend-start-mismatch','late-registration','stale-registry','unknown-external','empty-tag','copied-tag','spoofed-self-tag','unknown-route','unexpected-port','forward-server-mismatch','db-mismatch','ro-not-applied','transaction-rw','timeout-mismatch','sentinel-mismatch','missing-open','duplicate-registration','dispose-failure','writer-failure','runtime-write-block','fake-snapshot','cleanup-hash','cleanup-foreign','cleanup-trip','cleanup-isolation','cleanup-ids'];
const results=[];
for(const scenario of [...positive,...negative]){try{
 const child=spawnSync(process.execPath,[c.path.join(__dirname,'acceptance-child.cjs'),scenario,caseDir],{cwd:c.root,encoding:'utf8',timeout:12000,windowsHide:true});
 c.fs.writeFileSync(c.path.join(__dirname,caseDir,scenario+'.log'),(child.stdout||'')+(child.stderr||''),{flag:'wx'});
 const r=c.json(c.prefix+caseDir+'/'+scenario+'.json'),good=positive.includes(scenario);assert.equal(child.status,good?0:1,'PROCESS_EXIT');assert.equal(r.fence.stopped,!good);assert.equal(r.guardPassed,good);assert.deepEqual(r.network.sockets,[]);assert.deepEqual(r.network.blocked,[]);assert.equal(r.network.http,0);assert.equal(r.actualEntityWrites,0);assert.equal(r.lateDispatched,0);
 assert.equal(r.clientsDisposed,scenario==='dispose-failure'?0:r.clientsCreated,'DISPOSAL_COUNT');
 if(!good){assert.equal(r.lateRejected,4);for(const key of ['agentDispatches','nativeDispatches','toolDispatches','operatorDispatches'])assert.deepEqual(r.fence[key],[]);assert.ok(r.error);}
 if(scenario.startsWith('cleanup-'))assert.equal(r.cleanupCount,good?1:0,'EXACT_CLEANUP_ACTION');
 const raw=r.events.findIndex(x=>x.type==='RAW_SELF_IDENTITY'),verdict=r.events.findIndex(x=>x.type==='REGISTRATION_PASS'||x.type==='REGISTRATION_FAIL');if(verdict>=0)assert.ok(raw>=0&&raw<verdict,'RAW_EVIDENCE_BEFORE_VERDICT');
 if(scenario==='afterconnect-failure')assert.match(r.fence.firstFailure.error.message,/INJECTED_AFTERCONNECT_FAILURE/);
 if(scenario==='writer-failure'){assert.equal(r.events.some(x=>x.type==='REGISTRATION_PASS'),false);assert.match(r.fence.firstFailure.error.message,/INJECTED_EVIDENCE_WRITE_FAILURE/);}
 results.push({scenario,status:'PASS',exit:child.status,clientsCreated:r.clientsCreated,clientsDisposed:r.clientsDisposed});
 }catch(e){results.push({scenario,status:'FAIL',message:e.message});}}
const failed=results.filter(x=>x.status==='FAIL');c.write('offline-acceptance-'+run+'.json',{at:new Date().toISOString(),status:failed.length?'FAIL':'PASS',passed:results.length-failed.length,failed:failed.length,results,actualPostgresConnections:0,actualEntityWrites:0,actualOllama:0,parentIndependentExpectations:true,childProcesses:true});console.log(JSON.stringify({passed:results.length-failed.length,failed}));if(failed.length)process.exitCode=1;
