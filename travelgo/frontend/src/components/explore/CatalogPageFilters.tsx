import {Fragment,useEffect,useState,type ReactNode} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {AlertTriangle,ChevronDown,ChevronLeft,ChevronRight,Info,Search} from 'lucide-react';
import {PlaceService} from '../../services/placeService';
import type {Place} from '../../types';
import {ServiceFilters,emptyServiceFilters} from './ServiceFilters';
import {LocationCombobox} from '../common/LocationCombobox';
import '../../styles/hg-catalog.css';
export function useCatalogPage(category:string,ranking?:{preferences:string[];dailyBudgetPerPerson:number}){
 const [params]=useSearchParams(),[city,setCity]=useState(params.get('locationId')||params.get('city')||'all'),[search,setSearch]=useState(params.get('search')||''),[rating,setRating]=useState(0),[sort,setSort]=useState('relevance'),[filters,setFilters]=useState({...emptyServiceFilters}),[page,setPage]=useState(1),[meta,setMeta]=useState({total:0,pages:0}),[items,setItems]=useState<Place[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>setPage(1),[city,search,rating,sort,JSON.stringify(filters)]);
 useEffect(()=>{let active=true;setLoading(true);setItems([]);setError('');const timer=setTimeout(async()=>{try{const result=await PlaceService.getPage({category,...(ranking?{preferences:ranking.preferences.join(','),dailyBudgetPerPerson:ranking.dailyBudgetPerPerson}:{}),...(/^\d{2}$|^destination:|^area:|^all$/.test(city)?{locationId:city}:{city}),search,minRating:rating,sortBy:sort,page,limit:20,...(filters.min!==''?{minPriceFrom:Number(filters.min)}:{}),...(filters.max!==''?{maxPriceFrom:Number(filters.max)}:{}),...(category!=='restaurant'&&filters.type?{accommodationType:filters.type}:{}),...(category!=='hotel'&&filters.cuisine?{cuisine:filters.cuisine}:{}),...(filters.amenity?{amenities:filters.amenity}:{})});if(active){setItems(result.items);setMeta(result.meta);}}catch{if(active){setItems([]);setMeta({total:0,pages:0});setError('Chưa tải được dịch vụ. Bạn kiểm tra bộ lọc hoặc thử lại nhé.');}}finally{if(active)setLoading(false);}},250);return()=>{active=false;clearTimeout(timer);};},[category,city,search,rating,sort,page,JSON.stringify(filters),JSON.stringify(ranking),retry]);
 return{category,city,setCity,search,setSearch,rating,setRating,sort,setSort,filters,setFilters,page,setPage,meta,items,loading,error,retry:()=>setRetry(v=>v+1)};
}

/* ---------- Thành phần giao diện dùng chung cho các trang catalog (Gói C) ---------- */

/** Thông báo lỗi API hiển thị cho người dùng: giữ câu tiếng Việt từ máy chủ, thay câu tiếng Anh kỹ thuật bằng câu dễ hiểu. */
export function catalogErrorText(error:unknown,fallback='Kết nối tới máy chủ chưa ổn định. Vui lòng thử lại sau ít phút.'){
 const message=typeof error==='string'?error:(error as any)?.message;
 return typeof message==='string'&&/[À-ỹ]/.test(message)?message:fallback;
}

export function CatalogBreadcrumb({items}:{items:{label:string;to?:string}[]}){
 return <nav className="hg-cat-breadcrumb" aria-label="Đường dẫn trang">
  {items.map((item,i)=><Fragment key={item.label+i}>
   {i>0&&<ChevronRight size={14} aria-hidden="true"/>}
   {item.to
    ?<Link to={item.to}>{item.label}</Link>
    :<span aria-current="page">{item.label}</span>}
  </Fragment>)}
 </nav>;
}

export function CatalogState({icon,title,text,tone,role,actions,testId}:{icon?:ReactNode;title?:string;text?:ReactNode;tone?:'error';role?:'alert'|'status';actions?:ReactNode;testId?:string}){
 return <div className={'hg-cat-state'+(tone==='error'?' hg-cat-state--error':'')} role={role} data-testid={testId}>
  {icon??(tone==='error'?<AlertTriangle size={32} aria-hidden="true"/>:<Search size={32} aria-hidden="true"/>)}
  {title&&<h2>{title}</h2>}
  {text&&<p>{text}</p>}
  {actions&&<div className="hg-cat-state__actions">{actions}</div>}
 </div>;
}

export function CatalogSkeletonGrid({count=6,label='Đang tải dịch vụ…',testId}:{count?:number;label?:string;testId?:string}){
 return <div role="status" data-testid={testId} className="hg-cat-grid">
  <span className="hg-cat-sr">{label}</span>
  {Array.from({length:count},(_,n)=><div key={n} className="hg-cat-skelcard" aria-hidden="true">
   <span className="hg-cat-skel"/>
   <span className="hg-cat-skel"/>
   <span className="hg-cat-skel"/>
   <span className="hg-cat-skel"/>
  </div>)}
 </div>;
}

export function CatalogPageFilters(c:ReturnType<typeof useCatalogPage>&{children?:ReactNode}){
 const searchLabel=c.category==='restaurant'?'Tên nhà hàng, món ăn, địa chỉ…':'Tên dịch vụ, địa chỉ, điểm tham quan…';
 return <section className="hg-cat-panel" aria-label="Tìm và lọc dịch vụ">
  <div className="hg-cat-searchrow">
   <LocationCombobox label="Điểm đến dịch vụ" value={c.city} onChange={c.setCity}/>
   <label className="hg-cat-field">
    <span>Tìm kiếm</span>
    <span className="hg-cat-inputwrap">
     <Search size={18} aria-hidden="true"/>
     <input type="search" aria-label="Tìm kiếm dịch vụ" className="hg-cat-input" placeholder={searchLabel} value={c.search} onChange={e=>c.setSearch(e.target.value)}/>
    </span>
   </label>
  </div>
  <details className="hg-cat-more">
   <summary>
    <span>Bộ lọc giá, loại hình và tiện ích</span>
    <ChevronDown size={18} aria-hidden="true"/>
   </summary>
   <div className="hg-cat-more__body">
    <ServiceFilters value={c.filters} onChange={c.setFilters} category={c.category} sort={c.sort} onSort={c.setSort} extra={<label className="hg-cat-field">
     <span>Đánh giá khách hàng</span>
     <select aria-label="Đánh giá dịch vụ" className="hg-cat-select" value={c.rating} onChange={e=>c.setRating(Number(e.target.value))}>
      <option value={0}>Tất cả</option>
      <option value={4}>Từ 4/5, có lượt đánh giá</option>
      <option value={4.5}>Từ 4,5/5, có lượt đánh giá</option>
     </select>
    </label>}/>
    {c.children}
   </div>
  </details>
 </section>;
}

/** Thông báo lỗi tải của catalog. Đặt ngay trên danh sách kết quả. */
export function CatalogFeedback(c:ReturnType<typeof useCatalogPage>){
 return <>
  {c.error&&<CatalogState role="alert" tone="error" title="Chưa tải được danh sách" text={c.error} actions={<button type="button" className="hg-cat-btn hg-cat-btn--outline" onClick={c.retry}>Thử lại</button>}/>}
 </>;
}

export function CatalogPagination(c:ReturnType<typeof useCatalogPage>){
 if(c.meta.pages<=1)return null;
 return <nav aria-label="Phân trang dịch vụ" className="hg-cat-pager">
  <button type="button" disabled={c.loading||c.page<=1} onClick={()=>c.setPage(v=>v-1)} className="hg-cat-btn hg-cat-btn--ghost">
   <ChevronLeft size={16} aria-hidden="true"/>Trang trước
  </button>
  <span>Trang {c.page}/{Math.max(1,c.meta.pages)} · {c.meta.total} dịch vụ</span>
  <button type="button" disabled={c.loading||c.page>=c.meta.pages} onClick={()=>c.setPage(v=>v+1)} className="hg-cat-btn hg-cat-btn--ghost">
   Trang sau<ChevronRight size={16} aria-hidden="true"/>
  </button>
 </nav>;
}
