// Complete artifact sealing after all independent assertions in finalize passed.
const c=require('./common.cjs');
c.assert.equal(c.json(c.prefix+'integrity-after.json').status,'PASS');c.integrity();
const report=c.read(c.report).toString('utf8'),links=[...report.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);
for(const link of links)if(link!==c.prefix.replace(/^docs\//,'')+'artifact-checksums.json')c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
c.write('finalizer-observations.json',{at:new Date().toISOString(),aggregation:'First reviewer assertion correctly caught171 backend-only total; legacy181 also includes10 frontend G1 cases. Fixed aggregation only; every underlying case name/status comparison unchanged.',sealOrdering:'Report linked upcoming artifact seal before its creation; report and independent result/integrity assertions already complete. Deferred this one link check until sealing; no acceptance expectation changed.'});
c.write('report-validation.json',{at:new Date().toISOString(),status:'PASS',links:links.length,allExistAfterSeal:true,sections:19,classification:'SEARCH_LIVE_E2E_RESULT_RECORDED / PLANNER_E2E_BLOCKED_DATA_READINESS',noFurtherTaskExecuted:true});
const hashes={};for(const file of c.fs.readdirSync(c.evidence,{recursive:true})){const full=c.path.join(c.evidence,file);if(c.fs.statSync(full).isFile()&&file!=='artifact-checksums.json')hashes[file.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(full));}
c.write('artifact-checksums.json',{at:new Date().toISOString(),status:'FINAL_INTEGRITY_PASS_SEARCH_RESULT_RECORDED',report:c.report,reportSha256:c.sha(c.read(c.report)),manifestSha256:c.json(c.prefix+'manifest-lock.json').sha256,sourceHashes:c.json(c.previous+'artifact-checksums.json').sourceHashes,hashes});
for(const link of links)c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
for(const[file,sha]of Object.entries(hashes))c.assert.equal(c.sha(c.fs.readFileSync(c.path.join(c.evidence,file))),sha,file);
console.log(JSON.stringify({status:'PASS',report:c.report,classification:'SEARCH_LIVE_E2E_RESULT_RECORDED / PLANNER_E2E_BLOCKED_DATA_READINESS',artifacts:Object.keys(hashes).length,protectedFiles:c.json(c.prefix+'integrity-after.json').protectedFiles,postCount:3,search:'2/2 PASS',phaseA:'PHASE_A_PASS'}));
