const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const prefix = 'docs/evidence/travelgo-ai-agent-core/natural-chat-20261112/';
const report = 'docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md';
const read = f => fs.readFileSync(path.join(root, f));
const json = f => JSON.parse(read(f));
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const changedAllowed = [
  'backend/src/agent/provider.ts', 'backend/src/agent/coreProvider.ts',
  'backend/src/services/agentCoreService.ts', 'backend/src/services/registeredCatalogService.ts',
  'backend/src/routes/agentCoreRoutes.ts', 'frontend/src/pages/AssistantPage.tsx',
  'frontend/src/components/agent/AgentCorePanel.tsx', 'frontend/src/services/agentCoreClient.ts', report
];
const addedSources = [
  'backend/src/agent/vietnameseConversation.ts', 'backend/src/agent/naturalGrounding.ts',
  'backend/src/tests/agentNaturalChat.test.ts', 'frontend/src/utils/naturalChatPresentation.ts',
  'frontend/e2e/natural-chat.spec.ts', 'frontend/playwright.natural-chat.config.ts'
];
const baseline = json(prefix + 'baseline.json');
const changed = [];
for (const [f, hash] of Object.entries(baseline.hashes)) {
  assert(fs.existsSync(path.join(root, f)), 'Missing baseline file: ' + f);
  if (sha(read(f)) !== hash) {
    assert(changedAllowed.includes(f), 'Unexpected existing-file change: ' + f);
    changed.push(f);
  }
}
const historical = [];
for (const dir of ['docs/evidence/travelgo-ai-agent-core/', 'docs/evidence/travelgo-ai-agent-core/closure-20261111/']) {
  const seal = json(dir + 'artifact-checksums.json');
  for (const [f, hash] of Object.entries(seal.hashes)) assert.equal(sha(read(dir + f)), hash, dir + f);
  if (dir.includes('closure')) assert.equal(sha(read(prefix + 'master-report-before.md')), seal.reportSha256);
  historical.push({directory: dir, artifacts: Object.keys(seal.hashes).length, status: 'UNCHANGED'});
}
const latestRequest = fs.readFileSync('C:/Users/Danh/.codex/attachments/3ea8aa68-56b1-4f66-9826-254f61e7cda3/Pasted text.txt');
assert.equal(sha(latestRequest), sha(read(prefix + 'owner-task.txt')), 'Latest request differs; re-evaluate scope');
const tests = {};
for (const [name, file, expected] of [
  ['natural', 'unit-final-accepted.json', 28], ['originalCore', 'core42.json', 42], ['v2Compatibility', 'v2-compat.json', 22]
]) {
  const result = json(prefix + file);
  assert.equal(result.passed, expected); assert.equal(result.failed, 0);
  tests[name] = {passed: result.passed, failed: result.failed, artifact: file, tier: result.tier};
}
for (const [name, file, expected] of [
  ['browserDesktopMobile', 'browser-01/results.json', 28], ['browserTargetedFollowup', 'browser-02/results.json', 8]
]) {
  const result = json(prefix + file);
  assert.equal(result.stats.expected, expected); assert.equal(result.stats.unexpected, 0);
  assert.equal(result.stats.flaky, 0); assert.equal(result.stats.skipped, 0);
  tests[name] = {passed: expected, failed: 0, artifact: file, tier: 'REAL_BROWSER_HTTP_CORE_PLANNER_WITH_CATALOG_MODEL_TRIP_DOUBLES'};
}
const build = json(prefix + 'final-build-result.json');
for (const result of build.results) assert.equal(result.exit, 0, result.name);
const audits = fs.readdirSync(path.join(__dirname, 'offline-audit')).filter(f => f.endsWith('.json'));
for (const file of audits) {
  const audit = json(prefix + 'offline-audit/' + file);
  assert.equal(audit.postgres, 0, file); assert.equal(audit.externalNetwork, 0, file);
}
assert(audits.length > 0);
const catalog = json(prefix + 'catalog-result.json');
assert.equal(catalog.status, 'READ_PASS'); assert.equal(catalog.writes, 0); assert.equal(catalog.fixtures, 0);
assert.equal(catalog.ollamaGet, 0); assert.equal(catalog.nativePost, 0);
assert.equal(catalog.fingerprint, '25/25_UNCHANGED'); assert.equal(String(catalog.trips), '27');
assert.equal(catalog.audit.forbidden, 0);
const provider = json(prefix + 'provider-config.json');
assert.equal(provider.configured, false); assert.equal(provider.actualRequests, 0);
assert(Object.values(provider.flags).every(flag => flag === false));
const acceptanceFile = prefix + 'acceptance-final.json';
const sealFile = prefix + 'artifact-checksums.json';
const missingLinks = [];
for (const match of read(report).toString('utf8').matchAll(/\]\(([^)]+)\)/g)) {
  const link = match[1];
  if (/^(https?:|#|mailto:)/.test(link)) continue;
  const target = path.resolve(root, 'docs', decodeURIComponent(link.split('#')[0]));
  if ([path.join(root, acceptanceFile), path.join(root, sealFile)].includes(target)) continue;
  if (!fs.existsSync(target)) missingLinks.push(link);
}
assert.deepEqual(missingLinks, [], 'Broken report links');
const sourceHashes = Object.fromEntries([...changedAllowed.filter(f => f !== report), ...addedSources].map(f => [f, sha(read(f))]));
const acceptance = {
  at: new Date().toISOString(), timezone: 'Asia/Ho_Chi_Minh', status: 'TRAVELGO_AI_AGENT_CORE_PARTIAL',
  requestMatchesLatestAttachment: true, baselineFilesChecked: Object.keys(baseline.hashes).length,
  changedExistingFiles: changed, addedSources, historical, tests, build: build.results,
  offlineAuditProcesses: audits.length, offlinePostgresAttempts: 0, offlineExternalNetworkAttempts: 0,
  realDatabase: catalog, provider, freshNativeApproval: false, mutationApproval: false,
  currentTaskNativeGet: 0, currentTaskNativePost: 0, currentTaskDatabaseWrites: 0,
  modelSemanticAcceptance: 'NOT_RUN_NO_FRESH_APPROVAL_PROVIDER_DISABLED',
  fullAgentE2E: 'BLOCKED_CATALOG_SIGHTSEEING_AND_APPROVED_STAGING_AND_MODEL_APPROVAL',
  reportRelativeLinks: 'ALL_EXIST', sourceHashes
};
fs.writeFileSync(path.join(root, acceptanceFile), JSON.stringify(acceptance, null, 2) + '\n', {flag: 'wx'});
const hashes = {};
for (const rel of fs.readdirSync(__dirname, {recursive: true}).sort()) {
  const f = rel.replaceAll('\\', '/');
  if (f === 'artifact-checksums.json' || !fs.statSync(path.join(__dirname, rel)).isFile()) continue;
  hashes[f] = sha(fs.readFileSync(path.join(__dirname, rel)));
}
const seal = {at: new Date().toISOString(), report, reportSha256: sha(read(report)),
  priorReportSnapshot: prefix + 'master-report-before.md', priorReportSha256: sha(read(prefix + 'master-report-before.md')),
  sourceHashes, hashes};
fs.writeFileSync(path.join(root, sealFile), JSON.stringify(seal, null, 2) + '\n', {flag: 'wx'});
for (const [f, hash] of Object.entries(hashes)) assert.equal(sha(read(prefix + f)), hash, f);
console.log(JSON.stringify({status: acceptance.status, baselineFiles: acceptance.baselineFilesChecked,
  historical, changedExistingFiles: changed, tests, artifactsSealed: Object.keys(hashes).length,
  reportSha256: seal.reportSha256, offlineAuditProcesses: audits.length}, null, 2));
