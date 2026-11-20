const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../../../..'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const seed='Tôi đi Đà Lạt từ TP HCM, 2 người, ngân sách 5 triệu cả nhóm, ngày 25/11/2026 đến 27/11/2026, đi xe khách.';
const hotel='Tìm homestay ở Đà Lạt có Wi-Fi, ưu tiên sạch sẽ và yên tĩnh.';
const plan=seed+' Lập lịch trình giúp tôi.';
const cases=[
 ['D01','slang',[],['Tui muốn đi đâu đó mát mát, ít đông, đi hai đứa, cỡ 5 củ.'],{clarify:true,budget:5000000,noPlanner:true}],
 ['D02','typo',[],['Tìm homestay tại Đà Lạc cho 2 người.'],{locationClarification:true,noPlanner:true}],
 ['D03','multi-goal',[],['Tìm homestay và nhà hàng ở Đà Lạt, chỗ ở cần Wi-Fi.'],{category:'hotel',deferred:'restaurant',amenity:'Wi-Fi'}],
 ['D04','negative-amenity',[],['Tìm khách sạn ở Đà Lạt không cần hồ bơi nhưng cần Wi-Fi.'],{category:'hotel',amenity:'Wi-Fi',notAmenity:'Hồ bơi'}],
 ['D05','hypothetical',[seed],['Nếu đi Nha Trang thay Đà Lạt thì sao?'],{preserve:true,clarify:true,noPlanner:true}],
 ['D06','ambiguous-change',[seed],['Tăng tiền lên chút với đổi xe cho thoải mái hơn nhé, chưa biết chọn loại nào.'],{preserve:true,clarify:true,noPlanner:true}],
 ['D07','group-correction',[seed],['Ý tôi là 6 triệu cho cả hai người, không phải mỗi người.'],{budget:6000000,adults:2,destination:'Đà Lạt',noPlanner:true}],
 ['D08','role-correction',[seed],['Ý tôi không phải đi từ Hà Nội mà là đi tới Hà Nội.'],{destination:'Hà Nội',departure:'Hồ Chí Minh',noPlanner:true}],
 ['D09','optout-composition',[hotel],['Đừng dùng sở thích cũ nữa, lần này tìm khách sạn ở Đà Lạt có Wi-Fi.'],{category:'hotel',accommodationType:'hotel',memoryOff:true,amenity:'Wi-Fi'}],
 ['D10','habit-composition',[],['Tôi thường thích yên tĩnh, giờ tìm homestay ở Đà Lạt có Wi-Fi.'],{category:'hotel',amenity:'Wi-Fi',noMemoryMutation:true}],
 ['D11','unspecified-correction',[seed],['Bạn hiểu sai rồi, không phải ý đó.'],{preserve:true,clarify:true,noPlanner:true,proposalCleared:true}],
 ['D12','cheaper',[hotel,'Xem homestay thứ 2.'],['Tìm chỗ rẻ hơn nhưng vẫn giữ Wi-Fi.'],{category:'hotel',maxPrice:499999,amenity:'Wi-Fi',notId:2}],
 ['D13','quality-feedback',[hotel],['Muốn yên tĩnh hơn nhưng đừng tăng giá.'],{qualityUnknown:true,noPlanner:true}],
 ['D14','distance-feedback',[hotel],['Hơi xa trung tâm, tìm gần trung tâm hơn.'],{clarify:true,landmark:true,noPlanner:true}],
 ['D15','session-learning',[],['Tìm zelvoro ở Đà Lạt.','Ý tôi là homestay.','Kiếm zelvoro có Wi-Fi tại Đà Lạt.'],{category:'hotel',accommodationType:'homestay',amenity:'Wi-Fi',sessionMapping:true}],
 ['D16','user-price',[seed],['Giá xe shuttle sân bay Đà Lạt tôi nghe là 200k/người, đúng không?'],{preserve:true,notVerifiedAmount:200000,historical:true,noPlanner:true}],
 ['D17','expiry',[],['Giá xe shuttle sân bay Đà Lạt tháng 02/2026 là bao nhiêu?'],{fixture:'expired',observations:0,noPlanner:true}],
 ['D18','knowledge-followup',[],['Giá xe shuttle sân bay Đà Lạt tháng 02/2026 là bao nhiêu?','Khoản đó tính cho một người hay cả nhóm?'],{amount:150000,unit:'PER_PERSON',period:'02/2026',noPlanner:true}],
 ['H01','optout-reordered',[hotel],['Lần này kiếm khách sạn có Wi-Fi tại Đà Lạt; không dùng sở thích cũ.'],{category:'hotel',accommodationType:'hotel',memoryOff:true,amenity:'Wi-Fi'}],
 ['H02','habit-reordered',[],['Kiếm homestay Đà Lạt có Wi-Fi nhé, mình thường ưu tiên sạch sẽ.'],{category:'hotel',amenity:'Wi-Fi',noMemoryMutation:true}],
 ['H03','planner-resume',[plan,'Giá xe shuttle sân bay Đà Lạt tháng 02/2026?','Tìm homestay ở Đà Lạt.'],['Tiếp tục lập lịch trình đang làm.'],{itinerary:true,samePlan:true,onePlanner:true,destination:'Đà Lạt'}],
 ['H04','plan-hypothetical',[plan],['Giả sử chuyển qua Nha Trang thì chi phí thế nào?'],{preserve:true,planPreserved:true,noExtraPlanner:true}],
 ['H05','negative-destination',[seed],['Chưa đổi sang Nha Trang, tôi chỉ đang cân nhắc.'],{preserve:true,clarify:true,noPlanner:true}],
 ['H06','current-quality',[hotel],['Không cần rẻ nhất, lần này ưu tiên sạch sẽ và yên tĩnh.'],{qualityUnknown:true,noPlanner:true,qualityCurrent:true,memoryFixture:true}],
 ['H07','no-autosave',[plan],['Lưu chuyến đi này giúp tôi.'],{noAutoMutation:true,confirmationRequired:true}],
 ['H08','greeting',[],['Chào bạn, cảm ơn nha!'],{simple:true,noServices:true,noPlanner:true}],
 ['H09','ambiguous-reference',[hotel,'Tìm nhà hàng ở Đà Lạt.'],['Cho xem cái thứ hai.'],{clarify:true,noPlanner:true}],
 ['H10','unknown-money',[seed],['Ý tôi là ngân sách 7 lốp cho cả nhóm.'],{preserve:true,clarify:true,noPlanner:true}],
].map(([id,kind,setup,messages,expected])=>({id,cohort:id[0]==='D'?'DEVELOPMENT':'HOLDOUT',kind,setup,messages,expected}));
const modules=['services/agentCoreService','agent/vietnameseNormalizer','agent/vietnameseConversation','agent/conversationSemantics','agent/adaptiveLanguage','agent/travelConsultant','agent/advisoryReasoning','agent/decisionIntelligence','agent/naturalGrounding','agent/personalizedGrounding','agent/customerPersonalization','services/customerMemoryService','services/reviewInsightService','services/travelKnowledgeService','agent/costIntelligence'];
const sources=Object.fromEntries(modules.map(m=>{const p='backend/src/'+m+'.ts';return[p,sha(fs.readFileSync(path.join(root,p)))];}));
const lock={task:'21.35',at:new Date().toISOString(),tier:'OFFLINE_SYNTHETIC_ONLY',expectedLockedBeforeProductEdits:true,holdoutIndependent:'Different phrasing and compositions, frozen with development cases; not a statistical generalization.',global:{noModel:true,noMutation:true,noBookingAuthorityFromCatalog:true,noRawPrivateData:true},cases,sources};
fs.writeFileSync(path.join(__dirname,'benchmark-lock.json'),JSON.stringify(lock,null,2)+'\n',{flag:'wx'});
fs.mkdirSync(path.join(__dirname,'baseline-modules'),{recursive:true});for(const m of modules){const dest=path.join(__dirname,'baseline-modules',m+'.js');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,'backend/dist',m+'.js'),dest,fs.constants.COPYFILE_EXCL);}
fs.writeFileSync(path.join(__dirname,'benchmark-lock.sha256'),sha(fs.readFileSync(path.join(__dirname,'benchmark-lock.json')))+'\n',{flag:'wx'});
console.log(JSON.stringify({cases:cases.length,development:18,holdout:10,hash:sha(fs.readFileSync(path.join(__dirname,'benchmark-lock.json')))}));
