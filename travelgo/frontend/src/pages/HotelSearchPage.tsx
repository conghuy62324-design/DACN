import '../styles/hotels.css';
import '../styles/hotelPremium.css';
import {useEffect,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import {SlidersHorizontal,X,ChevronRight,ChevronLeft,ChevronDown,Search,Hotel,AlertTriangle,ArrowUpDown,Info,RefreshCw} from 'lucide-react';
import {SharedHotelSearchBar} from '../components/hotels/SharedHotelSearchBar';
import {HotelResultCard,hotelTypes,roomViews,amenityLabels,vnd,ratingText} from '../components/hotels/HotelResultCard';
import {HotelDialog} from '../components/hotels/HotelDialog';
import {useHotelSearch} from '../components/hotels/useHotelSearch';
import {readSearch,searchHref,stayError} from '../utils/hotelSearchState';
import '../styles/hg-hotel-card.css';
import '../styles/hg-results.css';


const filterKeys=['streetName','accommodationType','minPrice','maxPrice','stars','minRating','propertyAmenities','roomAmenities','view','bedrooms','bathrooms','breakfast','refundable','promotion'];
const chipLabels:Record<string,string>={streetName:'Đường',accommodationType:'Loại lưu trú',minPrice:'Giá từ',maxPrice:'Giá đến',view:'Hướng nhìn',roomAmenities:'Tiện nghi phòng',propertyAmenities:'Tiện nghi chung',breakfast:'Bữa sáng',refundable:'Hoàn hủy',promotion:'Ưu đãi',stars:'Hạng sao',minRating:'Điểm đánh giá',bedrooms:'Phòng ngủ',bathrooms:'Phòng tắm'};
const propertyAmenityLabels:Record<string,string>={WIFI:'Wi-Fi khu vực chung',PARKING:'Bãi đỗ xe',POOL:'Hồ bơi'};
const rateConditions:[string,string][]=[['promotion','Có ưu đãi đủ điều kiện'],['breakfast','Bao gồm bữa sáng'],['refundable','Có hoàn hủy trước hạn']];
const priceExpiredPrefix='Thông tin giá đã hết thời gian hiệu lực';
const shortDate=(iso:string)=>iso?iso.slice(8,10)+'/'+iso.slice(5,7):'';

/** Danh sách số trang: 1, cuối, ±1 quanh trang hiện tại; còn lại là "…". */
function pageItems(page:number,count:number):(number|'gap')[]{
 const keep=new Set([1,count,page-1,page,page+1].filter(n=>n>=1&&n<=count));
 const sorted=[...keep].sort((a,b)=>a-b);
 const out:(number|'gap')[]=[];
 sorted.forEach((n,i)=>{
  if(i>0&&n-sorted[i-1]>1)out.push('gap');
  out.push(n);
 });
 return out;
}

export function HotelSearchPage(){
 const location=useLocation();
 const navigate=useNavigate();
 const state=readSearch(location.search);
 const[draft,setDraft]=useState(state);
 const[filtersOpen,setFiltersOpen]=useState(false);
 const[searchOpen,setSearchOpen]=useState(false);
 const invalid=stayError(state);
 const enabled=import.meta.env.VITE_HOTEL_DOMAIN_ENABLED==='true';
 const{data,error,loading,refresh}=useHotelSearch(state,enabled&&!invalid);
 useEffect(()=>{setDraft(readSearch(location.search));},[location.search]);
 const change=(key:string,value:any)=>navigate(searchHref({...state,[key]:value,page:'1'}));
 const toggle=(key:string,value:string,checked:boolean)=>change(key,checked?[...(state[key]||[]),value]:(state[key]||[]).filter((v:string)=>v!==value));
 const active=filterKeys.filter(k=>state[k]!==undefined&&state[k]!==''&&(!Array.isArray(state[k])||state[k].length));
 const reset=()=>{const s={...state,page:'1'};for(const k of filterKeys)delete s[k];navigate(searchHref(s));};
 const has=(...keys:string[])=>keys.some(k=>active.includes(k));
 const groups:{id:string;label:string;keys:string[]}[]=[
  {id:'budget',label:'Ngân sách · tổng kỳ lưu trú',keys:['minPrice','maxPrice']},
  {id:'rate',label:'Điều kiện gói giá',keys:['promotion','breakfast','refundable']},
  {id:'type',label:'Loại lưu trú',keys:['accommodationType']},
  {id:'stars',label:'Hạng sao có xác minh',keys:['stars']},
  {id:'rating',label:'Điểm đánh giá thật',keys:['minRating']},
  {id:'property',label:'Tiện nghi khách sạn',keys:['propertyAmenities']},
  {id:'room',label:'Tiện nghi trong cùng hạng phòng',keys:['roomAmenities']},
  {id:'view',label:'Hướng nhìn của phòng',keys:['view']},
  {id:'rooms',label:'Phòng ngủ / phòng tắm',keys:['bedrooms','bathrooms']},
  {id:'street',label:'Tên đường',keys:['streetName']},
 ];
 const[openGroups,setOpenGroups]=useState<Record<string,boolean>>(()=>Object.fromEntries(groups.map((g,i)=>[g.id,i<4||has(...g.keys)])));
 const isOpen=(id:string,keys:string[])=>openGroups[id]??has(...keys);
 const flip=(id:string,keys:string[])=>setOpenGroups(o=>({...o,[id]:!isOpen(id,keys)}));
 const chipValue=(k:string)=>{
  const v=state[k];
  if(Array.isArray(v))return v.map((x:string)=>(k==='propertyAmenities'?propertyAmenityLabels[x]:amenityLabels[x])||x).join(', ');
  if(k==='minPrice'||k==='maxPrice')return Number.isFinite(Number(v))?vnd(Number(v)):v;
  if(k==='stars')return v+' sao';
  if(k==='minRating')return 'từ '+ratingText(v)+'/5';
  if(k==='view')return roomViews[v]||v;
  if(k==='accommodationType')return hotelTypes[v]||v;
  return v==='true'?'Có':v;
 };

 const groupBody=(id:string,prefix:string)=>{
  switch(id){
   case 'budget':return <>
    <div className="hg-ftwins">
     <label className="hg-ffield">
      <span>Tối thiểu</span>
      <span className="hg-fsuffix">
       <input type="number" inputMode="numeric" min={0} step={100000} aria-label="Giá tối thiểu" disabled={!state.checkIn} value={state.minPrice||''} onChange={e=>change('minPrice',e.target.value)}/>
       <i aria-hidden="true">₫</i>
      </span>
     </label>
     <label className="hg-ffield">
      <span>Tối đa</span>
      <span className="hg-fsuffix">
       <input type="number" inputMode="numeric" min={0} step={100000} aria-label="Giá tối đa" disabled={!state.checkIn} value={state.maxPrice||''} onChange={e=>change('maxPrice',e.target.value)}/>
       <i aria-hidden="true">₫</i>
      </span>
     </label>
    </div>
    <small className="hg-fnote">{state.checkIn?'Tổng giá cả kỳ lưu trú, cùng số phòng và số khách.':'Chọn ngày để lọc theo tổng giá.'}</small>
   </>;
   case 'rate':return rateConditions.map(([k,l])=><label className="hg-fcheck" key={k}>
    <input type="checkbox" checked={state[k]==='true'} onChange={e=>change(k,e.target.checked?'true':'')}/>
    <span>{l}</span>
   </label>);
   case 'type':return <select className="hg-fselect" aria-label="Loại lưu trú" value={state.accommodationType||''} onChange={e=>change('accommodationType',e.target.value)}>
    <option value="">Tất cả loại</option>
    {Object.entries(hotelTypes).map(([v,l])=><option key={v} value={v}>{l}</option>)}
   </select>;
   case 'stars':return <div className="hg-fpills" role="group" aria-label="Hạng sao">
    {[5,4,3,2,1].map(n=>{
     const on=String(state.stars||'')===String(n);
     return <button type="button" key={n} aria-pressed={on} aria-label={`${n} sao`} onClick={()=>change('stars',on?'':String(n))}>{n}★</button>;
    })}
   </div>;
   case 'rating':return [['','Không giới hạn'],['4.5','Từ 4,5/5'],['4','Từ 4/5'],['3','Từ 3/5']].map(([v,l])=><label className="hg-fcheck" key={v||'any'}>
    <input type="radio" name={prefix+'-rating'} checked={String(state.minRating||'')===v} onChange={()=>change('minRating',v)}/>
    <span>{l}</span>
   </label>);
   case 'property':return ['WIFI','PARKING','POOL'].map(a=><label className="hg-fcheck" key={a}>
    <input type="checkbox" checked={(state.propertyAmenities||[]).includes(a)} onChange={e=>toggle('propertyAmenities',a,e.target.checked)}/>
    <span>{propertyAmenityLabels[a]}</span>
   </label>);
   case 'room':return ['WIFI','AIR_CONDITIONING','KITCHEN','BALCONY','BATHTUB'].map(a=><label className="hg-fcheck" key={a}>
    <input type="checkbox" checked={(state.roomAmenities||[]).includes(a)} onChange={e=>toggle('roomAmenities',a,e.target.checked)}/>
    <span>{amenityLabels[a]}</span>
   </label>);
   case 'view':return <select className="hg-fselect" aria-label="Hướng nhìn" value={state.view||''} onChange={e=>change('view',e.target.value)}>
    <option value="">Không giới hạn</option>
    {Object.entries(roomViews).filter(([v])=>v!=='UNKNOWN').map(([v,l])=><option key={v} value={v}>{l}</option>)}
   </select>;
   case 'rooms':return <div className="hg-ftwins">
    {[['bedrooms','Phòng ngủ tối thiểu','Số phòng ngủ tối thiểu'],['bathrooms','Phòng tắm tối thiểu','Số phòng tắm tối thiểu']].map(([k,l,aria])=><label className="hg-ffield" key={k}>
     <span>{l}</span>
     <input type="number" inputMode="numeric" min={0} max={20} aria-label={aria} value={state[k]||''} onChange={e=>change(k,e.target.value)}/>
    </label>)}
   </div>;
   case 'street':return <>
    <input className="hg-finput" aria-label="Tên đường" value={state.streetName||''} disabled={!state.locationId} onChange={e=>change('streetName',e.target.value)} placeholder="Ví dụ: Bùi Thị Xuân"/>
    <small className="hg-fnote">{state.locationId?'Tìm trên đường thuộc điểm đến đã chọn.':'Chọn điểm đến trước để lọc theo tên đường.'}</small>
   </>;
   default:return null;
  }
 };

 const filters=(prefix:string)=><div className="hg-filters">
  {groups.map(g=>{
   const open=isOpen(g.id,g.keys);
   const bodyId=prefix+'-fg-'+g.id;
   return <fieldset className="hg-fgroup" key={g.id}>
    <legend className="hg-fgroup__legend">
     <button type="button" aria-expanded={open} aria-controls={bodyId} onClick={()=>flip(g.id,g.keys)}>
      <span>{g.label}</span>
      <ChevronDown size={18} aria-hidden="true"/>
     </button>
    </legend>
    <div className="hg-fgroup__body" id={bodyId} hidden={!open}>{groupBody(g.id,prefix)}</div>
   </fieldset>;
  })}
  <p className="hg-filters__legal">Các điều kiện phòng và giá phải khớp cùng hạng phòng/gói giá. Mỗi lần tìm hỗ trợ tối đa 60 khách sạn phù hợp địa chỉ; phạm vi quá rộng sẽ yêu cầu thu hẹp.</p>
 </div>;

 const totalPages=data?Math.max(1,Math.ceil(data.total/data.limit)):1;
 const goPage=(p:number)=>navigate(searchHref({...state,page:String(p)}));
 const priceExpired=!!error&&error.startsWith(priceExpiredPrefix);
 const guestCount=(state.rooms||[]).reduce((n:number,r:any)=>n+(r.adults||0),0);
 const childCount=(state.rooms||[]).reduce((n:number,r:any)=>n+(r.childAges?.length||0),0);
 const summaryLine=[
  state.checkIn?`${shortDate(state.checkIn)} → ${shortDate(state.checkOut)}`:'Chưa chọn ngày',
  `${guestCount} người lớn${childCount?`, ${childCount} trẻ em`:''}`,
  `${state.rooms.length} phòng`,
 ].join(' · ');

 let list:React.ReactNode;
 if(invalid){
  list=<div className="hg-state" role="alert">
   <AlertTriangle size={32} aria-hidden="true"/>
   <h2>Kiểm tra lại tiêu chí</h2>
   <p>{invalid}</p>
  </div>;
 }
 else if(!enabled){
  list=<div className="hg-state">
   <Hotel size={32} aria-hidden="true"/>
   <h2>Danh sách đang được chuẩn bị</h2>
   <p>Nền tảng phòng chưa được mở tại môi trường này.</p>
  </div>;
 }
 else if(loading){
  list=<div role="status" aria-label="Đang tải kết quả" className="hg-results-skeleton">
   {[1,2,3].map(i=><div className="hg-skel-card" key={i} aria-hidden="true">
    <span className="hg-skel hg-skel-card__img"/>
    <span className="hg-skel-card__lines">
     <span className="hg-skel hg-skel--w40"/>
     <span className="hg-skel hg-skel--w75"/>
     <span className="hg-skel hg-skel--w60"/>
     <span className="hg-skel hg-skel--w50"/>
    </span>
    <span className="hg-skel-card__price">
     <span className="hg-skel hg-skel--w80"/>
     <span className="hg-skel hg-skel--btn"/>
    </span>
   </div>)}
  </div>;
 }
 else if(priceExpired){
  list=<div className="hg-notice" role="alert">
   <Info size={16} aria-hidden="true"/>
   <p>{error}</p>
   <button type="button" className="hg-btn hg-btn--outline" onClick={refresh}><RefreshCw size={16} aria-hidden="true"/>Tải lại giá</button>
  </div>;
 }
 else if(error){
  list=<div className="hg-state" role="alert">
   <AlertTriangle size={32} aria-hidden="true"/>
   <h2>Chưa tải được kết quả</h2>
   <p>{/[À-ỹ]/.test(error)?error:'Kết nối tới máy chủ chưa ổn định. Vui lòng thử lại sau ít phút.'}</p>
   <button type="button" className="hg-btn hg-btn--outline" onClick={refresh}>Thử lại</button>
  </div>;
 }
 else if(!data?.total){
  list=<div className="hg-state">
   <Search size={32} aria-hidden="true"/>
   <h2>Chưa tìm thấy nơi lưu trú phù hợp</h2>
   <p>Thử thay ngày hoặc giảm một số điều kiện. Tồn phòng chưa rõ sẽ không được coi là còn phòng.</p>
   {active.length>0&&<button type="button" className="hg-btn hg-btn--outline" onClick={reset}>Xóa bộ lọc</button>}
  </div>;
 }
 else{
  list=<>
   <div className="hg-results-cards">
    {data.items.map((h:any)=><HotelResultCard key={h.identity.id} hotel={h} criteria={state}/>)}
   </div>
   {totalPages>1&&<nav className="hg-pagination" aria-label="Phân trang">
    <button type="button" className="hg-pagination__step" disabled={data.page<=1} onClick={()=>goPage(data.page-1)}>
     <ChevronLeft size={16} aria-hidden="true"/><span>Trước</span>
    </button>
    {pageItems(data.page,totalPages).map((p,i)=>p==='gap'
     ?<span key={'gap'+i} className="hg-pagination__gap" aria-hidden="true">…</span>
     :<button type="button" key={p} className="hg-pagination__num" aria-label={'Trang '+p} aria-current={p===data.page?'page':undefined} onClick={()=>p!==data.page&&goPage(p)}>{p}</button>)}
    <button type="button" className="hg-pagination__step" disabled={data.page*data.limit>=data.total} onClick={()=>goPage(data.page+1)}>
     <span>Sau</span><ChevronRight size={16} aria-hidden="true"/>
    </button>
   </nav>}
   <p className="hg-results-asof">Cập nhật lúc {new Date(data.asOf).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}. Báo giá không giữ phòng. Nhiều phòng hiện dùng cùng một hạng phòng/gói giá; chưa phối hợp các hạng phòng khác nhau.</p>
  </>;
 }

 return <div className="hotel-ui hotel-results hg-scope hg-page-results">
  <div className="hg-results-bar">
   <div className="hg-container">
    <SharedHotelSearchBar variant="bar" value={draft} onChange={setDraft} onSearch={s=>navigate(searchHref(s))}/>
   </div>
  </div>
  <button type="button" className="hg-results-summary" aria-haspopup="dialog" onClick={()=>setSearchOpen(true)}>
   <Search size={18} aria-hidden="true"/>
   <span className="hg-results-summary__text">
    <b>{state.nameOrAddress||(state.locationId?'Điểm đến đã chọn':'Tất cả điểm đến')}</b>
    <small>{summaryLine}</small>
   </span>
   <span className="hg-results-summary__edit">Sửa</span>
  </button>
  <div className="hg-container hg-results-main">
   <nav className="hg-breadcrumb" aria-label="Đường dẫn trang">
    <Link to="/">Trang chủ</Link>
    <ChevronRight size={14} aria-hidden="true"/>
    <Link to="/hotels">Khách sạn</Link>
    <ChevronRight size={14} aria-hidden="true"/>
    <span aria-current="page">Kết quả tìm kiếm</span>
   </nav>
   <div className="hg-results-head">
    <div className="hg-results-head__title">
     <h1>{state.nameOrAddress?'Nơi lưu trú cho “'+state.nameOrAddress+'”':'Tìm nơi nghỉ phù hợp với bạn'}</h1>
     <p role="status">{loading?'Đang kiểm tra nơi lưu trú…':data?`${data.total} nơi lưu trú phù hợp`:'Chọn tiêu chí để khám phá nơi lưu trú.'}</p>
    </div>
    <div className="hg-results-toolbar">
     <label className="hg-sort">
      <span className="hg-sort__label">Sắp xếp</span>
      <span className="hg-sort__control">
       <ArrowUpDown size={16} aria-hidden="true"/>
       <select aria-label="Sắp xếp" value={state.sort||'relevance'} onChange={e=>change('sort',e.target.value)}>
        <option value="relevance">Phù hợp nhất</option>
        <option value="price_asc" disabled={!state.checkIn} title={state.checkIn?undefined:'Chọn ngày để sắp xếp theo giá'}>Tổng giá tăng dần{state.checkIn?'':' (cần chọn ngày)'}</option>
        <option value="price_desc" disabled={!state.checkIn} title={state.checkIn?undefined:'Chọn ngày để sắp xếp theo giá'}>Tổng giá giảm dần{state.checkIn?'':' (cần chọn ngày)'}</option>
        <option value="rating">Điểm đánh giá</option>
        <option value="recent">Mới được duyệt</option>
       </select>
       <ChevronDown size={16} aria-hidden="true" className="hg-sort__chevron"/>
      </span>
     </label>
     <button type="button" className="hg-filter-open" aria-haspopup="dialog" onClick={()=>setFiltersOpen(true)}>
      <SlidersHorizontal size={16} aria-hidden="true"/>Bộ lọc{active.length?' · '+active.length:''}
     </button>
    </div>
   </div>
   {active.length>0&&<div className="hg-chips">
    {active.map(k=><button type="button" key={k} className="hg-chip" aria-label={'Bỏ lọc '+chipLabels[k]} onClick={()=>change(k,'')}>
     <span>{chipLabels[k]}: {chipValue(k)}</span>
     <X size={14} aria-hidden="true"/>
    </button>)}
    <button type="button" className="hg-link hg-chips__clear" onClick={reset}>Xóa tất cả</button>
   </div>}
   <div className="hg-results-layout">
    <aside className="hg-sidebar" aria-label="Bộ lọc kết quả">
     <div className="hg-sidebar__head">
      <h2>Bộ lọc</h2>
      {active.length>0&&<button type="button" className="hg-link" onClick={reset}>Xóa bộ lọc</button>}
     </div>
     {filters('side')}
    </aside>
    <section className="hg-results-list" aria-label="Danh sách khách sạn">{list}</section>
   </div>
  </div>
  {searchOpen&&<HotelDialog variant="fullscreen" title="Sửa tìm kiếm" onClose={()=>setSearchOpen(false)}>
   <SharedHotelSearchBar value={draft} onChange={setDraft} onSearch={s=>{navigate(searchHref(s));setSearchOpen(false);}}/>
  </HotelDialog>}
  {filtersOpen&&<HotelDialog
   variant="fullscreen"
   className="hg-drawer"
   title={'Bộ lọc'+(active.length?' · '+active.length:'')}
   onClose={()=>setFiltersOpen(false)}
   footer={<>
    <button type="button" className="hg-btn hg-btn--ghost hg-drawer__reset" onClick={reset} disabled={!active.length}>Xóa tất cả</button>
    <button type="button" className="hg-btn hg-btn--cta hg-btn--lg hg-drawer__done" onClick={()=>setFiltersOpen(false)}>Xem kết quả</button>
   </>}>
   {filters('drawer')}
  </HotelDialog>}
 </div>;
}
