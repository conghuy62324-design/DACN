"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// MOCK_ONLY: synthetic fetch responses and local HTTP server, never a live model.
const strict_1 = __importDefault(require("node:assert/strict"));
const node_http_1 = require("node:http");
const liveProvider_js_1 = require("../agent/liveProvider.js");
const limits_js_1 = require("../agent/limits.js");
const agentService_js_1 = require("../services/agentService.js");
const privacy_js_1 = require("../agent/privacy.js");
const conversation_js_1 = require("../agent/conversation.js");
const decisionSchema_js_1 = require("../agent/decisionSchema.js");
const tools_js_1 = require("../agent/tools.js");
const express_1 = __importDefault(require("express"));
const agentRoutes_js_1 = require("../routes/agentRoutes.js");
const tokenService_js_1 = require("../services/tokenService.js");
const gemini = { LLM_PROVIDER: 'gemini', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
    LLM_EXTERNAL_PROCESSING_APPROVED: 'true', GEMINI_MODEL: 'MOCK_ONLY_model', GEMINI_API_KEY: 'MOCK_ONLY_SECRET_CANARY' };
const ollama = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
    OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: 'MOCK_ONLY_model' };
const input = { system: 'System test. No personal data.', messages: [{ role: 'user', content: 'Tìm nơi du lịch' }], tools: tools_js_1.AGENT_TOOLS };
const clarify = { kind: 'clarify', fields: ['destinationCity'] };
const signal = () => new AbortController().signal;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const geminiEnvelope = (decision = clarify) => ({ candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(decision) }] } }] });
const ollamaEnvelope = (decision = clarify) => ({ message: { role: 'assistant', content: JSON.stringify(decision) }, done: true, done_reason: 'stop', prompt_eval_count: 20, eval_count: 12 });
const user = { id: '11111111-aaaa-4111-8111-111111111111', email: 'PRIVATE_ACCOUNT@example.test', fullName: 'PRIVATE_NAME', roles: ['CUSTOMER'] };
const errorCode = (code) => (e) => e.code === code && !String(e).includes('CANARY');
const cases = [];
const test = (name, run) => cases.push([name, run]);
test('configuration gates never fetch or enable a default model', () => {
    let calls = 0;
    const noFetch = (async () => { calls++; throw Error('must not fetch'); });
    for (const config of [{}, { ...gemini, LLM_LIVE_ENABLED: 'false' }, { ...gemini, LLM_USAGE_APPROVED: '' },
        { ...gemini, GEMINI_API_KEY: '' }, { ...gemini, GEMINI_MODEL: '' }, { ...gemini, LLM_EXTERNAL_PROCESSING_APPROVED: '' },
        { ...gemini, GEMINI_MODEL: '../../redirect' }, { ...ollama, OLLAMA_LOCAL_ONLY_CONFIRMED: '' },
        { ...ollama, OLLAMA_MODEL: 'model-cloud' }, { ...ollama, LLM_PROVIDER: 'unknown' }]) {
        strict_1.default.equal((0, liveProvider_js_1.createConfiguredProvider)(config, noFetch).configured, false);
    }
    strict_1.default.equal((0, liveProvider_js_1.createConfiguredProvider)(gemini, noFetch).configured, true);
    strict_1.default.equal(calls, 0);
});
test('Ollama loopback allowlist rejects remote endpoints and credential/path tricks', () => {
    strict_1.default.equal((0, liveProvider_js_1.localOllamaUrl)('http://localhost:11434'), 'http://127.0.0.1:11434');
    strict_1.default.equal((0, liveProvider_js_1.localOllamaUrl)('http://[::1]:11434'), 'http://[::1]:11434');
    for (const url of ['https://example.test', 'http://192.168.1.2', 'http://127.0.0.1.evil', 'http://user:pass@localhost', 'http://localhost/api', 'http://localhost/?key=x', 'http://localhost/#x', 'file:///tmp/x']) {
        strict_1.default.throws(() => (0, liveProvider_js_1.localOllamaUrl)(url));
        strict_1.default.equal((0, liveProvider_js_1.createConfiguredProvider)({ ...ollama, OLLAMA_BASE_URL: url }).configured, false);
    }
});
test('Gemini request has auth header, schema, roles, exact token check, signal and no URL key', async () => {
    const calls = [];
    const provider = (0, liveProvider_js_1.createConfiguredProvider)(gemini, (async (url, options) => {
        calls.push({ url, options, body: JSON.parse(options.body) });
        return json(String(url).endsWith('countTokens') ? { totalTokens: 100 } : geminiEnvelope());
    }));
    strict_1.default.deepEqual(await provider.generate({ ...input, messages: [...input.messages, { role: 'assistant', content: 'Hỏi thêm' }, ...input.messages] }, signal()), clarify);
    strict_1.default.equal(calls.length, 2);
    strict_1.default.ok(calls[0].body.generateContentRequest.systemInstruction);
    strict_1.default.deepEqual(calls[1].body.generationConfig.responseJsonSchema, decisionSchema_js_1.GEMINI_DECISION_SCHEMA);
    strict_1.default.ok(!JSON.stringify(decisionSchema_js_1.GEMINI_DECISION_SCHEMA).includes('exclusiveMinimum'));
    strict_1.default.ok(!JSON.stringify(decisionSchema_js_1.GEMINI_DECISION_SCHEMA).includes('maxLength'));
    strict_1.default.equal(calls[1].body.generationConfig.maxOutputTokens, liveProvider_js_1.LIVE_LIMITS.outputTokens);
    strict_1.default.equal(calls[1].body.contents[1].role, 'model');
    for (const c of calls) {
        strict_1.default.ok(!c.url.includes('CANARY'));
        strict_1.default.equal(c.options.headers['x-goog-api-key'], gemini.GEMINI_API_KEY);
        strict_1.default.equal(c.options.redirect, 'error');
        strict_1.default.ok(c.options.signal instanceof AbortSignal);
        strict_1.default.ok(!JSON.stringify(c.body).includes('CANARY'));
    }
});
test('Ollama body uses JSON mode, stream false, finite context/output and system message', async () => {
    const provider = (0, liveProvider_js_1.createConfiguredProvider)(ollama, (async (url, options) => {
        strict_1.default.equal(url, 'http://127.0.0.1:11434/api/chat');
        const body = JSON.parse(options.body);
        strict_1.default.equal(body.stream, false);
        strict_1.default.equal(body.format, 'json');
        strict_1.default.equal(body.messages[0].role, 'system');
        strict_1.default.equal(body.options.num_predict, liveProvider_js_1.LIVE_LIMITS.outputTokens);
        strict_1.default.equal(body.options.num_ctx, 16384);
        strict_1.default.equal(options.headers['x-goog-api-key'], undefined);
        return json(ollamaEnvelope());
    }));
    strict_1.default.deepEqual(await provider.generate(input, signal()), clarify);
});
test('provider 429/5xx/4xx mapped safely without reading upstream diagnostic body', async () => {
    for (const [status, code] of [[429, 'AGENT_PROVIDER_QUOTA'], [500, 'AGENT_PROVIDER_UNAVAILABLE'], [503, 'AGENT_PROVIDER_UNAVAILABLE'], [401, 'AGENT_PROVIDER_REJECTED']]) {
        let calls = 0;
        const provider = (0, liveProvider_js_1.createConfiguredProvider)(ollama, (async () => { calls++; return json({ secret: 'CANARY_KEY' }, status); }));
        await strict_1.default.rejects(provider.generate(input, signal()), errorCode(code));
        strict_1.default.equal(calls, 1, 'no automatic retry');
    }
});
test('network errors sanitized, no raw URL or credential', async () => {
    const provider = (0, liveProvider_js_1.createConfiguredProvider)(gemini, (async () => { throw Error('CANARY secret request'); }));
    await strict_1.default.rejects(provider.generate(input, signal()), errorCode('AGENT_PROVIDER_NETWORK'));
});
test('malformed outer envelope, inner JSON, unexpected tool calls, truncation rejected', async () => {
    for (const body of ['not-json', JSON.stringify({}), JSON.stringify({ ...ollamaEnvelope(), done: false }),
        JSON.stringify({ ...ollamaEnvelope(), done_reason: 'length' }),
        JSON.stringify({ ...ollamaEnvelope(), message: { role: 'assistant', content: 'bad JSON' } }),
        JSON.stringify({ ...ollamaEnvelope(), message: { role: 'assistant', content: '{}', tool_calls: [{ name: 'save_trip' }] } })]) {
        await strict_1.default.rejects((0, liveProvider_js_1.createConfiguredProvider)(ollama, (async () => new Response(body))).generate(input, signal()), errorCode('AGENT_INVALID_PROVIDER_OUTPUT'));
    }
});
test('Gemini blocked, multiple candidates and non-STOP output rejected', async () => {
    for (const body of [{ promptFeedback: { blockReason: 'SAFETY' } }, { candidates: [] },
        { candidates: [...geminiEnvelope().candidates, ...geminiEnvelope().candidates] },
        { candidates: [{ ...geminiEnvelope().candidates[0], finishReason: 'MAX_TOKENS' }] }]) {
        const p = (0, liveProvider_js_1.createConfiguredProvider)(gemini, (async (url) => json(String(url).endsWith('countTokens') ? { totalTokens: 100 } : body)));
        await strict_1.default.rejects(p.generate(input, signal()), errorCode('AGENT_INVALID_PROVIDER_OUTPUT'));
    }
});
test('content-length and chunked response limits stop oversized bodies', async () => {
    for (const response of [new Response('{}', { headers: { 'content-length': String(liveProvider_js_1.LIVE_LIMITS.responseBytes + 1) } }),
        new Response(new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(liveProvider_js_1.LIVE_LIMITS.responseBytes + 1)); controller.close(); } }))]) {
        await strict_1.default.rejects((0, liveProvider_js_1.createConfiguredProvider)(ollama, (async () => response)).generate(input, signal()), errorCode('AGENT_PROVIDER_RESPONSE_TOO_LARGE'));
    }
});
test('input budget rejects before network; exact Gemini count rejects before generation', async () => {
    let calls = 0;
    const provider = (0, liveProvider_js_1.createConfiguredProvider)(gemini, (async () => { calls++; return json({ totalTokens: 13000 }); }));
    await strict_1.default.rejects(provider.generate({ ...input, system: 'x'.repeat(14000) }, signal()), errorCode('AGENT_INPUT_TOKEN_LIMIT'));
    strict_1.default.equal(calls, 0);
    await strict_1.default.rejects(provider.generate(input, signal()), errorCode('AGENT_INPUT_TOKEN_LIMIT'));
    strict_1.default.equal(calls, 1);
});
test('provider decision must pass existing validators, cannot invent output or call mutation', async () => {
    for (const decision of [{ kind: 'tool', name: 'save_trip', arguments: {} }, { kind: 'tool', name: 'plan_trip', arguments: { destinationCity: 'Đà Nẵng' } },
        { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'Đà Nẵng', dailyBudgetPerPerson: -1 } },
        { kind: 'reply', itinerary: 'FAKE' }, { kind: 'clarify', fields: ['userId'] }]) {
        await strict_1.default.rejects((0, liveProvider_js_1.createConfiguredProvider)(ollama, (async () => json(ollamaEnvelope(decision)))).generate(input, signal()), errorCode('AGENT_INVALID_PROVIDER_OUTPUT'));
    }
});
test('AbortSignal relays to fetch and produces timeout, including already-aborted signal', async () => {
    let observed;
    const p = (0, liveProvider_js_1.createConfiguredProvider)(ollama, ((_url, options) => {
        observed = options.signal;
        return new Promise((_resolve, reject) => observed.addEventListener('abort', () => reject(Error('CANARY abort')), { once: true }));
    }));
    const outer = new AbortController();
    const pending = p.generate(input, outer.signal);
    // Readiness GET fixture must settle before this historical POST-abort observation.
    for (let tick = 0; tick < 100; tick++) await Promise.resolve();
    outer.abort();
    await strict_1.default.rejects(pending, errorCode('AGENT_TIMEOUT'));
    strict_1.default.equal(observed.aborted, true);
    await strict_1.default.rejects(p.generate(input, outer.signal), errorCode('AGENT_TIMEOUT'));
});
test('bounded per-user rate window and expiration, isolated users, bounded memory', () => {
    let now = 0;
    const limits = new limits_js_1.AgentLimits(2, 1, () => now, 2);
    limits.consume('a');
    limits.consume('a');
    strict_1.default.throws(() => limits.consume('a'), errorCode('AGENT_RATE_LIMITED'));
    limits.consume('b');
    strict_1.default.throws(() => limits.consume('c'), errorCode('AGENT_BUSY'));
    now = 3600001;
    limits.consume('a');
    limits.consume('c');
});
test('concurrent slots release on success/error; never queue unbounded work', async () => {
    const limits = new limits_js_1.AgentLimits(20, 1);
    let resolve;
    const pending = limits.providerCall(() => new Promise(r => { resolve = r; }));
    await strict_1.default.rejects(limits.providerCall(async () => 2), errorCode('AGENT_BUSY'));
    resolve(1);
    strict_1.default.equal(await pending, 1);
    await strict_1.default.rejects(limits.providerCall(async () => { throw Error('test'); }));
    strict_1.default.equal(await limits.providerCall(async () => 3), 3);
});
test('Gemini per-request consent required before consent DB read or external fetch', async () => {
    let calls = 0;
    let consentReads = 0;
    const provider = (0, liveProvider_js_1.createConfiguredProvider)(gemini, (async (url) => {
        calls++;
        return json(String(url).endsWith('countTokens') ? { totalTokens: 100 } : geminiEnvelope());
    }));
    const svc = new agentService_js_1.AgentOrchestrator({ provider, readConsent: async () => { consentReads++; return { personalizationEnabled: true }; } });
    await strict_1.default.rejects(svc.chat(user, { message: 'Hi' }), errorCode('AGENT_EXTERNAL_CONSENT_REQUIRED'));
    strict_1.default.equal(calls, 0);
    strict_1.default.equal(consentReads, 0);
    strict_1.default.throws(() => (0, conversation_js_1.readConversation)({ message: 'Hi', externalProcessingConsent: true }), errorCode('AGENT_INVALID_INPUT'));
    const response = await svc.chat(user, { message: 'Hi', externalProcessingConsent: privacy_js_1.EXTERNAL_CONSENT_VERSION });
    strict_1.default.equal(response.status, 'needs_input');
    strict_1.default.equal(calls, 2);
});
test('prompt excludes account/private context and acknowledgement, no shared account state', async () => {
    const captured = [];
    const provider = (0, liveProvider_js_1.createConfiguredProvider)(ollama, (async (_url, options) => { captured.push(String(options.body)); return json(ollamaEnvelope()); }));
    const svc = new agentService_js_1.AgentOrchestrator({ provider, readConsent: async () => ({ personalizationEnabled: false }) });
    await svc.chat(user, { message: 'Tìm khách sạn', externalProcessingConsent: privacy_js_1.EXTERNAL_CONSENT_VERSION });
    await svc.chat({ ...user, id: 'other-id' }, { message: 'Đi Hội An' });
    for (const body of captured)
        for (const secret of [user.id, user.email, user.fullName, privacy_js_1.EXTERNAL_CONSENT_VERSION])
            strict_1.default.ok(!body.includes(secret));
    strict_1.default.ok(!captured[1].includes('Tìm khách sạn'));
});
test('quota and busy errors retain safe HTTP status through orchestrator', async () => {
    const p = (0, liveProvider_js_1.createConfiguredProvider)(ollama, (async () => json({ secret: 'CANARY' }, 429)));
    const svc = new agentService_js_1.AgentOrchestrator({ provider: p, readConsent: async () => ({ personalizationEnabled: false }) });
    await strict_1.default.rejects(svc.chat(user, { message: 'Hi' }), (e) => errorCode('AGENT_PROVIDER_QUOTA')(e) && e.statusCode === 429);
});
async function listen(server) { await new Promise(r => server.listen(0, '127.0.0.1', r)); const a = server.address(); strict_1.default.ok(a && typeof a !== 'string'); return `http://127.0.0.1:${a.port}`; }
async function close(server) { await new Promise(r => server.close(() => r())); }
test('actual fetch to local fake Ollama HTTP: request/response integration and redirect refused', async () => {
    let redirect = false;
    const server = (0, node_http_1.createServer)((req, res) => {
        if (redirect) {
            res.writeHead(302, { Location: 'http://example.test/never-follow' });
            res.end();
            return;
        }
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            strict_1.default.equal(req.url, '/api/chat');
            strict_1.default.equal(JSON.parse(body).stream, false);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(ollamaEnvelope()));
        });
    });
    const base = await listen(server);
    try {
        const p = (0, liveProvider_js_1.createConfiguredProvider)({ ...ollama, OLLAMA_BASE_URL: base });
        strict_1.default.deepEqual(await p.generate(input, signal()), clarify);
        redirect = true;
        await strict_1.default.rejects(p.generate(input, signal()), errorCode('AGENT_PROVIDER_NETWORK'));
    }
    finally {
        await close(server);
    }
});
test('HTTP privacy/auth/428/429 responses are safe; bearer tokens never enter provider', async () => {
    const p = (0, liveProvider_js_1.createConfiguredProvider)(gemini, (async () => json({ secret: 'CANARY' }, 429)));
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
    app.use('/api/agent', (0, agentRoutes_js_1.createAgentRouter)(new agentService_js_1.AgentOrchestrator({ provider: p, readConsent: async () => ({ personalizationEnabled: false }) })));
    const server = (0, node_http_1.createServer)(app);
    const base = await listen(server);
    try {
        const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${(0, tokenService_js_1.signAccessToken)(user)}` };
        strict_1.default.equal((await fetch(`${base}/api/agent/privacy`)).status, 401);
        const notice = await fetch(`${base}/api/agent/privacy`, { headers });
        strict_1.default.equal(notice.status, 200);
        strict_1.default.equal((await notice.json()).data.version, privacy_js_1.EXTERNAL_CONSENT_VERSION);
        for (const [body, status, code] of [[{ message: 'Hi' }, 428, 'AGENT_EXTERNAL_CONSENT_REQUIRED'],
            [{ message: 'Hi', externalProcessingConsent: privacy_js_1.EXTERNAL_CONSENT_VERSION }, 429, 'AGENT_PROVIDER_QUOTA']]) {
            const response = await fetch(`${base}/api/agent/chat`, { method: 'POST', headers, body: JSON.stringify(body) });
            strict_1.default.equal(response.status, status);
            const data = await response.json();
            strict_1.default.equal(data.code, code);
            strict_1.default.equal(data.stack, undefined);
            strict_1.default.ok(!JSON.stringify(data).includes('CANARY'));
        }
    }
    finally {
        await close(server);
    }
});
async function main(){
 const fs=require('node:fs'),db=require('../config/database.js').sequelize;const originalQuery=db.query,oldInfo=console.info;let observations=[];
 db.query=async()=>{throw Error('DB_FORBIDDEN');};console.info=(value)=>{try{const event=JSON.parse(value);if(event.source==='agent_decision_origin'){observations.push(event);return;}}catch{}oldInfo(value);};
 const results=[];try{for(const[name,work]of cases){observations=[];try{await work();results.push({name,status:'PASS',origins:observations});}catch(error){results.push({name,status:'FAIL',error:String(error.stack||error),origins:observations});}}}
 finally{db.query=originalQuery;console.info=oldInfo;}
 const result={tier:'MOCK_ONLY_OFFLINE',suite:"agentTransport",passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,notRun:0,results,assertionsChanged:0};
 fs.writeFileSync(process.env.CASE_OUTPUT,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
}main().catch(e=>{console.error(e);process.exitCode=1;});