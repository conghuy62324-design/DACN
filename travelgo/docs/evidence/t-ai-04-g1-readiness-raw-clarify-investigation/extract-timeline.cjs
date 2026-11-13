// Offline historical/log correlation, not a new inference or benchmark run.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const evidence = 'docs/evidence/t-ai-04-g1-missing-slot-live-check';
const runtime = JSON.parse(fs.readFileSync(path.join(__dirname, 'runtime-readonly.json')));
const server = runtime.logs.find(x => x.name === 'server.log');
const lines = fs.readFileSync(server.sourcePath, 'utf8').split(/\r?\n/u);
const unsafe = /server config|env=|api[_-]?key|password|secret|authorization|messages=|"content"|request body|prompt=|user:|human:/iu;
const structural = /^(?:ggml_|llama_|load_tensors|print_info|common_|srv |slot |init:|set_n_|sched|CUDA|CPU)|out of memory|allocat|buffer|offload|KV|n_ctx|failed|cancell|abort|error/iu;
const details = [];
for (let i = 709; i < Math.min(lines.length, 1208); i++) {
  const line = lines[i];
  if (/^time=|^\[GIN\]/u.test(line) || unsafe.test(line) || !structural.test(line)) continue;
  details.push({ line: i + 1, text: line.replaceAll(process.env.USERPROFILE || 'NO_PROFILE', '<USERPROFILE>').slice(0, 1000),
    timestamp: 'UNTIMESTAMPED_RUNNER_STDERR; ordering only' });
}
write('runner-structural-log.json', { source: server.sourcePath, sourceSha256AtInitialRead: server.sha256AtRead,
  window: 'server.log lines 710-1208, M run', rows: details, inferencePosts: 0 });
const cases = ['M01', 'M02', 'M03', 'M04', 'M05', 'M06'].map(id => {
  const item = json(`${evidence}/${id}.json`), attempt = json(`${evidence}/attempt-${id}.json`);
  const exceptionFile = path.join(root, evidence, `${id}-provider-exception.json`);
  const exception = fs.existsSync(exceptionFile) ? JSON.parse(fs.readFileSync(exceptionFile)) : null;
  const responseFile = path.join(root, evidence, `${id}-ollama-response.json`);
  const response = fs.existsSync(responseFile) ? JSON.parse(fs.readFileSync(responseFile)) : null;
  return { id, attemptAtUTC: attempt.at, nominalDeadlineFromPostUTC: new Date(Date.parse(attempt.at) + 15000).toISOString(),
    deadlineBasis: 'Approximate: actual outer provider deadline starts slightly before POST attempt ledger',
    observedWallMs: item.elapsedMs, providerExceptionAtUTC: exception?.capturedAt || null,
    clientExceptionCode: exception?.code || null, responseCapturedAtUTC: response?.capturedAt || null,
    rawAvailable: item.rawModelDecision !== null, timeout: item.timeoutExceeded, modelLoadMs: item.durationsNs.load === null ? null : item.durationsNs.load / 1e6,
    promptEvalMs: item.durationsNs.promptEval === null ? null : item.durationsNs.promptEval / 1e6,
    evalMs: item.durationsNs.eval === null ? null : item.durationsNs.eval / 1e6,
    ramBeforeMiB: item.resourcesBefore.freeRAMMiB, ramAfterMiB: item.resourcesAfter.freeRAMMiB,
    vramBeforeFreeMiB: item.resourcesBefore.gpu.freeMiB, vramAfterFreeMiB: item.resourcesAfter.gpu.freeMiB,
    nlu: item.nlu, serviceError: item.error?.code || null, fakeToolCalls: item.fakeToolInvocationCount };
});
const notes = cases.slice(0, 2).map((item, i) => ({ id: item.id,
  clientProviderSettledBeforeNextPostMs: Date.parse(cases[i + 1].attemptAtUTC) - Date.parse(item.providerExceptionAtUTC),
  serverCancellationRows: server.matchingMRunWindowRows.filter(x => item.id === 'M01'
    ? x.line >= 724 && x.line <= 726 : x.line >= 890 && x.line <= 892) }));
assert.ok(notes.every(x => x.clientProviderSettledBeforeNextPostMs >= 0));
write('deadline-timeline.json', { cases, serverRows: server.matchingMRunWindowRows, cancellationCorrelation: notes,
  proven: ['Current source sends AbortSignal to fetch, outer service and provider each keep 15000ms timers',
    'Server logs show client disconnect while model loading, aborting load, Load failed/context canceled and HTTP 499 for both timed-out POSTs',
    'Different llama-server runner ports are launched for attempts; third starts ready in 6.82s then warm requests succeed'],
  notProven: ['Exact cause of discovery watchdog timeouts or slow Windows CUDA loading', 'Complete runner/GPU cleanup time after HTTP cancellation',
    'Context reduction or timeout increase would solve readiness without changing contract'], inferencePosts: 0, databaseAccess: 'NONE' });
console.log(JSON.stringify({ timelineCases: cases.length, serverWindowRows: server.matchingMRunWindowRows.length,
  runnerStructuralRows: details.length, clientSettleGapsMs: notes.map(x => x.clientProviderSettledBeforeNextPostMs), inferencePosts: 0 }));
