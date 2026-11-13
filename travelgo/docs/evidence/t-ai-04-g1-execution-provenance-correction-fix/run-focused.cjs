const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const label=process.argv[2];if(!/^[a-z0-9-]+$/.test(label||''))throw Error('Label required');
const root=path.resolve(__dirname,'../../..');
const run=spawnSync(process.execPath,['dist/tests/agentExecutionCorrection.test.js'],{cwd:path.join(root,'backend'),encoding:'utf8',timeout:120000,env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'}});
fs.writeFileSync(path.join(__dirname,label+'.log'),(run.stdout||'')+(run.stderr||''),{flag:'wx'});console.log(JSON.stringify({label,exitCode:run.status}));
