const c = require('./common.cjs');
const load = name => c.json('docs/evidence/t-ai-04-g1-readiness-controlled-check/' + name);
const result = load('results.json'), events = load('readiness-lifecycle-events.json'), plan = load('request-plan.json'), lock = load('manifest-lock.json');
c.assert.equal(result.status, 'PASS'); c.assert.equal(result.posts, 2); c.assert.equal(events.transport.filter(x => x.method === 'POST').length, 2);
c.assert.equal(events.transport.filter(x => x.phase === 'RC00' && x.method === 'POST').length, 0);
c.assert.equal(c.sha(c.read('docs/evidence/t-ai-04-g1-readiness-controlled-check/request-plan.json')), lock.requestPlanSha256);
for (const item of [plan.preparation, plan.smoke]) {
  const attempt = load('attempt-' + item.id + '.json'); c.assert.equal(attempt.requestBodySha256, item.sha256);
  c.assert.ok(Date.parse(attempt.at) > Date.parse(plan.lockedAt)); c.assert.equal(attempt.principalHash, c.principalHash);
}
const postLoad = load('post-preparation-readiness.json'), beforeSmoke = load('preflight-before-smoke.json');
const stages = [['preflight-run', load('preflight-run.json')], ['before-load', load('preflight-before-load.json')],
  ['after-load', postLoad], ['before-smoke', beforeSmoke], ['after-smoke', { resources: result.smoke.resourcesAfter, metadata: result.smoke.metadataAfter }]];
const resources = stages.map(([stage, item]) => ({ stage, at: item.resources.at, ramFreeMiB: item.resources.ram.freeMiB,
  gpu: item.resources.gpus[0], resident: item.metadata.resident, context: item.metadata.residentContext,
  model: item.metadata.ps.body.models.find(x => x.name === c.model) || null }));
const logs = load('ollama-log-window.json');
const warnings = logs.sanitizedNewRows.filter(line => /level=WARN/.test(line)).map(line => ({ at: line.match(/time=(\S+)/)?.[1],
  source: line.match(/source=(\S+)/)?.[1], message: line.match(/msg="([^"]+)"/)?.[1] }));
const serverPosts = logs.sanitizedNewRows.filter(line => /\[GIN\].*POST.*\/api\/(generate|chat)/.test(line)); c.assert.equal(serverPosts.length, 2);
const traces = ['RC00','RC01'].map(phase => ({ phase, events: events.trace.filter(x => x.phase === phase).map(x => ({ at:x.at,event:x.event,operation:x.operation,reason:x.reason,elapsedMs:x.elapsedMs,inferenceStarted:x.inferenceStarted })) }));
const after = c.snapshot(), before = load('integrity-before.json').hashes;
const changes = Object.keys(before).filter(file => before[file] !== after[file]), added = Object.keys(after).filter(file => !Object.hasOwn(before,file));
c.assert.deepEqual(changes, []); c.assert.deepEqual(added, []); c.integrity();
c.write('integrity-after.json', { at:new Date().toISOString(),status:'PASS',baselineFiles:Object.keys(before).length,changes,added,hashes:after,
  historicalEvidenceFiles:Object.keys(before).filter(file=>file.startsWith('docs/evidence/')).length,productionChanges:0 });
const analysis = { at:new Date().toISOString(),status:'PASS',postReconciliation:{approvedCap:2,attemptedPosts:2,nativeTransportPosts:2,serverPostRows:serverPosts,
  coldGuardPosts:0,loadOnlyPosts:1,productionChatPosts:1,modelInferences:1,loadOnlyNotNlu:true,hiddenInference:0,retries:0},
  resources,traces,warnings,serverLoadedGpuLayers:logs.sanitizedNewRows.find(line=>/offloaded \d+\/\d+ layers to GPU/.test(line)),
  duration:{operatorWallMs:result.preparation.elapsedMs,operatorServerLoadDuration:'NOT REPORTED',smokeWallMs:result.smoke.elapsedMs,smokeServer:result.smoke.durationsMs},
  rate:{principalHash:c.principalHash,principalSource:c.principalSource,beforeKnown:load('preflight-run.json').rate.known,beforeRecent:load('preflight-run.json').rate.recent.length,
    afterRecent:result.rateAfter.recent.length,afterKnown:result.rateAfter.known,sameInstanceAgentTurns:2,directOperatorPostsOutsideLimits:1,
    note:'Historical ledger includes at and createdAt. New no-POST readiness turn explicitly counted. Direct operator POST counted conservatively but not claimed AgentLimits-controlled.'},
  deadline:{productionMs:15000,operatorMs:60000,liveDeadlineTriggered:false,nativeAbortFaultCase:'NOT RUN',offlineCoverage:'33 readiness/abort + 13 diagnostics PASS'},
  regression:load('regression-summary.json'),interpretation:'Controlled readiness smoke only. Unsupported success cannot distinguish healthy NLU from decision collapse; P1 remains OPEN. GPU watchdog warning persists; P2 remains OPEN for stability/root cause.' };
c.write('runtime-analysis.json',analysis);
console.log(JSON.stringify({ status:analysis.status,baselineFiles:Object.keys(before).length,historicalEvidenceFiles:Object.keys(before).filter(file=>file.startsWith('docs/evidence/')).length,
  resources:resources.map(x=>({stage:x.stage,at:x.at,ramFreeMiB:x.ramFreeMiB,vramFreeMiB:x.gpu.freeMiB,vramUsedMiB:x.gpu.usedMiB,resident:x.resident,context:x.context})),warnings,
  rate:analysis.rate,requestPlanSha256:lock.requestPlanSha256 }));
