import {useEffect,useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {HotelDialog} from './HotelDialog';
import '../../styles/hg-search-form.css';

const iso=(d:Date)=>d.toISOString().slice(0,10);
const display=(v:string)=>v?v.split('-').reverse().join('/'):'Chọn ngày';
const MOBILE_QUERY='(max-width: 767px)';
const MOBILE_MONTHS=6;

function useIsMobile(){
 const read=()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia(MOBILE_QUERY).matches;
 const [mobile,setMobile]=useState(read);
 useEffect(()=>{
  if(typeof window.matchMedia!=='function')return;
  const media=window.matchMedia(MOBILE_QUERY);
  const change=()=>setMobile(media.matches);
  change();
  media.addEventListener('change',change);
  return()=>media.removeEventListener('change',change);
 },[]);
 return mobile;
}

export function HotelDateRange({checkIn,checkOut,onApply,onOpen}:{checkIn:string;checkOut:string;onApply:(start:string,end:string)=>void;onOpen:()=>void}){
 const [open,setOpen]=useState(false);
 const [start,setStart]=useState(checkIn);
 const [end,setEnd]=useState(checkOut);
 const [month,setMonth]=useState(checkIn.slice(0,7));
 const mobile=useIsMobile();
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh'}).format(new Date());
 const nights=start&&end?(Date.parse(end)-Date.parse(start))/86400000:0;
 const begin=()=>{onOpen();setStart(checkIn);setEnd(checkOut);setMonth((checkIn||today).slice(0,7));setOpen(true);};
 const move=(n:number)=>setMonth(iso(new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-1+n,1))).slice(0,7));
 const pick=(day:string)=>{if(!start||end||day<=start){setStart(day);setEnd('');}else setEnd(day);};

 const calendar=(offset:number)=>{
  const first=new Date(Date.UTC(Number(month.slice(0,4)),Number(month.slice(5,7))-1+offset,1));
  const count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  const blank=(first.getUTCDay()+6)%7;
  return (
   <section className="hg-cal-month" key={offset}>
    <h3>{first.toLocaleDateString('vi-VN',{month:'long',year:'numeric',timeZone:'UTC'})}</h3>
    <div className="hg-cal-grid">
     {['T2','T3','T4','T5','T6','T7','CN'].map(w=><span className="hg-cal-weekday" key={w}>{w}</span>)}
     {Array.from({length:blank},(_,i)=><span key={'blank'+i}/>)}
     {Array.from({length:count},(_,i)=>{
      const day=iso(new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth(),i+1)));
      const selected=day===start||day===end;
      const tooLong=!!start&&!end&&day>start&&(Date.parse(day)-Date.parse(start))/86400000>90;
      const cls=[
       selected?'is-selected':'',
       start&&end&&day>start&&day<end?'is-between':'',
       day===start&&end?'is-start':'',
       day===end&&start?'is-end':'',
       day===today?'is-today':'',
      ].filter(Boolean).join(' ');
      return (
       <button
        type="button"
        key={day}
        aria-label={display(day)}
        aria-pressed={selected}
        disabled={day<today||tooLong}
        className={cls}
        onClick={()=>pick(day)}
       >
        {i+1}
       </button>
      );
     })}
    </div>
   </section>
  );
 };

 const footer=(
  <div className="hg-cal-footer">
   <button type="button" className="hg-cal-clear" onClick={()=>{onApply('','');setOpen(false);}}>Xóa ngày</button>
   <span className="hg-cal-summary">{nights>0?nights+' đêm':'Chọn ngày nhận, sau đó chọn ngày trả'}</span>
   <button
    type="button"
    className="hg-btn-cta hg-cal-apply"
    disabled={!start||!end||nights<1||nights>90}
    onClick={()=>{onApply(start,end);setOpen(false);}}
   >
    Áp dụng
   </button>
  </div>
 );

 return (
  <div className="hg-date-field">
   <span className="hotel-field-label">Ngày nhận — trả phòng</span>
   <button type="button" className="hg-trigger" aria-label="Chọn ngày nhận và trả phòng" aria-haspopup="dialog" onClick={begin}>
    <CalendarDays size={18} aria-hidden="true"/>
    <span className="hg-trigger-text">
     <b>
      {display(checkIn)}
      <span className="hg-date-sep" aria-hidden="true">→</span>
      {display(checkOut)}
     </b>
     <small>{checkIn&&checkOut?(Date.parse(checkOut)-Date.parse(checkIn))/86400000+' đêm':'Chọn kỳ nghỉ của bạn'}</small>
    </span>
   </button>
   {open&&(
    <HotelDialog
     title="Chọn ngày cho kỳ nghỉ"
     wide
     variant={mobile?'fullscreen':'default'}
     className="hg-cal-dialog"
     onClose={()=>setOpen(false)}
     footer={footer}
    >
     <div className="hg-cal">
      <div className="hg-cal-toolbar">
       <button type="button" aria-label="Tháng trước" disabled={month<=today.slice(0,7)} onClick={()=>move(-1)}>
        <ChevronLeft size={20}/>
       </button>
       <p>
        <span>Nhận phòng <b>{display(start)}</b></span>
        <span aria-hidden="true">→</span>
        <span>Trả phòng <b>{display(end)}</b></span>
       </p>
       <button type="button" aria-label="Tháng sau" onClick={()=>move(1)}>
        <ChevronRight size={20}/>
       </button>
      </div>
      <div className={'hg-cal-months'+(mobile?' hg-cal-months--stack':'')}>
       {mobile?Array.from({length:MOBILE_MONTHS},(_,i)=>calendar(i)):[calendar(0),calendar(1)]}
      </div>
     </div>
    </HotelDialog>
   )}
  </div>
 );
}
