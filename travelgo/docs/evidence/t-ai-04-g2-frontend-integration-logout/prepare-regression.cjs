const c=require('./common.cjs');c.history();
const old='docs/evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/';
const files=['run-regression.cjs','offline-guard.cjs','downstream-control.cjs','observe-legacy.cjs','run-foundation-compat.cjs','run-additional-offline.cjs'];
for(const file of files)c.fs.copyFileSync(c.path.join(c.root,old,file),c.path.join(c.evidence,file),c.fs.constants.COPYFILE_EXCL);
c.write('regression-runner-provenance.json',{at:new Date().toISOString(),tier:'MOCK_ONLY_OFFLINE',copies:files.map(file=>({file,source:old+file,sha256:c.sha(c.read(old+file)),byteIdentical:true})),assertionsChanged:0,productionSourceChanged:false});
console.log('Prepared unchanged historical offline runners; no tests/network executed.');
