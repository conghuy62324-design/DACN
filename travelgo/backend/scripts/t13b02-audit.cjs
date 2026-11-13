// Read-only DB/file audit after runner cleanup; writes only new evidence artifacts.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),base=path.join(root,'docs/evidence/t13b-02');
const runId=process.argv[2];assert.match(runId||'',/^\d{14}-[a-f0-9]{6}$/);
const out=path.join(base,runId),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const save=(n,v)=>fs.writeFileSync(path.join(out,n),JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
Object.assign(process.env,{NODE_ENV:'test',DB_HOST:'127.0.0.1',DB_NAME:'travelgo_ai_m0_test',TEST_DATABASE_NAME:'travelgo_ai_m0_test',DB_SSL:'false',ALLOW_TEST_DB_WRITES:'true'});
const support=require('./t13b02-support.cjs');
(async()=>{try{
 const run=read(path.join(out,'run-summary.json'));assert.equal(run.compareExit,0);assert.ok(run.cleanup.every(v=>v.result==='PASS'));
 const post=await support.schema();assert.deepEqual(post,read(path.join(out,'preflight.json')));save('postflight-schema.json',{same:true,postflight:post});
 const baseline=read(path.join(base,'baseline/working-tree-sha256.json'));
 const changed=Object.keys(baseline).filter(p=>!fs.existsSync(path.join(root,p))||hash(path.join(root,p))!==baseline[p]);assert.deepEqual(changed,[]);
 const app=read(path.join(root,'docs/evidence/t13b-01-fix/20261107030355-79d231/application-hashes-after.json'));
 assert.ok(Object.entries(app).every(([p,h])=>hash(path.join(root,p))===h));save('application-hashes-verified.json',app);
 const manifest=read(path.join(out,'case-manifest.json')),lock=read(path.join(out,'manifest-lock.json'));assert.equal(hash(path.join(out,'case-manifest.json')),lock.sha256);
 assert.deepEqual(run.integrity.harnessChanged,[]);assert.equal(run.integrity.manifestUnchanged,true);
 const residual={},projects={},results=[],allRunFingerprints=[];
 for(const name of fs.readdirSync(base).filter(v=>/^\d{14}-/.test(v)).sort()){
  const dir=path.join(base,name);for(const file of ['fingerprint-before.json','fingerprint-after.json'])if(fs.existsSync(path.join(dir,file)))allRunFingerprints.push({runId:name,file,value:read(path.join(dir,file))});
  for(const project of ['desktop','mobile']){
   const lp=path.join(dir,project,'ledger.json');if(!fs.existsSync(lp))continue;const ledger=read(lp);assert.equal(ledger.cleanup,'PASS');residual[name+'_'+project]={};
   for(const [table,ids]of Object.entries(ledger.cleanupIds)){const model=Object.values(support.models).find(v=>v?.tableName===table);assert.ok(model,table);const count=await model.count({where:{[model.primaryKeyAttribute]:ids}});residual[name+'_'+project][table]=count;assert.equal(count,0);}
   assert.equal(await support.models.User.count({where:{email:ledger.emails}}),0);
   if(name!==runId)continue;
   const rows=fs.readdirSync(path.dirname(lp)).filter(v=>v.endsWith('-results.json')).map(f=>read(path.join(path.dirname(lp),f)));results.push(...rows);
   projects[project]={users:ledger.users.length,businesses:ledger.businesses.length,resources:Object.fromEntries(Object.entries(ledger.resources).map(([k,v])=>[k,v.length])),bookings:ledger.bookings.length,reviews:ledger.reviews.length,statuses:rows.map(v=>({id:v.id,status:v.status})),layoutChecks:rows.flatMap(v=>v.checkpoints.filter(c=>c.id.startsWith('LAYOUT_'))),pageErrors:rows.flatMap(v=>v.console.filter(c=>c.type==='pageerror')),screenshots:rows.reduce((n,v)=>n+v.images.length,0)};
  }
 }
 assert.ok(allRunFingerprints.length>=2);for(const fp of allRunFingerprints)assert.deepEqual(fp.value,allRunFingerprints[0].value);
 const core=manifest.cases.map(v=>{const instances=results.filter(r=>r.id===v.id);if(v.selected)assert.equal(instances.length,['R03','B06'].includes(v.id)?1:2,v.id+' instance count');else assert.equal(instances.length,0);
  return {id:v.id,selected:v.selected,approvedRow:v.approvedRow,channel:v.channel,status:v.selected?(instances.some(r=>r.status==='FAIL')?'FAIL':instances.every(r=>r.status==='PASS')?'PASS':'NOT RUN'):manifest.previouslyPassedNotRerun.includes(v.id)?'PASS':'NOT RUN',basis:v.selected?'CURRENT RUN':manifest.previouslyPassedNotRerun.includes(v.id)?'HISTORICAL T13-B-01-FIX; not rerun':'NOT RUN',instances:instances.map(r=>({project:r.project,status:r.status,evidence:`${r.project}/${r.id}-results.json`}))};});
 const totals=rows=>Object.fromEntries(['PASS','FAIL','NOT RUN'].map(s=>[s,rows.filter(v=>v.status===s).length]));
 save('acceptance_matrix.json',{runId,baseline:manifest.scopePath,baselineSha256:manifest.approvedScopeSha256,core,optional:manifest.optional});
 fs.writeFileSync(path.join(out,'acceptance_matrix.csv'),'id,classification,status,basis\n'+core.map(v=>`${v.id},CORE,${v.status},${v.basis}`).join('\n')+'\n'+manifest.optional.map(v=>`${v.id},OPTIONAL,NOT RUN,NOT RUN`).join('\n')+'\n',{flag:'wx'});
 const summary={runId,selectedCore:totals(core.filter(v=>v.selected)),cumulativeCore:totals(core),optional:{'NOT RUN':8},runtimeInstances:{executed:results.length,...totals(results),excludedMobileA1:2},migrations:post.migrations.length,baselineFiles:Object.keys(baseline).length,baselineChanged:changed,applicationFiles:Object.keys(app).length,applicationUnchangedSinceB01Fix:true,manifestSha256:lock.sha256,sourceIntegrity:run.integrity,fingerprint:{tables:Object.keys(allRunFingerprints[0].value.tables).length,allEqual:true,snapshots:allRunFingerprints.map(({runId,file})=>({runId,file}))},residualByExactId:residual,projects,commands:{browserExit:run.browserExit,compareExit:run.compareExit}};
 save('verification_summary.json',summary);console.log(JSON.stringify({...summary,projects:undefined,residualByExactId:undefined},null,2));
}finally{await support.sequelize.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
