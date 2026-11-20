const fs=require('fs'),crypto=require('crypto');const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const seed='Tôi đi Đà Lạt từ TP HCM, 2 người, ngân sách 5 triệu cả nhóm, ngày 25/11/2026 đến 27/11/2026, đi ô tô.';
const plan=seed+' Lập lịch trình giúp tôi.';
const catalog='Tìm homestay ở Đà Lạt dưới 800k có Wi-Fi.';
const cases=[
 ['D01','candidate',[catalog],['Lập lịch trình cho 2 người, ngân sách 6 triệu cả nhóm.'],{candidate:'Đà Lạt',budget:6000000,adults:2,noPlanner:true}],
 ['D02','candidate-confirm',[catalog,'Lập lịch trình cho 2 người, ngân sách 6 triệu cả nhóm.'],['Đúng rồi.'],{destination:'Đà Lạt',budget:6000000,adults:2,noPlanner:true}],
 ['D03','verified',[seed],['Lập lịch trình từ thông tin đã xác nhận.'],{itinerary:true,destination:'Đà Lạt',plannerDelta:1}],
 ['D04','competing',[],['Tìm homestay ở Đà Lạt hoặc Nha Trang.','Lập chuyến đi cho 2 người, ngân sách 6 triệu cả nhóm.'],{noDestination:true,clarify:true,noPlanner:true}],
 ['D05','hypothetical-candidate',[catalog,'Nếu đi Nha Trang thì sao?'],['Lập lịch trình cho 2 người, ngân sách 6 triệu cả nhóm.'],{candidate:'Đà Lạt',budget:6000000,noPlanner:true}],
 ['D06','negated-candidate',[catalog],['Không lập chuyến Đà Lạt, tôi chưa chọn điểm đến.'],{noDestination:true,clarify:true,noPlanner:true}],
 ['D07','complex',[],['Muốn đi Đà Lạt nghỉ ngơi, không thích lịch trình chạy nhiều, tìm homestay có Wi-Fi dưới 800k.'],{options:'hotel',type:'homestay',wifi:true,cap:800000,pace:'relaxed',qualityUnknown:true,noPlanner:true}],
 ['D08','bus',[seed],['Lập lịch trình nhưng đi xe khách.'],{unsupported:'xe khách',preserve:true,noPlanner:true}],
 ['D09','plane',[],[seed.replace('ô tô','máy bay')+' Lập lịch trình giúp tôi.'],{unsupported:'máy bay',budget:5000000,adults:2,start:'2026-11-25',noPlanner:true,noTransport:true}],
 ['D10','train',[],[seed.replace('ô tô','tàu hỏa')+' Lập lịch trình giúp tôi.'],{unsupported:'tàu hỏa',budget:5000000,adults:2,noPlanner:true,noTransport:true}],
 ['D11','negated-mode',[],[seed.replace('đi ô tô','không đi xe khách, đi ô tô')+' Lập lịch trình giúp tôi.'],{itinerary:true,transport:'car',plannerDelta:1}],
 ['D12','supported-after-bus',[seed.replace('ô tô','xe khách')+' Lập lịch trình giúp tôi.'],['Tôi chọn đi ô tô, lập lịch trình nhé.'],{itinerary:true,transport:'car',plannerDelta:1}],
 ['D13','unsupported-preserve-preview',[plan],['Đổi lịch sang đi máy bay.'],{unsupported:'máy bay',preserve:true,planPreserved:true,noPlanner:true}],
 ['D14','budget-whatif',[plan],['Nếu tăng ngân sách thêm 1 triệu thì sao?'],{hypothetical:true,preserve:true,planPreserved:true,budget:5000000,scenarioBudget:6000000,plannerDelta:1}],
 ['D15','destination-comparison',[seed],['Đà Lạt với Nha Trang thì đi đâu hợp ngân sách 6 triệu hơn?'],{comparison:true,preserve:true,noPlanner:true}],
 ['D16','no-results',[],['Tìm homestay ở Đà Lạt dưới 200k có Wi-Fi.'],{empty:true,wifi:true,cap:200000,type:'homestay',relaxation:true,noPlanner:true}],
 ['D17','decision',['Tìm khách sạn ở Đà Lạt.'],['So sánh hai lựa chọn đầu, ưu tiên yên tĩnh và giá tham khảo.'],{decision:true,qualityUnknown:true,noPlanner:true}],
 ['D18','overbudget',[plan.replace('5 triệu','1 triệu')],['Ngân sách không đủ thì khoản nào lớn nhất và nên giảm ở đâu?'],{budgetAdvice:true,preserve:true,noPlanner:true}],
 ['D19','historical-authority',[],['Giá xe shuttle sân bay Đà Lạt tháng 02/2026 là bao nhiêu?','Khoản đó tính cho một người hay cả nhóm?'],{historical:true,amount:150000,unit:'PER_PERSON',period:'02/2026',noPlanner:true}],
 ['D20','comparator',[],[],{comparator:true}],
 ['H01','candidate-rephrased',['Kiếm homestay tại Huế có Wi-Fi.'],['Lên kế hoạch cho 3 người với 7 triệu cho cả nhóm.'],{candidate:'Huế',budget:7000000,adults:3,noPlanner:true}],
 ['H02','bus-rephrased',[],[seed.replace('ô tô','xe buýt')+' Lên lịch trình nhé.'],{unsupported:'xe buýt',budget:5000000,noTransport:true,noPlanner:true}],
 ['H03','unknown-public',[seed],['Lên lịch bằng phương tiện công cộng.'],{unsupported:'phương tiện công cộng',preserve:true,noPlanner:true}],
 ['H04','budget-only',[],['Đi Đà Lạt 6 triệu cho 2 người có ổn không?'],{budgetOnly:true,noPlanner:true}],
 ['H05','duration-whatif',[plan],['Nếu đi 4 ngày thay vì 3 ngày thì sao?'],{hypothetical:true,preserve:true,planPreserved:true,plannerDelta:1,scenarioDays:4}],
 ['H06','local-edit-ambiguous',[plan],['Ngày 2 đi nhiều quá, bỏ bớt một chỗ nhưng giữ chỗ ăn.'],{clarify:true,planPreserved:true,preserve:true,noPlanner:true}],
 ['H07','review-uncertainty',['Tìm homestay ở Đà Lạt.'],['Chỗ đó có chắc yên tĩnh và sạch sẽ không?'],{qualityUnknown:true,noPlanner:true}],
 ['H08','expired-source',[],['Giá shuttle sân bay Đà Lạt tháng 02/2026 là bao nhiêu?'],{expired:true,observations:0,noPlanner:true}],
 ['H09','current-memory',['Tìm homestay ở Đà Lạt.'],['Không dùng sở thích cũ, lần này kiếm khách sạn có Wi-Fi tại Đà Lạt.'],{options:'hotel',type:'hotel',wifi:true,memoryOff:true,noPlanner:true}],
 ['H10','comparator-review',[],[],{comparatorHistorical:true}]
].map(([id,kind,setup,messages,expected])=>({id,kind,cohort:id[0]==='D'?'DEVELOPMENT':'HOLDOUT',setup,messages,expected}));
const lock={task:'21.36',at:new Date().toISOString(),productionEditsYet:false,holdoutPolicy:'Baseline counts only; holdout diagnostics opened only after final source freeze.',inputsExpectedImmutable:true,global:{model:0,postgres:0,mutations:0},cases,sources:JSON.parse(fs.readFileSync(__dirname+'/source-audit-before.json')).modules};fs.writeFileSync(__dirname+'/benchmark-lock.json',JSON.stringify(lock,null,2)+'\n',{flag:'wx'});fs.writeFileSync(__dirname+'/benchmark-lock.sha256',sha(fs.readFileSync(__dirname+'/benchmark-lock.json'))+'\n',{flag:'wx'});console.log(JSON.stringify({development:20,holdout:10,hash:sha(fs.readFileSync(__dirname+'/benchmark-lock.json'))}));
