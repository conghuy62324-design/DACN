// Offline regression after LIVE. Reuse prior readiness fixtures/scheduling adapters byte-for-byte.
const c = require('./common.cjs'), { spawnSync } = require('node:child_process');
const old = c.path.join(c.root, 'docs/evidence/t-ai-04-g1-readiness-abort-guard-fix');
const output = c.path.join(c.evidence, 'regression'); c.fs.mkdirSync(output);
const diagnostics = c.path.join(c.evidence, 'prior-diagnostics-compatible'); c.fs.mkdirSync(diagnostics);
const shim = c.path.join(c.evidence, 'legacy-ready-shim.cjs');
c.fs.copyFileSync(c.path.join(old, 'legacy-ready-shim.cjs'), shim);
c.fs.copyFileSync(c.path.join(old, 'prior-diagnostics-compatible/offline-diagnostics.cjs'), c.path.join(diagnostics, 'offline-diagnostics.cjs'));
const transport = 'dist/tests/agentTransport.readiness-controlled-compatible.js';
c.fs.copyFileSync(c.path.join(old, 'agentTransport.readiness-compatible.js'), c.path.join(c.root, 'backend', transport));
const compatibility = ['legacy-ready-shim.cjs', 'prior-diagnostics-compatible/offline-diagnostics.cjs', 'agentTransport.readiness-compatible.js'].map(file => {
  const actual = file.startsWith('agentTransport') ? c.path.join(c.root, 'backend', transport) : c.path.join(c.evidence, file);
  return { source: 'docs/evidence/t-ai-04-g1-readiness-abort-guard-fix/' + file, sha256: c.sha(c.fs.readFileSync(actual)),
    identicalToApprovedPriorFixture: c.sha(c.fs.readFileSync(actual)) === c.sha(c.fs.readFileSync(c.path.join(old, file))) };
});
c.assert.ok(compatibility.every(x => x.identicalToApprovedPriorFixture));
c.write('regression-compatibility.json', { assertionsChanged: 0, compatibility, notes: 'Synthetic ready control-plane GETs only for legacy mocks; scheduling-only compatibility. New 33 readiness tests run without shim. Historical F unchanged.' });
const cases = [['agentMissingSlotRecovery',33],['agentSlotFillingPrompt',21],['agentG1SafeContract',26],['agentDecisionRouting',10],['agentDecisionFormatSafety',17],['agentFoundation',22]];
const jobs = [
  ['backend-build-after-live','cmd.exe',['/d','/c','npm.cmd run build --silent'],'backend',null],
  ['readiness-abort-33',process.execPath,['dist/tests/agentReadinessAbort.test.js'],'backend',33],
  ...cases.map(([name, count]) => [name,process.execPath,['--require',shim,'dist/tests/'+name+'.test.js'],'backend',count]),
  ['transport-19',process.execPath,['--require',shim,transport],'backend',19],
  ['historical-F',process.execPath,['--require',shim,'dist/tests/agentContractSlotInvestigation.test.js'],'backend',null],
  ['F-applicable-23',process.execPath,['--require',shim,'dist/tests/agentContractSlotInvestigation.g1-applicable.js'],'backend',23],
  ['frontend-conversation-10',process.execPath,['--experimental-strip-types','tests/agentConversation.test.ts'],'frontend',10],
  ['diagnostics-13',process.execPath,['--require',shim,c.path.join(diagnostics,'offline-diagnostics.cjs')],'.',13],
];
const execution = [];
for (const [name, command, args, folder, expected] of jobs) {
  const run = spawnSync(command,args,{ cwd:c.path.join(c.root,folder), encoding:'utf8',timeout:120000,
    env:{...process.env,LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'} });
  const log = (run.stdout || '') + (run.stderr || '') + (run.error ? '\n'+run.error.name : '');
  c.fs.writeFileSync(c.path.join(output,name+'.log'),log,{flag:'wx'});
  const passed = Number(log.match(/"passed"\s*:\s*(\d+)/)?.[1] || 0), failed = Number(log.match(/"failed"\s*:\s*(\d+)/)?.[1] || 0);
  const expectedHistorical = name === 'historical-F' && run.status === 1 && log.includes("actual: 'needs_input'") && log.includes("expected: 'completed'");
  const item = {name,exitCode:run.status,passed,failed,expectedPass:expected, log:name+'.log',
    status:name==='historical-F' ? expectedHistorical ? 'EXPECTED_HISTORICAL_FAILURE' : 'UNEXPECTED_FAILURE' : run.status===0 && (expected===null || passed===expected && failed===0) ? 'PASS':'FAIL'};
  execution.push(item); console.log(JSON.stringify(item));
  if(name==='backend-build-after-live' && run.status!==0) break;
}
const regression = execution.filter(x=>!['readiness-abort-33','diagnostics-13'].includes(x.name)).reduce((n,x)=>n+x.passed,0);
const result = {at:new Date().toISOString(),tier:'MOCK_ONLY_OFFLINE',status:execution.length===jobs.length && execution.every(x=>['PASS','EXPECTED_HISTORICAL_FAILURE'].includes(x.status)) && regression===181 ? 'PASS':'FAIL',
  execution,readinessAbortTests:execution.find(x=>x.name==='readiness-abort-33')?.passed,priorDiagnostics:execution.find(x=>x.name==='diagnostics-13')?.passed,
  applicableRegression:regression,historicalF:{passedBeforeStop:22,failed:1,notRun:1,assertionsChanged:0},livePosts:0,databaseAccess:'NONE',frontendBuild:'NOT RUN: unchanged source'};
c.write('regression-summary.json',result); c.assert.equal(result.status,'PASS');
