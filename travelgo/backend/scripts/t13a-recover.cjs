// Explicit persisted-ledger recovery, including account email normalization.
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const support = require('./t13a-support.cjs');
async function main() {
  const dir = path.resolve(process.argv[2]);
  const root = path.resolve(__dirname, '../../docs/evidence/t13a') + path.sep;
  assert.ok(dir.startsWith(root), 'Only T13-A evidence ledgers are accepted');
  await support.schema(); const results = [];
  try {
    for (const project of ['desktop', 'mobile']) if (fs.existsSync(path.join(dir, project, 'ledger.json'))) {
      const fixture = new support.Fixtures(dir, project); await fixture.cleanup();
      results.push({ project, users: fixture.data.users, cleanup: fixture.data.cleanup });
    }
    support.write(path.join(dir, 'recovery-cleanup.json'), results); console.log(JSON.stringify(results));
  } finally { await support.sequelize.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
