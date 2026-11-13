// Read-only business-row inventory for travelgo_dev, comparable across migrations 11/12.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const dotenv = require('dotenv');
const env = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env')));

async function main() {
  assert.equal(env.DB_NAME, 'travelgo_dev');
  assert(['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST));
  assert(!process.env.DB_NAME || process.env.DB_NAME === env.DB_NAME);
  assert(!process.env.TEST_DATABASE_NAME && process.env.ALLOW_TEST_DB_WRITES !== 'true');
  const client = new Client({ host: env.DB_HOST, port: Number(env.DB_PORT), database: env.DB_NAME, user: env.DB_USER, password: env.DB_PASSWORD, ssl: false, application_name: 'hugo_local_demo_fingerprint' });
  await client.connect();
  try {
    await client.query('BEGIN READ ONLY');
    assert.equal((await client.query('SELECT current_database() AS db')).rows[0].db, 'travelgo_dev');
    const tables = (await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN ('spatial_ref_sys','schema_migrations') ORDER BY tablename")).rows;
    const inventory = {};
    for (const { tablename } of tables) {
      // These two nullable columns are the only data-shape differences introduced
      // by migrations 11/12. All other existing row fields remain in the digest.
      const sql = `SELECT count(*)::int AS rows, md5(COALESCE(string_agg((to_jsonb(t)-'planner_metadata'-'request_fingerprint')::text, '' ORDER BY (to_jsonb(t)-'planner_metadata'-'request_fingerprint')::text),'')) AS fingerprint FROM "${tablename}" t`;
      inventory[tablename] = (await client.query(sql)).rows[0];
    }
    await client.query('COMMIT');
    console.log(JSON.stringify({ database: 'travelgo_dev', tableCount: tables.length, inventory }));
  } finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
