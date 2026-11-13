// Pure offline before/after comparison. No provider/HTTP/DB/tool execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const root=path.resolve(__dirname,'../../..'),ts=require(path.join(root,'backend/node_modules/typescript'));
globalThis.fetch=async()=>{throw Error('LIVE_FORBIDDEN');};
const before=fs.readFileSync(path.join(__dirname,'toolProvenance.ts.before'),'utf8');
const compiled=ts.transpileModule(before,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const baseline=new Module(path.join(root,'backend/dist/agent/legacy-correction-observation.cjs'));
baseline.filename=path.join(root,'backend/dist/agent/legacy-correction-observation.cjs');baseline.paths=Module._nodeModulePaths(path.dirname(baseline.filename));baseline._compile(compiled,baseline.filename);
const current=require(path.join(root,'backend/dist/agent/toolProvenance.js')),completeness=require(path.join(root,'backend/dist/agent/currentCompleteness.js'));
const message='Lập lịch trình; Nơi xuất phát: Hà Nội; Điểm đến: Huế; Ngày bắt đầu: 2040-03-10; Ngày kết thúc: 2040-03-12; Số người lớn: 2; Ngân sách cả nhóm: 7000000 VND; Phương tiện: ô tô; à đổi sang xe máy';
const decision={kind:'tool',name:'plan_trip',arguments:{departureCity:'Hà Nội',destinationCity:'Huế',startDate:'2040-03-10',endDate:'2040-03-12',adults:2,totalBudget:7000000,transportation:'car'}};
const oldGate=baseline.exports.checkToolProvenance(decision,message),currentGate=current.checkToolProvenance(decision,message),assessment=completeness.assessCurrentCompleteness(message);
assert.deepEqual(oldGate,currentGate);assert.equal(oldGate.status,'ALLOW');assert.equal(assessment.status,'UNDETERMINED');
fs.writeFileSync(path.join(__dirname,'legacy-correction-observation.json'),JSON.stringify({status:'CONFIRMED_PREEXISTING',message,decision,oldGate,currentGate,assessment,
  observation:'Explicit old label masks later positive correction in legacy execution proof. New completeness refuses COMPLETE, but original gate intentionally unchanged. No actual tool executed.',severity:'P2 semantic/provenance limitation, OPEN; not introduced by server-first FIX',livePosts:0,toolCalls:0,databaseAccess:'NONE'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({before:oldGate,after:currentGate,assessment:assessment.status,existingObservation:'OPEN',livePosts:0,toolCalls:0}));
