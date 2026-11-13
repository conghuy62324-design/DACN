// MOCK_ONLY. No Ollama inference, external network, real tool or PostgreSQL query.
import assert from 'node:assert/strict';
import { createConfiguredProvider, LIVE_LIMITS, SAFE_PROVIDER_ERRORS, type ProviderTrace } from '../agent/liveProvider.js';
import { OLLAMA_READINESS_TIMEOUT_MS } from '../agent/ollamaReadiness.js';
import { AgentOrchestrator } from '../services/agentService.js';
import { AgentLimits } from '../agent/limits.js';
import { withinDeadline, JsonLlmProvider } from '../agent/provider.js';
import { AGENT_TOOLS } from '../agent/tools.js';
import { MissingReadSlotsRejection } from '../agent/missingSlotRecovery.js';
import { sequelize } from '../config/database.js';
import type { AuthUser } from '../types/auth.js';
import express from 'express';
import { createServer, request } from 'node:http';
import { createAgentRouter } from '../routes/agentRoutes.js';
import { signAccessToken } from '../services/tokenService.js';

const digest = 'a'.repeat(64), model = 'MOCK_ONLY_model';
const env = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
  OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: model, OLLAMA_MODEL_DIGEST: digest };
const user: AuthUser = { id: '44444444-4444-4444-8444-444444444444', email: 'ACCOUNT_CANARY', fullName: 'NAME_CANARY', roles: ['CUSTOMER'] };
const text = 'Tìm địa điểm; Điểm đến: Huế; Ngân sách mỗi người mỗi ngày: 410000 VND';
const decision = { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'Huế', dailyBudgetPerPerson: 410000 } };
const input = { system: 'PROMPT_CANARY JWT_CANARY postgres://DB_CANARY', messages: [{ role: 'user' as const, content: text }], tools: AGENT_TOOLS };
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status });
const envelope = (raw: unknown = decision) => json({ done: true, done_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(raw) }, prompt_eval_count: 20, eval_count: 10 });
const row = () => ({ name: model, model, digest, context_length: 16384, size: 2000, size_vram: 1000, expires_at: new Date(Date.now() + 300000).toISOString() });
const ready = (url: string) => url.endsWith('/version') ? json({ version: 'MOCK_ONLY' }) : json({ models: [row()] });
const code = (expected: string) => (e: any) => e.code === expected;
const settle = <T>(p: Promise<T>) => p.then(value => ({ ok: true, value }), error => ({ ok: false, error }));
const flush = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const cases: Array<[string, () => unknown | Promise<unknown>]> = [];
const test = (name: string, run: () => unknown | Promise<unknown>) => cases.push([name, run]);
function harness(override?: (url: string, init: RequestInit) => Promise<Response> | Response, raw: unknown = decision) {
  const calls: { url: string; init: RequestInit }[] = [], traces: ProviderTrace[] = [];
  const provider = createConfiguredProvider(env, (async (url, init) => {
    const target = String(url); calls.push({ url: target, init });
    return override ? override(target, init) : init.method === 'GET' ? ready(target) : envelope(raw);
  }) as typeof fetch, trace => traces.push(trace));
  const tools: unknown[] = [];
  const svc = new AgentOrchestrator({ provider, readConsent: async () => ({ personalizationEnabled: false }),
    tools: { execute: async tool => { tools.push(tool); return { type: 'MOCK_ONLY', source: 'MOCK_ONLY' }; } } });
  return { provider, svc, calls, traces, tools, posts: () => calls.filter(c => c.init.method === 'POST') };
}
class Clock {
  now = 0; id = 0; jobs = new Map<number, { at: number; fn: () => void }>(); oldSet: any; oldClear: any;
  install() {
    this.oldSet = globalThis.setTimeout; this.oldClear = globalThis.clearTimeout;
    globalThis.setTimeout = ((fn: any, ms: number, ...args: any[]) => { const id = ++this.id; this.jobs.set(id, { at: this.now + ms, fn: () => fn(...args) }); return id; }) as any;
    globalThis.clearTimeout = ((id: number) => { this.jobs.delete(id); }) as any;
  }
  async advance(ms: number) {
    const target = this.now + ms;
    for (;;) {
      const due = [...this.jobs].filter(([, x]) => x.at <= target).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!due) break;
      this.now = due[1].at; this.jobs.delete(due[0]); due[1].fn(); await flush();
    }
    this.now = target; await flush();
  }
  restore() { globalThis.setTimeout = this.oldSet; globalThis.clearTimeout = this.oldClear; }
}
async function clocked(run: (clock: Clock) => Promise<void>) {
  const clock = new Clock(); clock.install();
  try { await run(clock); assert.equal(clock.jobs.size, 0, 'timers released after actual settlement'); } finally { clock.restore(); }
}

test('resident model uses only allowlisted sequential GETs then one unchanged inference POST', async () => {
  const h = harness(); assert.deepEqual(await h.provider.generate(input, new AbortController().signal), decision);
  assert.deepEqual(h.calls.map(c => [new URL(c.url).pathname, c.init.method]), [['/api/version', 'GET'], ['/api/tags', 'GET'], ['/api/ps', 'GET'], ['/api/chat', 'POST']]);
  for (const c of h.calls) { assert.equal(new URL(c.url).hostname, '127.0.0.1'); assert.equal(c.init.redirect, 'error'); }
  const body = JSON.parse(String(h.posts()[0].init.body));
  assert.equal(body.format, 'json'); assert.equal(body.stream, false); assert.equal(body.model, model);
  assert.deepEqual(body.options, { temperature: 0, num_predict: 2048, num_ctx: 16384 });
  assert.equal(h.traces.filter(t => t.event === 'provider_completed').length, 1);
});
const metadataFailures: [string, (url: string) => Response, string][] = [
  ['server unavailable', () => { throw Error('JWT_CANARY DB_CANARY'); }, 'AGENT_OLLAMA_READINESS_FAILED'],
  ['HTTP error', () => json({ secret: 'JWT_CANARY' }, 500), 'AGENT_OLLAMA_READINESS_FAILED'],
  ['bad JSON', () => new Response('{invalid JWT_CANARY'), 'AGENT_OLLAMA_READINESS_FAILED'],
  ['version-only is insufficient', url => url.endsWith('/version') ? ready(url) : json({}), 'AGENT_OLLAMA_READINESS_FAILED'],
  ['wrong tag', url => url.endsWith('/tags') ? json({ models: [{ ...row(), name: 'other', model: 'other' }] }) : ready(url), 'AGENT_OLLAMA_NOT_READY'],
  ['wrong pinned digest', url => url.endsWith('/tags') ? json({ models: [{ ...row(), digest: 'b'.repeat(64) }] }) : ready(url), 'AGENT_OLLAMA_NOT_READY'],
  ['resident digest mismatch', url => url.endsWith('/ps') ? json({ models: [{ ...row(), digest: 'b'.repeat(64) }] }) : ready(url), 'AGENT_OLLAMA_NOT_READY'],
  ['model not resident', url => url.endsWith('/ps') ? json({ models: [] }) : ready(url), 'AGENT_OLLAMA_NOT_READY'],
  ['wrong context', url => url.endsWith('/ps') ? json({ models: [{ ...row(), context_length: 4096 }] }) : ready(url), 'AGENT_OLLAMA_NOT_READY'],
  ['missing context', url => url.endsWith('/ps') ? json({ models: [{ ...row(), context_length: undefined }] }) : ready(url), 'AGENT_OLLAMA_NOT_READY'],
  ['expired residency', url => url.endsWith('/ps') ? json({ models: [{ ...row(), expires_at: '2000-01-01T00:00:00Z' }] }) : ready(url), 'AGENT_OLLAMA_NOT_READY'],
  ['invalid allocation metadata', url => url.endsWith('/ps') ? json({ models: [{ ...row(), size_vram: -1 }] }) : ready(url), 'AGENT_OLLAMA_READINESS_FAILED'],
  ['oversized metadata', () => new Response('{}', { headers: { 'content-length': '65537' } }), 'AGENT_OLLAMA_READINESS_FAILED'],
];
for (const [name, response, expected] of metadataFailures) test(`${name}: safe readiness failure, zero POST/tool/retry`, async () => {
  const h = harness(url => response(url));
  await assert.rejects(h.svc.chat(user, { message: text }), (e: any) => code(expected)(e) && e.statusCode === 503 && !String(e).includes('CANARY'));
  assert.equal(h.posts().length, 0); assert.equal(h.tools.length, 0);
  assert.equal(h.calls.filter(c => c.url.endsWith('/version')).length, 1);
  assert.equal(h.traces.some(t => t.event === 'provider_completed' || t.inferenceStarted), false);
  assert.ok(SAFE_PROVIDER_ERRORS.has(expected));
});
test('not-resident trace is distinct and logs contain only safe technical fields', async () => {
  const h = harness(url => url.endsWith('/ps') ? json({ models: [] }) : ready(url));
  await assert.rejects(h.provider.generate(input, new AbortController().signal), code('AGENT_OLLAMA_NOT_READY'));
  assert.ok(h.traces.some(t => t.event === 'model_not_resident'));
  assert.ok(h.traces.some(t => t.event === 'readiness_check_failed' && t.reason === 'not_resident'));
  assert.ok(!/CANARY|Huế|410000|arguments|messages|MOCK_ONLY_model/.test(JSON.stringify(h.traces)));
  assert.equal(new Set(h.traces.map(t => t.correlationId)).size, 1);
  assert.match(h.traces[0].correlationId, /^[0-9a-f-]{36}$/);
  const next = harness(); await next.provider.generate(input, new AbortController().signal);
  assert.notEqual(next.traces[0].correlationId, h.traces[0].correlationId);
});
test('low or CPU allocation is not rejected using an arbitrary VRAM threshold', async () => {
  const h = harness((url, init) => init.method === 'POST' ? envelope() : url.endsWith('/ps') ? json({ models: [{ ...row(), size_vram: 0 }] }) : ready(url));
  assert.deepEqual(await h.provider.generate(input, new AbortController().signal), decision);
});
test('unpinned operator config still compares installed and resident digest; invalid pin disables provider', async () => {
  const config = { ...env }; delete config.OLLAMA_MODEL_DIGEST;
  const calls: string[] = [];
  const provider = createConfiguredProvider(config, (async (url, init) => { calls.push(String(url)); return init.method === 'GET' ? ready(String(url)) : envelope(); }) as typeof fetch, () => {});
  await provider.generate(input, new AbortController().signal); assert.equal(calls.length, 4);
  assert.equal(createConfiguredProvider({ ...env, OLLAMA_MODEL_DIGEST: 'invalid' }).configured, false);
});
test('readiness GET timeout is safe 503, not schema or missing-user error', async () => clocked(async clock => {
  const h = harness((_url, init) => new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(Error('abort')), { once: true })));
  const out = settle(h.svc.chat(user, { message: text })); await flush();
  await clock.advance(OLLAMA_READINESS_TIMEOUT_MS - 1); assert.equal(h.calls[0].init.signal.aborted, false);
  await clock.advance(1); assert.equal((await out as any).error.code, 'AGENT_OLLAMA_READINESS_FAILED');
  assert.equal(h.posts().length, 0); assert.equal(h.tools.length, 0);
  assert.ok(h.traces.some(t => t.reason === 'deadline' && !t.inferenceStarted));
}));
test('uncooperative GET returns API deadline; slot held until real GET settles, no POST', async () => clocked(async clock => {
  let resolve!: (r: Response) => void;
  const h = harness(() => new Promise(r => { resolve = r; })), limits = new AgentLimits(20, 1);
  const result = settle(withinDeadline(signal => limits.providerCall(() => h.provider.generate(input, signal)), LIVE_LIMITS.timeoutMs));
  await flush(); await clock.advance(15000);
  assert.equal((await result as any).error.code, 'AGENT_TIMEOUT');
  await assert.rejects(limits.providerCall(async () => 1), code('AGENT_BUSY'));
  resolve(ready('/version')); await flush();
  assert.equal(await limits.providerCall(async () => 2), 2); assert.equal(h.posts().length, 0);
}));
test('already-aborted request performs no GET or POST', async () => {
  const h = harness(), controller = new AbortController(); controller.abort();
  await assert.rejects(h.provider.generate(input, controller.signal), code('AGENT_TIMEOUT')); assert.equal(h.calls.length, 0);
});
test('late uncooperative fetch rejects provider; API returns at deadline, no late tool, slot held', async () => clocked(async clock => {
  let release!: (r: Response) => void; let returned = 0, rejected: any;
  const h = harness((url, init) => init.method === 'GET' ? ready(url) : new Promise(r => { release = r; }));
  const limits = new AgentLimits(20, 1), tools: unknown[] = [];
  const svc = new AgentOrchestrator({ limits, readConsent: async () => ({ personalizationEnabled: false }),
    provider: { configured: true, generate: async (req, signal) => { try { const raw = await h.provider.generate(req, signal); returned++; return raw; } catch (e) { rejected = e; throw e; } } },
    tools: { execute: async raw => { tools.push(raw); return {} as any; } } });
  const result = settle(svc.chat(user, { message: text })); await flush(); assert.equal(h.posts().length, 1);
  await clock.advance(15000); assert.equal((await result as any).error.code, 'AGENT_TIMEOUT');
  await assert.rejects(svc.chat(user, { message: text }), code('AGENT_BUSY'));
  assert.equal(h.posts().length, 1); assert.equal(returned, 0); assert.equal(tools.length, 0);
  release(envelope()); await flush(); assert.equal(rejected.code, 'AGENT_TIMEOUT'); assert.equal(returned, 0); assert.equal(tools.length, 0);
  assert.equal(await limits.providerCall(async () => 'released'), 'released');
  assert.ok(h.traces.some(t => t.event === 'deadline_triggered')); assert.ok(h.traces.some(t => t.event === 'abort_propagated'));
  assert.ok(h.traces.some(t => t.event === 'underlying_fetch_settled' && t.operation === 'inference'));
  assert.equal(h.traces.some(t => t.event === 'provider_completed'), false);
}));
test('late response body ignoring abort cannot yield success or release slot early', async () => clocked(async clock => {
  let body!: ReadableStreamDefaultController<Uint8Array>;
  const h = harness((url, init) => init.method === 'GET' ? ready(url) : new Response(new ReadableStream({ start(c) { body = c; } })));
  const limits = new AgentLimits(20, 1); let providerResult: any;
  const result = settle(withinDeadline(signal => limits.providerCall(async () => {
    providerResult = await settle(h.provider.generate(input, signal)); if (!providerResult.ok) throw providerResult.error; return providerResult.value;
  }), 15000));
  await flush(); await clock.advance(15000); assert.equal((await result as any).error.code, 'AGENT_TIMEOUT');
  await assert.rejects(limits.providerCall(async () => 1), code('AGENT_BUSY'));
  body.enqueue(new TextEncoder().encode(await envelope().text())); body.close(); await flush();
  assert.equal(providerResult.ok, false); assert.equal(providerResult.error.code, 'AGENT_TIMEOUT');
  assert.equal(await limits.providerCall(async () => 1), 1); assert.equal(h.posts().length, 1);
  assert.equal(h.traces.some(t => t.event === 'provider_completed'), false);
}));
test('standalone provider keeps 15000ms abort, does not retry', async () => clocked(async clock => {
  const h = harness((url, init) => init.method === 'GET' ? ready(url) : new Promise((_r, reject) => init.signal.addEventListener('abort', () => reject(Error('abort')))));
  const out = settle(h.provider.generate(input, new AbortController().signal)); await flush(); await clock.advance(15000);
  assert.equal((await out as any).error.code, 'AGENT_TIMEOUT'); assert.equal(h.posts().length, 1);
}));
test('Gemini has no readiness GET and preserves countTokens/schema/consent', async () => {
  const calls: any[] = [], traces: ProviderTrace[] = [];
  const provider = createConfiguredProvider({ LLM_PROVIDER: 'gemini', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
    LLM_EXTERNAL_PROCESSING_APPROVED: 'true', GEMINI_MODEL: 'MOCK_ONLY', GEMINI_API_KEY: 'KEY_CANARY' }, (async (url, init) => {
    calls.push({ url, init }); return json(String(url).endsWith('countTokens') ? { totalTokens: 100 } : { candidates: [{ finishReason: 'STOP', content: { parts: [{ text: '{"kind":"unsupported"}' }] } }] });
  }) as typeof fetch, t => traces.push(t));
  const svc = new AgentOrchestrator({ provider, readConsent: async () => { throw Error('must not read'); } });
  await assert.rejects(svc.chat(user, { message: text }), code('AGENT_EXTERNAL_CONSENT_REQUIRED')); assert.equal(calls.length, 0);
  assert.deepEqual(await provider.generate(input, new AbortController().signal), { kind: 'unsupported' });
  assert.equal(calls.length, 2); assert.ok(calls.every(c => c.init.method === 'POST'));
  assert.ok(!/CANARY/.test(JSON.stringify(traces)));
});
test('auth then quota/consent stay before readiness; not-ready still consumes normal request quota', async () => {
  const h = harness(url => url.endsWith('/ps') ? json({ models: [] }) : ready(url)); let consentReads = 0;
  const svc = new AgentOrchestrator({ provider: h.provider, limits: new AgentLimits(1), readConsent: async () => { consentReads++; return { personalizationEnabled: false }; } });
  await assert.rejects(svc.chat(undefined, { message: text }), code('AUTH_REQUIRED')); assert.equal(consentReads, 0); assert.equal(h.calls.length, 0);
  await assert.rejects(svc.chat(user, { message: text }), code('AGENT_OLLAMA_NOT_READY')); assert.equal(consentReads, 1);
  await assert.rejects(svc.chat(user, { message: text }), code('AGENT_RATE_LIMITED')); assert.equal(consentReads, 1); assert.equal(h.calls.length, 3);
  const badConsent = new AgentOrchestrator({ provider: h.provider, readConsent: async () => { throw Error('DB_CANARY'); } });
  await assert.rejects(badConsent.chat(user, { message: text }), code('AGENT_CONSENT_UNAVAILABLE')); assert.equal(h.calls.length, 3);
});
test('client readiness bypass flag is rejected before provider', async () => {
  const h = harness(); await assert.rejects(h.svc.chat(user, { message: text, skipReadiness: true }), code('AGENT_INVALID_INPUT')); assert.equal(h.calls.length, 0);
});
test('current-turn G1 gate still blocks inferred tool args and one read tool succeeds with proof', async () => {
  const h = harness(); const missing: any = await h.svc.chat(user, { message: 'Tìm địa điểm; Điểm đến: Huế' });
  assert.equal(missing.status, 'needs_input'); assert.deepEqual(missing.missingFields, ['dailyBudgetPerPerson']); assert.equal(h.tools.length, 0);
  const ok = await h.svc.chat(user, { message: text }); assert.equal(ok.status, 'completed'); assert.equal(h.tools.length, 1);
});
test('original schema/typed missing-slot recovery preserved after readiness; no execution', async () => {
  const h = harness(undefined, { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'Huế' } });
  const message = 'Tìm địa điểm; Điểm đến: Huế';
  await assert.rejects(h.provider.generate({ ...input, messages: [{ role: 'user', content: message }] }, new AbortController().signal), e => e instanceof MissingReadSlotsRejection);
  const out: any = await h.svc.chat(user, { message }); assert.equal(out.status, 'needs_input'); assert.deepEqual(out.missingFields, ['dailyBudgetPerPerson']); assert.equal(h.tools.length, 0);
});
test('mock clarify path performs no readiness or network; existing deterministic response remains', async () => {
  const mock = new JsonLlmProvider(async () => '{"kind":"clarify","fields":["destinationCity"]}');
  const svc = new AgentOrchestrator({ provider: mock, readConsent: async () => ({ personalizationEnabled: false }) });
  const out: any = await svc.chat(user, { message: 'Tìm địa điểm' }); assert.equal(out.status, 'needs_input'); assert.deepEqual(out.missingFields, ['destinationCity']);
});
test('malformed/unknown/mutation decisions cannot become tool execution', async () => {
  for (const raw of [{ kind: 'tool', name: 'save_trip', arguments: {} }, { kind: 'tool', name: 'search_places' }, { kind: 'clarify', fields: ['children'] }]) {
    const h = harness(undefined, raw); await assert.rejects(h.svc.chat(user, { message: text }), code('AGENT_INVALID_PROVIDER_OUTPUT')); assert.equal(h.tools.length, 0); assert.equal(h.posts().length, 1);
  }
});
test('trace sink failure cannot change valid decision and no credentials enter events', async () => {
  const provider = createConfiguredProvider(env, (async (url, init) => init.method === 'GET' ? ready(String(url)) : envelope()) as typeof fetch, () => { throw Error('LOG_CANARY'); });
  assert.deepEqual(await provider.generate(input, new AbortController().signal), decision);
});
test('API exposes safe readiness 503/code, no raw metadata or missingFields, no inference', async () => {
  for (const expected of ['AGENT_OLLAMA_NOT_READY', 'AGENT_OLLAMA_READINESS_FAILED']) {
    const h = harness(url => expected === 'AGENT_OLLAMA_READINESS_FAILED' ? new Response('JWT_CANARY', { status: 500 }) : url.endsWith('/ps') ? json({ models: [] }) : ready(url));
    const app = express(); app.use(express.json()); app.use('/api/agent', createAgentRouter(h.svc));
    const server = createServer(app); await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
    try {
      const port = (server.address() as any).port;
      const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const req = request({ hostname: '127.0.0.1', port, path: '/api/agent/chat', method: 'POST', headers: {
          'Content-Type': 'application/json', Authorization: `Bearer ${signAccessToken(user)}`,
        } }, res => { let body = ''; res.on('data', chunk => { body += chunk; }); res.on('end', () => resolve({ status: res.statusCode!, body })); });
        req.on('error', reject); req.end(JSON.stringify({ message: text }));
      });
      assert.equal(response.status, 503); const body = JSON.parse(response.body); assert.equal(body.code, expected);
      assert.ok(!/CANARY|stack|missingFields|models|digest/.test(response.body));
      assert.equal(h.posts().length, 0); assert.equal(h.tools.length, 0);
    } finally { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); }
  }
});
test('late fetch cleanup cancellation is awaited for slot accounting while API already timed out', async () => clocked(async clock => {
  let resolveFetch!: (r: Response) => void, finishCancel!: () => void;
  const h = harness((url, init) => init.method === 'GET' ? ready(url) : new Promise(r => { resolveFetch = r; }));
  const limits = new AgentLimits(20, 1); let finished = false;
  const out = settle(withinDeadline(signal => limits.providerCall(async () => {
    try { return await h.provider.generate(input, signal); } finally { finished = true; }
  }), 15000));
  await flush(); await clock.advance(15000); assert.equal((await out as any).error.code, 'AGENT_TIMEOUT');
  resolveFetch(new Response(new ReadableStream({ cancel() { return new Promise<void>(r => { finishCancel = r; }); } })));
  await flush(); assert.equal(finished, false); await assert.rejects(limits.providerCall(async () => 1), code('AGENT_BUSY'));
  finishCancel(); await flush(); assert.equal(finished, true); assert.equal(await limits.providerCall(async () => 1), 1);
  assert.equal(h.traces.some(t => t.event === 'provider_completed'), false);
}));

async function main() {
  const originalFetch = globalThis.fetch, originalQuery = sequelize.query;
  globalThis.fetch = async () => { throw Error('LIVE network forbidden'); };
  sequelize.query = async () => { throw Error('DB forbidden'); };
  const results: unknown[] = []; let failed = 0;
  try { for (const [name, run] of cases) {
    try { await run(); results.push({ name, status: 'PASS' }); }
    catch (e: any) { failed++; results.push({ name, status: 'FAIL', error: String(e.stack || e) }); }
  } } finally { globalThis.fetch = originalFetch; sequelize.query = originalQuery; }
  console.log(JSON.stringify({ suite: 'readiness-abort-guard', tier: 'MOCK_ONLY_OFFLINE', passed: cases.length - failed, failed,
    liveRequests: 0, database: 'NOT USED', timeoutMs: LIVE_LIMITS.timeoutMs, results }, null, 2));
  if (failed) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
