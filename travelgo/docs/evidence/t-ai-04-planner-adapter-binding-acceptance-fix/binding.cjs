// Test harness only. A token is a complete $name[.member] lexical unit.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const token = /(?<![\w$.-])\$[A-Za-z][A-Za-z0-9_-]*(?:\.[A-Za-z][A-Za-z0-9_-]*)*(?![\w$.-])/g;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function bind(value, bindings, { path = false, allowFresh = false } = {}) {
  if (typeof value === 'string') {
    const matches = [...value.matchAll(token)];
    if (!matches.length) return value;
    const resolve = key => {
      if (key === '$FRESH_UUID' && allowFresh) return key;
      assert.ok(Object.hasOwn(bindings, key) && bindings[key] !== undefined, `UNRESOLVED_PLACEHOLDER:${key}`);
      const replacement = bindings[key];
      assert.ok(typeof replacement !== 'string' || ![...replacement.matchAll(token)].length, 'NESTED_PLACEHOLDER');
      return replacement;
    };
    if (!path && matches.length === 1 && matches[0][0] === value) return resolve(value);
    return value.replace(token, key => {
      const replacement = resolve(key);
      assert.ok(['string', 'number'].includes(typeof replacement), 'NON_SCALAR_PATH_BINDING');
      return path ? encodeURIComponent(String(replacement)) : String(replacement);
    });
  }
  if (Array.isArray(value)) return value.map(v => bind(v, bindings, { path, allowFresh }));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, bind(v, bindings, { path, allowFresh })]));
  return value;
}
const canonical = value => JSON.stringify(value, function(_key, v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v;
});
function guardRequest(template, request, bindings, usedIds) {
  assert.equal(hash(JSON.stringify(template.body ?? null)), template.bodyTemplateSha256, 'BODY_TEMPLATE_HASH');
  assert.equal(request.method, template.method, 'EXACT_METHOD');
  assert.equal(request.path, bind(template.path, bindings, { path: true }), 'EXACT_PATH');
  const expected = bind(template.body, bindings, { allowFresh: true });
  let fresh;
  if (expected?.conversation?.requestId === '$FRESH_UUID') {
    fresh = request.body?.conversation?.requestId;
    assert.match(fresh || '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.ok(!usedIds.has(fresh), 'REQUEST_ID_REPLAY');
    expected.conversation.requestId = fresh;
  }
  assert.deepEqual(request.body, expected, 'EXACT_BODY');
  const bodySha256 = hash(canonical(request.body ?? null));
  assert.equal(bodySha256, hash(canonical(expected ?? null)), 'BOUND_BODY_HASH');
  if (fresh) usedIds.add(fresh); // Rejects do not consume bindings or UUIDs.
  return { expected, bodySha256 };
}
module.exports = { bind, guardRequest, hash };
