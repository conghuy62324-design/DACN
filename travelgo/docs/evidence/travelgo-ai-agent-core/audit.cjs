// Filesystem-only baseline. No DB/provider/container imports.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),prefix='docs/evidence/travelgo-ai-agent-core/',sha=b=>crypto.createHash('sha256').update(b).digest('hex'),hashes={};
for(const dir of ['backend/src','backend/scripts','frontend/src','frontend/tests','frontend/e2e','database','docker','docs'])for(const rel of fs.readdirSync(path.join(root,dir),{recursive:true})){const f=(dir+'/'+rel).replaceAll('\\','/');if(f.startsWith(prefix)||f==='docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md'||!fs.statSync(path.join(root,f)).isFile())continue;hashes[f]=sha(fs.readFileSync(path.join(root,f)));}
for(const f of ['docker-compose.yml','backend/package.json','backend/package-lock.json','frontend/package.json','frontend/package-lock.json'])hashes[f]=sha(fs.readFileSync(path.join(root,f)));
fs.writeFileSync(path.join(__dirname,'audit-before.json'),JSON.stringify({at:new Date().toISOString(),hashes,priorMapsPublicWork:'PRESERVED_DISABLED_OUT_OF_SCOPE',originalDatabasesNeverWritten:true},null,2),{flag:'wx'});
fs.copyFileSync('C:/Users/Danh/.codex/attachments/c642c128-0906-4266-bbb3-5bf333eb986d/Pasted text.txt',path.join(__dirname,'owner-task.txt'),fs.constants.COPYFILE_EXCL);
const reports=fs.readdirSync(path.join(root,'docs')).filter(f=>/^HUGO_T(?:0[3-9]|1[0-3]|_AI).*\.md$/.test(f));
fs.writeFileSync(path.join(__dirname,'reports-reviewed.json'),JSON.stringify(reports.map(f=>{const b=fs.readFileSync(path.join(root,'docs',f));return{file:'docs/'+f,bytes:b.length,sha256:sha(b),opening:b.toString('utf8').slice(0,1300)};}),null,2),{flag:'wx'});
console.log(JSON.stringify({protectedFiles:Object.keys(hashes).length,reports:reports.length}));
