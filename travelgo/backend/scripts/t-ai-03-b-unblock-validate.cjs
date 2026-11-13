// Independent, read-only validation of V1 integrity and the review-only V2 draft.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const evidence = path.join(root, 'docs/evidence/t-ai-03-b-unblock');
const v1Path = path.join(root, 'docs/evidence/t-ai-01-b/nlu-manifest.json');
const lockPath = path.join(root, 'docs/evidence/t-ai-01-b/nlu-manifest-lock.json');
const v2Path = path.join(evidence, 'nlu-manifest-v2-draft.json');
const provenancePath = path.join(evidence, 'nlu-v2-provenance.json');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const decode = p => JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(p)));
const v1Bytes = fs.readFileSync(v1Path), lock = decode(lockPath), v1 = decode(v1Path), v2 = decode(v2Path), provenance = decode(provenancePath);
const findings = [];
function check(label, fn) { try { fn(); findings.push({ label, status: 'PASS' }); } catch (e) { findings.push({ label, status: 'FAIL', error: e.message }); } }
check('V1 SHA-256 matches historical lock', () => assert.equal(hash(v1Bytes), lock.sha256));
check('V1 historical count and tiers', () => { assert.equal(lock.liveCases, 24); assert.equal(lock.mockFaultCases, 4); assert.equal(v1.cases.length, 28); });
check('V2 UTF-8 JSON and draft metadata', () => {
  assert.equal(v2.version, 'T_AI_03_B_VI_V2_DRAFT');
  assert.equal(v2.approvalStatus, 'PENDING_OWNER_REVIEW');
  assert.equal(v2.sourceManifestSha256, lock.sha256);
  assert.equal(JSON.stringify(v2.criteria), JSON.stringify(v1.criteria));
  assert.equal(v2.cases.length, 24);
});
check('VI01-VI24 complete, unique and LIVE_LLM', () => {
  assert.deepEqual(v2.cases.map(c => c.id), Array.from({ length: 24 }, (_, i) => `VI${String(i + 1).padStart(2, '0')}`));
  v2.cases.forEach(c => assert.equal(c.tier, 'LIVE_LLM'));
});
check('Case schema and no replacement question mark', () => {
  for (const c of v2.cases) {
    assert.deepEqual(Object.keys(c).sort(), ['id','tier','title','request','expected','toolOutcome'].sort());
    assert.equal(typeof c.title, 'string'); assert.ok(c.title.trim());
    assert.equal(typeof c.request.message, 'string'); assert.ok(c.request.message.trim());
    assert.ok(['tool','clarify','unsupported'].includes(c.expected.kind));
    if (c.expected.kind === 'tool') {
      assert.ok(['plan_trip','search_places'].includes(c.expected.name));
      assert.equal(typeof c.expected.arguments, 'object');
      assert.ok(Object.keys(c.expected.arguments).length > 0);
    } else if (c.expected.kind === 'clarify') {
      assert.ok(Array.isArray(c.expected.fields) && c.expected.fields.length > 0);
    }
    if (c.request.history) for (const m of c.request.history) {
      assert.ok(['user','assistant'].includes(m.role)); assert.equal(typeof m.content, 'string'); assert.ok(m.content.trim());
    }
    for (const [p, value] of [['title',c.title],['request.message',c.request.message], ...((c.request.history || []).map((m,i)=>[`request.history[${i}].content`,m.content]))]) {
      assert.ok(!/[?\uFFFD]/u.test(value), `${c.id}.${p} contains replacement marker`);
      assert.equal(value, value.normalize('NFC'), `${c.id}.${p} is not NFC`);
    }
    for (const value of Object.values(c.expected.arguments || {})) if (typeof value === 'string') {
      assert.ok(!/[?\uFFFD]/u.test(value), `${c.id} expected argument contains replacement marker`);
      assert.equal(value, value.normalize('NFC'));
    }
  }
});
check('All test intents and expected values preserved', () => {
  const cities = { 'H? N?i':'Hà Nội', '?? N?ng':'Đà Nẵng', 'H?i An':'Hội An' };
  for (const c of v2.cases) {
    const o = v1.cases.find(x => x.id === c.id); assert.ok(o);
    const expected = structuredClone(o.expected);
    if (expected.arguments) for (const key of ['departureCity','destinationCity']) if (cities[expected.arguments[key]]) expected.arguments[key] = cities[expected.arguments[key]];
    assert.deepEqual(c.expected, expected, `${c.id} expected changed beyond source-supported city spelling`);
    assert.equal(c.toolOutcome, o.toolOutcome);
    assert.deepEqual((c.request.history || []).map(x => x.role), (o.request.history || []).map(x => x.role));
    if (c.id === 'VI15') assert.equal(c.request.message, o.request.message);
  }
});
check('Per-case provenance covers changed fields', () => {
  assert.deepEqual(Object.keys(provenance.cases), v2.cases.map(c => c.id));
  for (const c of v2.cases) {
    const p = provenance.cases[c.id]; assert.equal(p.exactOriginalVietnameseRecovered, false);
    assert.ok(['PROPOSED_RECONSTRUCTION','V1_UNCHANGED'].includes(p.fields.title));
    assert.ok(['PROPOSED_RECONSTRUCTION','V1_UNCHANGED'].includes(p.fields['request.message']));
    for (const k of Object.keys(c.expected.arguments || {})) assert.ok(p.fields[`expected.arguments.${k}`]);
  }
});
function walk(a, b, p = '', out = []) {
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) walk(a[key], b[key], p ? `${p}.${key}` : key, out);
  } else if (Array.isArray(a) && Array.isArray(b)) {
    for (let i=0; i<Math.max(a.length,b.length); i++) walk(a[i],b[i],`${p}[${i}]`,out);
  } else if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ path:p, v1:a, v2:b });
  return out;
}
const diff = v2.cases.map(c => {
  const o = v1.cases.find(x => x.id === c.id);
  const changed = walk(o,c).map(d => ({...d, provenance:provenance.cases[c.id].fields[d.path] || 'UNCLASSIFIED'}));
  return { id:c.id, changed };
});
check('Every per-case diff has classified provenance', () => {
  for (const row of diff) for (const d of row.changed) assert.notEqual(d.provenance, 'UNCLASSIFIED', `${row.id}.${d.path}`);
});
const result = { status: findings.every(x => x.status === 'PASS') ? 'PASS':'FAIL', v1Sha256:hash(v1Bytes), v2Sha256InformationalOnly:hash(fs.readFileSync(v2Path)), v2Approval:'PENDING_OWNER_REVIEW', liveCaseCount:v2.cases.length, replacedCharacterCount: (JSON.stringify(v2.cases).match(/[?\uFFFD]/gu)||[]).length, checks:findings };
fs.writeFileSync(path.join(evidence,'v2-validation.json'),JSON.stringify(result,null,2)+'\n');
fs.writeFileSync(path.join(evidence,'v1-v2-diff.json'),JSON.stringify({ status:'REVIEW_ONLY', v1RemovedFromDraft:['F01','F02','F03','F04'], cases:diff },null,2)+'\n');
console.log(JSON.stringify({ ...result, checks: findings.map(f=>`${f.label}: ${f.status}`) }));
if (result.status !== 'PASS') process.exitCode = 1;
