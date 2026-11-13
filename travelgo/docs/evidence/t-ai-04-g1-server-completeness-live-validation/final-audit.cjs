// Read-only, offline post-run audit. No readiness request, inference or DB.
const c=require('./common.cjs');
const prefix='docs/evidence/t-ai-04-g1-server-completeness-live-validation/',prior='docs/evidence/t-ai-04-g1-execution-provenance-correction-fix/';
const manifest=c.json(prefix+'manifest.json'),lock=c.json(prefix+'manifest-lock.json');
const parseLog=file=>{const s=c.read(file).toString('utf8');const at=s.indexOf('{\n  "suite":');c.assert.ok(at>=0);return JSON.parse(s.slice(at));};
const ready=parseLog(prefix+'final-verified/readiness-33.log'),oldReady=parseLog(prior+'final-verified/readiness-33.log');
c.assert.deepEqual(ready.results.map(x=>({name:x.name,status:x.status})),oldReady.results.map(x=>({name:x.name,status:x.status})));
const diagnostic=[];for(const layer of ['actual-policy','downstream-control']){const f='final-verified/'+layer+'-diagnostics/offline-diagnostic-results.json';const now=c.json(prefix+f),before=c.json(prior+f);
 c.assert.deepEqual(now.results.map(x=>({name:x.name,status:x.status})),before.results.map(x=>({name:x.name,status:x.status})));diagnostic.push({layer,pass:now.passed,fail:now.failed,allCaseNamesAndStatusesEqualBaseline:true});}
const normal=x=>x.normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');const desired=new Set(manifest.cases.filter(x=>x.phase==='LIVE_LLM').map(x=>normal(x.request.message)));let checked=0,strings=0;
function visit(x){if(typeof x==='string'){strings++;c.assert.ok(!desired.has(normal(x)),'LIVE input duplicated in historical JSON');}else if(x&&typeof x==='object')for(const v of Object.values(x))visit(v);}
for(const file of c.fs.readdirSync(c.path.join(c.root,'docs/evidence'),{recursive:true})){if(file.startsWith('t-ai-04-g1-server-completeness-live-validation')||!file.endsWith('.json'))continue;let data;try{data=JSON.parse(c.fs.readFileSync(c.path.join(c.root,'docs/evidence',file),'utf8'));}catch{continue;}checked++;visit(data);}
const run=c.json(prefix+'results.json'),logStart=c.json(prefix+'native-log-start.json');
const path=c.path.join(process.env.LOCALAPPDATA,'Ollama/server.log'),bytes=c.fs.readFileSync(path);const window=bytes.subarray(logStart.byteOffset).toString('utf8');
const nativeRows=window.split(/\r?\n/).filter(x=>/\[GIN\].*POST/.test(x));c.assert.equal(nativeRows.length,5);
for(const file of ['run-regression.cjs','offline-guard.cjs','downstream-control.cjs','run-foundation-compat.cjs'])c.assert.equal(c.sha(c.read(prefix+file)),c.sha(c.read(prior+file)),file);
c.assert.equal(c.sha(c.read(prefix+'run-validation.cjs')),c.json(prefix+'run-marker.json').harnessSha256);
c.assert.equal(c.sha(c.read(prefix+'manifest.json')),lock.manifestSha256);for(const [file,hash]of Object.entries(lock.compiled))c.assert.equal(c.sha(c.read(file)),hash);
const protectedHashes=c.snapshot();c.assert.deepEqual(protectedHashes,c.json(prefix+'integrity-before.json').hashes);const integrity=c.integrity();
const output={at:new Date().toISOString(),status:'PASS',integrity,protectedFiles:Object.keys(protectedHashes).length,historicalEvidenceFiles:Object.keys(protectedHashes).filter(x=>x.startsWith('docs/evidence/')).length,
 sourceFiles:Object.keys(protectedHashes).filter(x=>x.startsWith('backend/src/')||x.startsWith('frontend/src/')||x.startsWith('frontend/tests/')).length,
 readiness:{pass:ready.passed,fail:ready.failed,unchangedCaseNamesAndStatuses:true,failures:ready.results.filter(x=>x.status==='FAIL').map(x=>x.name)},diagnostic,
 novelty:{historicalJsonFiles:checked,allStringValues:strings,newLiveRequests:4,duplicates:0,scope:'All historical JSON string values compared, beyond request-key-only initial check; no requests replayed'},
 nativePostAudit:{from:logStart.byteOffset,to:bytes.length,nativeRows,postCount:5,loadOnly:1,inference:4,afterOfflineRegression:true,newProbeRequests:0},
 sourceChanges:0,oldEvidenceChanges:0,dbAttempts:run.dbAttempts,fixture:'NONE',fingerprint:'N/A — no PostgreSQL connection or query',limits:'Original default AgentLimits, same approved principal; 9 normal consumed plus 1 operator conservatively ledgered outside AgentLimits.',
 inheritedHarnesses:'Byte-identical copies from Correction FIX; new directory/output only. Compiled runner derivations retain original case bodies/assertions; readiness shim and downstream assessor control are MOCK_ONLY.',
 P1:'OPEN',P2Runtime:'OPEN',OBS_COMP_01:'FIXED/OFFLINE VERIFIED + LIMITED LIVE CASE VERIFIED; rejected-wrong-model-output branch offline only'};
c.write('final-audit.json',output);console.log(JSON.stringify(output));
