'use strict';
const Module=require('node:module'),c=require('./common.cjs'),{wireMaintenance}=require('./integration.cjs');
function createMaintenanceCandidate({db,registry,createClient,write}){
 // Load byte-identical Base with a test-only DB dependency; no historical cache
 // or source changes. All lock, fingerprint, exact-DML and cleanup methods remain.
 const filename=c.path.join(__dirname,'maintenance.base.cjs'),base=new Module(filename,module);base.filename=filename;base.paths=module.paths;
 const originalRequire=base.require.bind(base);base.require=name=>name==='./readonly-db.cjs'?db:originalRequire(name);base._compile(c.fs.readFileSync(filename,'utf8'),filename);
 return wireMaintenance(new base.exports.Maintenance(),{registry,createClient,write});
}
module.exports={createMaintenanceCandidate};
