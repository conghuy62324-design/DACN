const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),dir='docs/evidence/t-ai-04-g1-server-completeness-policy-fix/';
const read=rel=>fs.readFileSync(path.join(root,rel)),sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const write=(name,data)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const allowed=['backend/src/agent/toolProvenance.ts','backend/src/agent/missingSlotRecovery.ts','backend/src/services/agentService.ts'];
const newAllowed=['backend/src/agent/currentCompleteness.ts','backend/src/tests/agentServerCompleteness.test.ts'];
function snapshot(){const hashes={};for(const folder of ['backend/src','frontend/src','frontend/tests','docs'])for(const file of fs.readdirSync(path.join(root,folder),{recursive:true})){
  const rel=path.join(folder,file).replaceAll('\\','/');if(rel.startsWith(dir)||rel==='docs/HUGO_T_AI_04_G1_SERVER_COMPLETENESS_POLICY_FIX_REPORT.md'||!fs.statSync(path.join(root,rel)).isFile())continue;hashes[rel]=sha(read(rel));}
  for(const rel of ['backend/package.json','backend/package-lock.json','frontend/package.json','frontend/package-lock.json'])hashes[rel]=sha(read(rel));return hashes;}
if(process.argv[2]==='before'){
 const old=JSON.parse(read('docs/evidence/t-ai-04-g1-readiness-controlled-check/integrity-after.json')).hashes;
 for(const [rel,hash]of Object.entries(old))assert.equal(sha(read(rel)),hash,rel);
 write('integrity-before.json',{at:new Date().toISOString(),hashes:snapshot()});
 for(const rel of allowed)fs.copyFileSync(path.join(root,rel),path.join(__dirname,path.basename(rel)+'.before'));
 console.log('Baseline source/history verified and captured');
}else{
 const before=JSON.parse(fs.readFileSync(path.join(__dirname,'integrity-before.json'))).hashes,after=snapshot();
 const changes=Object.keys(before).filter(x=>before[x]!==after[x]),added=Object.keys(after).filter(x=>!Object.hasOwn(before,x));
 const unexpected=changes.filter(x=>!allowed.includes(x)).concat(added.filter(x=>!newAllowed.includes(x)));assert.deepEqual(unexpected,[]);
 const gate=x=>x.slice(x.indexOf('export function checkToolProvenance'));
 assert.equal(gate(fs.readFileSync(path.join(__dirname,'toolProvenance.ts.before'),'utf8')),gate(read('backend/src/agent/toolProvenance.ts').toString('utf8')));
 const prompt=x=>x.match(/const SYSTEM = (`[\s\S]*?`);/)[1];
 assert.equal(prompt(fs.readFileSync(path.join(__dirname,'agentService.ts.before'),'utf8')),prompt(read('backend/src/services/agentService.ts').toString('utf8')));
 write(process.argv[2]==='after-final'?'integrity-after-final.json':'integrity-after.json',{at:new Date().toISOString(),status:'PASS',baselineFiles:Object.keys(before).length,unchanged:Object.keys(before).length-changes.length,
  historicalEvidenceFiles:Object.keys(before).filter(x=>x.startsWith('docs/evidence/')).length,changes,added,unexpected,executionGateBodyUnchanged:true,systemLiteralUnchanged:true,hashes:after});
 console.log(JSON.stringify({status:'PASS',baseline:Object.keys(before).length,changes,added}));
}
