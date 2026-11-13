// Read-only verification and artifact aggregation after an already completed run.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'docs/evidence/t13b-01-fix');
const runId=process.argv[2];assert.match(runId||'',/^\d{14}-[a-f0-9]{6}$/);
const out=path.join(base,runId);const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(name,value)=>fs.writeFileSync(path.join(out,name),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
Object.assign(process.env,{NODE_ENV:'test',DB_HOST:'127.0.0.1',DB_NAME:'travelgo_ai_m0_test',TEST_DATABASE_NAME:'travelgo_ai_m0_test',DB_SSL:'false',ALLOW_TEST_DB_WRITES:'true'});
const support=require('./t13b01-support.cjs');
(async()=>{
  try {
    const run=read(path.join(out,'run-summary.json'));assert.equal(run.compareExit,0);assert.ok(run.cleanup.every(v=>v.result==='PASS'));
    const postflight=await support.schema(),preflight=read(path.join(out,'preflight.json'));assert.deepEqual(postflight,preflight);save('postflight-schema.json',{runId,same:true,postflight});
    const baseline=read(path.join(base,'baseline/working-tree-sha256.json'));
    const changed=Object.keys(baseline).filter(p=>!fs.existsSync(path.join(root,p))||hash(path.join(root,p))!==baseline[p]);assert.deepEqual(changed.slice().sort(),['frontend/e2e/t13b01-rbac-onboarding.spec.ts','frontend/src/pages/BecomePartnerPage.tsx']);
    const oldFix=read(path.join(root,'docs/evidence/t13a-fix/20261106043724-bddc1d/source-hashes-after.json'));
    const fixChanged=Object.keys(oldFix).filter(p=>hash(path.join(root,p))!==oldFix[p]);assert.deepEqual(fixChanged,['frontend/src/pages/BecomePartnerPage.tsx']);
    const manifest=read(path.join(out,'case-manifest.json')),lock=read(path.join(out,'manifest-lock.json'));assert.equal(hash(path.join(out,'case-manifest.json')),lock.sha256);
    const applicationBefore=read(path.join(out,'application-hashes-before.json')),applicationAfter=read(path.join(out,'application-hashes-after.json'));assert.deepEqual(applicationBefore,applicationAfter);
    const gate=read(path.join(base,'FOCUSED_PASS.json'));const focusedDir=path.join(base,gate.runId);const focusedRun=read(path.join(focusedDir,'run-summary.json'));
    assert.equal(focusedRun.browserExit,0);assert.equal(focusedRun.compareExit,0);assert.deepEqual(applicationBefore,gate.applicationHashes);
    const focusedCases=['desktop','mobile'].map(project=>read(path.join(focusedDir,project,'A04-results.json')));assert.ok(focusedCases.every(v=>v.status==='PASS'));
    assert.deepEqual(read(path.join(out,'harness-hashes-before.json')),read(path.join(focusedDir,'harness-hashes-before.json')),'Focused/full harness source must match');
    const focusedResidual={};
    for(const project of ['desktop','mobile']){
      const ledger=read(path.join(focusedDir,project,'ledger.json'));assert.equal(ledger.cleanup,'PASS');focusedResidual[project]={};
      for(const [table,ids] of Object.entries(ledger.cleanupIds)){
        const model=Object.values(support.models).find(v=>v?.tableName===table);assert.ok(model,table);
        focusedResidual[project][table]=await model.count({where:{[model.primaryKeyAttribute]:ids}});assert.equal(focusedResidual[project][table],0);
      }
    }
    assert.deepEqual(run.integrity.unexpectedChanged,[]);assert.deepEqual(run.integrity.runtimeChanged,[]);assert.deepEqual(run.integrity.harnessChanged,[]);
    const snapshots=[];
    for(const name of fs.readdirSync(base).filter(v=>/^\d{14}-/.test(v)).sort())for(const file of ['fingerprint-before.json','fingerprint-after.json'])if(fs.existsSync(path.join(base,name,file)))snapshots.push({runId:name,file,value:read(path.join(base,name,file))});
    assert.ok(snapshots.length>=2);for(const snapshot of snapshots)assert.deepEqual(snapshot.value,snapshots[0].value);
    const remaining={},caseResults=[],projects={};
    for(const project of ['desktop','mobile']){
      const dir=path.join(out,project),ledger=read(path.join(dir,'ledger.json'));remaining[project]={};assert.equal(ledger.cleanup,'PASS');
      for(const [table,ids] of Object.entries(ledger.cleanupIds)){
        const model=Object.values(support.models).find(v=>v?.tableName===table);assert.ok(model,table);
        const count=await model.count({where:{[model.primaryKeyAttribute]:ids}});remaining[project][table]=count;assert.equal(count,0,`${project} residual ${table}`);
      }
      assert.equal(await support.models.User.count({where:{email:ledger.emails}}),0);
      const results=fs.readdirSync(dir).filter(v=>v.endsWith('-results.json')).map(file=>read(path.join(dir,file)));
      caseResults.push(...results);projects[project]={users:ledger.users.length,applications:ledger.applications.length,businesses:ledger.businesses.length,
        statuses:results.map(v=>({id:v.id,status:v.status})),layoutChecks:results.reduce((n,v)=>n+v.checkpoints.filter(c=>c.id.startsWith('LAYOUT_')).length,0),
        failedLayoutChecks:results.flatMap(v=>v.checkpoints.filter(c=>c.id.startsWith('LAYOUT_')&&c.status!=='PASS').map(c=>({case:v.id,...c}))),
        pageErrors:results.flatMap(v=>v.console.filter(c=>c.type==='pageerror')),screenshots:results.reduce((n,v)=>n+v.images.length,0)};
    }
    const matrix=manifest.cases.map(v=>{
      const instances=caseResults.filter(c=>c.id===v.id);assert.equal(instances.length,v.selected?(v.id==='R04'?1:2):0,v.id+' instance count');
      return {id:v.id,channel:v.channel,selected:v.selected,status:!v.selected?'NOT RUN':instances.some(c=>c.status==='FAIL')?'FAIL':instances.every(c=>c.status==='PASS')?'PASS':'NOT RUN',
        approvedRow:v.approvedRow,instances:instances.map(c=>({project:c.project,status:c.status,evidence:`${runId}/${c.project}/${c.id}-results.json`}))};
    });
    save('acceptance_matrix.json',{baseline:manifest.approvedScope,baselineSha256:manifest.approvedScopeSha256,runId,core:matrix,optional:manifest.optional});
    fs.writeFileSync(path.join(out,'acceptance_matrix.csv'),'id,classification,channel,status\n'+matrix.map(v=>`${v.id},CORE,${v.channel},${v.status}`).join('\n')+'\n'+manifest.optional.map(v=>`${v.id},OPTIONAL,,NOT RUN`).join('\n')+'\n',{flag:'wx'});
    const totals=Object.fromEntries(['PASS','FAIL','NOT RUN'].map(status=>[status,matrix.filter(v=>v.status===status).length]));
    const summary={runId,mode:run.mode,applicationFiles:Object.keys(applicationBefore).length,manifestSha256:lock.sha256,baselineFiles:Object.keys(baseline).length,baselineChanged:changed,oldFixEntries:Object.keys(oldFix).length,oldFixChanged:fixChanged,
      focused:{runId:gate.runId,pass:focusedCases.length,total:2,sameApplicationSource:true,sameHarnessSource:true,residualByExactCleanupId:focusedResidual},
      baselineEvidenceFiles:{t13b01:Object.keys(baseline).filter(p=>p.startsWith('docs/evidence/t13b-01/')).length,t13a:Object.keys(baseline).filter(p=>p.startsWith('docs/evidence/t13a/')).length,t13aFix:Object.keys(baseline).filter(p=>p.startsWith('docs/evidence/t13a-fix/')).length},
      core:totals,optional:{'NOT RUN':8},runtimeInstances:{executed:caseResults.length,pass:caseResults.filter(v=>v.status==='PASS').length,fail:caseResults.filter(v=>v.status==='FAIL').length,channelExcludedMobileR04:run.mode==='full'?1:0},
      migrations:postflight.migrations.length,fingerprint:{tables:Object.keys(snapshots[0].value.tables).length,snapshots:snapshots.map(({runId,file})=>({runId,file})),allEqual:true},
      projects,residualByExactCleanupId:remaining,sourceIntegrity:run.integrity,commands:{browserExit:run.browserExit,compareExit:run.compareExit}};
    save('verification_summary.json',summary);console.log(JSON.stringify(summary,null,2));
  }finally{await support.sequelize.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
