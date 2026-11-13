// Read-only offline source/log/request comparison. No inference/DB/config changes.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const runtime = JSON.parse(fs.readFileSync(path.join(__dirname, 'runtime-readonly.json')));
const server = runtime.logs.find(x => x.name === 'server.log');
const serverText = fs.readFileSync(server.sourcePath, 'utf8');
const configLine = serverText.split(/\r?\n/u).find(line => /msg="server config"/u.test(line)) || '';
const allow = ['CONTEXT_LENGTH', 'NUM_PARALLEL', 'MAX_LOADED_MODELS', 'MAX_QUEUE', 'LOAD_TIMEOUT', 'KEEP_ALIVE', 'GPU_OVERHEAD', 'FLASH_ATTENTION', 'KV_CACHE_TYPE'];
const safeConfig = {};
for (const key of allow) {
  const match = configLine.match(new RegExp('OLLAMA_' + key + ':([^\\]\\s]+)'));
  if (match) safeConfig['OLLAMA_' + key] = match[1];
}
let modelMapping;
try {
  const manifestPath = path.join(process.env.USERPROFILE, '.ollama/models/manifests/registry.ollama.ai/library/qwen3/4b-instruct-2507-q4_K_M');
  const bytes = fs.readFileSync(manifestPath), manifest = JSON.parse(bytes);
  modelMapping = { sourcePath: manifestPath, manifestSha256: sha(bytes), layers: manifest.layers.map(layer => ({ mediaType: layer.mediaType, digest: layer.digest, size: layer.size })),
    loggedWeightBlob: 'sha256:85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9',
    loggedWeightMatchesManifestLayer: manifest.layers.some(layer => layer.digest === 'sha256:85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9') };
} catch (error) { modelMapping = { unavailable: String(error.message || error) }; }
const structural = JSON.parse(fs.readFileSync(path.join(__dirname, 'runner-structural-log.json'))).rows;
const criticalRunnerRows = structural.filter(row => /projected to use|will leave|model buffer size|KV buffer size|compute buffer size|offloaded|new slot, n_ctx|n_ctx_per_seq|memory breakdown|CUDA0 \(RTX|out of memory|failed to allocate/iu.test(row.text));
write('runtime-config-and-memory.json', { safeConfigOnly: safeConfig, configScope: 'Whitelisted non-secret server defaults; request -c/num_ctx overrides must be read separately',
  modelMapping, criticalRunnerRows,
  observedServerOOMRows: structural.filter(row => /out of memory|failed to allocate|cuda error/iu.test(row.text)),
  explicitQueueRows: server.matchingMRunWindowRows.filter(row => /queued|queue full|waiting for available runner|requests waiting/iu.test(row.text)),
  inferencePosts: 0, databaseAccess: 'NONE' });
const scenarios = [
  ['S01', 't-ai-04-g1-slot-filling-live-revalidation'], ['S02', 't-ai-04-g1-slot-filling-live-revalidation'],
  ['S03', 't-ai-04-g1-slot-filling-live-revalidation'], ['M03', 't-ai-04-g1-missing-slot-live-check'],
];
const rawComparison = scenarios.map(([id, folder]) => {
  const item = json(`docs/evidence/${folder}/${id}.json`), plan = json(`docs/evidence/${folder}/request-plan.json`).bodies.find(x => x.id === id);
  const raw = JSON.parse(item.rawModelDecision);
  return { id, source: `docs/evidence/${folder}/${id}.json`, request: item.request, expected: item.expected,
    rawDecision: raw, rawNlu: item.nlu, originalSchemaValid: item.originalSchemaValid,
    wireSystemSha256: sha(plan.requestBody.messages[0].content), requestPromptBytesWithReserve: Buffer.byteLength(JSON.stringify({ system: plan.requestBody.messages[0].content, messages: plan.requestBody.messages.slice(1) }), 'utf8') + 512,
    outputTokens: item.tokens.output, doneReason: json(`docs/evidence/${folder}/${id}-ollama-response.json`).envelope.done_reason,
    outputLimit: plan.requestBody.options.num_predict,
    serverDidNotRepairRaw: JSON.stringify(item.parsedModelDecision) === JSON.stringify(raw) };
});
write('raw-clarify-analysis.json', { scenarios: rawComparison,
  confirmed: ['S01 and M03 omit required arguments and choose tool instead of clarify',
    'S02/S03 explicit unset/negation produced clarify on earlier prompt; M01/M02 on latest prompt have no raw due to timeout',
    'S01/M03 stop normally well below 2048 output tokens: no evidence of output truncation as missing-argument cause',
    'JSON mode constrains syntax; original schema in system text/runtime does not force model semantic decision'],
  limits: ['Inputs, missing fields and prompt versions differ; not a controlled omitted-vs-unset A/B',
    'Root model cause is not established by instruction wording or current backend ability to extract slots'], inferencePosts: 0 });
console.log(JSON.stringify({ safeConfig, modelManifestSha: modelMapping.manifestSha256 || null,
  loggedWeightMatchesManifestLayer: modelMapping.loggedWeightMatchesManifestLayer || false,
  criticalRunnerRows: criticalRunnerRows.length, rawCasesCompared: rawComparison.length, inferencePosts: 0 }));
