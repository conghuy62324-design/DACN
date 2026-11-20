import {HotelLandingPage} from './HotelLandingPage';
import {Navigate,useLocation} from 'react-router-dom';
import {readSearch,searchHref} from '../utils/hotelSearchState';
export const HotelsPage=()=>{const location=useLocation(),p=new URLSearchParams(location.search);return ['city','search','locationId'].some(k=>p.has(k))?<Navigate replace to={searchHref(readSearch(location.search))}/>:<HotelLandingPage/>;};
