const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../../..'),read=file=>fs.readFileSync(path.join(root,file)),sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const load=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name))),write=(name,value)=>fs.writeFileSync(path.join(__dirname,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const after=load('integrity-after-final.json');for(const[file,hash]of Object.entries(after.hashes))assert.equal(sha(read(file)),hash,file);
assert.deepEqual(after.changes,['backend/src/agent/toolProvenance.ts']);assert.deepEqual(after.added,['backend/src/tests/agentExecutionCorrection.test.ts']);
const review=load('final-review/compatibility-review.json'),source=load('final-review/source-hashes.json'),proof=load('proof-before-after.json');
assert.equal(review.acceptance.newCorrection,42);assert.equal(review.acceptance.serverCompleteness,52);assert.equal(review.unexpectedFailureCount,0);
assert.deepEqual(review.actualPolicy.original181,{pass:145,fail:36,notRun:0});assert.deepEqual(review.downstreamOriginal.original181,{pass:176,fail:5,notRun:0});
assert.equal(review.legacyPrecheckConflicts.length,31);assert.equal(review.singleIntentConflicts.length,5);
assert.equal(proof.rows[0].before.status,'ALLOW');assert.notEqual(proof.rows[0].after.status,'ALLOW');assert.ok(proof.rows.every(x=>x.rawDecisionUnchanged));
assert.equal(load('final-source-check.json').emittedCodeWithoutCommentsIdentical,true);
for(const item of source.changed)assert.equal(sha(read(item.file)),item.after);
for(const item of source.protected)assert.equal(sha(read(item.file)),item.sha256);
for(const item of source.benchmark)assert.equal(sha(read(item.file)),item.sha256);
assert.deepEqual(source.historicalChanges,[]);assert.equal(sha(fs.readFileSync(path.join(__dirname,'final-review/source-diff.patch'))),source.diffSha256);
const fixture=load('foundation-fixture-diff.json');assert.equal(fixture.assertionsChanged,0);assert.equal(fixture.caseBodiesChanged,0);assert.equal(fixture.assessorStub,false);assert.equal(fixture.productionGateStub,false);
const report='docs/HUGO_T_AI_04_G1_EXECUTION_PROVENANCE_CORRECTION_FIX_REPORT.md',text=read(report).toString('utf8');assert.equal(text.normalize('NFC'),text);
const links=[...text.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);for(const link of links)assert.ok(fs.existsSync(path.resolve(root,'docs',link)),link);
const approval='C:/Users/Danh/.codex/attachments/b349fd38-8310-43fb-8172-0644d8e1a89b/Pasted text.txt';
write('task-approval.json',{source:approval,sha256:sha(fs.readFileSync(approval)),scope:'Controlled execution provenance FIX/offline tests only',inferencePostsApproved:0,databaseAccessApproved:false});
const result={at:new Date().toISOString(),status:'PASS_WITH_EXPLICIT_COMPATIBILITY',reportSha256:sha(read(report)),reportLinks:links.length,
 baselineFiles:after.baselineFiles,unchanged:after.unchanged,historicalEvidenceFiles:after.historicalEvidenceFiles,productionChanged:after.changes,addedSource:after.added,
 tests:review.acceptance,actualPolicy:review.actualPolicy,downstream:review.downstreamOriginal,foundationCompatible:review.additionalFixtureControl,
 assertionsChanged:0,livePosts:0,databaseAccess:'NONE',OBS_COMP_01:'OFFLINE_VERIFIED_LIVE_NOT_RUN',P1:'OPEN',P2:'OPEN'};
write('artifact-validation.json',result);
const hashes={};for(const file of fs.readdirSync(__dirname,{recursive:true})){const full=path.join(__dirname,file);if(fs.statSync(full).isFile())hashes[file.replaceAll('\\','/')]=sha(fs.readFileSync(full));}
write('artifact-checksums.json',{at:new Date().toISOString(),hashes,reportSha256:result.reportSha256});console.log(JSON.stringify(result));
