import {Link} from 'react-router-dom';
import {Camera,ExternalLink} from 'lucide-react';
import {travelPhotos,TravelPhoto} from '../components/hotels/TravelPhoto';
import {CatalogBreadcrumb} from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

export default function PhotoCreditsPage(){
 return <div className="hg-cat">
  <header className="hg-cat-head">
   <div className="hg-container">
    <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Nguồn ảnh & bản quyền'}]}/>
    <p className="hg-cat-eyebrow"><Camera size={16} aria-hidden="true"/>HuGo Travel</p>
    <h1 className="hg-cat-h1">Nguồn ảnh &amp; bản quyền</h1>
    <p className="hg-cat-lead">Ảnh điểm đến được chọn theo địa danh được xác minh. Ảnh nội thất dùng để minh họa phong cách, không đại diện một cơ sở cụ thể. Ảnh được tải về, chuyển WebP và thay đổi kích thước; không hàm ý tác giả bảo trợ HuGo Travel.</p>
    <p className="hg-cat-lead"><Link to="/hotels" className="hg-cat-link">← Khám phá khách sạn</Link></p>
   </div>
  </header>
  <div className="hg-container hg-cat-main">
   <div className="hg-cat-credits">
    {travelPhotos.map(a=><article key={a.id} className="hg-cat-card">
     <div className="hg-cat-card__media">
      <TravelPhoto assetId={a.id} sizes="(max-width:767px) 100vw, 400px"/>
      {a.illustrative&&<span className="hg-cat-card__badges"><span className="hg-cat-badge hg-cat-badge--warn">Minh họa</span></span>}
     </div>
     <div className="hg-cat-card__body">
      <h2 className="hg-cat-card__title">{a.alt}</h2>
      <p className="hg-cat-card__meta"><span>Tác giả: {a.author}</span></p>
      <a href={a.sourceUrl} target="_blank" rel="noreferrer">Ảnh gốc trên Wikimedia Commons <ExternalLink size={14} aria-hidden="true"/></a>
      <a href={a.licenseUrl} target="_blank" rel="noreferrer">{a.license} · ảnh dẫn xuất giữ giấy phép này</a>
      <p className="hg-cat-note">{a.illustrative?'Ảnh nội thất minh họa phong cách':'Địa danh: '+a.actualLocation}</p>
     </div>
    </article>)}
   </div>
  </div>
 </div>;
}
