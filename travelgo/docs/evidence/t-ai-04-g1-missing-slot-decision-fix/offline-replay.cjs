// MOCK_ONLY historical-response replay. No inference, DB or real tool invocation.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const { AgentOrchestrator } = require(path.join(root, 'backend/dist/services/agentService.js'));
const { createConfiguredProvider } = require(path.join(root, 'backend/dist/agent/liveProvider.js'));
const { MissingReadSlotsRejection } = require(path.join(root, 'backend/dist/agent/missingSlotRecovery.js'));
const { matchesDecisionSchema } = require(path.join(root, 'backend/dist/agent/decisionValidation.js'));
const { sequelize } = require(path.join(root, 'backend/dist/config/database.js'));
const config = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
  OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: 'MOCK_ONLY' };
const user = { id: '44444444-4444-4444-8444-444444444444', roles: ['CUSTOMER'] };
async function main() {
  const originalQuery = sequelize.query, originalFetch = globalThis.fetch;
  sequelize.query = async () => { throw Error('DB forbidden in offline replay'); };
  globalThis.fetch = async () => { throw Error('Network forbidden in offline replay'); };
  const results = [];
  try {
    for (const id of ['S01', 'S02', 'S03', 'S04', 'S05', 'S06']) {
      const rel = `docs/evidence/t-ai-04-g1-slot-filling-live-revalidation/${id}.json`, historical = json(rel);
      let fakeCalls = 0, toolCalls = 0, providerError = null, providerReturned = null, system;
      const provider = createConfiguredProvider(config, async (_url, init) => {
        fakeCalls++; system = JSON.parse(init.body).messages[0].content;
        return new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: historical.rawModelDecision },
          prompt_eval_count: 1, eval_count: 1 }));
      });
      const svc = new AgentOrchestrator({ provider: { configured: true, external: false, generate: async (input, signal) => {
        try { const result = await provider.generate(input, signal); providerReturned = result; return result; }
        catch (error) { providerError = { code: error.code, statusCode: error.statusCode,
          classifiedMissingSlots: error instanceof MissingReadSlotsRejection, toolName: error.toolName || null, fields: error.fields || [] }; throw error; }
      } }, readConsent: async () => ({ personalizationEnabled: false }), tools: { execute: async () => { toolCalls++; return { type: 'MOCK_ONLY', source: 'MOCK_ONLY' }; } } });
      const response = await svc.chat(user, historical.request);
      assert.equal(fakeCalls, 1); assert.equal(toolCalls, ['S04', 'S05'].includes(id) ? 1 : 0);
      if (id === 'S01') {
        assert.equal(response.status, 'needs_input'); assert.deepEqual(response.missingFields, ['transportation']);
        assert.equal(providerReturned, null); assert.equal(providerError.classifiedMissingSlots, true);
        assert.equal(matchesDecisionSchema(JSON.parse(historical.rawModelDecision)), false);
      }
      const record = { id, tier: 'MOCK_ONLY_HISTORICAL_RESPONSE_REPLAY', historicalSource: rel, historicalSourceSha256: sha(read(rel)),
        historicalNluResultNotRemeasured: historical.nlu, rawModelContentReplayed: historical.rawModelDecision,
        expectedRawDecision: historical.expected, originalSchemaValid: matchesDecisionSchema(JSON.parse(historical.rawModelDecision)),
        providerReturned, providerError, response, fakeProviderCalls: fakeCalls, fakeToolCalls: toolCalls,
        recoveryApplied: id === 'S01', liveNluEvaluation: 'NOT RUN', inferencePosts: 0, databaseAccess: 'NONE' };
      write(id + '-offline-replay.json', record); results.push({ id, responseStatus: response.status, fakeToolCalls: toolCalls, recoveryApplied: record.recoveryApplied });
      if (id === 'S01') fs.writeFileSync(path.join(__dirname, 'ollama-system-after.txt'), system, { flag: 'wx' });
    }
    write('offline-replay-summary.json', { tier: 'MOCK_ONLY_HISTORICAL_RESPONSE_REPLAY', results,
      liveNluEvaluation: 'NOT RUN', historicalRawNluScoresUnchanged: true, inferencePosts: 0, databaseAccess: 'NONE' });
    console.log(JSON.stringify({ replays: results.length, s01Status: results[0].responseStatus, s01FakeToolCalls: results[0].fakeToolCalls, inferencePosts: 0 }));
  } finally { sequelize.query = originalQuery; globalThis.fetch = originalFetch; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
