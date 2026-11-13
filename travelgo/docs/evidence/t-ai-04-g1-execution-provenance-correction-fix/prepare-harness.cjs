const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),prior=path.join(root,'docs/evidence/t-ai-04-g1-server-completeness-policy-fix');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
for(const file of ['offline-guard.cjs','downstream-control.cjs'])fs.copyFileSync(path.join(prior,file),path.join(__dirname,file));
let runner=fs.readFileSync(path.join(prior,'run-final-verified.cjs'),'utf8');
const anchor="run('new-completeness',process.execPath,['--require',guard,'dist/tests/agentServerCompleteness.test.js'],'backend',52);";
assert.equal(runner.split(anchor).length-1,1);
runner=runner.replace(anchor,anchor+"\nrun('new-execution-correction',process.execPath,['--require',guard,'dist/tests/agentExecutionCorrection.test.js'],'backend',42);");
fs.writeFileSync(path.join(__dirname,'run-regression.cjs'),runner,{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'harness-adaptation.json'),JSON.stringify({source:'docs/evidence/t-ai-04-g1-server-completeness-policy-fix/run-final-verified.cjs',
 sourceSha256:sha(fs.readFileSync(path.join(prior,'run-final-verified.cjs'))),derivedSha256:sha(runner),changes:['Add 42 correction tests; inherited output paths now resolve under new task evidence'],
 originalAssertionsChanged:0,controls:'Same test-only assessor stub; cannot bypass the new execution gate or shared inspection',livePosts:0},null,2)+'\n',{flag:'wx'});
