// OFFLINE_ONLY / MOCK_ONLY. Diagnostic schema is not wired into production.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AGENT_TOOLS, FIELD_LABELS, parseDecision, validateTool, type ToolDecision } from '../agent/tools.js';
import { DECISION_SCHEMA } from '../agent/decisionSchema.js';
import { createConfiguredProvider } from '../agent/liveProvider.js';
import { AgentOrchestrator } from '../services/agentService.js';
import { AgentLimits } from '../agent/limits.js';
import type { AuthUser } from '../types/auth.js';

const diagnostic = JSON.parse(readFileSync(resolve(process.cwd(), '../docs/evidence/t-ai-04-d-decision-format-safety/diagnostic-schema.json'), 'utf8'));
const allowedKeywords = new Set(['$schema', 'type', 'additionalProperties', 'required', 'properties', 'enum', 'items',
  'minItems', 'maxItems', 'minLength', 'maxLength', 'minimum', 'exclusiveMinimum', 'format']);
function checkSchema(s: any): void {
  assert.equal(typeof s, 'object'); assert.ok(s && !Array.isArray(s));
  for (const key of Object.keys(s)) assert.ok(allowedKeywords.has(key), `unsupported diagnostic keyword ${key}`);
  if (s.type !== undefined) assert.ok(['object', 'array', 'string', 'number', 'integer'].includes(s.type));
  if (s.additionalProperties !== undefined) assert.equal(typeof s.additionalProperties, 'boolean');
  if (s.required !== undefined) {
    assert.ok(Array.isArray(s.required) && s.required.every((x: unknown) => typeof x === 'string'));
    assert.equal(new Set(s.required).size, s.required.length);
    for (const key of s.required) assert.ok(Object.hasOwn(s.properties, key));
  }
  if (s.enum !== undefined) assert.ok(Array.isArray(s.enum) && s.enum.length > 0);
  for (const key of ['minItems', 'maxItems', 'minLength', 'maxLength', 'minimum', 'exclusiveMinimum']) {
    if (s[key] !== undefined) assert.ok(typeof s[key] === 'number' && Number.isFinite(s[key]));
  }
  if (s.format !== undefined) assert.ok(['date', 'uuid'].includes(s.format));
  if (s.properties !== undefined) { assert.equal(s.type, 'object'); for (const v of Object.values(s.properties)) checkSchema(v); }
  if (s.items !== undefined) { assert.equal(s.type, 'array'); checkSchema(s.items); }
}
// Structural evaluator for the deliberately small vocabulary above. This is not an Ollama compatibility test.
function matches(s: any, value: any): boolean {
  if (s.anyOf) return s.anyOf.filter((branch: any) => matches(branch, value)).length === 1;
  if (s.type === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) return false;
  if (s.type === 'array' && !Array.isArray(value)) return false;
  if (s.type === 'string' && typeof value !== 'string') return false;
  if (s.type === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) return false;
  if (s.type === 'integer' && !Number.isInteger(value)) return false;
  if (s.enum && !s.enum.includes(value)) return false;
  if (s.required && s.required.some((key: string) => !Object.hasOwn(value, key))) return false;
  if (s.properties) {
    if (s.additionalProperties === false && Object.keys(value).some(key => !Object.hasOwn(s.properties, key))) return false;
    if (Object.entries(s.properties).some(([key, child]) => Object.hasOwn(value, key) && !matches(child, value[key]))) return false;
  }
  if (s.items && value.some((item: any) => !matches(s.items, item))) return false;
  if (s.minItems !== undefined && value.length < s.minItems) return false;
  if (s.maxItems !== undefined && value.length > s.maxItems) return false;
  if (s.minLength !== undefined && value.length < s.minLength) return false;
  if (s.maxLength !== undefined && value.length > s.maxLength) return false;
  if (s.minimum !== undefined && value < s.minimum) return false;
  if (s.exclusiveMinimum !== undefined && value <= s.exclusiveMinimum) return false;
  if (s.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  if (s.format === 'uuid' && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return false;
  return true;
}
function runtimeAccepts(value: unknown): boolean {
  try { const decision = parseDecision(value); if (decision.kind === 'tool') return validateTool(decision).missing.length === 0; return true; }
  catch { return false; }
}
const user: AuthUser = { id: '44444444-4444-4444-8444-444444444444', email: 'synthetic@example.test',
  fullName: 'Synthetic', roles: ['CUSTOMER'] };
const config = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
  OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: 'MOCK_ONLY', OLLAMA_BASE_URL: 'http://127.0.0.1:11434' };
const search = { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'TEST_ONLY_CITY', dailyBudgetPerPerson: 310000 } };
const plan = { kind: 'tool', name: 'plan_trip', arguments: { departureCity: 'TEST_ONLY_ORIGIN', destinationCity: 'TEST_ONLY_CITY',
  startDate: '2032-04-10', endDate: '2032-04-12', adults: 2, totalBudget: 6200000, transportation: 'car' } };
function service(raw: unknown, counts: { fetch: number; tools: number; consent: number }, external = false) {
  const provider = createConfiguredProvider(config, (async () => { counts.fetch++;
    return new Response(JSON.stringify({ message: { role: 'assistant', content: JSON.stringify(raw) }, done: true,
      done_reason: 'stop', prompt_eval_count: 1000, eval_count: 20 }), { status: 200 }); }) as typeof fetch);
  if (external) (provider as any).external = true; // offline gate probe; transport is still fake.
  return new AgentOrchestrator({ provider, limits: new AgentLimits(),
    readConsent: async () => { counts.consent++; return { personalizationEnabled: false }; },
    tools: { execute: async (_d: ToolDecision) => { counts.tools++; return { source: 'MOCK_ONLY' }; } } });
}
const cases: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => cases.push([name, fn]);
test('diagnostic schema uses valid supported JSON Schema vocabulary and exact contract names', () => {
  checkSchema(diagnostic);
  assert.equal(diagnostic.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(diagnostic.type, 'object'); assert.deepEqual(diagnostic.required, ['kind']);
  assert.deepEqual(diagnostic.properties.kind.enum, ['tool', 'clarify', 'unsupported']);
  assert.deepEqual(diagnostic.properties.name.enum, AGENT_TOOLS.map(t => t.name));
  assert.deepEqual(diagnostic.properties.fields.items.enum, Object.keys(FIELD_LABELS));
  const keys = new Set(AGENT_TOOLS.flatMap(t => Object.keys(t.parameters.properties)));
  assert.deepEqual(new Set(Object.keys(diagnostic.properties.arguments.properties)), keys);
  assert.equal(diagnostic.additionalProperties, false); assert.equal(diagnostic.properties.arguments.additionalProperties, false);
  assert.equal(DECISION_SCHEMA.anyOf.length, 4);
});
for (const [name, value] of Object.entries({ search, plan, clarify: { kind: 'clarify', fields: ['adults'] },
  unsupported: { kind: 'unsupported' } })) test(`valid ${name} accepted by diagnostic and runtime`, () => {
    assert.equal(matches(diagnostic, value), true); assert.equal(runtimeAccepts(value), true);
  });
for (const [name, value] of Object.entries({
  clarifyChildren: { kind: 'clarify', fields: ['adults', 'children'] },
  unknownTool: { kind: 'tool', name: 'save_trip', arguments: {} },
  wrongType: { ...search, arguments: { destinationCity: 'TEST_ONLY_CITY', dailyBudgetPerPerson: '310000' } },
  extraRoot: { ...search, admin: true },
  extraArgument: { ...search, arguments: { ...search.arguments, accountId: user.id } },
  injectedMutation: { kind: 'tool', name: 'delete_booking', arguments: { bookingId: 'TEST_ONLY' } },
})) test(`invalid ${name} rejected by diagnostic and runtime`, () => {
  assert.equal(matches(diagnostic, value), false); assert.equal(runtimeAccepts(value), false);
});
test('missing required tool argument is rejected by runtime despite simplified schema acceptance', () => {
  const value = { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'TEST_ONLY_CITY' } };
  assert.equal(matches(diagnostic, value), true); assert.equal(runtimeAccepts(value), false);
});
test('wrong kind combinations are rejected by runtime despite simplified schema acceptance', () => {
  for (const value of [{ kind: 'unsupported', name: 'search_places' }, { kind: 'clarify', fields: ['adults'], arguments: {} },
    { kind: 'tool', name: 'search_places' }]) { assert.equal(matches(diagnostic, value), true); assert.equal(runtimeAccepts(value), false); }
});
test('original branch schema remains stricter than diagnostic root schema', () => {
  for (const value of [search, plan, { kind: 'clarify', fields: ['adults'] }, { kind: 'unsupported' }]) {
    assert.equal(matches(DECISION_SCHEMA, value), true);
  }
  for (const value of [{ kind: 'clarify', fields: ['adults', 'children'] },
    { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'TEST_ONLY_CITY' } },
    { kind: 'unsupported', name: 'search_places' },
    { kind: 'tool', name: 'save_trip', arguments: {} }]) {
    assert.equal(matches(DECISION_SCHEMA, value), false);
  }
});
test('malformed tool output cannot execute tool; provider rejects before orchestrator fallback', async () => {
  const counts = { fetch: 0, tools: 0, consent: 0 };
  await assert.rejects(service({ kind: 'tool', name: 'search_places', arguments: { destinationCity: 'TEST_ONLY_CITY' } }, counts)
    .chat(user, { message: 'TEST_ONLY' }), (e: any) => e.code === 'AGENT_INVALID_PROVIDER_OUTPUT');
  assert.deepEqual(counts, { fetch: 1, tools: 0, consent: 1 });
});
test('auth and external processing consent gates run before fake provider and tool', async () => {
  const counts = { fetch: 0, tools: 0, consent: 0 };
  await assert.rejects(service(search, counts).chat(undefined, { message: 'TEST_ONLY' }), (e: any) => e.code === 'AUTH_REQUIRED');
  await assert.rejects(service(search, counts, true).chat(user, { message: 'TEST_ONLY' }), (e: any) => e.code === 'AGENT_EXTERNAL_CONSENT_REQUIRED');
  assert.deepEqual(counts, { fetch: 0, tools: 0, consent: 0 });
});
test('one provider decision yields at most one allowed read tool call; no mutation tool', async () => {
  const counts = { fetch: 0, tools: 0, consent: 0 };
  const result = await service(search, counts).chat(user, { message: 'Tìm địa điểm; Điểm đến: TEST_ONLY_CITY; Ngân sách mỗi người mỗi ngày: 310000 VND' });
  assert.equal(result.status, 'completed'); assert.deepEqual(counts, { fetch: 1, tools: 1, consent: 1 });
  assert.deepEqual(AGENT_TOOLS.map(t => t.name).sort(), ['plan_trip', 'search_places']);
  assert.equal((result.context as any).persisted, false);
});
async function main() { const passed: string[] = []; for (const [name, fn] of cases) { await fn(); passed.push(name); }
  console.log(JSON.stringify({ suite: 'T-AI-04-D decision format safety', tier: 'MOCK_ONLY', inference: 0,
    database: 'NOT_USED', passed: passed.length, failed: 0, tests: passed }, null, 2)); }
main().catch(error => { console.error(error); process.exitCode = 1; });
