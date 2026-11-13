// Dedicated application-DB migration path. The test-only runner and sentinel stay unchanged.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const dotenv = require('dotenv');

const expectedDatabase = 'travelgo_dev';
const migrationDir = path.resolve(__dirname, '../../database/migrations');
const backendEnv = dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../.env')));
const filenames = fs.readdirSync(migrationDir).filter(name => name.endsWith('.sql')).sort();
const recent = filenames.filter(name => /_1[12]_/.test(name));
const digest = data => createHash('sha256').update(data).digest('hex');
const applicationHost = ['localhost', '127.0.0.1', '::1'].includes(backendEnv.DB_HOST);
const apply = process.argv.includes('--apply');

function checkTarget() {
  assert.equal(backendEnv.DB_NAME, expectedDatabase, 'Application .env DB_NAME must be travelgo_dev');
  assert(applicationHost, 'Application .env DB_HOST must be loopback');
  assert.equal(Number(backendEnv.DB_PORT), 5432, 'Application .env DB_PORT must be 5432');
  assert.equal(backendEnv.DB_SSL, 'false', 'Application .env DB_SSL must be false for this local workflow');
  assert(!process.env.DB_NAME || process.env.DB_NAME === expectedDatabase, 'Process DB_NAME overrides application target');
  assert(!process.env.TEST_DATABASE_NAME, 'Remove test DB environment before application migration');
  assert(process.env.ALLOW_TEST_DB_WRITES !== 'true', 'Remove test write opt-in before application migration');
  assert.equal(filenames.length, 12, 'Unexpected migration inventory');
  assert.equal(recent.length, 2, 'Expected only migrations 11 and 12');
}

function checkBackup() {
  if (!apply) return;
  const backupArgument = process.argv.indexOf('--backup');
  assert(backupArgument >= 0 && process.argv[backupArgument + 1], 'Pass a verified local backup path with --backup');
  const backup = path.resolve(process.argv[backupArgument + 1]);
  assert(backup.startsWith(path.resolve(__dirname, '../../.local-demo-backups') + path.sep), 'Backup must be in ignored .local-demo-backups');
  const bytes = fs.readFileSync(backup);
  assert(bytes.length > 5 && bytes.subarray(0, 5).toString() === 'PGDMP', 'Backup must be a readable PostgreSQL custom archive');
  console.log(JSON.stringify({ backup, bytes: bytes.length, sha256: digest(bytes) }));
}

async function state(client) {
  const identity = (await client.query('SELECT current_database() AS name')).rows[0].name;
  assert.equal(identity, expectedDatabase, 'Connected to unexpected database');
  const tracked = (await client.query('SELECT filename, checksum FROM schema_migrations ORDER BY filename')).rows;
  assert.equal(tracked.length >= 10 && tracked.length <= 12, true, 'Unexpected migration count');
  const byName = new Map(tracked.map(row => [row.filename, row.checksum]));
  for (const filename of filenames) {
    const previous = byName.get(filename);
    const expected = digest(fs.readFileSync(path.join(migrationDir, filename)));
    if (!previous && !recent.includes(filename)) throw Error(`Missing prerequisite migration: ${filename}`);
    if (previous && previous !== expected) throw Error(`Checksum mismatch: ${filename}`);
  }
  for (const { filename } of tracked) assert(filenames.includes(filename), `Unknown applied migration: ${filename}`);
  const specs = [
    ['20261028_11_trip_planner_metadata.sql', 'trip_sessions', 'planner_metadata', 'jsonb', null, 'trip_sessions_planner_metadata_check'],
    ['20261030_12_booking_request_fingerprint.sql', 'bookings', 'request_fingerprint', 'character varying', 64, 'bookings_request_fingerprint_check'],
  ];
  const report = [];
  for (const [filename, table, column, type, maxLength, constraint] of specs) {
    assert((await client.query('SELECT to_regclass($1) AS table_name', [`public.${table}`])).rows[0].table_name, `Missing table: ${table}`);
    const col = (await client.query("SELECT data_type, character_maximum_length, is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 AND column_name=$2", [table, column])).rows[0];
    const con = (await client.query("SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid=$1::regclass AND conname=$2", [table, constraint])).rows[0];
    const applied = byName.has(filename);
    if (applied) {
      assert(col && con, `Applied migration lacks column/constraint: ${filename}`);
      assert.equal(col.data_type, type, `Wrong type: ${table}.${column}`);
      assert.equal(col.character_maximum_length, maxLength, `Wrong length: ${table}.${column}`);
      assert.equal(col.is_nullable, 'YES', `Column must be nullable: ${table}.${column}`);
      assert(con.definition.startsWith('CHECK ('), `Wrong constraint: ${constraint}`);
      if (column === 'planner_metadata') assert(/jsonb_typeof.*object.*32768/.test(con.definition), 'Unexpected planner metadata check');
      else assert(/\[0-9a-f\].*64/.test(con.definition), 'Unexpected request fingerprint check');
    } else assert(!col && !con, `Partial untracked schema: ${filename}`);
    report.push({ filename, checksum: digest(fs.readFileSync(path.join(migrationDir, filename))), status: applied ? 'SKIP' : 'PENDING' });
  }
  return report;
}

async function main() {
  checkTarget(); checkBackup();
  const client = new Client({ host: backendEnv.DB_HOST, port: Number(backendEnv.DB_PORT), database: backendEnv.DB_NAME, user: backendEnv.DB_USER, password: backendEnv.DB_PASSWORD, ssl: false, application_name: 'hugo_local_demo_migration' });
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtext('hugotravel_schema_migrations'))");
    const pending = await state(client);
    console.log(JSON.stringify({ database: expectedDatabase, mode: apply ? 'APPLY' : 'DRY_RUN', migrations: pending }));
    if (apply) {
      if (pending.some(row => row.status === 'PENDING')) {
        const others = (await client.query("SELECT pid, application_name, state FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid() AND backend_type='client backend'")).rows;
        assert.equal(others.length, 0, 'Stop all other clients before schema update');
      }
      for (const row of pending.filter(row => row.status === 'PENDING')) {
        const sql = fs.readFileSync(path.join(migrationDir, row.filename), 'utf8').replace(/^\s*BEGIN;\s*$/im, '').replace(/^\s*COMMIT;\s*$/im, '');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(filename, checksum) VALUES ($1,$2)', [row.filename, row.checksum]);
        console.log(JSON.stringify({ applied: row.filename, checksum: row.checksum }));
      }
      const result = await state(client);
      assert(result.every(row => row.status === 'SKIP'), 'Post-migration verification failed');
      console.log(JSON.stringify({ verified: result }));
      await client.query('COMMIT');
    } else await client.query('ROLLBACK');
  } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; }
  finally { await client.end(); }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
