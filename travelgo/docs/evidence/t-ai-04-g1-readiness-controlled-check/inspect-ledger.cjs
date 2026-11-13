const c = require('./common.cjs');
const entries = [], malformed = [], missingTime = [];
const directory = c.path.join(c.root, 'docs/evidence');
for (const file of c.fs.readdirSync(directory, { recursive: true })) {
  if (!/^attempt-.*\.json$/.test(c.path.basename(file))) continue;
  let item;
  try { item = JSON.parse(c.fs.readFileSync(c.path.join(directory, file))); } catch { malformed.push(file); continue; }
  if (item.principalId !== c.principal && item.principalHash !== c.principalHash) continue;
  const safe = { file: file.replaceAll('\\','/'), id: item.id, at: item.at || null, keys: Object.keys(item) };
  if (!Number.isFinite(Date.parse(item.at))) missingTime.push(safe); else entries.push({ file: safe.file, id: item.id, at: item.at });
}
c.write('ledger-schema-inspection.json', { at: new Date().toISOString(), principalHash: c.principalHash, entries, missingTime, malformed });
console.log(JSON.stringify({ entries: entries.length, missingTime, malformed }));
