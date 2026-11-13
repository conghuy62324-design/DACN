const c=require('./common.cjs'),{spawnSync}=require('node:child_process');
const r=spawnSync('cmd.exe',['/d','/c','npm.cmd run build'],{cwd:c.path.join(c.root,'frontend'),encoding:'utf8',timeout:120000,env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'}});
c.fs.writeFileSync(c.path.join(c.evidence,'frontend-build-final.log'),(r.stdout||'')+(r.stderr||''),{flag:'wx'});
c.write('frontend-build-final.json',{at:new Date().toISOString(),command:'npm.cmd run build',directory:'frontend',exitCode:r.status,status:r.status===0?'PASS':'FAIL',database:false,nativeInference:0});
console.log(JSON.stringify({exitCode:r.status,status:r.status===0?'PASS':'FAIL'}));if(r.status!==0)process.exitCode=1;
