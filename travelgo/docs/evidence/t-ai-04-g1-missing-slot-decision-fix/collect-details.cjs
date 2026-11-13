// Offline review artifacts and prompt byte-budget comparison only.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const { createConfiguredProvider } = require(path.join(root, 'backend/dist/agent/liveProvider.js'));
const { AGENT_TOOLS } = require(path.join(root, 'backend/dist/agent/tools.js'));
const oldSource = fs.readFileSync(path.join(__dirname, 'agentService.ts.before.txt'), 'utf8');
const oldSystem = oldSource.match(/const SYSTEM = `([\s\S]*?)`;/)[1];
const newSystem = fs.readFileSync(path.join(__dirname, 'ollama-system-after.txt'), 'utf8');
const historical = JSON.parse(read('docs/evidence/t-ai-04-g1-slot-filling-live-revalidation/S01.json'));
const added = ['backend/src/agent/missingSlotRecovery.ts', 'backend/src/tests/agentMissingSlotRecovery.test.ts'];
let diff = '';
for (const rel of added) {
  const lines = read(rel).toString('utf8').replaceAll('\r\n', '\n').trimEnd().split('\n');
  diff += `diff --git a/${rel} b/${rel}\nnew file mode 100644\n--- /dev/null\n+++ b/${rel}\n@@ -0,0 +1,${lines.length} @@\n` + lines.map(line => '+' + line).join('\n') + '\n';
}
fs.writeFileSync(path.join(__dirname, 'added-source.diff'), diff, { flag: 'wx' });
(async () => {
  const provider = createConfiguredProvider({ LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true',
    OLLAMA_LOCAL_ONLY_CONFIRMED: 'true', OLLAMA_MODEL: 'MOCK_ONLY' }, async (_url, init) => {
      const oldWire = JSON.parse(init.body).messages[0].content;
      const messages = [{ role: 'user', content: historical.request.message }];
      const budget = system => Buffer.byteLength(JSON.stringify({ system, messages }), 'utf8') + 512;
      fs.writeFileSync(path.join(__dirname, 'ollama-system-before.txt'), oldWire, { flag: 'wx' });
      assert.equal(sha(oldWire), 'a70fa78949b83635dfd65bafd64504542f2733f9275d93fe5f83dc464f56c0ba');
      const files = ['backend/src/agent/liveProvider.ts', 'backend/src/agent/toolProvenance.ts', 'backend/src/services/agentService.ts', ...added];
      write('review-details.json', { sourceHashes: Object.fromEntries(files.map(rel => [rel, sha(read(rel))])),
        promptWire: { beforeSha256: sha(oldWire), afterSha256: sha(newSystem), sameHistoricalInput: 'S01 offline only',
          beforeBudgetBytes: budget(oldWire), afterBudgetBytes: budget(newSystem), byteGuard: 12288, actualModelTokens: 'NOT MEASURED' },
        oldFSourceSha256: sha(read('backend/src/tests/agentContractSlotInvestigation.test.ts')),
        derivedFRunnerSha256: sha(read('backend/dist/tests/agentContractSlotInvestigation.g1-applicable.js')),
        inferencePosts: 0, databaseAccess: 'NONE' });
      return new Response(JSON.stringify({ done: true, done_reason: 'stop', message: { role: 'assistant', content: JSON.stringify({ kind: 'unsupported' }) }, prompt_eval_count: 1, eval_count: 1 }));
    });
  await provider.generate({ system: oldSystem, messages: [{ role: 'user', content: historical.request.message }], tools: AGENT_TOOLS }, new AbortController().signal);
  console.log(fs.readFileSync(path.join(__dirname, 'review-details.json'), 'utf8'));
})().catch(error => { console.error(error); process.exitCode = 1; });
