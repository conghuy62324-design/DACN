import {Link} from 'react-router-dom';
import {TravelPhoto} from '../hotels/TravelPhoto';

export const HERO_CREDIT='Bãi Sao, Phú Quốc · Ảnh: Trantuonglam · CC BY-SA 4.0';

/** Hero ảnh trang chủ / trang khách sạn (mục 4.4). */
export function HomeHero({general}:{general:boolean}){
 return (
  <section className="hg-hero" aria-labelledby="hg-hero-title">
   <div className="hg-hero-media">
    <TravelPhoto assetId="phu-quoc" className="hg-hero-img" eager sizes="100vw"/>
    <div className="hg-hero-shade" aria-hidden="true"/>
   </div>
   <div className="hg-container hg-hero-content">
    <h1 id="hg-hero-title">{general?'Khám phá Việt Nam theo cách của bạn':'Một nơi nghỉ đẹp. Một kỳ nghỉ đáng nhớ.'}</h1>
    <p>Tìm nơi nghỉ, quán ngon và lên lịch trình cho chuyến đi sắp tới.</p>
   </div>
   <Link className="hg-hero-credit" to="/photo-credits">{HERO_CREDIT}</Link>
  </section>
 );
}
