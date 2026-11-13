// Compile and exercise the helpers actually used inside the current TSX, without browser/DB mocks.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const source=fs.readFileSync(path.resolve(__dirname,'../../frontend/src/pages/partner/PartnerResourceFormPage.tsx'),'utf8');
const start=source.indexOf('const toLocalDateTime ='),end=source.indexOf('const normalizeForForm =');assert.ok(start>=0&&end>start);
const compiled=ts.transpileModule(source.slice(start,end)+'\nmodule.exports={toLocalDateTime,serializeDateTime};',{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
const sandbox={module:{exports:{}}};vm.runInNewContext(compiled,sandbox);const {toLocalDateTime,serializeDateTime}=sandbox.module.exports;
assert.equal(toLocalDateTime('2030-06-15T03:30:47.123Z'),'2030-06-15T10:30');
assert.equal(serializeDateTime('2030-06-15T10:30','2030-06-15T03:30:47.123Z'),'2030-06-15T03:30:47.123Z');
assert.equal(serializeDateTime('2030-06-16T00:15'),'2030-06-15T17:15:00.000Z');
assert.equal(toLocalDateTime(null),'');assert.equal(toLocalDateTime(undefined),'');assert.equal(serializeDateTime('',null),null);
console.log('PASS: actual inline TSX datetime helpers local display, explicit ISO edits, no-op precision, null/absent');
