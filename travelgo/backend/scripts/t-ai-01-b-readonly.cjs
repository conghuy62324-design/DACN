// Real HTTP/auth/services/PostgreSQL, MOCK_ONLY decision provider and in-memory principal.
// No DB fixtures. All Sequelize connections forced read-only before any query.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
process.chdir(path.resolve(__dirname, '..'));
Object.assign(process.env, { NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_NAME: 'travelgo_ai_m0_test', DB_SSL: 'false', ALLOW_TEST_DB_WRITES: 'false', LLM_LIVE_ENABLED: 'false' });
require('dotenv').config({ quiet: true });
const { sequelize } = require('../dist/models/index.js');
const { ENV } = require('../dist/config/env.js');
const { assertIsolatedTestDatabase, assertDatabaseSentinel } = require('../dist/utils/testDatabaseGuard.js');
const { RecommendationRepository } = require('../dist/repositories/recommendationRepository.js');
const { AgentOrchestrator } = require('../dist/services/agentService.js');
const { JsonLlmProvider } = require('../dist/agent/provider.js');
const { createAgentRouter } = require('../dist/routes/agentRoutes.js');
const { signAccessToken } = require('../dist/services/tokenService.js');
const express = require('express');
const out = path.resolve('../docs/evidence/t-ai-01-b', 'readonly-' + new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 6));
fs.mkdirSync(out, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
function fingerprint(mode, ...args) {
  const p = spawnSync(process.execPath, ['dist/evaluation/t11_db_fingerprint.js', mode, ...args], { encoding: 'utf8', env: process.env });
  fs.writeFileSync(path.join(out, `fingerprint-${mode}-${args.length === 2 ? 'compare' : path.basename(args[0])}.log`), p.stdout + p.stderr, { flag: 'wx' });
  assert.equal(p.status, 0, 'Read-only fingerprint failed');
}
let server, before = false;
async function main() {
  assert.equal(ENV.DB_NAME, 'travelgo_ai_m0_test'); assert.equal(ENV.DB_HOST, '127.0.0.1'); assert.equal(ENV.NODE_ENV, 'test');
  assertIsolatedTestDatabase('T-AI-01 read-only');
  sequelize.addHook('afterConnect', async connection => {
    await connection.query('SET default_transaction_read_only = on');
    await connection.query("SET statement_timeout = '15000ms'");
  });
  await assertDatabaseSentinel(sequelize, 'T-AI-01 read-only');
  const [identity] = await sequelize.query("SELECT current_database() AS database, current_setting('default_transaction_read_only') AS read_only");
  assert.equal(identity[0].database, 'travelgo_ai_m0_test'); assert.equal(identity[0].read_only, 'on');
  const migrations = [];
  for (const filename of fs.readdirSync('../database/migrations').filter(f => f.endsWith('.sql')).sort()) {
    const checksum = createHash('sha256').update(fs.readFileSync(path.join('../database/migrations', filename))).digest('hex');
    const [rows] = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename', { replacements: { filename } });
    assert.equal(rows[0]?.checksum, checksum); migrations.push({ filename, checksum });
  }
  assert.equal(migrations.length, 12);
  write('preflight.json', { ...identity[0], sentinel: 'PASS', guard: 'PASS', allowWrites: false, migrations });
  fingerprint('snapshot', path.join(out, 'before.json')); before = true;
  write('ledger.json', { users: [], businesses: [], resources: [], trips: [], bookings: [], writes: 0, cleanup: 'NOT_REQUIRED_NO_DB_FIXTURES', residualFixtures: 0 });
  const catalog = await RecommendationRepository.getApprovedPlaces();
  const destination = catalog.find(p => p.category === 'attraction' && p.city && (!p.businessId || p.business?.status === 'ACTIVE'))?.city;
  assert.ok(destination, 'No real public attraction; do not create fake catalog');
  const decisions = [
    { kind: 'tool', name: 'search_places', arguments: { destinationCity: destination, dailyBudgetPerPerson: 500000, preferences: [] } },
    { kind: 'tool', name: 'plan_trip', arguments: { departureCity: 'Hà Nội', destinationCity: destination, startDate: '2030-06-15', endDate: '2030-06-16', adults: 2, children: 0, totalBudget: 4000000, transportation: 'car', preferences: [] } },
  ];
  const app = express(); app.use(express.json());
  let index = 0;
  const svc = new AgentOrchestrator({ provider: new JsonLlmProvider(async () => JSON.stringify(decisions[index++])) });
  app.use('/api/agent', createAgentRouter(svc));
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  // Synthetic signed test principal has no persisted account; consent SELECT returns default false.
  const token = signAccessToken({ id: randomUUID(), email: 't-ai-01-in-memory@example.test', fullName: 'MOCK_ONLY principal', roles: ['CUSTOMER'] });
  const evidence = [];
  for (const expected of decisions) {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/agent/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: 'MOCK_ONLY provider decision for read-only adapter verification' }),
    });
    const body = await response.json();
    evidence.push({ tool: expected.name, input: expected.arguments, status: response.status, body });
    assert.equal(response.status, 200); assert.equal(body.data.status, 'completed');
    assert.equal(body.data.context.personalizationEnabled, false);
    const ids = new Set(catalog.map(p => p.id));
    if (expected.name === 'search_places') {
      assert.ok(body.data.result.places.length > 0);
      for (const place of body.data.result.places) assert.ok(ids.has(place.id));
    } else {
      assert.equal(body.data.result.itinerary.destinationCity, destination);
      assert.equal(body.data.result.cost.estimated, body.data.result.itinerary.totalEstimatedCostVND);
      for (const id of body.data.result.itinerary.selectedPlaceIds) assert.ok(ids.has(id));
    }
  }
  write('http-api-results.json', { provider: 'MOCK_ONLY', authentication: 'Real token middleware; synthetic in-memory principal, not login E2E', catalog: 'REAL_POSTGRESQL_READ_ONLY', results: evidence });
  write('result.json', { status: 'PASS', toolFlows: 2, realLlm: 'NOT_RUN', browser: 'NOT_RUN_PHASE_2', dbWrites: 0 });
}
main().catch(error => {
  write('failure.json', { status: 'FAIL', message: error.code || error.name || 'ERROR' });
  console.error('T-AI-01 read-only verification failed; retained evidence:', out); process.exitCode = 1;
}).finally(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await sequelize.close();
  if (before) {
    try {
      fingerprint('snapshot', path.join(out, 'after.json'));
      fingerprint('compare', path.join(out, 'before.json'), path.join(out, 'after.json'));
    } catch { console.error('Fingerprint compare failed'); process.exitCode = 1; }
  }
  console.log(JSON.stringify({ evidence: path.relative(path.resolve('..'), out).replaceAll('\\', '/'), exitCode: process.exitCode || 0 }));
});
