const c=require('./common.cjs'),{spawnSync}=require('node:child_process');
const gate=c.json(c.prefix+'acceptance-gate-final.json');c.assert.equal(gate.status,'HARNESS_RELIABILITY_FIX_PASS_OFFLINE');
const history=c.integrity();
const cli=spawnSync(process.execPath,[c.path.join(c.evidence,'run-live.corrected.cjs')],{encoding:'utf8',env:{...process.env,NODE_OPTIONS:'--require='+c.path.join(c.evidence,'offline-boundary.cjs'),OFFLINE_GUARD_AUDIT_DIR:''}});
c.assert.equal(cli.status,2);c.assert.match(cli.stderr,/IMPORT_ONLY_NO_LIVE_ADAPTER_OR_APPROVAL/);
c.write('entrypoint-acceptance.json',{at:new Date().toISOString(),status:'PASS',directExecutionExit:cli.status,stderr:cli.stderr.trim(),nativeRequests:0,database:false});
const text=new TextDecoder('utf-8',{fatal:true}).decode(c.read(c.report));
const links=[...text.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]).filter(x=>!/^https?:/.test(x));
for(const link of links)if(!link.endsWith('/artifact-checksums.json'))c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
c.write('report-validation.json',{at:new Date().toISOString(),status:'PASS',reportSha256:c.sha(c.read(c.report)),relativeLinks:links.length,historical:history,sourceChanges:0,classification:gate.status,finalMainTestResult:'independent-acceptance-06.json',finalMockBrowser:'mock-browser-10/results.json',legacyRerun:false,liveExecuted:false});
const hashes={};for(const name of c.fs.readdirSync(c.evidence,{recursive:true})){const file=c.path.join(c.evidence,name);if(c.fs.statSync(file).isFile()&&name!=='artifact-checksums.json')hashes[name.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(file));}
c.write('artifact-checksums.json',{at:new Date().toISOString(),report:c.report,reportSha256:c.sha(c.read(c.report)),hashes,scope:'All new task evidence except this checksum file. Historical and failed offline preparation results retained; report separately hashed.'});
for(const[f,h]of Object.entries(hashes))c.assert.equal(c.sha(c.fs.readFileSync(c.path.join(c.evidence,f))),h,f);
for(const link of links)c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
c.assert.equal(c.fs.readdirSync(c.path.join(c.evidence,'network-audit')).length,c.json(c.prefix+'network-audit-summary-final.json').processAuditFiles);
console.log(JSON.stringify({status:'SEALED',classification:gate.status,files:Object.keys(hashes).length,reportSha256:c.sha(c.read(c.report)),links:links.length,history}));
