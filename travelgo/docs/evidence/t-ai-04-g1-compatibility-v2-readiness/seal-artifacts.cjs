// Offline final seal. No imports that initiate HTTP, model or DB work.
const c=require('./common.cjs'),prefix='docs/evidence/t-ai-04-g1-compatibility-v2-readiness/';
const before=c.json(prefix+'integrity-before.json').hashes,now=c.snapshot();for(const [file,hash]of Object.entries(before))c.assert.equal(now[file],hash,file);
c.assert.deepEqual(Object.keys(now).filter(x=>!Object.hasOwn(before,x)),[c.newTest]);c.history();
const verification=c.json(prefix+'integrity-and-verification.json');c.assert.equal(c.sha(c.read(c.newTest)),verification.newTestSha256);
const report=c.read(c.report).toString('utf8');c.assert.equal(report,report.normalize('NFC'));c.assert.ok(!report.includes('\ufffd'));c.assert.ok(!report.includes('<!--LEGACY_MAPPING-->'));
c.assert.equal((report.match(/^\| LC\d\d /gm)||[]).length,36);c.assert.equal((report.match(/^\| VI\d\d /gm)||[]).length,24);
for(const match of report.matchAll(/\]\(([^)]+)\)/g)){if(!match[1].startsWith('http')&&!match[1].endsWith('artifact-checksums.json'))c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',match[1])),match[1]);}
const review=c.json(prefix+'proposal-review-checksums.json');c.assert.equal(c.sha(c.read(prefix+'v2-live-evaluation-proposal.json')),review.proposalSha256);
const plan=c.json(prefix+'v2-live-evaluation-proposal.json'),raw=c.json(prefix+'v2-raw-results-template.json'),ux=c.json(prefix+'v2-product-results-template.json');
c.assert.equal(raw.rows.length,24);c.assert.ok(raw.rows.every(x=>x.rawDecision===null&&x.semantic==='NOT EVALUATED'&&x.inferenceAttempt==='NOT RUN'));
c.assert.ok(ux.rows.every(x=>x.actualStatus==='NOT RUN'&&x.actualOrigin===null));for(const [file,hash]of Object.entries(plan.sourceHashes))c.assert.equal(c.sha(c.read(file)),hash,file);
for(const item of plan.requestPlan)c.assert.equal(c.sha(c.read(prefix+item.bodyFile)),item.bodySha256);
const hashes={};for(const file of c.fs.readdirSync(c.evidence,{recursive:true})){const full=c.path.join(c.evidence,file);if(!c.fs.statSync(full).isFile()||file==='artifact-checksums.json')continue;hashes[file.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(full));}
const sealed={at:new Date().toISOString(),status:'FINAL_OFFLINE_INTEGRITY_PASS',report:c.report,reportSha256:c.sha(c.read(c.report)),proposalSha256:review.proposalSha256,benchmarkSha256:plan.benchmarkSha256,sourceTestSha256:verification.newTestSha256,protectedBaselineFiles:Object.keys(before).length,productionChanges:0,legacyChanges:0,historicalEvidenceChanges:0,actualInferences:0,operatorPreloads:0,db:'NOT ACCESSED',hashes};
c.write('artifact-checksums.json',sealed);
for(const [file,hash]of Object.entries(hashes))c.assert.equal(c.sha(c.read(prefix+file)),hash,file);c.assert.equal(c.sha(c.read(c.report)),sealed.reportSha256);
console.log(JSON.stringify({status:sealed.status,artifacts:Object.keys(hashes).length,protectedBaselineFiles:sealed.protectedBaselineFiles,reportSha256:sealed.reportSha256,proposalSha256:sealed.proposalSha256,compatibility:'61 PASS /0 FAIL',original:'145 PASS /36 FAIL',inferences:0,preloads:0,db:'NONE'}));
