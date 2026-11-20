const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),root=path.resolve(__dirname,'../../../..'),sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const changed=['services/agentCoreService','agent/vietnameseConversation','agent/conversationSemantics','agent/travelConsultant','agent/advisoryReasoning','agent/costIntelligence','agent/geographicEvidence','utils/itineraryComparison','agent/planningIntelligence'];
const hashes={};for(const m of changed)for(const f of ['backend/src/'+m+'.ts','backend/dist/'+m+'.js'])hashes[f]=sha(fs.readFileSync(path.join(root,f)));for(const f of ['backend/scripts/agent-staging-profile.cjs','backend/scripts/model-off-isolation.cjs','docs/evidence/travelgo-ai-agent-core/knowledge-v64-resume-20261118/strict-recorder.cjs','docs/evidence/travelgo-ai-agent-core/consultant-v68-20261118/benchmark-lock.json'])hashes[f]=sha(fs.readFileSync(path.join(root,f)));
const portability=changed.map(m=>{const file='backend/src/'+m+'.ts',s=fs.readFileSync(path.join(root,file),'utf8');return{file,windowsPath:/(?:^|['"\s])[A-Z]:[\\/][A-Za-z]/i.test(s),dpapi:/DPAPI|CredentialManager/.test(s),machineDatabase:/15452|travelgo_staging_catalog_20261112/.test(s),browser:/msedge|chrome\.exe/.test(s),windowsTimezone:/Windows.*Time|SE Asia Standard Time/.test(s)};});assert(portability.every(p=>!p.windowsPath&&!p.dpapi&&!p.machineDatabase&&!p.browser&&!p.windowsTimezone));
const packet={task:'21.36',at:new Date().toISOString(),expiresAt:new Date(Date.now()+2*3600000).toISOString(),scope:'USER_REQUESTED_MODEL_OFF_READ_ONLY_BROWSER_ACCEPTANCE',principalId:'57e6e64a-9dac-43af-bcf0-5f2c992a423a',principalHash:'856f41c9ad2ffc1e3f467eeb45f0069a943196101062d0e3ab3927bec64b95c5',reserve:10,cap:20,loginMax:1,chatMax:9,entriesMax:10,postgresWrites:0,persistentFixtureWrites:0,model:0,hashes,comparator:'ITINERARY_BUSINESS_V1',journeys:[
 {id:'M',viewport:{width:390,height:844},capacityIncludingSharedLogin:6,cases:[
 {id:'M1',message:'Tìm homestay ở Đà Lạt dưới 800k có Wi-Fi.',expected:{type:'registered_options',category:'hotel',accommodationType:'homestay',wifi:true,cap:800000,noDestination:true}},
 {id:'M2',message:'Lập lịch trình cho 2 người, ngân sách 6 triệu cả nhóm; xuất phát từ TP HCM, ngày 25/11/2026 đến 27/11/2026, đi ô tô.',expected:{candidate:'Đà Lạt',noDestination:true,budget:6000000,adults:2}},
 {id:'M3',message:'Đúng rồi.',expected:{type:'itinerary',destination:'Đà Lạt',budget:6000000,adults:2,transport:'car',previewBaseline:true}},
 {id:'M4',message:'Tìm nhà hàng ở Đà Lạt.',expected:{type:'registered_options',category:'restaurant',keepProof:true}},
 {id:'M5',message:'Tiếp tục lập lịch trình đang làm.',expected:{type:'itinerary',keepProof:true,comparePreview:true}}
 ]},
 {id:'D',viewport:{width:1440,height:1000},capacityIncludingSharedLogin:5,cases:[
 {id:'D1',message:'Tôi đi Đà Lạt từ TP HCM, 2 người, ngân sách 6 triệu cả nhóm, ngày 25/11/2026 đến 27/11/2026, đi ô tô. Lập lịch trình nhẹ nhàng.',expected:{type:'itinerary',destination:'Đà Lạt',budget:6000000,adults:2,transport:'car',previewBaseline:true}},
 {id:'D2',message:'Khoản chi nào lớn nhất và ngân sách còn thừa hay thiếu bao nhiêu?',expected:{type:'itinerary',keepProof:true,budgetAdvice:true}},
 {id:'D3',message:'Nếu tăng ngân sách thêm 1 triệu thì sao?',expected:{type:'itinerary',keepProof:true,hypothetical:true,scenarioBudget:7000000,budget:6000000}},
 {id:'D4',message:'Tiếp tục lập lịch trình đang làm.',expected:{type:'itinerary',keepProof:true,comparePreview:true,budget:6000000}}
 ]}
 ]};
fs.writeFileSync(__dirname+'/actual-manifest-v2.json',JSON.stringify(packet,null,2)+'\n',{flag:'wx'});fs.writeFileSync(__dirname+'/portability-audit-v2.json',JSON.stringify({at:new Date().toISOString(),status:'PASS_STATIC_CHANGED_SOURCES_ONLY',linuxGpuActual:'NOT_RUN',portability},null,2),{flag:'wx'});console.log(JSON.stringify({locked:true,changedSources:changed.length,entriesMax:10,mobileMinimumQuota:16}));
