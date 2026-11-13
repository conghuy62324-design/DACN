// Isolated integration harness. Real routes/auth/services/PostgreSQL; decision provider only is scripted.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createHash, randomUUID, randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
process.chdir(path.resolve(__dirname, '..'));
if (process.env.ALLOW_TEST_DB_WRITES !== 'true' || process.env.TEST_DATABASE_NAME !== 'travelgo_ai_m0_test') {
  throw Error('T-AI-03-A requires explicit ALLOW_TEST_DB_WRITES=true and TEST_DATABASE_NAME=travelgo_ai_m0_test');
}
Object.assign(process.env, { NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_NAME: 'travelgo_ai_m0_test',
  DB_SSL: 'false', LLM_LIVE_ENABLED: 'false' });
require('dotenv').config({ quiet: true });
const { Client } = require('pg');
const express = require('express');
const { sequelize, User, UserRole, Place, TripSession, Booking } = require('../dist/models/index.js');
const { ENV } = require('../dist/config/env.js');
const { assertTestDatabaseWriteOptIn, assertDatabaseSentinel } = require('../dist/utils/testDatabaseGuard.js');
const { RecommendationRepository } = require('../dist/repositories/recommendationRepository.js');
const { AgentOrchestrator } = require('../dist/services/agentService.js');
const { AgentLimits } = require('../dist/agent/limits.js');
const { createAgentRouter } = require('../dist/routes/agentRoutes.js');
const authRoutes = require('../dist/routes/authRoutes.js').default;
const apiRouter = require('../dist/routes/api.js').default;
const { hashPassword } = require('../dist/services/passwordService.js');

const root = path.resolve('..');
const id = 'run-' + new Date().toISOString().replace(/[-:.]/g, '') + '-' + randomUUID().slice(0, 8);
const out = path.join(root, 'docs/evidence/t-ai-03-a', id);
fs.mkdirSync(out, { recursive: true });
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const manifestPath = path.join(__dirname, 't-ai-03-a-manifest.json');
const manifest = fs.readFileSync(manifestPath);
const manifestHash = createHash('sha256').update(manifest).digest('hex');
fs.writeFileSync(path.join(out, 'case-manifest.json'), manifest, { flag: 'wx' });
save('manifest-lock.json', { sha256: manifestHash, cases: JSON.parse(manifest).cases.map(c => c.id), lockedBeforePreflight: true });
const env = { ...process.env, LLM_LIVE_ENABLED: 'false' };
const password = randomBytes(16).toString('hex') + 'Aa1!';
const city = 'TAI03A-' + id.slice(-8);
const fixtures = {
  owner: 'T-AI-03-A', runId: id, city, users: [0, 1, 2, 3].map((_, i) => ({ id: randomUUID(),
    email: `tai03a.${id.slice(-8)}.${i}@example.test`, project: i < 2 ? 'desktop' : 'mobile', account: i % 2 ? 'B' : 'A' })),
  roles: [], places: [
    { id: randomUUID(), category: 'attraction', status: 'APPROVED', price: 0, name: 'TAI03A Điểm miễn phí', lat: 16.055, lon: 108.21 },
    { id: randomUUID(), category: 'attraction', status: 'APPROVED', price: null, name: 'TAI03A Điểm chưa có giá', lat: 16.06, lon: 108.215 },
    { id: randomUUID(), category: 'hotel', status: 'APPROVED', price: 350000, name: 'TAI03A Khách sạn', lat: 16.065, lon: 108.22 },
    { id: randomUUID(), category: 'restaurant', status: 'APPROVED', price: 150000, name: 'TAI03A Nhà hàng', lat: 16.07, lon: 108.225 },
    { id: randomUUID(), category: 'attraction', status: 'SUSPENDED', price: 999000, name: 'TAI03A Không công khai', lat: 16.075, lon: 108.23 },
  ], status: 'PLANNED', writes: 0, cleanup: 'PENDING', residual: null,
};
fixtures.roles = fixtures.users.map(u => ({ id: randomUUID(), userId: u.id, role: 'CUSTOMER' }));
save('ledger.json', fixtures);
let client, server, fingerprintTaken = false, fixturesInserted = false, child, browserExit = null;
const http = [], provider = [], commands = [];
function fp(mode, ...args) {
  const p = spawnSync(process.execPath, ['dist/evaluation/t11_db_fingerprint.js', mode, ...args], { cwd: path.join(root, 'backend'), env, encoding: 'utf8' });
  fs.writeFileSync(path.join(out, `fingerprint-${mode}-${args.length === 2 ? 'compare' : path.basename(args[0])}.log`), (p.stdout || '') + (p.stderr || ''));
  assert.equal(p.status, 0, `Fingerprint ${mode} failed`);
}
async function preflight() {
  assert.equal(ENV.NODE_ENV, 'test'); assert.equal(ENV.DB_HOST, '127.0.0.1'); assert.equal(ENV.DB_NAME, 'travelgo_ai_m0_test');
  assertTestDatabaseWriteOptIn('T-AI-03-A guarded fixtures');
  sequelize.addHook('afterConnect', async c => { await c.query('SET default_transaction_read_only = on'); await c.query("SET statement_timeout = '15000ms'"); });
  await assertDatabaseSentinel(sequelize, 'T-AI-03-A preflight');
  const [identity] = await sequelize.query("SELECT current_database() AS database, current_user AS username, inet_server_addr()::text AS server_address, current_setting('default_transaction_read_only') AS read_only");
  assert.equal(identity[0].database, 'travelgo_ai_m0_test'); assert.equal(identity[0].read_only, 'on');
  const migrations = [];
  for (const filename of fs.readdirSync('../database/migrations').filter(f => f.endsWith('.sql')).sort()) {
    const checksum = createHash('sha256').update(fs.readFileSync(path.join('../database/migrations', filename))).digest('hex');
    const [rows] = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename', { replacements: { filename } });
    assert.equal(rows[0]?.checksum, checksum, filename); migrations.push({ filename, checksum });
  }
  assert.equal(migrations.length, 12);
  save('preflight.json', { ...identity[0], sentinel: 'PASS', guard: 'PASS', migrations, appConnectionsReadOnly: true,
    fixtureWriteOptIn: true, manifestSha256: manifestHash });
  fp('snapshot', path.join(out, 'before.json')); fingerprintTaken = true;
  assert.equal(createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'), manifestHash);
}
async function fixtureClient() {
  client = new Client({ host: ENV.DB_HOST, port: ENV.DB_PORT, user: ENV.DB_USER, password: ENV.DB_PASSWORD, database: ENV.DB_NAME, ssl: false });
  await client.connect();
  const identity = await client.query("SELECT current_database() AS database, shobj_description(oid, 'pg_database') AS sentinel FROM pg_database WHERE datname=current_database()");
  assert.equal(identity.rows[0]?.database, 'travelgo_ai_m0_test');
  assert.equal(identity.rows[0]?.sentinel, 'hugotravel-isolated-test-database-v1');
}
async function insertFixtures() {
  await fixtureClient();
  await client.query('BEGIN');
  try {
    const hashed = await hashPassword(password);
    for (const u of fixtures.users) {
      await client.query("INSERT INTO users(id,full_name,email,password_hash,role,created_at,updated_at) VALUES($1,$2,$3,$4,'user',now(),now())", [u.id, `TAI03A ${u.project} ${u.account}`, u.email, hashed]);
      await client.query("INSERT INTO user_roles(id,user_id,role,created_at) VALUES($1,$2,'CUSTOMER',now())",
        [fixtures.roles.find(r => r.userId === u.id).id, u.id]);
    }
    for (let i = 0; i < fixtures.places.length; i++) {
      const p = fixtures.places[i];
      await client.query(`INSERT INTO places(id,name,slug,category,summary,description,city,province,address,latitude,longitude,price_from,hero_image,status,created_at,updated_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,now(),now())`,
      [p.id, p.name, `tai03a-${id.slice(-8)}-${i}`, p.category, 'T-AI-03-A guarded fixture', 'Test fixture', city, city,
        'Test fixture address', p.lat, p.lon, p.price, '', p.status]);
    }
    await client.query('COMMIT'); fixturesInserted = true;
    fixtures.status = 'INSERTED'; fixtures.writes = fixtures.users.length * 2 + fixtures.places.length;
    fs.writeFileSync(path.join(out, 'ledger.json'), JSON.stringify(fixtures, null, 2));
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  const catalog = await RecommendationRepository.getApprovedPlaces();
  const own = catalog.filter(p => fixtures.places.some(f => f.id === p.id));
  assert.equal(own.length, 4, 'Exactly four public fixture places must be visible');
  assert.ok(own.some(p => p.priceFrom === 0 && p.catalogPriceAvailable));
  assert.ok(own.some(p => p.catalogPriceAvailable === false));
  save('catalog-db-projection.json', { source: 'REAL_POSTGRESQL_READ_ONLY', city,
    places: own.map(p => ({ id: p.id, name: p.name, category: p.category, city: p.city,
      priceFrom: p.catalogPriceAvailable ? p.priceFrom : null, catalogPriceAvailable: p.catalogPriceAvailable })),
    hiddenFixtureId: fixtures.places[4].id, hiddenNotInPublicCatalog: !catalog.some(p => p.id === fixtures.places[4].id) });
}
function scripted(input, signal) {
  const message = input.messages.at(-1)?.content || '';
  const allowed = input.tools.map(t => t.name).sort();
  assert.deepEqual(allowed, ['plan_trip', 'search_places']);
  provider.push({ message, historyLength: input.messages.length - 1, allowedTools: allowed });
  const plan = (destinationCity = city) => ({ kind: 'tool', name: 'plan_trip', arguments: {
    departureCity: 'Hà Nội', destinationCity, startDate: '2030-06-15', endDate: '2030-06-15', adults: 2, children: 0,
    totalBudget: 1, transportation: 'car', preferences: [] } });
  if (message.startsWith('TÌM')) return { kind: 'tool', name: 'search_places', arguments: { destinationCity: city, dailyBudgetPerPerson: 500000, preferences: [] } };
  if (message.startsWith('LỊCH')) return plan();
  if (message.startsWith('THIẾU')) return { kind: 'clarify', fields: ['destinationCity'] };
  if (message.startsWith('KHÔNG HỖ TRỢ')) return { kind: 'unsupported' };
  if (message.startsWith('CATALOG RỖNG')) return plan('TAI03A-NONEXISTENT-CITY');
  if (message.startsWith('ĐẦU RA SAI')) return { kind: 'tool', name: 'delete_booking', arguments: {} };
  if (message.startsWith('THAM SỐ SAI')) { const bad = plan(); bad.arguments.totalBudget = -1; return bad; }
  if (message.startsWith('CHẬM')) return new Promise(resolve => setTimeout(() => resolve({ kind: 'unsupported' }), 2500));
  if (message.startsWith('TIMEOUT')) return new Promise(resolve => setTimeout(() => resolve({ kind: 'unsupported' }), 1000));
  return { kind: 'clarify', fields: ['destinationCity'] };
}
const providerObject = external => ({ configured: true, external, generate: async (input, signal) => scripted(input, signal) });
const services = {
  normal: new AgentOrchestrator({ provider: providerObject(false), limits: new AgentLimits(200, 10) }),
  external: new AgentOrchestrator({ provider: providerObject(true), limits: new AgentLimits(200, 10) }),
  disabled: new AgentOrchestrator(),
  limited: new AgentOrchestrator({ provider: providerObject(false), limits: new AgentLimits(0, 10) }),
  timeout: new AgentOrchestrator({ provider: providerObject(false), timeoutMs: 300 }),
};
async function startServer() {
  const routers = Object.fromEntries(Object.entries(services).map(([k, v]) => [k, createAgentRouter(v)]));
  const app = express(); app.use(express.json({ limit: '1mb' }));
  app.use((req, res, next) => {
    res.setHeader('X-TAI03A-Backend', id);
    if (!/\/api\/(agent|auth|trips|bookings)/.test(req.originalUrl)) return next();
    const original = res.json.bind(res);
    res.json = body => {
      const p = req.originalUrl;
      http.push({ method: req.method, path: p, status: res.statusCode,
        request: p.startsWith('/api/agent/chat') ? { message: req.body?.message, history: req.body?.history,
          externalProcessingConsent: req.body?.externalProcessingConsent } : undefined,
        response: p.startsWith('/api/agent/') ? body : undefined });
      return original(body);
    }; next();
  });
  app.use('/api/auth', authRoutes);
  app.use('/api/agent', (req, res, next) => {
    const m = String(req.body?.message || '');
    const key = m.startsWith('QUYỀN RIÊNG TƯ') ? 'external' : m.startsWith('CHƯA CẤU HÌNH') ? 'disabled'
      : m.startsWith('GIỚI HẠN') ? 'limited' : m.startsWith('TIMEOUT') ? 'timeout' : 'normal';
    return routers[key](req, res, next);
  });
  app.use('/api', apiRouter);
  server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)); });
  return server.address().port;
}
async function browser(port) {
  const browserEnv = { ...env, VITE_PROXY_TARGET: `http://127.0.0.1:${port}`, T_AI_03A_EVIDENCE: out,
    T_AI_03A_RUN_ID: id, T_AI_03A_CITY: city, T_AI_03A_FIXTURES: JSON.stringify({ users: fixtures.users, places: fixtures.places }),
    T_AI_03A_PASSWORD: password };
  const chunks = [];
  child = spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npx.cmd playwright test --config playwright.t-ai-03-a.config.ts'],
    { cwd: path.join(root, 'frontend'), env: browserEnv, windowsHide: true });
  child.stdout.on('data', b => chunks.push(b)); child.stderr.on('data', b => chunks.push(b));
  browserExit = await new Promise(resolve => child.on('exit', resolve));
  fs.writeFileSync(path.join(out, 'browser.log'), Buffer.concat(chunks).toString('utf8'));
  return browserExit;
}
async function cleanup() {
  if (!client) return;
  await client.query('BEGIN');
  try {
    const ids = fixtures.users.map(u => u.id), places = fixtures.places.map(p => p.id);
    const children = await client.query('SELECT (SELECT count(*) FROM bookings WHERE user_id=ANY($1::uuid[])) AS bookings, (SELECT count(*) FROM trip_sessions WHERE user_id=ANY($1::uuid[])) AS trips', [ids]);
    assert.equal(Number(children.rows[0].bookings), 0); assert.equal(Number(children.rows[0].trips), 0);
    await client.query('DELETE FROM user_roles WHERE user_id=ANY($1::uuid[])', [ids]);
    await client.query('DELETE FROM users WHERE id=ANY($1::uuid[]) AND email LIKE $2', [ids, `tai03a.${id.slice(-8)}.%@example.test`]);
    await client.query('DELETE FROM places WHERE id=ANY($1::uuid[]) AND city=$2', [places, city]);
    await client.query('COMMIT');
    const residual = await client.query('SELECT (SELECT count(*) FROM users WHERE id=ANY($1::uuid[])) AS users, (SELECT count(*) FROM user_roles WHERE user_id=ANY($1::uuid[])) AS roles, (SELECT count(*) FROM places WHERE id=ANY($2::uuid[])) AS places', [ids, places]);
    assert.deepEqual(Object.values(residual.rows[0]).map(Number), [0, 0, 0]);
    fixtures.cleanup = 'PASS'; fixtures.residual = residual.rows[0];
    fs.writeFileSync(path.join(out, 'ledger.json'), JSON.stringify(fixtures, null, 2));
    save('cleanup.json', { status: 'PASS', exactIds: { users: ids, roles: fixtures.roles.map(r => r.id), places }, residual: fixtures.residual });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); save('cleanup-failure.json', { status: 'FAIL', message: e.message }); throw e; }
}
async function main() {
  try {
    await preflight();
    await insertFixtures();
    const port = await startServer();
    assert.equal(createHash('sha256').update(fs.readFileSync(manifestPath)).digest('hex'), manifestHash);
    await browser(port);
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(out, 'http-traffic.json'), JSON.stringify({ tier: 'PROVIDER_MOCK_ONLY + REAL_BACKEND + REAL_POSTGRESQL', entries: http }, null, 2));
    fs.writeFileSync(path.join(out, 'provider-decisions.json'), JSON.stringify({ tier: 'PROVIDER_MOCK_ONLY', calls: provider }, null, 2));
    if (fixturesInserted) await cleanup();
    if (client) await client.end();
    await sequelize.close();
    if (fingerprintTaken) { fp('snapshot', path.join(out, 'after.json')); fp('compare', path.join(out, 'before.json'), path.join(out, 'after.json')); }
    save('run-summary.json', { runId: id, browserExit, preflight: fs.existsSync(path.join(out, 'preflight.json')),
      cleanup: fixtures.cleanup, fingerprintCompared: fingerprintTaken, providerCalls: provider.length, httpEntries: http.length,
      manifestSha256: manifestHash, liveLLM: 'NOT RUN' });
    console.log(JSON.stringify({ evidence: path.relative(root, out).replaceAll('\\', '/'), browserExit, cleanup: fixtures.cleanup }));
  }
  if (browserExit !== 0) process.exitCode = 1;
}
main().catch(e => { console.error('T-AI-03-A run failed:', e.message); process.exitCode = 1; });
