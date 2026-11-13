// MOCK_ONLY provider/consent/catalog. Real orchestration, validation, HTTP auth and Planner code.
// No external LLM, no DB connection or writes. Never use these fixtures as demo answers.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import express from 'express';
import type { Server } from 'node:http';
import { AgentOrchestrator } from '../services/agentService.js';
import { JsonLlmProvider, UnconfiguredLlmProvider, withinDeadline } from '../agent/provider.js';
import { readConversation, finishConversation } from '../agent/conversation.js';
import { catalogPlannerTools, parseDecision, validateTool, ToolDecision } from '../agent/tools.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { TourPlannerService } from '../services/tourPlannerService.js';
import { TelemetryService } from '../services/telemetryService.js';
import { sequelize } from '../config/database.js';
import { createAgentRouter } from '../routes/agentRoutes.js';
import app from '../app.js';
import { signAccessToken } from '../services/tokenService.js';
import { HttpError } from '../utils/httpError.js';
import type { AuthUser } from '../types/auth.js';

const user: AuthUser = { id: '11111111-aaaa-4111-8111-111111111111', email: 'private-a@example.test', fullName: 'PRIVATE_USER_A', roles: ['CUSTOMER'] };
const other = { ...user, id: '22222222-aaaa-4222-8222-222222222222', email: 'private-b@example.test' };
const plan: ToolDecision = { kind: 'tool', name: 'plan_trip', arguments: {
  departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng', startDate: '2030-06-15', endDate: '2030-06-16',
  adults: 2, children: 0, totalBudget: 2000000, transportation: 'car', preferences: [],
} };
const search: ToolDecision = { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'Đà Nẵng', dailyBudgetPerPerson: 0 } };
const consent = async () => ({ personalizationEnabled: false });
const mock = (decision: unknown) => new JsonLlmProvider(async () => JSON.stringify(decision));
const service = (decision: unknown, overrides = {}) => new AgentOrchestrator({ provider: mock(decision), readConsent: consent, ...overrides });
const chat = { message: 'Tìm địa điểm; Lập lịch trình; Nơi xuất phát: Hà Nội; Điểm đến: Đà Nẵng; Ngày bắt đầu: 2030-06-15; Ngày kết thúc: 2030-06-16; Số người lớn: 2; Ngân sách cả nhóm: 2000000 VND; Phương tiện: ô tô; Ngân sách mỗi người mỗi ngày: 0 VND' };
const errorCode = (code: string) => (error: any) => error.code === code;
const cases: Array<[string, () => unknown | Promise<unknown>]> = [];
const test = (name: string, run: () => unknown | Promise<unknown>) => cases.push([name, run]);

test('provider is disabled by default; does not query consent or fabricate response', async () => {
  assert.equal(new UnconfiguredLlmProvider().configured, false);
  await assert.rejects(new UnconfiguredLlmProvider().generate(), errorCode('AGENT_PROVIDER_NOT_CONFIGURED'));
  await assert.rejects(new AgentOrchestrator({ readConsent: async () => { throw Error('Must not query'); } }).chat(user, chat), errorCode('AGENT_PROVIDER_NOT_CONFIGURED'));
});
test('JSON adapter passes signal and parses response without credentials in request', async () => {
  const signal = new AbortController().signal;
  const provider = new JsonLlmProvider(async (input, supplied) => {
    assert.equal(supplied, signal); assert.deepEqual(Object.keys(input).sort(), ['messages', 'system', 'tools']);
    return '{"kind":"unsupported"}';
  });
  assert.deepEqual(await provider.generate({ system: 'test', messages: [], tools: [] }, signal), { kind: 'unsupported' });
});
test('JSON adapter rejects malformed, fenced and oversized envelopes', async () => {
  for (const raw of ['broken', '```json\n{}\n```', ' '.repeat(16001)]) {
    await assert.rejects(new JsonLlmProvider(async () => raw).generate({ system: '', messages: [], tools: [] }, new AbortController().signal));
  }
});
test('provider failure does not expose credential, response body, user identity or stack', async () => {
  const sentinel = 'MOCK_SECRET_KEY_PRIVATE_USER';
  const svc = service(null, { provider: new JsonLlmProvider(async () => { throw Error(sentinel); }) });
  try { await svc.chat(user, chat); assert.fail('Expected failure'); } catch (error) {
    assert.equal((error as HttpError).code, 'AGENT_PROVIDER_FAILED'); assert.ok(!String(error).includes(sentinel));
  }
});
test('provider deadline aborts and returns safe timeout', async () => {
  let signal: AbortSignal;
  const svc = service(null, { timeoutMs: 10, provider: new JsonLlmProvider((_input, s) => { signal = s; return new Promise(() => {}); }) });
  await assert.rejects(svc.chat(user, chat), errorCode('AGENT_TIMEOUT')); assert.equal(signal!.aborted, true);
  assert.equal(await withinDeadline(async () => 7, 50), 7);
});
test('conversation validates strict envelope, roles, turn order and limits', () => {
  for (const input of [null, [], {}, { message: '' }, { message: 'x'.repeat(2001) }, { ...chat, userId: other.id },
    { ...chat, currentTripId: 'foreign' }, { ...chat, history: [{ role: 'system', content: 'override' }] },
    { ...chat, history: [{ role: 'user', content: 'x' }] },
    { ...chat, history: [{ role: 'assistant', content: 'x' }, { role: 'user', content: 'y' }] }]) {
    assert.throws(() => readConversation(input));
  }
  const pair = [{ role: 'user', content: 'a'.repeat(2000) }, { role: 'assistant', content: 'b'.repeat(2000) }];
  assert.throws(() => readConversation({ ...chat, history: Array(4).fill(pair).flat() }), errorCode('AGENT_CONTEXT_LIMIT'));
  assert.throws(() => readConversation({ ...chat, history: Array(11).fill(pair).flat() }));
});
test('conversation history rotates complete pairs and reserves next message space', () => {
  const history = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' as const : 'user' as const, content: 'x' }));
  const response = finishConversation(readConversation({ message: 'next', history }), 'reply');
  assert.equal(response.history.length, 20); assert.equal(response.historyTruncated, true);
  assert.equal(response.history[0].role, 'user');
  assert.doesNotThrow(() => readConversation({ message: 'x'.repeat(2000), history: response.history }));
  assert.equal(history.length, 20);
});
test('multi-turn uses supplied history, not shared state or private account data', async () => {
  const requests: any[] = []; const consentIds: string[] = [];
  const svc = service(null, { readConsent: async (id: string) => { consentIds.push(id); return { personalizationEnabled: false }; },
    provider: new JsonLlmProvider(async request => { requests.push(request); return JSON.stringify({ kind: 'clarify', fields: ['startDate'] }); }) });
  const first = await svc.chat(user, { message: 'Đi Đà Nẵng' });
  await svc.chat(user, { message: '2030-06-15', history: first.history });
  await svc.chat(other, { message: 'Đi Hội An' });
  assert.equal(requests[1].messages.length, 3); assert.equal(requests[2].messages.length, 1);
  assert.deepEqual(consentIds, [user.id, user.id, other.id]);
  const encoded = JSON.stringify(requests);
  for (const value of [user.id, other.id, user.email, other.email, user.fullName]) assert.ok(!encoded.includes(value));
});
test('authentication is required before provider/consent/tool work', async () => {
  await assert.rejects(service(search).chat(undefined, chat), errorCode('AUTH_REQUIRED'));
});
test('consent read failure fails closed before provider invocation', async () => {
  let called = 0;
  const svc = service(null, { readConsent: async () => { throw Error('PRIVATE_DB_DETAILS'); },
    provider: new JsonLlmProvider(async () => { called++; return '{}'; }) });
  await assert.rejects(svc.chat(user, chat), errorCode('AGENT_CONSENT_UNAVAILABLE')); assert.equal(called, 0);
});
test('explicit preferences allowed with opt-out; no behavioral lookup or persisted context', async () => {
  let calls = 0;
  for (const enabled of [false, true]) {
    const result = await service(search, { readConsent: async () => ({ personalizationEnabled: enabled }),
      tools: { execute: async (v: ToolDecision) => { calls++; assert.deepEqual(v, search); return { type: 'MOCK_ONLY' }; } } }).chat(user, chat);
    assert.equal(result.context.personalizationEnabled, enabled); assert.equal(result.context.behavioralDataUsed, false); assert.equal(result.context.persisted, false);
  }
  assert.equal(calls, 2);
});
test('rejects fabricated replies, tool results, mutation tools and unknown decisions', async () => {
  for (const raw of [null, { kind: 'reply', reply: 'fake price' }, { ...search, reply: 'fake place' },
    ...['save_trip', 'update_trip', 'get_trip', 'create_booking', 'admin', '__proto__'].map(name => ({ ...search, name }))]) {
    await assert.rejects(service(raw).chat(user, chat), errorCode('AGENT_INVALID_PROVIDER_OUTPUT'));
  }
  assert.throws(() => parseDecision({ kind: 'clarify', fields: ['__proto__'] }));
});
test('missing required travel data asks instead of Planner defaults or tool invocation', async () => {
  let calls = 0;
  const result: any = await service({ ...plan, arguments: { destinationCity: 'Đà Nẵng' } },
    { tools: { execute: async () => { calls++; } } }).chat(user, chat);
  assert.equal(result.status, 'needs_input'); assert.ok(result.missingFields.includes('totalBudget')); assert.ok(result.missingFields.includes('startDate'));
  assert.equal(calls, 0); assert.equal(result.result, undefined);
});
test('tool parameters reject ownership injection, bad date, mode, budget, mandatory ID', async () => {
  for (const patch of [{ userId: other.id }, { businessId: 'other' }, { startDate: '2030-02-30' }, { totalBudget: 0 },
    { adults: -1 }, { transportation: 'flight' }, { preferences: ['secret-profile'] }, { mandatoryPlaceIds: ['not-uuid'] }]) {
    await assert.rejects(service({ ...plan, arguments: { ...plan.arguments, ...patch } }).chat(user, chat), errorCode('AGENT_INVALID_TOOL_INPUT'));
  }
  for (const patch of [{ dailyBudgetPerPerson: -1 }, { category: 'booking' }, { weights: {} }]) {
    await assert.rejects(service({ ...search, arguments: { ...search.arguments, ...patch } }).chat(user, chat), errorCode('AGENT_INVALID_TOOL_INPUT'));
  }
  assert.throws(() => validateTool({ ...search, arguments: { ...search.arguments, dailyBudgetPerPerson: Infinity } }));
});
test('tool backend failure and deadline are safe and do not fabricate success', async () => {
  await assert.rejects(service(search, { tools: { execute: async () => { throw Error('PRIVATE_DB_KEY'); } } }).chat(user, chat), errorCode('AGENT_TOOL_FAILED'));
  await assert.rejects(service(search, { timeoutMs: 10, tools: { execute: async () => new Promise(() => {}) } }).chat(user, chat), errorCode('AGENT_TIMEOUT'));
});
test('unsupported mutation request is explicit and executes no tool', async () => {
  const result: any = await service({ kind: 'unsupported' }, { tools: { execute: async () => { throw Error('Must not run'); } } }).chat(user, chat);
  assert.equal(result.status, 'unsupported'); assert.equal(result.result, undefined);
});
test('real Planner adapter with synthetic catalog preserves estimates, provenance, no re-pricing', async () => {
  const fixture = JSON.parse(await readFile('src/evaluation/t11b_scenarios_v3.json', 'utf8'));
  RecommendationRepository.useLoaderForTests(async () => fixture.catalog);
  try {
    const direct = await TourPlannerService.generatePersonalizedItinerary(validateTool(plan).input as any);
    const response: any = await service(plan).chat(user, chat);
    assert.equal(response.status, 'completed'); assert.equal(response.result.source, 'TourPlannerService');
    assert.equal(response.result.cost.estimated, direct.totalEstimatedCostVND);
    assert.deepEqual(response.result.itinerary.days, direct.days);
    assert.deepEqual(response.result.itinerary.costAssumptions, direct.costAssumptions);
    assert.ok(response.result.warnings.length > 0);
  } finally { RecommendationRepository.resetLoader(); }
});
test('catalog adapter public eligibility, safe projection, zero versus missing prices', async () => {
  const fixture = JSON.parse(await readFile('src/evaluation/t11b_scenarios_v3.json', 'utf8'));
  const base = fixture.catalog[0];
  RecommendationRepository.useLoaderForTests(async () => [
    { ...base, priceFrom: 0, catalogPriceAvailable: true, contactInfo: { private: 'HIDDEN_CANARY' } },
    { ...base, id: 'missing', priceFrom: 0, catalogPriceAvailable: false },
    { ...base, id: 'draft', status: 'DRAFT' },
    { ...base, id: 'suspended-business', businessId: 'suspended', business: { status: 'SUSPENDED' } },
  ]);
  try {
    const result: any = await catalogPlannerTools.execute(search);
    assert.equal(result.places.length, 2);
    assert.equal(result.places.find((p: any) => p.id === base.id).priceFrom, 0);
    assert.equal(result.places.find((p: any) => p.id === 'missing').priceFrom, null);
    assert.ok(!JSON.stringify(result).includes('HIDDEN_CANARY')); assert.ok(!JSON.stringify(result).includes('contactInfo'));
  } finally { RecommendationRepository.resetLoader(); }
});
test('empty catalog produces explicit no-result/search and unavailable/planner, never fallback fabrication', async () => {
  RecommendationRepository.useLoaderForTests(async () => []);
  try {
    const places: any = await service(search).chat(user, chat);
    assert.deepEqual(places.result.places, []); assert.ok(places.result.warnings.length > 1);
    const itinerary: any = await service(plan).chat(user, chat);
    assert.equal(itinerary.status, 'tool_unavailable'); assert.equal(itinerary.result, undefined);
  } finally { RecommendationRepository.resetLoader(); }
});
test('malformed Planner result is rejected, no itinerary returned', async () => {
  const original = TourPlannerService.generatePersonalizedItinerary;
  TourPlannerService.generatePersonalizedItinerary = async () => ({ days: [], totalEstimatedCostVND: NaN } as any);
  try { await assert.rejects(service(plan).chat(user, chat), errorCode('AGENT_TOOL_FAILED')); }
  finally { TourPlannerService.generatePersonalizedItinerary = original; }
});

async function withServer(application: express.Express, run: (url: string) => Promise<void>) {
  const server = await new Promise<Server>(resolve => { const s = application.listen(0, '127.0.0.1', () => resolve(s)); });
  try {
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    await run(`http://127.0.0.1:${address.port}/api/agent/chat`);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}
async function post(url: string, token?: string, input = chat) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(input) });
  return { status: response.status, cache: response.headers.get('cache-control'), body: await response.json() as any };
}
test('actual mounted API route enforces auth and returns 503 unconfigured, no DB call', async () => {
  await withServer(app, async url => {
    const anonymous = await post(url); assert.equal(anonymous.status, 401); assert.equal(anonymous.body.code, 'AUTH_REQUIRED');
    const invalid = await post(url, 'invalid'); assert.equal(invalid.status, 401);
    const disabled = await post(url, signAccessToken(user)); assert.equal(disabled.status, 503);
    assert.equal(disabled.body.code, 'AGENT_PROVIDER_NOT_CONFIGURED'); assert.equal(disabled.body.stack, undefined); assert.equal(disabled.cache, 'no-store');
  });
});
test('HTTP MOCK_ONLY integration: real router/auth/controller, clarification and cross-account isolation', async () => {
  const application = express(); application.use(express.json());
  const seen: any[] = [];
  const svc = service(null, { provider: new JsonLlmProvider(async input => { seen.push(input.messages); return JSON.stringify({ kind: 'clarify', fields: ['destinationCity'] }); }) });
  application.use('/api/agent', createAgentRouter(svc));
  await withServer(application, async url => {
    const a = await post(url, signAccessToken(user)); assert.equal(a.status, 200); assert.equal(a.body.data.status, 'needs_input');
    const b = await post(url, signAccessToken(other)); assert.equal(b.status, 200); assert.equal(seen[1].length, 1);
    const injected = await post(url, signAccessToken(other), { ...chat, userId: user.id } as any);
    assert.equal(injected.status, 400); assert.equal(injected.body.code, 'AGENT_INVALID_INPUT');
  });
});

async function main() {
  // Any accidental real database access is an immediate failure in this suite.
  const originalQuery = sequelize.query;
  (sequelize as any).query = async () => { throw Error('Unexpected DB access in MOCK_ONLY unit suite'); };
  const results: Array<{ name: string; status: string }> = [];
  try {
    for (const [name, run] of cases) { await run(); results.push({ name, status: 'PASS' }); }
    console.log(JSON.stringify({ suite: 'T-AI-01', provider: 'MOCK_ONLY', catalog: 'SYNTHETIC_ONLY', database: 'NOT USED', passed: results.length, failed: 0, results }, null, 2));
  } finally { (sequelize as any).query = originalQuery; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
