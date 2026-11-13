// Adapt scheduling/ready fixtures only. No assertion, business expected or production code changes.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../..');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const edits = [];
function replaceOnce(text, from, to, label) {
  assert.equal(text.split(from).length - 1, 1, label);
  edits.push({ label, before: from, after: to }); return text.replace(from, to);
}
const oldTransport = fs.readFileSync(path.join(root, 'backend/dist/tests/agentTransport.test.js'), 'utf8');
const newTransport = replaceOnce(oldTransport, 'const pending = p.generate(input, outer.signal);',
  'const pending = p.generate(input, outer.signal);\n    // Readiness GET fixture must settle before this historical POST-abort observation.\n    for (let tick = 0; tick < 100; tick++) await Promise.resolve();', 'transport POST abort scheduling');
fs.writeFileSync(path.join(root, 'backend/dist/tests/agentTransport.readiness-compatible.js'), newTransport);
fs.writeFileSync(path.join(__dirname, 'agentTransport.readiness-compatible.js'), newTransport);
const oldDiagnostics = fs.readFileSync(path.join(__dirname, 'prior-offline-diagnostics.cjs'), 'utf8');
let newDiagnostics = replaceOnce(oldDiagnostics, "path.resolve(__dirname, '../../..')", "path.resolve(__dirname, '../../../..')", 'isolated output directory root');
newDiagnostics = replaceOnce(newDiagnostics, "  await clock.advance(15000); const out = await result;\n  assert.equal(aborted, true);",
  '  await flush(); // Settle synthetic readiness GETs at logical time zero before advancing the standalone provider deadline.\n  await clock.advance(15000); const out = await result;\n  assert.equal(aborted, true);', 'standalone deadline fixture scheduling');
const output = path.join(__dirname, 'prior-diagnostics-compatible'); fs.mkdirSync(output);
fs.writeFileSync(path.join(output, 'offline-diagnostics.cjs'), newDiagnostics, { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'compatibility-diff.json'), JSON.stringify({ tier: 'MOCK_ONLY', edits,
  assertionsChanged: 0, sources: { transportCompiled: sha(oldTransport), diagnosticsOriginal: sha(oldDiagnostics) },
  derived: { transport: sha(newTransport), diagnostics: sha(newDiagnostics) }, fixture: 'legacy-ready-shim.cjs synthesizes only three GETs; old POST fake receives unchanged request' }, null, 2) + '\n', { flag: 'wx' });
