const c=require('./common.cjs');
const target=c.path.join(c.evidence,'run-regression.cjs'),before=c.fs.readFileSync(target,'utf8');
let after=before.replace("const args=['--require',guard,'--require',ready,target];","const args=['--require',guard,'--require',ready,'--require',path.join(__dirname,'observe-legacy.cjs'),target];")
 .replace('observations=[];try{await work();results.push({name,status:', 'observations=[];globalThis.__compatTurns=[];try{await work();results.push({turns:globalThis.__compatTurns,name,status:')
 .replace("results.push({name,status:'FAIL',error:","results.push({turns:globalThis.__compatTurns,name,status:'FAIL',error:");
c.assert.notEqual(after,before);c.assert.ok(after.includes('turns:globalThis.__compatTurns'));
c.fs.writeFileSync(target,after);
c.write('harness-adaptation.json',{at:new Date().toISOString(),source:'docs/evidence/t-ai-04-g1-server-completeness-live-validation/run-regression.cjs',beforeSha256:c.sha(before),afterSha256:c.sha(after),changes:['Preload transparent chat/provider/executor observation, delegated unchanged','Reset and attach per-case input/result/errors/invocation counts to derived runner records'],assertionsChanged:0,caseBodiesChanged:0,productionChanges:0,assessorAndGateStubs:false,isolatedControl:'Existing downstream stub remains only in separate downstream-control child; actual-policy child unmodified semantics'});
