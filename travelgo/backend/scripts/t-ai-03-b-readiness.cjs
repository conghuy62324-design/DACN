// Offline readiness only. Never calls provider.generate, downloads a model, or sends data outside loopback.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
process.chdir(path.resolve(__dirname, '..'));
Object.assign(process.env, { NODE_ENV: 'test', DB_HOST: '127.0.0.1', DB_NAME: 'travelgo_ai_m0_test',
  DB_SSL: 'false', ALLOW_TEST_DB_WRITES: 'false' });
require('dotenv').config({ quiet: true });
const root = path.resolve('..'), evidence = path.join(root, 'docs/evidence/t-ai-03-b');
const out = path.join(evidence, 'readiness-' + new Date().toISOString().replace(/[-:.]/g, ''));
fs.mkdirSync(out, { recursive: true });
const write = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const source = path.join(root, 'docs/evidence/t-ai-01-b/nlu-manifest.json');
const bytes = fs.readFileSync(source), manifest = JSON.parse(bytes);
const lock = JSON.parse(fs.readFileSync(path.join(root, 'docs/evidence/t-ai-01-b/nlu-manifest-lock.json')));
const sha256 = createHash('sha256').update(bytes).digest('hex');
assert.equal(sha256, lock.sha256, 'Frozen manifest hash mismatch');
assert.equal(manifest.cases.filter(c => c.tier === 'LIVE_LLM').length, 24);
assert.equal(manifest.cases.filter(c => c.tier === 'MOCK_ONLY').length, 4);
const payload = JSON.stringify(manifest.cases.filter(c => c.tier === 'LIVE_LLM').map(c => ({ title: c.title, request: c.request, expected: c.expected })));
const corruption = { hashMatchesLock: true, sha256, literalQuestionMarks: (payload.match(/\?/g) || []).length,
  casesWithQuestionMarks: manifest.cases.filter(c => c.tier === 'LIVE_LLM' && /\?/.test(JSON.stringify({ title: c.title, request: c.request, expected: c.expected }))).map(c => c.id),
  example: { id: manifest.cases[0].id, title: manifest.cases[0].title, message: manifest.cases[0].request.message },
  evaluationIntegrity: 'BLOCKED_LOSSY_VIETNAMESE_TEXT' };
write('manifest-audit.json', corruption);
const { createConfiguredProvider } = require('../dist/agent/liveProvider.js');
const { localOllamaUrl } = require('../dist/agent/liveProvider.js');
const isTrue = key => process.env[key] === 'true';
const provider = ['gemini', 'ollama'].includes(process.env.LLM_PROVIDER) ? process.env.LLM_PROVIDER : null;
const config = { provider, providerConfigured: createConfiguredProvider().configured,
  liveEnabled: isTrue('LLM_LIVE_ENABLED'), usageApproved: isTrue('LLM_USAGE_APPROVED'),
  externalProcessingApproved: isTrue('LLM_EXTERNAL_PROCESSING_APPROVED'), localOnlyConfirmed: isTrue('OLLAMA_LOCAL_ONLY_CONFIRMED'),
  geminiModelPresent: Boolean(process.env.GEMINI_MODEL?.trim()), geminiKeyPresent: Boolean(process.env.GEMINI_API_KEY?.trim()),
  ollamaModelPresent: Boolean(process.env.OLLAMA_MODEL?.trim()), ollamaUrlLoopbackValid: (() => {
    try { localOllamaUrl(process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'); return true; } catch { return false; }
  })(), evaluationApproved: isTrue('T_AI_01_B_LIVE_APPROVED') };
write('configuration.json', config); // Presence/booleans only: no API key, URL, model name, JWT or private prompt.
const gpu = spawnSync('nvidia-smi', ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader,nounits'],
  { encoding: 'utf8', timeout: 3000, windowsHide: true });
const hardware = { platform: os.platform(), arch: os.arch(), cpuModel: os.cpus()[0]?.model,
  cpuCount: os.cpus().length, totalMemoryGiB: +(os.totalmem()/1073741824).toFixed(1),
  freeMemoryGiB: +(os.freemem()/1073741824).toFixed(1), gpu: gpu.status === 0 ? gpu.stdout.trim() : null,
  ollamaCommandAvailable: spawnSync(process.env.ComSpec || 'cmd.exe', ['/d','/s','/c','where ollama'],
    { encoding: 'utf8', timeout: 3000, windowsHide: true }).status === 0,
  defaultModelDirPresent: fs.existsSync(path.join(os.homedir(), '.ollama/models')) };
write('hardware.json', hardware);
async function localTags() {
  try {
    const response = await fetch('http://127.0.0.1:11434/api/tags', { signal: AbortSignal.timeout(2500), redirect: 'error' });
    if (!response.ok) return { reachable: true, status: response.status, modelCount: null };
    if (Number(response.headers.get('content-length')) > 65536) return { reachable: true, status: 200, modelCount: 'RESPONSE_TOO_LARGE' };
    const body = await response.json();
    return { reachable: true, status: 200, modelCount: Array.isArray(body.models) ? body.models.length : null,
      configuredModelPresent: Array.isArray(body.models) && Boolean(process.env.OLLAMA_MODEL) ? body.models.some(m => m.name === process.env.OLLAMA_MODEL) : false };
  } catch { return { reachable: false, status: null, modelCount: null, configuredModelPresent: false }; }
}
let sequelize, fingerprintTaken = false;
function fingerprint(mode, ...args) {
  const p = spawnSync(process.execPath, ['dist/evaluation/t11_db_fingerprint.js', mode, ...args],
    { cwd: path.join(root, 'backend'), env: { ...process.env, ALLOW_TEST_DB_WRITES: 'false' }, encoding: 'utf8' });
  fs.writeFileSync(path.join(out, `fingerprint-${mode}-${args.length === 2 ? 'compare' : path.basename(args[0])}.log`), (p.stdout || '') + (p.stderr || ''));
  assert.equal(p.status, 0, `Fingerprint ${mode} failed`);
}
async function databaseReadOnly() {
  ({ sequelize } = require('../dist/models/index.js'));
  const { ENV } = require('../dist/config/env.js');
  const { assertIsolatedTestDatabase, assertDatabaseSentinel } = require('../dist/utils/testDatabaseGuard.js');
  assert.equal(ENV.NODE_ENV, 'test'); assert.equal(ENV.DB_HOST, '127.0.0.1'); assert.equal(ENV.DB_NAME, 'travelgo_ai_m0_test');
  assertIsolatedTestDatabase('T-AI-03-B offline read-only');
  sequelize.addHook('afterConnect', async c => { await c.query('SET default_transaction_read_only = on'); await c.query("SET statement_timeout = '15000ms'"); });
  await assertDatabaseSentinel(sequelize, 'T-AI-03-B offline read-only');
  const [identity] = await sequelize.query("SELECT current_database() AS database, current_setting('default_transaction_read_only') AS read_only");
  assert.equal(identity[0].database, 'travelgo_ai_m0_test'); assert.equal(identity[0].read_only, 'on');
  const migrations = [];
  for (const filename of fs.readdirSync('../database/migrations').filter(f => f.endsWith('.sql')).sort()) {
    const checksum = createHash('sha256').update(fs.readFileSync(path.join('../database/migrations', filename))).digest('hex');
    const [rows] = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename', { replacements: { filename } });
    assert.equal(rows[0]?.checksum, checksum, filename); migrations.push({ filename, checksum });
  }
  assert.equal(migrations.length, 12);
  write('db-preflight.json', { ...identity[0], sentinel: 'PASS', migrations, writes: 0 });
  fingerprint('snapshot', path.join(out, 'before.json')); fingerprintTaken = true;
  write('ledger.json', { owner: 'T-AI-03-B-OFFLINE', writes: 0, fixtureIds: [], cleanup: 'NOT_REQUIRED_READ_ONLY', residual: 0 });
}
async function main() {
  write('ollama-local.json', await localTags());
  try { await databaseReadOnly(); }
  finally {
    if (sequelize) await sequelize.close();
    if (fingerprintTaken) { fingerprint('snapshot', path.join(out, 'after.json'));
      fingerprint('compare', path.join(out, 'before.json'), path.join(out, 'after.json')); }
  }
  const reasons = [];
  if (!config.providerConfigured) reasons.push('No configured live provider/model/approval gates');
  if (corruption.literalQuestionMarks) reasons.push('Frozen Vietnamese NLU manifest contains lossy literal question marks');
  const cases = manifest.cases.map(c => ({ id: c.id, tier: c.tier, status: 'NOT RUN',
    reason: c.tier === 'LIVE_LLM' ? reasons.join('; ') : 'MOCK_ONLY fault case excluded from LIVE NLU score; existing transport regression applies' }));
  write('nlu-results.json', { tier: 'LIVE_LLM', status: 'NOT RUN', manifestSha256: sha256,
    liveCases: 24, executedLiveCases: 0, browserExecutions: 0, metrics: 'NOT RUN', reasons, cases });
  console.log(JSON.stringify({ evidence: path.relative(root, out).replaceAll('\\', '/'), providerConfigured: config.providerConfigured,
    literalQuestionMarks: corruption.literalQuestionMarks, liveCasesRun: 0, dbReadOnly: true }));
}
main().catch(e => { write('failure.json', { status: 'FAIL', code: e.code || e.name || 'ERROR' });
  console.error('T-AI-03-B offline readiness failed; evidence preserved'); process.exitCode = 1; });
