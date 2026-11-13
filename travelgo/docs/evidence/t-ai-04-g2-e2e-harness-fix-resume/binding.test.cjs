const { test } = require('node:test');
const assert = require('node:assert/strict');
const { bind, guardRequest, hash } = require('./binding.cjs');
const { randomUUID } = require('node:crypto');
const serverId = randomUUID(), bindings = { '$desktop.id': serverId, '$mobile.id': randomUUID(), '$revision': 3, '$word': 'Đà Nẵng/a?x=1#z %' };
const template = (method, path, body) => ({ method, path, body, bodyTemplateSha256: hash(JSON.stringify(body ?? null)) });
test('whole values preserve server UUID and numeric types recursively', () => {
  assert.deepEqual(bind({ id: '$desktop.id', revision: '$revision', list: ['$mobile.id', null] }, bindings), { id: serverId, revision: 3, list: [bindings['$mobile.id'], null] });
});
test('full absolute URL and reset path interpolate tokens', () => {
  assert.equal(bind('http://127.0.0.1:3355/api/agent/verified-history/$desktop.id/reset', bindings, { path: true }), `http://127.0.0.1:3355/api/agent/verified-history/${serverId}/reset`);
});
test('revoke endpoint and all-session literal path', () => {
  assert.equal(bind('/api/agent/verified-history/$mobile.id', bindings, { path: true }), '/api/agent/verified-history/' + bindings['$mobile.id']);
  assert.equal(bind('/api/agent/verified-history', bindings, { path: true }), '/api/agent/verified-history');
});
test('URL component encoding, once, including reserved characters', () => {
  assert.equal(bind('/catalog/$word?city=$word', bindings, { path: true }), '/catalog/' + encodeURIComponent(bindings.$word) + '?city=' + encodeURIComponent(bindings.$word));
});
test('non-token partial substrings remain literal', () => {
  for (const value of ['prefix$desktop.id', 'x$desktop.idSuffix', '$desktopX', '$desktop.idSuffix', '$desktop.id.extra']) {
    if (value.startsWith('$')) assert.throws(() => bind(value, bindings), /UNRESOLVED/);
    else assert.equal(bind(value, bindings), value);
  }
  assert.equal(bind('price $5; desktop.id; desktop; email@example.test', bindings), 'price $5; desktop.id; desktop; email@example.test');
});
test('unresolved placeholder in value or URL fails closed', () => {
  for (const value of ['$missing.id', '/api/$missing.id/reset', '$FRESH_UUID']) assert.throws(() => bind(value, bindings), /UNRESOLVED/);
});
test('no cascading substitution from replacement data', () => assert.throws(() => bind('$desktop.id', { '$desktop.id': '$mobile.id' }), /NESTED/));
test('reset guard accepts exact method/path/body/hash', () => {
  const t = template('POST', '/api/agent/verified-history/$desktop.id/reset', {});
  guardRequest(t, { method: 'POST', path: `/api/agent/verified-history/${serverId}/reset`, body: {} }, bindings, new Set());
});
test('revoke guard accepts absent body and exact server ID', () => {
  guardRequest(template('DELETE', '/api/agent/verified-history/$desktop.id'), { method: 'DELETE', path: `/api/agent/verified-history/${serverId}` }, bindings, new Set());
});
test('wrong endpoint/method/body/client-created ID and tampered hash remain rejected', () => {
  const t = template('POST', '/api/agent/verified-history/$desktop.id/reset', {}), r = { method: 'POST', path: `/api/agent/verified-history/${serverId}/reset`, body: {} };
  for (const patch of [{ path: r.path + '/extra' }, { method: 'DELETE' }, { body: { bypass: true } }, { path: r.path.replace(serverId, randomUUID()) }]) assert.throws(() => guardRequest(t, { ...r, ...patch }, bindings, new Set()));
  assert.throws(() => guardRequest({ ...t, bodyTemplateSha256: 'bad' }, r, bindings, new Set()), /BODY_TEMPLATE_HASH/);
});
for (const action of ['start', 'continue']) test(`${action} fresh UUID, replay rejection, exact body`, () => {
  const body = { message: 'synthetic offline', conversation: { action, requestId: '$FRESH_UUID', consentVersion: 'LOCAL_DEMO_SLOTS_V1', ...(action === 'continue' ? { id: '$desktop.id', revision: 3 } : {}) } };
  const t = template('POST', '/api/agent/chat', body), actual = bind(body, bindings, { allowFresh: true }), ids = new Set();
  actual.conversation.requestId = randomUUID();
  const r = { method: 'POST', path: '/api/agent/chat', body: actual };
  guardRequest(t, r, bindings, ids);
  assert.throws(() => guardRequest(t, r, bindings, ids), /REPLAY/);
  actual.conversation.requestId = randomUUID(); guardRequest(t, r, bindings, ids);
  actual.conversation.requestId = 'bad'; assert.throws(() => guardRequest(t, r, bindings, ids));
});
