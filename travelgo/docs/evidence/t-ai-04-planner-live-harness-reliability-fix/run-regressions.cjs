const c=require('./common.cjs'),{spawnSync}=require('node:child_process');
const results=[];
function run(name,args,dir,count){const r=spawnSync(process.execPath,args,{cwd:c.path.join(c.root,dir),encoding:'utf8',timeout:120000,env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'}}),log=(r.stdout||'')+(r.stderr||'');c.fs.writeFileSync(c.path.join(c.evidence,name+'.log'),log,{flag:'wx'});const match=log.match(/"passed"\s*:\s*(\d+)/),failed=log.match(/"failed"\s*:\s*(\d+)/);const item={name,exitCode:r.status,passed:match?+match[1]:null,failed:failed?+failed[1]:null,expected:count??null,status:r.status===0&&(!count||+match?.[1]===count&&+failed?.[1]===0)?'PASS':'FAIL'};results.push(item);console.log(JSON.stringify(item));return item;}
run('backend-build',['node_modules/typescript/bin/tsc'],'backend');
for(const[name,file,count]of [['g2-68','agentVerifiedHistory',68],['natural-79','agentNaturalLanguageProof',79],['compatibility-61','agentCompatibilityAcceptance',61],['correction-42','agentExecutionCorrection',42],['completeness-52','agentServerCompleteness',52]])run(name,['dist/tests/'+file+'.test.js'],'backend',count);
run('frontend-g1',['--experimental-strip-types','tests/agentConversation.test.ts'],'frontend',10);
run('frontend-g2',['--require','./tests/agentG2.loader.cjs','--experimental-transform-types','tests/agentG2Conversation.test.ts'],'frontend',39);
run('frontend-typecheck',['node_modules/typescript/bin/tsc'],'frontend');
run('frontend-build',['node_modules/vite/bin/vite.js','build'],'frontend');
c.write('regression-results.json',{at:new Date().toISOString(),status:results.every(x=>x.status==='PASS')?'PASS':'FAIL',results,legacy181:'NOT_RERUN; historical145PASS36FAIL unchanged',readinessDiagnostics:'NOT_RERUN; historical actual32/1 and8/5 unchanged',nativeRequests:0,database:false,integrity:c.integrity()});if(results.some(x=>x.status!=='PASS'))process.exitCode=1;
