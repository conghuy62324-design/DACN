// Preserve the first offline run before final prompt syntax review; task-local files only.
const fs = require('node:fs');
const path = require('node:path');
const target = path.join(__dirname, 'pre-review');
fs.mkdirSync(target);
const names = fs.readdirSync(__dirname).filter(name => name.endsWith('.log') ||
  ['regression-summary.json', 'offline-analysis.json', 'ollama-system-before.txt', 'ollama-system-after.txt', 'integrity-after.json', 'source.diff'].includes(name));
for (const name of names) fs.renameSync(path.join(__dirname, name), path.join(target, name));
fs.writeFileSync(path.join(target, 'review-note.json'), JSON.stringify({ reason:
  'Removed the inline fields:[...] pseudo-JSON from routing prose; all four actual examples remain valid JSON. Added a prompt assertion against ellipsis syntax. Final offline run is stored in parent directory.',
  files: names, inferencePosts: 0 }, null, 2) + '\n', { flag: 'wx' });
console.log('Preserved ' + names.length + ' preliminary artifacts');
