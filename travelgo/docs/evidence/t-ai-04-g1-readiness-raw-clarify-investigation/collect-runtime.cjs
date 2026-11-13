// READ ONLY. GET readiness APIs, process/GPU metadata and bounded sanitized logs.
// No POST, model load command, service restart, config change or database access.
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const write = (name, data) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const logRoot = path.join(process.env.LOCALAPPDATA, 'Ollama');
const privateLine = /server config|env=|api[_-]?key|password|secret|authorization|token=|messages=|prompt=|"content"|request body/iu;
const logFiles = fs.readdirSync(logRoot).filter(name => /^server.*\.log$|^app(?:-\d+)?\.log$/u.test(name));
const logs = logFiles.map(name => {
  const full = path.join(logRoot, name), bytes = fs.readFileSync(full), stat = fs.statSync(full);
  const lines = bytes.toString('utf8').split(/\r?\n/u), timestamps = [], windowLines = [], startupLines = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const iso = line.match(/time=(\d{4}-\d\d-\d\dT[\d:.]+(?:[+-]\d\d:\d\d|Z))/u)?.[1];
    const gin = line.match(/\[GIN\]\s+(\d{4}\/\d\d\/\d\d) - (\d\d:\d\d:\d\d)/u);
    const at = iso || (gin ? gin[1].replaceAll('/', '-') + 'T' + gin[2] + '+07:00' : null);
    if (at) timestamps.push(at);
    if (privateLine.test(line)) continue;
    const safe = line.replaceAll(process.env.USERPROFILE || 'NO_PROFILE', '<USERPROFILE>').slice(0, 1000);
    if (at && Date.parse(at) >= Date.parse('2026-11-10T12:33:30+07:00') && Date.parse(at) <= Date.parse('2026-11-10T12:35:10+07:00'))
      windowLines.push({ line: i + 1, at, text: safe });
    if (/starting Ollama|starting ollama server|Listening on|inference compute|vram-based default context/u.test(line))
      startupLines.push({ line: i + 1, at, text: safe });
  }
  return { name, sourcePath: full, bytes: bytes.length, sha256AtRead: sha(bytes), lastWriteTime: stat.mtime.toISOString(),
    timestampRange: timestamps.length ? { first: timestamps[0], last: timestamps.at(-1) } : null,
    matchingMRunWindowRows: windowLines, sanitizedStartupRows: startupLines.slice(-8), omittedSensitiveConfigLines: lines.filter(line => privateLine.test(line)).length };
});
const captureCommand = (file, args) => {
  try { return { status: 'READ_OK', stdout: execFileSync(file, args, { encoding: 'utf8', timeout: 10000 }).trim() }; }
  catch (error) { return { status: 'UNAVAILABLE', reason: String(error.message || error).slice(0, 600) }; }
};
const processInfo = captureCommand('powershell.exe', ['-NoProfile', '-Command',
  "Get-Process -Name 'ollama*' -ErrorAction Stop | Select-Object Id,ProcessName,@{Name='StartTimeLocal';Expression={$_.StartTime.ToString('o')}},WorkingSet64 | ConvertTo-Json -Compress"]);
const netstat = captureCommand('netstat.exe', ['-ano', '-p', 'tcp']);
if (netstat.stdout) netstat.stdout = netstat.stdout.split(/\r?\n/u).filter(line => /127\.0\.0\.1:11434\s/u.test(line)).join('\n');
const gpu = captureCommand('nvidia-smi', ['--query-gpu=name,driver_version,memory.total,memory.free,memory.used,utilization.gpu', '--format=csv,noheader,nounits']);
const record = { checkedAt: new Date().toISOString(), ramMiB: { total: Math.round(os.totalmem()/1048576), free: Math.round(os.freemem()/1048576) },
  processInfo, listener11434: netstat, gpu, logs, http: {}, inferencePosts: 0, databaseAccess: 'NONE',
  limitations: ['Read-only sample after M run, not a continuous profiler', 'Windows log files may not contain current server stdout/stderr; no M-window rows does not prove no server work',
    'Get-NetTCPConnection/CIM returned no usable process details; native netstat and Get-Process used instead', 'Docker status unavailable; listener is identified as native Windows ollama PID 20468'] };
(async () => {
  for (const endpoint of ['/api/version', '/api/tags', '/api/ps']) {
    try {
      const response = await fetch('http://127.0.0.1:11434' + endpoint, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(5000) });
      record.http[endpoint] = { at: new Date().toISOString(), status: response.status, body: await response.json() };
    } catch (error) { record.http[endpoint] = { error: String(error.message || error) }; }
  }
  write('runtime-readonly.json', record);
  console.log(JSON.stringify({ processInfo, listener11434: record.listener11434, gpu, ramMiB: record.ramMiB,
    logMetadata: logs.map(x => ({ name: x.name, bytes: x.bytes, range: x.timestampRange, matchingMRunWindowRows: x.matchingMRunWindowRows.length })),
    version: record.http['/api/version'], residentModels: record.http['/api/ps'], inferencePosts: 0 }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
