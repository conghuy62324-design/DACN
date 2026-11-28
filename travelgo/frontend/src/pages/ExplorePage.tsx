import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Compass,LockKeyhole} from 'lucide-react';
import {CatalogBreadcrumb,CatalogFeedback,CatalogPageFilters,CatalogPagination,CatalogSkeletonGrid,useCatalogPage} from '../components/explore/CatalogPageFilters';
import {PlaceSidebar} from '../components/explore/PlaceSidebar';
import {useAuth} from '../context/AuthContext';
import {PREFERENCE_OPTIONS} from '../constants/travelPreferences';
import {validateDailyBudget} from '../utils/exploreRecommendation';
import '../styles/hg-catalog.css';

const categories=[['all','Tất cả'],['hotel','Khách sạn'],['restaurant','Nhà hàng'],['attraction','Điểm tham quan'],['tour','Tour']];
export function ExplorePage(){
 const [params]=useSearchParams(),{user}=useAuth();
 const [category,setCategory]=useState(categories.some(([id])=>id===params.get('category'))?params.get('category')!:'all');
 const [preferences,setPreferences]=useState<string[]>([]),[budget,setBudget]=useState('');
 const validated=validateDailyBudget(budget);
 const catalog=useCatalogPage(category,{preferences:user?preferences:[],dailyBudgetPerPerson:user&&validated.valid?validated.value:0});
 useEffect(()=>{setPreferences([]);setBudget('');},[user?.id]);
 const listTitle=category==='hotel'?'Khách sạn và cơ sở lưu trú':category==='restaurant'?'Nhà hàng và quán ăn':category==='attraction'?'Điểm tham quan':category==='tour'?'Tour và trải nghiệm':'Dịch vụ phù hợp';
 const emptyMessage=category==='hotel'?'Chưa có khách sạn tại địa điểm này.':category==='restaurant'?'Chưa có nhà hàng tại địa điểm này.':'Chưa có dịch vụ tại địa điểm này.';
 return <div className="hg-cat">
  <header className="hg-cat-head">
   <div className="hg-container">
    <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Khám phá'}]}/>
    <p className="hg-cat-eyebrow"><Compass size={16} aria-hidden="true"/>Khám phá HuGo Travel</p>
    <h1 className="hg-cat-h1">Dịch vụ cho chuyến đi</h1>
    <p className="hg-cat-lead">Chọn tỉnh/thành hoặc địa danh để tìm và so sánh nơi lưu trú, nhà hàng, điểm tham quan và tour đã được duyệt.</p>
   </div>
  </header>
  <div className="hg-container hg-cat-main">
   <nav aria-label="Loại dịch vụ" className="hg-cat-tabs">
    {categories.map(([id,label])=><button type="button" key={id} data-testid={'explore-category-'+id} aria-pressed={category===id} onClick={()=>setCategory(id)} className="hg-cat-tab">{label}</button>)}
   </nav>
   <CatalogPageFilters {...catalog}>
    <hr className="hg-cat-divider"/>
    <div>
     <h3 className="hg-cat-subhead">Gợi ý theo sở thích và ngân sách</h3>
     <div className="hg-cat-chips" aria-label="Sở thích du lịch">
      {PREFERENCE_OPTIONS.map(p=><button type="button" key={p.id} data-testid={'explore-preference-'+p.id} disabled={!user} aria-pressed={preferences.includes(p.id)} onClick={()=>setPreferences(v=>v.includes(p.id)?v.filter(x=>x!==p.id):[...v,p.id])} className="hg-cat-chip">{p.label}</button>)}
     </div>
    </div>
    <div className="hg-cat-filters">
     <label className="hg-cat-field">
      <span>Ngân sách mỗi ngày / người</span>
      <span className="hg-cat-inputwrap">
       <input data-testid="explore-budget" disabled={!user} inputMode="numeric" aria-invalid={!validated.valid} placeholder="Ví dụ: 1500000" value={budget} onChange={e=>setBudget(e.target.value)} className="hg-cat-input"/>
       <i aria-hidden="true">VND</i>
      </span>
      {!validated.valid&&<span role="alert" className="hg-cat-field__hint hg-cat-field__hint--error">{validated.error}</span>}
     </label>
    </div>
    <p className="hg-cat-note">
     {user?'Tiêu chí chỉ dùng xếp hạng lần này; không lưu vào hồ sơ.':<><LockKeyhole size={14} aria-hidden="true"/> Đăng nhập để dùng sở thích và ngân sách. Giá từ danh mục chưa xác minh đơn vị.</>}
    </p>
   </CatalogPageFilters>
   <section aria-label="Danh sách dịch vụ">
    <div className="hg-cat-resultbar">
     <h2 className="hg-cat-h2">{listTitle}</h2>
     <p data-testid="catalog-result-total" className="hg-cat-count">{catalog.loading?'Đang lọc…':catalog.error?'':catalog.meta.total+' kết quả từ HuGo Travel'}</p>
    </div>
    <CatalogFeedback {...catalog}/>
    {catalog.loading
     ?<CatalogSkeletonGrid testId="explore-loading"/>
     :!catalog.error&&<PlaceSidebar grid places={catalog.items} selectedPlace={null} onSelectPlace={()=>{}} emptyMessage={emptyMessage} publicExplanation="Dịch vụ đang được phê duyệt và đủ điều kiện hiển thị. Giá và nguồn được ghi ở từng kết quả."/>}
    <CatalogPagination {...catalog}/>
   </section>
  </div>
 </div>;
}
