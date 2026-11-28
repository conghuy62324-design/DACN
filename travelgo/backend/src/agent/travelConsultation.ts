import type {NativeHotelTurn} from './nativeHotelConversation.js';
import {NativeHotelTools,currentHotelQuote,currentDetailQuote,renderNativeHotel,renderNativeHotelDetailPrices,type NativeHotelDetailResult,type NativeHotelSearchResult} from './nativeHotelTools.js';
import {renderReviewTradeoffs,renderScopedReview,reviewPreferenceScore} from './scopedReviewAdvice.js';
import {memoryInterestIds} from './customerPersonalization.js';
import {withinDeadline} from './provider.js';
import {CustomerMemoryService} from '../services/customerMemoryService.js';
import {RegisteredCatalogService} from '../services/registeredCatalogService.js';
import {TourPlannerService,type GeneratedItinerary,type PlannerInput} from '../services/tourPlannerService.js';
import {destinationAddressIds,resolveLocation,matchesLocation} from '../geography/vietnam.js';
import {streetKey} from '../hotels/validation.js';
import {TIME_AWARE_V2,timeMinute} from '../utils/plannerScheduling.js';
import {assessPlannerBudget} from '../utils/plannerFeasibility.js';
import {validateTravelPreferences} from '../utils/travelPreferences.js';
import {HttpError} from '../utils/httpError.js';
import type {AuthUser} from '../types/auth.js';
import {nativeEvidence,nativeHighlights,nativeSelectionRequest,persistedReviewStamp} from './nativeConsultationGrounding.js';
import {ReviewProcessingService,type ScopedReviewEvidence} from '../services/reviewProcessingService.js';

type Detail=Extract<NativeHotelDetailResult,{status:'READ'}>;
type HotelHit=NativeHotelSearchResult['items'][number];
type ReadListing=Awaited<ReturnType<RegisteredCatalogService['search']>>['items'][number];
type TravelCard=Pick<ReadListing,'id'|'name'|'category'|'address'|'href'> & {publishedDailyHours?:string};
type Lodging={name:string;totalVnd:number;expiresAt:string;sourceVersion:string;isDemo:boolean};
export type ConsultationReasoner={
    choose:(input:ReturnType<typeof nativeSelectionRequest>,active:AbortSignal)=>Promise<string[]|undefined>;
    sourceChanged:()=>void;
};
const currency=(amount:number)=>amount.toLocaleString('vi-VN')+' VND';
const stayCap=(d:NativeHotelTurn)=>Math.min(d.state.criteria.stayTotalMaxVnd??Infinity,d.state.criteria.tripTotalMaxVnd??Infinity,d.state.criteria.perRoomNightMaxVnd??Infinity);

function validDailyHours(raw:unknown) {
    if(typeof raw!=='string'||raw.length>80)return;
    const windows=raw.split(/[;,]/);
    if(windows.length&&windows.every(window=>{
        const match=/^\s*(\d\d:\d\d)\s*[-–]\s*(\d\d:\d\d)\s*$/.exec(window);
        return match&&timeMinute(match[1])<timeMinute(match[2]);
    }))return raw;
}
function card(p:ReadListing):TravelCard {
    const publishedDailyHours=validDailyHours(p.openingHours?.daily);
    return {id:p.id,name:p.name,category:p.category,address:p.address,href:p.href,...(publishedDailyHours?{publishedDailyHours}:{})};
}
function cardsText(label:string,items:TravelCard[],missing:string) {
    return label+'\n'+(items.length?items.map(p=>'- '+p.name+(p.address?' ('+p.address+')':'')+
        (p.publishedDailyHours?'. Giờ thường lệ theo catalog '+p.publishedDailyHours:'. Chưa xác minh giờ mở cửa')).join('\n'):missing);
}
function localizedRoom(r:Detail['rooms'][number]){
    return r.name+' · '+(r.view==='UNKNOWN'?'chưa rõ hướng nhìn':'hướng '+r.view)+
        (r.areaM2===null?'':', '+r.areaM2+' m²')+', tối đa '+r.maxOccupancy+' khách ('+r.maxAdults+' người lớn, '+r.maxChildren+' trẻ). '+
        (r.amenities.length?'Tiện nghi riêng '+r.amenities.join(', ')+'.':'Chưa có dữ liệu tiện nghi riêng.');
}

function detailMatchesRoom(r:Detail['rooms'][number],d:NativeHotelTurn){
    const q=d.state.query;
    return (!q.view||r.view===q.view)&&(q.roomAmenities??[]).every(a=>r.amenities.some(v=>v===a))&&
        (q.rooms??[]).every(g=>g.adults<=r.maxAdults&&g.childAges.length<=r.maxChildren&&g.adults+g.childAges.length<=r.maxOccupancy);
}
function compareDetail(detail:Detail,d:NativeHotelTurn,preferences:string[],now:number) {
    const query=d.state.query;
    const address=detail.address;
    const propertyMatches=(!query.streetName||d.state.streetGoals?.length&&!d.state.streetGoals.includes('hotel')||address?.streetKey===streetKey(query.streetName))&&
        (query.propertyAmenities??[]).every(a=>detail.propertyAmenities.includes(a));
    const rooms=propertyMatches?detail.rooms.filter(r=>detailMatchesRoom(r,d)).map(r=>{
        const quotes=r.offers.filter(o=>currentDetailQuote(o,now)).filter(o=>o.totalStayVnd<=stayCap(d));
        const best=quotes.sort((a,b)=>a.totalStayVnd-b.totalStayVnd)[0];
        return {...r,offers:detail.stay?(best?[best]:[]):r.offers.filter(o=>o.kind==='UNDATED_REFERENCE').sort((a,b)=>a.amountVnd-b.amountVnd).slice(0,1)};
    }).filter(r=>!detail.stay||r.offers.length):[];
    rooms.sort((a,b)=>{
        const amount=(r:typeof a)=>r.offers[0]?.kind==='STAY_QUOTE_SNAPSHOT'?r.offers[0].totalStayVnd:r.offers[0]?.kind==='UNDATED_REFERENCE'?r.offers[0].amountVnd:Infinity;
        return reviewPreferenceScore(detail.roomReviewEvidence[b.id],preferences)-reviewPreferenceScore(detail.roomReviewEvidence[a.id],preferences)||amount(a)-amount(b)||a.name.localeCompare(b.name,'vi');
    });
    return {...detail,rooms:rooms.slice(0,5),roomReviewEvidence:Object.fromEntries(rooms.slice(0,5).flatMap(r=>detail.roomReviewEvidence[r.id]?[[r.id,detail.roomReviewEvidence[r.id]]]:[]))};
}
function currentDetail(detail:Detail,d:NativeHotelTurn,now:number){
    const query=d.state.query,address=detail.address,location=resolveLocation(query.locationId);
    if(!location)return;
    const publishedHere=location.kind==='province'?address?.provinceCode===location.id:
        !!address?.tourismDestinationId&&destinationAddressIds(location).includes(address.tourismDestinationId);
    if(!publishedHere||!(Date.parse(detail.validUntil)>now))return;
    const propertyMatches=(query.propertyAmenities??[]).every(a=>detail.propertyAmenities.includes(a));
    return {...detail,rooms:detail.rooms.map(room=>({...room,offers:room.offers.filter(o=>
        o.kind!=='STAY_QUOTE_SNAPSHOT'||propertyMatches&&detailMatchesRoom(room,d)&&currentDetailQuote(o,now)&&o.totalStayVnd<=stayCap(d))}))};
}
function renderDetail(detail:Detail,d:NativeHotelTurn,preferences:string[],now:number) {
    const title=detail.name+(detail.dataClass==='DEMO'?' — SYNTHETIC':'')+
        (detail.address?.fullAddress?' · '+detail.address.fullAddress:'');
    if(d.compareRooms&&!detail.rooms.length)return title+'\nChưa tìm thấy hạng phòng có báo giá và sức chứa phù hợp với toàn bộ điều kiện đã nêu. Bạn muốn chỉnh điều kiện nào?';
    const roomId=d.compareRooms?undefined:d.state.focus?.roomTypeId;
    const rooms=(roomId?detail.rooms.filter(r=>r.id===roomId):detail.rooms).slice(0,5);
    const attributes=rooms.map(localizedRoom).join('\n');
    const prices=renderNativeHotelDetailPrices({...detail,rooms},roomId,now);
    const references=!detail.stay&&d.compareRooms?rooms.flatMap(r=>r.offers.filter(o=>o.kind==='UNDATED_REFERENCE').map(o=>r.name+' · tham khảo '+currency(o.amountVnd)+'/phòng/đêm, tồn phòng chưa xác minh.')).join('\n'):'';
    const opinions=d.compareRooms?rooms.map(r=>r.name+' · '+(preferences.length?
        renderReviewTradeoffs(detail.roomReviewEvidence[r.id],preferences):renderScopedReview(detail.roomReviewEvidence[r.id],r.name)||'Chưa đủ dữ liệu đánh giá cho hạng phòng.')).join('\n'):
        renderScopedReview(d.reviewRoom&&roomId?detail.roomReviewEvidence[roomId]:detail.reviewEvidence,rooms[0]?.name);
    return [title,attributes,detail.propertyAmenities.length?'Tiện nghi toàn khách sạn '+detail.propertyAmenities.join(', ')+'.':'',prices,references,opinions].filter(Boolean).join('\n');
}

function hotelTradeoffs(result:NativeHotelSearchResult,preferences:string[],now:number){
    const prices=result.items.flatMap(p=>{const q=currentHotelQuote(result,p,now);return q?[q.totalVnd]:[];});
    const cheapest=prices.length>1?Math.min(...prices):undefined;
    return result.items.map(p=>{
        const price=currentHotelQuote(result,p,now)?.totalVnd;
        const cost=cheapest===undefined||price===undefined?'':price===cheapest?'Thấp nhất trong các báo giá vừa tra cùng kỳ.':'Cao hơn lựa chọn rẻ nhất '+currency(price-cheapest)+'.';
        const reviews=renderReviewTradeoffs(p.reviewEvidence,preferences);
        return cost||reviews?p.name+' · '+[cost,reviews].filter(Boolean).join(' '):'';
    }).filter(Boolean).join('\n');
}

export function consultationBudget(d:NativeHotelTurn, lodging:Lodging|undefined, plan:GeneratedItinerary|undefined, now:number){
    const amounts=d.state.amounts;
    const limit=d.state.criteria.tripTotalMaxVnd;
    const lodgingVnd=lodging&&Date.parse(lodging.expiresAt)>now?lodging.totalVnd:undefined;
    const items=plan?.days.flatMap(day=>day.activities);
    const sum=(category:'food'|'sightseeing')=>items?.some(a=>a.category===category)?items.filter(a=>a.category===category).reduce((n,a)=>n+a.estimatedCostVND,0):undefined;
    const parts=[
        {category:'Lưu trú',amount:lodgingVnd,source:lodgingVnd!==undefined?'HOTEL_QUOTE':'UNKNOWN'},
        {category:'Ăn uống',amount:amounts?.foodVnd??sum('food'),source:amounts?.foodVnd!==undefined?'USER_ALLOCATION':sum('food')!==undefined?'PLANNER_ESTIMATE':'UNKNOWN'},
        {category:'Tham quan',amount:amounts?.sightseeingVnd??sum('sightseeing'),source:amounts?.sightseeingVnd!==undefined?'USER_ALLOCATION':sum('sightseeing')!==undefined?'PLANNER_ESTIMATE':'UNKNOWN'},
        {category:'Di chuyển',amount:amounts?.transportVnd,source:amounts?.transportVnd!==undefined?'USER_ALLOCATION':'UNKNOWN'},
        ...(amounts?.reserveVnd!==undefined?[{category:'Dự phòng',amount:amounts.reserveVnd,source:'USER_ALLOCATION'}]:[]),
    ] as const;
    const subtotal=parts.reduce((n,p)=>n+(p.amount??0),0);
    const hasAmount=parts.some(p=>p.amount!==undefined);
    const missing=parts.filter(p=>p.amount===undefined).map(p=>p.category);
    const over=limit===undefined||!hasAmount?undefined:assessPlannerBudget(limit,subtotal).overBudgetVND;
    return {limitVnd:limit,parts,subtotalVnd:hasAmount?subtotal:undefined,missing,overBudgetVnd:over,
        ...(lodgingVnd!==undefined?{hotelQuote:{name:lodging!.name,expiresAt:lodging!.expiresAt,sourceVersion:lodging!.sourceVersion,isDemo:lodging!.isDemo}}:{})};
}
function renderBudget(budget:ReturnType<typeof consultationBudget>){
    const label:Record<string,string>={HOTEL_QUOTE:'báo giá HotelReadService'+(budget.hotelQuote?' của '+budget.hotelQuote.name+(budget.hotelQuote.isDemo?' · SYNTHETIC':''):''),
        PLANNER_ESTIMATE:'dự toán của Planner',USER_ALLOCATION:'khoản bạn dự trù',UNKNOWN:'chưa có số liệu'};
    const parts=budget.parts.map(p=>p.category+' '+(p.amount===undefined?label.UNKNOWN:currency(p.amount)+' ('+label[p.source]+')')).join('. ');
    const limit=budget.limitVnd===undefined?'':'Ngân sách cả chuyến '+currency(budget.limitVnd)+'. ';
    const subtotal=budget.subtotalVnd===undefined?'':'Cộng các khoản đã có số là '+currency(budget.subtotalVnd)+'. ';
    const advice=budget.overBudgetVnd?('Các khoản này đã vượt ngân sách '+currency(budget.overBudgetVnd)+'. Bạn có thể cân nhắc bớt một hoạt động, đổi chỗ ăn hoặc tra một hạng phòng có tổng giá thấp hơn trong cùng kỳ.'):
        budget.limitVnd!==undefined&&budget.subtotalVnd!==undefined?'Các khoản đã tính nằm trong ngân sách dự kiến.':'';
    return [limit+parts+'.',subtotal+advice,budget.missing.length?'Còn thiếu '+budget.missing.join(', ').toLowerCase()+', nên chưa chốt được chi phí cả chuyến.':'Các khoản ngoài lưu trú vẫn là dự toán hoặc mức bạn phân bổ.'].filter(Boolean).join(' ');
}

function publishedStreetMatches(address:unknown,street:string) {
    if(typeof address!=='string')return false;
    const first=address.split(',')[0].replace(/^\d+[a-z]?(?:[/-]\d+[a-z]?)*\s+/i,'');
    return streetKey(first)===streetKey(street);
}
function formatDays(plan:GeneratedItinerary) {
    return plan.days.map(day=>{
        const activities=day.activities.filter(a=>!!a.placeId).map(a=>
            (a.expectedStart?a.expectedStart+' ':'')+a.title+
            (a.openingHoursStatus==='UNVERIFIED'?' (giờ mở cửa chưa xác minh)':''));
        return {date:day.date,dayNumber:day.dayNumber,activities};
    });
}

export function consultationPlannerInput(state:NativeHotelTurn['state'],preferences:PlannerInput['preferences'],hotelId?:string):PlannerInput|undefined{
    const stay=state.query,limit=state.criteria.tripTotalMaxVnd;
    if(!stay.locationId||!stay.checkIn||!stay.checkOut||!stay.rooms?.length||state.pendingDates||state.pendingGuests||
        !state.transportation||state.transportation==='unsupported'||!state.departure||!limit)return;
    return {destinationCity:stay.locationId,departureCity:state.departure,startDate:stay.checkIn,endDate:stay.checkOut,
        adults:stay.rooms.reduce((n,r)=>n+r.adults,0),children:stay.rooms.reduce((n,r)=>n+r.childAges.length,0),totalBudget:limit,
        transportation:state.transportation,preferences,pacing:state.pace??'balanced',planningVersion:TIME_AWARE_V2,
        mandatoryPlaceIds:hotelId?[hotelId]:[]};
}

export async function runTravelConsultation(
    decision:NativeHotelTurn,user:AuthUser,hotels:NativeHotelTools,catalog:RegisteredCatalogService,
    planner:typeof TourPlannerService.generatePersonalizedItinerary,clock:()=>number,active:AbortSignal,reasoner?:ConsultationReasoner,
){
    const state=decision.state,goals=decision.goals??state.goals??[];
    const locationId=state.query.locationId!;
    const plannerRequested=goals.includes('planner');
    const dining=(goals.includes('restaurant')||plannerRequested)&&!state.avoidSeafood,places=goals.includes('places')||plannerRequested;
    const interestsRelevant=(dining||places)&&state.interests===undefined;
    const qualityRelevant=!decision.hotelPriceOnly&&!state.ignoreSavedQuality&&!state.reviewPreferences?.length&&(!!decision.search||!!decision.detail);
    const canUseSaved=state.useSavedPreferences!==false&&(interestsRelevant||qualityRelevant);
    const loadMemory=()=>canUseSaved?CustomerMemoryService.forAdvice(user.id).catch(()=>[]):Promise.resolve([]);
    const categories:('restaurant'|'attraction'|'tour')[]=[...(dining?['restaurant' as const]:[]),...(places?['attraction' as const,'tour' as const]:[])];
    const tools:string[]=[],notes:string[]=[];
    let catalogQuestion:string|undefined;
    const [memory,available]=await Promise.all([
        withinDeadline(loadMemory,5000),
        categories.length?withinDeadline(()=>catalog.consultationPlaces(locationId,categories),7000).catch(e=>{
            if(!(e instanceof HttpError)||e.code!=='AGENT_CONSULTATION_CATALOG_LIMIT')throw e;
            catalogQuestion=e.message;
            return [];
        }):Promise.resolve([]),
    ]);
    active.throwIfAborted();
    const preferences=state.reviewPreferences?.length?state.reviewPreferences:state.ignoreSavedQuality||decision.hotelPriceOnly?[]:
        [...new Set<string>(memory.filter(p=>p.type==='quality'&&['quiet','clean','value'].includes(p.value)).map(p=>p.value))];
    const interests=state.interests??validateTravelPreferences([...new Set(memoryInterestIds(memory))]);
    const cuisine=state.seafood?'seafood':decision.cuisine;
    const scoped=available.filter(p=>{
        if(state.query.streetName&&(!goals.includes('hotel')||state.streetGoals?.includes(p.category==='restaurant'?'restaurant':'places'))&&
            !publishedStreetMatches(p.address,state.query.streetName))return false;
        return !cuisine||p.category!=='restaurant'||p.catalogMetadata?.cuisines?.includes(cuisine);
    });
    const catalogOptions={eligibleCatalog:scoped},filters={locationId,preferences:interests};
    let [search,hotelDetail,restaurants,attractions]=await Promise.all([
        decision.search?hotels.search(user,decision.search,preferences,
            {placeIds:decision.scopeIds,tripLimit:state.criteria.tripTotalMaxVnd,includeReviews:!decision.hotelPriceOnly}):Promise.resolve(undefined),
        decision.detail?hotels.detail(user,decision.detail,false,!!decision.compareRooms):Promise.resolve(undefined),
        dining&&!catalogQuestion?catalog.search('restaurant',{...filters,...(cuisine?{restaurantCuisine:cuisine}:{})},catalogOptions):Promise.resolve(undefined),
        places&&!catalogQuestion?catalog.search('places',filters,catalogOptions):Promise.resolve(undefined),
    ]);
    active.throwIfAborted();
    if(search){
        tools.push('native_hotel_search');
        if(!state.focus)state.listed=search.items.map(p=>({id:p.placeId,name:p.name,roomTypeId:p.selected?.room.id}));
        else if(search.items[0]?.selected)state.focus.roomTypeId=search.items[0].selected.room.id;
    }
    if(hotelDetail)tools.push('native_hotel_detail');
    if(restaurants)tools.push('search_registered_restaurants');
    if(attractions)tools.push('search_places');
    const restaurantCards=restaurants?.items.slice(0,3).map(card)??[],attractionCards=attractions?.items.slice(0,3).map(card)??[];
    const hotelHit:HotelHit|undefined=search?.items[0];
    let plan:GeneratedItinerary|undefined,planQuestion:string|undefined;
    if(plannerRequested){
        const stay=state.query,limit=state.criteria.tripTotalMaxVnd;
        const plannerInput=consultationPlannerInput(state,interests);
        if(state.transportation==='unsupported')planQuestion='Planner hiện hỗ trợ ô tô hoặc xe máy giữa các điểm. Bạn muốn dùng phương tiện nào trong hai loại này để lập lịch?';
        else if(!plannerInput)
            planQuestion='Để lập lịch, mình cần '+[
                ...(!state.departure?['nơi xuất phát']:[]),...(!stay.checkIn||!stay.checkOut||state.pendingDates?['ngày đi và ngày về']:[]),
                ...(!stay.rooms?.length||state.pendingGuests?['số người lớn và trẻ em']:[]),
                ...(!state.transportation?['ô tô hoặc xe máy']:[]),...(!limit?['ngân sách cả chuyến']:[]),
            ].join(', ')+'.';
        else if((state.criteria.durationDays??0)>10)planQuestion='Planner hỗ trợ tối đa 10 ngày. Bạn muốn lập lịch cho đoạn nào trong chuyến đi?';
        else if(catalogQuestion)planQuestion='Bạn chọn khu vực hẹp hơn để Planner có thể lập lịch từ danh mục.';
        else if(!attractionCards.length)planQuestion='Danh mục khu vực này chưa có điểm tham quan đủ điều kiện để lập lịch có địa điểm cụ thể.';
        else if(state.focus&&(!hotelHit||!currentHotelQuote(search!,hotelHit,clock())))
            planQuestion='Khách sạn đã chọn chưa có báo giá đủ điều kiện cho kỳ này. Bạn muốn kiểm tra lại lựa chọn trước khi lấy làm điểm xuất phát?';
        else {
            const anchor=hotelHit&&currentHotelQuote(search!,hotelHit,clock())?
                await withinDeadline(()=>catalog.consultationHotel(hotelHit.placeId),5000):undefined;
            active.throwIfAborted();
            if(hotelHit&&(!anchor||!matchesLocation(anchor,locationId)))notes.push('Planner chưa xác minh được chỗ ở trong danh mục lập lịch.');
            const input=anchor&&matchesLocation(anchor,locationId)?consultationPlannerInput(state,interests,anchor.id)!:plannerInput;
            try{
                tools.push('plan_trip');
                const anchorPlace=anchor&&input.mandatoryPlaceIds?.length?
                    {...anchor,...(hotelHit?.isDemo?{latitude:null,longitude:null}:{})}:undefined;
                const planningCatalog=scoped.map(place=>place.catalogMetadata?.coordinateBasis==='SYNTHETIC_SCENARIO'?
                    {...place,latitude:null,longitude:null}:place);
                plan=await withinDeadline(()=>planner(input,{catalog:anchorPlace?[...planningCatalog,anchorPlace]:planningCatalog}),5000);
            }catch(e){
                if(!(e instanceof HttpError)||e.statusCode>=500)throw e;
                planQuestion='Planner chưa tìm được lịch phù hợp với các điều kiện đã chọn. Bạn muốn giữ các địa điểm và đổi thời lượng hay nhịp đi?';
            }
        }
    }
    const includeBudget=!decision.hotelPriceOnly&&(goals.includes('budget')||state.criteria.tripTotalMaxVnd!==undefined||plannerRequested||Object.keys(state.amounts??{}).some(k=>['reserveVnd','foodVnd','sightseeingVnd','transportVnd'].includes(k)));
    const snapshot=()=>{
        const now=clock();
        const freshDetail=hotelDetail?.status==='READ'?currentDetail(hotelDetail,decision,now):undefined;
        const detail=freshDetail&&decision.compareRooms?compareDetail(freshDetail,decision,preferences,now):freshDetail;
        const quote=hotelHit&&search?currentHotelQuote(search,hotelHit,now):undefined;
        const lodging=quote&&hotelHit?{name:hotelHit.name,totalVnd:quote.totalVnd,expiresAt:quote.expiresAt,sourceVersion:quote.sourceVersion,isDemo:hotelHit.isDemo}:undefined;
        return {now,detail,budget:includeBudget?consultationBudget(decision,lodging,plan,now):undefined};
    };
    const evidence=(view:ReturnType<typeof snapshot>)=>nativeEvidence({decision,search,...view,restaurants:restaurantCards,attractions:attractionCards,
        plan:plan?{days:plan.daysCount,nights:plan.nightsCount,transportation:plan.transportation}:undefined});
    const before=reasoner&&!decision.hotelPriceOnly?evidence(snapshot()):undefined;
    if(before?.size&&canUseSaved&&memory.length&&JSON.stringify(await withinDeadline(loadMemory,5000))!==JSON.stringify(memory))
        throw new HttpError(409,'Sở thích hoặc quyền ghi nhớ vừa thay đổi. Bạn gửi lại yêu cầu nhé.','AGENT_MEMORY_CHANGED');
    active.throwIfAborted();
    const selection=before?.size?await reasoner?.choose(nativeSelectionRequest(before,decision,
        decision.search||decision.detail?preferences:[],dining||places?interests:[]),active):undefined;
    active.throwIfAborted();
    const recheckReviews=async()=>{
        const retained=(prior:ScopedReviewEvidence|null|undefined,fresh:ScopedReviewEvidence|undefined)=>{
            const stamp=persistedReviewStamp(prior);
            return prior?.status==='READY'&&(!stamp||stamp!==persistedReviewStamp(fresh))?undefined:prior;
        };
        const searchBefore=search,detailBefore=hotelDetail;
        const roomEvidence:Record<string,ScopedReviewEvidence>=detailBefore?.status==='READ'?detailBefore.roomReviewEvidence:{};
        const refreshSearch=searchBefore?Promise.all(searchBefore.items.map(async p=>{
            if(p.reviewEvidence?.status!=='READY')return p;
            const fresh=await withinDeadline(()=>ReviewProcessingService.read(p.placeId,p.selected?.room.id),2500).catch(()=>undefined);
            return {...p,reviewEvidence:retained(p.reviewEvidence,fresh)};
        })):undefined;
        const refreshDetail=detailBefore?.status==='READ'&&(detailBefore.reviewEvidence?.status==='READY'||Object.values(roomEvidence).some(e=>e?.status==='READY'))?
            withinDeadline(()=>ReviewProcessingService.readRooms(detailBefore.placeId,Object.keys(roomEvidence).slice(0,10)),2500).catch(()=>undefined):undefined;
        const [items,freshDetail]=await Promise.all([refreshSearch,refreshDetail]);
        if(searchBefore&&items)search={...searchBefore,items};
        if(detailBefore?.status==='READ'&&refreshDetail)hotelDetail={...detailBefore,
            reviewEvidence:retained(detailBefore.reviewEvidence,freshDetail?.hotel)??null,
            roomReviewEvidence:Object.fromEntries(Object.entries(roomEvidence).flatMap(([id,prior])=>{
                const safe=retained(prior,freshDetail?.rooms[id]);
                return safe?[[id,safe]]:[];
            }))};
    };
    const [latestMemory]=await Promise.all([canUseSaved?withinDeadline(loadMemory,5000):undefined,
        selection!==undefined?recheckReviews():undefined]);
    if(canUseSaved&&JSON.stringify(latestMemory)!==JSON.stringify(memory))
        throw new HttpError(409,'Sở thích hoặc quyền ghi nhớ vừa thay đổi. Bạn gửi lại yêu cầu nhé.','AGENT_MEMORY_CHANGED');
    active.throwIfAborted();
    const view=snapshot(),{now,detail,budget}=view;
    const highlights=before&&selection?.length?nativeHighlights(selection,before,evidence(view)):undefined;
    if(selection?.length&&!highlights)reasoner?.sourceChanged();
    const visibleSearch=search?{...search,items:search.items.map(p=>p.selected?.quote&&!currentHotelQuote(search,p,now)?
        {...p,selected:{...p.selected,quote:null,promotion:null},availability:'UNKNOWN'}:p)}:undefined;
    const planDays=plan?formatDays(plan):undefined;
    const text=[
        decision.hotelQuestion,
        highlights,
        search?[renderNativeHotel(search,now,decision.hotelPriceOnly),decision.hotelPriceOnly?'':hotelTradeoffs(search,preferences,now)].filter(Boolean).join('\n'):undefined,
        detail?renderDetail(detail,decision,preferences,now):undefined,
        restaurants?cardsText('Chỗ ăn · '+resolveLocation(locationId)?.catalogName,restaurantCards,'Chưa tìm thấy nhà hàng công khai khớp điều kiện ở khu vực này.'):undefined,
        state.avoidSeafood&&(goals.includes('restaurant')||plannerRequested)?'Danh mục chưa có thành phần món ăn đủ để lọc quán theo yêu cầu tránh hải sản. Bạn có thể xác nhận thực đơn và thành phần trực tiếp với quán.':undefined,
        attractions?cardsText('Điểm tham quan · '+resolveLocation(locationId)?.catalogName,attractionCards,'Chưa tìm thấy điểm tham quan công khai khớp điều kiện ở khu vực này.'):undefined,
        state.proximity?'Khoảng cách tới biển, chỗ ăn hoặc nơi ở chưa được xác minh. Các tên trong danh sách chỉ khớp khu vực đã nêu.':undefined,
        planDays?'Lịch dự kiến, chưa lưu chuyến\n'+planDays.map(day=>'Ngày '+day.dayNumber+' ('+day.date+') · '+(day.activities.join(' → ')||'Chưa có điểm trong catalog khớp khung giờ.')).join('\n')+
            '\nGiờ xếp lịch là dự kiến. Planner chưa tính chi phí đi lại hoặc xác nhận dịch vụ còn chỗ.':undefined,
        catalogQuestion,planQuestion,...notes,budget?renderBudget(budget):undefined,
    ].filter(Boolean).join('\n\n');
    const completed=!!(search?.items.length||detail?.rooms.length||restaurantCards.length||attractionCards.length||plan||goals.includes('budget')&&budget?.subtotalVnd!==undefined);
    const status=completed?'completed':decision.hotelQuestion||planQuestion||catalogQuestion||state.avoidSeafood?'needs_input':'no_results';
    return {status,text: text||'Chưa có dữ liệu phù hợp để tư vấn cho yêu cầu này.',
        extra:{tool:tools[0],...(visibleSearch||detail?{nativeHotel:visibleSearch??detail}:{}),
            travelConsultation:{contract:'TRAVEL_CONSULTATION_V1',tools,locationId,goals,restaurants:restaurantCards,attractions:attractionCards,
                ...(budget?{budget}:{}),...(planDays?{itinerary:{days:planDays,transportation:plan!.transportation,pacing:plan!.pacing,source:'EXISTING_TRAVELGO_PLANNER'}}:{}),
                ...(planQuestion?{plannerQuestion:planQuestion}:{}),mutationAuthority:false,bookingAuthority:false,
                personalMemoryUsed:qualityRelevant&&preferences.length>0||interestsRelevant&&interests.length>0}}};
}
