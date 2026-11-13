// Evidence-only: inspect historical responses and capture requests with fake fetch.
// No network, DB, inference or real tool invocation.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const { createConfiguredProvider, LIVE_LIMITS } = require(path.join(root, 'backend/dist/agent/liveProvider.js'));
const { AgentOrchestrator } = require(path.join(root, 'backend/dist/services/agentService.js'));
const { AGENT_TOOLS } = require(path.join(root, 'backend/dist/agent/tools.js'));
const { matchesDecisionSchema } = require(path.join(root, 'backend/dist/agent/decisionValidation.js'));
const g = json('docs/evidence/t-ai-04-g1-live-validation/G03.json');
const e = json('docs/evidence/t-ai-04-e-controlled-format-safety/run-20261109T035122286Z-4601e49c/E03-B.json');
const eManifest = json('docs/evidence/t-ai-04-e-controlled-format-safety/manifest-approved.json');
const eCase = eManifest.cases.find(x => x.id === 'E03');
const beforeSource = fs.readFileSync(path.join(__dirname, 'agentService.before.txt'), 'utf8');
const afterSource = read('backend/src/services/agentService.ts').toString('utf8');
const extract = source => source.match(/const SYSTEM = `([\s\S]*?)`;/)[1];
const beforeSystem = extract(beforeSource), afterSystem = extract(afterSource);
const config = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true', OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: 'MOCK_ONLY' };

async function capture(system, message, decision = { kind: 'unsupported' }) {
  let wire;
  const provider = createConfiguredProvider(config, async (_url, init) => {
    wire = JSON.parse(init.body);
    return new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(decision) }, prompt_eval_count: 1, eval_count: 1 }));
  });
  const parsed = await provider.generate({ system, messages: [{ role: 'user', content: message }], tools: AGENT_TOOLS }, new AbortController().signal);
  return { wire, parsed, budgetBytes: Buffer.byteLength(JSON.stringify({ system: wire.messages[0].content, messages: wire.messages.slice(1) }), 'utf8') + 512 };
}

(async () => {
  globalThis.fetch = async () => { throw Error('Global network forbidden'); };
  const sample = 'Lập lịch trình; Nơi xuất phát: Hải Phòng; Điểm đến: Quảng Ngãi; Ngày bắt đầu: 2034-03-10; Ngày kết thúc: 2034-03-12; Số người lớn: 2; Ngân sách cả nhóm: 6000000 VND';
  const before = await capture(beforeSystem, sample), after = await capture(afterSystem, sample);
  fs.writeFileSync(path.join(__dirname, 'ollama-system-before.txt'), before.wire.messages[0].content, { flag: 'wx' });
  fs.writeFileSync(path.join(__dirname, 'ollama-system-after.txt'), after.wire.messages[0].content, { flag: 'wx' });
  assert.deepEqual(before.wire.options, after.wire.options);
  assert.equal(before.wire.format, after.wire.format);
  assert.ok(after.budgetBytes <= LIVE_LIMITS.inputTokens);
  const syntheticWrong = { kind: 'tool', name: 'plan_trip', arguments: { departureCity: 'Hải Phòng', destinationCity: 'Quảng Ngãi',
    startDate: '2034-03-10', endDate: '2034-03-12', adults: 2, totalBudget: 6000000, transportation: 'car' } };
  let rawDecision, calls = 0, toolCalls = 0;
  const provider = createConfiguredProvider(config, async () => {
    calls++;
    return new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(syntheticWrong) }, prompt_eval_count: 1, eval_count: 1 }));
  });
  const svc = new AgentOrchestrator({ provider: { configured: true, external: false, generate: async (input, signal) => {
    rawDecision = await provider.generate(input, signal); return rawDecision;
  } }, readConsent: async () => ({ personalizationEnabled: false }), tools: { execute: async () => { toolCalls++; return { type: 'MOCK_ONLY' }; } } });
  const result = await svc.chat({ id: 'MOCK_ONLY', roles: ['CUSTOMER'] }, { message: sample });
  assert.equal(result.status, 'needs_input'); assert.deepEqual(result.missingFields, ['transportation']); assert.equal(toolCalls, 0);
  write('offline-analysis.json', { tier: 'MOCK_ONLY_OFFLINE', historicalEvidence: {
    G03: { request: g.request, expected: g.expected, rawDecision: g.parsedModelDecision, schemaValid: matchesDecisionSchema(g.parsedModelDecision),
      nlu: g.nlu, gate: g.gate, toolCalls: g.fakeToolInvocationCount },
    E03B: { request: { message: eCase.message, history: eCase.history }, expected: e.expected, rawDecision: e.actual,
      schemaValid: matchesDecisionSchema(e.actual), nlu: e.status, historicalToolCalls: e.toolExecutions },
    comparison: 'Both same digest/JSON mode, empty history, six supplied planning fields, required transportation missing, raw tool car. E explicitly says not chosen; G omits it. Different inputs/runtime/orchestration, not a causal A/B.' },
    prompt: { beforeSha256: sha(before.wire.messages[0].content), afterSha256: sha(after.wire.messages[0].content),
      beforeBudgetBytes: before.budgetBytes, afterBudgetBytes: after.budgetBytes, unchangedByteBudget: LIVE_LIMITS.inputTokens,
      systemOnlyChanged: true, requestOptions: after.wire.options, format: after.wire.format },
    scriptedSafetyCounterexample: { rawDecision, expectedRawDecision: { kind: 'clarify', fields: ['transportation'] },
      rawSemanticMatch: false, serviceStatus: result.status, missingFields: result.missingFields, fakeProviderCalls: calls, toolCalls,
      safety: 'PASS', realNluQuality: 'NOT MEASURED' }, inferencePosts: 0, databaseAccess: 'NONE' });
  console.log(JSON.stringify({ status: 'PASS', beforeBytes: before.budgetBytes, afterBytes: after.budgetBytes, inferencePosts: 0, fakeToolCalls: toolCalls }));
})().catch(error => { console.error(error); process.exitCode = 1; });
