// READ ONLY; no model invocation after the approved two POSTs.
const c = require('./common.cjs');
(async () => {
  const logs = c.json('docs/evidence/t-ai-04-g1-readiness-controlled-check/ollama-log-window.json');
  const full = c.fs.readFileSync(c.path.join(process.env.LOCALAPPDATA, 'Ollama/server.log'));
  const suffix = full.subarray(logs.baselineBytes).toString('utf8');
  const serverPostRows = suffix.split(/\r?\n/).filter(line => /\[GIN\].*POST.*\/api\/(generate|chat)/.test(line));
  c.assert.equal(serverPostRows.length, 2, 'No extra Ollama generation/chat POST during regression or report');
  c.noProxy(); const ps = await c.get('/api/ps');
  const oldPs = c.json('docs/evidence/t-ai-04-g1-readiness-controlled-check/smoke-result.json').metadataAfter.ps.body;
  const expectedExpiryAt = oldPs.models.find(x => x.name === c.model)?.expires_at || null;
  c.write('late-readonly-audit.json', { at: new Date().toISOString(), serverPostRows, postCountIncludingRegression: 2,
    ps, expectedExpiryAt, residentAtLateRead: ps.body.models.some(x => x.name === c.model),
    interpretation: 'Late idle snapshot is distinct from verified resident smoke window. No reload/unload/heartbeat request sent; no further application invocation.' });
  console.log(JSON.stringify({ status: 'PASS', postsIncludingRegression: 2, lateReadAt: ps.at, resident: ps.body.models.some(x => x.name === c.model), expectedExpiryAt }));
})().catch(e => { console.error(e.code || e.message); process.exitCode = 1; });
