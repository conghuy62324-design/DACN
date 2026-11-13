// MOCK_ONLY client; tests actual state controller and API response boundary, no DB/LLM.
import assert from 'node:assert/strict';
import { AgentConversation } from '../src/utils/agentConversation.ts';
import { parseAgentResponse, parseAgentPrivacy, agentErrorMessage } from '../src/utils/agentContract.ts';

const base = { reply: 'Bạn muốn đi đâu?', status: 'needs_input', missingFields: ['destinationCity'],
  history: [{ role: 'user', content: 'Xin chào' }, { role: 'assistant', content: 'Bạn muốn đi đâu?' }],
  historyTruncated: false, context: { mode: 'STATELESS', personalizationEnabled: false, behavioralDataUsed: false, persisted: false } };
const response = (patch = {}) => parseAgentResponse({ success: true, data: { ...base, ...patch } });
const notice = { version: 'external-chat-v1', text: 'MOCK_ONLY notice' };
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const tests: Array<[string, () => unknown]> = [];
const test = (name: string, fn: () => unknown) => tests.push([name, fn]);
test('response union and privacy envelope validation', () => {
  for (const status of ['needs_input', 'unsupported', 'tool_unavailable']) assert.equal(response({ status, warningCode: 'AGENT_CATALOG_INSUFFICIENT' }).status, status);
  assert.deepEqual(parseAgentPrivacy({ success: true, data: notice }), notice);
  for (const bad of [{ success: false }, { success: true, data: { ...base, history: [{ role: 'system', content: 'fake' }] } },
    { success: true, data: { ...base, status: 'completed', result: { type: 'fake' } } }]) assert.throws(() => parseAgentResponse(bad));
  assert.throws(() => parseAgentPrivacy({ success: true, data: { version: '' } }));
});
test('catalog price zero versus null preserved; malformed result rejected', () => {
  const result = { type: 'places', source: 'RecommendationService', places: [{ id: 'p', name: '<img onerror=alert(1)>', priceFrom: 0, catalogPriceAvailable: true }], warnings: [] };
  const value: any = response({ status: 'completed', result }); assert.equal(value.result.places[0].priceFrom, 0);
  assert.equal(value.result.places[0].name, '<img onerror=alert(1)>'); // Rendering must escape, not rewrite content.
  assert.throws(() => response({ status: 'completed', result: { ...result, places: [{ ...result.places[0], priceFrom: NaN }] } }));
});
test('multi-turn request uses exact server-returned history, not displayed replies', async () => {
  const requests: any[] = [];
  const chat = new AgentConversation({ chat: async input => { requests.push(input); return response(); }, privacy: async () => notice }, () => true);
  chat.setDraft('Xin chào'); chat.send(); await tick(); chat.setDraft('Đà Nẵng'); chat.send(); await tick();
  assert.deepEqual(requests[0], { message: 'Xin chào', history: [] }); assert.deepEqual(requests[1].history, base.history);
  assert.equal(chat.getSnapshot().draft, ''); assert.equal(chat.getSnapshot().turns.length, 2);
});
test('synchronous double-submit blocked; aborted late result cannot cross reset/new request', async () => {
  const pending: any[] = [];
  const chat = new AgentConversation({ chat: (input, signal) => new Promise(resolve => pending.push({ input, signal, resolve })), privacy: async () => notice }, () => true);
  chat.setDraft('Cũ'); chat.send(); chat.send(); assert.equal(pending.length, 1); assert.equal(chat.getSnapshot().busy, true);
  chat.reset(); assert.equal(pending[0].signal.aborted, true); chat.setDraft('Mới'); chat.send();
  pending[1].resolve(response({ reply: 'Kết quả mới' })); await tick(); pending[0].resolve(response({ reply: 'Kết quả cũ' })); await tick();
  assert.equal(chat.getSnapshot().turns.length, 1); assert.equal(chat.getSnapshot().turns[0].response?.reply, 'Kết quả mới');
});
test('account identity guard rejects result even if transport ignores cancellation', async () => {
  let sameAccount = true; let resolve!: (v: any) => void;
  const chat = new AgentConversation({ chat: () => new Promise(r => resolve = r), privacy: async () => notice }, () => sameAccount);
  chat.setDraft('Private A'); chat.send(); sameAccount = false; resolve(response()); await tick();
  assert.equal(chat.getSnapshot().turns[0].response, undefined); chat.cancel(); assert.equal(chat.getSnapshot().turns.length, 0);
  const other = new AgentConversation({ chat: async () => response(), privacy: async () => notice }, () => true);
  assert.equal(other.getSnapshot().turns.length, 0);
});
test('failed question and draft retained; manual retry does not duplicate turn/history', async () => {
  let calls = 0; const requests: any[] = [];
  const chat = new AgentConversation({ chat: async input => { requests.push(input); if (!calls++) throw { status: 503, message: 'RAW_SECRET' }; return response(); }, privacy: async () => notice }, () => true);
  chat.setDraft('Nháp'); chat.send(); await tick(); assert.equal(chat.getSnapshot().draft, 'Nháp');
  assert.equal(chat.getSnapshot().turns[0].question, 'Nháp'); assert.ok(!JSON.stringify(chat.getSnapshot()).includes('RAW_SECRET'));
  chat.retry(chat.getSnapshot().turns[0].id); await tick(); assert.equal(calls, 2); assert.equal(chat.getSnapshot().turns.length, 1);
  assert.deepEqual(requests[1].history, []);
});
test('428 fetches notice but does not retry; decline preserves draft; consent only on explicit agree and one request', async () => {
  const requests: any[] = [];
  const chat = new AgentConversation({ chat: async input => { requests.push(input); if (!input.externalProcessingConsent) throw { status: 428 }; return response(); }, privacy: async () => notice }, () => true);
  chat.setDraft('Nháp riêng tư'); chat.send(); await tick(); assert.equal(requests.length, 1); assert.equal(chat.getSnapshot().notice?.version, notice.version);
  chat.decline(); assert.equal(requests.length, 1); assert.equal(chat.getSnapshot().draft, 'Nháp riêng tư');
  chat.send(); await tick(); chat.agree(); await tick(); assert.equal(requests.length, 3); assert.equal(requests[2].externalProcessingConsent, notice.version);
  chat.setDraft('Lượt mới'); chat.send(); await tick(); assert.equal(requests[3].externalProcessingConsent, undefined);
});
test('reset during pending privacy fetch prevents stale dialog/consent', async () => {
  let resolve!: (v: any) => void;
  const chat = new AgentConversation({ chat: async () => { throw { status: 428 }; }, privacy: () => new Promise(r => resolve = r) }, () => true);
  chat.setDraft('Cũ'); chat.send(); await tick(); chat.reset(); resolve(notice); await tick(); chat.agree();
  assert.equal(chat.getSnapshot().notice, undefined); assert.equal(chat.getSnapshot().turns.length, 0);
});
test('all errors map to controlled text, never provider raw error', () => {
  for (const status of [0, 400, 401, 428, 429, 502, 503, 504]) {
    const message = agentErrorMessage({ status, code: 'RAW_SECRET' }); assert.ok(message.length > 10); assert.ok(!message.includes('RAW_SECRET'));
  }
  assert.match(agentErrorMessage({ status: 503, code: 'AGENT_PROVIDER_NOT_CONFIGURED' }), /chưa sẵn sàng/);
});
test('empty/oversized input never submits; reset clears all memory', () => {
  let calls = 0; const chat = new AgentConversation({ chat: async () => { calls++; return response(); }, privacy: async () => notice }, () => true);
  chat.setDraft('   '); chat.send(); assert.equal(calls, 0); chat.setDraft('x'.repeat(2100)); assert.equal(chat.getSnapshot().draft.length, 2000);
  chat.reset(); assert.deepEqual(chat.getSnapshot(), { draft: '', turns: [], busy: false, notice: undefined, declined: false });
});
const results = [];
for (const [name, run] of tests) { await run(); results.push({ name, status: 'PASS' }); }
console.log(JSON.stringify({ tier: 'MOCK_ONLY', passed: results.length, failed: 0, results }, null, 2));
