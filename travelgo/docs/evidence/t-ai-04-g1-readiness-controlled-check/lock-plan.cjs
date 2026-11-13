// OFFLINE artifact preparation only. No HTTP request, DB or inference.
const c = require('./common.cjs'), vm = require('node:vm'), { spawnSync } = require('node:child_process');
c.integrity();
const build = spawnSync('cmd.exe', ['/d','/c','npm.cmd run build --silent'], { cwd: c.path.join(c.root, 'backend'), encoding: 'utf8', timeout: 120000 });
c.fs.writeFileSync(c.path.join(c.evidence, 'backend-build-before-live.log'), (build.stdout || '') + (build.stderr || ''), { flag: 'wx' });
c.assert.equal(build.status, 0);
const sourceLiteral = c.read('backend/src/services/agentService.ts').toString('utf8').match(/const SYSTEM = (`[\s\S]*?`);/)[1];
const distLiteral = c.read('backend/dist/services/agentService.js').toString('utf8').match(/const SYSTEM = (`[\s\S]*?`);/)[1];
const system = vm.runInNewContext(sourceLiteral); c.assert.equal(system, vm.runInNewContext(distLiteral));
const { AGENT_TOOLS } = require(c.path.join(c.root, 'backend/dist/agent/tools.js'));
const { DECISION_SCHEMA } = require(c.path.join(c.root, 'backend/dist/agent/decisionSchema.js'));
const message = 'Kiểm tra kỹ thuật RC01: hãy phân tích cấu trúc tinh thể của muối ăn và viết một bài thơ ngắn về đại số tuyến tính.';
c.assert.equal(message, message.normalize('NFC'));
const duplicates = [], directory = c.path.join(c.root, 'docs/evidence'); let inspected = 0;
for (const file of c.fs.readdirSync(directory, { recursive: true })) {
  if (!file.endsWith('.json') || file.startsWith('t-ai-04-g1-readiness-controlled-check')) continue;
  const full = c.path.join(directory, file); if (!c.fs.statSync(full).isFile()) continue;
  const text = c.fs.readFileSync(full, 'utf8'); inspected++;
  if (text.normalize('NFC').includes(message)) duplicates.push(file.replaceAll('\\','/'));
}
c.assert.deepEqual(duplicates, []);
const wireSystem = `${system}\nAvailable read-only tools (metadata from AGENT_TOOLS):\n${JSON.stringify(AGENT_TOOLS.map(tool => ({
  name: tool.name, description: tool.description, required: tool.parameters.required, parameters: tool.parameters,
})))}\nDecision JSON Schema:\n${JSON.stringify(DECISION_SCHEMA)}`;
c.assert.equal(c.sha(wireSystem), '5902945e22dfe3b9b3432c669125daf4d7929fbfd5a330ffce0581fc62c4fe1f');
const applicationBody = JSON.stringify({ model: c.model, messages: [{ role: 'system', content: wireSystem }, { role: 'user', content: message }],
  stream: false, format: 'json', options: { temperature: 0, num_predict: 2048, num_ctx: 16384 } });
const preparationBody = JSON.stringify({ model: c.model, prompt: '', stream: false, format: 'json', keep_alive: '5m',
  options: { temperature: 0, num_predict: 2048, num_ctx: 16384 } });
c.fs.writeFileSync(c.path.join(c.evidence, 'application-request-body.json'), applicationBody, { flag: 'wx' });
c.fs.writeFileSync(c.path.join(c.evidence, 'operator-load-request-body.json'), preparationBody, { flag: 'wx' });
const plan = { task: 'T-AI-04-G1-READINESS-CONTROLLED-CHECK', status: 'APPROVED_SCOPE_LOCKED_BEFORE_POST', lockedAt: new Date().toISOString(),
  approvalSource: 'C:/Users/Danh/.codex/attachments/b54b89e7-7c54-4ae7-b016-aa30ea56316b/Pasted text.txt', approvalMaxLocalPosts: 2,
  principalHash: c.principalHash, principalSource: c.principalSource, model: c.model, digest: c.digest, operatorEnv: c.env,
  guardProbe: { id: 'RC00', postsAllowed: 0, condition: 'Only execute if model nonresident; genuine provider/orchestrator GET path must reject readiness 503; no inference or NLU score.' },
  preparation: { id: 'RC-LOAD', endpoint: c.env.OLLAMA_BASE_URL + '/api/generate', sha256: c.sha(preparationBody), bodyFile: 'operator-load-request-body.json',
    timeoutMs: 60000, keepAlive: '5m', conditional: 'One direct operator load-only request only if nonresident, never second load attempt',
    accounting: 'Counts against task two POST cap; bypasses AgentOrchestrator by design, not claimed AgentLimits-controlled; conservative historical rolling ledger still enforced',
    expected: { httpStatus: 200, done: true, done_reason: 'load', response: '', residentAfter: true, context: 16384, exactTagDigest: true },
    nlu: 'NOT EVALUATED', failurePolicy: 'Any error/timeout/nonempty response or failed residency verification stops task before application POST; no retry' },
  smoke: { id: 'RC01', endpoint: c.env.OLLAMA_BASE_URL + '/api/chat', request: { history: [], message }, expected: { kind: 'unsupported' },
    expectedServiceStatus: 'unsupported', expectedTools: 0, sha256: c.sha(applicationBody), bodyFile: 'application-request-body.json',
    timeoutMs: 15000, parameters: { temperature: 0, num_ctx: 16384, num_predict: 2048, format: 'json', stream: false },
    criteria: 'One POST at most through actual createConfiguredProvider+AgentOrchestrator+readiness+original schema/runtime. Exact unsupported object, HTTP200, done stop, valid envelope, provider success, service unsupported, zero tool invocations, no deadline/abort. No retry or response repair. No output => raw NLU NOT EVALUATED; smoke FAIL/BLOCKED as observed.',
    requestBudgetBytes: Buffer.byteLength(JSON.stringify({ system: wireSystem, messages: [{ role: 'user', content: message }] })) + 512,
    requestNovelty: { historicalJsonFilesInspected: inspected, exactDuplicates: duplicates }, systemWireSha256: c.sha(wireSystem) },
  safety: { noDatabase: true, noRealTools: true, noCloud: true, noBenchmark: true, concurrency: 1, rateLimit: 20,
    noRetry: true, noUnloadPost: true, noGlobalLiveEnable: true, originalTimeoutMs: 15000 },
  documentation: ['https://docs.ollama.com/faq#how-can-i-preload-a-model-into-ollama-to-get-faster-response-times', 'https://docs.ollama.com/api/generate', 'https://docs.ollama.com/api/ps'] };
c.assert.ok(plan.smoke.requestBudgetBytes <= 12288);
c.write('request-plan.json', plan);
c.write('manifest-lock.json', { at: new Date().toISOString(), status: 'LOCKED_BEFORE_POST', requestPlanSha256: c.sha(c.read('docs/evidence/t-ai-04-g1-readiness-controlled-check/request-plan.json')),
  applicationBodySha256: c.sha(applicationBody), operatorLoadBodySha256: c.sha(preparationBody), approvalMaxPosts: 2, principalHash: c.principalHash });
console.log(JSON.stringify({ status: 'LOCKED_BEFORE_POST', maxPosts: 2, applicationSha256: c.sha(applicationBody), operatorSha256: c.sha(preparationBody),
  applicationTimeoutMs: 15000, operatorTimeoutMs: 60000, requestNoveltyFiles: inspected, requestBudgetBytes: plan.smoke.requestBudgetBytes }));
