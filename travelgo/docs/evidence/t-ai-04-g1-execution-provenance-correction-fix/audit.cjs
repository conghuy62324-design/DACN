const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),dir='docs/evidence/t-ai-04-g1-execution-provenance-correction-fix/';
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex'),read=rel=>fs.readFileSync(path.join(root,rel));
const write=(name,data)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
function snapshot(){const hashes={};for(const folder of ['backend/src','frontend/src','frontend/tests','docs'])for(const file of fs.readdirSync(path.join(root,folder),{recursive:true})){
 const rel=path.join(folder,file).replaceAll('\\','/');if(rel.startsWith(dir)||rel==='docs/HUGO_T_AI_04_G1_EXECUTION_PROVENANCE_CORRECTION_FIX_REPORT.md'||!fs.statSync(path.join(root,rel)).isFile())continue;hashes[rel]=sha(read(rel));}
 for(const rel of ['backend/package.json','backend/package-lock.json','frontend/package.json','frontend/package-lock.json'])hashes[rel]=sha(read(rel));return hashes;}
if(process.argv[2]==='before'){
 const prior=JSON.parse(read('docs/evidence/t-ai-04-g1-server-completeness-policy-fix/integrity-after-final.json')).hashes;for(const[rel,hash]of Object.entries(prior))assert.equal(sha(read(rel)),hash,rel);
 const priorChecks=JSON.parse(read('docs/evidence/t-ai-04-g1-server-completeness-policy-fix/artifact-checksums.json'));
 for(const[rel,hash]of Object.entries(priorChecks.hashes))assert.equal(sha(read('docs/evidence/t-ai-04-g1-server-completeness-policy-fix/'+rel)),hash,rel);
 assert.equal(sha(read('docs/HUGO_T_AI_04_G1_SERVER_COMPLETENESS_POLICY_FIX_REPORT.md')),priorChecks.reportSha256);
 write('integrity-before.json',{at:new Date().toISOString(),hashes:snapshot()});fs.copyFileSync(path.join(root,'backend/src/agent/toolProvenance.ts'),path.join(__dirname,'toolProvenance.ts.before'));
 console.log('Verified previous FIX source/history and captured baseline');
}else{const before=JSON.parse(fs.readFileSync(path.join(__dirname,'integrity-before.json'))).hashes,after=snapshot();
 const changes=Object.keys(before).filter(x=>before[x]!==after[x]),added=Object.keys(after).filter(x=>!Object.hasOwn(before,x));
 assert.deepEqual(changes,['backend/src/agent/toolProvenance.ts']);assert.deepEqual(added,['backend/src/tests/agentExecutionCorrection.test.ts']);
 write(process.argv[2]==='after-final'?'integrity-after-final.json':'integrity-after.json',{at:new Date().toISOString(),status:'PASS',baselineFiles:Object.keys(before).length,unchanged:Object.keys(before).length-changes.length,
 historicalEvidenceFiles:Object.keys(before).filter(x=>x.startsWith('docs/evidence/')).length,changes,added,unexpected:[],hashes:after});console.log(JSON.stringify({status:'PASS',baseline:Object.keys(before).length,changes,added}));}
