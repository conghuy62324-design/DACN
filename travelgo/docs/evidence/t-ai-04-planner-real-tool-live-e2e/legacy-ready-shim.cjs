// MOCK_ONLY readiness fixture for pre-guard suites. Never used by application or new guard tests.
// Preserve old POST fakes/observations: control-plane GETs are synthesized separately.
const path = require('node:path');
const modulePath = path.resolve(__dirname, '../../../backend/dist/agent/liveProvider.js');
const live = require(modulePath), original = live.createConfiguredProvider;
live.createConfiguredProvider = function(env, fakeFetcher, trace) {
  if (env?.LLM_PROVIDER !== 'ollama' || !fakeFetcher && !env.OLLAMA_MODEL?.startsWith('MOCK_ONLY')) return original(env, fakeFetcher, trace || (() => {}));
  // One historical suite uses a real loopback HTTP mock server for POST/redirect checks.
  // It also receives synthetic readiness, without changing its existing POST assertions.
  const transport = fakeFetcher || globalThis.fetch;
  const wrapped = (url, init) => {
    if (init?.method !== 'GET') return transport(url, init);
    const operation = new URL(String(url)).pathname;
    if (!['/api/version', '/api/tags', '/api/ps'].includes(operation)) throw Error('Unexpected MOCK_ONLY GET');
    const row = { name: env.OLLAMA_MODEL, model: env.OLLAMA_MODEL, digest: env.OLLAMA_MODEL_DIGEST || 'a'.repeat(64),
      context_length: 16384, size: 2000, size_vram: 1000, expires_at: new Date(Date.now() + 300000).toISOString() };
    return Promise.resolve(new Response(JSON.stringify(operation === '/api/version' ? { version: 'MOCK_ONLY' } : { models: [row] })));
  };
  return original(env, wrapped, trace || (() => {}));
};
