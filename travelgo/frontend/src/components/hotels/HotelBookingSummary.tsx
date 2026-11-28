import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Info,AlertTriangle} from 'lucide-react';
import {HotelPriceBreakdown,stayDateLabel} from './HotelPriceBreakdown';
import '../../styles/hg-hotel-card.css';
import '../../styles/hg-checkout.css';

const statuses:Record<string,string>={PENDING:'Đã ghi nhận · chờ cơ sở xác nhận',CONFIRMED:'Cơ sở đã xác nhận',COMPLETED:'Đã hoàn thành lưu trú',CANCELLED:'Đã hủy',REJECTED:'Cơ sở từ chối'};
const tone:Record<string,string>={PENDING:'warn',CONFIRMED:'ok',COMPLETED:'ok',CANCELLED:'bad',REJECTED:'bad'};
export {stayDateLabel};

export function HotelBookingSummary({booking:b,onCancel,partner=false}:{booking:any;onCancel?:(id:string)=>Promise<any>;partner?:boolean}){
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState('');
 const[confirmCancel,setConfirmCancel]=useState(false);
 const s=b.hotelStay;
 if(!s)return null;
 const cancellable=['PENDING','CONFIRMED'].includes(b.bookingStatus);
 return <article className="hg-scope hg-booking" data-booking-id={b.id}>
  <header className="hg-booking__head">
   <div>
    <small>Mã đặt phòng</small>
    <h2>{b.bookingCode}</h2>
   </div>
   <span className={'hg-booking__status hg-booking__status--'+(tone[b.bookingStatus]||'neutral')}>{statuses[b.bookingStatus]||b.bookingStatus}</span>
  </header>
  <div className="hg-booking__body">
   <div className="hg-booking__info">
    <h3>{s.hotel.name}</h3>
    {s.hotel.address?.fullAddress&&<p className="hg-booking__address">{s.hotel.address.fullAddress}</p>}
    <dl className="hg-booking__dl">
     <div><dt>Hạng phòng</dt><dd>{s.room.name}</dd></div>
     <div><dt>Gói giá</dt><dd>{s.rate.name}</dd></div>
     <div><dt>Nhận phòng</dt><dd>{stayDateLabel(s.quote.checkIn)}</dd></div>
     <div><dt>Trả phòng</dt><dd>{stayDateLabel(s.quote.checkOut)}</dd></div>
     <div><dt>Số đêm / số phòng</dt><dd>{s.quote.nights} đêm · {s.quote.roomCount} phòng</dd></div>
     <div><dt>Khách lưu trú</dt><dd>{s.quote.adults} người lớn · {s.quote.children} trẻ em</dd></div>
    </dl>
    <details className="hg-booking__details">
     <summary>Phân bổ khách theo phòng</summary>
     {s.occupancy.map((r:any,i:number)=><p key={i}>Phòng {i+1}: {r.adults} người lớn{r.childAges.length?', tuổi trẻ em: '+r.childAges.join(', '):', không có trẻ em'}</p>)}
    </details>
    <h4>Điều kiện hủy đã xác nhận</h4>
    <p>{s.cancellation.terms}</p>
    {s.cancellation.deadlineAt&&<p className="hg-booking__deadline">Hạn hủy miễn phí: {new Date(s.cancellation.deadlineAt).toLocaleString('vi-VN')}</p>}
    <p className="hg-notice hg-notice--info">
     <Info size={16} aria-hidden="true"/>
     <span>Chưa thanh toán · Không thu tiền trực tuyến ở bước đặt phòng.</span>
    </p>
    <p className="hg-booking__muted">Yêu cầu đặc biệt: {b.notes||'Không có'} · không đồng nghĩa đã được cơ sở chấp thuận.</p>
    {!partner&&<p className="hg-booking__muted">Liên hệ của đơn: {b.customerName} · {b.customerEmail} · {b.customerPhone}</p>}
   </div>
   <div className="hg-booking__price">
    <HotelPriceBreakdown quote={s.quote}/>
   </div>
  </div>
  {error&&<p className="hg-notice hg-notice--error" role="alert"><AlertTriangle size={16} aria-hidden="true"/><span>{error}</span></p>}
  <footer className="hg-booking__foot">
   <p className="hg-booking__muted">Giá/điều kiện là bản lưu tại thời điểm xác nhận; không thay bằng giá hiện tại.</p>
   {!s.cancellationAllowed&&cancellable&&<p className="hg-booking__muted">Không đủ điều kiện hủy tự động theo chính sách đã lưu. Không tự khẳng định hoàn tiền.</p>}
   <div className="hg-booking__actions">
    <Link to={'/places/'+s.hotel.id+'?hotel=1'} className="hg-link">Xem lại khách sạn</Link>
    {!partner&&onCancel&&s.cancellationAllowed&&cancellable&&<button type="button" className="hg-btn hg-btn--danger" disabled={busy} onClick={()=>setConfirmCancel(true)}>Hủy đặt phòng</button>}
   </div>
  </footer>
  {confirmCancel&&<div className="hg-booking__cancel" role="group" aria-label="Xác nhận hủy">
   <p>Hủy đơn theo điều kiện miễn phí đã lưu? Tồn từng đêm sẽ được trả lại. Đơn không bị xóa và không có giao dịch hoàn tiền.</p>
   <div className="hg-booking__cancel-actions">
    <button type="button" className="hg-btn hg-btn--ghost" disabled={busy} onClick={()=>setConfirmCancel(false)}>Giữ đơn</button>
    <button type="button" className="hg-btn hg-btn--danger-solid" disabled={busy} onClick={()=>{setBusy(true);setError('');void onCancel!(b.id).then(()=>setConfirmCancel(false)).catch(e=>setError(e.message||'Chưa hủy được đặt phòng.')).finally(()=>setBusy(false));}}>{busy?'Đang hủy…':'Xác nhận hủy đặt phòng'}</button>
   </div>
  </div>}
 </article>;
}
