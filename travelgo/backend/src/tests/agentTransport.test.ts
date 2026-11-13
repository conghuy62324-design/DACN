// MOCK_ONLY: synthetic fetch responses and local HTTP server, never a live model.
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { createConfiguredProvider, localOllamaUrl, LIVE_LIMITS } from '../agent/liveProvider.js';
import { AgentLimits } from '../agent/limits.js';
import { AgentOrchestrator } from '../services/agentService.js';
import { EXTERNAL_CONSENT_VERSION } from '../agent/privacy.js';
import { readConversation } from '../agent/conversation.js';
import { HttpError } from '../utils/httpError.js';
import { DECISION_SCHEMA, GEMINI_DECISION_SCHEMA } from '../agent/decisionSchema.js';
import { AGENT_TOOLS } from '../agent/tools.js';
import express from 'express';
import { createAgentRouter } from '../routes/agentRoutes.js';
import { signAccessToken } from '../services/tokenService.js';
import type { AuthUser } from '../types/auth.js';

const gemini = { LLM_PROVIDER: 'gemini', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
  LLM_EXTERNAL_PROCESSING_APPROVED: 'true', GEMINI_MODEL: 'MOCK_ONLY_model', GEMINI_API_KEY: 'MOCK_ONLY_SECRET_CANARY' };
const ollama = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
  OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: 'MOCK_ONLY_model' };
const input = { system: 'System test. No personal data.', messages: [{ role: 'user' as const, content: 'Tìm nơi du lịch' }], tools: AGENT_TOOLS };
const clarify = { kind: 'clarify', fields: ['destinationCity'] };
const signal = () => new AbortController().signal;
const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const geminiEnvelope = (decision: unknown = clarify) => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(decision) }] } }] });
const ollamaEnvelope = (decision: unknown = clarify) => ({ message: { role: 'assistant', content: JSON.stringify(decision) }, done: true, done_reason: 'stop', prompt_eval_count: 20, eval_count: 12 });
const user: AuthUser = { id: '11111111-aaaa-4111-8111-111111111111', email: 'PRIVATE_ACCOUNT@example.test', fullName: 'PRIVATE_NAME', roles: ['CUSTOMER'] };
const errorCode = (code: string) => (e: any) => e.code === code && !String(e).includes('CANARY');
const cases: Array<[string, () => unknown | Promise<unknown>]> = [];
const test = (name: string, run: () => unknown | Promise<unknown>) => cases.push([name, run]);

test('configuration gates never fetch or enable a default model', () => {
  let calls = 0; const noFetch = (async () => { calls++; throw Error('must not fetch'); }) as typeof fetch;
  for (const config of [{}, { ...gemini, LLM_LIVE_ENABLED: 'false' }, { ...gemini, LLM_USAGE_APPROVED: '' },
    { ...gemini, GEMINI_API_KEY: '' }, { ...gemini, GEMINI_MODEL: '' }, { ...gemini, LLM_EXTERNAL_PROCESSING_APPROVED: '' },
    { ...gemini, GEMINI_MODEL: '../../redirect' }, { ...ollama, OLLAMA_LOCAL_ONLY_CONFIRMED: '' },
    { ...ollama, OLLAMA_MODEL: 'model-cloud' }, { ...ollama, LLM_PROVIDER: 'unknown' }]) {
    assert.equal(createConfiguredProvider(config, noFetch).configured, false);
  }
  assert.equal(createConfiguredProvider(gemini, noFetch).configured, true); assert.equal(calls, 0);
});
test('Ollama loopback allowlist rejects remote endpoints and credential/path tricks', () => {
  assert.equal(localOllamaUrl('http://localhost:11434'), 'http://127.0.0.1:11434');
  assert.equal(localOllamaUrl('http://[::1]:11434'), 'http://[::1]:11434');
  for (const url of ['https://example.test', 'http://192.168.1.2', 'http://127.0.0.1.evil', 'http://user:pass@localhost', 'http://localhost/api', 'http://localhost/?key=x', 'http://localhost/#x', 'file:///tmp/x']) {
    assert.throws(() => localOllamaUrl(url)); assert.equal(createConfiguredProvider({ ...ollama, OLLAMA_BASE_URL: url }).configured, false);
  }
});
test('Gemini request has auth header, schema, roles, exact token check, signal and no URL key', async () => {
  const calls: any[] = [];
  const provider = createConfiguredProvider(gemini, (async (url, options) => {
    calls.push({ url, options, body: JSON.parse(options!.body as string) });
    return json(String(url).endsWith('countTokens') ? { totalTokens: 100 } : geminiEnvelope());
  }) as typeof fetch);
  assert.deepEqual(await provider.generate({ ...input, messages: [...input.messages, { role: 'assistant', content: 'Hỏi thêm' }, ...input.messages] }, signal()), clarify);
  assert.equal(calls.length, 2); assert.ok(calls[0].body.generateContentRequest.systemInstruction);
  assert.deepEqual(calls[1].body.generationConfig.responseJsonSchema, GEMINI_DECISION_SCHEMA);
  assert.ok(!JSON.stringify(GEMINI_DECISION_SCHEMA).includes('exclusiveMinimum'));
  assert.ok(!JSON.stringify(GEMINI_DECISION_SCHEMA).includes('maxLength'));
  assert.equal(calls[1].body.generationConfig.maxOutputTokens, LIVE_LIMITS.outputTokens);
  assert.equal(calls[1].body.contents[1].role, 'model');
  for (const c of calls) {
    assert.ok(!c.url.includes('CANARY')); assert.equal(c.options.headers['x-goog-api-key'], gemini.GEMINI_API_KEY);
    assert.equal(c.options.redirect, 'error'); assert.ok(c.options.signal instanceof AbortSignal);
    assert.ok(!JSON.stringify(c.body).includes('CANARY'));
  }
});
test('Ollama body uses JSON mode, stream false, finite context/output and system message', async () => {
  const provider = createConfiguredProvider(ollama, (async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    const body = JSON.parse(options!.body as string);
    assert.equal(body.stream, false); assert.equal(body.format, 'json');
    assert.equal(body.messages[0].role, 'system'); assert.equal(body.options.num_predict, LIVE_LIMITS.outputTokens);
    assert.equal(body.options.num_ctx, 16384); assert.equal((options!.headers as any)['x-goog-api-key'], undefined);
    return json(ollamaEnvelope());
  }) as typeof fetch);
  assert.deepEqual(await provider.generate(input, signal()), clarify);
});
test('provider 429/5xx/4xx mapped safely without reading upstream diagnostic body', async () => {
  for (const [status, code] of [[429, 'AGENT_PROVIDER_QUOTA'], [500, 'AGENT_PROVIDER_UNAVAILABLE'], [503, 'AGENT_PROVIDER_UNAVAILABLE'], [401, 'AGENT_PROVIDER_REJECTED']] as const) {
    let calls = 0;
    const provider = createConfiguredProvider(ollama, (async () => { calls++; return json({ secret: 'CANARY_KEY' }, status); }) as typeof fetch);
    await assert.rejects(provider.generate(input, signal()), errorCode(code)); assert.equal(calls, 1, 'no automatic retry');
  }
});
test('network errors sanitized, no raw URL or credential', async () => {
  const provider = createConfiguredProvider(gemini, (async () => { throw Error('CANARY secret request'); }) as typeof fetch);
  await assert.rejects(provider.generate(input, signal()), errorCode('AGENT_PROVIDER_NETWORK'));
});
test('malformed outer envelope, inner JSON, unexpected tool calls, truncation rejected', async () => {
  for (const body of ['not-json', JSON.stringify({}), JSON.stringify({ ...ollamaEnvelope(), done: false }),
    JSON.stringify({ ...ollamaEnvelope(), done_reason: 'length' }),
    JSON.stringify({ ...ollamaEnvelope(), message: { role: 'assistant', content: 'bad JSON' } }),
    JSON.stringify({ ...ollamaEnvelope(), message: { role: 'assistant', content: '{}', tool_calls: [{ name: 'save_trip' }] } })]) {
    await assert.rejects(createConfiguredProvider(ollama, (async () => new Response(body)) as typeof fetch).generate(input, signal()), errorCode('AGENT_INVALID_PROVIDER_OUTPUT'));
  }
});
test('Gemini blocked, multiple candidates and non-STOP output rejected', async () => {
  for (const body of [{ promptFeedback: { blockReason: 'SAFETY' } }, { candidates: [] },
    { candidates: [...geminiEnvelope().candidates, ...geminiEnvelope().candidates] },
    { candidates: [{ ...geminiEnvelope().candidates[0], finishReason: 'MAX_TOKENS' }] }]) {
    const p = createConfiguredProvider(gemini, (async url => json(String(url).endsWith('countTokens') ? { totalTokens: 100 } : body)) as typeof fetch);
    await assert.rejects(p.generate(input, signal()), errorCode('AGENT_INVALID_PROVIDER_OUTPUT'));
  }
});
test('content-length and chunked response limits stop oversized bodies', async () => {
  for (const response of [new Response('{}', { headers: { 'content-length': String(LIVE_LIMITS.responseBytes + 1) } }),
    new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(LIVE_LIMITS.responseBytes + 1)); controller.close(); } }))]) {
    await assert.rejects(createConfiguredProvider(ollama, (async () => response) as typeof fetch).generate(input, signal()), errorCode('AGENT_PROVIDER_RESPONSE_TOO_LARGE'));
  }
});
test('input budget rejects before network; exact Gemini count rejects before generation', async () => {
  let calls = 0;
  const provider = createConfiguredProvider(gemini, (async () => { calls++; return json({ totalTokens: 13000 }); }) as typeof fetch);
  await assert.rejects(provider.generate({ ...input, system: 'x'.repeat(14000) }, signal()), errorCode('AGENT_INPUT_TOKEN_LIMIT')); assert.equal(calls, 0);
  await assert.rejects(provider.generate(input, signal()), errorCode('AGENT_INPUT_TOKEN_LIMIT')); assert.equal(calls, 1);
});
test('provider decision must pass existing validators, cannot invent output or call mutation', async () => {
  for (const decision of [{ kind: 'tool', name: 'save_trip', arguments: {} }, { kind: 'tool', name: 'plan_trip', arguments: { destinationCity: 'Đà Nẵng' } },
    { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'Đà Nẵng', dailyBudgetPerPerson: -1 } },
    { kind: 'reply', itinerary: 'FAKE' }, { kind: 'clarify', fields: ['userId'] }]) {
    await assert.rejects(createConfiguredProvider(ollama, (async () => json(ollamaEnvelope(decision))) as typeof fetch).generate(input, signal()), errorCode('AGENT_INVALID_PROVIDER_OUTPUT'));
  }
});
test('AbortSignal relays to fetch and produces timeout, including already-aborted signal', async () => {
  let observed: AbortSignal | undefined;
  const p = createConfiguredProvider(ollama, ((_url, options) => {
    observed = options!.signal as AbortSignal;
    return new Promise((_resolve, reject) => observed!.addEventListener('abort', () => reject(Error('CANARY abort')), { once: true }));
  }) as typeof fetch);
  const outer = new AbortController(); const pending = p.generate(input, outer.signal); outer.abort();
  await assert.rejects(pending, errorCode('AGENT_TIMEOUT')); assert.equal(observed!.aborted, true);
  await assert.rejects(p.generate(input, outer.signal), errorCode('AGENT_TIMEOUT'));
});
test('bounded per-user rate window and expiration, isolated users, bounded memory', () => {
  let now = 0; const limits = new AgentLimits(2, 1, () => now, 2);
  limits.consume('a'); limits.consume('a'); assert.throws(() => limits.consume('a'), errorCode('AGENT_RATE_LIMITED'));
  limits.consume('b'); assert.throws(() => limits.consume('c'), errorCode('AGENT_BUSY'));
  now = 3600001; limits.consume('a'); limits.consume('c');
});
test('concurrent slots release on success/error; never queue unbounded work', async () => {
  const limits = new AgentLimits(20, 1); let resolve!: (v: number) => void;
  const pending = limits.providerCall(() => new Promise<number>(r => { resolve = r; }));
  await assert.rejects(limits.providerCall(async () => 2), errorCode('AGENT_BUSY'));
  resolve(1); assert.equal(await pending, 1);
  await assert.rejects(limits.providerCall(async () => { throw Error('test'); }));
  assert.equal(await limits.providerCall(async () => 3), 3);
});
test('Gemini per-request consent required before consent DB read or external fetch', async () => {
  let calls = 0; let consentReads = 0;
  const provider = createConfiguredProvider(gemini, (async url => {
    calls++; return json(String(url).endsWith('countTokens') ? { totalTokens: 100 } : geminiEnvelope());
  }) as typeof fetch);
  const svc = new AgentOrchestrator({ provider, readConsent: async () => { consentReads++; return { personalizationEnabled: true }; } });
  await assert.rejects(svc.chat(user, { message: 'Hi' }), errorCode('AGENT_EXTERNAL_CONSENT_REQUIRED'));
  assert.equal(calls, 0); assert.equal(consentReads, 0);
  assert.throws(() => readConversation({ message: 'Hi', externalProcessingConsent: true }), errorCode('AGENT_INVALID_INPUT'));
  const response = await svc.chat(user, { message: 'Hi', externalProcessingConsent: EXTERNAL_CONSENT_VERSION });
  assert.equal(response.status, 'needs_input'); assert.equal(calls, 2);
});
test('prompt excludes account/private context and acknowledgement, no shared account state', async () => {
  const captured: string[] = [];
  const provider = createConfiguredProvider(ollama, (async (_url, options) => { captured.push(String(options!.body)); return json(ollamaEnvelope()); }) as typeof fetch);
  const svc = new AgentOrchestrator({ provider, readConsent: async () => ({ personalizationEnabled: false }) });
  await svc.chat(user, { message: 'Tìm khách sạn', externalProcessingConsent: EXTERNAL_CONSENT_VERSION });
  await svc.chat({ ...user, id: 'other-id' }, { message: 'Đi Hội An' });
  for (const body of captured) for (const secret of [user.id, user.email, user.fullName, EXTERNAL_CONSENT_VERSION]) assert.ok(!body.includes(secret));
  assert.ok(!captured[1].includes('Tìm khách sạn'));
});
test('quota and busy errors retain safe HTTP status through orchestrator', async () => {
  const p = createConfiguredProvider(ollama, (async () => json({ secret: 'CANARY' }, 429)) as typeof fetch);
  const svc = new AgentOrchestrator({ provider: p, readConsent: async () => ({ personalizationEnabled: false }) });
  await assert.rejects(svc.chat(user, { message: 'Hi' }), (e: any) => errorCode('AGENT_PROVIDER_QUOTA')(e) && e.statusCode === 429);
});

async function listen(server: Server) { await new Promise<void>(r => server.listen(0, '127.0.0.1', r)); const a = server.address(); assert.ok(a && typeof a !== 'string'); return `http://127.0.0.1:${a.port}`; }
async function close(server: Server) { await new Promise<void>(r => server.close(() => r())); }
test('actual fetch to local fake Ollama HTTP: request/response integration and redirect refused', async () => {
  let redirect = false;
  const server = createServer((req, res) => {
    if (redirect) { res.writeHead(302, { Location: 'http://example.test/never-follow' }); res.end(); return; }
    let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => {
      assert.equal(req.url, '/api/chat'); assert.equal(JSON.parse(body).stream, false);
      res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(ollamaEnvelope()));
    });
  });
  const base = await listen(server);
  try {
    const p = createConfiguredProvider({ ...ollama, OLLAMA_BASE_URL: base });
    assert.deepEqual(await p.generate(input, signal()), clarify);
    redirect = true; await assert.rejects(p.generate(input, signal()), errorCode('AGENT_PROVIDER_NETWORK'));
  } finally { await close(server); }
});
test('HTTP privacy/auth/428/429 responses are safe; bearer tokens never enter provider', async () => {
  const p = createConfiguredProvider(gemini, (async () => json({ secret: 'CANARY' }, 429)) as typeof fetch);
  const app = express(); app.use(express.json());
  app.use('/api/agent', createAgentRouter(new AgentOrchestrator({ provider: p, readConsent: async () => ({ personalizationEnabled: false }) })));
  const server = createServer(app); const base = await listen(server);
  try {
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${signAccessToken(user)}` };
    assert.equal((await fetch(`${base}/api/agent/privacy`)).status, 401);
    const notice = await fetch(`${base}/api/agent/privacy`, { headers }); assert.equal(notice.status, 200);
    assert.equal((await notice.json() as any).data.version, EXTERNAL_CONSENT_VERSION);
    for (const [body, status, code] of [[{ message: 'Hi' }, 428, 'AGENT_EXTERNAL_CONSENT_REQUIRED'],
      [{ message: 'Hi', externalProcessingConsent: EXTERNAL_CONSENT_VERSION }, 429, 'AGENT_PROVIDER_QUOTA']] as const) {
      const response = await fetch(`${base}/api/agent/chat`, { method: 'POST', headers, body: JSON.stringify(body) });
      assert.equal(response.status, status); const data = await response.json() as any;
      assert.equal(data.code, code); assert.equal(data.stack, undefined); assert.ok(!JSON.stringify(data).includes('CANARY'));
    }
  } finally { await close(server); }
});

async function main() {
  const results: any[] = [];
  for (const [name, run] of cases) { await run(); results.push({ name, status: 'PASS' }); }
  console.log(JSON.stringify({ suite: 'T-AI-01-B transport/controls', tier: 'MOCK_ONLY', liveRequests: 0, database: 'NOT USED', passed: results.length, failed: 0, results }, null, 2));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
