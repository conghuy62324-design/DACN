// Local filesystem audit only. Never imports application, database, model or Docker clients.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/evidence/travelgo-public-release/m1-20261111');fs.mkdirSync(out,{recursive:true});
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const reports=fs.readdirSync(path.join(root,'docs')).filter(f=>f.endsWith('.md')&&f!=='TRAVELGO_AI_AGENT_PUBLIC_RELEASE_MASTER.md');
const historical=Object.fromEntries(reports.map(f=>['docs/'+f,hash(fs.readFileSync(path.join(root,'docs',f)))]));
const protectedHashes={};for(const dir of ['backend/src','frontend/src','database','docker','docs/evidence'])for(const f of fs.readdirSync(path.join(root,dir),{recursive:true})){const rel=(dir+'/'+f).replaceAll('\\','/');if(rel.startsWith('docs/evidence/travelgo-public-release/')||!fs.statSync(path.join(root,rel)).isFile())continue;protectedHashes[rel]=hash(fs.readFileSync(path.join(root,rel)));}
for(const f of ['docker-compose.yml','backend/package.json','backend/package-lock.json','frontend/package.json','frontend/package-lock.json'])protectedHashes[f]=hash(fs.readFileSync(path.join(root,f)));
const reviewed=reports.filter(f=>/^HUGO_T(0[3-9]|1[0-3]|_AI)/.test(f)).map(f=>{const s=fs.readFileSync(path.join(root,'docs',f),'utf8');return{file:'docs/'+f,sha256:historical['docs/'+f],bytes:Buffer.byteLength(s),opening:s.slice(0,1600)};});
fs.writeFileSync(path.join(out,'audit-before.json'),JSON.stringify({at:new Date().toISOString(),scope:'M1 implementation authorized; existing dirty working tree retained; no DB/credentials accessed',historical,protectedHashes,reviewedReports:reviewed},null,2),{flag:'wx'});
console.log(JSON.stringify({reports:reviewed.length,protectedFiles:Object.keys(protectedHashes).length,out}));
