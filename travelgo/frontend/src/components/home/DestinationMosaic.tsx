import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
import {api} from '../../services/api';
import {TravelPhoto,travelPhotos} from '../hotels/TravelPhoto';
import {searchHref,type SearchState} from '../../utils/hotelSearchState';
import {SectionHeading} from './SectionHeading';

type Geo={id:string;name:string;kind?:string};
type Place={assetId:string;id:string;name:string};

/** 8 ô mosaic theo quyết định 8.1. Vị trí lưới cố định theo thứ tự (CSS .hg-tile--1 … --8). Tên tĩnh chỉ dùng khi API lỗi/không khớp. */
const TILES:{assetId:string;name:string;wide?:boolean}[]=[
 {assetId:'phu-quoc',name:'Phú Quốc',wide:true},
 {assetId:'da-lat-lake',name:'Đà Lạt'},
 {assetId:'nha-trang',name:'Nha Trang'},
 {assetId:'quy-nhon-coast',name:'Quy Nhơn'},
 {assetId:'ha-long',name:'Hạ Long'},
 {assetId:'da-nang',name:'Đà Nẵng',wide:true},
 {assetId:'hoi-an',name:'Hội An'},
 {assetId:'hue',name:'Huế'},
];
/** Chip "Điểm đến khác". `needsApi`: manifest không có canonicalLocationId → chỉ hiện khi API trả về id hợp lệ. */
const CHIPS:{assetId:string;name:string;needsApi?:boolean}[]=[
 {assetId:'ha-noi',name:'Hà Nội'},
 {assetId:'ho-chi-minh',name:'TP. Hồ Chí Minh'},
 {assetId:'sa-pa',name:'Sa Pa'},
 {assetId:'vung-tau',name:'Vũng Tàu',needsApi:true},
];

const fold=(s:string)=>s.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/gi,'d').toLowerCase().trim();

function resolve(entry:{assetId:string;name:string;needsApi?:boolean},items:Geo[]|null):Place|null{
 const asset=travelPhotos.find(a=>a.id===entry.assetId);
 if(!asset)return null;
 const canonical=asset.canonicalLocationId;
 const geo=items?.find(g=>canonical?g.id===canonical:(g.kind!=='all'&&(fold(g.name)===fold(entry.name)||g.id===entry.assetId||g.id==='destination:'+entry.assetId)));
 if(geo)return {assetId:entry.assetId,id:geo.id,name:geo.name};
 if(!canonical||entry.needsApi)return null;
 return {assetId:entry.assetId,id:canonical,name:entry.name};
}

/** Section "Điểm đến yêu thích trong nước" (mục 4.6) — có skeleton và fallback khi API lỗi. */
export function DestinationMosaic({criteria}:{criteria:SearchState}){
 const [items,setItems]=useState<Geo[]|null>(null);
 const [status,setStatus]=useState<'loading'|'ready'|'fallback'>('loading');

 useEffect(()=>{
  const c=new AbortController();
  void api.get('/places/locations',{signal:c.signal})
   .then((r:any)=>{
    if(c.signal.aborted)return;
    const list=Array.isArray(r?.data?.items)?r.data.items:[];
    setItems(list);
    setStatus('ready');
   })
   .catch(()=>{
    if(c.signal.aborted)return;
    setItems(null);
    setStatus('fallback');
   });
  return()=>c.abort();
 },[]);

 const tiles=TILES.map(t=>({...t,place:resolve(t,items)}));
 const chips=CHIPS.map(c=>resolve(c,items)).filter((p):p is Place=>!!p);

 return (
  <section className="hg-container hg-section" aria-labelledby="hg-dest-title">
   <SectionHeading
    id="hg-dest-title"
    title="Điểm đến yêu thích trong nước"
    subtitle="Từ biển xanh đến phố núi — chọn nơi bạn muốn đến."
    action={{to:'/explore',label:'Khám phá Việt Nam'}}
   />
   {status==='loading'?(
    <div className="hg-mosaic" role="status" aria-label="Đang tải điểm đến">
     {TILES.map((t,i)=><span key={t.assetId} className={'hg-tile hg-tile--'+(i+1)+' hg-skeleton'}/>)}
    </div>
   ):(
    <div className="hg-mosaic">
     {tiles.map((t,i)=>t.place&&(
      <Link
       key={t.assetId}
       className={'hg-tile hg-tile--'+(i+1)}
       to={searchHref({...criteria,locationId:t.place.id,page:'1'})}
       aria-label={'Tìm nơi lưu trú tại '+t.place.name}
      >
       <TravelPhoto assetId={t.assetId} sizes={t.wide?'(max-width:767px) 66vw, 820px':'(max-width:767px) 33vw, 410px'}/>
       <span className="hg-tile-text" aria-hidden="true">
        <b>{t.place.name}</b>
        <small>Xem nơi lưu trú <ArrowRight size={14}/></small>
       </span>
      </Link>
     ))}
    </div>
   )}
   {status!=='loading'&&chips.length>0&&(
    <div className="hg-dest-more">
     <span className="hg-dest-more-label">Điểm đến khác</span>
     <div className="hg-chips">
      {chips.map(p=>(
       <Link key={p.assetId} className="hg-chip" to={searchHref({...criteria,locationId:p.id,page:'1'})} aria-label={'Tìm nơi lưu trú tại '+p.name}>
        <span className="hg-chip-img"><TravelPhoto assetId={p.assetId} sizes="32px"/></span>
        <span aria-hidden="true">{p.name}</span>
       </Link>
      ))}
     </div>
    </div>
   )}
  </section>
 );
}
