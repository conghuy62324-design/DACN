/** One server-owned geographic catalog, shared with every browser picker through /places/locations.
 * Province IDs are official two-digit codes (QD 19/2025/QD-TTg); tourism IDs are explicitly separate.
 * Sources checked 2026-11-12: https://danhmuchanhchinh.nso.gov.vn/TongHop.aspx
 * https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/7/19ttg.signed.pdf
 * Administrative-level labels deliberately say tỉnh/thành; no inferred star/classification or address rewrites.
 */
export const GEOGRAPHY_VERSION='VN_ADMIN34_2025_CODES_REVIEWED_20261112';
export type GeoLocation={id:string;name:string;kind:'province'|'destination'|'all';provinceCode?:string;aliases:string[];legacyNames?:string[];catalogName:string};
export const geoFold=(v:unknown)=>String(v??'').normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[.\s_-]+/g,' ').trim();
const bare=(s:string)=>geoFold(s).replace(/^(?:tinh|thanh pho|tp)\s+/,'');
const rows:[string,string,string[]?][]=[
 ['01','Hà Nội'],['04','Cao Bằng'],['08','Tuyên Quang',['Hà Giang']],['11','Điện Biên'],['12','Lai Châu'],['14','Sơn La'],['15','Lào Cai',['Yên Bái']],['19','Thái Nguyên',['Bắc Kạn']],['20','Lạng Sơn'],['22','Quảng Ninh'],['24','Bắc Ninh',['Bắc Giang']],['25','Phú Thọ',['Vĩnh Phúc','Hòa Bình']],['31','Hải Phòng',['Hải Dương']],['33','Hưng Yên',['Thái Bình']],['37','Ninh Bình',['Hà Nam','Nam Định']],['38','Thanh Hóa'],['40','Nghệ An'],['42','Hà Tĩnh'],['44','Quảng Trị',['Quảng Bình']],['46','Huế',['Thừa Thiên Huế']],['48','Đà Nẵng',['Quảng Nam']],['51','Quảng Ngãi',['Kon Tum']],['52','Gia Lai',['Bình Định']],['56','Khánh Hòa',['Ninh Thuận']],['66','Đắk Lắk',['Phú Yên']],['68','Lâm Đồng',['Đắk Nông','Bình Thuận']],['75','Đồng Nai',['Bình Phước']],['79','Hồ Chí Minh',['Bình Dương','Bà Rịa - Vũng Tàu']],['80','Tây Ninh',['Long An']],['82','Đồng Tháp',['Tiền Giang']],['86','Vĩnh Long',['Bến Tre','Trà Vinh']],['91','An Giang',['Kiên Giang']],['92','Cần Thơ',['Hậu Giang','Sóc Trăng']],['96','Cà Mau',['Bạc Liêu']]
];
export const PROVINCES:GeoLocation[]=rows.map(([id,name,legacyNames=[]])=>({id,name,kind:'province',provinceCode:id,aliases:[],legacyNames,catalogName:name==='Hồ Chí Minh'?'Thành phố Hồ Chí Minh':name}));
const tourism:[string,string,string,string[]?][]=[
 ['da-nang','Đà Nẵng','48',['DN']],['da-lat','Đà Lạt','68',['ĐL','Dalat']],['nha-trang','Nha Trang','56'],['hoi-an','Hội An','48'],['hue','Huế','46'],['ha-noi','Hà Nội','01',['HN']],['ho-chi-minh','Hồ Chí Minh','79',['HCM','SG','Sài Gòn','TP.HCM','TP. Hồ Chí Minh','Thành phố Hồ Chí Minh']],['phu-quoc','Phú Quốc','91',['PQ']],['ha-long','Hạ Long','22'],['sa-pa','Sa Pa','15',['Sapa']]
];
export const DESTINATIONS:GeoLocation[]=tourism.map(([id,name,provinceCode,aliases=[]])=>({id:'destination:'+id,name,kind:'destination',provinceCode,aliases,catalogName:name==='Hồ Chí Minh'?'Thành phố Hồ Chí Minh':name}));
export const ALL_LOCATION:GeoLocation={id:'all',name:'Tất cả địa điểm',kind:'all',aliases:[],catalogName:'all'};
export const GEO_LOCATIONS=[ALL_LOCATION,...PROVINCES,...DESTINATIONS];
export function resolveLocation(value:unknown):GeoLocation|undefined{
 if(typeof value!=='string'||!value.trim())return;
 const byId=GEO_LOCATIONS.find(x=>x.id===value);if(byId)return byId;
 const area=value.match(/^area:(\d{2}):([a-z0-9]+(?:-[a-z0-9]+)*)$/);
 if(area&&value.length<=120&&PROVINCES.some(p=>p.id===area[1]))return{id:value,name:area[2].replaceAll('-',' '),kind:'destination',provinceCode:area[1],aliases:[],catalogName:area[2].replaceAll('-',' ')};
 const s=bare(value); // Legacy city text means the named tourism area, never an implicit merged province.
 return DESTINATIONS.find(x=>[x.name,x.catalogName,...x.aliases].some(n=>bare(n)===s))||PROVINCES.find(x=>[x.name,...x.legacyNames].some(n=>bare(n)===s));
}
export function searchLocations(query:string,locations:GeoLocation[]=GEO_LOCATIONS){const s=bare(query);if(!s)return locations;
 return locations.filter(x=>x.kind!=='all'&&(bare(x.name).includes(s)||x.aliases.some(a=>bare(a)===s)||(x.legacyNames||[]).some(a=>bare(a)===s)));
}
export function geographicKeys(location:GeoLocation){
 if(location.kind==='all')return {city:[],province:[]};
 const named=(x:GeoLocation)=>[x.name,x.catalogName,...x.aliases];
 const city=location.kind==='destination'?named(location):[...named(location),...DESTINATIONS.filter(x=>x.provinceCode===location.id).flatMap(named),...(location.legacyNames||[])];
 const province=location.kind==='province'?[location.id,...named(location),...(location.legacyNames||[])]:[];
 const expand=(values:string[])=>[...new Set(values.flatMap(n=>[bare(n),geoFold(n),geoFold('Tỉnh '+n),geoFold('Thành phố '+n),geoFold('TP. '+n)]))];
 return {city:expand(city),province:expand(province)};
}
export function matchesLocation(place:{city?:string;province?:string},value:string):boolean{
 const geo=resolveLocation(value);if(!geo)return [place.city,place.province].some(v=>geoFold(v)===geoFold(value));
 if(geo.kind==='all')return true;const keys=geographicKeys(geo);
 const cityMatch=keys.city.includes(geoFold(place.city));
 if(geo.id.startsWith('area:'))return cityMatch&&matchesLocation(place,geo.provinceCode!);
 return cityMatch||keys.province.includes(geoFold(place.province));
}
export function provinceForPlace(place:{city?:string;province?:string}){const city=resolveLocation(place.city);const province=PROVINCES.find(p=>[p.id,p.name,p.catalogName,...p.legacyNames].some(v=>bare(v)===bare(place.province||'')));return city?.provinceCode||province?.id;}
export function locationsWithCatalog(rows:{city?:string;province?:string}[]):GeoLocation[]{
 const found=new Map<string,GeoLocation>(GEO_LOCATIONS.map(g=>[g.id,g]));
 for(const row of rows){const provinceCode=provinceForPlace(row),known=resolveLocation(row.city);if(!provinceCode||!row.city||known?.kind==='destination')continue;
  const name=row.city.normalize('NFC').trim().replace(/\s+/g,' '),slug=bare(name).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const id=`area:${provinceCode}:${slug}`;if(!resolveLocation(id)||found.has(id))continue;
  found.set(id,{id,name,kind:'destination',provinceCode,aliases:[],catalogName:name});
 }
 return [...found.values()];
}
export function publicGeography(place:{city?:string;province?:string}){const provinceCode=provinceForPlace(place),city=resolveLocation(place.city),dynamic=city?undefined:locationsWithCatalog([place]).find(g=>g.id.startsWith('area:'));return {locationId:city?.id||dynamic?.id||provinceCode||null,provinceCode:provinceCode||null,provinceName:PROVINCES.find(p=>p.id===provinceCode)?.name||null,version:GEOGRAPHY_VERSION};}
export function locationFromMessage(message:string){const s=' '+bare(message)+' ';return [...DESTINATIONS,...PROVINCES].flatMap(g=>[g.name,g.catalogName,...g.aliases].filter(n=>bare(n).length>=2).map(n=>({g,key:bare(n)}))).sort((a,b)=>b.key.length-a.key.length).find(x=>s.includes(' '+x.key+' '))?.g;}
