import {Link} from 'react-router-dom';
import {hotelTypes} from '../hotels/HotelResultCard';
import {TravelPhoto} from '../hotels/TravelPhoto';
import {searchHref,type SearchState} from '../../utils/hotelSearchState';
import {SectionHeading} from './SectionHeading';

const stayPhotos=['interior-drake','interior-lobby','interior-modern','interior-royal','interior-aria-03','interior-cozy'];

/** Section "Loại lưu trú" (mục 4.9). */
export function StayTypeStrip({criteria}:{criteria:SearchState}){
 return (
  <section className="hg-container hg-section" aria-labelledby="hg-types-title">
   <SectionHeading id="hg-types-title" title="Một nơi ở, nhiều phong cách"/>
   <div className="hg-types">
    {Object.entries(hotelTypes).map(([type,label],i)=>(
     <Link key={type} className="hg-type" to={searchHref({...criteria,accommodationType:type,page:'1'})}>
      <span className="hg-type-media">
       <TravelPhoto assetId={stayPhotos[i%stayPhotos.length]} sizes="(max-width:767px) 140px, 210px"/>
      </span>
      <span className="hg-type-name">{label}</span>
     </Link>
    ))}
   </div>
  </section>
 );
}
