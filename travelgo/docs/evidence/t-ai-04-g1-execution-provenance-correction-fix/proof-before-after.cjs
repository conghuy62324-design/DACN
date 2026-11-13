const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),Module=require('node:module');
const root=path.resolve(__dirname,'../../..'),ts=require(path.join(root,'backend/node_modules/typescript'));
globalThis.fetch=async()=>{throw Error('LIVE_FORBIDDEN');};
const before=fs.readFileSync(path.join(__dirname,'toolProvenance.ts.before'),'utf8');
const compiled=ts.transpileModule(before,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const baseline=new Module(path.join(root,'backend/dist/agent/baseline-correction-proof.cjs'));baseline.filename=path.join(root,'backend/dist/agent/baseline-correction-proof.cjs');baseline.paths=Module._nodeModulePaths(path.dirname(baseline.filename));baseline._compile(compiled,baseline.filename);
const current=require(path.join(root,'backend/dist/agent/toolProvenance.js')),assessor=require(path.join(root,'backend/dist/agent/currentCompleteness.js'));
const base='Lập lịch trình; Nơi xuất phát: Hà Nội; Điểm đến: Đà Lạt; Ngày bắt đầu: 2042-04-10; Ngày kết thúc: 2042-04-12; Số người lớn: 2; Ngân sách cả nhóm: 7000000 VND; ';
const raw={kind:'tool',name:'plan_trip',arguments:{departureCity:'Hà Nội',destinationCity:'Đà Lạt',startDate:'2042-04-10',endDate:'2042-04-12',adults:2,totalBudget:7000000,transportation:'car'}};
const rows=[['OBS-COMP-01','Phương tiện: ô tô; à đổi sang xe máy','car'],['OBS-NEW-VALUE-UNPROVEN','Phương tiện: ô tô; à đổi sang xe máy','motorbike'],
 ['SUPPORTED-NEW','Tôi muốn đi bằng ô tô, à đổi sang xe máy','motorbike'],['SUPPORTED-OLD','Tôi muốn đi bằng ô tô, à đổi sang xe máy','car'],
 ['NOT-LAST-CORRECTION','Tôi muốn đi bằng ô tô, à đổi sang xe máy; Tôi chọn ô tô','car'],['UNCERTAIN-NEW-LABEL','Phương tiện: ô tô; Phương tiện: xe máy?','car']]
 .map(([id,transportation,modelValue])=>{const message=base+transportation,decision={...raw,arguments:{...raw.arguments,transportation:modelValue}},snapshot=JSON.stringify(decision);
  const old=baseline.exports.checkToolProvenance(decision,message),actual=current.checkToolProvenance(decision,message);assert.equal(JSON.stringify(decision),snapshot);
  return{id,message,rawDecision:decision,before:old,after:actual,assessment:assessor.assessCurrentCompleteness(message),rawDecisionUnchanged:true};});
assert.equal(rows[0].before.status,'ALLOW');assert.notEqual(rows[0].after.status,'ALLOW');assert.equal(rows[2].after.status,'ALLOW');assert.notEqual(rows[3].after.status,'ALLOW');
fs.writeFileSync(path.join(__dirname,'proof-before-after.json'),JSON.stringify({at:new Date().toISOString(),tier:'MOCK_ONLY_PURE_FUNCTION',rows,livePosts:0,toolCalls:0,databaseAccess:'NONE',obsStatus:'OFFLINE_RESOLVED_LIVE_NOT_RUN'},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(rows.map(x=>({id:x.id,before:x.before.status,after:x.after.status,assessment:x.assessment.status}))));
