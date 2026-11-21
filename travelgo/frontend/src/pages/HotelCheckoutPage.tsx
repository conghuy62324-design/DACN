import '../styles/hotels.css';
import '../styles/hotelStay.css';
import '../styles/hotelPremium.css';
import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useParams} from 'react-router-dom';
import {ArrowRight,ArrowLeft,LockKeyhole,Check,ChevronDown,Info,AlertTriangle,RefreshCw} from 'lucide-react';
import {useAuth} from '../context/AuthContext';
import {api} from '../services/api';
import {hotelBookingRequest} from '../services/hotelBookingClient';
import {readSearch,stayError} from '../utils/hotelSearchState';
import {HotelPriceBreakdown} from '../components/hotels/HotelPriceBreakdown';
import {HotelBookingSummary,stayDateLabel} from '../components/hotels/HotelBookingSummary';
import {HgPhoto} from '../components/hotels/HotelGallery';
import {vnd} from '../components/hotels/HotelResultCard';
import '../styles/hg-hotel-card.css';
import '../styles/hg-checkout.css';

const mobileQuery='(max-width:767px)';
function useIsMobile(){
 const[mobile,setMobile]=useState(()=>typeof window!=='undefined'&&window.matchMedia(mobileQuery).matches);
 useEffect(()=>{
  const m=window.matchMedia(mobileQuery);
  const fn=()=>setMobile(m.matches);
  fn();
  m.addEventListener('change',fn);
  return()=>m.removeEventListener('change',fn);
 },[]);
 return mobile;
}

function Steps({done}:{done:boolean}){
 const steps=[
  {label:'Chọn phòng',state:'done'},
  {label:'Thông tin & xác nhận',state:done?'done':'current'},
  {label:'Hoàn tất',state:done?'current':'todo'},
 ];
 return <ol className="hg-co-steps" aria-label="Các bước đặt phòng">
  {steps.map((s,i)=><li key={s.label} className={'hg-co-step hg-co-step--'+s.state} aria-current={s.state==='current'?'step':undefined}>
   <span className="hg-co-step__dot" aria-hidden="true">{s.state==='done'?<Check size={16}/>:i+1}</span>
   <span className="hg-co-step__label">{s.label}{s.state==='done'?<span className="hg-sr"> (đã xong)</span>:null}</span>
  </li>)}
 </ol>;
}

export default function HotelCheckoutPage(){
 const{id}=useParams(),location=useLocation(),{user,sessionGeneration}=useAuth(),params=new URLSearchParams(location.search),criteria=readSearch(location.search),rateId=params.get('ratePlanId')||'',promo=params.get('promotionId')||'';
 const [data,setData]=useState<any>(),[selected,setSelected]=useState<any>(),[error,setError]=useState(''),[prepared,setPrepared]=useState<any>(),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[booking,setBooking]=useState<any>(),[unknown,setUnknown]=useState(false),[expired,setExpired]=useState(false),[retry,setRetry]=useState(0),[contact,setContact]=useState({name:'',email:'',phone:'',notes:''});
 const lock=useRef(false),controller=useRef<AbortController>(),keyRef=useRef(''),generation=useRef(sessionGeneration);generation.current=sessionGeneration;
 const storageKey='hotel-stay-intent:'+user?.id+':'+JSON.stringify([id,rateId,criteria.checkIn,criteria.checkOut,criteria.rooms,promo]);
 useEffect(()=>{const c=new AbortController();setData(undefined);setSelected(undefined);setPrepared(undefined);setAccepted(false);setExpired(false);setError('');const invalid=stayError(criteria);if(invalid||!criteria.checkIn||!rateId){setError(invalid||'Cần chọn đủ ngày, khách và gói giá trước khi xem checkout.');return;}void api.get('/hotels/'+id,{params:{checkIn:criteria.checkIn,checkOut:criteria.checkOut,rooms:JSON.stringify(criteria.rooms),offers:'true'},signal:c.signal}).then((r:any)=>{if(c.signal.aborted)return;const room=r.data.rooms.find((x:any)=>x.offers.some((o:any)=>o.ratePlanId===rateId)),offer=room?.offers.find((x:any)=>x.ratePlanId===rateId);const quote=promo?offer?.promotionChoices?.find((p:any)=>p.id===promo)?.quote:offer?.quote;setData(r.data);if(!quote){setError('Gói giá/ưu đãi không còn đáp ứng yêu cầu. Quay lại chọn phòng, không tự thay bằng giá khác.');return;}setSelected({room,offer,quote});}).catch(e=>{if(!c.signal.aborted)setError(e.message||'Chưa tải được báo giá.');});return()=>c.abort();},[id,location.search,retry]);
 useEffect(()=>{controller.current?.abort();setPrepared(undefined);setAccepted(false);setBooking(undefined);setUnknown(false);setError('');setContact({name:user?.fullName||'',email:user?.email||'',phone:user?.phone||'',notes:''});if(user){let saved:any;try{saved=JSON.parse(sessionStorage.getItem(storageKey)||'null');}catch{}keyRef.current=saved?.key||crypto.randomUUID();sessionStorage.setItem(storageKey,JSON.stringify({key:keyRef.current}));}else keyRef.current='';return()=>controller.current?.abort();},[user?.id,sessionGeneration,storageKey]);
 useEffect(()=>{const until=prepared?.validUntil||data?.validUntil;if(!until)return;const timer=setTimeout(()=>{setExpired(true);setPrepared(undefined);setAccepted(false);},Math.max(50,Date.parse(until)-Date.now()+50));return()=>clearTimeout(timer);},[prepared,data]);
 const change=(key:string,value:string)=>{setContact(c=>({...c,[key]:value}));setPrepared(undefined);setAccepted(false);};
 const request=async(action:'prepare'|'confirm'|'status')=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');const captured=sessionGeneration,c=new AbortController();controller.current=c;const timer=setTimeout(()=>c.abort(),15000);try{
  if(action==='prepare'){setAccepted(false);const result=await hotelBookingRequest('/bookings/hotel/'+id+'/prepare',{ratePlanId:rateId,stay:{checkIn:criteria.checkIn,checkOut:criteria.checkOut,rooms:criteria.rooms,...(promo?{promotionId:promo}:{})},contact},keyRef.current,c.signal);if(generation.current===captured){setPrepared(result);setExpired(false);setUnknown(false);}}
  else if(action==='confirm'){if(!accepted||!prepared||Date.now()>=Date.parse(prepared.validUntil))throw{code:'EXPIRED',message:'Cần xem báo giá hợp lệ và chủ động xác nhận lại.'};const result=await hotelBookingRequest('/bookings/hotel/confirm',{confirmation:prepared.confirmation,accepted:true},keyRef.current,c.signal);if(generation.current===captured){setBooking(result);setPrepared(undefined);setAccepted(false);setUnknown(false);sessionStorage.setItem(storageKey,JSON.stringify({key:keyRef.current,bookingId:result.id}));}}
  else{const result=await hotelBookingRequest('/bookings/hotel/intent-status',{idempotencyKey:keyRef.current},undefined,c.signal);if(generation.current===captured){setUnknown(false);if(result){setBooking(result);setPrepared(undefined);setAccepted(false);}else setError('Chưa có đơn đã ghi nhận cho ý định này. Bạn có thể lấy lại báo giá, vẫn giữ cùng mã chống trùng.');}}
 }catch(e:any){if(generation.current!==captured)return;const uncertain=action==='confirm'&&(e.name==='AbortError'||e instanceof TypeError);if(uncertain){setUnknown(true);setError('Chưa rõ đơn đã được ghi nhận hay chưa. Hãy kiểm tra đơn trước khi thử lại; không tạo mã ý định khác.');}else{setError(e.message||'Chưa hoàn thành yêu cầu.');if(action==='confirm'){setPrepared(undefined);setAccepted(false);}}}finally{clearTimeout(timer);lock.current=false;if(generation.current===captured)setBusy(false);}};
 const stay=prepared?.snapshot,quote=stay?.quote||selected?.quote;
 const mobile=useIsMobile();
 const[summaryOpen,setSummaryOpen]=useState(false);

 const errorNotice=error&&<div className="hg-notice hg-notice--error hg-co-error" role="alert">
  <AlertTriangle size={16} aria-hidden="true"/>
  <p>{error}</p>
 </div>;

 const summaryBody=data&&selected?<>
  {data.hotelMedia[0]&&<div className="hg-co-sum__photo">
   <HgPhoto src={data.hotelMedia[0].url} alt={data.hotelMedia[0].altText||data.identity.name} lazy={false}/>
  </div>}
  <div className="hg-co-sum__inner">
   <p className="hg-co-sum__eyebrow">Lựa chọn của bạn</p>
   <h2 className="hg-co-sum__hotel">{data.identity.name}</h2>
   {data.address?.fullAddress&&<p className="hg-co-sum__address">{data.address.fullAddress}</p>}
   <hr/>
   <h3 className="hg-co-sum__room">{selected.room.name}</h3>
   {selected.offer.terms?.name&&<p className="hg-co-sum__rate">{selected.offer.terms.name}</p>}
   <div className="hg-co-sum__dates">
    <div><span>Nhận phòng</span><b>{stayDateLabel(criteria.checkIn)}</b></div>
    <div><span>Trả phòng</span><b>{stayDateLabel(criteria.checkOut)}</b></div>
   </div>
   <p className="hg-co-sum__stay">{quote?.nights} đêm · {criteria.rooms.length} phòng</p>
   <ul className="hg-co-sum__guests">
    {criteria.rooms.map((r:any,i:number)=><li key={i}>Phòng {i+1}: {r.adults} người lớn{r.childAges.length?', trẻ em tuổi '+r.childAges.join(', '):''}</li>)}
   </ul>
   <hr/>
   {quote&&!expired?<HotelPriceBreakdown quote={quote}/>:<p className="hg-notice"><Info size={16} aria-hidden="true"/><span>Chưa có tổng giá còn hiệu lực. Hãy kiểm tra lại.</span></p>}
   {selected.offer.terms?.cancellation?.terms&&<p className="hg-co-sum__terms">{selected.offer.terms.cancellation.terms}</p>}
   <p className="hg-notice hg-notice--info hg-co-sum__pay"><Info size={16} aria-hidden="true"/><span>Chưa thanh toán. Không có cổng thanh toán/thẻ trong bước này.</span></p>
  </div>
 </>:!data&&!error?<div className="hg-co-sum__inner" role="status" aria-label="Đang tải lựa chọn">
  <span className="hg-skel hg-co-skel--photo" aria-hidden="true"/>
  <span className="hg-skel hg-co-skel--line" aria-hidden="true"/>
  <span className="hg-skel hg-co-skel--line hg-co-skel--short" aria-hidden="true"/>
  <span className="hg-skel hg-co-skel--block" aria-hidden="true"/>
  <span className="hg-sr">Đang tải lựa chọn…</span>
 </div>:null;

 const summary=summaryBody&&(mobile
  ?<details className="hg-co-sum hg-co-sum--acc" open={summaryOpen} onToggle={e=>setSummaryOpen(e.currentTarget.open)}>
   <summary>
    <span>Tóm tắt đặt phòng</span>
    {quote&&!expired&&<b>{vnd(quote.totalVnd)}</b>}
    <ChevronDown size={18} aria-hidden="true"/>
   </summary>
   {summaryBody}
  </details>
  :<aside className="hg-co-sum" aria-label="Tóm tắt đặt phòng">{summaryBody}</aside>);

 return <div className="hotel-ui hd-checkout-page hg-scope hg-page-checkout">
  <div className="hg-container">
   <nav className="hg-breadcrumb" aria-label="Đường dẫn trang">
    <Link to={'/places/'+id+'?hotel=1&'+location.search.slice(1)}><ArrowLeft size={14} aria-hidden="true"/>Quay lại khách sạn</Link>
   </nav>
   <Steps done={!!booking}/>
   <header className="hg-co-heading">
    <h1>{booking?'Đơn đặt phòng của bạn':'Xem lại lựa chọn & xác nhận'}</h1>
    <p>Chỉ xác nhận sau khi bạn đã xem giá, thông tin khách và điều kiện.</p>
   </header>
   {booking?<div className="hg-co-done">
    <p className="hg-notice hg-notice--success" role="status">
     <Check size={16} aria-hidden="true"/>
     <span>{booking.idempotentReplay?'Đơn này đã được ghi nhận trước đó; đây là bản lưu đã xác nhận, không tạo đơn thứ hai.':'Đã ghi nhận đặt phòng thử nghiệm. Đơn đang chờ cơ sở xác nhận và chưa thanh toán.'}</span>
    </p>
    <HotelBookingSummary booking={booking} onCancel={async bid=>{const result=await hotelBookingRequest('/bookings/'+bid+'/cancel',{},undefined);setBooking(result);}}/>
    <div className="hg-co-after">
     <Link className="hg-btn hg-btn--cta hg-btn--lg" to="/bookings">Xem đơn của tôi<ArrowRight size={16} aria-hidden="true"/></Link>
     <button type="button" className="hg-btn hg-btn--outline hg-btn--lg" onClick={()=>{keyRef.current=crypto.randomUUID();sessionStorage.setItem(storageKey,JSON.stringify({key:keyRef.current}));setBooking(undefined);setPrepared(undefined);setAccepted(false);setRetry(v=>v+1);}}>Bắt đầu một đơn mới</button>
    </div>
   </div>:<div className="hg-co-layout">
    {summary}
    <section className="hg-co-main" aria-label="Thông tin đặt phòng">
     {!user?<div className="hg-co-block hg-co-login">
      <LockKeyhole size={32} aria-hidden="true"/>
      <h2>Đăng nhập để tiếp tục</h2>
      <p>Lựa chọn ngày, khách và gói giá được giữ khi quay lại. Đăng nhập không tự tạo đơn.</p>
      <Link to="/login" state={{from:location.pathname+location.search}} className="hg-btn hg-btn--cta hg-btn--lg">Đăng nhập</Link>
     </div>:!user.roles.includes('CUSTOMER')?<div role="alert" className="hg-notice hg-notice--error">
      <AlertTriangle size={16} aria-hidden="true"/>
      <p>Cần tài khoản khách hàng (CUSTOMER) để tạo đặt phòng. Không dùng tài khoản quản trị/đối tác thay khách.</p>
     </div>:<>
      <div className="hg-co-block">
       <h2>Thông tin liên hệ</h2>
       <p className="hg-co-block__sub">Sửa thông tin đơn không thay đổi hồ sơ tài khoản.</p>
       <div className="hg-co-grid">
        <label className="hg-co-field hg-co-field--full">
         <span>Họ tên</span>
         <input aria-label="Họ tên liên hệ" autoComplete="name" value={contact.name} maxLength={120} onChange={e=>change('name',e.target.value)}/>
        </label>
        <label className="hg-co-field">
         <span>Email</span>
         <input aria-label="Email liên hệ" type="email" autoComplete="email" value={contact.email} maxLength={255} onChange={e=>change('email',e.target.value)}/>
        </label>
        <label className="hg-co-field">
         <span>Số điện thoại</span>
         <input aria-label="Điện thoại liên hệ" type="tel" autoComplete="tel" value={contact.phone} maxLength={20} onChange={e=>change('phone',e.target.value)}/>
        </label>
       </div>
      </div>
      <div className="hg-co-block">
       <h2>Yêu cầu đặc biệt <span className="hg-co-optional">(không bắt buộc)</span></h2>
       <label className="hg-co-field">
        <span className="hg-sr">Yêu cầu đặc biệt</span>
        <textarea aria-label="Yêu cầu đặc biệt" value={contact.notes} maxLength={2000} onChange={e=>change('notes',e.target.value)}/>
       </label>
       <div className="hg-co-note-row">
        <small>Chỉ là yêu cầu, chưa có nghĩa cơ sở đã chấp thuận.</small>
        <small className="hg-co-counter" aria-live="polite">{contact.notes.length}/2000</small>
       </div>
      </div>
      <div className="hg-co-block">
       <h2>Kiểm tra & xác nhận</h2>
       {expired&&!booking&&<div className="hg-notice hg-co-gap" role="alert">
        <Info size={16} aria-hidden="true"/>
        <p>Báo giá/xác nhận đã hết hiệu lực; giá cũ không được dùng để đặt.</p>
        <button type="button" className="hg-btn hg-btn--outline" onClick={()=>{setRetry(v=>v+1);setExpired(false);}}><RefreshCw size={16} aria-hidden="true"/>Lấy lại báo giá</button>
       </div>}
       {data&&!data.bookingEnabled&&<p className="hg-notice hg-notice--info hg-co-gap">
        <Info size={16} aria-hidden="true"/>
        <span>Bản xem trước chỉ đọc. Bạn có thể xem checkout; nút xác nhận chưa có quyền ghi đơn đặt phòng.</span>
       </p>}
       {!prepared?<button type="button" disabled={busy||!selected||expired||!data?.bookingEnabled||unknown} className="hg-btn hg-btn--cta hg-btn--lg hg-co-primary" onClick={()=>void request('prepare')}>{busy?'Đang kiểm tra…':'Kiểm tra giá & điều kiện'}</button>:<section className="hg-co-review" aria-label="Xác nhận lựa chọn">
        <h3>Xác nhận lựa chọn</h3>
        <p className="hg-co-review__ok"><Check size={17} aria-hidden="true"/>Báo giá vừa kiểm tra từ server. Chưa giữ phòng hoặc tạo đơn.</p>
        <p>{stay.cancellation.terms}</p>
        {stay.cancellation.deadlineAt&&<p className="hg-co-review__deadline">Hạn hủy miễn phí: {new Date(stay.cancellation.deadlineAt).toLocaleString('vi-VN')}</p>}
        <label className="hg-co-accept">
         <input type="checkbox" aria-label="Đồng ý giá và điều kiện đặt phòng" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>
         <span>Tôi đã xem thông tin, tổng giá và chính sách; tôi chủ động xác nhận đặt phòng này.</span>
        </label>
        <button type="button" className="hg-btn hg-btn--cta hg-btn--lg hg-co-primary" disabled={!accepted||busy||expired} onClick={()=>void request('confirm')}>{busy?'Đang ghi nhận…':'Xác nhận đặt phòng'}</button>
       </section>}
       {errorNotice}
       <button type="button" className="hg-link hg-co-status" disabled={busy} onClick={()=>void request('status')}>Kiểm tra đơn đã gửi</button>
      </div>
     </>}
     {(!user||!user.roles.includes('CUSTOMER'))&&errorNotice}
    </section>
   </div>}
  </div>
 </div>;
}
