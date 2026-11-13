const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const backend = path.resolve(__dirname, '..');
const frontend = path.resolve(backend, '../frontend');
const stage = process.argv[2];
if (!['unit', 'postgres'].includes(stage)) throw new Error('Use unit or postgres');
const output = path.resolve(backend, process.argv[3]); fs.mkdirSync(output, { recursive: true });
const env = { ...process.env, NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_NAME: 'travelgo_ai_m0_test', TEST_DATABASE_NAME: 'travelgo_ai_m0_test', DB_SSL: 'false', ALLOW_TEST_DB_WRITES: 'true' };
const results = [];
function run(name, args, cwd = backend) {
  const r = spawnSync(process.execPath, args, { cwd, env, encoding: 'utf8', timeout: 180000 });
  const row = { name, args, cwd, exitCode: r.status, stdout: r.stdout, stderr: r.stderr, error: r.error?.message };
  fs.writeFileSync(path.join(output, name + '.json'), JSON.stringify(row, null, 2) + '\n', { flag: 'wx' });
  results.push({ name, exitCode: r.status }); console.log(JSON.stringify(results.at(-1)));
  return r.status === 0;
}
async function main() {
  if (stage === 'unit') {
    for (const name of ['tripSnapshot', 'tripLifecycle', 'plannerValidationCosts', 'plannerModes', 'tourPlannerMandatory', 'booking']) run(name, [`dist/tests/${name}.test.js`]);
    for (const name of ['plannerCosts', 'tripCosts', 'savedTripEditor']) run(name, ['--experimental-strip-types', `tests/${name}.test.ts`], frontend);
  } else {
    Object.assign(process.env, env); const support = require('./t13a-support.cjs');
    try {
      fs.writeFileSync(path.join(output, 'preflight.json'), JSON.stringify(await support.schema(), null, 2) + '\n', { flag: 'wx' });
      const before = path.join(output, 'fingerprint-before.json'), after = path.join(output, 'fingerprint-after.json');
      if (!run('fingerprint-before-command', ['dist/evaluation/t11_db_fingerprint.js', 'snapshot', before])) throw new Error('No valid before snapshot');
      try {
        for (const name of ['tripSnapshot', 'tripLifecycle', 'booking']) run(name + '-postgres', [`dist/tests/${name}.postgres.test.js`]);
      } finally {
        run('fingerprint-after-command', ['dist/evaluation/t11_db_fingerprint.js', 'snapshot', after]);
        run('fingerprint-compare', ['dist/evaluation/t11_db_fingerprint.js', 'compare', before, after]);
      }
    } finally { await support.sequelize.close(); }
  }
  fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
  if (results.some(row => row.exitCode !== 0)) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
