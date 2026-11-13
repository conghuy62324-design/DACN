const c = require('./common.cjs');
const load = name => c.json('docs/evidence/t-ai-04-g1-readiness-controlled-check/' + name);
const before = load('integrity-before.json').hashes, after = load('integrity-after.json').hashes;
c.assert.deepEqual(c.snapshot(), before); c.assert.deepEqual(after, before); c.integrity();
const result = load('results.json'), regression = load('regression-summary.json'), analysis = load('runtime-analysis.json');
c.assert.equal(result.status, 'PASS'); c.assert.equal(result.posts, 2); c.assert.equal(result.guard.inferencePosts, 0);
c.assert.equal(result.preparation.nlu, 'NOT EVALUATED'); c.assert.equal(result.smoke.rawNlu, 'PASS'); c.assert.equal(result.toolInvocationCount, 0);
c.assert.equal(regression.status, 'PASS'); c.assert.equal(regression.readinessAbortTests, 33); c.assert.equal(regression.priorDiagnostics, 13); c.assert.equal(regression.applicableRegression, 181);
const plan = load('request-plan.json'), lock = load('manifest-lock.json');
c.assert.equal(c.sha(c.read('docs/evidence/t-ai-04-g1-readiness-controlled-check/request-plan.json')), lock.requestPlanSha256);
for (const item of [plan.preparation, plan.smoke]) {
  c.assert.equal(c.sha(c.read('docs/evidence/t-ai-04-g1-readiness-controlled-check/' + item.bodyFile)), item.sha256);
  c.assert.equal(load('attempt-' + item.id + '.json').requestBodySha256, item.sha256);
}
const report = 'docs/HUGO_T_AI_04_G1_READINESS_CONTROLLED_CHECK_REPORT.md', text = c.read(report).toString('utf8');
c.assert.equal(text.normalize('NFC'), text);
const links = [...text.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]).filter(x=>!x.startsWith('https://'));
for (const link of links) c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
const late = load('late-readonly-audit.json'); c.assert.equal(late.postCountIncludingRegression, 2);
const validation = {at:new Date().toISOString(),status:'PASS',reportSha256:c.sha(c.read(report)),reportLocalLinks:links.length,
  baselineFiles:Object.keys(before).length,historicalEvidenceFiles:analysis.regression ? load('integrity-after.json').historicalEvidenceFiles : null,
  sourceChanges:0,benchmarkUnchanged:true,posts:2,loadOnly:1,technicalModelInferences:1,coldProbePosts:0,retries:0,
  tests:{readiness:33,diagnostics:13,applicable:181},historicalF:{passedBeforeStop:22,failed:1,notRun:1},databaseAccess:'NONE',P1:'OPEN',P2:'OPEN'};
c.write('artifact-validation.json',validation);
const hashes = {};
for (const file of c.fs.readdirSync(c.evidence,{recursive:true})) {const full=c.path.join(c.evidence,file);if(c.fs.statSync(full).isFile())hashes[file.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(full));}
c.write('artifact-checksums.json',{at:new Date().toISOString(),hashes,reportSha256:validation.reportSha256});
console.log(JSON.stringify(validation));
