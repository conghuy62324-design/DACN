'use strict';
const c=require('./common.cjs'),{spawnSync}=require('node:child_process'),assert=c.assert;
function sourceSnapshot(){return Object.fromEntries(c.fs.readdirSync(__dirname).filter(f=>f.endsWith('.cjs')||f==='collect-route.ps1'||f==='ui-strings.json').sort().map(f=>[f,c.sha(c.fs.readFileSync(c.path.join(__dirname,f)))]));}
function main(){
 c.integrity();const sourceHashes=sourceSnapshot();c.write('phase-a-start.json',{at:new Date().toISOString(),sourceHashes,postgresAllowed:0});
 for(const[script,args]of [['acceptance-parent.cjs',['01']],['integration-parent.cjs',['01']],['normalization-parent.cjs',[]]]){
  const child=spawnSync(process.execPath,[c.path.join(__dirname,script),...args],{cwd:c.root,encoding:'utf8',timeout:120000,windowsHide:true});c.fs.writeFileSync(c.path.join(__dirname,script+'.log'),(child.stdout||'')+(child.stderr||''),{flag:'wx'});
  if(child.status!==0){c.write('phase-a-stop.json',{at:new Date().toISOString(),status:'FAIL',classification:'ADDRESS_NORMALIZATION_FIX_INCOMPLETE',failedSuite:script,processExit:child.status,laterSuitesNotRun:true,postgresConnections:0,traceAllowed:false});console.log(JSON.stringify({status:'STOP_PHASE_A',failedSuite:script,output:child.stdout,stderr:child.stderr}));process.exitCode=1;return;}
 }
 const original39=c.json(c.prefix+'offline-acceptance-01.json'),original12=c.json(c.prefix+'integration-acceptance-01.json'),newCases=c.json(c.prefix+'normalization-acceptance.json');assert.equal(original39.passed,39);assert.equal(original12.passed,12);assert.equal(newCases.status,'PASS');assert.equal(newCases.planned,newCases.passed);
 assert.deepEqual(sourceSnapshot(),sourceHashes,'SOURCE_CHANGED_DURING_ACCEPTANCE');
 const auditDir=c.path.join(__dirname,'network-audit'),audits=c.fs.readdirSync(auditDir).map(f=>c.json(c.prefix+'network-audit/'+f));for(const a of audits){assert.deepEqual(a.sockets,[]);assert.deepEqual(a.blocked,[]);assert.equal(a.http,0);}
 c.write('phase-a-gate.json',{at:new Date().toISOString(),status:'PASS',originalPassed:51,newPassed:newCases.passed,passed:51+newCases.passed,failed:0,sourceHashes,networkProcesses:audits.length,postgresSockets:0,http:0,integrity:c.integrity(),scope:'OFFLINE_PARENT_CHILD_SENSOR_DOUBLES_AND_SAVED_RAW_REPLAY_NOT_POSTGRES_TRACE'});console.log(JSON.stringify({status:'PASS',original51:51,newCases:newCases.passed,total:51+newCases.passed}));
}
try{main();}catch(e){c.write('phase-a-guard-stop.json',{status:'FAIL',message:e.message,traceAllowed:false});console.error(e.stack);process.exitCode=1;}
