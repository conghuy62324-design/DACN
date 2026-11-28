import {useEffect,useState} from 'react';
import {Link,useLocation,useNavigate} from 'react-router-dom';
import '../styles/hotels.css';
import '../styles/hotelStay.css';
import '../styles/hotelPremium.css';
import '../styles/hg-home.css';
import {useAuth} from '../context/AuthContext';
import {useHotelSearch} from '../components/hotels/useHotelSearch';
import {readSearch,type SearchState} from '../utils/hotelSearchState';
import {HomeHero,HERO_CREDIT} from '../components/home/HomeHero';
import {ServiceSearchTabs} from '../components/home/ServiceSearchTabs';
import {OfferStrip} from '../components/home/OfferStrip';
import {DestinationMosaic} from '../components/home/DestinationMosaic';
import {FeaturedStays} from '../components/home/FeaturedStays';
import {StayTypeStrip} from '../components/home/StayTypeStrip';
import {ServiceLinks} from '../components/home/ServiceLinks';
import {AiBanner} from '../components/home/AiBanner';

/** Trang chủ (general) và trang /hotels. Thứ tự section theo mục 4.12 của spec. */
export function HotelLandingPage({general=false}:{general?:boolean}){
 const location=useLocation();
 const navigate=useNavigate();
 const {user}=useAuth();
 const canUseAssistant=!user||user.roles.includes('CUSTOMER');
 const [criteria,setCriteria]=useState<SearchState>(()=>location.state?.hotelDraft||readSearch(location.search));
 const [mode,setMode]=useState('relevance');
 const enabled=import.meta.env.VITE_HOTEL_DOMAIN_ENABLED==='true';
 const {data,error,loading,refresh}=useHotelSearch({...readSearch(''),limit:6,sort:mode},enabled);

 useEffect(()=>setCriteria(location.state?.hotelDraft||readSearch(location.search)),[location.search]);

 const hotels=data?.items||[];
 const offers=hotels.filter((h:any)=>h.promotions?.length);
 const changeCriteria=(s:SearchState)=>{
  setCriteria(s);
  navigate({pathname:location.pathname,search:location.search},{replace:true,state:{...location.state,hotelDraft:s}});
 };

 return (
  <div className="hg-scope hg-home">
   <HomeHero general={general}/>
   <div className="hg-container hg-search-wrap">
    <ServiceSearchTabs general={general} criteria={criteria} onCriteriaChange={changeCriteria} canUseAssistant={canUseAssistant}/>
    <Link className="hg-search-credit" to="/photo-credits">{HERO_CREDIT}</Link>
   </div>
   {offers.length>0&&<OfferStrip offers={offers} criteria={criteria}/>}
   <DestinationMosaic criteria={criteria}/>
   <FeaturedStays
    hotels={hotels}
    loading={loading}
    error={error}
    refresh={refresh}
    mode={mode}
    onModeChange={setMode}
    criteria={criteria}
   />
   <StayTypeStrip criteria={criteria}/>
   {general&&<ServiceLinks/>}
   <AiBanner canUseAssistant={canUseAssistant}/>
  </div>
 );
}
