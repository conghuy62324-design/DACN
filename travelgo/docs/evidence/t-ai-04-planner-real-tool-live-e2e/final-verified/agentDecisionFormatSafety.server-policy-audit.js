"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// OFFLINE_ONLY / MOCK_ONLY. Diagnostic schema is not wired into production.
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const tools_js_1 = require("../agent/tools.js");
const decisionSchema_js_1 = require("../agent/decisionSchema.js");
const liveProvider_js_1 = require("../agent/liveProvider.js");
const agentService_js_1 = require("../services/agentService.js");
const limits_js_1 = require("../agent/limits.js");
const diagnostic = JSON.parse((0, node_fs_1.readFileSync)((0, node_path_1.resolve)(process.cwd(), '../docs/evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json'), 'utf8'));
const allowedKeywords = new Set(['$schema', 'type', 'additionalProperties', 'required', 'properties', 'enum', 'items',
    'minItems', 'maxItems', 'minLength', 'maxLength', 'minimum', 'exclusiveMinimum', 'format']);
function checkSchema(s) {
    strict_1.default.equal(typeof s, 'object');
    strict_1.default.ok(s && !Array.isArray(s));
    for (const key of Object.keys(s))
        strict_1.default.ok(allowedKeywords.has(key), `unsupported diagnostic keyword ${key}`);
    if (s.type !== undefined)
        strict_1.default.ok(['object', 'array', 'string', 'number', 'integer'].includes(s.type));
    if (s.additionalProperties !== undefined)
        strict_1.default.equal(typeof s.additionalProperties, 'boolean');
    if (s.required !== undefined) {
        strict_1.default.ok(Array.isArray(s.required) && s.required.every((x) => typeof x === 'string'));
        strict_1.default.equal(new Set(s.required).size, s.required.length);
        for (const key of s.required)
            strict_1.default.ok(Object.hasOwn(s.properties, key));
    }
    if (s.enum !== undefined)
        strict_1.default.ok(Array.isArray(s.enum) && s.enum.length > 0);
    for (const key of ['minItems', 'maxItems', 'minLength', 'maxLength', 'minimum', 'exclusiveMinimum']) {
        if (s[key] !== undefined)
            strict_1.default.ok(typeof s[key] === 'number' && Number.isFinite(s[key]));
    }
    if (s.format !== undefined)
        strict_1.default.ok(['date', 'uuid'].includes(s.format));
    if (s.properties !== undefined) {
        strict_1.default.equal(s.type, 'object');
        for (const v of Object.values(s.properties))
            checkSchema(v);
    }
    if (s.items !== undefined) {
        strict_1.default.equal(s.type, 'array');
        checkSchema(s.items);
    }
}
// Structural evaluator for the deliberately small vocabulary above. This is not an Ollama compatibility test.
function matches(s, value) {
    if (s.anyOf)
        return s.anyOf.filter((branch) => matches(branch, value)).length === 1;
    if (s.type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value)))
        return false;
    if (s.type === 'array' && !Array.isArray(value))
        return false;
    if (s.type === 'string' && typeof value !== 'string')
        return false;
    if (s.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value)))
        return false;
    if (s.type === 'integer' && !Number.isInteger(value))
        return false;
    if (s.enum && !s.enum.includes(value))
        return false;
    if (s.required && s.required.some((key) => !Object.hasOwn(value, key)))
        return false;
    if (s.properties) {
        if (s.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(s.properties, key)))
            return false;
        if (Object.entries(s.properties).some(([key, child]) => Object.hasOwn(value, key) && !matches(child, value[key])))
            return false;
    }
    if (s.items && value.some((item) => !matches(s.items, item)))
        return false;
    if (s.minItems !== undefined && value.length < s.minItems)
        return false;
    if (s.maxItems !== undefined && value.length > s.maxItems)
        return false;
    if (s.minLength !== undefined && value.length < s.minLength)
        return false;
    if (s.maxLength !== undefined && value.length > s.maxLength)
        return false;
    if (s.minimum !== undefined && value < s.minimum)
        return false;
    if (s.exclusiveMinimum !== undefined && value <= s.exclusiveMinimum)
        return false;
    if (s.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value))
        return false;
    if (s.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))
        return false;
    return true;
}
function runtimeAccepts(value) {
    try {
        const decision = (0, tools_js_1.parseDecision)(value);
        if (decision.kind === 'tool')
            return (0, tools_js_1.validateTool)(decision).missing.length === 0;
        return true;
    }
    catch {
        return false;
    }
}
const user = { id: '44444444-4444-4444-8444-444444444444', email: 'synthetic@example.test',
    fullName: 'Synthetic', roles: ['CUSTOMER'] };
const config = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
    OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: 'MOCK_ONLY', OLLAMA_BASE_URL: 'http://127.0.0.1:11434' };
const search = { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'TEST_ONLY_CITY', dailyBudgetPerPerson: 310000 } };
const plan = { kind: 'tool', name: 'plan_trip', arguments: { departureCity: 'TEST_ONLY_ORIGIN', destinationCity: 'TEST_ONLY_CITY',
        startDate: '2032-04-10', endDate: '2032-04-12', adults: 2, totalBudget: 6200000, transportation: 'car' } };
function service(raw, counts, external = false) {
    const provider = (0, liveProvider_js_1.createConfiguredProvider)(config, (async () => {
        counts.fetch++;
        return new Response(JSON.stringify({ message: { role: 'assistant', content: JSON.stringify(raw) }, done: true,
            done_reason: 'stop', prompt_eval_count: 1000, eval_count: 20 }), { status: 200 });
    }));
    if (external)
        provider.external = true; // offline gate probe; transport is still fake.
    return new agentService_js_1.AgentOrchestrator({ provider, limits: new limits_js_1.AgentLimits(),
        readConsent: async () => { counts.consent++; return { personalizationEnabled: false }; },
        tools: { execute: async (_d) => { counts.tools++; return { source: 'MOCK_ONLY' }; } } });
}
const cases = [];
const test = (name, fn) => cases.push([name, fn]);
test('diagnostic schema uses valid supported JSON Schema vocabulary and exact contract names', () => {
    checkSchema(diagnostic);
    strict_1.default.equal(diagnostic.$schema, 'https://json-schema.org/draft/2020-12/schema');
    strict_1.default.equal(diagnostic.type, 'object');
    strict_1.default.deepEqual(diagnostic.required, ['kind']);
    strict_1.default.deepEqual(diagnostic.properties.kind.enum, ['tool', 'clarify', 'unsupported']);
    strict_1.default.deepEqual(diagnostic.properties.name.enum, tools_js_1.AGENT_TOOLS.map(t => t.name));
    strict_1.default.deepEqual(diagnostic.properties.fields.items.enum, Object.keys(tools_js_1.FIELD_LABELS));
    const keys = new Set(tools_js_1.AGENT_TOOLS.flatMap(t => Object.keys(t.parameters.properties)));
    strict_1.default.deepEqual(new Set(Object.keys(diagnostic.properties.arguments.properties)), keys);
    strict_1.default.equal(diagnostic.additionalProperties, false);
    strict_1.default.equal(diagnostic.properties.arguments.additionalProperties, false);
    strict_1.default.equal(decisionSchema_js_1.DECISION_SCHEMA.anyOf.length, 4);
});
for (const [name, value] of Object.entries({ search, plan, clarify: { kind: 'clarify', fields: ['adults'] },
    unsupported: { kind: 'unsupported' } }))
    test(`valid ${name} accepted by diagnostic and runtime`, () => {
        strict_1.default.equal(matches(diagnostic, value), true);
        strict_1.default.equal(runtimeAccepts(value), true);
    });
for (const [name, value] of Object.entries({
    clarifyChildren: { kind: 'clarify', fields: ['adults', 'children'] },
    unknownTool: { kind: 'tool', name: 'save_trip', arguments: {} },
    wrongType: { ...search, arguments: { destinationCity: 'TEST_ONLY_CITY', dailyBudgetPerPerson: '310000' } },
    extraRoot: { ...search, admin: true },
    extraArgument: { ...search, arguments: { ...search.arguments, accountId: user.id } },
    injectedMutation: { kind: 'tool', name: 'delete_booking', arguments: { bookingId: 'TEST_ONLY' } },
}))
    test(`invalid ${name} rejected by diagnostic and runtime`, () => {
        strict_1.default.equal(matches(diagnostic, value), false);
        strict_1.default.equal(runtimeAccepts(value), false);
    });
test('missing required tool argument is rejected by runtime despite simplified schema acceptance', () => {
    const value = { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'TEST_ONLY_CITY' } };
    strict_1.default.equal(matches(diagnostic, value), true);
    strict_1.default.equal(runtimeAccepts(value), false);
});
test('wrong kind combinations are rejected by runtime despite simplified schema acceptance', () => {
    for (const value of [{ kind: 'unsupported', name: 'search_places' }, { kind: 'clarify', fields: ['adults'], arguments: {} },
        { kind: 'tool', name: 'search_places' }]) {
        strict_1.default.equal(matches(diagnostic, value), true);
        strict_1.default.equal(runtimeAccepts(value), false);
    }
});
test('original branch schema remains stricter than diagnostic root schema', () => {
    for (const value of [search, plan, { kind: 'clarify', fields: ['adults'] }, { kind: 'unsupported' }]) {
        strict_1.default.equal(matches(decisionSchema_js_1.DECISION_SCHEMA, value), true);
    }
    for (const value of [{ kind: 'clarify', fields: ['adults', 'children'] },
        { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'TEST_ONLY_CITY' } },
        { kind: 'unsupported', name: 'search_places' },
        { kind: 'tool', name: 'save_trip', arguments: {} }]) {
        strict_1.default.equal(matches(decisionSchema_js_1.DECISION_SCHEMA, value), false);
    }
});
test('malformed tool output cannot execute tool; provider rejects before orchestrator fallback', async () => {
    const counts = { fetch: 0, tools: 0, consent: 0 };
    await strict_1.default.rejects(service({ kind: 'tool', name: 'search_places', arguments: { destinationCity: 'TEST_ONLY_CITY' } }, counts)
        .chat(user, { message: 'TEST_ONLY' }), (e) => e.code === 'AGENT_INVALID_PROVIDER_OUTPUT');
    strict_1.default.deepEqual(counts, { fetch: 1, tools: 0, consent: 1 });
});
test('auth and external processing consent gates run before fake provider and tool', async () => {
    const counts = { fetch: 0, tools: 0, consent: 0 };
    await strict_1.default.rejects(service(search, counts).chat(undefined, { message: 'TEST_ONLY' }), (e) => e.code === 'AUTH_REQUIRED');
    await strict_1.default.rejects(service(search, counts, true).chat(user, { message: 'TEST_ONLY' }), (e) => e.code === 'AGENT_EXTERNAL_CONSENT_REQUIRED');
    strict_1.default.deepEqual(counts, { fetch: 0, tools: 0, consent: 0 });
});
test('one provider decision yields at most one allowed read tool call; no mutation tool', async () => {
    const counts = { fetch: 0, tools: 0, consent: 0 };
    const result = await service(search, counts).chat(user, { message: 'Tìm địa điểm; Điểm đến: TEST_ONLY_CITY; Ngân sách mỗi người mỗi ngày: 310000 VND' });
    strict_1.default.equal(result.status, 'completed');
    strict_1.default.deepEqual(counts, { fetch: 1, tools: 1, consent: 1 });
    strict_1.default.deepEqual(tools_js_1.AGENT_TOOLS.map(t => t.name).sort(), ['plan_trip', 'search_places']);
    strict_1.default.equal(result.context.persisted, false);
});
async function main(){
 const fs=require('node:fs'),db=require('../config/database.js').sequelize;const originalQuery=db.query,oldInfo=console.info;let observations=[];
 db.query=async()=>{throw Error('DB_FORBIDDEN');};console.info=(value)=>{try{const event=JSON.parse(value);if(event.source==='agent_decision_origin'){observations.push(event);return;}}catch{}oldInfo(value);};
 const results=[];try{for(const[name,work]of cases){observations=[];globalThis.__compatTurns=[];try{await work();results.push({turns:globalThis.__compatTurns,name,status:'PASS',origins:observations});}catch(error){results.push({turns:globalThis.__compatTurns,name,status:'FAIL',error:String(error.stack||error),origins:observations});}}}
 finally{db.query=originalQuery;console.info=oldInfo;}
 const result={tier:'MOCK_ONLY_OFFLINE',suite:"agentDecisionFormatSafety",passed:results.filter(x=>x.status==='PASS').length,failed:results.filter(x=>x.status==='FAIL').length,notRun:0,results,assertionsChanged:0};
 fs.writeFileSync(process.env.CASE_OUTPUT,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;
}main().catch(e=>{console.error(e);process.exitCode=1;});