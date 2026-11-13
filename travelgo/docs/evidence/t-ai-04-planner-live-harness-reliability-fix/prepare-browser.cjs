const c=require('./common.cjs');
const oracles=c.json(c.old+'direct-oracles.json').oracles;
const saved=c.json(c.old+'case-L01.json').api.body.data.result;
const id='7aa2de79-c113-4a50-b828-e5a18f15eb00';
const context={mode:'LOCAL_DEMO_VERIFIED_HISTORY',personalizationEnabled:false,behavioralDataUsed:false,persisted:false};
const metadata=revision=>({id,revision,expiresAt:'2026-11-11T04:15:00.000Z',mode:'LOCAL_DEMO',persisted:false});
const baseMessage=c.json(c.old+'case-L01.json').body.message+'; \u0110i\u1ec3m \u0111\u1ebfn: \u0110\u00e0 N\u1eb5ng';
const complete=(revision,result)=>({success:true,data:{status:'completed',reply:'MOCK_ONLY_BROWSER: saved public Planner response; no live execution.',result,history:[],historyTruncated:false,conversation:metadata(revision),context}});
const clarify=revision=>({success:true,data:{status:'needs_input',reply:'MOCK_ONLY_BROWSER confirmation',missingFields:['transportation'],history:[],historyTruncated:false,conversation:metadata(revision),context}});
const cases=[
  {id:'M-BASE',message:baseMessage,response:complete(1,saved),oracle:oracles['P-COMPLETE'].result,transport:'car'},
  {id:'M-ASK-BIKE',message:'MOCK_ONLY manual motorbike confirmation controls',response:clarify(2)},
  {id:'M-BIKE',confirmation:'Xe m\u00e1y',message:'Ph\u01b0\u01a1ng ti\u1ec7n: motorbike',response:complete(3,oracles['P-CONFIRM'].raw),oracle:oracles['P-CONFIRM'].result,transport:'motorbike'},
  {id:'M-ASK-CAR',message:'MOCK_ONLY manual car confirmation controls',response:clarify(4)},
  {id:'M-CAR',confirmation:'\u00d4 t\u00f4',message:'Ph\u01b0\u01a1ng ti\u1ec7n: car',response:complete(5,saved),oracle:oracles['P-COMPLETE'].result,transport:'car'},
];
c.write('mock-browser-manifest.json',{tier:'MOCK_ONLY_BROWSER',clock:'2026-11-11T04:00:00.000Z',origin:'http://127.0.0.1:3354',id,cases,historicalVerdictsUnchanged:true,network:'Every API response intercepted; Vite proxy dead 127.0.0.1:1',sourceCases:['L01 saved public JSON','P-CONFIRM saved direct public result; not historical L05 LIVE']});
const files=['mock-browser-manifest.json','public-json.cjs','ui-strings.json','browser-checks.cjs','fail-fast.cjs','run-live.corrected.cjs'];
c.write('offline-input-lock.json',{at:new Date().toISOString(),tier:'OFFLINE_ONLY_NOT_LIVE_APPROVAL',hashes:Object.fromEntries(files.map(f=>[f,c.sha(c.read(c.prefix+f))]))});
console.log(JSON.stringify({status:'LOCKED_MOCK_INPUTS',cases:cases.length,nativePosts:0,database:false}));
