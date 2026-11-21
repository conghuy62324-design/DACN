import {useId,useRef,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {ArrowRight,CalendarDays,Compass,Hotel,Search,Sparkles,UtensilsCrossed} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {LocationCombobox} from '../common/LocationCombobox';
import {SharedHotelSearchBar} from '../hotels/SharedHotelSearchBar';
import type {SearchState} from '../../utils/hotelSearchState';
import '../../styles/hg-search-form.css';

type TabKey='hotel'|'restaurant'|'explore'|'planner';
type CatalogDraft={locationId:string;search:string};

const TABS:{key:TabKey;label:string;Icon:LucideIcon}[]=[
 {key:'hotel',label:'Khách sạn',Icon:Hotel},
 {key:'restaurant',label:'Nhà hàng',Icon:UtensilsCrossed},
 {key:'explore',label:'Khám phá',Icon:Compass},
 {key:'planner',label:'Lịch trình',Icon:CalendarDays},
];

/** Form Nhà hàng / Khám phá: điều hướng tới trang catalog với locationId + search (CatalogPageFilters đã đọc 2 tham số này). */
function CatalogPanel({path,draft,onDraft,placeholder,inputLabel,submitLabel}:{path:string;draft:CatalogDraft;onDraft:(d:CatalogDraft)=>void;placeholder:string;inputLabel:string;submitLabel:string}){
 const navigate=useNavigate();
 const inputId=useId();
 const submit=(e:React.FormEvent)=>{
  e.preventDefault();
  const params=new URLSearchParams();
  if(draft.locationId)params.set('locationId',draft.locationId);
  if(draft.search.trim())params.set('search',draft.search.trim());
  const query=params.toString();
  navigate(path+(query?'?'+query:''));
 };
 return (
  <form className="hg-search hg-search--hero" onSubmit={submit} aria-label={submitLabel}>
   <div className="hg-search-grid hg-search-grid--catalog">
    <div className="hg-field hg-field--location">
     <LocationCombobox label="Điểm đến" value={draft.locationId} onChange={v=>onDraft({...draft,locationId:v==='all'?'':v})}/>
    </div>
    <div className="hg-field hg-field--name">
     <label className="hg-field-box" htmlFor={inputId}>
      <span className="hotel-field-label">{inputLabel}</span>
      <input
       id={inputId}
       type="search"
       autoComplete="off"
       value={draft.search}
       onChange={e=>onDraft({...draft,search:e.target.value})}
       placeholder={placeholder}
      />
     </label>
    </div>
    <button type="submit" className="hg-search-submit">
     <Search size={20} aria-hidden="true"/>
     <span>{submitLabel}</span>
    </button>
   </div>
  </form>
 );
}

type Props={
 /** Trang chủ: có hàng tab dịch vụ. Trang /hotels: chỉ form khách sạn. */
 general:boolean;
 criteria:SearchState;
 onCriteriaChange:(s:SearchState)=>void;
 canUseAssistant:boolean;
};

/** Card tìm kiếm nổi trên hero, có tab dịch vụ (mục 4.4). Tab đang chọn không ghi lên URL; mỗi tab giữ state riêng. */
export function ServiceSearchTabs({general,criteria,onCriteriaChange,canUseAssistant}:Props){
 const baseId=useId();
 const [active,setActive]=useState<TabKey>('hotel');
 const [restaurant,setRestaurant]=useState<CatalogDraft>({locationId:'',search:''});
 const [explore,setExplore]=useState<CatalogDraft>({locationId:'',search:''});
 const tabRefs=useRef<(HTMLButtonElement|null)[]>([]);

 const hotelForm=<SharedHotelSearchBar variant="hero" value={criteria} onChange={onCriteriaChange}/>;
 if(!general){
  return (
   <div className="hg-search-card">
    <div className="hg-search-panel">{hotelForm}</div>
   </div>
  );
 }

 const tabId=(k:TabKey)=>baseId+'-tab-'+k;
 const panelId=(k:TabKey)=>baseId+'-panel-'+k;
 const focusTab=(i:number)=>{
  const n=(i+TABS.length)%TABS.length;
  setActive(TABS[n].key);
  tabRefs.current[n]?.focus();
 };
 const onKeyDown=(e:React.KeyboardEvent,i:number)=>{
  if(e.key==='ArrowRight'){e.preventDefault();focusTab(i+1);}
  else if(e.key==='ArrowLeft'){e.preventDefault();focusTab(i-1);}
  else if(e.key==='Home'){e.preventDefault();focusTab(0);}
  else if(e.key==='End'){e.preventDefault();focusTab(TABS.length-1);}
 };

 return (
  <div className="hg-search-card">
   <div className="hg-tabs" role="tablist" aria-label="Chọn dịch vụ">
    {TABS.map(({key,label,Icon},i)=>(
     <button
      key={key}
      ref={el=>{tabRefs.current[i]=el;}}
      id={tabId(key)}
      type="button"
      role="tab"
      className="hg-tab"
      aria-selected={active===key}
      aria-controls={panelId(key)}
      tabIndex={active===key?0:-1}
      onClick={()=>setActive(key)}
      onKeyDown={e=>onKeyDown(e,i)}
     >
      <Icon aria-hidden="true"/>
      <span>{label}</span>
     </button>
    ))}
   </div>
   <div className="hg-search-panel" role="tabpanel" id={panelId(active)} aria-labelledby={tabId(active)}>
    {active==='hotel'&&hotelForm}
    {active==='restaurant'&&(
     <CatalogPanel
      path="/restaurants"
      draft={restaurant}
      onDraft={setRestaurant}
      inputLabel="Tên nhà hàng, món ăn"
      placeholder="Ví dụ: bún chả, hải sản…"
      submitLabel="Tìm nhà hàng"
     />
    )}
    {active==='explore'&&(
     <CatalogPanel
      path="/explore"
      draft={explore}
      onDraft={setExplore}
      inputLabel="Tên địa điểm, trải nghiệm"
      placeholder="Ví dụ: chợ đêm, bãi biển…"
      submitLabel="Khám phá"
     />
    )}
    {active==='planner'&&(
     <div className="hg-planner-panel">
      <p>Tự sắp xếp điểm đến, thời gian và chi phí cho chuyến đi của bạn.</p>
      <div className="hg-planner-actions">
       <Link className="hg-btn-cta hg-planner-cta" to="/tour-planner">
        <CalendarDays size={20} aria-hidden="true"/>
        Tạo lịch trình
       </Link>
       {canUseAssistant&&(
        <Link className="hg-planner-ai" to="/assistant">
         <Sparkles size={16} aria-hidden="true"/>
         Hỏi Trợ lý AI
         <ArrowRight size={16} aria-hidden="true"/>
        </Link>
       )}
      </div>
     </div>
    )}
   </div>
  </div>
 );
}
