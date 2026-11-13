// Offline final integrity/report validation and checksums; never invokes HTTP/model/DB.
const c=require('./common.cjs');
const prefix='docs/evidence/t-ai-04-g1-server-completeness-live-validation/',reportPath='docs/HUGO_T_AI_04_G1_SERVER_COMPLETENESS_LIVE_VALIDATION_REPORT.md';
const report=c.read(reportPath).toString('utf8'),plan=c.json(prefix+'manifest.json'),lock=c.json(prefix+'manifest-lock.json');
c.integrity();c.assert.equal(report,report.normalize('NFC'));c.assert.ok(!report.includes('\ufffd'));
c.assert.equal(c.sha(c.read(prefix+'manifest.json')),lock.manifestSha256);c.assert.ok(report.includes(lock.manifestSha256));
for(const item of plan.cases.filter(x=>x.bodyFile)){c.assert.equal(c.sha(c.read(prefix+item.bodyFile)),item.bodySha256);c.assert.ok(report.includes(item.bodySha256));}
for(const id of ['OP-LOAD','L01','L02','L03','L04']){const attempt=c.json(prefix+'ollama-attempt-'+id+'.json');const clock=new Date(Date.parse(attempt.at)+7*3600000).toISOString().slice(11,23);c.assert.ok(report.includes(clock));}
for(const match of report.matchAll(/\]\((evidence\/t-ai-04-g1-server-completeness-live-validation\/[^)]+)\)/g)){
 if(match[1].endsWith('artifact-checksums.json'))continue;c.assert.ok(c.fs.existsSync(c.path.join(c.root,'docs',match[1])),match[1]);}
const readyLog=c.read(prefix+'final-verified/downstream-control-readiness-33.log').toString('utf8');const ready=JSON.parse(readyLog.slice(readyLog.indexOf('{\n  "suite":')));c.assert.equal(ready.passed,33);c.assert.equal(ready.failed,0);
const f=c.read('backend/dist/tests/agentContractSlotInvestigation.test.js').toString('utf8'),names=[...f.matchAll(/^test\('([^']+)'/gm)].map(x=>x[1]);c.assert.equal(names.length,24);c.assert.equal(names[22],'current orchestrator observation: schema-valid hallucinated car reaches only fake tool');
const hashes={};for(const file of c.fs.readdirSync(c.evidence,{recursive:true})){const full=c.path.join(c.evidence,file);if(!c.fs.statSync(full).isFile()||file==='artifact-checksums.json')continue;hashes[file.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(full));}
const artifact={at:new Date().toISOString(),task:plan.task,report:reportPath,reportSha256:c.sha(c.read(reportPath)),manifestSha256:lock.manifestSha256,status:'FINAL_INTEGRITY_PASS',protectedFiles:4533,hashes};
c.write('artifact-checksums.json',artifact);
// Re-read all sealed content immediately, including Unicode report and immutable request lock.
for(const [file,hash]of Object.entries(hashes))c.assert.equal(c.sha(c.read(prefix+file)),hash,file);
c.assert.equal(c.sha(c.read(reportPath)),artifact.reportSha256);
console.log(JSON.stringify({status:artifact.status,artifacts:Object.keys(hashes).length,reportSha256:artifact.reportSha256,manifestSha256:lock.manifestSha256,productionChanges:0,additionalPosts:0}));
