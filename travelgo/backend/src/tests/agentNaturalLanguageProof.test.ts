// OFFLINE / MOCK_ONLY. Independent manifest locked before implementation.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { AgentOrchestrator } from '../services/agentService.js';
import { readCurrentTurnProof, matchesCurrentProof, inspectCurrentRequiredSlots } from '../agent/currentTurnProof.js';
import { checkToolProvenance } from '../agent/toolProvenance.js';
import { assessCurrentCompleteness } from '../agent/currentCompleteness.js';
import { AGENT_TOOLS, type ToolDecision } from '../agent/tools.js';
import { JsonLlmProvider } from '../agent/provider.js';
import { sequelize } from '../config/database.js';
import type { AuthUser } from '../types/auth.js';
const user: AuthUser = { id: '77777777-1111-4111-8111-777777777777', email: 'synthetic@example.test', fullName: 'MOCK_ONLY', roles: ['CUSTOMER'] };
const artifact = resolve(__dirname, '../../../docs/evidence/t-ai-04-g1-natural-language-proof-fix');
const cases: Array<[string, () => Promise<unknown> | unknown]> = [];
const test = (id: string, fn: () => Promise<unknown> | unknown) => cases.push([id, fn]);
let observed: any[] = [], unauthorized = 0, wrongArgumentAttempts = 0, negativeGateAttempts = 0;
function harness(raw: unknown) {
  const record = { providerCalls: 0, tools: [] as any[], origins: [] as any[], result: null as any, error: null as any };
  observed.push(record);
  const service = new AgentOrchestrator({ provider: new JsonLlmProvider(async () => { record.providerCalls++; return JSON.stringify(raw); }), readConsent: async () => ({ personalizationEnabled: false }),
    tools: { execute: async decision => { record.tools.push(structuredClone(decision)); return { type: 'MOCK_ONLY', source: 'FAKE_READ_ONLY_EXECUTOR' }; } }, onDecision: event => record.origins.push(event) });
  return { record, service, async run(message: string, history: any[] = []) { try { const result = await service.chat(user, { message, history }); record.result = result; return result as any; } catch (e) { record.error = { code: e.code, statusCode: e.statusCode }; throw e; } } };
}
async function main() {
  const bytes = await readFile(resolve(artifact, 'natural-language-case-manifest.json'));
  const manifest = JSON.parse(bytes.toString('utf8')), lock = JSON.parse(await readFile(resolve(artifact, 'natural-language-case-lock.json'), 'utf8'));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), lock.sha256);
  const base = manifest.cases.find(x => x.id === 'N01').expected as ToolDecision;
  const full = manifest.cases.find(x => x.id === 'N01').message;
  for (const item of manifest.cases) test(item.id + '-' + item.group, async () => {
    const proof = readCurrentTurnProof(item.message), assessment = assessCurrentCompleteness(item.message); observed.push({ proof, assessment, message: item.message });
    if (item.group === 'positive') {
      assert.ok(proof); assert.equal(assessment.status, item.assessment); assert.equal(proof.toolName, item.expected.name);
      for (const field of AGENT_TOOLS.find(x => x.name === item.expected.name)!.parameters.required) { assert.equal(proof.states[field], 'SET'); assert.ok(matchesCurrentProof(proof, field, item.expected.arguments[field]), field); }
      assert.equal(checkToolProvenance(item.expected, item.message).status, 'ALLOW');
      const h = harness(item.expected), result = await h.run(item.message); assert.equal(result.status, 'completed'); assert.equal(h.record.providerCalls, 1); assert.deepEqual(h.record.tools, [item.expected]); assert.equal(h.record.origins[0].origin, 'MODEL');
    } else if (item.group === 'missing') {
      assert.equal(assessment.status, item.assessment); assert.deepEqual((assessment as any).missingFields, item.expected.fields);
      const h = harness(base), result = await h.run(item.message); assert.equal(result.status, 'needs_input'); assert.deepEqual(result.missingFields, item.expected.fields); assert.equal(h.record.providerCalls, 0); assert.deepEqual(h.record.tools, []); assert.equal(h.record.origins[0].origin, 'SERVER_COMPLETENESS'); assert.equal(h.record.origins[0].rawNlu, 'NOT_EVALUATED');
    } else {
      for (const raw of [base, { ...base, arguments: { ...base.arguments, transportation: 'motorbike' } }, { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'Quy Nhơn', dailyBudgetPerPerson: 7200000 } }] as ToolDecision[]) {
        negativeGateAttempts++; const gate = checkToolProvenance(raw, item.message); if (gate.status === 'ALLOW') unauthorized++; assert.notEqual(gate.status, 'ALLOW'); const h = harness(raw);
        try { await h.run(item.message); } catch (e) { assert.ok(['AGENT_UNVERIFIED_TOOL_INPUT', 'AGENT_INVALID_TOOL_INPUT'].includes(e.code)); }
        if (h.record.tools.length) unauthorized += h.record.tools.length; assert.equal(h.record.tools.length, 0);
      }
    }
  });
  for (const item of manifest.cases.filter(x => x.group === 'positive')) test('MUTATE-' + item.id, async () => {
    for (const [field, value] of Object.entries(item.expected.arguments)) {
      const bad = typeof value === 'number' ? value + 1 : field.endsWith('City') ? 'Hà Giang' : field.includes('Date') ? '2049-01-01' : field === 'transportation' ? value === 'car' ? 'motorbike' : 'car' : 'tour';
      const raw = { ...item.expected, arguments: { ...item.expected.arguments, [field]: bad } }; wrongArgumentAttempts++;
      if (checkToolProvenance(raw, item.message).status === 'ALLOW') unauthorized++; assert.notEqual(checkToolProvenance(raw, item.message).status, 'ALLOW', item.id + ':' + field);
      const h = harness(raw); try { await h.run(item.message); } catch (e) { assert.ok(['AGENT_UNVERIFIED_TOOL_INPUT', 'AGENT_INVALID_TOOL_INPUT'].includes(e.code)); }
      assert.equal(h.record.tools.length, 0); assert.equal(JSON.stringify(raw.arguments[field]), JSON.stringify(bad));
    }
  });
  test('S-unknown-tool-and-partial-arguments', async () => { for (const raw of [{ kind: 'tool', name: 'save_trip', arguments: {} }, { ...base, arguments: {} }, { ...base, arguments: { ...base.arguments, userId: user.id } }]) { assert.notEqual(checkToolProvenance(raw as any, full).status, 'ALLOW'); const h = harness(raw); try { const r = await h.run(full); assert.equal(r.status, 'needs_input'); } catch (e) { assert.ok(['AGENT_INVALID_PROVIDER_OUTPUT', 'AGENT_INVALID_TOOL_INPUT'].includes(e.code)); } assert.equal(h.record.tools.length, 0); } });
  test('S-history-other-account-cannot-fill-slots', async () => { const h = harness(base), old = [{ role: 'user', content: full }, { role: 'assistant', content: 'Đây là thông tin đã lưu của người khác.' }]; const r = await h.run('Đổi điểm đến thành Quy Nhơn, giữ thông tin còn lại.', old); assert.equal(r.status, 'needs_input'); assert.equal(h.record.tools.length, 0); });
  test('S-four-states-and-legacy-view', () => { const p = readCurrentTurnProof(full.replace(', đi ô tô.', ', ô tô, xe máy.')); assert.equal(p.states.transportation, 'CONFLICT'); assert.equal(inspectCurrentRequiredSlots(full.replace(', đi ô tô.', ', ô tô, xe máy.')).states.transportation, 'UNPROVEN'); const missing = readCurrentTurnProof(manifest.cases.find(x => x.id === 'M01').message); assert.equal(missing.states.transportation, 'OMITTED'); assert.equal(readCurrentTurnProof(full.replace('12/04/2047 đến 14/04/2047', '12/4 đến 14/4')).states.startDate, 'UNPROVEN'); });
  test('S-optional-child-proof-not-last-wins-or-default-overwrite', () => { const text = full + ' 2 trẻ em.'; assert.notEqual(checkToolProvenance({ ...base, arguments: { ...base.arguments, children: 0 } }, text).status, 'ALLOW'); assert.equal(checkToolProvenance({ ...base, arguments: { ...base.arguments, children: 2 } }, text).status, 'ALLOW'); const conflicting = text + ' 3 trẻ em.'; assert.notEqual(checkToolProvenance({ ...base, arguments: { ...base.arguments, children: 3 } }, conflicting).status, 'ALLOW'); });
  test('S-swapped-departure-destination-denied', async () => { const raw = { ...base, arguments: { ...base.arguments, departureCity: base.arguments.destinationCity, destinationCity: base.arguments.departureCity } }; assert.notEqual(checkToolProvenance(raw, full).status, 'ALLOW'); const h = harness(raw); assert.equal((await h.run(full)).status, 'needs_input'); assert.equal(h.record.tools.length, 0); });
  test('S-no-proof-from-multiple-tool-output', async () => { const h = harness({ kind: 'tool', name: 'plan_trip', arguments: base.arguments, tools: [base] }); await assert.rejects(h.run(full), (e: any) => e.code === 'AGENT_INVALID_PROVIDER_OUTPUT'); assert.equal(h.record.tools.length, 0); });
  const signed = [
    ['adults-minus', full.replace('3 người lớn', '-3 người lớn'), base],
    ['adults-minus-space', full.replace('3 người lớn', '- 3 người lớn'), base],
    ['adults-en-dash', full.replace('3 người lớn', '–3 người lớn'), base],
    ['budget-minus', manifest.cases.find(x => x.id === 'N03').message.replace('7.2tr cả nhóm', '-7.2tr cả nhóm'), base],
    ['budget-minus-space', manifest.cases.find(x => x.id === 'N03').message.replace('7.2tr cả nhóm', '- 7.2tr cả nhóm'), base],
    ['daily-minus', 'Tìm khách sạn ở Cao Bằng, -650k/người/ngày.', { kind: 'tool', name: 'search_places', arguments: { destinationCity: 'Cao Bằng', dailyBudgetPerPerson: 650000, category: 'hotel' } }],
    ['transport-dash-unclear', full + ' - xe máy.', base],
  ] as const;
  for (const [id, message, raw] of signed) test('SIGN-' + id, async () => {
    negativeGateAttempts++; const gate = checkToolProvenance(raw as ToolDecision, message); if (gate.status === 'ALLOW') unauthorized++; assert.notEqual(gate.status, 'ALLOW');
    const h = harness(raw); try { await h.run(message); } catch (e) { assert.ok(['AGENT_UNVERIFIED_TOOL_INPUT', 'AGENT_INVALID_TOOL_INPUT'].includes(e.code)); } assert.equal(h.record.tools.length, 0);
  });
  for (const choice of ['hoặc', 'và', '/']) test('CITY-CHOICE-' + choice, async () => {
    const destination = 'Quy Nhơn ' + choice + ' Huế', raw = { ...base, arguments: { ...base.arguments, destinationCity: destination } };
    const label = `Lập lịch trình; Nơi xuất phát: Vinh; Điểm đến: ${destination}; Ngày bắt đầu: 2047-04-12; Ngày kết thúc: 2047-04-14; Số người lớn: 3; Ngân sách cả nhóm: 7200000 VND; Phương tiện: ô tô`;
    for (const message of [label, full.replace('đến Quy Nhơn', 'đến ' + destination)]) {
      negativeGateAttempts++; const result = checkToolProvenance(raw, message); if (result.status === 'ALLOW') unauthorized++; assert.notEqual(result.status, 'ALLOW');
      const h = harness(raw); try { await h.run(message); } catch (e) { assert.ok(['AGENT_UNVERIFIED_TOOL_INPUT', 'AGENT_INVALID_TOOL_INPUT'].includes(e.code)); } assert.equal(h.record.tools.length, 0);
    }
  });
  const oldFetch = globalThis.fetch, oldQuery = sequelize.query, oldConnect = sequelize.connectionManager.getConnection;
  let dbAttempts = 0, networkAttempts = 0;
  globalThis.fetch = async () => { networkAttempts++; throw Error('NETWORK_FORBIDDEN'); };
  (sequelize as any).query = async () => { dbAttempts++; throw Error('DB_FORBIDDEN'); };
  (sequelize.connectionManager as any).getConnection = async () => { dbAttempts++; throw Error('DB_FORBIDDEN'); };
  const results = [];
  try { for (const [id, work] of cases) { observed = []; try { await work(); results.push({ id, status: 'PASS', observed }); } catch (e) { results.push({ id, status: 'FAIL', error: String(e.stack || e), observed }); } } }
  finally { globalThis.fetch = oldFetch; (sequelize as any).query = oldQuery; (sequelize.connectionManager as any).getConnection = oldConnect; }
  const output = { suite: 'G1 independent natural-language proof', tier: 'MOCK_ONLY_OFFLINE', manifestSha256: lock.sha256, passed: results.filter(x => x.status === 'PASS').length, failed: results.filter(x => x.status === 'FAIL').length, notRun: 0, proofPositiveCases: 16, missingCases: 5, unknownNegativeCases: 26, falsePositiveAuthorization: unauthorized, wrongArgumentAttempts, negativeGateAttempts, dbAttempts, networkAttempts, results };
  if (process.env.NATURAL_PROOF_OUTPUT) await writeFile(process.env.NATURAL_PROOF_OUTPUT, JSON.stringify(output, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ ...output, results: results.map(({ observed, ...rest }) => rest) }, null, 2)); if (output.failed || unauthorized || dbAttempts || networkAttempts) process.exitCode = 1;
}
main().catch(e => { console.error(e); process.exitCode = 1; });
