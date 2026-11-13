const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..');
let source=fs.readFileSync(path.join(root,'docs/evidence/t-ai-04-g1-readiness-controlled-check/common.cjs'),'utf8')
 .replaceAll('t-ai-04-g1-readiness-controlled-check','t-ai-04-g1-server-completeness-live-validation')
 .replaceAll('HUGO_T_AI_04_G1_READINESS_CONTROLLED_CHECK_REPORT','HUGO_T_AI_04_G1_SERVER_COMPLETENESS_LIVE_VALIDATION_REPORT');
const from=source.indexOf('function integrity() {'),until=source.indexOf('function rate(');assert.ok(from>0&&until>from);
source=source.slice(0,from)+`function integrity() {
 const prior=json('docs/evidence/t-ai-04-g1-execution-provenance-correction-fix/integrity-after-final.json').hashes;
 for(const [file,hash]of Object.entries(prior))assert.equal(sha(read(file)),hash,file);
 const previous=json('docs/evidence/t-ai-04-g1-execution-provenance-correction-fix/artifact-checksums.json');
 for(const [file,hash]of Object.entries(previous.hashes))assert.equal(sha(read('docs/evidence/t-ai-04-g1-execution-provenance-correction-fix/'+file)),hash,file);
 assert.equal(sha(read('docs/HUGO_T_AI_04_G1_EXECUTION_PROVENANCE_CORRECTION_FIX_REPORT.md')),previous.reportSha256);
 assert.equal(sha(read('backend/src/agent/toolProvenance.ts')),'95fb900e1471d8b18a7f869dea842fae97f19e3e7e9c128ff24d5e86177591a7');
 assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')),'0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
 assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')),'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
 if(fs.existsSync(path.join(evidence,'integrity-before.json')))assert.deepEqual(snapshot(),json('docs/evidence/t-ai-04-g1-server-completeness-live-validation/integrity-before.json').hashes);
 return {status:'PASS',priorBaselineFiles:Object.keys(prior).length,correctionArtifacts:Object.keys(previous.hashes).length};
}
`+source.slice(until);
fs.writeFileSync(path.join(__dirname,'common.cjs'),source,{flag:'wx'});
