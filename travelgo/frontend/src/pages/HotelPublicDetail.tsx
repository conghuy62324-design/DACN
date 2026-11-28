import '../styles/hotels.css';
import '../styles/hotelStay.css';
import '../styles/hotelPremium.css';
import {useEffect,useRef,useState} from 'react';
import {Link,useLocation,useNavigate,useParams} from 'react-router-dom';
import {ArrowRight,ArrowLeft,ChevronRight,ChevronDown,MapPin,Share2,Check,Clock,Users,BedDouble,Maximize,DoorOpen,Eye,Minus,Info,AlertTriangle,Wifi,Waves,CircleParking,ArrowUpDown,Dumbbell,Sparkles,UtensilsCrossed,ConciergeBell,Baby,PawPrint,CigaretteOff,FileText,RefreshCw} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {api} from '../services/api';
import {readSearch,searchHref,searchParams,stayError,type SearchState} from '../utils/hotelSearchState';
import {SharedHotelSearchBar} from '../components/hotels/SharedHotelSearchBar';
import {roomViews,vnd,amenityLabels,hotelTypes,ratingText} from '../components/hotels/HotelResultCard';
import {HotelGallery} from '../components/hotels/HotelGallery';
import {HotelDialog} from '../components/hotels/HotelDialog';
import {HotelPriceBreakdown} from '../components/hotels/HotelPriceBreakdown';
import '../styles/hg-hotel-card.css';
import '../styles/hg-detail.css';

const propertyLabels:Record<string,string>={WIFI:'Wi-Fi khu vực chung',POOL:'Hồ bơi',PARKING:'Bãi đỗ xe',ELEVATOR:'Thang máy',GYM:'Phòng tập',SPA:'Spa',RESTAURANT:'Nhà hàng',RECEPTION:'Lễ tân',FAMILY:'Dịch vụ gia đình'};
const propertyIcons:Record<string,LucideIcon>={WIFI:Wifi,POOL:Waves,PARKING:CircleParking,ELEVATOR:ArrowUpDown,GYM:Dumbbell,SPA:Sparkles,RESTAURANT:UtensilsCrossed,RECEPTION:ConciergeBell,FAMILY:Baby};
const policyLabels:Record<string,string>={children:'Trẻ em',pets:'Thú cưng',smoking:'Hút thuốc',general:'Quy định chung'};
const policyIcons:Record<string,LucideIcon>={children:Baby,pets:PawPrint,smoking:CigaretteOff,general:FileText};
const known=(value:any)=>value===true?'Có':value===false?'Không':'Chưa cung cấp';
const bedLabels:Record<string,string>={SINGLE:'giường đơn',DOUBLE:'giường đôi',QUEEN:'giường Queen',KING:'giường King',BUNK:'giường tầng',SOFA_BED:'sofa giường'};
const sections:[string,string][]=[['overview','Tổng quan'],['rooms','Hạng phòng & giá'],['amenities','Tiện nghi'],['information','Vị trí & thông tin'],['policies','Quy định'],['reviews','Đánh giá']];
const RATE_PREVIEW=3;
const REVIEW_PAGE=5;
const cut=(s:string,n:number)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;

export function HotelPublicDetail(){
 const{id}=useParams(),location=useLocation(),navigate=useNavigate(),[draft,setDraft]=useState(()=>readSearch(location.search)),[data,setData]=useState<any>(),[error,setError]=useState(''),[refresh,setRefresh]=useState(0),[expired,setExpired]=useState(false),[dirty,setDirty]=useState(false),[roomModal,setRoomModal]=useState<any>(),[promotions,setPromotions]=useState<Record<string,string>>({}),[reviewData,setReviewData]=useState<any[]>([]),[reviewError,setReviewError]=useState(''),[share,setShare]=useState('');const expires=useRef(0);
 useEffect(()=>{const c=new AbortController(),criteria=readSearch(location.search);setDraft(criteria);setData(undefined);setError('');setExpired(false);setDirty(false);setPromotions({});const invalid=stayError(criteria);if(invalid){setError(invalid);return;}const params:any={offers:'true'};if(criteria.checkIn){params.checkIn=criteria.checkIn;params.checkOut=criteria.checkOut;params.rooms=JSON.stringify(criteria.rooms);}void api.get('/hotels/'+id,{params,signal:c.signal}).then((r:any)=>{if(c.signal.aborted)return;setData(r.data);expires.current=Date.parse(r.data.validUntil);setDraft(s=>({...s,locationId:s.locationId||r.data.address?.tourismDestinationId||r.data.address?.provinceCode||''}));const requested=new URLSearchParams(location.search).get('promotionId');if(requested){const selected:Record<string,string>={};for(const room of r.data.rooms)for(const offer of room.offers)if(offer.promotionChoices?.some((p:any)=>p.id===requested))selected[offer.ratePlanId]=requested;setPromotions(selected);}}).catch(e=>{if(!c.signal.aborted)setError(e.message||'Chưa tải được thông tin khách sạn.');});return()=>c.abort();},[id,location.search,refresh]);
 useEffect(()=>{const c=new AbortController();setReviewData([]);setReviewError('');if(!data)return;if(data.isDemo)return;void api.get('/places/'+id+'/reviews',{signal:c.signal}).then((r:any)=>{if(!c.signal.aborted)setReviewData(r.data||[]);}).catch(()=>{if(!c.signal.aborted)setReviewError('Chưa tải được đánh giá đã công bố.');});return()=>c.abort();},[id,data?.identity.id,data?.isDemo]);
 useEffect(()=>{if(!data)return;const timer=setTimeout(()=>setExpired(true),Math.max(1000,Date.parse(data.validUntil)-Date.now()+50));return()=>clearTimeout(timer);},[data]);
 useEffect(()=>{const focus=()=>{if(Date.now()>=expires.current)setRefresh(v=>v+1);};window.addEventListener('focus',focus);return()=>window.removeEventListener('focus',focus);},[]);
 const updateCriteria=(s:SearchState)=>{setDraft(s);setDirty(true);};
 const search=(s:SearchState)=>{if(data&&s.locationId&&![data.address?.tourismDestinationId,data.address?.provinceCode].includes(s.locationId)){navigate(searchHref(s));return;}const p=searchParams(s);p.set('hotel','1');navigate('/places/'+id+'?'+p);setRefresh(v=>v+1);};
 const checkout=(rateId:string,promo:string)=>{if(expired||dirty||Date.now()>=expires.current)return;const p=searchParams(draft);p.set('ratePlanId',rateId);if(promo)p.set('promotionId',promo);navigate('/hotels/'+id+'/checkout?'+p);};
 const quoteFor=(o:any)=>promotions[o.ratePlanId]?o.promotionChoices?.find((p:any)=>p.id===promotions[o.ratePlanId])?.quote:o.quote;

 // ---- Trạng thái chỉ dùng cho giao diện ----
 const[activeSection,setActiveSection]=useState('overview');
 const[pastHeader,setPastHeader]=useState(false);
 const[expandedRates,setExpandedRates]=useState<Record<string,boolean>>({});
 const[descOpen,setDescOpen]=useState(false);
 const[descClamped,setDescClamped]=useState(false);
 const[reviewCount,setReviewCount]=useState(REVIEW_PAGE);
 const[openReviews,setOpenReviews]=useState<Record<string,boolean>>({});
 const headerRef=useRef<HTMLElement>(null);
 const descRef=useRef<HTMLParagraphElement>(null);
 const shareTimer=useRef<number>();
 useEffect(()=>{
  if(!data)return;
  const els=sections.map(([k])=>document.getElementById('hd-'+k)).filter(Boolean) as HTMLElement[];
  if(!els.length)return;
  // Mục đang xem = mục cuối cùng có mép trên đã đi qua đáy thanh anchor.
  // IntersectionObserver (dải -120px/-60%) báo khi mục đổi; thêm scroll (rAF) để cập nhật đúng khi cuộn mượt dừng giữa chừng.
  let frame=0;
  const compute=()=>{
   frame=0;
   const line=(document.querySelector('.hg-anchor')?.getBoundingClientRect().bottom??116)+24;
   let current=els[0];
   for(const el of els)if(el.getBoundingClientRect().top<=line)current=el;
   if(window.innerHeight+window.scrollY>=document.documentElement.scrollHeight-2)current=els[els.length-1];
   setActiveSection(current.id.replace('hd-',''));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(compute);};
  const io=typeof IntersectionObserver!=='undefined'?new IntersectionObserver(schedule,{rootMargin:'-120px 0px -60% 0px'}):undefined;
  els.forEach(el=>io?.observe(el));
  window.addEventListener('scroll',schedule,{passive:true});
  return()=>{io?.disconnect();window.removeEventListener('scroll',schedule);cancelAnimationFrame(frame);};
 },[data]);
 useEffect(()=>{
  const el=headerRef.current;
  if(!el||typeof IntersectionObserver==='undefined')return;
  const io=new IntersectionObserver(([e])=>setPastHeader(!e.isIntersecting&&e.boundingClientRect.top<0));
  io.observe(el);
  return()=>io.disconnect();
 },[data]);
 useEffect(()=>{
  const el=descRef.current;
  setDescOpen(false);
  if(!el)return;
  setDescClamped(el.scrollHeight>el.clientHeight+2);
 },[data?.identity?.description]);
 useEffect(()=>{setReviewCount(REVIEW_PAGE);setOpenReviews({});},[reviewData]);
 useEffect(()=>()=>window.clearTimeout(shareTimer.current),[]);
 const showShare=(msg:string)=>{
  setShare(msg);
  window.clearTimeout(shareTimer.current);
  shareTimer.current=window.setTimeout(()=>setShare(''),3000);
 };

 const roomFactRows=(r:any)=>[
  {icon:Maximize,text:r.areaM2==null?'Chưa có diện tích':r.areaM2+' m²'},
  {icon:Users,text:`${r.maxAdults} người lớn · tối đa ${r.maxChildren} trẻ em`},
  {icon:BedDouble,text:r.beds?.length?r.beds.map((b:any)=>b.quantity+' '+(bedLabels[b.type]||b.type)).join(', '):'Chưa cung cấp loại giường'},
  {icon:DoorOpen,text:`${r.bedrooms??'Chưa rõ'} phòng ngủ · ${r.bathrooms??'Chưa rõ'} phòng tắm`},
  {icon:Eye,text:roomViews[r.view]||'Chưa xác minh hướng nhìn'},
 ];
 const roomFacts=(r:any)=><ul className="hg-room-facts">
  {roomFactRows(r).map(({icon:Icon,text},i)=><li key={i}><Icon size={16} aria-hidden="true"/><span>{text}</span></li>)}
 </ul>;

 const reviewAvg=reviewData.length?reviewData.reduce((n,r)=>n+Number(r.rating),0)/reviewData.length:0;
 const reviewSummary=reviewData.length
  ?<a className="hg-detail-review" href="#hd-reviews"><b className="hg-score">{ratingText(reviewAvg)}/5</b><span>{reviewData.length} đánh giá đã công bố</span></a>
  :<span className="hg-detail-review hg-detail-review--none">Chưa có đánh giá</span>;
 const live=!expired&&!dirty;
 const quoted=data&&live?data.rooms.flatMap((room:any)=>room.offers.map((o:any)=>quoteFor(o)).filter(Boolean)):[];
 const lowest=quoted.length?quoted.reduce((m:any,q:any)=>q.totalVnd<m.totalVnd?q:m,quoted[0]):null;
 const priceHeading=(()=>{const q=quoted[0];return q?`Giá cho ${q.nights} đêm`:'Giá';})();
 const times=data?.profile?.timeSource==='APPROVED_CONTENT_SNAPSHOT';

 const breadcrumb=<nav className="hg-breadcrumb" aria-label="Đường dẫn trang">
  <Link to={searchHref(readSearch(location.search))}><ArrowLeft size={14} aria-hidden="true"/>Kết quả tìm kiếm</Link>
  {data&&<>
   <ChevronRight size={14} aria-hidden="true"/>
   <span>Khách sạn</span>
   {data.address?.provinceOrCity&&<><ChevronRight size={14} aria-hidden="true"/><span>{data.address.provinceOrCity}</span></>}
   <ChevronRight size={14} aria-hidden="true"/>
   <span aria-current="page">{cut(data.identity.name,40)}</span>
  </>}
 </nav>;

 if(error){
  return <div className="hotel-ui hotel-detail-page hg-scope hg-page-detail">
   <div className="hg-container">
    {breadcrumb}
    <div role="alert" className="hg-state">
     <AlertTriangle size={32} aria-hidden="true"/>
     <h1>Chưa tải được khách sạn</h1>
     <p>{/[À-ỹ]/.test(error)?error:'Kết nối tới máy chủ chưa ổn định. Vui lòng thử lại sau ít phút.'}</p>
     <button type="button" className="hg-btn hg-btn--outline" onClick={()=>setRefresh(v=>v+1)}>Kiểm tra lại thông tin</button>
    </div>
   </div>
  </div>;
 }
 if(!data){
  return <div className="hotel-ui hotel-detail-page hg-scope hg-page-detail">
   <div className="hg-container">
    {breadcrumb}
    <div className="hg-detail-skeleton" role="status" aria-label="Đang tải khách sạn">
     <span className="hg-skel hg-skel--title" aria-hidden="true"/>
     <span className="hg-skel hg-skel--subtitle" aria-hidden="true"/>
     <span className="hg-skel hg-skel--gallery" aria-hidden="true"/>
     <span className="hg-skel hg-skel--room" aria-hidden="true"/>
     <span className="hg-skel hg-skel--room" aria-hidden="true"/>
    </div>
   </div>
  </div>;
 }

 const visibleReviews=reviewData.slice(0,reviewCount);
 return <div className="hotel-ui hotel-detail-page hg-scope hg-page-detail">
  <div className="hg-container">
   {breadcrumb}
   <header className="hg-detail-header" ref={headerRef}>
    <div className="hg-detail-header__main">
     <div className="hg-detail-eyebrow">
      <span>{hotelTypes[data.identity.accommodationType]||'Nơi lưu trú'}</span>
      {data.profile.starRating?<span className="hg-detail-stars" aria-label={data.profile.starRating+' sao đã xác minh'}>{'★'.repeat(data.profile.starRating)}</span>:null}
     </div>
     <h1>{data.identity.name}</h1>
     <p className="hg-detail-address"><MapPin size={16} aria-hidden="true"/><span>{data.address?.fullAddress||'Địa chỉ chưa được xác minh'}</span></p>
     {reviewSummary}
    </div>
    <div className="hg-detail-header__actions">
     <button type="button" className="hg-btn hg-btn--ghost" onClick={()=>{void navigator.clipboard?.writeText(window.location.href).then(()=>showShare('Đã sao chép liên kết.')).catch(()=>showShare('Bạn có thể sao chép đường dẫn trên thanh địa chỉ.'));}}>
      <Share2 size={16} aria-hidden="true"/>Chia sẻ
     </button>
     <a className="hg-btn hg-btn--cta" href="#hd-rooms">Xem phòng<ArrowRight size={16} aria-hidden="true"/></a>
     <p role="status" className="hg-detail-toast">{share}</p>
    </div>
   </header>
   <div className="hg-detail-gallery">
    <HotelGallery images={data.hotelMedia} title={'Ảnh khách sạn '+data.identity.name}/>
   </div>
  </div>

  <nav className="hg-anchor" aria-label="Nội dung khách sạn">
   <div className="hg-container hg-anchor__inner">
    <div className="hg-anchor__links">
     {sections.map(([key,label])=><a key={key} href={'#hd-'+key} aria-current={activeSection===key?'true':undefined} onClick={()=>setActiveSection(key)}>{label}</a>)}
    </div>
    {pastHeader&&<div className="hg-anchor__cta">
     {lowest&&<span className="hg-anchor__price"><small>Tổng từ</small><b>{vnd(lowest.totalVnd)}</b></span>}
     <a className="hg-btn hg-btn--cta" href="#hd-rooms">Xem phòng</a>
    </div>}
   </div>
  </nav>

  <div className="hg-container">
   <section id="hd-overview" className="hg-section hg-overview">
    <div className="hg-overview__text">
     <h2>Tổng quan</h2>
     {data.identity.summary&&<p className="hg-overview__summary">{data.identity.summary}</p>}
     {data.identity.description&&<>
      <p ref={descRef} id="hg-desc" className={'hg-overview__desc'+(descOpen?' is-open':'')}>{data.identity.description}</p>
      {(descClamped||descOpen)&&<button type="button" className="hg-link" aria-expanded={descOpen} aria-controls="hg-desc" onClick={()=>setDescOpen(v=>!v)}>{descOpen?'Thu gọn':'Xem thêm'}</button>}
     </>}
    </div>
    <aside className="hg-overview__panel" aria-label="Thông tin lưu trú">
     <h3>Thông tin lưu trú</h3>
     <p className="hg-overview__times"><Clock size={16} aria-hidden="true"/><span>{times?`Nhận phòng ${data.profile.checkInTime.slice(0,5)} · Trả phòng ${data.profile.checkOutTime.slice(0,5)}`:'Giờ nhận/trả phòng chưa có thông tin được duyệt.'}</span></p>
     {reviewSummary}
     <p className="hg-overview__note">Giá theo ngày, số khách và gói giá cụ thể.</p>
     <a href="#hd-rooms" className="hg-btn hg-btn--outline">Chọn phòng</a>
    </aside>
   </section>

   <section id="hd-rooms" className="hg-section">
    <h2>Hạng phòng & giá</h2>
    <p className="hg-section__sub">Phân bổ đúng khách trong mỗi phòng. Hiện hỗ trợ một hạng phòng/gói giá cho toàn bộ số phòng yêu cầu.</p>
    <div className="hg-rooms-bar">
     <SharedHotelSearchBar variant="bar" submitLabel="Cập nhật giá" value={draft} onChange={updateCriteria} onSearch={search}/>
    </div>
    {(expired||dirty)&&<div className="hg-notice hg-rooms-alert" role="alert">
     <Info size={16} aria-hidden="true"/>
     <p>{dirty?'Tiêu chí đã thay đổi. Tìm lại để kiểm tra phòng và báo giá đúng yêu cầu.':'Báo giá đã hết hiệu lực. Cần cập nhật trước khi chọn phòng.'}</p>
     <button type="button" className="hg-btn hg-btn--outline" onClick={()=>dirty?search(draft):setRefresh(v=>v+1)}><RefreshCw size={16} aria-hidden="true"/>Cập nhật báo giá</button>
    </div>}
    {!draft.checkIn&&<p className="hg-notice hg-notice--info hg-rooms-alert">
     <Info size={16} aria-hidden="true"/>
     <span>Chọn ngày để xem tổng giá và tình trạng phòng. Giá không ngày chỉ là tham khảo.</span>
    </p>}
    <div className="hg-room-list">
     {data.rooms.map((room:any)=>{
      const showAll=!!expandedRates[room.id];
      const offers=showAll?room.offers:room.offers.slice(0,RATE_PREVIEW);
      const more=room.offers.length-RATE_PREVIEW;
      return <article className="hg-room" key={room.id} data-room-id={room.id}>
       <div className="hg-room__info">
        <HotelGallery images={room.media} title={'Ảnh hạng phòng '+room.name} compact/>
        <h3>{room.name}</h3>
        {roomFacts(room)}
        {room.amenities?.length>0&&<ul className="hg-room-chips" aria-label="Tiện nghi phòng">
         {room.amenities.slice(0,4).map((a:string)=><li key={a}><Check size={12} aria-hidden="true"/>{amenityLabels[a]||a}</li>)}
        </ul>}
        <button type="button" className="hg-link" onClick={()=>setRoomModal(room)}>Xem chi tiết phòng<ArrowRight size={14} aria-hidden="true"/></button>
       </div>
       <div className="hg-rates">
        {room.offers.length>0&&<div className="hg-rates__head" aria-hidden="true">
         <span>Lựa chọn</span>
         <span>Sức chứa</span>
         <span>{priceHeading}</span>
         <span/>
        </div>}
        {room.offers.length?offers.map((offer:any)=>{
         const quote=quoteFor(offer);
         const breakfast=offer.terms?.mealPlan==='BREAKFAST_INCLUDED';
         const cancel=offer.terms?.cancellation;
         const nonRefundable=cancel?.kind==='NON_REFUNDABLE';
         return <div key={offer.ratePlanId} className={'hg-rate'+(live&&quote?'':' hg-rate--nocta')} data-rate-id={offer.ratePlanId}>
          <div className="hg-rate__terms">
           <h4>{offer.terms?.name||'Gói giá'}</h4>
           <ul className="hg-rate__checks">
            <li className={breakfast?'is-ok':''}>{breakfast?<Check size={16} aria-hidden="true"/>:<Minus size={16} aria-hidden="true"/>}<span>{breakfast?'Bao gồm bữa sáng':'Không kèm bữa sáng'}</span></li>
            {cancel?.terms
             ?<li className={nonRefundable?'':'is-ok'}>{nonRefundable?<Info size={16} aria-hidden="true"/>:<Check size={16} aria-hidden="true"/>}<span>{nonRefundable?'Không hoàn hủy':cancel.terms}</span></li>
             :<li><Info size={16} aria-hidden="true"/><span>Chưa đủ điều kiện báo giá cho yêu cầu này.</span></li>}
           </ul>
           {offer.promotionChoices?.length>0&&<label className="hg-rate__promo">
            <span>Ưu đãi của gói giá</span>
            <span className="hg-rate__select">
             <select aria-label={'Ưu đãi '+offer.ratePlanId} value={promotions[offer.ratePlanId]||''} disabled={expired||dirty} onChange={e=>setPromotions(p=>({...p,[offer.ratePlanId]:e.target.value}))}>
              <option value="">Không áp dụng ưu đãi</option>
              {offer.promotionChoices.map((p:any)=><option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
             <ChevronDown size={16} aria-hidden="true"/>
            </span>
           </label>}
          </div>
          <div className="hg-rate__cap" aria-label={'Tối đa '+room.maxAdults+' người lớn'}>
           <Users size={18} aria-hidden="true"/><b>×{room.maxAdults}</b>
          </div>
          <div className="hg-rate__price">
           {expired||dirty
            ?<p className="hg-rate__wait">Đang chờ kiểm tra giá mới.</p>
            :quote
             ?<>
              <strong data-testid={'rate-total-'+offer.ratePlanId}>{vnd(quote.totalVnd)}</strong>
              <span>Tổng {quote.nights} đêm · {quote.roomCount} phòng</span>
              <small>Đã gồm thuế/phí bắt buộc</small>
             </>
             :offer.baseAmountVnd!==undefined
              ?<>
               <strong className="hg-rate__ref">{vnd(offer.baseAmountVnd)}</strong>
               <small>Tham khảo/phòng/đêm, tổng thuế/phí chưa xác minh.</small>
               <small>Chọn ngày xem phòng còn trống.</small>
              </>
              :<p className="hg-rate__na">{offer.code==='HOTEL_INVENTORY_UNKNOWN'?'Chưa xác minh đủ tồn phòng cho mọi đêm.':'Chưa có phòng/gói giá đáp ứng yêu cầu này.'}</p>}
          </div>
          <div className="hg-rate__cta">
           {live&&quote&&<>
            <button type="button" className="hg-btn hg-btn--cta" aria-label={'Chọn gói '+(offer.terms?.name||'giá này')} onClick={()=>checkout(offer.ratePlanId,promotions[offer.ratePlanId]||'')}>Chọn</button>
            <small>{data.bookingEnabled?'Chưa giữ phòng':'Chỉ xem trước checkout'}</small>
           </>}
          </div>
          {live&&quote&&<details className="hg-rate__details">
           <summary>Chi tiết giá</summary>
           <HotelPriceBreakdown quote={quote}/>
          </details>}
         </div>;
        }):<p className="hg-notice hg-notice--info hg-rates__none"><Info size={16} aria-hidden="true"/><span>Chưa có gói giá đang áp dụng cho hạng phòng.</span></p>}
        {more>0&&<button type="button" className="hg-rates__more" aria-expanded={showAll} onClick={()=>setExpandedRates(s=>({...s,[room.id]:!showAll}))}>
         {showAll?'Thu gọn lựa chọn':`Xem thêm ${more} lựa chọn`}<ChevronDown size={16} aria-hidden="true"/>
        </button>}
       </div>
      </article>;
     })}
    </div>
   </section>

   <section id="hd-amenities" className="hg-section">
    <h2>Tiện nghi</h2>
    <p className="hg-section__sub">Tiện nghi chung của nơi lưu trú. Tiện nghi trong từng phòng được ghi ở mục Hạng phòng.</p>
    {data.identity.amenities?.length
     ?<ul className="hg-amenity-grid">
      {data.identity.amenities.map((a:string)=>{const Icon=propertyIcons[a]||Check;return <li key={a}><Icon size={20} aria-hidden="true"/><span>{propertyLabels[a]||a}</span></li>;})}
     </ul>
     :<p className="hg-section__sub">Chưa cung cấp tiện nghi chung.</p>}
    {data.profile.services?.length>0&&<>
     <h3 className="hg-amenity-sub">Dịch vụ được khai báo</h3>
     <ul className="hg-amenity-grid">
      {data.profile.services.map((s:string)=>{const Icon=propertyIcons[s]||Check;return <li key={s}><Icon size={20} aria-hidden="true"/><span>{propertyLabels[s]||s}</span></li>;})}
     </ul>
    </>}
   </section>

   <section id="hd-information" className="hg-section">
    <h2>Vị trí & thông tin</h2>
    <dl className="hg-info-grid">
     {[['Số nhà',data.address?.houseNumber],['Tên đường',data.address?.streetName],['Phường/xã',data.address?.wardOrCommune],['Khu vực',data.address?.administrativeArea],['Tỉnh/thành',data.address?.provinceOrCity],['Loại hình',hotelTypes[data.identity.accommodationType]]].map(([label,value])=><div key={label}>
      <dt>{label}</dt>
      <dd>{value||'Chưa có thông tin'}</dd>
     </div>)}
    </dl>
    <p className="hg-section__note">Chưa có khoảng cách hoặc chỉ đường được xác minh. Không dùng tọa độ minh họa để dẫn đường.</p>
   </section>

   <section id="hd-policies" className="hg-section">
    <h2>Quy định & điều kiện lưu trú</h2>
    <dl className="hg-policy-list">
     <div>
      <dt><Clock size={20} aria-hidden="true"/>Nhận / trả phòng</dt>
      <dd>{times?`${data.profile.checkInTime.slice(0,5)} / ${data.profile.checkOutTime.slice(0,5)} (giờ Việt Nam)`:'Chưa có giờ được duyệt.'}</dd>
     </div>
     {Object.entries(data.profile.policies||{}).map(([k,v]:any)=>{const Icon=policyIcons[k]||FileText;return <div key={k}>
      <dt><Icon size={20} aria-hidden="true"/>{policyLabels[k]||k}</dt>
      <dd>{typeof v==='string'?v:'Chưa có quy định có thể hiển thị.'}</dd>
     </div>;})}
    </dl>
    <p className="hg-section__note">Phụ thu trẻ em, giường phụ, bữa sáng và hoàn hủy phụ thuộc từng gói giá. Không mặc định yêu cầu đặc biệt đã được chấp thuận.</p>
   </section>

   <section id="hd-reviews" className="hg-section">
    <h2>Đánh giá từ khách</h2>
    {reviewError
     ?<p role="alert" className="hg-notice hg-notice--error"><AlertTriangle size={16} aria-hidden="true"/><span>{reviewError}</span></p>
     :!reviewData.length
      ?<div className="hg-state hg-state--compact">
       <h3>Chưa có đánh giá</h3>
       <p>Chỉ hiển thị đánh giá công khai đã được duyệt.</p>
      </div>
      :<div className="hg-reviews">
       <div className="hg-reviews__score">
        <p><b>{ratingText(reviewAvg)}</b><span>/5</span></p>
        <small>Dựa trên {reviewData.length} đánh giá đã công bố</small>
       </div>
       <div className="hg-reviews__list">
        {visibleReviews.map(r=>{const open=!!openReviews[r.id];const long=(r.comment||'').length>320;return <article className="hg-review" key={r.id}>
         <header>
          <span className="hg-review__avatar" aria-hidden="true">{(r.userName||'?').trim().charAt(0).toUpperCase()}</span>
          <span className="hg-review__who"><b>{r.userName}</b><time dateTime={r.createdAt}>{new Date(r.createdAt).toLocaleDateString('vi-VN')}</time></span>
          <span className="hg-score">{ratingText(r.rating)}/5</span>
         </header>
         {r.verificationStatus==='VERIFIED'?<span className="hg-review__verified">Lưu trú đã xác minh</span>:<span className="hg-review__unverified">Chưa xác minh lưu trú</span>}
         <p className={'hg-review__text'+(open?' is-open':'')}>{r.comment}</p>
         {long&&<button type="button" className="hg-link" aria-expanded={open} onClick={()=>setOpenReviews(s=>({...s,[r.id]:!open}))}>{open?'Thu gọn':'Xem thêm'}</button>}
        </article>;})}
        {reviewData.length>reviewCount&&<button type="button" className="hg-btn hg-btn--outline hg-reviews__more" onClick={()=>setReviewCount(n=>n+REVIEW_PAGE)}>Xem thêm đánh giá</button>}
       </div>
      </div>}
   </section>
  </div>

  {roomModal&&<HotelDialog title={roomModal.name} wide className="hg-room-dialog" onClose={()=>setRoomModal(undefined)}>
   <HotelGallery images={roomModal.media} title={'Ảnh hạng phòng '+roomModal.name}/>
   {roomFacts(roomModal)}
   <dl className="hg-room-dialog__facts">
    {[['Ban công',roomModal.balcony],['Cửa sổ',roomModal.hasWindow],['Bếp riêng',roomModal.kitchen],['Phòng tắm riêng',roomModal.privateBathroom],['Giường phụ',roomModal.extraBedAvailable]].map(([label,value])=><div key={label as string}>
     <dt>{label}</dt>
     <dd>{known(value)}</dd>
    </div>)}
   </dl>
   {roomModal.amenities?.length>0&&<ul className="hg-room-chips" aria-label="Tiện nghi phòng">
    {roomModal.amenities.map((a:string)=><li key={a}><Check size={12} aria-hidden="true"/>{amenityLabels[a]||a}</li>)}
   </ul>}
   {roomModal.description&&<p className="hg-room-dialog__desc">{roomModal.description}</p>}
   <h3 className="hg-room-dialog__h">Chính sách gói giá</h3>
   <ul className="hg-room-dialog__policies">
    {roomModal.offers.map((o:any)=><li key={o.ratePlanId}><b>{o.terms?.name||'Gói giá'}</b>: {o.terms?.cancellation?.terms||'Cần chọn ngày và khách phù hợp để xem báo giá.'}</li>)}
    {!roomModal.offers.length&&<li>Chưa có gói giá đang áp dụng.</li>}
   </ul>
  </HotelDialog>}
 </div>;
}
