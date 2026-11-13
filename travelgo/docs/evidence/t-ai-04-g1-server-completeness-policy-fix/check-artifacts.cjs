const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),read=file=>fs.readFileSync(path.join(root,file)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const json=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name))),write=(name,data)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(data,null,2)+'\n',{flag:'wx'});
const after=json('integrity-after-final.json');for(const[file,hash]of Object.entries(after.hashes))assert.equal(sha(read(file)),hash,file);
assert.deepEqual(after.unexpected,[]);assert.equal(after.systemLiteralUnchanged,true);assert.equal(after.executionGateBodyUnchanged,true);
const review=json('final-verified/compatibility-review.json');assert.equal(review.approvedNewPolicyTests.pass,52);assert.equal(review.unexpectedRegressions,0);
assert.deepEqual(review.actualPolicyTotals.baseline,{pass:150,fail:31,notRun:0,passedCasesWithServerShortCircuit:3});
assert.equal(review.conflicts.length,31);assert.equal(review.diagnosticConflicts.length,5);assert.equal(review.readinessConflict.length,1);
const source=json('final-verified/source-hashes.json');for(const item of source.changed)assert.equal(sha(read(item.file)),item.after);
for(const item of source.protectedFiles)assert.equal(sha(read(item.file)),item.sha256);assert.deepEqual(source.historicalEvidenceChanged,[]);
assert.equal(sha(fs.readFileSync(path.join(__dirname,'final-verified/source-diff.patch'))),source.sourceDiffSha256);
for(const item of source.benchmark)assert.equal(sha(read(item.file)),item.sha256);
const approval=json('final-verified/task-approval.json');assert.equal(new Set(approval.sources.map(x=>x.sha256)).size,1);
for(const item of approval.sources)assert.equal(sha(fs.readFileSync(item.file)),item.sha256);
const report='docs/HUGO_T_AI_04_G1_SERVER_COMPLETENESS_POLICY_FIX_REPORT.md',body=read(report).toString('utf8');assert.equal(body.normalize('NFC'),body);
const links=[...body.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);for(const link of links)assert.ok(fs.existsSync(path.resolve(root,'docs',link)),link);
const counter=fs.readFileSync(path.join(__dirname,'correction-before-fix.log'));
const counterText=(counter[0]===255&&counter[1]===254?counter.toString('utf16le'):counter.toString('utf8')).replace(/^\uFEFF/,'');
assert.match(counterText,/"passed"\s*:\s*50/);assert.match(counterText,/"failed"\s*:\s*2/);
fs.writeFileSync(path.join(__dirname,'correction-before-fix.utf8.log'),counterText,{flag:'wx'});
assert.equal(json('legacy-correction-observation.json').status,'CONFIRMED_PREEXISTING');
const result={at:new Date().toISOString(),status:'PASS',reportSha256:sha(read(report)),links:links.length,baselineFiles:after.baselineFiles,unchanged:after.unchanged,
 historicalEvidenceFiles:after.historicalEvidenceFiles,sourceChanges:after.changes,addedSource:after.added,acceptanceTests:{pass:52,fail:0},
 actualPolicy:review.actualPolicyTotals,downstreamIsolation:review.layerIsolationTotals,originalAssertionsChanged:0,livePosts:0,databaseAccess:'NONE',P1:'OPEN',P2:'OPEN',legacyCorrectionObservation:'P2 OPEN'};
write('artifact-validation.json',result);const hashes={};for(const file of fs.readdirSync(__dirname,{recursive:true})){const full=path.join(__dirname,file);if(fs.statSync(full).isFile())hashes[file.replaceAll('\\','/')]=sha(fs.readFileSync(full));}
write('artifact-checksums.json',{at:new Date().toISOString(),hashes,reportSha256:result.reportSha256});
console.log(JSON.stringify(result));
