import {useEffect,useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import {Compass} from 'lucide-react';
import {CatalogPageFilters,CatalogPagination,useCatalogPage} from '../components/explore/CatalogPageFilters';
import {PlaceSidebar} from '../components/explore/PlaceSidebar';
import {useAuth} from '../context/AuthContext';
import {PREFERENCE_OPTIONS} from '../constants/travelPreferences';
import {validateDailyBudget} from '../utils/exploreRecommendation';

const categories=[['all','Tất cả'],['hotel','Khách sạn'],['restaurant','Nhà hàng'],['attraction','Điểm tham quan'],['tour','Tour']];
export function ExplorePage(){
 const [params]=useSearchParams(),{user}=useAuth();
 const [category,setCategory]=useState(categories.some(([id])=>id===params.get('category'))?params.get('category')!:'all');
 const [preferences,setPreferences]=useState<string[]>([]),[budget,setBudget]=useState('');
 const validated=validateDailyBudget(budget);
 const catalog=useCatalogPage(category,{preferences:user?preferences:[],dailyBudgetPerPerson:user&&validated.valid?validated.value:0});
 useEffect(()=>{setPreferences([]);setBudget('');},[user?.id]);
 return <div className="min-h-screen bg-slate-50 pb-14 pt-24"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
  <header className="mb-5"><p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal-700"><Compass size={16}/>Khám phá TravelGo</p><h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Dịch vụ cho chuyến đi</h1><p className="mt-2 text-sm text-slate-600">Chọn tỉnh/thành hoặc địa danh để tìm và so sánh dịch vụ.</p></header>
  <nav aria-label="Loại dịch vụ" className="mb-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">{categories.map(([id,label])=><button type="button" key={id} data-testid={'explore-category-'+id} aria-pressed={category===id} onClick={()=>setCategory(id)} className={`shrink-0 rounded-xl border px-4 py-2 text-sm font-semibold ${category===id?'border-teal-700 bg-teal-700 text-white':'border-slate-200 bg-white text-slate-700'}`}>{label}</button>)}</nav>
  <CatalogPageFilters {...catalog}><div className="mt-4 border-t pt-3"><h3 className="text-sm font-semibold">Gợi ý theo sở thích và ngân sách</h3><div className="mt-3 flex flex-wrap gap-2">{PREFERENCE_OPTIONS.map(p=><button type="button" key={p.id} data-testid={'explore-preference-'+p.id} disabled={!user} aria-pressed={preferences.includes(p.id)} onClick={()=>setPreferences(v=>v.includes(p.id)?v.filter(x=>x!==p.id):[...v,p.id])} className={'rounded-full border px-3 py-2 text-xs disabled:opacity-50 '+(preferences.includes(p.id)?'bg-teal-100':'bg-white')}>{p.label}</button>)}</div><label className="mt-3 block text-sm">Ngân sách mỗi ngày / người (VND)<input data-testid="explore-budget" disabled={!user} inputMode="numeric" value={budget} onChange={e=>setBudget(e.target.value)} className="ml-2 rounded-lg border p-2"/></label>{!validated.valid&&<p role="alert" className="text-sm text-rose-700">{validated.error}</p>}<p className="mt-2 text-xs text-slate-500">{user?'Tiêu chí chỉ dùng xếp hạng lần này; không lưu vào hồ sơ.':'Đăng nhập để dùng sở thích và ngân sách. Giá từ catalog chưa xác minh đơn vị.'}</p></div></CatalogPageFilters>
  <section aria-label="Danh sách dịch vụ"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-slate-900">{category==='hotel'?'Khách sạn và cơ sở lưu trú':category==='restaurant'?'Nhà hàng và quán ăn':'Dịch vụ phù hợp'}</h2><p data-testid="catalog-result-total" className="text-sm text-slate-600">{catalog.loading?'Đang lọc…':catalog.meta.total+' kết quả từ TravelGo'}</p></div>
  {catalog.loading?<div role="status" data-testid="explore-loading" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(n=><div key={n} className="h-64 animate-pulse rounded-2xl bg-slate-200"/>)}</div>:!catalog.error&&<PlaceSidebar grid places={catalog.items} selectedPlace={null} onSelectPlace={()=>{}} emptyMessage={category==='hotel'?'Chưa có khách sạn tại địa điểm này.':category==='restaurant'?'Chưa có nhà hàng tại địa điểm này.':'Chưa có dịch vụ tại địa điểm này.'} publicExplanation="Dịch vụ đang được phê duyệt và đủ điều kiện hiển thị. Giá và nguồn được ghi ở từng kết quả."/>}
  <CatalogPagination {...catalog}/>
  </section>
 </div></div>;
}