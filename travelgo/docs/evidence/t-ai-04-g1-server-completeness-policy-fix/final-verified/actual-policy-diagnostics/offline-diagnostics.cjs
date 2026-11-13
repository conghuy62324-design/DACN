// MOCK_ONLY offline diagnostics. Production code unchanged. Fake logical timers
// preserve the actual 15000ms constants; no Ollama/HTTP POST, real tool or DB.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../../..');
const load = rel => require(path.join(root, 'backend/dist', rel));
const { AgentOrchestrator } = load('services/agentService.js');
const { createConfiguredProvider, LIVE_LIMITS } = load('agent/liveProvider.js');
const { withinDeadline } = load('agent/provider.js');
const { AgentLimits } = load('agent/limits.js');
const { classifyMissingReadSlots, MissingReadSlotsRejection } = load('agent/missingSlotRecovery.js');
const { readCurrentRequiredSlots } = load('agent/toolProvenance.js');
const { matchesDecisionSchema } = load('agent/decisionValidation.js');
const { AGENT_TOOLS } = load('agent/tools.js');
const { sequelize } = load('config/database.js');
const user = { id: '44444444-4444-4444-8444-444444444444', roles: ['CUSTOMER'], email: 'offline@example.test', fullName: 'OFFLINE' };
const config = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true', OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: 'MOCK_ONLY' };
const text = 'Lập lịch trình; Nơi xuất phát: Hà Nội; Điểm đến: Quy Nhơn; Ngày bắt đầu: 2038-03-10; Ngày kết thúc: 2038-03-12; Số người lớn: 2; Ngân sách cả nhóm: 7000000 VND; Phương tiện: xe máy';
const incomplete = text.replace('; Phương tiện: xe máy', '');
const plan = { kind: 'tool', name: 'plan_trip', arguments: { departureCity: 'Hà Nội', destinationCity: 'Quy Nhơn', startDate: '2038-03-10', endDate: '2038-03-12', adults: 2, totalBudget: 7000000, transportation: 'motorbike' } };
const envelope = raw => new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(raw) }, prompt_eval_count: 100, eval_count: 20 }));
const flush = async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); };
const settle = promise => promise.then(value => ({ ok: true, value }), error => ({ ok: false, error }));
const cases = [], observations = [], traces = [];
const test = (name, run) => cases.push([name, run]);
const code = expected => error => error.code === expected;
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });

class LogicalClock {
  constructor() { this.now = 0; this.id = 0; this.jobs = new Map(); this.events = []; }
  install() {
    this.oldSet = globalThis.setTimeout; this.oldClear = globalThis.clearTimeout;
    globalThis.setTimeout = (fn, ms, ...args) => { const id = ++this.id; this.jobs.set(id, { at: this.now + ms, fn: () => fn(...args) }); this.events.push({ at: this.now, event: 'timer_scheduled', id, delayMs: ms }); return id; };
    globalThis.clearTimeout = id => { this.jobs.delete(id); this.events.push({ at: this.now, event: 'timer_cleared', id }); };
  }
  async advance(ms) {
    const target = this.now + ms;
    for (;;) {
      const due = [...this.jobs].filter(([, job]) => job.at <= target).sort((a,b) => a[1].at-b[1].at || a[0]-b[0])[0];
      if (!due) break;
      this.now = due[1].at; this.jobs.delete(due[0]); due[1].fn(); await flush();
    }
    this.now = target; await flush();
  }
  restore() { globalThis.setTimeout = this.oldSet; globalThis.clearTimeout = this.oldClear; }
}
async function withClock(run) {
  const clock = new LogicalClock(); clock.install();
  try { await run(clock); assert.equal(clock.jobs.size, 0, 'All logical timers cleaned up'); }
  finally { clock.restore(); }
}
function service(provider, extra = {}) {
  const calls = [];
  const svc = new AgentOrchestrator({ provider, readConsent: async () => ({ personalizationEnabled: false }),
    tools: { execute: async decision => { calls.push(decision); return { type: 'MOCK_ONLY', source: 'MOCK_ONLY' }; } }, ...extra });
  return { svc, calls };
}

test('outer 15000ms deadline propagates abort to cooperative fetch; no response, recovery or tool', async () => withClock(async clock => {
  let fetchCalls = 0, aborted = false, finalError;
  const real = createConfiguredProvider(config, async (_url, init) => {
    fetchCalls++;
    return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => { aborted = true; clock.events.push({ at: clock.now, event: 'fetch_abort_received' }); reject(Error('MOCK_ONLY fetch aborted')); }, { once: true }));
  });
  const wrapped = { configured: true, external: false, generate: async (input, signal) => {
    try { return await real.generate(input, signal); } catch (error) { finalError = error; throw error; }
  } };
  const h = service(wrapped), result = settle(h.svc.chat(user, { message: incomplete }));
  await flush(); assert.equal(fetchCalls, 1);
  await clock.advance(14999); assert.equal(aborted, false);
  await clock.advance(1);
  const out = await result; assert.equal(out.ok, false); assert.equal(out.error.code, 'AGENT_TIMEOUT');
  assert.equal(aborted, true); assert.equal(finalError.code, 'AGENT_TIMEOUT'); assert.equal(h.calls.length, 0);
  assert.ok(clock.events.filter(x => x.event === 'timer_scheduled' && x.delayMs === 15000).length >= 2);
  traces.push({ test: 'cooperative abort', logicalOnly: true, events: clock.events, serviceError: out.error.code, toolCalls: 0 });
}));

test('standalone provider keeps its own 15000ms timeout with a never-aborted caller signal', async () => withClock(async clock => {
  let aborted = false;
  const real = createConfiguredProvider(config, async (_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener('abort', () => { aborted = true; reject(Error('MOCK_ONLY abort')); }, { once: true });
  }));
  const result = settle(real.generate({ system: 'MOCK_ONLY', messages: [{ role: 'user', content: 'technical' }], tools: AGENT_TOOLS }, new AbortController().signal));
  await flush(); // Settle synthetic readiness GETs at logical time zero before advancing the standalone provider deadline.
  await clock.advance(15000); const out = await result;
  assert.equal(aborted, true); assert.equal(out.ok, false); assert.equal(out.error.code, 'AGENT_TIMEOUT');
  assert.equal(LIVE_LIMITS.timeoutMs, 15000);
}));

test('already-aborted request never reaches fake fetch', async () => {
  let calls = 0; const caller = new AbortController(); caller.abort();
  const real = createConfiguredProvider(config, async () => { calls++; return envelope(plan); });
  await assert.rejects(real.generate({ system: 'MOCK_ONLY', messages: [{ role: 'user', content: text }], tools: AGENT_TOOLS }, caller.signal), code('AGENT_TIMEOUT'));
  assert.equal(calls, 0);
});

test('body-read abort also produces timeout without fallback execution', async () => withClock(async clock => {
  let bodyAborted = false;
  const real = createConfiguredProvider(config, async (_url, init) => new Response(new ReadableStream({ start(controller) {
    init.signal.addEventListener('abort', () => { bodyAborted = true; controller.error(Error('MOCK_ONLY body aborted')); }, { once: true });
  } })));
  const h = service(real), result = settle(h.svc.chat(user, { message: incomplete }));
  await flush(); await clock.advance(15000); const out = await result;
  assert.equal(out.ok, false); assert.equal(out.error.code, 'AGENT_TIMEOUT'); assert.equal(bodyAborted, true); assert.equal(h.calls.length, 0);
}));

test('uncooperative fetch cannot cause late tool execution; concurrency slot remains held until actual settlement', async () => withClock(async clock => {
  let resolveFirst, fetchCalls = 0, firstSignal, lateProviderDecision = null;
  const limits = new AgentLimits(20, 1); // Test seam only; production defaults unchanged.
  const real = createConfiguredProvider(config, async (_url, init) => {
    fetchCalls++; if (fetchCalls === 1) { firstSignal = init.signal; return new Promise(resolve => { resolveFirst = resolve; }); }
    return envelope(plan);
  });
  const provider = { configured: true, external: false, generate: async (input, signal) => {
    const raw = await real.generate(input, signal); if (fetchCalls === 1) lateProviderDecision = raw; return raw;
  } };
  const h = service(provider, { limits }), first = settle(h.svc.chat(user, { message: text }));
  await flush(); await clock.advance(15000);
  assert.equal((await first).error.code, 'AGENT_TIMEOUT'); assert.equal(firstSignal.aborted, true); assert.equal(h.calls.length, 0);
  await assert.rejects(h.svc.chat(user, { message: text }), code('AGENT_BUSY')); assert.equal(fetchCalls, 1);
  resolveFirst(envelope(plan)); await flush();
  assert.equal(h.calls.length, 0); // Late provider result cannot resume a rejected Promise.race.
  observations.push({ kind: 'DIAGNOSTIC_NOT_ACCEPTANCE', condition: 'Injected fetch ignores abort then returns a valid response',
    providerReturnedDecisionAfterAbort: lateProviderDecision !== null,
    sourceGap: 'No success-path signal check after await fetch/body; outer service still prevents late tool execution.',
    actualOllamaClaim: 'Not proof of native fetch/server behavior. Historical server cancellation is analyzed separately.' });
  const next = await h.svc.chat(user, { message: text });
  assert.equal(next.status, 'completed'); assert.equal(fetchCalls, 2); assert.equal(h.calls.length, 1);
}));

test('network failures keep their safe error and never become needs_input', async () => {
  const real = createConfiguredProvider(config, async () => { throw Error('MOCK_ONLY network failure'); });
  const h = service(real); await assert.rejects(h.svc.chat(user, { message: incomplete }), code('AGENT_PROVIDER_NETWORK')); assert.equal(h.calls.length, 0);
});

test('one/multiple missing-only raw tool outputs retain model failure while recovery asks exact fields', async () => {
  for (const id of ['S01', 'M03']) {
    const folder = id === 'S01' ? 't-ai-04-g1-slot-filling-live-revalidation' : 't-ai-04-g1-missing-slot-live-check';
    const previous = JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence', folder, id + '.json')));
    const raw = JSON.parse(previous.rawModelDecision); let rejected, fakeCalls = 0;
    const real = createConfiguredProvider(config, async () => { fakeCalls++; return envelope(raw); });
    const h = service({ configured: true, external: false, generate: async (input, signal) => {
      try { return await real.generate(input, signal); } catch (error) { rejected = error; throw error; }
    } });
    const result = await h.svc.chat(user, previous.request);
    assert.equal(matchesDecisionSchema(raw), false); assert.equal(rejected instanceof MissingReadSlotsRejection, true);
    assert.equal(result.status, 'needs_input'); assert.deepEqual(result.missingFields, previous.expected.fields);
    assert.equal(h.calls.length, 0); assert.equal(fakeCalls, 1); assert.equal(previous.nlu, 'FAIL');
  }
});

test('complete tool arguments/provenance still allow exactly one fake read tool', async () => {
  const h = service(createConfiguredProvider(config, async () => envelope(plan)));
  const result = await h.svc.chat(user, { message: text });
  assert.equal(result.status, 'completed'); assert.deepEqual(h.calls, [plan]);
});

test('unknown/malformed model output cannot opt into recovery', async () => {
  for (const raw of [{ kind: 'tool', name: 'save_trip', arguments: {} }, { kind: 'tool', name: 'plan_trip' }, 'MALFORMED_JSON']) {
    const real = createConfiguredProvider(config, async () => raw === 'MALFORMED_JSON'
      ? new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: '{bad' }, prompt_eval_count: 1, eval_count: 1 }))
      : envelope(raw));
    const h = service(real); await assert.rejects(h.svc.chat(user, { message: incomplete }), code('AGENT_INVALID_PROVIDER_OUTPUT')); assert.equal(h.calls.length, 0);
  }
});

test('negation/unset stay outside deterministic recovery; no grammar expansion', async () => {
  const partial = { ...plan, arguments: Object.fromEntries(Object.entries(plan.arguments).filter(([name]) => name !== 'transportation')) };
  for (const suffix of ['; Phương tiện: chưa chọn', '; Tôi không đi ô tô.', '; Tôi không đi Quy Nhơn.']) {
    assert.equal(readCurrentRequiredSlots(incomplete + suffix), null);
    assert.equal(classifyMissingReadSlots(partial, incomplete + suffix), null);
    const h = service(createConfiguredProvider(config, async () => envelope(partial)));
    await assert.rejects(h.svc.chat(user, { message: incomplete + suffix }), code('AGENT_INVALID_PROVIDER_OUTPUT')); assert.equal(h.calls.length, 0);
  }
});

test('client history is not trusted current-turn provenance, including another account', async () => {
  const real = createConfiguredProvider(config, async () => envelope(plan));
  for (const account of [user, { ...user, id: '55555555-5555-4555-8555-555555555555' }]) {
    const h = service(real), result = await h.svc.chat(account, { history: [{ role: 'user', content: text }, { role: 'assistant', content: 'Đã chọn xe máy' }], message: incomplete });
    assert.equal(result.status, 'needs_input'); assert.deepEqual(result.missingFields, ['transportation']); assert.equal(h.calls.length, 0);
  }
});

test('auth/consent/rate gates keep normal ordering and no bypass', async () => {
  let providerCalls = 0, consentCalls = 0;
  const real = createConfiguredProvider(config, async () => { providerCalls++; return envelope({ kind: 'unsupported' }); });
  const h = service(real, { readConsent: async () => { consentCalls++; return { personalizationEnabled: false }; }, limits: new AgentLimits(1) });
  await assert.rejects(h.svc.chat(undefined, { message: text }), code('AUTH_REQUIRED')); assert.equal(consentCalls, 0);
  await h.svc.chat(user, { message: text }); await assert.rejects(h.svc.chat(user, { message: text }), code('AGENT_RATE_LIMITED'));
  assert.equal(providerCalls, 1);
  const external = service({ configured: true, external: true, generate: async () => { throw Error('NO PROVIDER CALL'); } });
  await assert.rejects(external.svc.chat(user, { message: text }), code('AGENT_EXTERNAL_CONSENT_REQUIRED'));
  const badConsent = service(real, { readConsent: async () => { throw Error('MOCK_ONLY DB not accessed'); } });
  await assert.rejects(badConsent.svc.chat(user, { message: text }), code('AGENT_CONSENT_UNAVAILABLE')); assert.equal(providerCalls, 1);
});

test('grammar coverage probe makes no general Vietnamese NLU claim', () => {
  const inputs = [
    { label: 'structured incomplete', message: incomplete, recognized: true },
    { label: 'structured complete', message: text, recognized: true },
    { label: 'natural prose', message: 'Tôi muốn đi Quy Nhơn ba ngày với hai người, ngân sách bảy triệu.', recognized: false },
    { label: 'short follow-up', message: 'Xe máy nhé.', recognized: false },
    { label: 'explicit unset', message: incomplete + '; Phương tiện: chưa chọn', recognized: false },
    { label: 'mixed intents', message: incomplete + '; Tìm địa điểm', recognized: false },
    { label: 'mutation', message: incomplete + '; lưu Trip', recognized: false },
  ];
  const rows = inputs.map(item => {
    const context = readCurrentRequiredSlots(item.message); assert.equal(!!context, item.recognized);
    const spec = context ? AGENT_TOOLS.find(x => x.name === context.toolName) : null;
    return { label: item.label, input: item.message, recognized: !!context,
      missingObservedFieldsOnly: spec ? spec.parameters.required.filter(field => context.values[field] === undefined) : null,
      note: 'Observation coverage only, not a production pre-decision policy or LLM score' };
  });
  observations.push({ kind: 'GRAMMAR_COVERAGE', rows });
});

async function main() {
  const source = fs.readFileSync(__filename);
  write('diagnostic-plan-lock.json', { tier: 'MOCK_ONLY_OFFLINE', lockedAt: new Date().toISOString(), testNames: cases.map(x => x[0]),
    diagnosticSha256: crypto.createHash('sha256').update(source).digest('hex'), productionTimeoutMs: LIVE_LIMITS.timeoutMs,
    inferencePosts: 0, limits: 'Logical clock/fake fetch only; production configuration/source unchanged' });
  const originalFetch = globalThis.fetch, originalQuery = sequelize.query;
  globalThis.fetch = async () => { throw Error('LIVE network forbidden in offline diagnostics'); };
  sequelize.query = async () => { throw Error('DB forbidden in offline diagnostics'); };
  const results = [];
  try {
    for (const [name, run] of cases) {
      try { await run(); results.push({ name, status: 'PASS' }); }
      catch (error) { results.push({ name, status: 'FAIL', message: String(error.stack || error) }); }
    }
  } finally { globalThis.fetch = originalFetch; sequelize.query = originalQuery; }
  const output = { tier: 'MOCK_ONLY_OFFLINE', passed: results.filter(x => x.status === 'PASS').length, failed: results.filter(x => x.status === 'FAIL').length,
    results, observations, traces, inferencePosts: 0, databaseAccess: 'NONE', actualOllamaInference: 'NOT RUN' };
  write('offline-diagnostic-results.json', output);
  console.log(JSON.stringify({ passed: output.passed, failed: output.failed, observations: observations.map(x => ({ kind: x.kind, providerReturnedDecisionAfterAbort: x.providerReturnedDecisionAfterAbort })), inferencePosts: 0 }));
  if (output.failed) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
