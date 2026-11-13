// T-AI-04-F OFFLINE CONTRACT CANDIDATE. MOCK_ONLY evidence annotations; not production NLU.
// This file tests a proposed fail-closed gate. It does not import database/tool adapters.
import assert from 'node:assert/strict';
import { AGENT_TOOLS, FIELD_LABELS, parseDecision, validateTool, type MissingField, type ToolDecision } from '../agent/tools.js';
import { AgentOrchestrator } from '../services/agentService.js';
import { JsonLlmProvider } from '../agent/provider.js';
import { readConversation } from '../agent/conversation.js';
import type { AuthUser } from '../types/auth.js';

type Message = { ownerId: string; role: 'user' | 'assistant'; content: string; serverVerified: boolean };
type Evidence = { field: string; state: 'SET' | 'UNSET'; value?: unknown; messageIndex: number; start: number; end: number };
type GateResult = { status: 'ALLOW' | 'CLARIFY' | 'UNSUPPORTED' | 'REJECT'; fields?: string[]; reason?: string };
const userA = '44444444-4444-4444-8444-444444444444';
const userB = '55555555-5555-4555-8555-555555555555';
const planArgs = { departureCity: 'Hà Nội', destinationCity: 'Đà Lạt', startDate: '2033-09-10', endDate: '2033-09-12',
  adults: 2, totalBudget: 7000000, transportation: 'car' };
const searchArgs = { destinationCity: 'Đà Lạt', dailyBudgetPerPerson: 500000 };
const tool = (name: 'plan_trip' | 'search_places', args: Record<string, unknown>): ToolDecision =>
  ({ kind: 'tool', name, arguments: args });
const plan = tool('plan_trip', planArgs);
const search = tool('search_places', searchArgs);
const message = (content: string, ownerId = userA, role: 'user' | 'assistant' = 'user', serverVerified = true): Message =>
  ({ ownerId, role, content, serverVerified });
const evidence = (field: string, value: unknown, quote: string, messageIndex: number, messages: Message[], state: 'SET' | 'UNSET' = 'SET'): Evidence => {
  const start = messages[messageIndex].content.indexOf(quote);
  assert.ok(start >= 0, `fixture quote missing: ${quote}`);
  return { field, state, ...(state === 'SET' ? { value } : {}), messageIndex, start, end: start + quote.length };
};
// Deliberately narrow, deterministic examples; not a Vietnamese NLU parser.
function canonicalExample(field: string, quote: string): unknown {
  const q = quote.trim().normalize('NFC');
  if (field === 'transportation') {
    if (/^chưa chọn phương tiện$/i.test(q)) return null;
    if (/^(bằng|đi|chọn|đổi sang) ô tô$/i.test(q)) return 'car';
    if (/^(bằng|đi|chọn|đổi sang) xe máy$/i.test(q)) return 'motorbike';
    return undefined;
  }
  if (field === 'adults') { const m = q.match(/^(\d+) người lớn$/); return m ? Number(m[1]) : undefined; }
  if (field === 'totalBudget' || field === 'dailyBudgetPerPerson') {
    const m = q.match(/^(\d+) triệu$/); if (m) return Number(m[1]) * 1000000;
    return /^\d+$/.test(q) ? Number(q) : undefined;
  }
  if (field === 'startDate' || field === 'endDate') return /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : undefined;
  if (field === 'departureCity' || field === 'destinationCity') return q;
  return undefined;
}
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
function latest(field: string, accountId: string, messages: Message[], observations: Evidence[]) {
  const valid = observations.filter(o => {
    if (o.field !== field || !Number.isSafeInteger(o.messageIndex) || o.messageIndex < 0) return false;
    const m = messages[o.messageIndex];
    if (!m || m.ownerId !== accountId || m.role !== 'user' || !m.serverVerified ||
      !Number.isSafeInteger(o.start) || !Number.isSafeInteger(o.end) || o.start < 0 || o.end <= o.start) return false;
    const quote = m.content.slice(o.start, o.end);
    if (o.state === 'UNSET') return o.value === undefined && canonicalExample(field, quote) === null;
    if (field === 'transportation') {
      // Narrow canary only: reject known negation immediately before a cited positive phrase.
      const clausePrefix = m.content.slice(Math.max(0, o.start - 32), o.start).split(/[,.!?;]/).at(-1) || '';
      if (/(?:không|chưa|chẳng)(?:\s+\S+){0,2}\s*$/i.test(clausePrefix)) return false;
    }
    return canonicalExample(field, quote) !== undefined && canonicalExample(field, quote) !== null &&
      equal(canonicalExample(field, quote), o.value);
  });
  if (!valid.length) return { state: 'MISSING' as const };
  const maxIndex = Math.max(...valid.map(o => o.messageIndex));
  const sameTurn = valid.filter(o => o.messageIndex === maxIndex);
  if (sameTurn.length !== 1) return { state: 'AMBIGUOUS' as const };
  return sameTurn[0].state === 'UNSET' ? { state: 'UNSET' as const } : { state: 'SET' as const, value: sameTurn[0].value };
}
function requiredFor(name: string): string[] {
  const spec = AGENT_TOOLS.find(t => t.name === name);
  if (!spec) throw new Error('Unknown tool');
  return [...spec.parameters.required];
}
function missingFor(name: string, accountId: string, messages: Message[], observations: Evidence[], args?: Record<string, unknown>) {
  return requiredFor(name).filter(field => {
    const found = latest(field, accountId, messages, observations);
    return found.state !== 'SET' || args !== undefined && !equal(found.value, args[field]);
  });
}
function candidateGate(raw: unknown, targetTool: 'plan_trip' | 'search_places' | null,
  accountId: string, messages: Message[], observations: Evidence[]): GateResult {
  let decision;
  try { decision = parseDecision(raw); } catch { return { status: 'REJECT', reason: 'INVALID_DECISION' }; }
  if (decision.kind === 'unsupported') return { status: 'UNSUPPORTED' };
  if (decision.kind === 'clarify') {
    if (!targetTool) return { status: 'REJECT', reason: 'MISSING_TARGET_TOOL' };
    const missing = missingFor(targetTool, accountId, messages, observations);
    const requested = [...new Set(decision.fields)].sort();
    return equal(requested, [...missing].sort()) && missing.length ? { status: 'CLARIFY', fields: missing } :
      { status: 'REJECT', reason: 'INCOMPLETE_OR_WRONG_CLARIFY_FIELDS' };
  }
  if (targetTool !== decision.name) return { status: 'REJECT', reason: 'TOOL_INTENT_MISMATCH' };
  let validated;
  try { validated = validateTool(decision); } catch { return { status: 'REJECT', reason: 'INVALID_TOOL_ARGS' }; }
  if (validated.missing.length) return { status: 'REJECT', reason: 'MALFORMED_TOOL_MISSING_ARGS' };
  const missing = missingFor(decision.name, accountId, messages, observations, decision.arguments);
  if (missing.length) return { status: 'CLARIFY', fields: missing };
  // Optional model values require evidence, unless exactly equal to the current service defaults.
  const required = requiredFor(decision.name);
  const base = Object.fromEntries(required.map(k => [k, decision.arguments[k]]));
  let defaults: Record<string, unknown>;
  try { defaults = validateTool(tool(decision.name, base)).input as Record<string, unknown>; }
  catch { return { status: 'REJECT', reason: 'INVALID_DEFAULT_BASE' }; }
  for (const [key, value] of Object.entries(decision.arguments)) {
    if (required.includes(key)) continue;
    if (!Object.hasOwn(defaults, key) || !equal(defaults[key], value)) return { status: 'REJECT', reason: 'UNVERIFIED_OPTIONAL_ARG' };
  }
  return { status: 'ALLOW' };
}
function planContext(transport: 'car' | 'motorbike' | null = 'car') {
  const text = `Từ Hà Nội đến Đà Lạt, 2033-09-10 tới 2033-09-12, 2 người lớn, ngân sách 7 triệu, ${transport === null ? 'chưa chọn phương tiện' : transport === 'car' ? 'bằng ô tô' : 'bằng xe máy'}.`;
  const messages = [message(text)];
  const observations = [
    evidence('departureCity', 'Hà Nội', 'Hà Nội', 0, messages), evidence('destinationCity', 'Đà Lạt', 'Đà Lạt', 0, messages),
    evidence('startDate', '2033-09-10', '2033-09-10', 0, messages), evidence('endDate', '2033-09-12', '2033-09-12', 0, messages),
    evidence('adults', 2, '2 người lớn', 0, messages), evidence('totalBudget', 7000000, '7 triệu', 0, messages),
    transport === null ? evidence('transportation', undefined, 'chưa chọn phương tiện', 0, messages, 'UNSET') :
      evidence('transportation', transport, transport === 'car' ? 'bằng ô tô' : 'bằng xe máy', 0, messages),
  ];
  return { messages, observations };
}
function searchContext() {
  const messages = [message('Tìm Đà Lạt với 500000 đồng mỗi người mỗi ngày.')];
  return { messages, observations: [evidence('destinationCity', 'Đà Lạt', 'Đà Lạt', 0, messages),
    evidence('dailyBudgetPerPerson', 500000, '500000', 0, messages)] };
}
const cases: Array<[string, () => Promise<void> | void]> = [];
const test = (name: string, fn: () => Promise<void> | void) => cases.push([name, fn]);
test('required fields are derived from existing AGENT_TOOLS, not a second tool definition', () => {
  assert.deepEqual(requiredFor('search_places'), ['destinationCity', 'dailyBudgetPerPerson']);
  assert.deepEqual(requiredFor('plan_trip'), ['departureCity', 'destinationCity', 'startDate', 'endDate', 'adults', 'totalBudget', 'transportation']);
  assert.ok(requiredFor('plan_trip').every(k => Object.hasOwn(FIELD_LABELS, k)));
});
test('complete search tool can pass candidate provenance gate', () => {
  const x = searchContext(); assert.deepEqual(candidateGate(search, 'search_places', userA, x.messages, x.observations), { status: 'ALLOW' });
});
test('complete plan tool with explicit car can pass candidate gate', () => {
  const x = planContext('car'); assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations), { status: 'ALLOW' });
});
test('explicit motorbike is accepted and car is not substituted', () => {
  const x = planContext('motorbike');
  assert.deepEqual(candidateGate(tool('plan_trip', { ...planArgs, transportation: 'motorbike' }), 'plan_trip', userA, x.messages, x.observations), { status: 'ALLOW' });
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations), { status: 'CLARIFY', fields: ['transportation'] });
});
test('explicit chưa chọn phương tiện overrides Planner car default and asks for transportation', () => {
  const x = planContext(null);
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations), { status: 'CLARIFY', fields: ['transportation'] });
});
test('missing transportation without negative marker is still not defaulted', () => {
  const x = planContext('car'); x.observations = x.observations.filter(o => o.field !== 'transportation');
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations), { status: 'CLARIFY', fields: ['transportation'] });
});
test('incomplete Vietnamese example exposes all missing required fields, not just transportation', () => {
  const messages = [message('Tôi muốn đi Đà Lạt 3 ngày, 2 người, ngân sách 7 triệu, nhưng chưa chọn phương tiện.')];
  const observations = [evidence('destinationCity', 'Đà Lạt', 'Đà Lạt', 0, messages),
    evidence('totalBudget', 7000000, '7 triệu', 0, messages),
    evidence('transportation', undefined, 'chưa chọn phương tiện', 0, messages, 'UNSET')];
  assert.deepEqual(missingFor('plan_trip', userA, messages, observations),
    ['departureCity', 'startDate', 'endDate', 'adults', 'transportation']);
});
test('known negation before a cited car phrase cannot attest car', () => {
  const x = planContext('car'); x.messages[0] = message(x.messages[0].content.replace('bằng ô tô', 'không đi ô tô'));
  x.observations = x.observations.filter(o => o.field !== 'transportation');
  x.observations.push(evidence('transportation', 'car', 'đi ô tô', 0, x.messages));
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations),
    { status: 'CLARIFY', fields: ['transportation'] });
});
test('documented limitation: bare city span alone cannot prove non-negated destination', () => {
  const messages = [message('Từ Hà Nội, không đi Đà Lạt, 2033-09-10 tới 2033-09-12, 2 người lớn, ngân sách 7 triệu, bằng ô tô.')];
  const observations = [
    evidence('departureCity', 'Hà Nội', 'Hà Nội', 0, messages),
    evidence('destinationCity', 'Đà Lạt', 'Đà Lạt', 0, messages),
    evidence('startDate', '2033-09-10', '2033-09-10', 0, messages),
    evidence('endDate', '2033-09-12', '2033-09-12', 0, messages),
    evidence('adults', 2, '2 người lớn', 0, messages),
    evidence('totalBudget', 7000000, '7 triệu', 0, messages),
    evidence('transportation', 'car', 'bằng ô tô', 0, messages),
  ];
  // This ALLOW is a counterexample to the prototype, not an acceptance result.
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, messages, observations), { status: 'ALLOW' });
});
test('missing tool arguments are rejected before any possible execution', () => {
  const x = searchContext(); const raw = tool('search_places', { destinationCity: 'Đà Lạt' });
  assert.deepEqual(candidateGate(raw, 'search_places', userA, x.messages, x.observations), { status: 'REJECT', reason: 'MALFORMED_TOOL_MISSING_ARGS' });
});
test('unknown tool and injection cannot enter candidate gate', () => {
  const x = searchContext();
  assert.deepEqual(candidateGate({ kind: 'tool', name: 'save_trip', arguments: { userId: userA } }, null, userA, x.messages, x.observations),
    { status: 'REJECT', reason: 'INVALID_DECISION' });
  assert.deepEqual(candidateGate({ kind: 'unsupported' }, null, userA, x.messages, x.observations), { status: 'UNSUPPORTED' });
});
test('wrong type and extra ownership argument are rejected by current validator', () => {
  const x = searchContext();
  for (const args of [{ destinationCity: 'Đà Lạt', dailyBudgetPerPerson: '500000' },
    { ...searchArgs, userId: userB }]) assert.deepEqual(candidateGate(tool('search_places', args), 'search_places', userA, x.messages, x.observations),
    { status: 'REJECT', reason: 'INVALID_TOOL_ARGS' });
});
test('invented city and unsupported optional category fail closed', () => {
  const x = searchContext();
  assert.deepEqual(candidateGate(tool('search_places', { ...searchArgs, destinationCity: 'Huế' }), 'search_places', userA, x.messages, x.observations),
    { status: 'CLARIFY', fields: ['destinationCity'] });
  assert.deepEqual(candidateGate(tool('search_places', { ...searchArgs, category: 'hotel' }), 'search_places', userA, x.messages, x.observations),
    { status: 'REJECT', reason: 'UNVERIFIED_OPTIONAL_ARG' });
});
test('optional exact backend defaults may pass; required transportation never defaults', () => {
  const x = planContext('car');
  assert.deepEqual(candidateGate(tool('plan_trip', { ...planArgs, children: 0, pacing: 'balanced', preferences: [], mandatoryPlaceIds: [] }),
    'plan_trip', userA, x.messages, x.observations), { status: 'ALLOW' });
  const y = planContext(null);
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, y.messages, y.observations), { status: 'CLARIFY', fields: ['transportation'] });
});
test('latest verified user turn changes transportation and overrides older car', () => {
  const x = planContext('car'); x.messages.push(message('Đổi sang xe máy.'));
  x.observations.push(evidence('transportation', 'motorbike', 'Đổi sang xe máy', 1, x.messages));
  assert.deepEqual(candidateGate(tool('plan_trip', { ...planArgs, transportation: 'motorbike' }), 'plan_trip', userA, x.messages, x.observations), { status: 'ALLOW' });
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations), { status: 'CLARIFY', fields: ['transportation'] });
});
test('latest explicit unset invalidates older transportation', () => {
  const x = planContext('car'); x.messages.push(message('Tôi chưa chọn phương tiện.'));
  x.observations.push(evidence('transportation', undefined, 'chưa chọn phương tiện', 1, x.messages, 'UNSET'));
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations), { status: 'CLARIFY', fields: ['transportation'] });
});
test('latest budget date and adult corrections override earlier values', () => {
  const x = planContext('car'); x.messages.push(message('Đổi sang 8 triệu, 2033-10-10 tới 2033-10-12, 3 người lớn.'));
  x.observations.push(evidence('totalBudget', 8000000, '8 triệu', 1, x.messages));
  x.observations.push(evidence('startDate', '2033-10-10', '2033-10-10', 1, x.messages));
  x.observations.push(evidence('endDate', '2033-10-12', '2033-10-12', 1, x.messages));
  x.observations.push(evidence('adults', 3, '3 người lớn', 1, x.messages));
  const corrected = tool('plan_trip', { ...planArgs, totalBudget: 8000000, startDate: '2033-10-10', endDate: '2033-10-12', adults: 3 });
  assert.deepEqual(candidateGate(corrected, 'plan_trip', userA, x.messages, x.observations), { status: 'ALLOW' });
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations),
    { status: 'CLARIFY', fields: ['startDate', 'endDate', 'adults', 'totalBudget'] });
});
test('foreign-account or unverified client history cannot support a tool argument', () => {
  const x = planContext('car');
  x.messages[0] = { ...x.messages[0], ownerId: userB };
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations).status, 'CLARIFY');
  x.messages[0] = { ...x.messages[0], ownerId: userA, serverVerified: false };
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations).status, 'CLARIFY');
});
test('assistant history cannot be used as user provenance', () => {
  const x = planContext('car'); x.messages[0] = { ...x.messages[0], role: 'assistant' };
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations).status, 'CLARIFY');
});
test('wrong or incomplete clarify fields are rejected; correct multi-field clarify remains tool-free', () => {
  const x = planContext(null); x.observations = x.observations.filter(o => o.field !== 'totalBudget');
  assert.deepEqual(candidateGate({ kind: 'clarify', fields: ['transportation'] }, 'plan_trip', userA, x.messages, x.observations),
    { status: 'REJECT', reason: 'INCOMPLETE_OR_WRONG_CLARIFY_FIELDS' });
  assert.deepEqual(candidateGate({ kind: 'clarify', fields: ['totalBudget', 'transportation'] }, 'plan_trip', userA, x.messages, x.observations),
    { status: 'CLARIFY', fields: ['totalBudget', 'transportation'] });
});
test('model-provided span with wrong canonical value is not accepted', () => {
  const x = planContext('car'); const item = x.observations.find(o => o.field === 'transportation')!;
  item.value = 'motorbike';
  assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations), { status: 'CLARIFY', fields: ['transportation'] });
});
test('readConversation validates shape but cannot authenticate history owner', () => {
  const raw = { message: 'Đi đâu tiếp?', history: [{ role: 'user', content: 'A: Tôi đi Huế.' },
    { role: 'assistant', content: 'Đã hiểu.' }] };
  assert.equal(readConversation(raw).length, 3);
  assert.equal(Object.hasOwn(readConversation(raw)[0], 'ownerId'), false);
});
test('current orchestrator observation: schema-valid hallucinated car reaches only fake tool', async () => {
  const user: AuthUser = { id: userA, email: 'synthetic@example.test', fullName: 'Synthetic', roles: ['CUSTOMER'] };
  let calls = 0;
  const service = new AgentOrchestrator({ provider: new JsonLlmProvider(async () => JSON.stringify(plan)),
    readConsent: async () => ({ personalizationEnabled: false }),
    tools: { execute: async () => { calls++; return { type: 'MOCK_ONLY' }; } } });
  const result = await service.chat(user, { message: 'Tôi chưa chọn phương tiện. Lập lịch trình Hà Nội đến Đà Lạt 2033-09-10 tới 2033-09-12, 2 người lớn, 7 triệu.' });
  assert.equal(result.status, 'completed'); assert.equal(calls, 1); // CONFIRMED current gap, never real tool/DB.
  const x = planContext(null); assert.deepEqual(candidateGate(plan, 'plan_trip', userA, x.messages, x.observations),
    { status: 'CLARIFY', fields: ['transportation'] });
});
test('candidate gate cannot execute a tool; only ALLOW is a policy signal', () => {
  const x = planContext(null), result = candidateGate(plan, 'plan_trip', userA, x.messages, x.observations);
  assert.equal(result.status, 'CLARIFY');
  assert.deepEqual(AGENT_TOOLS.map(t => t.name).sort(), ['plan_trip', 'search_places']);
});
async function main() {
  const passed: string[] = []; for (const [name, fn] of cases) { await fn(); passed.push(name); }
  console.log(JSON.stringify({ suite: 'T-AI-04-F candidate contract/slot gate', tier: 'MOCK_ONLY_CONTRACT',
    passed: passed.length, failed: 0, inference: 0, database: 'NOT_USED', tests: passed }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
