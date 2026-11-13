const c=require('./common.cjs');
const stop=c.json(c.prefix+'stop.json');c.assert.equal(stop.status,'STOP_PHASE_A_ADAPTER_ACCEPTANCE_FAIL');c.assert.equal(stop.totalNativePosts,0);c.assert.equal(stop.databaseAccess,0);c.assert.deepEqual(stop.fixturesCreated,[]);
const history=c.integrity(),reportBytes=c.read(c.report);const text=new TextDecoder('utf-8',{fatal:true}).decode(reportBytes);
const links=[...text.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]).filter(x=>!/^https?:/.test(x));for(const link of links)if(!link.endsWith('/artifact-checksums.json'))c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
c.write('report-validation.json',{at:new Date().toISOString(),status:'PASS_REPORT_ACCURATELY_RECORDS_STOP',taskResult:stop.status,reportSha256:c.sha(reportBytes),relativeLinks:links.length,historical:history,dbAccess:0,nativePosts:0,liveCasesNotRun:3,regressionNotRun:true});
const hashes={};for(const name of c.fs.readdirSync(c.evidence,{recursive:true})){const file=c.path.join(c.evidence,name);if(c.fs.statSync(file).isFile()&&name!=='artifact-checksums.json')hashes[name.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(file));}
c.write('artifact-checksums.json',{at:new Date().toISOString(),report:c.report,reportSha256:c.sha(reportBytes),hashes,status:stop.status,scope:'All new task artifacts except this checksum file. Phase A FAIL retained; no historical file overwritten.'});
for(const[f,h]of Object.entries(hashes))c.assert.equal(c.sha(c.fs.readFileSync(c.path.join(c.evidence,f))),h,f);for(const link of links)c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
console.log(JSON.stringify({status:'SEALED',taskResult:stop.status,files:Object.keys(hashes).length,reportSha256:c.sha(reportBytes),links:links.length,history}));
