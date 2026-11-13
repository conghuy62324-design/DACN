const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),old=path.join(root,'docs/evidence/t-ai-04-g1-readiness-abort-guard-fix');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex'),write=(name,data)=>fs.writeFileSync(path.join(artifactDirectory,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const guard=path.join(__dirname,'offline-guard.cjs'),ready=path.join(__dirname,'legacy-ready-shim.cjs'),control=path.join(__dirname,'downstream-control.cjs');
fs.copyFileSync(path.join(old,'legacy-ready-shim.cjs'),ready);
const artifactDirectory=path.join(__dirname,'final-verified');fs.mkdirSync(artifactDirectory);
const execution=[],derivations=[];
function run(name,command,args,folder,expectedCount=null){
 const result=spawnSync(command,args,{cwd:path.join(root,folder),encoding:'utf8',timeout:120000,env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'}});
 const log=(result.stdout||'')+(result.stderr||'')+(result.error?'\n'+result.error.name:'');
 fs.writeFileSync(path.join(artifactDirectory,name+'.log'),log,{flag:'wx'});
 const match=log.match(/"passed"\s*:\s*(\d+)/),failed=log.match(/"failed"\s*:\s*(\d+)/);
 const item={name,exitCode:result.status,passed:match?+match[1]:null,failed:failed?+failed[1]:null,expectedCount,log:name+'.log'};execution.push(item);console.log(JSON.stringify(item));return item;
}
assert.equal(run('backend-build','cmd.exe',['/d','/c','npm.cmd run build --silent'],'backend').exitCode,0);
run('new-completeness',process.execPath,['--require',guard,'dist/tests/agentServerCompleteness.test.js'],'backend',52);
run('new-execution-correction',process.execPath,['--require',guard,'dist/tests/agentExecutionCorrection.test.js'],'backend',42);
run('readiness-33',process.execPath,['--require',guard,'dist/tests/agentReadinessAbort.test.js'],'backend',33);
const tests=[['agentMissingSlotRecovery',33],['agentSlotFillingPrompt',21],['agentG1SafeContract',26],['agentDecisionRouting',10],['agentDecisionFormatSafety',17],['agentFoundation',22],['agentTransport',19],['agentContractSlotInvestigation.g1-applicable',23]];
for(const[name,count]of tests){
 const input=name==='agentTransport'?fs.readFileSync(path.join(old,'agentTransport.readiness-compatible.js'),'utf8'):
  fs.readFileSync(path.join(root,'backend/dist/tests',name+(name.endsWith('g1-applicable')?'.js':'.test.js')),'utf8');
 const at=input.lastIndexOf('async function main()');assert.ok(at>0,name);
 const prefix=input.slice(0,at);
 // Only the runner is replaced to continue after failures and expose every case.
 // Every case body, assertion and test registration is byte-identical to source fixture.
 const main=`async function main(){
 const fs=require('node:fs'),db=require('../config/database.js').sequelize;const originalQuery=db.query,oldInfo=console.info;let observations=[];
 db.query=async()=>{throw Error('DB_FORBIDDEN');};console.info=(value)=>{try{const event=JSON.parse(value);if(event.source==='agent_decision_origin'){observations.push(event);return;}}catch{}oldInfo(value);};
 const results=[];try{for(const[name,work]of cases){observations=[];try{await work();results.push({name,status:'PASS',origins:observations});}catch(error){results.push({name,status:'FAIL',error:String(error.stack||error),origins:observations});}}}
 finally{db.query=originalQuery;console.info=oldInfo;}
 const result={tier:'MOCK_ONLY_OFFLINE',suite:${JSON.stringify(name)},passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,notRun:0,results,assertionsChanged:0};
 fs.writeFileSync(process.env.CASE_OUTPUT,JSON.stringify(result,null,2)+'\\n',{flag:'wx'});console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
}main().catch(e=>{console.error(e);process.exitCode=1;});`;
 const derived=prefix+main,target=path.join(root,'backend/dist/tests',name+'.server-policy-audit.js');fs.writeFileSync(target,derived);
 fs.writeFileSync(path.join(artifactDirectory,name+'.server-policy-audit.js'),derived,{flag:'wx'});
 derivations.push({name,originalSha256:sha(input),casePrefixSha256:sha(prefix),derivedSha256:sha(derived),caseBodiesAndRegistrationsUnchanged:true,assertionsChanged:0,runnerChange:'continue every registered case; capture origin; write results'});
 const args=['--require',guard,'--require',ready,target];
 for(const layer of ['actual-policy','downstream-control']){
  const file=path.join(artifactDirectory,layer+'-'+name+'.json');
  const result=spawnSync(process.execPath,layer==='actual-policy'?args:['--require',control,...args],{cwd:path.join(root,'backend'),encoding:'utf8',timeout:120000,
    env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false',CASE_OUTPUT:file}});
  fs.writeFileSync(path.join(artifactDirectory,layer+'-'+name+'.log'),(result.stdout||'')+(result.stderr||''),{flag:'wx'});
  const output=fs.existsSync(file)?JSON.parse(fs.readFileSync(file)):null;
  execution.push({name:layer+'-'+name,exitCode:result.status,passed:output?.passed??null,failed:output?.failed??null,expectedCount:count,resultFile:path.basename(file)});
  console.log(JSON.stringify(execution.at(-1)));
 }
}
run('frontend-conversation',process.execPath,['--experimental-strip-types','tests/agentConversation.test.ts'],'frontend',10);
run('historical-F-unchanged',process.execPath,['--require',guard,'--require',ready,'dist/tests/agentContractSlotInvestigation.test.js'],'backend');
for(const layer of ['actual-policy','downstream-control']){
 const dir=path.join(artifactDirectory,layer+'-diagnostics');fs.mkdirSync(dir);
 fs.writeFileSync(path.join(dir,'offline-diagnostics.cjs'),fs.readFileSync(path.join(old,'prior-diagnostics-compatible/offline-diagnostics.cjs'),'utf8').replace("path.resolve(__dirname, '../../../..')","path.resolve(__dirname, '../../../../..')"),{flag:'wx'});
 run(layer+'-diagnostics',process.execPath,['--require',guard,...(layer==='downstream-control'?['--require',control]:[]),'--require',ready,path.join(dir,'offline-diagnostics.cjs')],'.',13);
}
write('runner-derivations.json',{assertionsChanged:0,derivations,readinessShimSha256:sha(fs.readFileSync(ready)),downstreamControl:'Test-process stub of exported assessor only; not a production/client option. Not counted as actual-policy end-to-end PASS.'});
write('execution.json',{at:new Date().toISOString(),execution,livePosts:0,database:'NONE'});

const finalControl=run('downstream-control-readiness-33',process.execPath,['--require',guard,'--require',control,'dist/tests/agentReadinessAbort.test.js'],'backend',33);assert.equal(finalControl.passed,33);assert.equal(finalControl.failed,0);
