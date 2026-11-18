import {createHash} from 'node:crypto';
import {GeoService} from '../services/geoService.js';
import {HttpError} from './httpError.js';
import type {ItineraryActivity,PlannerInput,ItineraryDay} from '../services/tourPlannerService.js';
export const TIME_AWARE_V2='TIME_AWARE_V2' as const;
export type TravelPace='relaxed'|'balanced'|'packed';
export type PlannerScheduling={requestedPace:TravelPace;effectivePace:TravelPace;feasibility:'FEASIBLE_UNDER_ASSUMPTIONS'|'PARTIALLY_FEASIBLE'|'INFEASIBLE'|'DATA_INSUFFICIENT';warnings:string[];route:{beforeKm:number|null;afterKm:number|null;basis:'HAVERSINE_SAME_CANDIDATES'};catalogFingerprint:string;mandatoryIds:string[];replanning?:{changedDays:number[];unchangedDays:number[]}};
export const timeMinute=(s:string)=>/^\d\d:\d\d$/.test(s)&&+s.slice(0,2)<24&&+s.slice(3)<60?+s.slice(0,2)*60 + +s.slice(3):NaN;
export const minuteText=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
export const validCoordinate=(p:any)=>typeof p?.latitude==='number'&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&typeof p?.longitude==='number'&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180;
export function pacePolicy(pace:TravelPace){const start=pace==='relaxed'?540:pace==='balanced'?510:480,end=pace==='packed'?1260:1230,rest=pace==='relaxed'?120:pace==='balanced'?60:30,buffer=pace==='relaxed'?20:pace==='balanced'?15:10;return{start,end,rest,buffer,maxSightseeing:Math.max(1,Math.floor((end-start-210-rest)/(150+buffer+15)))};}
export function catalogFingerprint(rows:any[],ids:string[]){return createHash('sha256').update(JSON.stringify([...new Set(ids)].sort().map(id=>{const p=rows.find(r=>r.id===id);return p?{id:p.id,name:p.name,category:p.category,status:p.status,businessStatus:p.business?.status,price:p.priceFrom,available:p.catalogPriceAvailable,latitude:p.latitude,longitude:p.longitude,duration:p.duration,hours:p.openingHours,highlights:p.highlights,metadata:p.catalogMetadata}:null;}))).digest('hex');}
export function routeDistance(rows:any[],anchor?:any){let sum=0,previous=validCoordinate(anchor)?anchor:undefined;for(const row of rows){if(previous&&validCoordinate(row))sum+=GeoService.calculateHaversineDistance(previous,row);previous=validCoordinate(row)?row:undefined;}return Number(sum.toFixed(2));}
/** Bounded nearest-neighbor and 2-opt; retain the original sequence if it is shorter. */
export function improveRoute<T extends {id:string}>(rows:T[],anchor?:any):T[]{
 if(rows.length<2||rows.some(p=>!validCoordinate(p)))return [...rows];const pending=[...rows],ordered:T[]=[];let current=validCoordinate(anchor)?anchor:pending.shift()!;if(!validCoordinate(anchor))ordered.push(current);
 while(pending.length){let best=0;for(let i=1;i<pending.length;i++)if(GeoService.calculateHaversineDistance(current,pending[i] as any)<GeoService.calculateHaversineDistance(current,pending[best] as any))best=i;current=pending.splice(best,1)[0];ordered.push(current);}
 for(let round=0;round<2;round++)for(let a=0;a<ordered.length-1;a++)for(let b=a+1;b<ordered.length;b++){const candidate=[...ordered.slice(0,a),...ordered.slice(a,b+1).reverse(),...ordered.slice(b+1)];if(routeDistance(candidate,anchor)<routeDistance(ordered,anchor))ordered.splice(0,ordered.length,...candidate);}
 return routeDistance(ordered,anchor)<=routeDistance(rows,anchor)?ordered:[...rows];
}
function opening(place:any,date:string):{windows:[number,number][];known:boolean}{
 const h=place?.openingHours,weekday=['sun','mon','tue','wed','thu','fri','sat'][new Date(date+'T00:00:00Z').getUTCDay()];const raw=h?.[date]??h?.[weekday]??h?.daily;
 if(typeof raw!=='string')return{windows:[],known:false};if(/^(?:closed|đóng cửa|dong cua)$/i.test(raw.trim()))return{windows:[],known:true};
 const windows:[number,number][]=[];for(const part of raw.split(/[;,]/)){const m=/^\s*(\d\d:\d\d)\s*[-–]\s*(\d\d:\d\d)\s*$/.exec(part);if(!m)return{windows:[],known:false};const a=timeMinute(m[1]),b=timeMinute(m[2]);if(!Number.isFinite(a)||!Number.isFinite(b)||a>=b)return{windows:[],known:false};windows.push([a,b]);}return{windows,known:windows.length>0};
}
function visitDuration(place:any){const s=String(place?.duration||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase(),m=/^\s*(\d+(?:[.,]\d+)?)\s*(phut|minutes?|gio|hours?)\s*$/.exec(s);if(m){const n=Number(m[1].replace(',','.'))*(/gio|hour/.test(m[2])?60:1);if(Number.isFinite(n)&&n>=15&&n<=720)return{minutes:Math.ceil(n),assumed:false};}return{minutes:150,assumed:true};}
/** Extend existing Activity objects, without a second itinerary schema or any pricing formula. */
export function schedulePlannerDay(activities:ItineraryActivity[],rows:any[],input:PlannerInput,dayIndex:number,daysCount:number,mandatory:Set<string>,hotel?:any){
 const policy=pacePolicy(input.pacing);let start=dayIndex===0&&input.arrivalTime?Math.max(policy.start,timeMinute(input.arrivalTime)):policy.start,end=dayIndex===daysCount-1&&input.departureTime?Math.min(policy.end,timeMinute(input.departureTime)):policy.end;
 if(dayIndex===0&&input.arrivalTime&&start>=policy.end)end=1439;
 if(dayIndex===daysCount-1&&input.departureTime&&end<=policy.start)start=0;
 if(start>=end)throw new HttpError(422,'Không còn quỹ thời gian trong ngày.','PLANNER_TIME_WINDOW_CONFLICT');
 const partial=start!==policy.start||end!==policy.end;
 const warnings:string[]=partial?['PARTIAL_DAY_TIME_WINDOW']:[],byId=new Map(rows.map(p=>[p.id,p])),date=new Date(Date.parse(input.startDate+'T00:00:00Z')+dayIndex*86400000).toISOString().slice(0,10);
 const sights=activities.filter(a=>a.category==='sightseeing'),source=sights.map(a=>byId.get(a.placeId)).filter(Boolean),order=improveRoute(source,hotel),lookup=new Map(sights.map(a=>[a.placeId,a]));
 const prepare=(a:ItineraryActivity,at:number,duration:number,source:string):ItineraryActivity=>{const place=byId.get(a.placeId);return{...a,latitude:validCoordinate(place)?place.latitude:null,longitude:validCoordinate(place)?place.longitude:null,startMinute:at,endMinute:at+duration,expectedStart:minuteText(at),expectedEnd:minuteText(at+duration),durationMinutes:duration,schedulingSource:source,...(!place?{imageUrl:undefined,recommendationReason:'Khoảng thời gian theo chính sách lập kế hoạch, chưa chọn dịch vụ.',description:'Khung thời gian theo giả định lập kế hoạch; chưa xác minh địa điểm hoặc giờ hoạt động.'}:{})};};
 const scheduled:ItineraryActivity[]=[],omitted:string[]=[];
 for(const [slot,nominal,duration]of [['lunch',750,90],['dinner',1110,120]] as const){
  const meal=activities.find(a=>a.timeSlot===slot);if(!meal)continue;const at=Math.max(start,nominal),stop=Math.min(end,nominal+duration),required=!!meal.placeId&&mandatory.has(meal.placeId);
  if(required&&(at!==nominal||stop!==nominal+duration))throw new HttpError(422,'Nhà hàng bắt buộc nằm ngoài khung bữa ăn đủ thời lượng.','MANDATORY_TIME_CONFLICT');
  if(stop-at<15){warnings.push(slot.toUpperCase()+'_OUTSIDE_TRAVEL_WINDOW_COST_NOT_INCLUDED');continue;}
  if(stop-at<duration)warnings.push('PARTIAL_DAY_MEAL_DURATION_REDUCED_REFERENCE_PRICE_RETAINED');
  const item=prepare(meal,at,stop-at,'PLANNER_MEAL_ASSUMPTION'),hours=opening(byId.get(meal.placeId),date);
  if(item.placeId&&hours.known&&!hours.windows.some(([x,y])=>at>=x&&stop<=y)){if(required)throw new HttpError(422,'Nhà hàng bắt buộc không mở trong khung bữa ăn.','MANDATORY_TIME_CONFLICT');item.placeId=undefined;item.latitude=null;item.longitude=null;item.imageUrl=undefined;item.description='Cần chọn dịch vụ phù hợp giờ hoạt động.';warnings.push('MEAL_OPENING_CONFLICT');}
  else if(!hours.known)warnings.push('MEAL_OPENING_HOURS_UNVERIFIED');
  if(!item.placeId){item.title=slot==='dinner'?'Dùng bữa tối (chưa chọn dịch vụ)':'Dùng bữa trưa (chưa chọn dịch vụ)';item.recommendationReason='Khung bữa ăn theo giả định, chưa xác nhận dịch vụ.';}
  scheduled.push(item);
 }
 const marker=activities.find(a=>a.category==='hotel');if(marker){if(end-start<15)throw new HttpError(422,'Không đủ khung giờ cho mốc lưu trú bắt buộc.','MANDATORY_TIME_CONFLICT');scheduled.push(prepare({...marker,title:'Nơi lưu trú đã chọn (mốc tham khảo)'},start,15,'HOTEL_REFERENCE_NOT_VERIFIED_CHECKIN'));}
 // Short travel days reserve a bounded fraction of the full-day rest policy, never a fabricated visit.
 const wantedRest=partial?Math.min(policy.rest,Math.floor((end-start)*policy.rest/(policy.end-policy.start))):policy.rest;
 const ordered=[...scheduled].sort((a,b)=>a.startMinute!-b.startMinute!),gaps:Array<{start:number;end:number}>=[];let edge=start;
 for(const a of ordered){if(a.startMinute!>edge)gaps.push({start:edge,end:a.startMinute!});edge=Math.max(edge,a.endMinute!);}if(edge<end)gaps.push({start:edge,end});
 const restGap=gaps.filter(g=>g.end>g.start).sort((a,b)=>{const near=(g:{start:number;end:number})=>g.start<=840&&g.end>840?0:g.start>=840?g.start-840:840-g.end;return near(a)-near(b)||b.end-b.start-(a.end-a.start);}).find(g=>partial||g.end-g.start>=wantedRest);
 const restDuration=restGap?Math.min(wantedRest,restGap.end-restGap.start):0;
 if(restDuration>0){const restStart=Math.max(restGap!.start,Math.min(840,restGap!.end-restDuration));scheduled.push(prepare({id:'act-'+(dayIndex+1)+'-rest',timeSlot:'afternoon',title:'Nghỉ ngơi và dự phòng thời gian',description:'Khoảng nghỉ theo quỹ thời gian thực có.',category:'leisure',durationMinutes:restDuration,estimatedCostVND:0,costSource:'Khoảng nghỉ không có dịch vụ được định giá.',latitude:null,longitude:null},restStart,restDuration,partial?'PARTIAL_DAY_REST_ASSUMPTION':'PLANNER_REST_POLICY'));}
 if(restDuration<policy.rest){if(!partial)throw new HttpError(422,'Không đủ quỹ nghỉ cho ngày đầy đủ.','PLANNER_TIME_WINDOW_CONFLICT');warnings.push('PARTIAL_DAY_REST_REDUCED_OR_OMITTED');}
 const transit=(from:any,to:any)=>validCoordinate(from)&&validCoordinate(to)?{minutes:GeoService.estimateTravelTimeMinutes(GeoService.calculateHaversineDistance(from,to),input.transportation),basis:'HAVERSINE_ETA_ASSUMPTION'}:{minutes:30,basis:'UNKNOWN_COORDINATES_BUFFER_30_MIN'};
 let cursor=start;
 for(const place of order){const item=lookup.get(place.id)!;const duration=visitDuration(place),hours=opening(place,date);if(duration.assumed)warnings.push('VISIT_DURATION_ASSUMED_150_MIN');if(!hours.known)warnings.push('OPENING_HOURS_UNVERIFIED');if(!validCoordinate(place))warnings.push('COORDINATES_UNVERIFIED');
  let at=cursor,found:number|undefined;
  for(let tries=0;tries<50&&at+duration.minutes<=end;tries++){
   scheduled.sort((a,b)=>a.startMinute!-b.startMinute!);const previous=[...scheduled].reverse().find(a=>a.endMinute!<=at),previousLocation=previous?previous:hotel;
   const incoming=transit(previousLocation,place),earliest=(previous?.endMinute??start)+incoming.minutes+policy.buffer;
   if(at<earliest){at=earliest;continue;}
   const collision=scheduled.find(a=>at<a.endMinute!&&at+duration.minutes>a.startMinute!);if(collision){at=collision.endMinute!;continue;}
   const next=scheduled.find(a=>a.startMinute!>=at+duration.minutes),outgoing=next&&next.category!=='leisure'?transit(place,next).minutes:0;
   if(next&&at+duration.minutes+outgoing+policy.buffer>next.startMinute!){at=next.endMinute!;continue;}
   if(hours.known){const window=hours.windows.find(([x,y])=>Math.max(at,x)+duration.minutes<=y);if(!window)break;if(at<window[0]){at=window[0];continue;}}
   found=at;break;
  }
  if(found===undefined){if(mandatory.has(place.id))throw new HttpError(422,'Địa điểm bắt buộc xung đột giờ mở cửa hoặc quỹ thời gian. Chưa tự bỏ lựa chọn.','MANDATORY_TIME_CONFLICT');omitted.push(place.id);warnings.push('OPTIONAL_ACTIVITY_TIME_CONFLICT');continue;}
  const activity=prepare(item,found,duration.minutes,duration.assumed?'ASSUMED_VISIT_DURATION':'PUBLIC_CATALOG_DURATION');activity.openingHoursStatus=hours.known?'PUBLISHED_WINDOW_CHECKED':'UNVERIFIED';scheduled.push(activity);cursor=activity.endMinute!;
 }
 scheduled.sort((a,b)=>a.startMinute!-b.startMinute!);
 for(let i=0;i<scheduled.length;i++){
  const a=scheduled[i],previous=i?scheduled[i-1]:undefined;
  if(previous&&a.startMinute!<previous.endMinute!)throw new HttpError(422,'Xung đột thời gian trong ngày.','PLANNER_TIME_WINDOW_CONFLICT');
  if(a.category==='leisure'||a.category==='hotel')continue;
  const t=transit(previous||hotel,a);a.transitBeforeMinutes=t.minutes;a.transitBasis=t.basis;a.bufferBeforeMinutes=policy.buffer;
  if(t.basis.startsWith('UNKNOWN'))warnings.push('TRANSIT_COORDINATES_UNVERIFIED');
  if(a.startMinute!-(previous?.endMinute??start)<t.minutes+policy.buffer){
   if(a.placeId&&mandatory.has(a.placeId))throw new HttpError(422,'Chưa đủ thời gian di chuyển tới dịch vụ bắt buộc.','MANDATORY_TIME_CONFLICT');
   if(partial&&a.category==='food'){const at=(previous?.endMinute??start)+t.minutes+policy.buffer;if(a.endMinute!-at>=15){a.startMinute=at;a.expectedStart=minuteText(at);a.durationMinutes=a.endMinute!-at;warnings.push('PARTIAL_DAY_MEAL_TRIMMED_FOR_TRANSIT_REFERENCE_PRICE_RETAINED');}else{scheduled.splice(i--,1);warnings.push('PARTIAL_DAY_OPTIONAL_MEAL_CANNOT_FIT_COST_NOT_INCLUDED');}}
   else warnings.push('FIXED_MEAL_TRANSIT_CONFLICT');
  }
 }
 return{activities:scheduled,warnings:[...new Set(warnings)],omitted,route:{beforeKm:source.every(validCoordinate)?routeDistance(source,hotel):null,afterKm:source.every(validCoordinate)?routeDistance(order,hotel):null},window:{start,end}};
}
