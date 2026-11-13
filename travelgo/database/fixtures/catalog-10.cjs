// DEMO ONLY. References inspire sightseeing scenarios; no vendor, coordinate, tariff or availability verification.
const crypto=require('node:crypto');
const cohort='travelgo-catalog-10-v1';
const uuid=key=>{const h=crypto.createHash('sha256').update(cohort+':'+key).digest('hex');return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;};
const destinations=[
 ['da-nang','Đà Nẵng',16.0,108.0,'south-central-coast-central-highlands/da-nang',['Mỹ Khê','Sơn Trà','Hải Vân']],
 ['da-lat','Đà Lạt',11.9,108.4,'south-central-coast-central-highlands/dalat',['Hồ và vườn hoa','Đồi thông','Thác nước']],
 ['nha-trang','Nha Trang',12.2,109.1,'south-central-coast-central-highlands/nha-trang',['Bãi biển','Chùa Long Sơn','Tháp Po Nagar']],
 ['hoi-an','Hội An',15.8,108.3,'https://whc.unesco.org/en/list/948/',['Phố cổ','Cầu cổ','Nhà cổ']],
 ['hue','Huế',16.4,107.5,'north-central-coast/hue',['Đại Nội','Chùa Thiên Mụ','Chợ Đông Ba']],
 ['ha-noi','Hà Nội',21.0,105.8,'red-river-delta/ha-noi',['Hồ Hoàn Kiếm','Phố cổ','Văn Miếu']],
 ['ho-chi-minh','Thành phố Hồ Chí Minh',10.7,106.6,'southeastern-vietnam/ho-chi-minh-city',['Chợ Bến Thành','Bưu điện trung tâm','Nhà hát thành phố']],
 ['phu-quoc','Phú Quốc',10.2,103.9,'mekong-delta/phu-quoc',['Bãi Sao','Hòn Thơm','Chợ đêm']],
 ['ha-long','Hạ Long',20.9,107.0,'red-river-delta/ha-long',['Vịnh biển','Làng chài','Hang động']],
 ['sa-pa','Sa Pa',22.3,103.8,'northern-midlands-mountains/sapa',['Fansipan','Cát Cát','Tả Phìn']],
].map(([key,city,lat,lng,source,spots])=>({key,city,lat,lng,source:source.startsWith('https:')?source:'https://vietnam.travel/place-to-go/'+source+'/',spots}));
const accommodations=['hotel','resort','homestay','villa','apartment'];
const labels=['Khách sạn','Resort','Homestay','Villa','Căn hộ'];
const cuisines=[['vietnamese','local'],['seafood'],['vegetarian'],['bbq_hotpot'],['family','buffet','international']];
const businesses=[],places=[];
for(const destination of destinations){
 for(const category of ['hotel','restaurant']){
  const business={id:uuid(destination.key+':'+category+':business'),name:`DEMO ${destination.city} — ${category==='hotel'?'Lưu trú':'Ẩm thực'}`,type:category==='hotel'?'HOTEL':'RESTAURANT',email:`${destination.key}-${category}@catalog-demo.invalid`,phone:'0000000000',address:'Địa chỉ mô phỏng, không tiếp nhận khách',city:destination.city,status:'ACTIVE'};
  businesses.push(business);
  for(let i=0;i<5;i++)places.push(makePlace(destination,category,i,business.id));
 }
 for(let i=0;i<3;i++)places.push(makePlace(destination,'attraction',i,null));
}
function makePlace(d,category,i,businessId){
 const name=`DEMO ${d.city} — ${category==='hotel'?labels[i]:category==='restaurant'?['Đặc sản','Hải sản','Đồ chay','BBQ và lẩu','Gia đình'][i]:'Mô phỏng '+d.spots[i]}`;
 return {id:uuid(d.key+':'+category+':'+i),businessId,name,slug:`demo-${cohort}-${d.key}-${category}-${i+1}`,category,
  summary:'DEMO kiểm thử TravelGo. Giá và vị trí là giả định, không phải dịch vụ hoặc báo giá thật.',
  description:category==='attraction'?`Kịch bản tham quan DEMO lấy cảm hứng từ ${d.spots[i]}. Nguồn tham khảo chỉ cho chủ đề du lịch; giờ mở cửa, giá vé và vị trí thực chưa xác minh.`:'Cơ sở DEMO do hệ thống tạo trong staging riêng; không phải đối tác thật. Không đặt dịch vụ hoặc thanh toán.',
  city:d.city,province:d.city,address:'Địa chỉ DEMO chưa xác minh; không dùng để đi lại',
  latitude:d.lat+(i+1)*0.003+(category==='restaurant'?0.001:0),longitude:d.lng+(i+1)*0.004,
  priceFrom:category==='hotel'?[350000,550000,750000,1100000,null][i]:category==='restaurant'?[80000,150000,250000,350000,null][i]:[50000,0,null][i],
  rating:null,reviewCount:0,bayesianRating:4.2,duration:category==='attraction'?'90 phút (DEMO)':null,
  heroImage:'/images/catalog-demo.svg',galleryImages:[],highlights:['DEMO','Không có Booking thật'],amenities:category==='attraction'?[]:['Wi-Fi','Điều hòa',...(i%2===0?['Bãi đỗ xe']:[]),...(category==='hotel'&&i===1?['Hồ bơi','Ăn sáng']:[])],
  openingHours:{},contactInfo:{},status:'APPROVED',isFeatured:false,
  catalogMetadata:{source:'DEMO',cohort,priceBasis:'ASSUMED_DEMO_VND',coordinateBasis:'SYNTHETIC_SCENARIO',sourceUrls:category==='attraction'?[d.source]:[],imageLicense:'TravelGo original SVG placeholder',...(category==='hotel'?{accommodationType:accommodations[i]}:category==='restaurant'?{cuisines:cuisines[i]}:{}),priceSegment:i<2?'budget':i<4?'midrange':'unknown'},
  approvedAt:'2026-11-12T00:00:00.000Z'};
}
module.exports={cohort,uuid,destinations,businesses,places,sourceNotice:'DEMO assumptions. Reference links are not supplier verification. Coordinates are scenario inputs, not real positions. Unknown tariffs/rating/opening hours remain NULL/unknown.'};
