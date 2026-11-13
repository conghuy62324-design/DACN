const c=require('./common.cjs');
const files=['common.cjs','runtime-adapters.cjs','real-guards.cjs','run-live.corrected.cjs','fail-fast.cjs','public-json.cjs','browser-checks.cjs','ui-strings.json','capture-templates.cjs','binding.cjs','maintenance.cjs','readonly-db.cjs','direct-planner.cjs','cleanup-lifecycle.cjs','source-lock.cjs','run-approved.cjs','lock-manifest.cjs','live-boundary.cjs'];
function snapshot(){return Object.fromEntries(files.map(file=>[file,c.sha(c.read(c.prefix+file))]));}
function verify(hashes){c.assert.ok(hashes&&Object.keys(hashes).length===files.length,'HARNESS_CLOSURE_REQUIRED');for(const file of files)c.assert.equal(c.sha(c.read(c.prefix+file)),hashes[file],file);return true;}
module.exports={files,snapshot,verify};
