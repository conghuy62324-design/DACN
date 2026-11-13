// Replay the exact pre-fix planner in a single process; never replace app source.
const fs = require('node:fs');
const crypto = require('node:crypto');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const archived = path.resolve('../docs/evidence/t11b/baseline-tourPlannerService.ts.txt');
const source = fs.readFileSync(archived);
const expected = JSON.parse(fs.readFileSync('../docs/evidence/t11b/before-v2/scenario_results_v2.json')).sourceSha256['src/services/tourPlannerService.ts'];
const sha256 = crypto.createHash('sha256').update(source).digest('hex');
if (sha256 !== expected) throw new Error('Baseline source fingerprint mismatch');
const filename = path.resolve('dist/services/tourPlannerService.js');
const loaded = new Module(filename, module);
loaded.filename = filename;
loaded.paths = Module._nodeModulePaths(path.dirname(filename));
require.cache[filename] = loaded;
loaded._compile(ts.transpileModule(source.toString('utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, filename);
process.env.T11B_EXECUTION_OVERRIDE = JSON.stringify({ source: archived, sha256, verifiedAgainst: 'before-v2/sourceSha256' });
require('../dist/evaluation/t11b_evaluate_v3.js');
