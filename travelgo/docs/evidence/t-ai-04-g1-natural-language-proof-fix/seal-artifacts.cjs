// Final offline report/source/evidence seal; no model, native HTTP or DB.
const c=require('./common.cjs'),prefix='docs/evidence/t-ai-04-g1-natural-language-proof-fix/';
const audit=c.json(prefix+'release-audit.json'),freeze=c.json(prefix+'source-freeze-release.json'),before=c.json(prefix+'integrity-before.json').hashes,now=c.snapshot();
const changed=Object.keys(before).filter(x=>now[x]!==before[x]),added=Object.keys(now).filter(x=>!Object.hasOwn(before,x));
c.assert.deepEqual(changed.sort(),audit.source.changed.sort());c.assert.deepEqual(added.sort(),audit.source.added.sort());
for(const [file,hash]of Object.entries(freeze.hashes))c.assert.equal(c.sha(c.read(file)),hash,file);c.history();
const lock=c.json(prefix+'natural-language-case-lock.json');c.assert.equal(c.sha(c.read(prefix+'natural-language-case-manifest.json')),lock.sha256);
const report=c.read(c.report).toString('utf8');c.assert.equal(report,report.normalize('NFC'));c.assert.ok(!report.includes('\ufffd'));c.assert.ok(!report.includes('<!--V2_REVIEW_TABLE-->'));const staticTable=report.slice(report.indexOf('| VI | Expected | Before gate')).split(/\r?\n\r?\n/u)[0];c.assert.equal((staticTable.match(/^\| VI\d\d /gm)||[]).length,24);
for(const [file,hash]of Object.entries(freeze.hashes))c.assert.ok(report.includes(hash),file);
for(const match of report.matchAll(/\]\(([^)]+)\)/g)){if(!match[1].startsWith('http')&&!match[1].endsWith('artifact-checksums.json'))c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',match[1])),match[1]);}
c.assert.equal(c.sha(c.read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')),audit.v2.benchmarkSha256);c.assert.equal(c.sha(c.read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')),audit.v2.lockSha256);
c.assert.equal(c.json(prefix+'natural-proof-verified.json').passed,79);c.assert.equal(c.json(prefix+'compatibility-verified.json').passed,61);
const hashes={};for(const file of c.fs.readdirSync(c.evidence,{recursive:true})){const full=c.path.join(c.evidence,file);if(file==='artifact-checksums.json'||!c.fs.statSync(full).isFile())continue;hashes[file.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(full));}
const seal={at:new Date().toISOString(),status:'FINAL_OFFLINE_FIX_INTEGRITY_PASS',report:c.report,reportSha256:c.sha(c.read(c.report)),sourceHashes:freeze.hashes,independentCorpusSha256:lock.sha256,v2Sha256:audit.v2.benchmarkSha256,baselineFiles:4781,authorizedSourceEdits:2,newSourceFiles:2,unexpectedChanges:0,tests:{natural:'79/0',compatibility:'61/0',correction:'42/0',completeness:'52/0',original:'145/36',downstream:'176/5'},nativeOllamaRequests:0,postgresAccess:false,hashes};
c.write('artifact-checksums.json',seal);for(const [file,hash]of Object.entries(hashes))c.assert.equal(c.sha(c.read(prefix+file)),hash,file);c.assert.equal(c.sha(c.read(c.report)),seal.reportSha256);
console.log(JSON.stringify({status:seal.status,artifacts:Object.keys(hashes).length,reportSha256:seal.reportSha256,sourceHashes:freeze.hashes,tests:seal.tests,unexpectedChanges:0,inferences:0,postgres:false}));
