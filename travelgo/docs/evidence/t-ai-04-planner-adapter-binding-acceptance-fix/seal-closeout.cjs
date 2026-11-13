const c=require('./common.cjs');
const gate=c.json(c.prefix+'acceptance-gate.json');c.assert.equal(gate.status,'ADAPTER_BINDING_ACCEPTANCE_PASS_OFFLINE');c.assert.equal(gate.totalChecks,64);
const lock=c.json(c.prefix+'implementation-lock.json');for(const[file,hash]of Object.entries(lock.hashes))c.assert.equal(c.sha(c.read(c.prefix+file)),hash,file);
const audits=c.fs.readdirSync(c.path.join(c.evidence,'network-audit'));c.assert.equal(audits.length,c.json(c.prefix+'network-db-audit.json').processAudits);
for(const file of c.fs.readdirSync(c.evidence))c.assert.ok(!/^(ollama-attempt-|attempt-|fixture-committed-ledger\.json$|fixture-write-intent\.json$|cleanup-write-intent\.json$)/.test(file),'NO_ACTUAL_LIVE_OR_DML_LEDGER:'+file);
c.write('native-post-ledger.json',{at:new Date().toISOString(),status:'OFFLINE_TASK_NO_NATIVE_AUTHORIZATION',ollamaGet:0,loadOnly:0,inference:0,totalPosts:0,attempts:[],retry:0,hiddenWarmup:0,scope:'Shared cap4/3/1 is tested using counters only, not allocated LIVE budget.'});
const history=c.integrity(),bytes=c.read(c.report),text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
const links=[...text.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]).filter(x=>!/^https?:/.test(x));for(const link of links)if(!link.endsWith('/artifact-checksums.json'))c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
c.write('report-validation.json',{at:new Date().toISOString(),status:'PASS',classification:gate.status,reportSha256:c.sha(bytes),relativeLinks:links.length,historical:history,checks:64,actualDb:0,actualNative:0,liveExecuted:false});
const hashes={};for(const name of c.fs.readdirSync(c.evidence,{recursive:true})){const file=c.path.join(c.evidence,name);if(c.fs.statSync(file).isFile()&&name!=='artifact-checksums.json')hashes[name.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(file));}
c.write('artifact-checksums.json',{at:new Date().toISOString(),report:c.report,reportSha256:c.sha(bytes),hashes,classification:gate.status,scope:'All current task files except this checksum file. Historical files untouched; lifecycle-01 initial failures retained.'});
for(const[file,hash]of Object.entries(hashes))c.assert.equal(c.sha(c.fs.readFileSync(c.path.join(c.evidence,file))),hash,file);for(const link of links)c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
console.log(JSON.stringify({status:'SEALED',classification:gate.status,files:Object.keys(hashes).length,reportSha256:c.sha(bytes),links:links.length,historical:history}));
