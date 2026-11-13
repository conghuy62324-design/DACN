const c=require('./common.cjs'),{spawnSync}=require('node:child_process');
const run=process.argv[2]||'final';if(!/^[a-z0-9-]+$/.test(run))throw Error('Invalid run');
const results=[];
for(const[name,args]of [['g1',['--experimental-strip-types','tests/agentConversation.test.ts']],['g2',['--require','./tests/agentG2.loader.cjs','--experimental-transform-types','tests/agentG2Conversation.test.ts']]]){
const r=spawnSync(process.execPath,args,{cwd:c.path.join(c.root,'frontend'),encoding:'utf8',timeout:30000});const log=(r.stdout||'')+(r.stderr||'');
c.fs.writeFileSync(c.path.join(c.evidence,`frontend-${name}-${run}.log`),log,{flag:'wx'});
const match=(r.stdout||'').match(/\{[\s\S]*\}/);const data=match?JSON.parse(match[0]):{};c.write(`frontend-${name}-${run}.json`,{...data,exitCode:r.status});results.push({name,exitCode:r.status,passed:data.passed,failed:data.failed});}
c.write(`frontend-unit-${run}.json`,{at:new Date().toISOString(),results,liveInference:0,database:false});console.log(JSON.stringify(results));if(results.some(x=>x.exitCode!==0))process.exitCode=1;
