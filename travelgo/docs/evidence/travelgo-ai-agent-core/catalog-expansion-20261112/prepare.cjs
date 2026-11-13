const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),sha=v=>crypto.createHash('sha256').update(v).digest('hex'),read=f=>fs.readFileSync(path.join(root,f));
const prefix='docs/evidence/travelgo-ai-agent-core/catalog-expansion-20261112/';
for(const dir of ['','closure-20261111/','natural-chat-20261112/','qwen-natural-live-20261112/']){const base='docs/evidence/travelgo-ai-agent-core/'+dir,seal=JSON.parse(read(base+'artifact-checksums.json'));for(const[f,h]of Object.entries(seal.hashes))assert.equal(sha(read(base+f)),h,f);if(dir.startsWith('qwen'))assert.equal(sha(read(seal.report)),seal.reportSha256);}
const hashes={};for(const dir of ['backend/src','backend/scripts','frontend/src','frontend/tests','frontend/e2e','database','docker','docs'])for(const rel of fs.readdirSync(path.join(root,dir),{recursive:true})){const f=(dir+'/'+rel).replaceAll('\\','/');if(f.startsWith(prefix)||!fs.statSync(path.join(root,f)).isFile())continue;hashes[f]=sha(read(f));}
fs.writeFileSync(path.join(__dirname,'baseline.json'),JSON.stringify({at:new Date().toISOString(),hashes,stagingCreationApproved:true,inferenceApproved:false},null,2),{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'master-report-before.md'),read('docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md'),{flag:'wx'});
fs.copyFileSync('C:/Users/Danh/.codex/attachments/ddbf09df-a780-4a4c-8e48-295c7d3e7016/Pasted text.txt',path.join(__dirname,'owner-task.txt'),fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify({protectedFiles:Object.keys(hashes).length,history:'UNCHANGED'}));
