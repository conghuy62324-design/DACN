const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(process.argv[2]);
fs.mkdirSync(output, { recursive: true });
const env = { ...process.env, DB_HOST: '127.0.0.1', DB_NAME: 'travelgo_ai_m0_test', TEST_DATABASE_NAME: 'travelgo_ai_m0_test', DB_SSL: 'false' };
delete env.ALLOW_TEST_DB_WRITES;
const rows = [];
function run(name, args) {
  const r = spawnSync(process.execPath, args, { env, encoding: 'utf8', timeout: 120000 });
  const row = { name, command: 'node', args, exitCode: r.status, stdout: r.stdout, stderr: r.stderr, error: r.error?.message };
  fs.writeFileSync(path.join(output, name + '.json'), JSON.stringify(row, null, 2) + '\n', { flag: 'wx' });
  rows.push(row); console.log(JSON.stringify({ name, exitCode: r.status }));
  if (r.status !== 0) throw new Error(name + ' failed');
}
try {
  run('preflight', ['dist/scripts/verifyDatabase.js']);
  const before = path.join(output, 'fingerprint-before.json');
  const after = path.join(output, 'fingerprint-after.json');
  run('fingerprint-before-command', ['dist/evaluation/t11_db_fingerprint.js', 'snapshot', before]);
  // All test fixtures additionally enforce exact DB/guard/sentinel before writes.
  env.ALLOW_TEST_DB_WRITES = 'true';
  try {
    run('trip-snapshot-postgres', ['dist/tests/tripSnapshot.postgres.test.js']);
    run('trip-lifecycle-postgres', ['dist/tests/tripLifecycle.postgres.test.js']);
  } finally {
    delete env.ALLOW_TEST_DB_WRITES;
    run('fingerprint-after-command', ['dist/evaluation/t11_db_fingerprint.js', 'snapshot', after]);
    run('fingerprint-compare', ['dist/evaluation/t11_db_fingerprint.js', 'compare', before, after]);
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(rows.map(({ name, exitCode }) => ({ name, exitCode })), null, 2) + '\n', { flag: 'wx' }); }
