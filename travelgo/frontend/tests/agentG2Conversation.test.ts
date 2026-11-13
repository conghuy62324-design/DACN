// MOCK_ONLY. Actual controller, contract, Axios interceptors/service and lifecycle. No network/DB/LLM.
import assert from 'node:assert/strict';
import { AgentG2Conversation } from '../src/utils/agentG2Conversation.ts';
import { AgentSessionLifecycle } from '../src/utils/agentSessionLifecycle.ts';
import { acceptTurnMetadata, parseConversationMetadata, parseG2Privacy, projectAgentRequest, normalizeAgentError, parseAgentResponse } from '../src/utils/agentContract.ts';
import { AgentService } from '../src/services/agentService.ts';
import { api } from '../src/services/api.ts';
import type { G2Client } from '../src/utils/agentG2Conversation.ts';

const tests: Array<[string, () => unknown]> = [];
const test = (name: string, run: () => unknown) => tests.push([name, run]);
const tick = () => new Promise(r => setTimeout(r, 0));
const deferred = () => { let resolve!: (v: any) => void, reject!: (e: any) => void; const promise = new Promise<any>((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const id = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
const consentVersion = 'LOCAL_DEMO_SLOTS_V1' as const;
const notice = { version: consentVersion, enabled: true, ttlSeconds: 900 as const, mode: 'LOCAL_DEMO' as const, text: 'MOCK_ONLY exact server retention notice' };
const expiresAt = new Date(Date.now() + 900000).toISOString();
const meta = (revision = 1, patch: any = {}) => ({ id, revision, expiresAt, mode: 'LOCAL_DEMO' as const, persisted: false as const, ...patch });
const start = () => ({ action: 'start' as const, requestId: crypto.randomUUID(), consentVersion });
const cont = (revision = 1) => ({ action: 'continue' as const, id, revision, requestId: crypto.randomUUID(), consentVersion });
const response = (revision = 1, patch: any = {}) => ({ status: 'needs_input' as const, reply: 'Bạn chưa chọn phương tiện.', missingFields: ['transportation'],
  history: [], historyTruncated: false, context: { mode: 'LOCAL_DEMO_VERIFIED_HISTORY' as const, personalizationEnabled: false, behavioralDataUsed: false as const, persisted: false as const }, conversation: meta(revision), ...patch });
function fixture(overrides: Partial<G2Client> = {}, options: any = {}) {
  const calls: any[] = [], marks: string[] = []; let current = true;
  const client: G2Client = { verifiedPrivacy: async () => notice,
    chat: async (input, signal) => { calls.push({ input, signal }); return response(input.conversation?.action === 'continue' ? input.conversation.revision + 1 : 1); },
    reset: async () => { marks.push('reset'); return meta(2); }, revoke: async () => { marks.push('one'); }, revokeAll: async () => { marks.push('all'); }, ...overrides };
  const chat = new AgentG2Conversation(client, () => current, { markContext: () => marks.push('mark'), confirmedAll: () => marks.push('confirmed'), ...options });
  return { chat, calls, marks, obsolete: () => { current = false; chat.fence(); } };
}
async function opt(f: ReturnType<typeof fixture>) { await f.chat.requestOptIn(); assert.equal(f.chat.agree(), true); }
async function send(f: ReturnType<typeof fixture>, message = 'Đi xe máy đến Đà Lạt') { f.chat.setDraft(message); f.chat.send(); await tick(); }

test('D01 G2 explicit acknowledgement; no inference on notice/decline/agree', async () => {
  const f = fixture(); f.chat.setDraft('Not acknowledged'); f.chat.send(); assert.equal(f.calls.length, 0);
  await f.chat.requestOptIn(); assert.deepEqual(f.chat.getSnapshot().notice, notice); f.chat.decline(); assert.equal(f.chat.agree(), false);
  await opt(f); assert.equal(f.calls.length, 0); assert.equal(f.chat.getSnapshot().phase, 'ready');
});
test('D01 disabled or unknown privacy version cannot opt in', async () => {
  for (const patch of [{ enabled: false }, { version: 'future' }]) {
    const f = fixture({ verifiedPrivacy: async () => ({ ...notice, ...patch } as any) }); await f.chat.requestOptIn();
    assert.equal(f.chat.agree(), false); assert.equal(f.calls.length, 0);
  }
});
test('D02 start/continue use server ID latest revision fresh UUID and no client history', async () => {
  const f = fixture(); await opt(f); await send(f); await send(f, 'Đổi ngân sách thành 8 triệu');
  assert.deepEqual(Object.keys(f.calls[0].input).sort(), ['conversation', 'message']);
  assert.equal(f.calls[0].input.conversation.action, 'start'); assert.equal(f.calls[0].input.conversation.id, undefined);
  assert.deepEqual(f.calls[1].input.conversation, { ...cont(), requestId: f.calls[1].input.conversation.requestId });
  assert.notEqual(f.calls[0].input.conversation.requestId, f.calls[1].input.conversation.requestId);
  assert.equal(f.chat.getSnapshot().metadata?.revision, 2); assert.equal(f.calls[1].input.message, 'Đổi ngân sách thành 8 triệu');
});
test('D02 API projection discards history owner proof tool args and incidental outer flags', () => {
  const input: any = { message: 'Current only', conversation: start(), history: [{ role: 'user', content: 'PRIVATE' }], owner: 'other', userId: 'other', verifiedSlots: { transportation: 'car' }, arguments: {}, skipCompleteness: true, externalProcessingConsent: 'not-retention' };
  assert.deepEqual(projectAgentRequest(input), { message: input.message, conversation: input.conversation });
  assert.throws(() => projectAgentRequest({ ...input, conversation: { ...input.conversation, owner: other } }));
});
test('D03 repeated clarify never auto resends or executes a tool', async () => {
  const f = fixture(); await opt(f); await send(f); await tick(); await tick(); assert.equal(f.calls.length, 1);
  assert.equal(f.chat.getSnapshot().turns[0].response?.status, 'needs_input');
});
test('D04 explicit motorcycle click sends supported label fresh request latest revision', async () => {
  const f = fixture(); await opt(f); await send(f); f.chat.confirmTransportation('motorbike'); await tick();
  assert.equal(f.calls.length, 2); assert.equal(f.calls[1].input.message, 'Phương tiện: motorbike');
  assert.equal(f.calls[1].input.conversation.revision, 1); assert.notEqual(f.calls[0].input.conversation.requestId, f.calls[1].input.conversation.requestId);
});
test('D05 explicit car and manual correction are current messages only', async () => {
  const f = fixture(); await opt(f); await send(f); f.chat.confirmTransportation('car'); await tick();
  await send(f, 'Đổi ngày về thành 20/6/2030, ngân sách 7 triệu, đến Huế');
  assert.equal(f.calls[1].input.message, 'Phương tiện: car'); assert.equal(f.calls[2].input.conversation.revision, 2); assert.equal(f.calls[2].input.history, undefined);
});
test('D06 repeated clarify allows edit reset and end without a resend loop', async () => {
  const f = fixture({ reset: async () => meta(3) }); await opt(f); await send(f); f.chat.confirmTransportation('car'); await tick(); f.chat.setDraft('Tôi sẽ tự sửa');
  await tick(); assert.equal(f.calls.length, 2); await f.chat.reset(); assert.equal(f.chat.getSnapshot().turns.length, 0);
  await f.chat.end(); assert.ok(f.marks.includes('one')); assert.equal(f.chat.canSend(), false);
});
test('D07 old arguments are never repaired or auto posted; D08 exact missing fields retained', async () => {
  const f = fixture({ chat: async () => response(1, { missingFields: ['totalBudget', 'destinationCity'], reply: 'Hãy xác nhận ngân sách và điểm đến.' }) });
  await opt(f); await send(f); const r: any = f.chat.getSnapshot().turns[0].response;
  assert.deepEqual(r.missingFields, ['totalBudget', 'destinationCity']); assert.equal(r.result, undefined);
  f.chat.confirmTransportation('car'); await tick(); assert.equal(f.chat.getSnapshot().turns.length, 1);
});
test('D09 committed provider timeout metadata advances revision; explicit retry fresh ID no duplicate turn', async () => {
  const inputs: any[] = []; const f = fixture({ chat: async input => { inputs.push(input); if (inputs.length === 1) throw { status: 504, code: 'AGENT_TIMEOUT', conversation: meta(), message: 'RAW_SECRET' }; return response(2); } });
  await opt(f); await send(f); assert.equal(f.chat.getSnapshot().metadata?.revision, 1); assert.equal(f.chat.canRetry(), true);
  f.chat.retry(f.chat.getSnapshot().turns[0].id); await tick();
  assert.equal(inputs[1].conversation.revision, 1); assert.notEqual(inputs[0].conversation.requestId, inputs[1].conversation.requestId);
  assert.equal(f.chat.getSnapshot().turns.length, 1); assert.ok(!JSON.stringify(f.chat.getSnapshot()).includes('RAW_SECRET'));
});
for (const patch of [{ id: other }, { revision: 1 }, { expiresAt: new Date(Date.now() + 1800000).toISOString() }]) test(`D09 continue rejects error metadata ${Object.keys(patch)[0]}`, async () => {
  let count = 0; const f = fixture({ chat: async () => { if (!count++) return response(); throw { status: 504, code: 'AGENT_TIMEOUT', conversation: meta(2, patch) }; } });
  await opt(f); await send(f); await send(f, 'Sửa'); assert.equal(f.chat.getSnapshot().metadata?.revision, 1); assert.equal(f.chat.canRetry(), false);
});
for (const code of ['AGENT_G2_REVISION_CONFLICT', 'AGENT_G2_REPLAY', 'AGENT_G2_BUSY', 'AGENT_G2_STALE_TURN']) test(`D10 ${code} fails closed without stale adoption`, async () => {
  const f = fixture({ chat: async () => { throw { status: 409, code, conversation: meta() }; } }); await opt(f); await send(f);
  assert.equal(f.chat.getSnapshot().phase, 'conflict'); assert.equal(f.chat.getSnapshot().metadata, undefined); f.chat.send(); await tick(); assert.equal(f.chat.getSnapshot().turns.length, 1);
});
test('D10 unavailable owner/restart cannot reconstruct proof', async () => {
  let count = 0; const f = fixture({ chat: async () => { if (!count++) return response(); throw { status: 404, code: 'AGENT_G2_SESSION_UNAVAILABLE', conversation: meta(2) }; } });
  await opt(f); await send(f); await send(f, 'Continue'); assert.equal(f.chat.getSnapshot().phase, 'unavailable'); assert.equal(f.chat.getSnapshot().metadata, undefined); assert.equal(f.chat.canSend(), false);
});
test('D11 expiry blocks POST even before UI timer ticks', async () => {
  let now = Date.now(); const f = fixture({}, { now: () => now }); await opt(f); await send(f); now = Date.parse(expiresAt);
  await send(f, 'Too late'); assert.equal(f.calls.length, 1); assert.equal(f.chat.getSnapshot().phase, 'expired'); assert.equal(f.chat.getSnapshot().metadata, undefined);
});
test('D11 fresh controller after reload cannot restore IDs/revisions/transcript', async () => {
  const f = fixture(); await opt(f); await send(f); const next = fixture(); assert.deepEqual(next.chat.getSnapshot().turns, []); assert.equal(next.chat.getSnapshot().metadata, undefined); assert.equal(next.chat.canSend(), false);
});
test('D12 reset fences pending response and accepts server revision including already committed turn', async () => {
  const held = deferred(); let count = 0; const f = fixture({ chat: async () => ++count === 1 ? response() : held.promise, reset: async () => meta(3) });
  await opt(f); await send(f); f.chat.setDraft('Pending'); f.chat.send(); await tick(); await f.chat.reset(); held.resolve(response(2)); await tick();
  assert.equal(f.chat.getSnapshot().metadata?.revision, 3); assert.equal(f.chat.getSnapshot().turns.length, 0); assert.equal(f.chat.getSnapshot().busy, false);
});
test('D12 reset with unknown start ID revokes all; late start cannot rehydrate', async () => {
  const held = deferred(); const f = fixture({ chat: async () => held.promise }); await opt(f); f.chat.setDraft('Pending start'); f.chat.send();
  await f.chat.reset(); held.resolve(response()); await tick(); assert.deepEqual(f.marks, ['mark', 'all', 'confirmed']); assert.equal(f.chat.getSnapshot().metadata, undefined); assert.equal(f.chat.getSnapshot().turns.length, 0);
});
test('D12 reset rejects foreign ID extended TTL or nonadvancing revision', async () => {
  for (const patch of [{ id: other }, { expiresAt: '2099-01-01T00:00:00.000Z' }, { revision: 1 }]) {
    const f = fixture({ reset: async () => meta(2, patch) }); await opt(f); await send(f); await f.chat.reset(); assert.equal(f.chat.getSnapshot().phase, 'uncertain'); assert.equal(f.chat.getSnapshot().metadata, undefined);
  }
});
test('D12 revoke failure clears local context without claiming server deletion', async () => {
  const f = fixture({ revoke: async () => { throw Error('RAW_SECRET'); } }); await opt(f); await send(f); await f.chat.end();
  assert.equal(f.chat.getSnapshot().turns.length, 0); assert.equal(f.chat.getSnapshot().metadata, undefined); assert.match(f.chat.getSnapshot().message!, /chưa xác nhận/);
});
test('D13 auth fence rejects late chat and late reset/revoke cleanup side effects', async () => {
  const held = deferred(); const f = fixture({ chat: async () => held.promise }); await opt(f); f.chat.setDraft('PRIVATE_A'); f.chat.send(); f.obsolete(); held.resolve(response()); await tick(); assert.deepEqual(f.chat.getSnapshot().turns, []);
  for (const command of ['reset', 'end'] as const) {
    const delay = deferred(), g = fixture({ revokeAll: async () => delay.promise }); await opt(g); const pending = g.chat[command](); g.obsolete(); delay.resolve(undefined); await pending; assert.ok(!g.marks.includes('confirmed'));
  }
});
test('D14 synchronous double submit blocked and quota never auto retried', async () => {
  const held = deferred(); let calls = 0; const f = fixture({ chat: async () => { calls++; return held.promise; } }); await opt(f); f.chat.setDraft('Go'); f.chat.send(); f.chat.send(); assert.equal(calls, 1);
  held.reject({ status: 429, code: 'AGENT_RATE_LIMITED' }); await tick(); await tick(); assert.equal(calls, 1); assert.equal(f.chat.canRetry(), true); f.chat.retry(f.chat.getSnapshot().turns[0].id); await tick(); assert.equal(calls, 2);
});
test('D14 unknown network failure cannot guess committed revision or retry', async () => {
  const f = fixture({ chat: async () => { throw { status: 0, message: 'RAW_SECRET' }; } }); await opt(f); await send(f); assert.equal(f.chat.getSnapshot().phase, 'uncertain'); assert.equal(f.chat.canRetry(), false);
});
test('D15 malformed completed/provenance/unknown fields cannot fake Planner success', () => {
  for (const patch of [{ status: 'completed', result: { type: 'fake' } }, { status: 'needs_input', missingFields: ['children'] }, { conversation: meta(1, { owner: other }) }]) assert.throws(() => parseAgentResponse({ success: true, data: response(1, patch) }));
  assert.throws(() => parseAgentResponse({ success: true, data: response(1, { status: 'completed', result: { type: 'places', source: 'MOCK_PROVIDER', warnings: [], places: [] } }) }));
});
test('metadata strict shape and request-bound revision; 401/409 never retained', () => {
  assert.deepEqual(acceptTurnMetadata(meta(2), cont()), meta(2));
  for (const p of [{ revision: 0 }, { id: 'not-a-uuid' }, { persisted: true }, { expiresAt: 'not-date' }, { mode: 'STATELESS' }]) assert.throws(() => parseConversationMetadata(meta(1, p)));
  for (const status of [401, 409]) assert.equal(normalizeAgentError({ code: 'AGENT_TIMEOUT', conversation: meta() }, status, { message: 'Go', conversation: start() }).conversation, undefined);
  assert.throws(() => parseG2Privacy({ success: true, data: { ...notice, version: 'future' } }));
});

const storage = () => { const values = new Map<string, string>(); return { values, getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => { values.set(k, v); }, removeItem: (k: string) => { values.delete(k); }, clear: () => values.clear() }; };
test('D13 participation hint survives reload only as cleanup hint, never token/chat/proof', async () => {
  const s = storage(), one = new AgentSessionLifecycle(() => s); one.mark('A'); const two = new AgentSessionLifecycle(() => s);
  assert.equal(two.mayHaveContext('A'), true); assert.equal(two.mayHaveContext('B'), false);
  assert.deepEqual(Object.keys(JSON.parse([...s.values.values()][0])).sort(), ['owner', 'stamp', 'until']);
  let fenced = false, calls = 0; two.register('TOKEN_A', () => { fenced = true; }); const done = two.authExit('TOKEN_A', 'A', async () => { calls++; });
  assert.equal(fenced, true); assert.equal((await done).confirmed, true); assert.equal(calls, 1); assert.equal(two.mayHaveContext('A'), false);
});
test('D13 no participation means G1 logout sends no revoke; failed cleanup does not reject', async () => {
  const lifecycle = new AgentSessionLifecycle(() => undefined); let calls = 0;
  assert.equal((await lifecycle.authExit('A', 'A', async () => { calls++; })).attempted, false); assert.equal(calls, 0);
  lifecycle.mark('A'); assert.equal((await lifecycle.authExit('A', 'A', async () => { throw Error('offline'); })).confirmed, false); assert.equal(lifecycle.mayHaveContext('A'), true);
});
test('D13 cleanup deadline resolves even if transport ignores abort; no late hint deletion', async () => {
  const s = storage(), lifecycle = new AgentSessionLifecycle(() => s), held = deferred(); lifecycle.mark('A');
  const cleanup = lifecycle.authExit('TOKEN_A', 'A', () => held.promise); const result = await cleanup;
  assert.equal(result.confirmed, false); lifecycle.mark('A'); held.resolve(undefined); await tick(); assert.equal(lifecycle.mayHaveContext('A'), true);
});
test('D13 late successful cleanup cannot clear a newly marked same-owner context', async () => {
  const lifecycle = new AgentSessionLifecycle(() => storage()), held = deferred(); lifecycle.mark('A');
  const done = lifecycle.authExit('TOKEN_A', 'A', () => held.promise); lifecycle.mark('A'); held.resolve(undefined); await done; assert.equal(lifecycle.mayHaveContext('A'), true);
});

const local = storage(); Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
const events: string[] = []; Object.defineProperty(globalThis, 'window', { value: { dispatchEvent: (e: Event) => events.push(e.type) }, configurable: true });
const originalAdapter = api.defaults.adapter;
function adapter(work: (config: any) => any) { api.defaults.adapter = async config => {
  const value = await work(config); return { data: { success: true, data: value }, status: 200, statusText: 'OK', headers: {}, config };
}; }
test('actual AgentService uses exact endpoints and pinned token with safe G2 request projection', async () => {
  local.setItem('travelgo_token', 'MOCK_ONLY_A'); const seen: any[] = [];
  adapter(config => { seen.push(config); if (config.url?.endsWith('/privacy')) return notice; if (config.url === '/agent/chat') return response(); if (config.url?.endsWith('/reset')) return meta(2); return { revoked: true }; });
  const client = AgentService.forSession('MOCK_ONLY_A'), signal = new AbortController().signal;
  await client.verifiedPrivacy(signal); await client.chat({ message: 'Current', conversation: start(), history: [{ role: 'user', content: 'PRIVATE_HISTORY' }] }, signal);
  await client.reset(id, signal); await client.revoke(id, signal); await client.revokeAll(signal);
  assert.deepEqual(seen.map(x => x.url), ['/agent/verified-history/privacy', '/agent/chat', `/agent/verified-history/${id}/reset`, `/agent/verified-history/${id}`, '/agent/verified-history']);
  assert.equal(seen[1].headers.Authorization, 'Bearer MOCK_ONLY_A'); assert.equal(JSON.parse(seen[1].data).history, undefined); assert.equal(JSON.parse(seen[2].data).owner, undefined);
});
test('actual Agent interceptor retains safe error metadata and hides raw provider secrets', async () => {
  local.setItem('travelgo_token', 'MOCK_ONLY_A'); adapter(config => { throw { config, response: { status: 504, data: { code: 'AGENT_TIMEOUT', conversation: meta(), message: 'RAW_SECRET', stack: 'RAW_STACK' } } }; });
  await assert.rejects(AgentService.forSession('MOCK_ONLY_A').chat({ message: 'Go', conversation: start() }, new AbortController().signal), (e: any) => { assert.equal(e.conversation.revision, 1); assert.ok(!JSON.stringify(e).includes('RAW_')); return true; });
});
test('actual Agent request cancels old queued POST rather than using new token; DELETE pins old token', async () => {
  local.setItem('travelgo_token', 'MOCK_ONLY_B'); let calls = 0; adapter(config => { calls++; assert.equal(config.headers.Authorization, 'Bearer MOCK_ONLY_A'); return { revoked: true }; });
  await assert.rejects(AgentService.forSession('MOCK_ONLY_A').chat({ message: 'Go', conversation: start() }, new AbortController().signal), (e: any) => e.canceled === true);
  assert.equal(calls, 0); await AgentService.forSession('MOCK_ONLY_A').revokeAll(new AbortController().signal); assert.equal(calls, 1);
});
test('actual late A 401 cannot clear B login while current B 401 still clears auth', async () => {
  local.setItem('travelgo_token', 'MOCK_ONLY_B'); adapter(config => { throw { config, response: { status: 401, data: { code: 'TOKEN_EXPIRED' } } }; });
  await assert.rejects(AgentService.forSession('MOCK_ONLY_A').revokeAll(new AbortController().signal)); assert.equal(local.getItem('travelgo_token'), 'MOCK_ONLY_B'); assert.equal(events.length, 0);
  await assert.rejects(AgentService.forSession('MOCK_ONLY_B').revokeAll(new AbortController().signal)); assert.equal(local.getItem('travelgo_token'), null); assert.deepEqual(events, ['travelgo:unauthorized']);
});
test('non-Agent auth header policy remains current-token behavior', async () => {
  local.setItem('travelgo_token', 'MOCK_ONLY_B'); adapter(config => { assert.equal(config.headers.Authorization, 'Bearer MOCK_ONLY_B'); return {}; }); await api.get('/trips', { headers: { Authorization: 'Bearer OLD' } });
});
test('G1 mode mismatch still rejected by actual service', async () => {
  local.setItem('travelgo_token', 'MOCK_ONLY_A'); adapter(() => response()); await assert.rejects(AgentService.forSession('MOCK_ONLY_A').chat({ message: 'G1', history: [] }, new AbortController().signal));
});

const results = [];
for (const [name, run] of tests) { try { await run(); results.push({ name, status: 'PASS' }); } catch (error) { results.push({ name, status: 'FAIL', error: String(error) }); } }
api.defaults.adapter = originalAdapter;
console.log(JSON.stringify({ tier: 'MOCK_ONLY_OFFLINE', passed: results.filter(x => x.status === 'PASS').length, failed: results.filter(x => x.status === 'FAIL').length, results, liveInference: 0, database: false }, null, 2));
if (results.some(x => x.status === 'FAIL')) process.exitCode = 1;
