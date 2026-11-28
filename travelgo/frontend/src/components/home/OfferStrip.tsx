import {Link} from 'react-router-dom';
import {ArrowRight,ImageOff} from 'lucide-react';
import {searchHref,type SearchState} from '../../utils/hotelSearchState';
import {SectionHeading} from './SectionHeading';

const SCOPE_NOTE='Chỉ áp dụng cho phòng/gói giá trong phạm vi ưu đãi.';
const day=(v?:string)=>v&&/^\d{4}-\d{2}-\d{2}/.test(v)?v.slice(0,10).split('-').reverse().join('/'):v||'';

/** Section "Ưu đãi" (mục 4.7). Chỉ render khi có promotion thật từ backend; component cha quyết định ẩn. */
export function OfferStrip({offers,criteria}:{offers:any[];criteria:SearchState}){
 if(!offers.length)return null;
 return (
  <section className="hg-container hg-section hg-offers" aria-labelledby="hg-offers-title">
   <SectionHeading
    id="hg-offers-title"
    title="Ưu đãi cho kỳ nghỉ của bạn"
    subtitle="Ưu đãi từ gói giá đã công bố. Chọn ngày để kiểm tra điều kiện."
    action={{to:searchHref({...criteria,promotion:'true'}),label:'Xem ưu đãi'}}
   />
   <div className="hg-offer-track">
    {offers.slice(0,2).map((h:any)=>{
     const p=h.promotions[0];
     const media=h.hotelMedia?.[0];
     return (
      <Link
       key={p.id}
       to={searchHref({...criteria,nameOrAddress:h.identity.name,promotion:'true',page:'1'})}
       className="hg-offer"
       title={SCOPE_NOTE}
      >
       <span className="hg-offer-media">
        {media?.url?(
         <img src={media.url} alt={media.altText||'Ảnh nơi lưu trú'} loading="lazy"/>
        ):(
         <span className="hg-offer-noimg"><ImageOff size={24} aria-hidden="true"/>Chưa có ảnh</span>
        )}
       </span>
       <span className="hg-offer-body">
        <span className="hg-offer-badge">{p.kind==='PERCENT_BPS'?'Giảm '+p.value/100+'%':'Ưu đãi kỳ lưu trú'}</span>
        <b className="hg-offer-name">{p.name}</b>
        <span className="hg-offer-hotel">{h.identity.name}</span>
        <span className="hg-offer-terms">Lưu trú từ {day(p.stayFrom)} đến trước {day(p.stayUntil)} · tối thiểu {p.minNights} đêm</span>
        <span className="hg-offer-more">Xem chi tiết <ArrowRight size={15} aria-hidden="true"/></span>
       </span>
      </Link>
     );
    })}
   </div>
   <p className="hg-offers-foot">{SCOPE_NOTE}</p>
  </section>
 );
}
