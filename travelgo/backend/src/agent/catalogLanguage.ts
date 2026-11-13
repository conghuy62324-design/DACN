import { fold, type CatalogFilters } from '../services/registeredCatalogService.js';
import type { CoreInterpretation } from './coreInput.js';
import {locationFromMessage,resolveLocation} from '../geography/vietnam.js';
/** Small, explicit catalog vocabulary; no partner IDs, prices or inventory live in this parser. */
export function catalogLanguage(message:string,values:Record<string,any>):CoreInterpretation|undefined{
 const s=fold(message),hotel=/\b(?:khach san|ks|resort|homestay|villa|can ho|nha nghi)\b/.test(s),restaurant=/\b(?:nha hang|quan an)\b/.test(s);
 if(!hotel&&!restaurant)return;
 if(!/\b(?:duoi|hai san|dac san|mon viet|do chay|buffet|bbq|lau|quoc te|gia dinh|resort|homestay|villa|can ho|nha nghi|moi dang ky|moi duoc duyet)\b/.test(s))return;
 if(/^(?:khong|dung|chua)\b|\b(?:neu|doi|giu|re hon)\b/.test(s))return;
 const location=locationFromMessage(message)||resolveLocation(values.destinationCity),city=location?.catalogName||values.destinationCity;
 const filters:CatalogFilters={...(city?{city}:{}),...(location?{locationId:location.id}:{})};
 const price=s.match(/(?:khach san|ks)[^,;]*?duoi\s*(\d+(?:[.,]\d+)?)\s*(k|nghin|tr|trieu|vnd|dong)?\b/);
 if(price){const amount=Number(price[1].replace(',','.'))*(/^(k|nghin)$/.test(price[2]||'')?1000:/^(tr|trieu)$/.test(price[2]||'')?1000000:1);filters.hotelMaxPriceFrom=amount;}
 const types:Record<string,string>={'resort':'resort','homestay':'homestay','villa':'villa','can ho':'apartment','nha nghi':'guesthouse'};
 for(const [key,value]of Object.entries(types))if(s.includes(key))filters.accommodationType=value;
 const cuisines:Record<string,string>={'hai san':'seafood','dac san':'local','mon viet':'vietnamese','do chay':'vegetarian','bbq':'bbq_hotpot','lau':'bbq_hotpot','buffet':'buffet','quoc te':'international','gia dinh':'family'};
 const cuisine=Object.entries(cuisines).find(([key])=>s.includes(key))?.[1];
 if(cuisine){if(hotel&&restaurant)filters.restaurantCuisine=cuisine;else filters.cuisine=cuisine;}
 if(/moi dang ky|moi duoc duyet/.test(s))filters.sort='approvedDesc';
 const adults=s.match(/(?:^|[, ]+)(\d+)\s*(?:nguoi|nguoi lon)(?: |[,.;]|$)/);
 return {operation:hotel?'search_registered_hotels':'search_registered_restaurants',canonical:[...(city?['Điểm đến: '+city]:[]),...(adults?['Số người lớn: '+adults[1]]:[])].join('; '),filters};
}
