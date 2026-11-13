const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), os = require('node:os'), assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../..'), evidence = __dirname;
const read = rel => fs.readFileSync(path.join(root, rel));
const json = rel => JSON.parse(read(rel));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const write = (name, data) => fs.writeFileSync(path.join(evidence, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const model = 'qwen3:4b-instruct-2507-q4_K_M', digest = '0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0';
const principalSource = json('docs/evidence/t-ai-04-g1-missing-slot-live-check/manifest.json').principalSource;
const principal = json(principalSource).principalId, principalHash = sha(principal);
assert.equal(principal, '9997f6db-bfa1-4377-96f3-5b5ea19dbf34');
const env = { LLM_PROVIDER: 'ollama', LLM_LIVE_ENABLED: 'true', LLM_USAGE_APPROVED: 'true', OLLAMA_LOCAL_ONLY_CONFIRMED: 'true',
  OLLAMA_MODEL: model, OLLAMA_MODEL_DIGEST: digest, OLLAMA_BASE_URL: 'http://127.0.0.1:11434' };
function snapshot() {
  const hashes = {};
  for (const folder of ['backend/src', 'frontend/src', 'frontend/tests', 'docs']) for (const item of fs.readdirSync(path.join(root, folder), { recursive: true })) {
    const rel = path.join(folder, item).replaceAll('\\', '/');
    if (rel.startsWith('docs/evidence/t-ai-04-g1-readiness-controlled-check/') || rel === 'docs/HUGO_T_AI_04_G1_READINESS_CONTROLLED_CHECK_REPORT.md' || !fs.statSync(path.join(root, rel)).isFile()) continue;
    hashes[rel] = sha(read(rel));
  }
  for (const rel of ['backend/package.json', 'backend/package-lock.json', 'frontend/package.json', 'frontend/package-lock.json']) hashes[rel] = sha(read(rel));
  return hashes;
}
function integrity() {
  const prior = json('docs/evidence/t-ai-04-g1-readiness-abort-guard-fix/integrity-after.json').hashes;
  const changed = Object.entries(prior).filter(([file, hash]) => !fs.existsSync(path.join(root, file)) || sha(read(file)) !== hash).map(([file]) => file);
  assert.deepEqual(changed, [], 'Prior FIX source/history baseline must match');
  const artifactHashes = json('docs/evidence/t-ai-04-g1-readiness-abort-guard-fix/artifact-checksums.json');
  for (const [file, hash] of Object.entries(artifactHashes.hashes)) assert.equal(sha(read('docs/evidence/t-ai-04-g1-readiness-abort-guard-fix/' + file)), hash, file);
  assert.equal(sha(read('docs/HUGO_T_AI_04_G1_READINESS_ABORT_GUARD_FIX_REPORT.md')), artifactHashes.reportSha256);
  assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json')), '0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e');
  assert.equal(sha(read('docs/evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json')), 'f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706');
  if (fs.existsSync(path.join(evidence, 'integrity-before.json'))) {
    const before = json('docs/evidence/t-ai-04-g1-readiness-controlled-check/integrity-before.json').hashes;
    assert.deepEqual(snapshot(), before, 'Current task full baseline must remain unchanged');
  }
  return { status: 'PASS', priorBaselineFiles: Object.keys(prior).length, fixArtifacts: Object.keys(artifactHashes.hashes).length };
}
function rate(now = Date.now()) {
  const entries = [], failures = [], dir = path.join(root, 'docs/evidence');
  for (const rel of fs.readdirSync(dir, { recursive: true })) {
    if (!/^attempt-.*\.json$/.test(path.basename(rel))) continue;
    try {
      const item = JSON.parse(fs.readFileSync(path.join(dir, rel)));
      if (item.principalId !== principal && item.principalHash !== principalHash) continue;
      const at = item.at || item.createdAt;
      assert.ok(Number.isFinite(Date.parse(at)));
      entries.push({ id: item.id, at, timestampField: item.at ? 'at' : 'createdAt', path: 'docs/evidence/' + rel.replaceAll('\\', '/'), kind: item.kind || 'historical_application' });
    } catch { failures.push(rel.replaceAll('\\', '/')); }
  }
  assert.deepEqual(failures, [], 'Do not silently ignore unreadable attempt ledgers');
  const recent = entries.filter(x => Date.parse(x.at) > now - 3600000).sort((a,b) => Date.parse(a.at)-Date.parse(b.at));
  return { checkedAt: new Date(now).toISOString(), principalHash, principalSource, known: entries.length, recent,
    remainingConservativeSlots: Math.max(0, 20 - recent.length), futureDatedEntries: entries.filter(x => Date.parse(x.at) > now + 1000) };
}
function resources() {
  const lines = execFileSync('nvidia-smi', ['--query-gpu=name,driver_version,memory.total,memory.free,memory.used,utilization.gpu', '--format=csv,noheader,nounits'], { encoding: 'utf8', timeout: 5000 }).trim().split(/\r?\n/);
  const gpus = lines.map(line => { const [name, driver, total, free, used, utilization] = line.split(',').map(x => x.trim());
    return { name, driver, totalMiB: +total, freeMiB: +free, usedMiB: +used, utilizationPercent: +utilization }; });
  assert.ok(gpus.some(x => x.name.includes('NVIDIA') && [x.totalMiB,x.freeMiB,x.usedMiB].every(Number.isFinite)));
  return { at: new Date().toISOString(), ram: { totalMiB: Math.round(os.totalmem()/1048576), freeMiB: Math.round(os.freemem()/1048576) }, gpus };
}
function noProxy() {
  const names = ['HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','http_proxy','https_proxy','all_proxy'];
  const configuredNames = names.filter(name => !!process.env[name]);
  assert.deepEqual(configuredNames, [], 'Proxy environment present');
  assert.notEqual(process.env.NODE_USE_ENV_PROXY, '1');
  assert.ok(!/--use-env-proxy|--require|--import|--experimental-loader/.test(process.env.NODE_OPTIONS || ''), 'Unexpected Node transport hook');
  return { proxyEnvironmentPresent: false, nodeEnvProxy: false, endpoint: 'http://127.0.0.1:11434', redirect: 'error', cloud: false,
    scope: 'URL/env/native process/model metadata verification; not OS-wide packet capture' };
}
async function get(pathname) {
  assert.ok(['/api/version','/api/tags','/api/ps'].includes(pathname));
  const start = performance.now();
  const response = await fetch(env.OLLAMA_BASE_URL + pathname, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(5000) });
  assert.equal(response.status, 200); const body = await response.json();
  return { path: pathname, at: new Date().toISOString(), httpStatus: response.status, elapsedMs: performance.now()-start, body };
}
async function metadata() {
  const version = await get('/api/version'), tags = await get('/api/tags'), ps = await get('/api/ps');
  const installed = tags.body.models?.find(x => x.name === model && x.model === model);
  assert.ok(installed, 'Exact installed model tag missing'); assert.equal(installed.digest, digest);
  assert.ok(!installed.remote_host && !installed.remote_model, 'Remote model metadata is forbidden');
  assert.ok(typeof version.body.version === 'string' && version.body.version.length);
  const resident = ps.body.models?.find(x => x.name === model && x.model === model);
  if (resident) assert.equal(resident.digest, digest);
  return { version, tags, ps, resident: !!resident, residentContext: resident?.context_length ?? null,
    ready: !!resident && resident.digest === digest && resident.context_length === 16384 && (!resident.expires_at || Date.parse(resident.expires_at) > Date.now()) };
}
async function preflight(file, requireReady = false) {
  const record = { at: new Date().toISOString(), status: 'BLOCKED' };
  try {
    record.integrity = integrity(); record.local = noProxy(); record.rate = rate();
    assert.equal(record.rate.futureDatedEntries.length, 0); assert.ok(record.rate.remainingConservativeSlots > 0, 'No normal rolling-hour allowance');
    record.resources = resources(); record.metadata = await metadata();
    const netstat = execFileSync('netstat.exe', ['-ano', '-p', 'tcp'], { encoding: 'utf8', timeout: 5000 });
    const listener = netstat.split(/\r?\n/).find(x => /127\.0\.0\.1:11434\s+\S+\s+LISTENING/.test(x));
    assert.ok(listener, 'Exact native loopback listener not identified');
    const pid = listener.trim().split(/\s+/).at(-1);
    const processName = execFileSync('powershell.exe', ['-NoProfile','-Command', `Get-Process -Id ${Number(pid)} | Select-Object -ExpandProperty ProcessName`], { encoding: 'utf8', timeout: 10000 }).trim();
    assert.equal(processName, 'ollama'); record.listener = { pid: Number(pid), processName, address: '127.0.0.1:11434' };
    // Measured baseline allocation from M-run: 5102307901 bytes (~4866 MiB), not an arbitrary production threshold.
    record.resourceAssessment = { historicalResidentAllocationBytes: 5102307901, projectedGpuHeadroomMiB: record.resources.gpus[0].freeMiB - 5102307901/1048576,
      limitation: 'Planning estimate only; native GPU discovery/current memory pressure may differ. No production VRAM threshold added.' };
    if (!record.metadata.resident) assert.ok(record.resourceAssessment.projectedGpuHeadroomMiB > 0, 'No measured headroom for historical allocation');
    assert.ok(record.resources.ram.freeMiB > 0, 'No measurable free RAM');
    if (requireReady) assert.ok(record.metadata.ready, 'Resident metadata/context not ready');
    record.status = 'PASS';
  } catch (error) { record.reason = error.code || String(error.message).slice(0,500); }
  write(file, record); return record;
}
module.exports = { fs,path,assert,root,evidence,read,json,sha,write,model,digest,principalSource,principal,principalHash,env,snapshot,integrity,rate,resources,noProxy,get,metadata,preflight };
