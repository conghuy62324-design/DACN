import {HotelDateRange} from './HotelDateRange';
import {useEffect,useRef,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {Search,Users,Minus,Plus,X,AlertCircle} from 'lucide-react';
import {LocationCombobox} from '../common/LocationCombobox';
import {searchHref,stayError,type SearchState} from '../../utils/hotelSearchState';
import {api} from '../../services/api';
import '../../styles/hg-search-form.css';

export type HotelSearchBarVariant='hero'|'bar';

type Props={
 value:SearchState;
 onChange:(s:SearchState)=>void;
 onSearch?:(s:SearchState)=>void;
 /** 'hero' (mặc định): trang chủ, /hotels. 'bar': trang kết quả, trang chi tiết. */
 variant?:HotelSearchBarVariant;
 /** Nhãn nút gửi. Mặc định 'Tìm kiếm'; trang chi tiết dùng 'Cập nhật giá'. */
 submitLabel?:string;
};

function Counter({label,value,min,max,onChange}:{label:string;value:number;min:number;max:number;onChange:(n:number)=>void}){
 return (
  <div className="hg-counter">
   <button
    type="button"
    aria-label={'Giảm '+label}
    disabled={value<=min}
    onClick={()=>onChange(Math.max(min,value-1))}
   >
    <Minus size={16}/>
   </button>
   <output aria-live="polite" aria-label={label}>{value}</output>
   <button
    type="button"
    aria-label={'Tăng '+label}
    disabled={value>=max}
    onClick={()=>onChange(Math.min(max,value+1))}
   >
    <Plus size={16}/>
   </button>
  </div>
 );
}

export function SharedHotelSearchBar({value,onChange,onSearch,variant='hero',submitLabel='Tìm kiếm'}:Props){
 const navigate=useNavigate();
 const [guests,setGuests]=useState(false);
 const [error,setError]=useState('');
 const [suggestions,setSuggestions]=useState<any[]>([]);
 const [suggestOpen,setSuggestOpen]=useState(false);
 const [active,setActive]=useState(0);
 const [suggestStatus,setSuggestStatus]=useState('');
 const ref=useRef<HTMLDivElement>(null);
 const guestTrigger=useRef<HTMLButtonElement>(null);
 const update=(k:string,v:any)=>onChange({...value,[k]:v,page:'1'});
 const adults=value.rooms?.reduce((n,r)=>n+r.adults,0)||0;
 const children=value.rooms?.reduce((n,r)=>n+r.childAges.length,0)||0;

 useEffect(()=>{
  if(!suggestOpen||value.nameOrAddress.length<2){setSuggestions([]);return;}
  const c=new AbortController();
  setSuggestStatus('Đang tìm khách sạn…');
  const timer=setTimeout(()=>{
   void api.get('/hotels',{params:{nameOrAddress:value.nameOrAddress,...(value.locationId?{locationId:value.locationId}:{}),limit:5},signal:c.signal})
    .then((r:any)=>{if(!c.signal.aborted){setSuggestions(r.data.items);setSuggestStatus(r.data.items.length?'':'Chưa có nơi lưu trú khớp từ khóa.');setActive(0);}})
    .catch(()=>{if(!c.signal.aborted){setSuggestions([]);setSuggestStatus('Chưa tải được gợi ý. Bạn vẫn có thể nhập từ khóa để tìm kiếm.');}});
  },240);
  return()=>{c.abort();clearTimeout(timer);};
 },[value.nameOrAddress,value.locationId,suggestOpen]);

 useEffect(()=>{
  if(!guests)return;
  const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){setGuests(false);guestTrigger.current?.focus();}};
  window.addEventListener('keydown',close);
  return()=>window.removeEventListener('keydown',close);
 },[guests]);

 const roomUpdate=(i:number,k:string,v:any)=>update('rooms',value.rooms.map((r,j)=>j===i?{...r,[k]:v}:r));
 const submit=(e:React.FormEvent)=>{
  e.preventDefault();
  const err=stayError(value);
  setError(err);
  if(err)return;
  setSuggestOpen(false);
  setGuests(false);
  if(onSearch)onSearch(value);
  else navigate(searchHref(value));
 };
 const select=(item:any)=>{
  onChange({...value,nameOrAddress:item.identity.name,locationId:item.address?.tourismDestinationId||item.address?.provinceCode||value.locationId,page:'1'});
  setSuggestOpen(false);
 };
 const closeGuests=()=>{setGuests(false);guestTrigger.current?.focus();};
 // Lỗi ngày → viền ô ngày; lỗi phòng/khách → viền ô khách.
 const dateInvalid=!!error&&/ngày|đêm/i.test(error);
 const guestsInvalid=!!error&&!dateInvalid;
 const nights=value.checkIn&&value.checkOut>value.checkIn?(Date.parse(value.checkOut)-Date.parse(value.checkIn))/86400000:0;

 return (
  <form className={'hotel-search-form hg-search hg-search--'+variant} onSubmit={submit} aria-label="Tìm nơi lưu trú">
   <div className="hotel-search-grid hg-search-grid">
    <div className="hg-field hg-field--location">
     <LocationCombobox label="Điểm đến" value={value.locationId||'all'} onChange={v=>update('locationId',v==='all'?'':v)}/>
    </div>
    <div className="hotel-name-input hg-field hg-field--name">
     <label className="hg-field-box">
      <span className="hotel-field-label">Tên khách sạn / khu vực</span>
      <input
       role="combobox"
       aria-label="Tên khách sạn hoặc khu vực"
       aria-expanded={suggestOpen&&!!suggestions.length}
       aria-controls="hotel-suggestions"
       autoComplete="off"
       value={value.nameOrAddress}
       onFocus={()=>setSuggestOpen(true)}
       onBlur={()=>setTimeout(()=>setSuggestOpen(false),150)}
       onChange={e=>{update('nameOrAddress',e.target.value);setSuggestOpen(true);}}
       onKeyDown={e=>{
        if(e.key==='ArrowDown'){e.preventDefault();setActive(i=>Math.min(i+1,suggestions.length-1));}
        if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>Math.max(0,i-1));}
        if(e.key==='Escape')setSuggestOpen(false);
        if(e.key==='Enter'&&suggestOpen&&suggestions[active]){e.preventDefault();select(suggestions[active]);}
       }}
       placeholder="Tên, đường, khu vực…"
      />
     </label>
     {suggestOpen&&value.nameOrAddress.length>=2&&(
      <div id="hotel-suggestions" role="listbox" className="hotel-suggestions hg-suggestions">
       {suggestStatus&&<p role="status" className="hotel-muted hg-suggestions-status">{suggestStatus}</p>}
       {suggestions.map((h,i)=>(
        <button key={h.identity.id} type="button" role="option" aria-selected={i===active} onMouseDown={e=>e.preventDefault()} onClick={()=>select(h)}>
         <b>{h.identity.name}</b>
         <small>{h.address?.fullAddress}</small>
        </button>
       ))}
      </div>
     )}
    </div>
    <div className="hg-field hg-field--date" data-invalid={dateInvalid||undefined}>
     <HotelDateRange
      checkIn={value.checkIn}
      checkOut={value.checkOut}
      onOpen={()=>{setGuests(false);setSuggestOpen(false);}}
      onApply={(checkIn,checkOut)=>onChange({...value,checkIn,checkOut,page:'1'})}
     />
    </div>
    <div className="hotel-guests hg-field hg-field--guests" ref={ref} data-invalid={guestsInvalid||undefined}>
     <span className="hotel-field-label">Khách & phòng</span>
     <button
      ref={guestTrigger}
      aria-expanded={guests}
      aria-controls="guest-panel"
      className="hotel-guest-trigger hg-trigger"
      type="button"
      onClick={()=>setGuests(!guests)}
     >
      <Users size={18} aria-hidden="true"/>
      <span className="hg-trigger-text">
       <b>{adults} người lớn{children?`, ${children} trẻ`:''}</b>
       <small>{value.rooms?.length||0} phòng{nights?` · ${nights} đêm`:''}</small>
      </span>
     </button>
     {guests&&(
      <>
       <button type="button" className="guest-backdrop hg-guest-backdrop" aria-label="Đóng chọn khách" onClick={()=>setGuests(false)}/>
       <section id="guest-panel" role="dialog" aria-modal="false" aria-label="Phân bổ khách theo phòng" className="hotel-guest-panel hg-guest-panel">
        <div className="hotel-panel-title hg-guest-head">
         <b>Khách & phòng</b>
         <button type="button" aria-label="Đóng bảng khách" onClick={closeGuests}><X size={20}/></button>
        </div>
        <p className="hg-guest-note">Chọn chính xác từng phòng. Không tự suy tuổi trẻ em.</p>
        {value.rooms.map((r,i)=>(
         <fieldset key={i} className="hg-guest-room">
          <legend>Phòng {i+1}</legend>
          <div className="hg-guest-row">
           <span>Người lớn</span>
           <Counter label={`người lớn phòng ${i+1}`} value={r.adults} min={1} max={20} onChange={n=>roomUpdate(i,'adults',n)}/>
          </div>
          <div className="hg-guest-row">
           <span>Trẻ em<small>0–17 tuổi</small></span>
           <Counter
            label={`trẻ em phòng ${i+1}`}
            value={r.childAges.length}
            min={0}
            max={10}
            onChange={n=>{const count=Math.max(0,Math.min(10,n));roomUpdate(i,'childAges',Array.from({length:count},(_,j)=>r.childAges[j]??null));}}
           />
          </div>
          {r.childAges.length>0&&(
           <div className="hg-guest-ages">
            {r.childAges.map((a,j)=>(
             <label key={j}>
              <span>Tuổi trẻ {j+1}</span>
              <select
               aria-label={`Tuổi trẻ ${j+1} phòng ${i+1}`}
               value={a??''}
               onChange={e=>roomUpdate(i,'childAges',r.childAges.map((v,k)=>j===k?(e.target.value===''?null:Number(e.target.value)):v))}
              >
               <option value="">Chọn tuổi</option>
               {Array.from({length:18},(_,k)=><option key={k} value={k}>{k} tuổi</option>)}
              </select>
             </label>
            ))}
           </div>
          )}
          {value.rooms.length>1&&(
           <button type="button" className="hotel-text-button hg-guest-remove" onClick={()=>update('rooms',value.rooms.filter((_,j)=>i!==j))}>Bỏ phòng {i+1}</button>
          )}
         </fieldset>
        ))}
        <div className="hotel-panel-actions hg-guest-foot">
         <button
          className="hg-guest-add"
          disabled={value.rooms.length>=10}
          type="button"
          onClick={()=>update('rooms',[...value.rooms,{adults:1,childAges:[]}])}
         >
          <Plus size={16}/>Thêm phòng
         </button>
         <button className="hg-btn-navy" type="button" onClick={closeGuests}>Xong</button>
        </div>
       </section>
      </>
     )}
    </div>
    <button type="submit" className="hotel-primary hotel-search-submit hg-search-submit">
     <Search size={20} aria-hidden="true"/>
     <span>{submitLabel}</span>
    </button>
   </div>
   {error&&(
    <p role="alert" className="hotel-form-error hg-search-error">
     <AlertCircle size={16} aria-hidden="true"/>
     {error}
    </p>
   )}
  </form>
 );
}
