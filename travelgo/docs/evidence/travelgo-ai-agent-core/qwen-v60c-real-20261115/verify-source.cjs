// Read-only source/artifact verification. No application boot, DB, model or network calls.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),sha=x=>crypto.createHash('sha256').update(x).digest('hex'),read=p=>fs.readFileSync(path.join(root,p));
const old='docs/evidence/travelgo-ai-agent-core/bridge-v60b-20261115/',write=(n,x)=>fs.writeFileSync(path.join(__dirname,n),JSON.stringify(x,null,2)+'\n',{flag:'wx'});
const r={at:new Date().toISOString(),status:'BLOCKED_SOURCE_MANIFEST_MISMATCH',nativeGet:0,nativePost:0,postgresConnections:0};
try{
 const proposed=JSON.parse(read(old+'qwen-live-proposed-manifest-v3.json')),freeze=JSON.parse(read(old+'source-freeze-final-v3.json')),templates=JSON.parse(read(old+'proposed-serialized-payloads-v3.json'));
 assert.equal(sha(read(old+'source-freeze-final-v3.json')),proposed.sourceFreezeSha256);
 r.sourceDrift=Object.entries(freeze.hashes).filter(([p,h])=>sha(read(p))!==h).map(([p])=>p);assert.deepEqual(r.sourceDrift,[]);r.sourceFiles=Object.keys(freeze.hashes).length;
 const prior=JSON.parse(read(old+'baseline.json'));r.historicalEvidenceDrift=Object.entries(prior.hashes).filter(([p])=>p.startsWith('docs/evidence/')).filter(([p,h])=>sha(read(p))!==h).map(([p])=>p);assert.deepEqual(r.historicalEvidenceDrift,[]);
 const seal=JSON.parse(read(old+'final-seal.json'));assert.equal(sha(read('docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md')),seal.masterSha256);
 for(const[n,h]of Object.entries(seal.artifacts))assert.equal(sha(read(old+n)),h,n);
 const ts=require(path.join(root,'backend/node_modules/typescript')),configPath=path.join(root,'backend/tsconfig.json'),config=ts.readConfigFile(configPath,ts.sys.readFile);assert(!config.error);
 const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,path.dirname(configPath));assert.equal(parsed.errors.length,0);
 const emitted={},program=ts.createProgram(parsed.fileNames,parsed.options),result=program.emit(undefined,(p,text)=>{emitted[path.relative(root,p).replaceAll('\\','/')]=sha(Buffer.from(text));});assert.equal(result.emitSkipped,false);
 r.compiledArtifactDrift=Object.entries(emitted).filter(([p,h])=>!fs.existsSync(path.join(root,p))||sha(read(p))!==h).map(([p])=>p);assert.deepEqual(r.compiledArtifactDrift,[]);r.compiledFilesVerified=Object.keys(emitted).length;
 const {serializeCoreRequest}=require(path.join(root,'backend/dist/agent/coreProvider.js')),{NATURAL_RESPONSE_SCHEMA}=require(path.join(root,'backend/dist/agent/naturalContract.js')),{GROUNDED_RESPONSE_SCHEMA}=require(path.join(root,'backend/dist/agent/naturalGrounding.js'));
 r.templateSizes={};for(const id of proposed.caseIds){const t=templates.payloads[id],b=JSON.parse(t.serializedBody),schema=id==='B1'||id==='B2'?NATURAL_RESPONSE_SCHEMA:GROUNDED_RESPONSE_SCHEMA,suffix='\nReturn JSON for schema: '+JSON.stringify(schema);assert(b.messages[0].content.endsWith(suffix));const input={system:b.messages[0].content.slice(0,-suffix.length),messages:b.messages.slice(1),tools:[],responseSchema:schema};assert.equal(serializeCoreRequest(input),t.serializedBody);assert.equal(sha(t.serializedBody),t.bodySha256);const content=JSON.parse(input.messages[0].content),ctx=content.context||content;assert.equal(ctx.currentRequest.text,proposed.inputs[id]);r.templateSizes[id]={nativeBodyBytes:Buffer.byteLength(t.serializedBody),contextBytes:Buffer.byteLength(JSON.stringify(ctx)),factsBytes:content.facts?Buffer.byteLength(JSON.stringify(content.facts)):0};assert(r.templateSizes[id].nativeBodyBytes<=12288&&r.templateSizes[id].contextBytes<=3000&&r.templateSizes[id].factsBytes<=7500);}
 const hashes={};function walk(p){for(const e of fs.readdirSync(path.join(root,p),{withFileTypes:true})){const f=p+'/'+e.name;if(path.resolve(root,f)===__dirname)continue;if(e.isDirectory())walk(f);else hashes[f]=sha(read(f));}}
 for(const p of ['backend/src','backend/dist','backend/scripts','frontend/src','frontend/tests','database','docs/evidence'])walk(p);
 for(const p of ['backend/tsconfig.json','backend/package.json','backend/package-lock.json','frontend/package.json','frontend/package-lock.json','docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md'])hashes[p]=sha(read(p));
 write('baseline.json',{at:new Date().toISOString(),hashes});fs.writeFileSync(path.join(__dirname,'master-before.md'),read('docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md'),{flag:'wx'});
 r.proposedManifestSha256=sha(read(old+'qwen-live-proposed-manifest-v3.json'));r.compiledHashes=emitted;r.status='PASS';
}catch(e){r.reason=e.message;r.code=e.code||e.name;}
write('source-verification.json',r);console.log(JSON.stringify({...r,compiledHashes:undefined}));
