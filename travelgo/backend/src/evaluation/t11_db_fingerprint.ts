/** Read-only full-table fingerprint on the exact guarded T11 test database. */
import { Client } from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ENV } from '../config/env.js';
import { assertDatabaseSentinel, assertIsolatedTestDatabase } from '../utils/testDatabaseGuard.js';

type Snapshot = { database: string; tables: Record<string, { rows: string; sha256OfRowHashes: string }> };

async function snapshot(path: string): Promise<void> {
  assertIsolatedTestDatabase('T11 fingerprint');
  if (ENV.DB_NAME !== 'travelgo_ai_m0_test') throw new Error('T11 fingerprint requires exact travelgo_ai_m0_test');
  const client = new Client({ host: ENV.DB_HOST, port: ENV.DB_PORT, user: ENV.DB_USER, password: ENV.DB_PASSWORD, database: ENV.DB_NAME, ssl: false });
  await client.connect();
  try {
    await assertDatabaseSentinel(client, 'T11 fingerprint');
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    const result: Snapshot = { database: ENV.DB_NAME, tables: {} };
    const names = await client.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename");
    for (const record of names.rows) {
      const name = String(record.tablename);
      const quoted = `"${name.replaceAll('"', '""')}"`;
      const data = await client.query(`SELECT count(*)::text AS rows, coalesce(string_agg(md5(to_jsonb(t)::text), ',' ORDER BY md5(to_jsonb(t)::text)), '') AS row_hashes FROM public.${quoted} AS t`);
      result.tables[name] = {
        rows: data.rows[0].rows,
        sha256OfRowHashes: createHash('sha256').update(data.rows[0].row_hashes).digest('hex'),
      };
    }
    await client.query('COMMIT');
    await writeFile(path, JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
    console.log(JSON.stringify({ result: 'PASS', database: result.database, tables: Object.keys(result.tables).length, output: path }));
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve original error */ }
    throw error;
  } finally { await client.end(); }
}

async function compare(beforePath: string, afterPath: string): Promise<void> {
  const before = JSON.parse(await readFile(beforePath, 'utf8')) as Snapshot;
  const after = JSON.parse(await readFile(afterPath, 'utf8')) as Snapshot;
  if (before.database !== 'travelgo_ai_m0_test' || after.database !== before.database) throw new Error('Fingerprint DB identity mismatch');
  const names = [...new Set([...Object.keys(before.tables), ...Object.keys(after.tables)])].sort();
  const changed = names.filter((name) => JSON.stringify(before.tables[name]) !== JSON.stringify(after.tables[name]));
  console.log(JSON.stringify({ result: changed.length ? 'FAIL' : 'PASS', database: before.database, tables: names.length, changed }));
  if (changed.length) process.exitCode = 1;
}

const [mode, first, second] = process.argv.slice(2);
if (mode === 'snapshot' && first) snapshot(first).catch((error) => { console.error(error.message); process.exitCode = 1; });
else if (mode === 'compare' && first && second) compare(first, second).catch((error) => { console.error(error.message); process.exitCode = 1; });
else { console.error('Usage: node dist/evaluation/t11_db_fingerprint.js snapshot <new-output.json> | compare <before.json> <after.json>'); process.exitCode = 2; }
