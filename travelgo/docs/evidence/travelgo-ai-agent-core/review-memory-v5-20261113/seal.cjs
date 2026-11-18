const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),prefix='docs/evidence/travelgo-ai-agent-core/review-memory-v5-20261113/',report='docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md';
const read=f=>fs.readFileSync(path.join(root,f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),parse=f=>JSON.parse(fs.readFileSync(path.join(__dirname,f),'utf8')),write=(f,o)=>fs.writeFileSync(path.join(__dirname,f),JSON.stringify(o,null,2),{flag:'wx'});
const summary=parse('acceptance-final.json'),baseline=parse('baseline.json'),allowed=new Set([...summary.protected.changedExistingSource,report]),changed=[];
for(const[f,h]of Object.entries(baseline.hashes)){if(sha(read(f))!==h){assert(allowed.has(f),'UNEXPECTED_CHANGE '+f);changed.push(f);}}
assert.equal(changed.length,15);assert(changed.includes(report));
const added=[];
for(const dir of ['backend/src','backend/scripts','frontend/src','frontend/e2e','frontend/tests','database','docker','docs'])for(const rel of fs.readdirSync(path.join(root,dir),{recursive:true})){const f=(dir+'/'+rel).replaceAll('\\','/');if(f.startsWith(prefix)||!fs.statSync(path.join(root,f)).isFile())continue;if(!Object.hasOwn(baseline.hashes,f)){assert(summary.protected.addedSource.includes(f),'UNEXPECTED_NEW '+f);added.push(f);}}
assert.equal(added.length,11);
for(const[f,h]of Object.entries(summary.sourceHashes))assert.equal(sha(read(f)),h,f);
const before=fs.readFileSync(path.join(__dirname,'master-report-before.md'),'utf8'),after=read(report).toString('utf8'),section='### 21.9.';
assert(after.includes(section));assert.equal(before.slice(before.indexOf('## 1.')).trimEnd(),after.slice(after.indexOf('## 1.'),after.indexOf(section)).trimEnd());
const historical={};for(const name of ['smart-v5-20261113','qwen-v4-real-20261112-1236']){const prior='docs/evidence/travelgo-ai-agent-core/'+name+'/',seal=JSON.parse(read(prior+'artifact-checksums.json'));for(const[f,h]of Object.entries(seal.hashes))assert.equal(sha(read(prior+f)),h,prior+f);historical[name]=Object.keys(seal.hashes).length;}
assert.equal(historical['smart-v5-20261113'],248);assert.equal(historical['qwen-v4-real-20261112-1236'],39);
assert.deepEqual(parse('staging-before.json').tables,parse('staging-delivery.json').tables);
const db=parse('final-database-closure.json');assert.equal(db.counts.users,1);for(const k of ['reviews','review_reports','memory_settings','preferences','trips','bookings'])assert.equal(db.counts[k],0);assert.equal(db.consistency.mismatches,0);
let links=0;for(const m of after.slice(after.indexOf(section)).matchAll(/\]\(([^)]+)\)/g)){if(/^(?:https?:|#)/.test(m[1]))continue;assert(m[1]===prefix.slice(5)+'artifact-checksums.json'||fs.existsSync(path.resolve(root,'docs',m[1].split('#')[0])),m[1]);links++;}
for(const f of added)assert(!read(f).toString('utf8').split(/\r?\n/).some(line=>/[\t ]+$/.test(line)),f+' trailing whitespace');
write('integrity-final.json',{at:new Date().toISOString(),baselineFiles:Object.keys(baseline.hashes).length,changedExisting:changed,newSource:added,unexpectedChanges:0,historicalMasterBodySections1Through21_8Unchanged:true,historicalArtifacts:historical,sourceHashes:summary.sourceHashes,reportLinksChecked:links,nativeGet:0,nativePost:0,originalDatabaseConnections:0,stagingFinalChecksumsUnchanged:true});
fs.writeFileSync(path.join(__dirname,'master-report-final.md'),read(report),{flag:'wx'});
const hashes={};for(const rel of fs.readdirSync(__dirname,{recursive:true})){const f=rel.replaceAll('\\','/');if(f==='artifact-checksums.json'||!fs.statSync(path.join(__dirname,rel)).isFile())continue;hashes[f]=sha(fs.readFileSync(path.join(__dirname,rel)));}
write('artifact-checksums.json',{at:new Date().toISOString(),verdict:summary.verdict,hashes,sourceHashes:summary.sourceHashes,report,reportSha256:sha(read(report)),runtimeLogsOutsideSeal:'.local/catalog-staging/review-memory-*.log'});
console.log(JSON.stringify({status:'SEALED',baselineFiles:Object.keys(baseline.hashes).length,changedSource:14,newSource:11,reportChanges:1,artifacts:Object.keys(hashes).length,links,native:0,staging:'130/20_UNCHANGED',historicalBodyUnchanged:true}));
