// Task-local adaptation; prior harness and business assertions remain preserved.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const base = 'docs/evidence/t-ai-04-g1-slot-filling-live-revalidation/run-live.cjs';
const old = fs.readFileSync(path.join(root, base), 'utf8');
let source = old.replaceAll('t-ai-04-g1-slot-filling-live-revalidation', 't-ai-04-g1-missing-slot-live-check');
const replace = (from, to) => { assert.ok(source.includes(from), 'Missing harness anchor: ' + from); source = source.replace(from, to); };
replace("['S01', 'S02', 'S03', 'S04', 'S05', 'S06']", "['M01', 'M02', 'M03', 'M04', 'M05', 'M06']");
replace("const { checkToolProvenance } = require(path.join(root, 'backend/dist/agent/toolProvenance.js'));", `const { checkToolProvenance } = require(path.join(root, 'backend/dist/agent/toolProvenance.js'));
const { MissingReadSlotsRejection, recoverMissingReadSlots } = require(path.join(root, 'backend/dist/agent/missingSlotRecovery.js'));
const Ajv = require(path.join(root, 'backend/node_modules/ajv'));
const addFormats = require(path.join(root, 'backend/node_modules/ajv-formats'));
const diagnosticAjv = new Ajv({ allErrors: true, strict: true }); addFormats(diagnosticAjv, ['date', 'uuid']);
const diagnosticTools = new Map(AGENT_TOOLS.map(spec => [spec.name, diagnosticAjv.compile(spec.parameters)]));
const sameFields = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());`);
replace('let envelope = null, httpStatus = null, requestBodySha256 = null, providerDecision = null;',
  'let envelope = null, httpStatus = null, requestBodySha256 = null, providerDecision = null, providerException = null, originalProviderError = null;');
replace(`      providerDecision = await real.generate(input, signal);
      return providerDecision;`, `      try {
        providerDecision = await real.generate(input, signal);
        return providerDecision;
      } catch (e) {
        originalProviderError = e;
        providerException = { capturedAt: new Date().toISOString(), beforeServiceRecovery: true,
          type: e.constructor?.name || 'Unknown', name: e.name || null, code: e.code || null, statusCode: e.statusCode || null,
          message: String(e.message || e), typedMissingSlots: e instanceof MissingReadSlotsRejection,
          toolName: e instanceof MissingReadSlotsRejection ? e.toolName : null,
          fields: e instanceof MissingReadSlotsRejection ? [...e.fields] : [] };
        writeNew(item.id + '-provider-exception.json', providerException);
        throw e;
      }`);
replace('    const semanticValid = runtimeValid && compareDecision(parsed, item.expected);', `    let missingRequiredOnly = false, requiredMissing = [], diagnosticSchemaErrors = [];
    try {
      const diagnostic = parseDecision(parsed);
      if (diagnostic.kind === 'tool') {
        const validate = diagnosticTools.get(diagnostic.name);
        const validArguments = validate(diagnostic.arguments);
        diagnosticSchemaErrors = (validate.errors || []).map(e => ({ keyword: e.keyword, instancePath: e.instancePath, params: e.params }));
        requiredMissing = validateTool(diagnostic).missing;
        missingRequiredOnly = !validArguments && diagnosticSchemaErrors.length > 0 && diagnosticSchemaErrors.every(e => e.keyword === 'required');
      }
    } catch { /* Diagnostic only; original provider rejection remains unchanged. */ }
    const recoveryFields = originalProviderError ? recoverMissingReadSlots(originalProviderError, item.request.message) : null;
    const recoveryEligible = !!recoveryFields;
    const recoveryApplied = recoveryEligible && !error && serviceResponse?.status === 'needs_input' && sameFields(serviceResponse?.missingFields || [], recoveryFields);
    const recoveryUx = recoveryEligible ? (recoveryApplied && executed.length === 0 ? 'PASS' : 'FAIL') : 'NOT_APPLICABLE';
    const validation = raw === null ? 'NOT RUN' : (runtimeValid
      ? (providerDecision !== null && providerException === null ? 'PASS' : 'FAIL')
      : (providerDecision === null && providerException?.code === 'AGENT_INVALID_PROVIDER_OUTPUT' && executed.length === 0 ? 'PASS' : 'FAIL'));
    const ux = !error && serviceResponse?.status === item.expectedServiceStatus &&
      sameFields(serviceResponse?.missingFields || [], item.expectedMissingFields) && executed.length === item.expectedFakeToolCalls ? 'PASS' : 'FAIL';
    const semanticValid = runtimeValid && compareDecision(parsed, item.expected);`);
replace('const record = { id: item.id, request: item.request, expected: item.expected, nlu, safety,',
  `const record = { id: item.id, request: item.request, expected: item.expected, nlu, validation, ux, safety,
      providerException, missingRequiredOnly, requiredMissing, diagnosticSchemaErrors,
      recoveryEligible, recoveryApplied, recoveryFields, recoveryUx, apiHttpStatus: 'NOT RUN_DIRECT_ORCHESTRATOR',`);
replace('results.push({ id: item.id, nlu, safety, httpStatus, decisionKind: parsed?.kind || null,',
  'results.push({ id: item.id, nlu, validation, ux, safety, schemaAccepted: schemaValid, recoveryEligible, recoveryApplied, recoveryUx, httpStatus, decisionKind: parsed?.kind || null,');
replace("console.log(`${item.id} NLU=${nlu} SAFETY=${safety} DECISION=${parsed?.kind || 'none'} TOOLS=${executed.length}`);",
  "console.log(`${item.id} NLU=${nlu} VALIDATION=${validation} UX=${ux} SAFETY=${safety} RECOVERY=${recoveryApplied} TOOLS=${executed.length}`);");
replace('    safety: { pass: results.filter', `    validation: { pass: results.filter(x => x.validation === 'PASS').length, fail: results.filter(x => x.validation === 'FAIL').length, notRun: results.filter(x => x.validation === 'NOT RUN' || x.nlu === 'NOT RUN').length },
    ux: { pass: results.filter(x => x.ux === 'PASS').length, fail: results.filter(x => x.ux === 'FAIL').length, notRun: results.filter(x => x.nlu === 'NOT RUN').length },
    recovery: { eligible: results.filter(x => x.recoveryEligible).length, applied: results.filter(x => x.recoveryApplied).length,
      uxPass: results.filter(x => x.recoveryUx === 'PASS').length, uxFail: results.filter(x => x.recoveryUx === 'FAIL').length },
    safety: { pass: results.filter`);
replace('console.log(JSON.stringify({ posts, nlu: summary.nlu, safety: summary.safety }));',
  'console.log(JSON.stringify({ posts, nlu: summary.nlu, validation: summary.validation, ux: summary.ux, recovery: summary.recovery, safety: summary.safety }));');
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
fs.writeFileSync(path.join(__dirname, 'run-live.cjs'), source, { flag: 'wx' });
let regression = fs.readFileSync(path.join(root, 'docs/evidence/t-ai-04-g1-missing-slot-decision-fix/run-regression.cjs'), 'utf8');
regression = regression.replace("const output = process.argv[2] === '--final' ? path.join(__dirname, 'final') : __dirname;\nif (output !== __dirname) fs.mkdirSync(output);", 'const output = __dirname;');
fs.writeFileSync(path.join(__dirname, 'run-regression.cjs'), regression, { flag: 'wx' });
fs.writeFileSync(path.join(__dirname, 'harness-compatibility.json'), JSON.stringify({ base, baseSha256: sha(old), newSha256: sha(source),
  changes: ['New task paths/locked M case IDs', 'Capture original provider exception before service recovery',
    'Separate raw NLU/schema validation/UX/typed recovery/safety axes', 'Diagnostic missing-required-only check using original tool parameter schemas'],
  unchanged: ['Actual production provider/orchestrator', 'Raw NLU semantic assertions', 'Fake-only tool/consent', 'Limits/no retries/body hash guards/15s deadline'],
  inferencePosts: 0 }, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ harnessSha256: sha(source), inferencePosts: 0 }));
