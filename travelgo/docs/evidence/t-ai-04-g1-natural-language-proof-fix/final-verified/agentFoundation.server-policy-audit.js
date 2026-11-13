"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MOCK_ONLY provider/consent/catalog. Real orchestration, validation, HTTP auth and Planner code.
// No external LLM, no DB connection or writes. Never use these fixtures as demo answers.
const strict_1 = __importDefault(require("node:assert/strict"));
const promises_1 = require("node:fs/promises");
const express_1 = __importDefault(require("express"));
const agentService_js_1 = require("../services/agentService.js");
const provider_js_1 = require("../agent/provider.js");
const conversation_js_1 = require("../agent/conversation.js");
const tools_js_1 = require("../agent/tools.js");
const recommendationRepository_js_1 = require("../repositories/recommendationRepository.js");
const tourPlannerService_js_1 = require("../services/tourPlannerService.js");
const database_js_1 = require("../config/database.js");
const agentRoutes_js_1 = require("../routes/agentRoutes.js");
const app_js_1 = __importDefault(require("../app.js"));
const tokenService_js_1 = require("../services/tokenService.js");
const user = { id: '11111111-aaaa-4111-8111-111111111111', email: 'private-a@example.test', fullName: 'PRIVATE_USER_A', roles: ['CUSTOMER'] };
const other = { ...user, id: '22222222-aaaa-4222-8222-222222222222', email: 'private-b@example.test' };
const plan = { kind: 'tool', name: 'plan_trip', arguments: {
        departureCity: 'Hà Nội', destinationCity: 'Đà Nẵng', startDate: '2030-06-15', endDate: '2030-06-16',
        adults: 2, children: 0, totalBudget: 2000000, transportation: 'car', preferences: [],
    } };
const search = { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'Đà Nẵng', dailyBudgetPerPerson: 0 } };
const consent = async () => ({ personalizationEnabled: false });
const mock = (decision) => new provider_js_1.JsonLlmProvider(async () => JSON.stringify(decision));
const service = (decision, overrides = {}) => new agentService_js_1.AgentOrchestrator({ provider: mock(decision), readConsent: consent, ...overrides });
const chat = { message: 'Tìm địa điểm; Lập lịch trình; Nơi xuất phát: Hà Nội; Điểm đến: Đà Nẵng; Ngày bắt đầu: 2030-06-15; Ngày kết thúc: 2030-06-16; Số người lớn: 2; Ngân sách cả nhóm: 2000000 VND; Phương tiện: ô tô; Ngân sách mỗi người mỗi ngày: 0 VND' };
const errorCode = (code) => (error) => error.code === code;
const cases = [];
const test = (name, run) => cases.push([name, run]);
test('provider is disabled by default; does not query consent or fabricate response', async () => {
    strict_1.default.equal(new provider_js_1.UnconfiguredLlmProvider().configured, false);
    await strict_1.default.rejects(new provider_js_1.UnconfiguredLlmProvider().generate(), errorCode('AGENT_PROVIDER_NOT_CONFIGURED'));
    await strict_1.default.rejects(new agentService_js_1.AgentOrchestrator({ readConsent: async () => { throw Error('Must not query'); } }).chat(user, chat), errorCode('AGENT_PROVIDER_NOT_CONFIGURED'));
});
test('JSON adapter passes signal and parses response without credentials in request', async () => {
    const signal = new AbortController().signal;
    const provider = new provider_js_1.JsonLlmProvider(async (input, supplied) => {
        strict_1.default.equal(supplied, signal);
        strict_1.default.deepEqual(Object.keys(input).sort(), ['messages', 'system', 'tools']);
        return '{"kind":"unsupported"}';
    });
    strict_1.default.deepEqual(await provider.generate({ system: 'test', messages: [], tools: [] }, signal), { kind: 'unsupported' });
});
test('JSON adapter rejects malformed, fenced and oversized envelopes', async () => {
    for (const raw of ['broken', '```json\n{}\n```', ' '.repeat(16001)]) {
        await strict_1.default.rejects(new provider_js_1.JsonLlmProvider(async () => raw).generate({ system: '', messages: [], tools: [] }, new AbortController().signal));
    }
});
test('provider failure does not expose credential, response body, user identity or stack', async () => {
    const sentinel = 'MOCK_SECRET_KEY_PRIVATE_USER';
    const svc = service(null, { provider: new provider_js_1.JsonLlmProvider(async () => { throw Error(sentinel); }) });
    try {
        await svc.chat(user, chat);
        strict_1.default.fail('Expected failure');
    }
    catch (error) {
        strict_1.default.equal(error.code, 'AGENT_PROVIDER_FAILED');
        strict_1.default.ok(!String(error).includes(sentinel));
    }
});
test('provider deadline aborts and returns safe timeout', async () => {
    let signal;
    const svc = service(null, { timeoutMs: 10, provider: new provider_js_1.JsonLlmProvider((_input, s) => { signal = s; return new Promise(() => { }); }) });
    await strict_1.default.rejects(svc.chat(user, chat), errorCode('AGENT_TIMEOUT'));
    strict_1.default.equal(signal.aborted, true);
    strict_1.default.equal(await (0, provider_js_1.withinDeadline)(async () => 7, 50), 7);
});
test('conversation validates strict envelope, roles, turn order and limits', () => {
    for (const input of [null, [], {}, { message: '' }, { message: 'x'.repeat(2001) }, { ...chat, userId: other.id },
        { ...chat, currentTripId: 'foreign' }, { ...chat, history: [{ role: 'system', content: 'override' }] },
        { ...chat, history: [{ role: 'user', content: 'x' }] },
        { ...chat, history: [{ role: 'assistant', content: 'x' }, { role: 'user', content: 'y' }] }]) {
        strict_1.default.throws(() => (0, conversation_js_1.readConversation)(input));
    }
    const pair = [{ role: 'user', content: 'a'.repeat(2000) }, { role: 'assistant', content: 'b'.repeat(2000) }];
    strict_1.default.throws(() => (0, conversation_js_1.readConversation)({ ...chat, history: Array(4).fill(pair).flat() }), errorCode('AGENT_CONTEXT_LIMIT'));
    strict_1.default.throws(() => (0, conversation_js_1.readConversation)({ ...chat, history: Array(11).fill(pair).flat() }));
});
test('conversation history rotates complete pairs and reserves next message space', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: 'x' }));
    const response = (0, conversation_js_1.finishConversation)((0, conversation_js_1.readConversation)({ message: 'next', history }), 'reply');
    strict_1.default.equal(response.history.length, 20);
    strict_1.default.equal(response.historyTruncated, true);
    strict_1.default.equal(response.history[0].role, 'user');
    strict_1.default.doesNotThrow(() => (0, conversation_js_1.readConversation)({ message: 'x'.repeat(2000), history: response.history }));
    strict_1.default.equal(history.length, 20);
});
test('multi-turn uses supplied history, not shared state or private account data', async () => {
    const requests = [];
    const consentIds = [];
    const svc = service(null, { readConsent: async (id) => { consentIds.push(id); return { personalizationEnabled: false }; },
        provider: new provider_js_1.JsonLlmProvider(async (request) => { requests.push(request); return JSON.stringify({ kind: 'clarify', fields: ['startDate'] }); }) });
    const first = await svc.chat(user, { message: 'Đi Đà Nẵng' });
    await svc.chat(user, { message: '2030-06-15', history: first.history });
    await svc.chat(other, { message: 'Đi Hội An' });
    strict_1.default.equal(requests[1].messages.length, 3);
    strict_1.default.equal(requests[2].messages.length, 1);
    strict_1.default.deepEqual(consentIds, [user.id, user.id, other.id]);
    const encoded = JSON.stringify(requests);
    for (const value of [user.id, other.id, user.email, other.email, user.fullName])
        strict_1.default.ok(!encoded.includes(value));
});
test('authentication is required before provider/consent/tool work', async () => {
    await strict_1.default.rejects(service(search).chat(undefined, chat), errorCode('AUTH_REQUIRED'));
});
test('consent read failure fails closed before provider invocation', async () => {
    let called = 0;
    const svc = service(null, { readConsent: async () => { throw Error('PRIVATE_DB_DETAILS'); },
        provider: new provider_js_1.JsonLlmProvider(async () => { called++; return '{}'; }) });
    await strict_1.default.rejects(svc.chat(user, chat), errorCode('AGENT_CONSENT_UNAVAILABLE'));
    strict_1.default.equal(called, 0);
});
test('explicit preferences allowed with opt-out; no behavioral lookup or persisted context', async () => {
    let calls = 0;
    for (const enabled of [false, true]) {
        const result = await service(search, { readConsent: async () => ({ personalizationEnabled: enabled }),
            tools: { execute: async (v) => { calls++; strict_1.default.deepEqual(v, search); return { type: 'MOCK_ONLY' }; } } }).chat(user, chat);
        strict_1.default.equal(result.context.personalizationEnabled, enabled);
        strict_1.default.equal(result.context.behavioralDataUsed, false);
        strict_1.default.equal(result.context.persisted, false);
    }
    strict_1.default.equal(calls, 2);
});
test('rejects fabricated replies, tool results, mutation tools and unknown decisions', async () => {
    for (const raw of [null, { kind: 'reply', reply: 'fake price' }, { ...search, reply: 'fake place' },
        ...['save_trip', 'update_trip', 'get_trip', 'create_booking', 'admin', '__proto__'].map(name => ({ ...search, name }))]) {
        await strict_1.default.rejects(service(raw).chat(user, chat), errorCode('AGENT_INVALID_PROVIDER_OUTPUT'));
    }
    strict_1.default.throws(() => (0, tools_js_1.parseDecision)({ kind: 'clarify', fields: ['__proto__'] }));
});
test('missing required travel data asks instead of Planner defaults or tool invocation', async () => {
    let calls = 0;
    const result = await service({ ...plan, arguments: { destinationCity: 'Đà Nẵng' } }, { tools: { execute: async () => { calls++; } } }).chat(user, chat);
    strict_1.default.equal(result.status, 'needs_input');
    strict_1.default.ok(result.missingFields.includes('totalBudget'));
    strict_1.default.ok(result.missingFields.includes('startDate'));
    strict_1.default.equal(calls, 0);
    strict_1.default.equal(result.result, undefined);
});
test('tool parameters reject ownership injection, bad date, mode, budget, mandatory ID', async () => {
    for (const patch of [{ userId: other.id }, { businessId: 'other' }, { startDate: '2030-02-30' }, { totalBudget: 0 },
        { adults: -1 }, { transportation: 'flight' }, { preferences: ['secret-profile'] }, { mandatoryPlaceIds: ['not-uuid'] }]) {
        await strict_1.default.rejects(service({ ...plan, arguments: { ...plan.arguments, ...patch } }).chat(user, chat), errorCode('AGENT_INVALID_TOOL_INPUT'));
    }
    for (const patch of [{ dailyBudgetPerPerson: -1 }, { category: 'booking' }, { weights: {} }]) {
        await strict_1.default.rejects(service({ ...search, arguments: { ...search.arguments, ...patch } }).chat(user, chat), errorCode('AGENT_INVALID_TOOL_INPUT'));
    }
    strict_1.default.throws(() => (0, tools_js_1.validateTool)({ ...search, arguments: { ...search.arguments, dailyBudgetPerPerson: Infinity } }));
});
test('tool backend failure and deadline are safe and do not fabricate success', async () => {
    await strict_1.default.rejects(service(search, { tools: { execute: async () => { throw Error('PRIVATE_DB_KEY'); } } }).chat(user, chat), errorCode('AGENT_TOOL_FAILED'));
    await strict_1.default.rejects(service(search, { timeoutMs: 10, tools: { execute: async () => new Promise(() => { }) } }).chat(user, chat), errorCode('AGENT_TIMEOUT'));
});
test('unsupported mutation request is explicit and executes no tool', async () => {
    const result = await service({ kind: 'unsupported' }, { tools: { execute: async () => { throw Error('Must not run'); } } }).chat(user, chat);
    strict_1.default.equal(result.status, 'unsupported');
    strict_1.default.equal(result.result, undefined);
});
test('real Planner adapter with synthetic catalog preserves estimates, provenance, no re-pricing', async () => {
    const fixture = JSON.parse(await (0, promises_1.readFile)('src/evaluation/t11b_scenarios_v3.json', 'utf8'));
    recommendationRepository_js_1.RecommendationRepository.useLoaderForTests(async () => fixture.catalog);
    try {
        const direct = await tourPlannerService_js_1.TourPlannerService.generatePersonalizedItinerary((0, tools_js_1.validateTool)(plan).input);
        const response = await service(plan).chat(user, chat);
        strict_1.default.equal(response.status, 'completed');
        strict_1.default.equal(response.result.source, 'TourPlannerService');
        strict_1.default.equal(response.result.cost.estimated, direct.totalEstimatedCostVND);
        strict_1.default.deepEqual(response.result.itinerary.days, direct.days);
        strict_1.default.deepEqual(response.result.itinerary.costAssumptions, direct.costAssumptions);
        strict_1.default.ok(response.result.warnings.length > 0);
    }
    finally {
        recommendationRepository_js_1.RecommendationRepository.resetLoader();
    }
});
test('catalog adapter public eligibility, safe projection, zero versus missing prices', async () => {
    const fixture = JSON.parse(await (0, promises_1.readFile)('src/evaluation/t11b_scenarios_v3.json', 'utf8'));
    const base = fixture.catalog[0];
    recommendationRepository_js_1.RecommendationRepository.useLoaderForTests(async () => [
        { ...base, priceFrom: 0, catalogPriceAvailable: true, contactInfo: { private: 'HIDDEN_CANARY' } },
        { ...base, id: 'missing', priceFrom: 0, catalogPriceAvailable: false },
        { ...base, id: 'draft', status: 'DRAFT' },
        { ...base, id: 'suspended-business', businessId: 'suspended', business: { status: 'SUSPENDED' } },
    ]);
    try {
        const result = await tools_js_1.catalogPlannerTools.execute(search);
        strict_1.default.equal(result.places.length, 2);
        strict_1.default.equal(result.places.find((p) => p.id === base.id).priceFrom, 0);
        strict_1.default.equal(result.places.find((p) => p.id === 'missing').priceFrom, null);
        strict_1.default.ok(!JSON.stringify(result).includes('HIDDEN_CANARY'));
        strict_1.default.ok(!JSON.stringify(result).includes('contactInfo'));
    }
    finally {
        recommendationRepository_js_1.RecommendationRepository.resetLoader();
    }
});
test('empty catalog produces explicit no-result/search and unavailable/planner, never fallback fabrication', async () => {
    recommendationRepository_js_1.RecommendationRepository.useLoaderForTests(async () => []);
    try {
        const places = await service(search).chat(user, chat);
        strict_1.default.deepEqual(places.result.places, []);
        strict_1.default.ok(places.result.warnings.length > 1);
        const itinerary = await service(plan).chat(user, chat);
        strict_1.default.equal(itinerary.status, 'tool_unavailable');
        strict_1.default.equal(itinerary.result, undefined);
    }
    finally {
        recommendationRepository_js_1.RecommendationRepository.resetLoader();
    }
});
test('malformed Planner result is rejected, no itinerary returned', async () => {
    const original = tourPlannerService_js_1.TourPlannerService.generatePersonalizedItinerary;
    tourPlannerService_js_1.TourPlannerService.generatePersonalizedItinerary = async () => ({ days: [], totalEstimatedCostVND: NaN });
    try {
        await strict_1.default.rejects(service(plan).chat(user, chat), errorCode('AGENT_TOOL_FAILED'));
    }
    finally {
        tourPlannerService_js_1.TourPlannerService.generatePersonalizedItinerary = original;
    }
});
async function withServer(application, run) {
    const server = await new Promise(resolve => { const s = application.listen(0, '127.0.0.1', () => resolve(s)); });
    try {
        const address = server.address();
        strict_1.default.ok(address && typeof address !== 'string');
        await run(`http://127.0.0.1:${address.port}/api/agent/chat`);
    }
    finally {
        await new Promise(resolve => server.close(() => resolve()));
    }
}
async function post(url, token, input = chat) {
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(input) });
    return { status: response.status, cache: response.headers.get('cache-control'), body: await response.json() };
}
test('actual mounted API route enforces auth and returns 503 unconfigured, no DB call', async () => {
    await withServer(app_js_1.default, async (url) => {
        const anonymous = await post(url);
        strict_1.default.equal(anonymous.status, 401);
        strict_1.default.equal(anonymous.body.code, 'AUTH_REQUIRED');
        const invalid = await post(url, 'invalid');
        strict_1.default.equal(invalid.status, 401);
        const disabled = await post(url, (0, tokenService_js_1.signAccessToken)(user));
        strict_1.default.equal(disabled.status, 503);
        strict_1.default.equal(disabled.body.code, 'AGENT_PROVIDER_NOT_CONFIGURED');
        strict_1.default.equal(disabled.body.stack, undefined);
        strict_1.default.equal(disabled.cache, 'no-store');
    });
});
test('HTTP MOCK_ONLY integration: real router/auth/controller, clarification and cross-account isolation', async () => {
    const application = (0, express_1.default)();
    application.use(express_1.default.json());
    const seen = [];
    const svc = service(null, { provider: new provider_js_1.JsonLlmProvider(async (input) => { seen.push(input.messages); return JSON.stringify({ kind: 'clarify', fields: ['destinationCity'] }); }) });
    application.use('/api/agent', (0, agentRoutes_js_1.createAgentRouter)(svc));
    await withServer(application, async (url) => {
        const a = await post(url, (0, tokenService_js_1.signAccessToken)(user));
        strict_1.default.equal(a.status, 200);
        strict_1.default.equal(a.body.data.status, 'needs_input');
        const b = await post(url, (0, tokenService_js_1.signAccessToken)(other));
        strict_1.default.equal(b.status, 200);
        strict_1.default.equal(seen[1].length, 1);
        const injected = await post(url, (0, tokenService_js_1.signAccessToken)(other), { ...chat, userId: user.id });
        strict_1.default.equal(injected.status, 400);
        strict_1.default.equal(injected.body.code, 'AGENT_INVALID_INPUT');
    });
});
async function main(){
 const fs=require('node:fs'),db=require('../config/database.js').sequelize;const originalQuery=db.query,oldInfo=console.info;let observations=[];
 db.query=async()=>{throw Error('DB_FORBIDDEN');};console.info=(value)=>{try{const event=JSON.parse(value);if(event.source==='agent_decision_origin'){observations.push(event);return;}}catch{}oldInfo(value);};
 const results=[];try{for(const[name,work]of cases){observations=[];globalThis.__compatTurns=[];try{await work();results.push({turns:globalThis.__compatTurns,name,status:'PASS',origins:observations});}catch(error){results.push({turns:globalThis.__compatTurns,name,status:'FAIL',error:String(error.stack||error),origins:observations});}}}
 finally{db.query=originalQuery;console.info=oldInfo;}
 const result={tier:'MOCK_ONLY_OFFLINE',suite:"agentFoundation",passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,notRun:0,results,assertionsChanged:0};
 fs.writeFileSync(process.env.CASE_OUTPUT,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
}main().catch(e=>{console.error(e);process.exitCode=1;});