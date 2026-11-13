const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),guard=path.join(__dirname,'offline-guard.cjs'),control=path.join(__dirname,'downstream-control.cjs');
const jobs=[['final-backend-build','cmd.exe',['/d','/c','npm.cmd run build --silent'],null],
 ['final-completeness',process.execPath,['--require',guard,'dist/tests/agentServerCompleteness.test.js'],50],
 ['downstream-control-readiness-33',process.execPath,['--require',guard,'--require',control,'dist/tests/agentReadinessAbort.test.js'],33]];
const results=[];
for(const[name,command,args,expected]of jobs){const run=spawnSync(command,args,{cwd:path.join(root,'backend'),encoding:'utf8',timeout:120000,env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'}});
 const log=(run.stdout||'')+(run.stderr||'');fs.writeFileSync(path.join(__dirname,name+'.log'),log,{flag:'wx'});
 const passed=Number(log.match(/"passed"\s*:\s*(\d+)/)?.[1]||0),failed=Number(log.match(/"failed"\s*:\s*(\d+)/)?.[1]||0);
 const item={name,exitCode:run.status,passed,failed,expected};results.push(item);console.log(JSON.stringify(item));assert.equal(run.status,0,log);if(expected!==null)assert.equal(passed,expected);}
fs.writeFileSync(path.join(__dirname,'final-supplement.json'),JSON.stringify({at:new Date().toISOString(),results,productionChangesSinceFullRegression:0,livePosts:0},null,2)+'\n',{flag:'wx'});
