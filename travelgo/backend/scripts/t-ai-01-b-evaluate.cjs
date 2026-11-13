// Default is NOT RUN. --live additionally requires all runtime gates and explicit evaluation approval.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
process.chdir(path.resolve(__dirname, '..'));
Object.assign(process.env, { NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_NAME: 'travelgo_ai_m0_test', DB_SSL: 'false', ALLOW_TEST_DB_WRITES: 'false' });
require('dotenv').config({ quiet: true });
const root = path.resolve('../docs/evidence/t-ai-01-b');
const bytes = fs.readFileSync(path.join(root, 'nlu-manifest.json'));
const manifest = JSON.parse(bytes), lock = JSON.parse(fs.readFileSync(path.join(root, 'nlu-manifest-lock.json')));
assert.equal(createHash('sha256').update(bytes).digest('hex'), lock.sha256, 'Frozen NLU manifest changed');
const out = path.join(root, 'evaluation-' + new Date().toISOString().replace(/[-:.]/g, ''));
fs.mkdirSync(out, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const { createConfiguredProvider } = require('../dist/agent/liveProvider.js');
const provider = createConfiguredProvider(); // Factory performs no HTTP calls.
const enabled = process.argv.includes('--live') && process.env.T_AI_01_B_LIVE_APPROVED === 'true' && provider.configured;
const configuration = { provider: ['gemini','ollama'].includes(process.env.LLM_PROVIDER) ? process.env.LLM_PROVIDER : null,
  geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY), geminiModelConfigured: Boolean(process.env.GEMINI_MODEL),
  ollamaModelConfigured: Boolean(process.env.OLLAMA_MODEL), liveEnabled: process.env.LLM_LIVE_ENABLED === 'true',
  usageApproved: process.env.LLM_USAGE_APPROVED === 'true', externalProcessingApproved: process.env.LLM_EXTERNAL_PROCESSING_APPROVED === 'true',
  localOnlyConfirmed: process.env.OLLAMA_LOCAL_ONLY_CONFIRMED === 'true', evaluationApproved: process.env.T_AI_01_B_LIVE_APPROVED === 'true',
  providerConfigured: provider.configured };
write('configuration.json', configuration);

const normalize = value => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
function checkDecision(actual, expected) {
  assert.equal(actual?.kind, expected.kind);
  if (expected.kind === 'clarify') assert.deepEqual([...new Set(actual.fields)].sort(), [...expected.fields].sort());
  if (expected.kind === 'tool') {
    assert.equal(actual.name, expected.name);
    const defaults = { children: 0, pacing: 'balanced', preferences: [], mandatoryPlaceIds: [] };
    for (const [key, value] of Object.entries(expected.arguments)) {
      if (['departureCity','destinationCity'].includes(key)) assert.equal(normalize(actual.arguments[key]), normalize(value));
      else assert.deepEqual(actual.arguments[key], value);
    }
    for (const key of Object.keys(actual.arguments)) if (!(key in expected.arguments)) {
      assert.ok(key in defaults, 'Unexpected argument'); assert.deepEqual(actual.arguments[key], defaults[key]);
    }
  }
}
const stable = result => {
  const copy = structuredClone(result);
  if (copy.itinerary) { delete copy.itinerary.id; delete copy.itinerary.createdAt; }
  return copy;
};
function fingerprint(mode, ...args) {
  const p = spawnSync(process.execPath, ['dist/evaluation/t11_db_fingerprint.js', mode, ...args], { encoding: 'utf8', env: process.env });
  fs.writeFileSync(path.join(out, `fingerprint-${mode}-${path.basename(args[0])}.log`), p.stdout + p.stderr, { flag: 'wx' });
  assert.equal(p.status, 0, 'Fingerprint failed');
}
let sequelize, server, before = false;
const results = [];
async function main() {
  if (!enabled) {
    const reason = 'No explicit approved --live run and/or provider/model/usage/privacy configuration incomplete. No external requests, no DB access.';
    write('results.json', { tier: 'LIVE_LLM', status: 'NOT RUN', reason, manifestSha256: lock.sha256,
      metrics: { toolSelectionAccuracy: 'NOT RUN', argumentCorrectness: 'NOT RUN', missingFieldHandling: 'NOT RUN', multiTurnConsistency: 'NOT RUN', unsupportedHandling: 'NOT RUN', toolResultFidelity: 'NOT RUN', authorizationPrivacy: 'NOT RUN' },
      cases: manifest.cases.map(c => ({ id: c.id, title: c.title, tier: c.tier, status: 'NOT RUN', reason: c.tier === 'MOCK_ONLY' ? 'See dedicated transport/foundation test logs; excluded from NLU score.' : reason })) });
    return;
  }
  ({ sequelize } = require('../dist/models/index.js'));
  const { ENV } = require('../dist/config/env.js');
  const { assertIsolatedTestDatabase, assertDatabaseSentinel } = require('../dist/utils/testDatabaseGuard.js');
  assert.equal(ENV.DB_NAME, 'travelgo_ai_m0_test'); assert.equal(ENV.DB_HOST, '127.0.0.1');
  assertIsolatedTestDatabase('T-AI-01-B LIVE read-only');
  sequelize.addHook('afterConnect', async c => { await c.query('SET default_transaction_read_only = on'); await c.query("SET statement_timeout = '15000ms'"); });
  await assertDatabaseSentinel(sequelize, 'T-AI-01-B LIVE read-only');
  const migrations = [];
  for (const filename of fs.readdirSync('../database/migrations').filter(f => f.endsWith('.sql')).sort()) {
    const checksum = createHash('sha256').update(fs.readFileSync(path.join('../database/migrations', filename))).digest('hex');
    const [rows] = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename', { replacements: { filename } });
    assert.equal(rows[0]?.checksum, checksum); migrations.push({ filename, checksum });
  }
  assert.equal(migrations.length, 12);
  const [identity] = await sequelize.query("SELECT current_database() AS database, current_setting('default_transaction_read_only') AS read_only");
  assert.equal(identity[0].read_only, 'on');
  write('preflight.json', { ...identity[0], sentinel: 'PASS', migrations });
  fingerprint('snapshot', path.join(out, 'before.json')); before = true;
  write('ledger.json', { writes: 0, fixtureIds: [], cleanup: 'NOT_REQUIRED_READ_ONLY', authentication: 'Synthetic signed principal, no login E2E' });
  const { AgentOrchestrator } = require('../dist/services/agentService.js');
  const { AgentLimits } = require('../dist/agent/limits.js');
  const { catalogPlannerTools } = require('../dist/agent/tools.js');
  const { createAgentRouter } = require('../dist/routes/agentRoutes.js');
  const { EXTERNAL_CONSENT_VERSION } = require('../dist/agent/privacy.js');
  const { signAccessToken } = require('../dist/services/tokenService.js');
  const express = require('express');
  let decision, toolCalls, toolResult;
  const service = new AgentOrchestrator({
    provider: { configured: true, external: provider.external, generate: async (...args) => { decision = await provider.generate(...args); return decision; } },
    // Evaluation-only capacity for 24 cases. Runtime remains 20/user/hour.
    limits: new AgentLimits(100, 2),
    tools: { execute: async d => { toolCalls++; toolResult = await catalogPlannerTools.execute(d); return toolResult; } },
  });
  const app = express(); app.use(express.json()); app.use('/api/agent', createAgentRouter(service));
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  const token = signAccessToken({ id: randomUUID(), email: 'synthetic-evaluation@example.test', fullName: 'Evaluation principal', roles: ['CUSTOMER'] });
  for (const c of manifest.cases.filter(c => c.tier === 'LIVE_LLM')) {
    decision = undefined; toolCalls = 0; toolResult = undefined;
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/agent/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...c.request, ...(provider.external ? { externalProcessingConsent: EXTERNAL_CONSENT_VERSION } : {}) }),
    });
    const body = await response.json(); let status = 'PASS';
    const metrics = { toolSelection: decision?.kind === c.expected.kind && (c.expected.kind !== 'tool' || decision?.name === c.expected.name) };
    let decisionCorrect = true;
    try { checkDecision(decision, c.expected); } catch { decisionCorrect = false; }
    if (c.expected.kind === 'tool') metrics.argumentCorrectness = decisionCorrect;
    if (c.expected.kind === 'clarify') metrics.missingFieldHandling = decisionCorrect && toolCalls === 0;
    if (c.request.history) metrics.multiTurnConsistency = decisionCorrect;
    if (c.expected.kind === 'unsupported') metrics.unsupportedHandling = decisionCorrect && toolCalls === 0;
    try {
      checkDecision(decision, c.expected); assert.equal(response.status, 200);
      if (c.expected.kind !== 'tool') { assert.equal(toolCalls, 0); assert.equal(body.data.result, undefined); }
      else {
        assert.equal(toolCalls, 1);
        if (c.toolOutcome === 'tool_unavailable') assert.equal(body.data.status, 'tool_unavailable');
        else if (body.data.status === 'completed') {
          assert.deepEqual(body.data.result, toolResult);
          assert.deepEqual(stable(toolResult), stable(await catalogPlannerTools.execute(decision)));
        } else assert.equal(body.data.status, 'tool_unavailable');
      }
    } catch { status = 'FAIL'; }
    if (c.expected.kind === 'tool') metrics.toolResultFidelity = status === 'PASS';
    // No token, headers, user identity, raw provider envelope, or model prose persisted.
    const safeDecision = decision ? { kind: decision.kind, name: decision.name,
      fields: decision.fields, arguments: decision.arguments ? Object.fromEntries(Object.entries(decision.arguments).map(([key, value]) => {
        const expectedValue = c.expected.arguments?.[key];
        const defaults = { children: 0, pacing: 'balanced', preferences: [], mandatoryPlaceIds: [] };
        const safe = JSON.stringify(value) === JSON.stringify(expectedValue) ||
          (['departureCity','destinationCity'].includes(key) && expectedValue !== undefined && normalize(value) === normalize(expectedValue)) ||
          (key in defaults && JSON.stringify(value) === JSON.stringify(defaults[key]));
        return [key, safe ? value : '[REDACTED_UNEXPECTED_VALUE]'];
      })) : undefined } : null;
    const safeBody = structuredClone(body);
    if (safeBody.data?.history) { safeBody.data.historyLength = safeBody.data.history.length; delete safeBody.data.history; }
    const record = { id: c.id, title: c.title, tier: 'LIVE_LLM', status, httpStatus: response.status,
      decision: safeDecision, metrics, toolCalls, response: safeBody };
    results.push(record); write(`${c.id}.json`, record);
  }
  const executed = results.length, passed = results.filter(v => v.status === 'PASS').length;
  write('results.json', { tier: 'LIVE_LLM', manifestSha256: lock.sha256, model: process.env.LLM_PROVIDER === 'gemini' ? process.env.GEMINI_MODEL : process.env.OLLAMA_MODEL,
    metrics: { allCriteriaPass: { numerator: passed, denominator: executed },
      ...Object.fromEntries(['toolSelection','argumentCorrectness','missingFieldHandling','multiTurnConsistency','unsupportedHandling','toolResultFidelity'].map(key => {
        const applicable = results.filter(r => key in r.metrics);
        return [key, { numerator: applicable.filter(r => r.metrics[key]).length, denominator: applicable.length }];
      })), authorizationPrivacy: 'See dedicated auth/privacy tests; synthetic principal is not real-login E2E.' }, cases: results });
  if (passed !== executed) process.exitCode = 1;
}
main().catch(() => { write('failure.json', { status: 'FAIL', reason: 'Preflight or evaluation failed; no raw diagnostics persisted.' }); process.exitCode = 1; }).finally(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  if (sequelize) await sequelize.close();
  if (before) {
    try { fingerprint('snapshot', path.join(out, 'after.json')); fingerprint('compare', path.join(out, 'before.json'), path.join(out, 'after.json')); }
    catch { process.exitCode = 1; }
  }
  console.log(JSON.stringify({ evidence: path.relative(path.resolve('..'), out).replaceAll('\\', '/'), liveRequestedAndConfigured: enabled, exitCode: process.exitCode || 0 }));
});
