const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),cp=require('node:child_process');
const root=path.resolve(__dirname,'../../../..'),sha=v=>crypto.createHash('sha256').update(v).digest('hex'),read=f=>fs.readFileSync(path.join(root,f)),report='docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md',prefix='docs/evidence/travelgo-ai-agent-core/closure-20261111/';
const seal=JSON.parse(read('docs/evidence/travelgo-ai-agent-core/artifact-checksums.json'));
for(const[f,h]of Object.entries(seal.hashes))assert.equal(sha(read('docs/evidence/travelgo-ai-agent-core/'+f)),h,f);
assert.equal(sha(read(report)),seal.reportSha256);
fs.writeFileSync(path.join(__dirname,'master-report-before.md'),read(report),{flag:'wx'});
fs.copyFileSync('C:/Users/Danh/.codex/attachments/1647a3ef-09b7-4cc9-8ebd-ecc81389f596/Pasted text.txt',path.join(__dirname,'owner-task.txt'),fs.constants.COPYFILE_EXCL);
const hashes={};for(const d of ['backend/src','backend/scripts','frontend/src','frontend/tests','frontend/e2e','database','docker','docs'])for(const rel of fs.readdirSync(path.join(root,d),{recursive:true})){const f=(d+'/'+rel).replaceAll('\\','/');if(f.startsWith(prefix)||!fs.statSync(path.join(root,f)).isFile())continue;hashes[f]=sha(read(f));}
fs.writeFileSync(path.join(__dirname,'baseline.json'),JSON.stringify({at:new Date().toISOString(),hashes,priorSealedArtifactsVerified:Object.keys(seal.hashes).length,reportBeforeSha256:sha(read(report))},null,2),{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'git-status-before.txt'),cp.execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}),{flag:'wx'});
console.log(JSON.stringify({protectedFiles:Object.keys(hashes).length,priorArtifacts:Object.keys(seal.hashes).length,core42:'PRESERVED',browser94:'PRESERVED',rawQwenFail:'PRESERVED'}));
