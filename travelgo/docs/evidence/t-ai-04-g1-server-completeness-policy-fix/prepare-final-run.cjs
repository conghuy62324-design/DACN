const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let script=fs.readFileSync(path.join(__dirname,'run-regression.cjs'),'utf8');
script=script.replace("const execution=[],derivations=[];","const output=path.join(__dirname,'final-run');fs.mkdirSync(output);\nconst execution=[],derivations=[];");
const replacements=[
 ["path.join(__dirname,name),JSON.stringify(data","path.join(output,name),JSON.stringify(data"],
 ["path.join(__dirname,name+'.log')","path.join(output,name+'.log')"],
 ["path.join(__dirname,name+'.server-policy-audit.js')","path.join(output,name+'.server-policy-audit.js')"],
 ["path.join(__dirname,layer+'-'+name+'.json')","path.join(output,layer+'-'+name+'.json')"],
 ["path.join(__dirname,layer+'-'+name+'.log')","path.join(output,layer+'-'+name+'.log')"],
 ["path.join(__dirname,layer+'-diagnostics')","path.join(output,layer+'-diagnostics')"],
 ["'backend',47)","'backend',52)"],
 ["fs.copyFileSync(path.join(old,'prior-diagnostics-compatible/offline-diagnostics.cjs'),path.join(dir,'offline-diagnostics.cjs'));",
  "fs.writeFileSync(path.join(dir,'offline-diagnostics.cjs'),fs.readFileSync(path.join(old,'prior-diagnostics-compatible/offline-diagnostics.cjs'),'utf8').replace(\"path.resolve(__dirname, '../../../..')\",\"path.resolve(__dirname, '../../../../..')\"),{flag:'wx'});"],
];
for(const[from,to]of replacements){assert.equal(script.split(from).length-1,1,from);script=script.replace(from,to);}
script += "\nconst finalControl=run('downstream-control-readiness-33',process.execPath,['--require',guard,'--require',control,'dist/tests/agentReadinessAbort.test.js'],'backend',33);assert.equal(finalControl.passed,33);assert.equal(finalControl.failed,0);\n";
fs.writeFileSync(path.join(__dirname,'run-final-regression.cjs'),script,{flag:'wx'});
console.log('Final evidence runner prepared; assertions unchanged');
