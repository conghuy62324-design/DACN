// Capture exact commands, exits and full output without overwriting evidence.
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(process.argv[2]);
const backend = process.cwd();
const frontend = path.resolve('../frontend');
const checks = [
  ['backend-build', backend, 'npm.cmd', ['run', 'build']],
  ...['plannerFeasibility', 'plannerValidationCosts', 'plannerModes', 'tourPlannerMandatory', 'tripSnapshot', 'tripLifecycle', 'recommendationCorrectness', 'recommendationRepositoryPagination', 'algorithm'].map(name => [name, backend, process.execPath, [`dist/tests/${name}.test.js`]]),
  ['frontend-build', frontend, 'npm.cmd', ['run', 'build']],
  ...['planner-costs', 'planner-modes', 'trip-costs'].map(name => [name, frontend, 'npm.cmd', [`run`, `test:${name}`]]),
];
fs.mkdirSync(output, { recursive: true });
const results = [];
for (const [name, cwd, command, args] of checks) {
  const r = spawnSync(command, args, { cwd, encoding: 'utf8', shell: command.endsWith('.cmd'), timeout: 120000 });
  const row = { name, cwd, command, args, exitCode: r.status, error: r.error?.message, stdout: r.stdout, stderr: r.stderr };
  fs.writeFileSync(path.join(output, `${name}.json`), JSON.stringify(row, null, 2) + '\n', { flag: 'wx' });
  results.push({ name, exitCode: r.status, error: r.error?.message });
  console.log(JSON.stringify(results.at(-1)));
}
fs.writeFileSync(path.join(output, 'summary.json'), JSON.stringify(results, null, 2) + '\n', { flag: 'wx' });
if (results.some(r => r.exitCode !== 0)) process.exitCode = 1;
