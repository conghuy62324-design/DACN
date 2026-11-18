// One permanent entrypoint for model-off tests. No provider fallback from project .env.
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),target=path.resolve(root,process.argv[2]||'dist/tests/tripBusinessV61B.test.js');
assert(target.startsWith(root+path.sep)&&fs.existsSync(target),'LOCAL_TEST_ENTRY_REQUIRED');
const result=spawnSync(process.execPath,['--require',path.join(__dirname,'model-off-isolation.cjs'),target,...process.argv.slice(3)],{cwd:root,env:{...process.env,TRAVELGO_MODEL_OFF_MODE:'offline'},stdio:'inherit',windowsHide:true});
if(result.error)throw result.error;process.exitCode=result.status??1;
