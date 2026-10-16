import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { ENV } from '../config/env.js';
import {
  assertDatabaseSentinel,
  assertIsolatedTestDatabase,
  assertTestDatabaseWriteOptIn,
} from '../utils/testDatabaseGuard.js';

const migrationDirectory = path.resolve(process.cwd(), '../database/migrations');
const apply = process.argv.includes('--apply');

function checksum(sql: string): string {
  return createHash('sha256').update(sql).digest('hex');
}

function withoutEmbeddedTransaction(sql: string): string {
  return sql
    .replace(/^\s*BEGIN;\s*$/im, '')
    .replace(/^\s*COMMIT;\s*$/im, '');
}

async function run(): Promise<void> {
  assertIsolatedTestDatabase('Migration runner');
  const files = (await readdir(migrationDirectory)).filter((name) => name.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error(`No SQL migrations found in ${migrationDirectory}`);

  console.log(`Target: postgresql://${ENV.DB_USER}@${ENV.DB_HOST}:${ENV.DB_PORT}/${ENV.DB_NAME}`);
  console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  files.forEach((file) => console.log(`- ${file}`));
  if (!apply) {
    console.log('No database changes made. Re-run with --apply after confirming the isolated target.');
    return;
  }

  assertTestDatabaseWriteOptIn('Migration runner');

  const client = new Client({
    host: ENV.DB_HOST,
    port: ENV.DB_PORT,
    user: ENV.DB_USER,
    password: ENV.DB_PASSWORD,
    database: ENV.DB_NAME,
    ssl: false,
  });
  await client.connect();
  try {
    const identity = await client.query('SELECT current_database() AS database, current_user AS username, version() AS version');
    console.log(`Connected: ${identity.rows[0].database} as ${identity.rows[0].username}`);
    await assertDatabaseSentinel(client, 'Migration runner');
    await client.query("SELECT pg_advisory_lock(hashtext('hugotravel_schema_migrations'))");

    const tracked = await client.query("SELECT to_regclass('public.schema_migrations') AS table_name");
    if (!tracked.rows[0].table_name) {
      const existing = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name <> 'spatial_ref_sys' ORDER BY table_name"
      );
      if (existing.rowCount) {
        throw new Error(
          `Refusing an untracked non-empty schema (${existing.rows.map((row) => row.table_name).join(', ')}). ` +
          'Audit or back it up manually first, or create a new isolated test database.'
        );
      }
      await client.query(`CREATE TABLE schema_migrations (
        filename VARCHAR(255) PRIMARY KEY,
        checksum CHAR(64) NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`);
    }

    const applied = await client.query('SELECT filename, checksum FROM schema_migrations ORDER BY filename');
    const appliedByName = new Map(applied.rows.map((row) => [row.filename, row.checksum]));
    for (const filename of files) {
      const sql = await readFile(path.join(migrationDirectory, filename), 'utf8');
      const digest = checksum(sql);
      const previous = appliedByName.get(filename);
      if (previous) {
        if (previous !== digest) throw new Error(`Checksum changed after migration was applied: ${filename}`);
        console.log(`SKIP ${filename}`);
        continue;
      }

      await client.query('BEGIN');
      try {
        await client.query(withoutEmbeddedTransaction(sql));
        await client.query('INSERT INTO schema_migrations(filename, checksum) VALUES ($1, $2)', [filename, digest]);
        await client.query('COMMIT');
        console.log(`APPLIED ${filename}`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    try { await client.query("SELECT pg_advisory_unlock(hashtext('hugotravel_schema_migrations'))"); } catch {}
    await client.end();
  }
}

run().catch((error) => {
  console.error('Migration failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
