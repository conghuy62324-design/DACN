const fs=require('node:fs'),path=require('node:path'),file=path.join(__dirname,'runtime-adapters.cjs');let s=fs.readFileSync(file,'utf8');
const marker='const ports={...bindRealGuards(runtime),';
const integration=`const {createCleanupLifecycle}=require('./cleanup-lifecycle.cjs');
const cleanupLifecycle=createCleanupLifecycle({
 expectedIds:['f7433d4a-5f49-4991-8add-b55435b02eb0','5a1e8835-770c-41a2-8699-74deba239a86'],
 async readState(){return{committed:maintenance.committed,ambiguous:maintenance.ambiguous,createdRows:maintenance.inserted?.length||0};},
 async readOwnership(){
  const file=c.path.join(c.evidence,'fixture-committed-ledger.json');if(!c.fs.existsSync(file))return null;
  const ledger=c.json(c.prefix+'fixture-committed-ledger.json');
  return{owned:c.sha(c.fs.readFileSync(file))===plan.fixtureLedgerSha256,ledger};
 },
 async readRows(){return maintenance.fixtureRows();},
 async readReferences(){return maintenance.references();},
 async verifyIsolation(index){return maintenance.assertFixtures('cleanup-contract-'+index);},
 async removeOwnedFixtures(){await maintenance.cleanup();return c.json(c.prefix+'cleanup-result.json');},
 async readResidualIds(){return(await maintenance.fixtureRows()).map(x=>x.row.id);}
});
`;
if(!s.includes(marker))throw Error('PORT_MARKER_MISSING');s=s.replace(marker,integration+marker);
const start=s.indexOf(' async cleanupPrecondition(){'),end=s.indexOf('\n async dispose(){',start);if(start<0||end<0)throw Error('CLEANUP_MARKERS_MISSING');
s=s.slice(0,start)+` async cleanupPrecondition(){await closeActivity();return cleanupLifecycle.assess();},
 async cleanup(){const result=await cleanupLifecycle.perform();cleanupDone=true;return result;},`+s.slice(end);
fs.writeFileSync(file,s,'utf8');console.log('SHARED_CLEANUP_LIFECYCLE_BOUND_IMPORT_ONLY');
