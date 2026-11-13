// Read-only SHA-256 baseline/audit for T-AI-03-B; preserves historical evidence.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..'), out = path.join(root, 'docs/evidence/t-ai-03-b');
const skip = new Set(['node_modules', '.git', 'dist', 'test-results', 'playwright-report']);
const hash = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
function walk(dir, rows = {}) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name), rel = path.relative(root, p).replaceAll('\\', '/');
    if (p === out || skip.has(e.name) || e.name.startsWith('.env') || e.isSymbolicLink()) continue;
    if (e.isDirectory()) walk(p, rows); else if (e.isFile()) rows[rel] = hash(p);
  }
  return rows;
}
fs.mkdirSync(out, { recursive: true });
const baseline = path.join(out, 'baseline.json');
if (process.argv[2] === 'before') {
  if (fs.existsSync(baseline)) throw Error('Baseline already exists');
  const rows = walk(root); fs.writeFileSync(baseline, JSON.stringify(rows, null, 2));
  console.log(JSON.stringify({ baselineFiles: Object.keys(rows).length }));
} else {
  const before = JSON.parse(fs.readFileSync(baseline)), after = walk(root);
  const changed = Object.keys(before).filter(p => after[p] !== before[p]);
  const added = Object.keys(after).filter(p => !(p in before));
  const result = { baselineFiles: Object.keys(before).length, changed, added,
    unchanged: Object.keys(before).length - changed.length, hashes: after };
  fs.writeFileSync(path.join(out, 'integrity-after.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, hashes: undefined }));
}
