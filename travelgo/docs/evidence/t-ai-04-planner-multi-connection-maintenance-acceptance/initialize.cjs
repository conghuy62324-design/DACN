'use strict';
const c=require('./common.cjs');
c.fs.copyFileSync('C:/Users/Danh/.codex/attachments/664c2b3e-0bd5-4e42-9096-8822dddb7189/Pasted text.txt',c.path.join(__dirname,'owner-task.txt'),c.fs.constants.COPYFILE_EXCL);
c.write('integrity-before.json',{at:new Date().toISOString(),hashes:c.snapshot()});
const files=['docs/HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_ADDRESS_NORMALIZATION_REPORT.md','docs/HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_GUARD_FIX_REPORT.md','docs/HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_DIAGNOSIS_REPORT.md','docs/HUGO_T_AI_04_PLANNER_LIVE_TARGETED_REVALIDATION_RESUME_REPORT.md','docs/HUGO_T_AI_04_PLANNER_ADAPTER_BINDING_ACCEPTANCE_FIX_REPORT.md',...['host-address.cjs','route-policy.cjs','ownership-registry.cjs','managed-connections.cjs','maintenance.candidate.cjs','maintenance.base.cjs','real-guards.cjs','cleanup-lifecycle.cjs','run-live.corrected.cjs','phase-a-gate.json','trace-result.json','artifact-checksums.json'].map(f=>c.baseline+f)];
c.write('baseline-review.json',{at:new Date().toISOString(),files:files.map(file=>({file,sha256:c.sha(c.read(file)),bytes:c.read(file).length})),integrity:c.integrity()});
for(const f of new Set([...Object.keys(c.json(c.baseline+'phase-a-gate.json').sourceHashes).filter(f=>!['common.cjs','initialize.cjs','run-phase-a.cjs','network-boundary.cjs'].includes(f)),'synthetic-db.cjs']))c.fs.copyFileSync(c.path.join(c.root,c.baseline+f),c.path.join(__dirname,f),c.fs.constants.COPYFILE_EXCL);
console.log(JSON.stringify(c.integrity()));
