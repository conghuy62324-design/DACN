const c=require('./common.cjs'),{randomUUID}=require('node:crypto');
const {LocalVerifiedHistoryStore}=require(c.path.join(c.root,'backend/dist/agent/verifiedHistory.js'));
const source=c.fs.readFileSync(c.path.join(__dirname,'prepare.cjs'),'utf8');
const fragment=source.slice(source.indexOf('const base='),source.indexOf('const lifecycle='));
const cases=new Function('randomUUID',fragment+'return cases;')(randomUUID);
const store=new LocalVerifiedHistoryStore();let meta;const rows=[];
for(const item of cases){const turn=store.begin(c.principal,{action:meta?'continue':'start',requestId:item.requestId,consentVersion:'LOCAL_DEMO_SLOTS_V1',...(meta?{id:meta.id,revision:meta.revision}:{})},item.message);meta=turn.metadata();const data=JSON.parse(turn.providerData());rows.push({id:item.id,message:item.message,missing:turn.missing,data,expectedValues:item.values,gate:item.expected?turn.check(item.expected):null});turn.finish();}
store.dispose();c.write('pre-lock-grammar-review.json',{at:new Date().toISOString(),stage:'OFFLINE_PRE_MANIFEST_NO_INFERENCE',originalPreparationFailure:'needs_input instead of completed; no manifest locked and zero native requests',rows});console.log(JSON.stringify(rows));
