import {Link} from 'react-router-dom';
import {MapPin,ArrowRight,Check,Coffee} from 'lucide-react';
import {detailHref,type SearchState} from '../../utils/hotelSearchState';
import {HgPhoto} from './HotelGallery';
import '../../styles/hg-hotel-card.css';

export const hotelTypes:Record<string,string>={hotel:'Khách sạn',resort:'Resort',homestay:'Homestay',villa:'Villa',apartment:'Căn hộ',guesthouse:'Nhà khách'};
export const roomViews:Record<string,string>={SEA:'Hướng biển',MOUNTAIN:'Hướng núi',CITY:'Hướng thành phố',GARDEN:'Hướng vườn',LAKE:'Hướng hồ',POOL:'Hướng hồ bơi',NONE:'Không có hướng nhìn',UNKNOWN:'Chưa xác minh'};
export const amenityLabels:Record<string,string>={WIFI:'Wi-Fi',TV:'TV',AIR_CONDITIONING:'Điều hòa',REFRIGERATOR:'Tủ lạnh',MINIBAR:'Minibar',BATHTUB:'Bồn tắm',SHOWER:'Vòi sen',HAIR_DRYER:'Máy sấy tóc',KITCHEN:'Bếp',BALCONY:'Ban công',WORK_DESK:'Bàn làm việc',PRIVATE_POOL:'Hồ bơi riêng',SAFE:'Két an toàn',TOWELS:'Khăn tắm',ACCESSIBLE_BATHROOM:'Phòng tắm tiếp cận'};
export const vnd=(n:number)=>new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0}).format(n);
/** Điểm đánh giá hiển thị kiểu Việt Nam: 4,6 (chỉ đổi cách hiển thị). */
export const ratingText=(n:any)=>Number(n).toLocaleString('vi-VN',{minimumFractionDigits:1,maximumFractionDigits:1});

export function HotelResultCard({hotel:h,criteria:s,compact=false}:{hotel:any;criteria:SearchState;compact?:boolean}){
 const selected=h.selected;
 const quote=selected?.quote;
 const promo=selected?.promotion;
 const media=h.hotelMedia?.[0];
 const href=detailHref(h.identity.id,{...s,promotionId:quote?.promotionId});
 const room=selected?.room;
 const roomLine=room?[
  room.view&&room.view!=='UNKNOWN'?roomViews[room.view]:'',
  room.maxOccupancy!=null?`Tối đa ${room.maxOccupancy} khách/phòng`:'',
  room.bedrooms!=null?`${room.bedrooms} phòng ngủ`:'',
  room.bathrooms!=null?`${room.bathrooms} phòng tắm`:'',
 ].filter(Boolean).join(' · '):'';
 const nonRefundable=selected?.rate?.cancellation?.kind==='NON_REFUNDABLE';
 return <article
  className={'hg-card '+(compact?'hg-card--compact':'hg-card--row')}
  data-testid="hotel-result"
  data-hotel-id={h.identity.id}>
  <Link className="hg-card__media" to={href} tabIndex={-1} aria-hidden="true">
   <HgPhoto src={media?.url} alt={media?.altText||h.identity.name}/>
  </Link>
  <div className="hg-card__info">
   <div className="hg-card__eyebrow">
    <span>{hotelTypes[h.identity.accommodationType]||'Nơi lưu trú'}</span>
    {h.profile?.starRating?<span className="hg-card__stars" aria-label={`${h.profile.starRating} sao đã xác minh`}>{'★'.repeat(h.profile.starRating)}</span>:null}
   </div>
   <h2 className="hg-card__name">
    <Link to={href}>{h.identity.name}</Link>
   </h2>
   <p className="hg-card__address">
    <MapPin size={14} aria-hidden="true"/>
    <span>{h.destination?.name?h.destination.name+' · ':''}{h.address?.fullAddress||'Chưa xác minh địa chỉ'}</span>
   </p>
   <div className="hg-card__review">
    {h.review?.count
     ?<>
      <b className="hg-score">{ratingText(h.review.rating)}/5</b>
      <span>{h.review.count} đánh giá đã công bố</span>
     </>
     :<span>Chưa có đánh giá</span>}
   </div>
   {!compact&&selected&&<div className="hg-card__room">
    <strong>{room.name}</strong>
    {roomLine&&<span className="hg-card__room-line">{roomLine}</span>}
    {room.amenities?.length>0&&<ul className="hg-card__chips" aria-label="Tiện nghi phòng">
     {room.amenities.slice(0,4).map((a:string)=><li key={a}>
      <Check size={12} aria-hidden="true"/>{amenityLabels[a]||a}
     </li>)}
    </ul>}
    {selected.rate?.mealPlan==='BREAKFAST_INCLUDED'&&<span className="hg-card__ok">
     <Coffee size={14} aria-hidden="true"/>Bao gồm bữa sáng
    </span>}
    <span className={nonRefundable?'hg-card__muted':'hg-card__ok'}>
     {nonRefundable?'Không hoàn hủy':selected.rate?.cancellation?.terms}
    </span>
   </div>}
  </div>
  <div className="hg-card__price">
   {promo&&<span className="hg-offer-badge">{promo.name}</span>}
   {quote
    ?<div className="hg-card__amount">
     <span className="hg-card__meta">{quote.nights} đêm · {quote.roomCount} phòng</span>
     <strong className="hg-card__total" data-testid="hotel-total">{vnd(quote.totalVnd)}</strong>
     <small>{compact?`Tổng ${quote.nights} đêm`:'Tổng kỳ lưu trú · đã gồm thuế/phí bắt buộc'}</small>
     {quote.discountVnd>0&&<small className="hg-card__ok">Ưu đãi áp dụng: −{vnd(quote.discountVnd)}</small>}
     {!compact&&<details className="hg-card__details">
      <summary>Chi tiết giá</summary>
      <div className="hg-card__popover">
       <p><span>Tiền phòng</span><b>{vnd(quote.baseVnd)}</b></p>
       <p><span>Phụ thu khách</span><b>{vnd(quote.extraGuestsVnd)}</b></p>
       <p><span>Thuế cộng thêm</span><b>{vnd(quote.taxVnd)}</b></p>
       <p><span>Phí cộng thêm</span><b>{vnd(quote.feesVnd)}</b></p>
       {quote.cancellation?.terms&&<p className="hg-card__terms">{quote.cancellation.terms}</p>}
      </div>
     </details>}
    </div>
    :<div className="hg-card__amount">
     <strong className="hg-card__prompt">Chọn ngày để xem giá</strong>
     {selected?.referenceVnd!=null&&<small>Tham khảo {vnd(selected.referenceVnd)}/phòng/đêm{compact?'':' · chưa xác minh thuế/phí'}</small>}
    </div>}
   <Link className={compact?'hg-btn hg-btn--outline hg-card__cta':'hg-btn hg-btn--cta hg-card__cta'} to={href}>
    Xem phòng<ArrowRight size={16} aria-hidden="true"/>
   </Link>
   {!compact&&<small className="hg-card__foot">
    {quote?'Chưa giữ phòng':'Chưa xác minh tình trạng còn phòng'}
    {!h.bookingEnabled&&' · Chưa hỗ trợ đặt trực tuyến'}
   </small>}
  </div>
 </article>;
}
