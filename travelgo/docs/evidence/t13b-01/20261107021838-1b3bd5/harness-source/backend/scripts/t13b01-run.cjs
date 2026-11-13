const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const backend = path.resolve(__dirname, '..'), root = path.resolve(backend, '..'), frontend = path.join(root, 'frontend');
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0,14) + '-' + crypto.randomBytes(3).toString('hex');
const evidenceRoot = path.join(root, 'docs/evidence/t13b-01'), out = path.join(evidenceRoot, runId);
fs.mkdirSync(out, { recursive: true });
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).stdout;
const selected = ['R01','R02','R04','R05','A02','A03','A04'];
const scopePath = 'docs/HUGO_T13_B_SCOPE_AND_MATRIX.md';
const approvedHash = '2f26c201d218ffd956bedb20f7f71c81bd8396e0a9829eb6217f5043f7b91f23';
const caseDetails = {
  R01: ['CUSTOMER/PARTNER/SUPER_ADMIN UI login, own dashboard, public area, reload, desktop navigation/mobile open-close menu; DB roles and /me agree'],
  R02: ['UI anonymous/customer admin+partner denied; PARTNER admin denied; SA-only partner denied; localStorage escalation rejected and /me restores role', 'A1 desktop: admin dashboard/approval/moderation, partner dashboard, legacy Place/Tour mutation, Review moderation wrong-role probes', 'A1 desktop: anonymous Review mine/create/update/delete, Favorite GET/POST/DELETE, Consent GET/PUT 401; no mutation'],
  R04: ['A1 desktop once: register spoof role/roles/businessId/userId returns CUSTOMER legacy user; application spoof status/reviewedBy/userId remains own PENDING; no business/member/elevated grant/audit'],
  R05: ['UI customer application → SA approve as prerequisite; old token /me sees DB PARTNER while partner API still403; UI reload then logout/login issues fresh token; own business200'],
  A02: ['UI required validation, invalid email submit400 preserving input, valid submit201, pending reload and API own200', 'A1 desktop: missing field/email/type/latitude91/longitude181 invalid400; duplicate pending409; other user sees no application', 'UI Admin cancel prompt and cancel confirmation produce no decision mutation'],
  A03: ['UI SA approve pending, customer+admin reload; one ACTIVE business, membership both permissions, PARTNER grant actor/time/audit', 'A1 desktop: repeated terminal approval409; two concurrent PATCH approve on separate application yield one200/one409 and exactly one business/grant/audit'],
  A04: ['UI reject and NEEDS_MORE_INFO with reason, customer reload; no business/grant before later approval; admin needs-info→APPROVED; terminal reject repeat409', 'A1 desktop: missing reason for REJECTED and NEEDS_MORE_INFO400 REASON_REQUIRED, invalid status400 INVALID_DECISION; rows unchanged'],
};
async function port(preferred) {
  const bind = value => new Promise((resolve,reject) => { const server=net.createServer(); server.once('error',reject); server.listen(value,'127.0.0.1',()=>{const assigned=server.address().port;server.close(()=>resolve(assigned));}); });
  try { return await bind(preferred); } catch { return await bind(0); }
}
async function command(name, program, args, cwd, env) {
  return new Promise(resolve => {
    const child=spawn(program,args,{cwd,env,windowsHide:true});let stdout='',stderr='';
    child.stdout.on('data',b=>{stdout+=b;if(name==='browser')process.stdout.write(b);}); child.stderr.on('data',b=>{stderr+=b;});
    child.on('error',e=>{stderr+=e.message;});child.on('close',code=>{save(name+'.json',{program,args,cwd,exitCode:code,stdout,stderr});console.log(JSON.stringify({name,exitCode:code}));resolve(code);});
  });
}
async function main() {
  assert.equal(process.argv.length,2,'No grep/extra scope permitted');
  assert.equal(hash(path.join(root,scopePath)), approvedHash, 'Latest approved scope changed: stop before DB writes');
  const scope=fs.readFileSync(path.join(root,scopePath),'utf8');
  const allCore=[...scope.matchAll(/^\| ([RABVFC]\d{2}) CORE.*$/gm)].map(v=>({id:v[1],approvedRow:v[0]}));
  const optional=[...scope.matchAll(/^\| (O\d{2}) OPTIONAL.*$/gm)].map(v=>v[1]);
  assert.equal(allCore.length,43);assert.equal(optional.length,8);
  const manifest={task:'T13-B-01',runId,lockedAt:new Date().toISOString(),approvedScope:scopePath,approvedScopeSha256:approvedHash,totalCore:43,totalOptional:8,totalGaps:9,selectedCore:selected,
    expectedRuntimeInstances:13,apiOnlyOnceProject:'desktop',browserProjects:{desktop:{width:1440,height:900},mobile:{width:390,height:844,isMobile:true,hasTouch:true}},
    cases:allCore.map(v=>({...v,status:'NOT RUN',selected:selected.includes(v.id),channel:v.id==='R04'?'A1':v.id==='R01'?'U2':'U2+A1',expansion:caseDetails[v.id]||[]})),optional:optional.map(id=>({id,status:'NOT RUN'})),
    prohibitions:['No application changes','No seed/demo users','No migration/reset/seed/truncate/volume delete','No GAP-09 business cases','No next batch/push/deploy'],
    fixturePolicy:'Unique canonical fixture emails; register real API/UI; SA-only grant guarded DB setup; partner business/grant via approval; no catalog/Booking/Review/Favorite/Trip fixture',
    resultsPolicy:'Expected frozen. Record FAIL and severity, independent cases continue. 36 unselected CORE and all8 OPTIONAL stay NOT RUN. R04 mobile excluded by channel, not counted as unrun required instance.',
    cleanupPolicy:'Ledger discover by exact preplanned email/user/application/audit IDs; remove recommendation children/events/consent/audit/member/application/role/business/user; full-table fingerprint equal',
    evidencePolicy:'Redacted request-response and browser checkpoint timeline/console, viewport/full screenshots, DB snapshots, error stack; no raw HAR/trace with credentials'};
  save('case-manifest.json',manifest);const manifestHash=hash(path.join(out,'case-manifest.json'));save('manifest-lock.json',{sha256:manifestHash,lockedBeforeBuildPreflightAndFixture:true});
  const harnessPaths=['backend/scripts/t13b01-run.cjs','backend/scripts/t13b01-support.cjs','backend/scripts/t13b01-server.cjs','frontend/playwright.t13b01.config.ts','frontend/e2e/t13b01-rbac-onboarding.spec.ts'];
  const harnessHashes=Object.fromEntries(harnessPaths.map(p=>[p,hash(path.join(root,p))]));save('harness-hashes-before.json',harnessHashes);
  for(const relative of harnessPaths){const target=path.join(out,'harness-source',relative);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,fs.readFileSync(path.join(root,relative)),{flag:'wx'});}
  const beforeSources=JSON.parse(fs.readFileSync(path.join(evidenceRoot,'baseline/working-tree-sha256.json')));
  const checkIntegrity=()=>{
    const changed=Object.keys(beforeSources).filter(p=>!fs.existsSync(path.join(root,p))||hash(path.join(root,p))!==beforeSources[p]);
    const harnessChanged=Object.keys(harnessHashes).filter(p=>hash(path.join(root,p))!==harnessHashes[p]);
    return {baselineFiles:Object.keys(beforeSources).length,changed,harnessChanged,approvedScopeUnchanged:hash(path.join(root,scopePath))===approvedHash,manifestUnchanged:hash(path.join(out,'case-manifest.json'))===manifestHash};
  };
  assert.deepEqual(checkIntegrity().changed,[]);
  const backPort=await port(5314),frontPort=await port(3314);
  const env={...process.env,NODE_ENV:'test',DB_HOST:'127.0.0.1',DB_NAME:'travelgo_ai_m0_test',TEST_DATABASE_NAME:'travelgo_ai_m0_test',DB_SSL:'false',ALLOW_TEST_DB_WRITES:'true',TZ:'Asia/Ho_Chi_Minh',
    T13B01_RUN_ID:runId,T13B01_EVIDENCE:out,T13B01_MANIFEST_SHA256:manifestHash,PLAYWRIGHT_BACKEND_PORT:String(backPort),PLAYWRIGHT_FRONTEND_PORT:String(frontPort),JWT_SECRET:crypto.randomBytes(48).toString('hex'),JWT_EXPIRES_SECONDS:'28800'};
  Object.assign(process.env,env);
  save('environment.json',{runId,head:git('rev-parse','HEAD').trim(),workingTree:git('status','--short'),node:process.version,dateLocal:'2026-11-07',timezone:'Asia/Ho_Chi_Minh',nodeEnv:env.NODE_ENV,dbHost:env.DB_HOST,database:env.DB_NAME,dbSSL:false,writeOptIn:true,backendPort:backPort,frontendPort:frontPort,browser:'msedge Chromium headless; mobile is emulated'});
  fs.writeFileSync(path.join(evidenceRoot,'LATEST.txt'),runId+'\n');console.log(JSON.stringify({runId,out,backPort,frontPort,manifestHash}));
  let support,preflight=false,fingerprintTaken=false,browserExit=null,compareExit=null,error=null;const cleanup=[];
  const fp=(name,mode,...args)=>command(name,process.execPath,['dist/evaluation/t11_db_fingerprint.js',mode,...args],backend,env);
  const before=path.join(out,'fingerprint-before.json'),after=path.join(out,'fingerprint-after.json');
  try {
    for(const [name,cwd] of [['backend-build',backend],['frontend-build',frontend]]) if(await command(name,'cmd.exe',['/d','/s','/c','npm.cmd run build'],cwd,env)!==0)throw new Error(name+' failed');
    support=require('./t13b01-support.cjs');save('preflight.json',await support.schema());preflight=true;
    if(await fp('fingerprint-before-command','snapshot',before)!==0)throw new Error('Fingerprint before failed');fingerprintTaken=true;
    assert.equal(hash(path.join(out,'case-manifest.json')),manifestHash);
    browserExit=await command('browser',process.execPath,['node_modules/@playwright/test/cli.js','test','--config','playwright.t13b01.config.ts'],frontend,env);
  } catch(e) { error=e.message;save('blocking-error.json',{message:e.message,stack:e.stack}); }
  finally {
    if(support&&fingerprintTaken){
      for(const project of ['desktop','mobile'])if(fs.existsSync(path.join(out,project,'ledger.json'))){try{const fixture=new support.Fixtures(out,project);cleanup.push(await fixture.cleanup());}catch(e){cleanup.push({project,result:'FAIL',error:e.message});}}
      save('cleanup-final.json',cleanup);
      if(await fp('fingerprint-after-command','snapshot',after)===0)compareExit=await fp('fingerprint-compare','compare',before,after);
    }
    const integrity=checkIntegrity();save('source-integrity.json',integrity);
    save('run-summary.json',{runId,preflight,fingerprintTaken,browserExit,compareExit,error,cleanup,integrity});
    if(support)await support.sequelize.close();
    if(error||browserExit!==0||compareExit!==0||cleanup.some(v=>v.result!=='PASS')||integrity.changed.length||integrity.harnessChanged.length||!integrity.manifestUnchanged)process.exitCode=1;
  }
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
