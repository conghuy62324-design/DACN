import {useCallback,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {AlertCircle,ChevronLeft,ChevronRight,Info,Hotel} from 'lucide-react';
import {HotelResultCard} from '../hotels/HotelResultCard';
import {searchHref,type SearchState} from '../../utils/hotelSearchState';
import {SectionHeading} from './SectionHeading';

const MODES:[string,string][]=[['relevance','Gợi ý cho kỳ nghỉ'],['recent','Mới được duyệt']];
const hasVietnamese=(s:string)=>/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s);

type Props={
 hotels:any[];
 loading:boolean;
 error:string;
 refresh:()=>void;
 mode:string;
 onModeChange:(mode:string)=>void;
 criteria:SearchState;
};

/** Section "Nơi lưu trú để bạn khám phá" — khung carousel (mục 4.8). Card bên trong do Gói B sở hữu. */
export function FeaturedStays({hotels,loading,error,refresh,mode,onModeChange,criteria}:Props){
 const track=useRef<HTMLDivElement>(null);
 const [canPrev,setCanPrev]=useState(false);
 const [canNext,setCanNext]=useState(false);
 const items=hotels.slice(0,6);

 const measure=useCallback(()=>{
  const el=track.current;
  if(!el){setCanPrev(false);setCanNext(false);return;}
  setCanPrev(el.scrollLeft>4);
  setCanNext(el.scrollLeft+el.clientWidth<el.scrollWidth-4);
 },[]);

 useEffect(()=>{
  measure();
  const el=track.current;
  if(!el)return;
  el.addEventListener('scroll',measure,{passive:true});
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;
  observer?.observe(el);
  window.addEventListener('resize',measure);
  return()=>{el.removeEventListener('scroll',measure);observer?.disconnect();window.removeEventListener('resize',measure);};
 },[measure,items.length,loading,error]);

 const scroll=(dir:number)=>{
  const el=track.current;
  if(el)el.scrollBy({left:dir*el.clientWidth,behavior:'smooth'});
 };

 return (
  <section className="hg-section hg-featured" aria-labelledby="hg-featured-title">
   <div className="hg-container">
    <SectionHeading
     id="hg-featured-title"
     title="Nơi lưu trú để bạn khám phá"
     subtitle="Thông tin đã được duyệt. Chọn ngày để xem giá và phòng trống."
     action={{to:searchHref(criteria),label:'Xem tất cả'}}
    />
    <div className="hg-pills" role="group" aria-label="Khám phá nơi lưu trú">
     {MODES.map(([v,l])=>(
      <button key={v} type="button" className="hg-pill" aria-pressed={mode===v} onClick={()=>onModeChange(v)}>{l}</button>
     ))}
    </div>
    {loading?(
     <div className="hg-carousel-track hg-carousel-track--static" role="status">
      {[1,2,3,4].map(n=>(
       <div key={n} className="hg-card-skeleton" aria-hidden="true">
        <span className="hg-skeleton hg-card-skeleton-img"/>
        <span className="hg-skeleton hg-card-skeleton-line hg-w-80"/>
        <span className="hg-skeleton hg-card-skeleton-line hg-w-60"/>
        <span className="hg-skeleton hg-card-skeleton-line hg-w-40"/>
       </div>
      ))}
      <span className="sr-only">Đang tải nơi lưu trú</span>
     </div>
    ):error?(
     <div className="hg-state" role="status">
      <AlertCircle size={32} aria-hidden="true"/>
      <h3>Chưa tải được nơi lưu trú</h3>
      <p>{hasVietnamese(error)?error:'Kết nối tới máy chủ chưa ổn định. Vui lòng thử lại sau ít phút.'}</p>
      <button type="button" className="hg-btn-outline" onClick={refresh}>Thử lại</button>
     </div>
    ):items.length?(
     <div className="hg-carousel">
      <button type="button" className="hg-carousel-btn hg-carousel-btn--prev" aria-label="Xem nơi lưu trú trước" hidden={!canPrev} onClick={()=>scroll(-1)}>
       <ChevronLeft size={20}/>
      </button>
      <div ref={track} className="hg-carousel-track" role="region" aria-label="Nơi lưu trú nổi bật" tabIndex={0}>
       {items.map((h:any)=>(
        <div key={h.identity.id} className="hotel-ui hg-carousel-slide">
         <HotelResultCard hotel={h} criteria={criteria} compact/>
        </div>
       ))}
      </div>
      <button type="button" className="hg-carousel-btn hg-carousel-btn--next" aria-label="Xem nơi lưu trú sau" hidden={!canNext} onClick={()=>scroll(1)}>
       <ChevronRight size={20}/>
      </button>
     </div>
    ):(
     <div className="hg-state">
      <Hotel size={32} aria-hidden="true"/>
      <h3>Nơi lưu trú đang được chuẩn bị</h3>
      <p>Khám phá điểm đến trong khi chờ nội dung được công bố.</p>
      <Link className="hg-btn-outline" to="/explore">Khám phá Việt Nam</Link>
     </div>
    )}
   </div>
  </section>
 );
}
