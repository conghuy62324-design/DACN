import { HttpError } from '../utils/httpError.js';
import { ACCOMMODATION_TYPES, CUISINES } from './catalogPolicy.js';
import {resolveLocation} from '../geography/vietnam.js';
import {validateTravelPreferences} from '../utils/travelPreferences.js';
export type CatalogQuery={preferences?:string[];dailyBudgetPerPerson?:number;locationId?:string;minPriceFrom?:number;maxPriceFrom?:number;accommodationType?:string;cuisine?:string;amenities?:string[];approvedSince?:string;sort?:string;page?:number;limit?:number;search?:string;city?:string;minRating?:number;category?:string};
export function validatePlaceQuery(q:CatalogQuery){
 const bad=()=>{throw new HttpError(400,'Bộ lọc dịch vụ không hợp lệ.','INVALID_PLACE_FILTERS');};
 if(q.locationId!==undefined&&(typeof q.locationId!=='string'||!resolveLocation(q.locationId)||resolveLocation(q.locationId)!.id!==q.locationId))bad();
 if(q.preferences!==undefined){try{validateTravelPreferences(q.preferences);}catch{bad();}}
 if(q.dailyBudgetPerPerson!==undefined&&(!Number.isFinite(q.dailyBudgetPerPerson)||q.dailyBudgetPerPerson<0||q.dailyBudgetPerPerson>1e12))bad();
 if(q.category&&!['all','hotel','restaurant','attraction','tour'].includes(q.category))bad();
 for(const k of ['page','limit'] as const)if(q[k]!==undefined&&(!Number.isSafeInteger(q[k])||q[k]!<1||k==='limit'&&q[k]!>100))bad();
 for(const k of ['minPriceFrom','maxPriceFrom'] as const)if(q[k]!==undefined&&(!Number.isFinite(q[k])||q[k]!<0||q[k]!>1e12))bad();
 if(q.minPriceFrom!==undefined&&q.maxPriceFrom!==undefined&&q.minPriceFrom>q.maxPriceFrom)bad();
 if(q.minRating!==undefined&&(!Number.isFinite(q.minRating)||q.minRating<0||q.minRating>5))bad();
 if(q.accommodationType&&!ACCOMMODATION_TYPES.includes(q.accommodationType as any)||q.cuisine&&!CUISINES.includes(q.cuisine as any))bad();
 if(q.amenities&&(!Array.isArray(q.amenities)||q.amenities.length>8||q.amenities.some(v=>typeof v!=='string'||!v.trim()||v.length>80)))bad();
 if(q.sort&&!['bayesian','relevance','priceAsc','priceDesc','approvedDesc'].includes(q.sort))bad();
 if(q.approvedSince&&(!/^\d{4}-\d{2}-\d{2}T/.test(q.approvedSince)||!Number.isFinite(Date.parse(q.approvedSince))))bad();
 for(const k of ['search','city'] as const)if(q[k]!==undefined&&(typeof q[k]!=='string'||q[k]!.length>150))bad();
 return q;
}
