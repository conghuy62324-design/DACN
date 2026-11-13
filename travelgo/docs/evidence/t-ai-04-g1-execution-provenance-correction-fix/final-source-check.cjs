const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'../../..'),ts=require(path.join(root,'backend/node_modules/typescript'));
const before=fs.readFileSync(path.join(__dirname,'toolProvenance.behavior-final.ts'),'utf8'),after=fs.readFileSync(path.join(root,'backend/src/agent/toolProvenance.ts'),'utf8');
const code=source=>ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,removeComments:true}}).outputText;
assert.equal(code(before),code(after));
const jobs=[['final-backend-build','cmd.exe',['/d','/c','npm.cmd run build --silent'],null],
 ['final-execution-correction',process.execPath,['--require',path.join(__dirname,'offline-guard.cjs'),'dist/tests/agentExecutionCorrection.test.js'],42],
 ['final-server-completeness',process.execPath,['--require',path.join(__dirname,'offline-guard.cjs'),'dist/tests/agentServerCompleteness.test.js'],52]];
const results=[];for(const[name,cmd,args,expected]of jobs){const run=spawnSync(cmd,args,{cwd:path.join(root,'backend'),encoding:'utf8',timeout:120000,env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'}});
 const log=(run.stdout||'')+(run.stderr||'');fs.writeFileSync(path.join(__dirname,name+'.log'),log,{flag:'wx'});assert.equal(run.status,0,log);
 const passed=Number(log.match(/"passed"\s*:\s*(\d+)/)?.[1]||0);if(expected!==null)assert.equal(passed,expected);results.push({name,exitCode:run.status,passed});}
fs.writeFileSync(path.join(__dirname,'final-source-check.json'),JSON.stringify({at:new Date().toISOString(),status:'PASS',
 finalCommentsOnlyChangeSinceFullRegression:true,emittedCodeWithoutCommentsIdentical:true,emittedBehaviorSha256:crypto.createHash('sha256').update(code(after)).digest('hex'),results,livePosts:0},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:'PASS',results,behaviorIdentical:true}));
