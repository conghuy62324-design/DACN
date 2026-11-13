const c=require('./common.cjs');
const verify=process.argv.includes('--verify');
function sources(){c.history();c.assert.deepEqual(c.snapshot(),c.json(c.prefix+'integrity-after.json').hashes);for(const[file,hash]of Object.entries(c.json(c.prefix+'source-hashes.json').sourceHashes))c.assert.equal(c.sha(c.read(file)),hash,file);}
sources();
if(!verify){
  const compiled=c.json('docs/evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/manifest-lock.json').compiled;
  for(const[file,hash]of Object.entries(compiled))c.assert.equal(c.sha(c.read(file)),hash,file);
  c.write('compiled-integrity.json',{at:new Date().toISOString(),status:'PASS',unchangedModules:Object.keys(compiled).length,baseline:'docs/evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/manifest-lock.json',hashes:compiled,sourceChanged:false});
  const text=c.read(c.report).toString('utf8'),missing=[];
  for(const match of text.matchAll(/\]\(([^)]+)\)/g)){const target=match[1];if(target.startsWith('http')||target.startsWith('#'))continue;const file=c.path.resolve(c.path.join(c.root,'docs'),target);if(!c.fs.existsSync(file)&&!target.endsWith('/artifact-checksums.json'))missing.push(target);}
  c.assert.deepEqual(missing,[]);c.assert.ok(text.includes('FRONTEND_DEMO_ACCEPTANCE_PASS — MOCK_ONLY_BROWSER'));c.assert.ok(text.includes('145 PASS / 36 FAIL'));
  c.write('report-validation.json',{at:new Date().toISOString(),status:'PASS',missingLinks:missing,frontendUnit:{g1:c.json(c.prefix+'frontend-g1-final.json').passed,g2:c.json(c.prefix+'frontend-g2-final.json').passed},browser:c.json(c.prefix+'browser-summary.json').passed,backendRequired:{G2:68,natural:79,compatibility:61,correction:42,completeness:52},productionNluAccepted:false,nativeInference:0,postgres:0,openBugs:['TAI03B-B1-01 P1','Runtime P2','Budget grammar P2','Map P2']});
  const hashes={};for(const rel of c.fs.readdirSync(c.evidence,{recursive:true})){const full=c.path.join(c.evidence,rel);if(c.fs.statSync(full).isFile()&&rel!=='artifact-checksums.json')hashes[rel.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(full));}
  c.write('artifact-checksums.json',{at:new Date().toISOString(),status:'FINAL_INTEGRITY_PASS',acceptance:'FRONTEND_DEMO_ACCEPTANCE_PASS_MOCK_ONLY_BROWSER',report:c.report,reportSha256:c.sha(c.read(c.report)),sourceHashes:c.json(c.prefix+'source-hashes.json').sourceHashes,hashes,liveNlu:'NOT RUN',postgres:false,productionNluAccepted:false});
}
const seal=c.json(c.prefix+'artifact-checksums.json');c.assert.equal(c.sha(c.read(seal.report)),seal.reportSha256);for(const[file,hash]of Object.entries(seal.hashes))c.assert.equal(c.sha(c.read(c.prefix+file)),hash,file);
console.log(JSON.stringify({status:'PASS',reportSha256:seal.reportSha256,sealedArtifacts:Object.keys(seal.hashes).length,compiled:c.json(c.prefix+'compiled-integrity.json').unchangedModules,sourceIntegrity:'PASS',acceptance:seal.acceptance,liveInference:0,postgres:0}));
