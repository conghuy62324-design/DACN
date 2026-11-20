const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),root=path.resolve(__dirname,'../../../..'),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const changed=['services/agentCoreService','agent/conversationSemantics','agent/geographicEvidence','agent/travelConsultant','agent/vietnameseConversation','agent/costIntelligence'];
const hashes={};for(const p of changed)for(const f of ['backend/src/'+p+'.ts','backend/dist/'+p+'.js'])hashes[f]=sha(fs.readFileSync(path.join(root,f)));for(const f of ['backend/scripts/agent-staging-profile.cjs','backend/scripts/model-off-isolation.cjs','docs/evidence/travelgo-ai-agent-core/knowledge-v64-resume-20261118/strict-recorder.cjs','docs/evidence/travelgo-ai-agent-core/adaptive-v67-20261118/benchmark-lock.json'])hashes[f]=sha(fs.readFileSync(path.join(root,f)));
const portability=changed.map(p=>{const f='backend/src/'+p+'.ts',s=fs.readFileSync(path.join(root,f),'utf8');return{file:f,windowsAbsolutePath:/(?:^|['"\s])[A-Z]:[\\/][A-Za-z]/i.test(s),dpapi:/DPAPI|CredentialManager/i.test(s),stagingDatabase:/15452|travelgo_staging_catalog_20261112/.test(s),hardCodedBrowser:/msedge|chrome\.exe/i.test(s),windowsTimezone:/Windows.*Time|SE Asia Standard Time/.test(s)};});assert(portability.every(p=>!p.windowsAbsolutePath&&!p.dpapi&&!p.stagingDatabase&&!p.hardCodedBrowser&&!p.windowsTimezone));
const packet={task:'21.35',at:new Date().toISOString(),expiresAt:new Date(Date.now()+2*3600000).toISOString(),scope:'USER_AUTHORIZED_READ_ONLY_MODEL_OFF_BROWSER_ACCEPTANCE',principalId:'57e6e64a-9dac-43af-bcf0-5f2c992a423a',principalHash:'856f41c9ad2ffc1e3f467eeb45f0069a943196101062d0e3ab3927bec64b95c5',cap:20,reserve:10,allEntriesMax:10,loginMax:1,chatMax:9,postgresWrites:0,persistentLearningWrites:0,modelNativePosts:0,api:5057,frontend:5177,hashes,journeys:[
 {id:'A',viewport:{width:1440,height:1000},entriesIncludingSharedLogin:5,cases:[
 {id:'A1',message:'Tìm homestay ở Đà Lạt cho 2 người, ngân sách 5 triệu cả nhóm, cần Wi-Fi, ưu tiên sạch sẽ và yên tĩnh.',expected:{type:'registered_options',kind:'hotel',accommodationType:'homestay',wifi:true,adults:2,budget:5000000,qualityUnknown:true}},
 {id:'A2',message:'Tìm chỗ rẻ hơn homestay thứ nhất, vẫn giữ Wi-Fi.',expected:{cheaper:true,keepProof:true,wifi:true,noInventedAlternatives:true}},
 {id:'A3',message:'Ý tôi là 6 triệu cho cả hai người, không phải mỗi người.',expected:{budget:6000000,adults:2}},
 {id:'A4',message:'Đừng dùng sở thích cũ, lần này tìm khách sạn ở Đà Lạt có Wi-Fi.',expected:{type:'registered_options',kind:'hotel',accommodationType:'hotel',wifi:true,budget:6000000,adults:2,memoryOff:true}}
 ]},
 {id:'B',viewport:{width:390,height:844},entriesIncludingSharedLogin:6,cases:[
 {id:'B1',message:'Giá xe shuttle sân bay Đà Lạt tháng 02/2026 là bao nhiêu?',expected:{historical:true,amount:150000,unit:'PER_PERSON',period:'02/2026',version:2,noPlanner:true}},
 {id:'B2',message:'Tìm homestay ở Đà Lạt; tôi đi Đà Lạt từ TP HCM, 2 người, ngân sách 5 triệu cả nhóm, ngày 25/11/2026 đến 27/11/2026, đi ô tô.',expected:{type:'registered_options',kind:'hotel',accommodationType:'homestay',adults:2,budget:5000000,startDate:'2026-11-25',endDate:'2026-11-27',transportation:'car'}},
 {id:'B3',message:'Lập lịch trình từ thông tin đã xác nhận.',expected:{type:'itinerary',adults:2,budget:5000000,previewOnly:true}},
 {id:'B4',message:'Tìm nhà hàng ở Đà Lạt.',expected:{type:'registered_options',kind:'restaurant',keepProof:true}},
 {id:'B5',message:'Tiếp tục lập lịch trình đang làm.',expected:{type:'itinerary',samePreview:true,keepProof:true,previewOnly:true}}
 ]}
 ]};
for(const [f,o]of [['actual-manifest.json',packet],['portability-audit.json',{at:new Date().toISOString(),scope:'CHANGED_PRODUCTION_SOURCES_ONLY_NOT_LINUX_RUNTIME_ACCEPTANCE',results:portability,status:'PASS'}]])fs.writeFileSync(path.join(__dirname,f),JSON.stringify(o,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({manifest:'LOCKED',maxEntries:10,sourceFiles:Object.keys(hashes).length,portability:'PASS'}));
