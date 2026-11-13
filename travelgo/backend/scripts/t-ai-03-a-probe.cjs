// T-AI-03-A read-only DB inventory. No fixture writes or API calls.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
process.chdir(path.resolve(__dirname, '..'));
Object.assign(process.env, { NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_NAME: 'travelgo_ai_m0_test', DB_SSL: 'false', ALLOW_TEST_DB_WRITES: 'false', LLM_LIVE_ENABLED: 'false' });
require('dotenv').config({ quiet: true });
const { sequelize } = require('../dist/models/index.js');
const { ENV } = require('../dist/config/env.js');
const { assertIsolatedTestDatabase, assertDatabaseSentinel } = require('../dist/utils/testDatabaseGuard.js');
const { RecommendationRepository } = require('../dist/repositories/recommendationRepository.js');
const out = path.resolve('../docs/evidence/t-ai-03-a');
async function main() {
  if (ENV.DB_NAME !== 'travelgo_ai_m0_test' || ENV.DB_HOST !== '127.0.0.1' || ENV.NODE_ENV !== 'test') throw Error('Exact test DB identity mismatch');
  assertIsolatedTestDatabase('T-AI-03-A read-only probe');
  sequelize.addHook('afterConnect', async c => { await c.query('SET default_transaction_read_only = on'); await c.query("SET statement_timeout = '15000ms'"); });
  await assertDatabaseSentinel(sequelize, 'T-AI-03-A read-only probe');
  const [identity] = await sequelize.query("SELECT current_database() AS database, current_user AS username, current_setting('default_transaction_read_only') AS read_only");
  if (identity[0].database !== ENV.DB_NAME || identity[0].read_only !== 'on') throw Error('Not read-only test DB');
  const migrations = [];
  for (const filename of fs.readdirSync('../database/migrations').filter(f => f.endsWith('.sql')).sort()) {
    const checksum = crypto.createHash('sha256').update(fs.readFileSync(path.join('../database/migrations', filename))).digest('hex');
    const [rows] = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename', { replacements: { filename } });
    if (rows[0]?.checksum !== checksum) throw Error(`Migration checksum mismatch: ${filename}`);
    migrations.push({ filename, checksum });
  }
  if (migrations.length !== 12) throw Error('Expected 12 migrations');
  const catalog = await RecommendationRepository.getApprovedPlaces();
  const places = catalog.map(p => ({ id: p.id, name: p.name, category: p.category, city: p.city,
    priceFrom: typeof p.priceFrom === 'number' ? p.priceFrom : null, catalogPriceAvailable: p.catalogPriceAvailable !== false,
    businessStatus: p.business?.status || null }));
  const cities = [...new Set(places.filter(p => p.city).map(p => p.city))].map(city => ({ city,
    attractions: places.filter(p => p.city === city && p.category === 'attraction').length,
    zero: places.filter(p => p.city === city && p.priceFrom === 0 && p.catalogPriceAvailable).length,
    missing: places.filter(p => p.city === city && (p.priceFrom === null || !p.catalogPriceAvailable)).length }));
  const result = { identity: identity[0], sentinel: 'PASS', guard: 'PASS', migrations,
    catalog: { count: places.length, cities, places } };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'probe.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ database: identity[0].database, readOnly: identity[0].read_only, migrations: migrations.length,
    catalogCount: places.length, cities }));
}
main().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => sequelize.close());
