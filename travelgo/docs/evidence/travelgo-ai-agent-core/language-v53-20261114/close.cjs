const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert/strict');
const root = path.resolve(__dirname, '../../../..');
const dir = __dirname;
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const write = (name, data) => fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const walk = folder => fs.readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
  const full = path.join(folder, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
});
const relative = full => path.relative(root, full).replaceAll('\\', '/');
const at = new Date().toISOString();
const baseline = read('baseline.json').hashes;
const allowed = [
  'backend/src/agent/travelConsultant.ts',
  'backend/src/routes/agentCoreRoutes.ts',
  'backend/src/routes/api.ts',
  'backend/src/services/agentCoreService.ts',
  'frontend/src/layouts/AdminLayout.tsx',
  'frontend/src/router/AppRouter.tsx',
  'frontend/src/services/agentCoreClient.ts',
  'frontend/src/components/agent/AgentCorePanel.tsx',
  'frontend/src/components/agent/CustomerMemoryPanel.tsx',
  'docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md',
];
const changed = [];
for (const [file, expected] of Object.entries(baseline)) {
  assert(fs.existsSync(path.join(root, file)), `Deleted baseline file: ${file}`);
  if (hash(fs.readFileSync(path.join(root, file))) !== expected) changed.push(file);
}
assert.deepEqual(changed.filter(file => !allowed.includes(file)), [], 'Unexpected existing-file changes');
assert.deepEqual([...changed].sort(), [...allowed].sort());
const master = fs.readFileSync(path.join(root, allowed.at(-1)));
const masterBefore = fs.readFileSync(path.join(dir, 'master-before.md'));
assert(master.subarray(0, masterBefore.length).equals(masterBefore), 'Historical Master prefix changed');
assert(master.toString('utf8').includes('preparation-corrections.json'));
const sourceHashes = Object.fromEntries(['backend/src', 'frontend/src', 'frontend/tests', 'database']
  .flatMap(folder => walk(path.join(root, folder))).map(full => [relative(full), hash(fs.readFileSync(full))]));
write('source-hashes.json', { at, hashes: sourceHashes });
const manifest = read('chat-manifest.json');
assert.equal(hash(fs.readFileSync(path.join(dir, 'chat-manifest.json'))), fs.readFileSync(path.join(dir, 'chat-manifest.sha256'), 'utf8').trim());
const changedSinceChat = Object.keys(manifest.sourceHashes).filter(file => sourceHashes[file] !== manifest.sourceHashes[file]);
const addedSinceChat = Object.keys(sourceHashes).filter(file => !(file in manifest.sourceHashes));
assert.deepEqual(changedSinceChat.sort(), ['backend/src/agent/adaptiveLanguage.ts', 'backend/src/services/agentCoreService.ts', 'backend/src/tests/adaptiveLanguageV53.test.ts'].sort());
assert.deepEqual(addedSinceChat, ['backend/src/tests/adaptiveLanguagePayloadV53.test.ts']);
write('post-chat-source-delta.json', {
  at, lockedSourceCount: Object.keys(manifest.sourceHashes).length,
  finalSourceCount: Object.keys(sourceHashes).length, changedSinceChat, addedSinceChat,
  scope: 'Location/base-alias conflict and unresolved compound-request clarification guards, plus offline tests. No extra chat after reserve. Real browser acceptance applies to manifest build; final guards verified offline only.',
  additionalNormalChatPosts: 0,
});
const originalCriteria = read('quality-criteria.json');
const criteria = read('quality-criteria-v2.json');
for (let i = 0; i < criteria.holdout.length; i++) {
  for (const key of ['expected', 'type', 'location']) assert.equal(criteria.holdout[i][key], originalCriteria.holdout[i][key]);
}
assert.equal(hash(fs.readFileSync(path.join(dir, 'quality-criteria-v2.json'))), fs.readFileSync(path.join(dir, 'quality-criteria-v2.sha256'), 'utf8').trim());
for (const [name, passed] of [['offline-final.json', 15], ['adaptive-provider-payload.json', 3], ['frontend-contract.json', 14], ['postgres-results-v2.json', 13], ['http-management-results.json', 6]]) {
  const result = read(name); assert.equal(result.passed, passed, name); assert.equal(result.failed, 0, name);
}
const offline = read('offline-final.json');
assert.equal(offline.metrics.baseCorrect, 7); assert.equal(offline.metrics.adaptiveCorrect, 12);
const retention = read('retention-results.json'); assert.equal(retention.status, 'PASS'); assert.equal(retention.checks.length, 3);
const management = read('browser-management-results-v2.json'); assert.equal(management.apiMocks, false); assert.equal(management.results.length, 3); management.results.forEach(result => assert.equal(result.status, 'PASS'));
const http = read('http-learning-results.json'); assert.equal(http.status, 'PASS'); assert.equal(http.apiMocks, false); assert.equal(http.normalChatPosts, 4);
const browser = read('browser-learning-results.json'); assert.equal(browser.apiChatMocks, false); assert.equal(browser.syntheticLease, false); assert.equal(browser.results.length, 2);
browser.results.forEach(result => { assert.equal(result.status, 'PASS'); assert.equal(result.turns.length, 3); assert.deepEqual(result.errors, []); });
assert.equal(fs.readdirSync(dir).filter(name => /^attempt-.*\.json$/.test(name)).length, 10);
const quota = read('agent-quota-final.json'); assert.equal(quota.remainingConservativeSlots, 10); assert.equal(quota.recent.length, 10); assert.equal(quota.futureDatedEntries.length, 0); assert.equal(quota.principalHash, manifest.principalHash);
const before = read('staging-before.json'); const after = read('staging-after.json');
assert.equal(Object.keys(before.tables).length, 31); assert.equal(Object.keys(after.tables).length, 37);
for (const table of Object.keys(before.tables)) if (table !== 'schema_migrations') assert.deepEqual(after.tables[table], before.tables[table], table);
assert.equal(after.tables.schema_migrations.rows - before.tables.schema_migrations.rows, 1);
const newTables = Object.keys(after.tables).filter(table => !(table in before.tables)); assert.equal(newTables.length, 6);
newTables.forEach(table => assert.equal(after.tables[table].rows, 0));
assert.equal(after.tables.places.rows, 130); assert.equal(after.tables.businesses.rows, 20);
const cleanup = read('cleanup-committed.json'); assert.equal(cleanup.status, 'PASS'); assert.equal(cleanup.usersRemoved, 3);
for (const file of ['language-v53-accounts.json', 'language-v53-auth.json', 'language-v53-primary-chat-auth.json']) assert.equal(fs.existsSync(path.join(root, '.local', file)), false);
assert(fs.existsSync(path.join(root, '.local/catalog-staging/accounts.json')));
const boundary = read('offline-boundary-summary.json'); assert.equal(boundary.auditedProcesses, 14); assert.deepEqual(boundary.totals, { postgres: 0, ollama: 0, externalNetwork: 0 });
let dmlStatements = 0;
for (const name of ['scoped-audit-before-reload.json', 'scoped-audit-final.json']) {
  const audit = read(name); dmlStatements += audit.languageWrites;
  for (const field of ['blockedWrites', 'native', 'originalDatabaseConnections']) assert.equal(audit[field], 0);
  Object.keys(audit.tables).forEach(table => assert(newTables.includes(table), table));
}
assert.equal(dmlStatements, 53);
const restored = read('restored-runtime-audit.json'); assert.equal(restored.health, 200); assert.equal(restored.frontend, 200); assert.equal(restored.privacy, 200); assert.equal(restored.modelConfigured, false); assert.equal(restored.adaptiveLanguageEndpoint, 503); assert.equal(restored.languageFeatureOutsideIsolatedSession, 'OFF'); assert.equal(restored.normalChatPostsAdded, 0);
assert.equal(restored.audit.readOnlyVerified, restored.audit.connections); assert.equal(restored.audit.originalDatabaseConnections, 0); assert.equal(restored.audit.native, 0);
let frontendBuild = fs.readFileSync(path.join(dir, 'frontend-build-final.log'));
const frontendLog = frontendBuild[0] === 255 && frontendBuild[1] === 254 ? frontendBuild.toString('utf16le') : frontendBuild.toString('utf8');
assert(/built in/.test(frontendLog));
write('build-summary.json', { at, backend: 'PASS: final TypeScript build completed with exit 0 in task tool execution', frontend: 'PASS: final TypeScript/Vite command exit 0 and built-in log marker verified', initialFailedBuildPreserved: true, reexecutionDuringClosure: false });
write('acceptance-final.json', {
  at, dynamicApplicationLanguageLearning: 'PASS_WITHIN_TYPED_TRAVEL_REGISTRY', personalLanguageMemory: 'PASS', sharedGovernance: 'PASS', contextualIntelligence: 'PARTIAL',
  beforeAfterEvaluation: 'PASS_SYNTHETIC_12_LOCKED_CASES_NOT_GENERAL_LANGUAGE_ACCURACY',
  actualStagingPersistence: 'PASS', realHttpChat: 'PASS_4', realBrowserChat: 'PASS_DESKTOP_3_MOBILE_EMULATION_3_ON_LOCKED_BUILD',
  finalContextGuards: 'OFFLINE_PASS_NOT_BROWSER_REVALIDATED', qwen: 'NOT_RUN', modelWeightTraining: 'NOT_PERFORMED', fullBrowserQwenTools: 'NOT_RUN',
  overall: 'TRAVELGO_AI_AGENT_CORE_PARTIAL_NOT_LIVE_READY', normalChatPosts: 10, reserveAtFinalChat: 10, nativeModelRequests: 0,
  cleanup: 'EXACT_TASK_COHORT_REMOVED_SIX_NEW_TABLES_EMPTY', defaultRuntime: 'READ_ONLY_QWEN_OFF_ADAPTIVE_OFF',
  limitations: ['Bounded discovery/context cues and registry; no arbitrary grammar learning', 'PII heuristic is conservative and incomplete; shared candidates require manual review', 'Physical retention pruning is explicit, no background scheduler', 'Synthetic small holdout and user-declared feedback are not longitudinal quality evidence', 'Two unchanged legacy consultant compatibility failures preserved'],
});
write('integrity-final.json', {
  at, status: 'PASS', baselineFilesChecked: Object.keys(baseline).length, changedExistingFiles: changed,
  unexpectedExistingChanges: [], historicalMasterPrefixPreserved: true, historicalArtifactsPreserved: true,
  manifestHashPreserved: true, finalSourceFiles: Object.keys(sourceHashes).length, postChatSourceDelta: 'post-chat-source-delta.json',
  holdoutExpectedFieldsUnchanged: true, nativeModelRequests: 0, normalChatPosts: 10, modelQuotaScans: 0, resourceScans: 0,
  database: { baselineTables: 31, unchangedBaselineTableFingerprints: 30, migrationLedgerDelta: 1, newTables: 6, newTableRows: 0, placeRows: 130, businessRows: 20, originalDatabaseConnections: 0, originalDatabaseFreshFingerprintClaim: false },
  taskCredentialsRemoved: true, originalAccountsFilePreserved: true, runtimeRestored: 'READ_ONLY_QWEN_OFF_ADAPTIVE_OFF',
  closure: 'Filesystem-only checks, no network, database, process control or model access',
});
fs.writeFileSync(path.join(dir, 'master-final.md'), master, { flag: 'wx' });
const artifacts = Object.fromEntries(walk(dir).filter(full => path.basename(full) !== 'artifact-checksums.json').map(full => [path.relative(dir, full).replaceAll('\\', '/'), hash(fs.readFileSync(full))]));
write('artifact-checksums.json', { at, algorithm: 'SHA-256', hashes: artifacts, reportSnapshotHash: hash(master), sourceHashesFile: 'source-hashes.json' });
console.log(JSON.stringify({ status: 'PASS', baselineFiles: Object.keys(baseline).length, sourceFiles: Object.keys(sourceHashes).length, sealedArtifacts: Object.keys(artifacts).length, normalChats: 10, reserveAtFinalChat: 10, overall: 'PARTIAL_NOT_LIVE_READY' }));
