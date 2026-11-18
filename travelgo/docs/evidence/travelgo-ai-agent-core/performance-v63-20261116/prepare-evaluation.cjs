const fs=require('fs'),crypto=require('crypto');
const seed='Đi Đà Lạt từ SG,2 người,ngân sách cả nhóm5tr bằng xe máy';
const full='Lập lịch trình từ SG đến Đà Lạt,3n2đ,2 người,ngân sách cả nhóm5tr,đi10/12/2027-12/12/2027 bằng xe máy';
const scenarios=[
 ['P01','greeting',[],'Xin chào',{noTool:true,noPlanner:true}],
 ['P02','thanks',[],'Cảm ơn bạn',{noTool:true,noPlanner:true}],
 ['P03','verified-context',[seed],'Ngân sách cả nhóm hiện tại của tôi là bao nhiêu?',{noPlanner:true,preserve:true}],
 ['P04','hotel-search',[],'Tìm khách sạn ở Đà Lạt',{tool:'search_registered_hotels',noPlanner:true}],
 ['P05','review-advice',['Tìm khách sạn ở Đà Lạt'],'So sánh khách sạn thứ1 và thứ2, ưu tiên yên tĩnh',{noPlanner:true}],
 ['P06','historical-cost',[],'Giá xe đưa đón sân bay Đà Lạt bao nhiêu?',{noPlanner:true}],
 ['P07','compound',[],'Tìm khách sạn dưới800k và nhà hàng dưới200k ở Đà Lạt, tổng chuyến không vượt6tr',{tool:'search_registered_hotels',budget:6000000,noPlanner:true}],
 ['P08','qualified-reference',['Tìm khách sạn ở Đà Lạt','Tìm nhà hàng ở Đà Lạt'],'Khách sạn thứ2',{noPlanner:true,listingCategory:'hotel'}],
 ['P09','learned-reuse',[],'Tìm vulapa có Wi-Fi ở Đà Lạt',{tool:'search_registered_hotels',type:'homestay',noPlanner:true}],
 ['P10','listing-price-correction',[seed,'Tìm khách sạn ở Đà Lạt'],'550k là tiền phòng, không phải tổng chuyến',{budget:5000000,noPlanner:true,cap:550000}],
 ['P11','party-correction',[seed],'Không phải2 người, là3 người',{adults:3,budget:5000000,noPlanner:true}],
 ['P12','known-geography-H03',[seed],'Đổi điểm đến từ Nha Trang sang Huế, vẫn khởi hành Hà Nội',{destination:'Huế',departure:'Hà Nội',budget:5000000,noPlanner:true}],
 ['P13','planner-preview',[],full,{tool:'plan_trip',plannerExactly:1}],
 ['P14','what-if',[full],'Nếu tăng ngân sách thêm500k thì sao?',{hypothetical:true,preserve:true,plannerExactly:1}],
 ['P15','unknown-expression',[],'Tìm navula ở Đà Lạt',{noTool:true,noPlanner:true,clarification:true}],
 ['P16','ambiguous-destination',[seed],'Có lẽ đi Hội An hoặc Nha Trang, tầm7tr',{noTool:true,noPlanner:true,preserve:true}],
 ['P17','optional-review-error',[],'Tìm khách sạn ở Đà Lạt',{tool:'search_registered_hotels',noPlanner:true}],
 ['P18','meaning-only',['Từ giờ mình gọi homestay là ravula'],'Ý mình là homestay',{noTool:true,noPlanner:true}]
].map(([id,family,seeds,input,expected])=>({id,family,seeds,input,expected}));
const holdout=[
 ['U01','Chuyển nơi đến qua Huế, vẫn xuất phát SG',{destinationCity:'Huế',departureCity:'Thành phố Hồ Chí Minh'}],
 ['U02','Đổi điểm đến từ Hội An sang Sa Pa, giữ nơi khởi hành Hà Nội',{destinationCity:'Sa Pa'}],
 ['U03','Doi diem den tu Da Lat sang Hue van xuat phat Ha Noi',{destinationCity:'Huế',departureCity:'Hà Nội'}],
 ['U04','Không đi Hội An mà đi Nha Trang, vẫn xuất phát SG',{destinationCity:'Nha Trang',departureCity:'Thành phố Hồ Chí Minh'}],
 ['U05','Giữ nơi xuất phát, đổi điểm đến sang Quy Nhơn',{destinationCity:'Quy Nhơn'}],
 ['U06','Nếu chuyển điểm đến sang Huế thì sao?',{}],
 ['U07','Tìm nhà hàng ở Huế, chuyến này vẫn đi Hội An',{}],
 ['U08','Chưa chắc chọn Huế hoặc Hà Nội',{}],
 ['U09','Không phải4 người, là5 người',{adults:5}],
 ['U10','750k là tiền phòng, không phải tổng chuyến',{}],
 ['U11','Tìm vulapa ở Đà Lạt nhưng đừng đặt phòng',{}],
 ['U12','Tìm khách sạn dưới900k và nhà hàng dưới180k ở Đà Lạt, tổng không vượt7tr',{totalBudget:7000000}]
].map(([id,input,patch])=>({id,input,patch,expected:{...(id==='U06'||id==='U08'?{question:true,emptyPatch:true,noOperation:true}:{}),...(id==='U07'?{noDestinationUpdate:true}:{}),...(id==='U10'?{noBudgetUpdate:true,hotelCap:750000}:{}),...(id==='U11'?{operation:'search_registered_hotels',type:'homestay'}:{}),preserveUnrelated:true}}));
const manifest={at:new Date().toISOString(),methodology:{tier:'OFFLINE_SYNTHETIC_IN_MEMORY_NOT_POSTGRES_OR_HTTP',warmupPerFamily:2,measuredPerFamily:8,rows:130,concurrency:1,model:'OFF',timings:'End-to-end Core method incl test instrumentation; semantic/render sync timings inclusive, cannot be added; retrieval is instrumented double time; SQL calls instrumented separately in bounded real PG read-only snapshot benchmark',percentiles:'8 observations/family; p95 exploratory max-like, not production SLA. Warmups excluded. Same Node flags/harness/fixtures baseline/final. CPU/JIT/system scheduling not controlled.',resources:'Own Node heapUsed/RSS only; not Windows RAM/Qwen readiness. Peak sampled at request boundaries, not continuous allocation profiling.',holdout:'12 authored synthetic cases locked before source edits; final run once after source lock; H03/H13 known regressions excluded from new holdout count'},scenarios,holdout};
const bytes=JSON.stringify(manifest,null,2)+'\n',file=__dirname+'/evaluation-manifest.json';fs.writeFileSync(file,bytes,{flag:'wx'});fs.writeFileSync(file+'.sha256',crypto.createHash('sha256').update(bytes).digest('hex'),{flag:'wx'});console.log('LOCKED_18_PERFORMANCE_FAMILIES_12_NEW_HOLDOUT');
