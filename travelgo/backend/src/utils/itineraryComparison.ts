import {isDeepStrictEqual} from 'node:util';

/** Acceptance contract only. No price, review eligibility, revision or source field is excluded. */
export function compareItineraryBusinessFields(before:unknown,after:unknown){
 const left=structuredClone(before),right=structuredClone(after),ignoredPaths:string[]=[],changedPaths:string[]=[];
 const a=(left as any)?.hotelSuggestion?.reviewInsights,b=(right as any)?.hotelSuggestion?.reviewInsights;
 const timestamp=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v)&&Number.isFinite(Date.parse(v));
 // Proven volatile in21.35. Missing/invalid timestamps remain observable changes.
 if(a&&b&&timestamp(a.computedAt)&&timestamp(b.computedAt)){delete a.computedAt;delete b.computedAt;ignoredPaths.push('hotelSuggestion.reviewInsights.computedAt');}
 const walk=(x:any,y:any,p:string)=>{if(isDeepStrictEqual(x,y))return;if(x&&y&&typeof x==='object'&&typeof y==='object'&&Array.isArray(x)===Array.isArray(y)){for(const k of new Set([...Object.keys(x),...Object.keys(y)]))walk(x[k],y[k],p?p+'.'+k:k);}else changedPaths.push(p||'$');};
 walk(left,right,'');return{version:'ITINERARY_BUSINESS_V1' as const,equal:isDeepStrictEqual(left,right),ignoredPaths,changedPaths};
}
