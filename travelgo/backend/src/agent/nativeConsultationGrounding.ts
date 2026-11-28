import type {NativeHotelTurn} from './nativeHotelConversation.js';
import {currentDetailQuote,currentHotelQuote,type NativeHotelDetailResult,type NativeHotelSearchResult} from './nativeHotelTools.js';
import type {consultationBudget} from './travelConsultation.js';
import type {ScopedReviewEvidence} from '../services/reviewProcessingService.js';
import {REVIEW_ANALYSIS_METHOD,ASPECT_LABELS} from './reviewAspects.js';
import {projectModelMessage,type MessageProjection} from './modelPrivacy.js';
import {GROUNDED_RESPONSE_SCHEMA} from './naturalGrounding.js';
import {NATURAL_RESPONSE_SCHEMA} from './naturalContract.js';
import {assertStructuredOutput} from './structuredOutput.js';
import {validReviewPreference} from './scopedReviewAdvice.js';
import {HttpError} from '../utils/httpError.js';

type Detail=Extract<NativeHotelDetailResult,{status:'READ'}>;
type Card={id:string;name:string;category:string;address?:string|null;publishedDailyHours?:string};
type OptionFact={source:string;scope:readonly string[];value:object;label:string;fingerprint:string};
export type NativeEvidence=ReadonlyMap<string,OptionFact>;
const safeText=(s:unknown,max=95)=>typeof s==='string'?projectModelMessage(s).text.slice(0,max):undefined;
const amount=(n:number)=>n.toLocaleString('vi-VN')+' VND';
export function persistedReviewStamp(e:ScopedReviewEvidence|null|undefined){
    return e?.status==='READY'&&'sourceStamp' in e&&typeof e.sourceStamp==='string'?e.sourceStamp:undefined;
}

function review(e:ScopedReviewEvidence|null|undefined,placeId:string,roomId?:string){
    if(!e||e.placeId!==placeId||e.roomTypeId!=null&&e.roomTypeId!==roomId||!persistedReviewStamp(e)||!('sourceRevision' in e))return;
    const summaries=[e.hotel,e.room].flatMap((data,i)=>{
        if(!data||data.method!==REVIEW_ANALYSIS_METHOD||data.placeId!==placeId||
            (i===1?(data.roomTypeId!==roomId||data.attribution!=='EXACT_VERIFIED_BOOKING_ITEM'):data.roomTypeId!==null)||
            !Number.isSafeInteger(data.analyzedReviewCount)||data.analyzedReviewCount<1)return [];
        const aspects=Object.keys(ASPECT_LABELS).flatMap(key=>{
            const a=data.aspects?.[key];
            if(!a||!Number.isSafeInteger(a.supportCount)||a.supportCount<1)return [];
            return [{key,count:a.supportCount,positive:a.counts.POSITIVE,negative:a.counts.NEGATIVE,mixed:a.counts.MIXED}];
        }).slice(0,8);
        return [{scope:i===1?'EXACT_ROOM':'HOTEL',count:data.analyzedReviewCount,aspects}];
    });
    return summaries.length?{method:REVIEW_ANALYSIS_METHOD,opinionOnly:true,sourceRevision:e.sourceRevision,summaries}:undefined;
}
function address(a:Detail['address']){
    return a?{street:safeText(a.streetName),houseNumber:safeText(a.houseNumber,20),ward:safeText(a.wardOrCommune),
        province:safeText(a.provinceOrCity),destination:a.tourismDestinationId}:undefined;
}
function roomFacts(room:Detail['rooms'][number]|NonNullable<NativeHotelSearchResult['items'][number]['selected']>['room']){
    return {name:safeText(room.name),view:room.view,areaM2:room.areaM2,capacity:{total:room.maxOccupancy,adults:room.maxAdults,children:room.maxChildren},
        amenities:room.amenities.slice(0,12),equipment:{beds:room.beds.slice(0,6).map(b=>({type:safeText(b.type,30),count:b.quantity})),
            balcony:room.balcony,window:room.hasWindow,kitchen:room.kitchen,privateBathroom:room.privateBathroom}};
}
export function nativeEvidence(input:{
    decision:NativeHotelTurn;search?:NativeHotelSearchResult;detail?:Detail;
    restaurants:Card[];attractions:Card[];budget?:ReturnType<typeof consultationBudget>;
    plan?:{days:number;nights:number;transportation:string};now:number;
}):NativeEvidence {
    const {search,detail,decision,now}=input;
    const facts=new Map<string,OptionFact>();
    const add=(id:string,source:string,scope:string[],value:object,label:string,version:string)=>{
        facts.set(id,{source,scope,value,label,fingerprint:JSON.stringify([scope,source,version,value])});
    };
    for(const [i,p] of (search?.items??[]).slice(0,5).entries()){
        if(!(Date.parse(p.validUntil)>now)||!p.sourceVersion)continue;
        const selected=p.selected,room=selected?.room,rate=selected?.rate;
        if(room&&room.placeId!==p.placeId)continue;
        const q=search&&currentHotelQuote(search,p,now);
        if(q&&(q.placeId!==p.placeId||q.roomTypeId!==room?.id||q.ratePlanId!==rate?.id||q.checkIn!==search?.criteria.checkIn||
            q.checkOut!==search?.criteria.checkOut||q.isDemo!==p.isDemo||q.asOf!==p.asOf||!q.sourceVersion))continue;
        const label=p.name+(room?' · '+room.name:'')+(p.isDemo?' · SYNTHETIC':'');
        add('hotel.'+(i+1),'HOTEL_READ_SERVICE',[p.placeId,...(room?[room.id]:[]),...(rate?[rate.id]:[])],{
            name:safeText(p.name),destination:decision.state.query.locationId,address:address(p.address),synthetic:p.isDemo,
            amenities:p.propertyAmenities?.slice(0,12),room:room?roomFacts(room):undefined,rate:rate?{name:safeText(rate.name),mealPlan:rate.mealPlan}:undefined,
            availability:q?'VERIFIED_SNAPSHOT':'UNKNOWN',
            stay:q?{checkIn:q.checkIn,checkOut:q.checkOut,rooms:search!.criteria.rooms,nights:q.nights,roomCount:q.roomCount}:undefined,
            quote:q?{totalVnd:q.totalVnd,expiresAt:q.expiresAt,minimumAvailableRooms:q.minimumAvailableRooms,
                promotion:q.promotionId?{name:selected?.promotion?.id===q.promotionId?safeText(selected.promotion.name):undefined,discountVnd:q.discountVnd}:undefined}:undefined,
            review:review(p.reviewEvidence,p.placeId,room?.id)
        },label+(q?' · tổng lưu trú '+amount(q.totalVnd):''),p.sourceVersion+'|'+(q?.sourceVersion??'')+'|'+(persistedReviewStamp(p.reviewEvidence)??''));
    }
    if(detail&&Date.parse(detail.validUntil)>now&&detail.sourceVersion){
        const focused=decision.compareRooms?undefined:decision.state.focus?.roomTypeId;
        for(const [i,r] of detail.rooms.filter(room=>!focused||room.id===focused).slice(0,5).entries()){
            if(r.placeId!==detail.placeId)continue;
            const quotes=r.offers.filter(o=>currentDetailQuote(o,now)).filter(o=>!!detail.stay&&o.roomCount===detail.stay.rooms.length&&
                Number.isSafeInteger(o.totalStayVnd)&&o.totalStayVnd>=0&&o.asOf===detail.asOf&&!!o.sourceVersion).slice(0,2);
            for(const [j,q] of (quotes.length?quotes:[undefined]).entries()){
                const synthetic=detail.dataClass==='DEMO',e=detail.roomReviewEvidence[r.id]??detail.reviewEvidence;
                const label=(detail.name??'Khách sạn')+' · '+r.name+(synthetic?' · SYNTHETIC':'');
                add('room.'+(i+1)+'.'+(j+1),'HOTEL_READ_SERVICE',[detail.placeId,r.id,...(q?[q.ratePlanId]:[])],{
                    name:safeText(detail.name),destination:decision.state.query.locationId,address:address(detail.address),synthetic,
                    amenities:detail.propertyAmenities?.slice(0,12),room:roomFacts(r),availability:q?'VERIFIED_SNAPSHOT':'UNKNOWN',
                    stay:q?{...detail.stay,nights:q.nights,roomCount:q.roomCount}:undefined,
                    quote:q?{totalVnd:q.totalStayVnd,expiresAt:q.expiresAt,minimumAvailableRooms:q.minimumAvailableRooms,
                        promotion:q.promotionId?{name:safeText(q.promotionName),discountVnd:q.discountVnd}:undefined}:undefined,
                    review:review(e,detail.placeId,r.id)
                },label+(q?' · tổng lưu trú '+amount(q.totalStayVnd):''),detail.sourceVersion+'|'+(q?.sourceVersion??'')+'|'+(persistedReviewStamp(e)??''));
            }
        }
    }
    for(const [kind,cards] of [['restaurant',input.restaurants],['attraction',input.attractions]] as const){
        for(const [i,p] of cards.slice(0,3).entries())add(kind+'.'+(i+1),'PUBLISHED_CATALOG',[p.id],{
            name:safeText(p.name),category:p.category,address:safeText(p.address,130),regularHours:p.publishedDailyHours,
        },p.name,'CURRENT_TURN');
    }
    if(input.plan)add('plan','PLANNER_ESTIMATE',[],input.plan,'Lịch dự kiến từ Planner','CURRENT_TURN');
    if(input.budget){
        const {parts,limitVnd,subtotalVnd,overBudgetVnd,missing,hotelQuote}=input.budget;
        add('budget','SERVER_CALCULATION',[],{parts,limitVnd,subtotalVnd,overBudgetVnd,missing,synthetic:hotelQuote?.isDemo},
            overBudgetVnd?'Các khoản đã tính vượt ngân sách '+amount(overBudgetVnd):'Bảng dự toán các khoản đã có dữ liệu',
            (hotelQuote?.sourceVersion??'')+'|'+(hotelQuote?.expiresAt??''));
    }
    return facts;
}

export function nativeSelectionRequest(facts:NativeEvidence,decision:NativeHotelTurn,preferences:string[],interests:string[]){
    const offered:Record<string,{source:string;value:object}>={};
    const keys=[...facts.keys()];
    // Keep diverse categories under the cap and keep each hotel/room/rate bundle atomic.
    const primary=['hotel.1','hotel.2','room.1.1','room.2.1','restaurant.1','attraction.1','budget','plan'];
    for(const id of new Set([...primary,...keys])){
        const fact=facts.get(id);
        if(!fact)continue;
        const item={source:fact.source,value:fact.value};
        if(Buffer.byteLength(JSON.stringify({...offered,[id]:item}))<=6000)offered[id]=item;
    }
    const context={goals:decision.goals??decision.state.goals,compare:!!decision.compare,
        reviewPriorities:preferences.filter(validReviewPreference).slice(0,11),interests:interests.slice(0,8),
        priceLimits:decision.state.criteria.tripTotalMaxVnd===undefined&&decision.state.criteria.stayTotalMaxVnd===undefined?undefined:{
            tripVnd:decision.state.criteria.tripTotalMaxVnd,stayVnd:decision.state.criteria.stayTotalMaxVnd},
        clarificationPending:!!decision.hotelQuestion};
    return {offered,context};
}
const ungrounded=()=>new HttpError(502,'Phần tư vấn AI chưa khớp bằng chứng.','AGENT_UNGROUNDED_RESPONSE');

export function nativeFactSelection(raw:unknown,offered:Record<string,unknown>):string[]{
    try{assertStructuredOutput(GROUNDED_RESPONSE_SCHEMA,raw);}catch{throw ungrounded();}
    const ids=(raw as {factIds:string[]}).factIds;
    if(!ids.length||ids.some(id=>!Object.hasOwn(offered,id)))throw ungrounded();
    return ids;
}
export function nativeHighlights(ids:readonly string[],before:NativeEvidence,after:NativeEvidence){
    if(!ids.length||ids.some(id=>!before.has(id)||before.get(id)?.fingerprint!==after.get(id)?.fingerprint))return;
    return 'Những điểm đáng xem trước\n'+ids.map(id=>'- '+after.get(id)!.label).join('\n');
}

const serviceChoices:Record<string,string>={search_registered_hotels:'khách sạn',search_registered_restaurants:'nhà hàng',search_places:'điểm tham quan'};
export function nativeServiceSuggestion(raw:unknown,projection:MessageProjection){
    assertStructuredOutput(NATURAL_RESPONSE_SCHEMA,raw);
    const d=raw as {operation:string;updates:unknown[];change?:string;changeQuote?:string};
    if(d.updates.length||d.change!==undefined||d.changeQuote!==undefined||projection.redactions)throw ungrounded();
    if(d.operation==='chat')return;
    if(!Object.hasOwn(serviceChoices,d.operation))throw ungrounded();
    return 'Ý bạn là tìm '+serviceChoices[d.operation]+' ở khu vực này phải không? Bạn nhắn rõ loại dịch vụ để mình tra đúng nhé.';
}

export function canSuggestNativeService(decision:NativeHotelTurn,projection:MessageProjection){
    return !!decision.serviceChoiceNeeded&&!!decision.state.query.locationId&&
        !projection.redactions&&/\b(?:tim|kiem|goi y|muon|can|cho minh)\b/.test(
            projection.text.normalize('NFD').toLowerCase().replace(/\p{M}/gu,'').replace(/đ/g,'d'));
}
export function nativeFallbackReason(error:unknown){
    const code=error instanceof HttpError?error.code:undefined;
    switch(code){
        case 'AGENT_TIMEOUT':return 'timeout';
        case 'AGENT_BUSY':
        case 'AGENT_PROVIDER_QUOTA':return 'busy';
        case 'AGENT_INPUT_TOKEN_LIMIT':return 'input_limit';
        case 'AGENT_OLLAMA_READINESS_FAILED':
        case 'AGENT_OLLAMA_NOT_READY':
        case 'AGENT_OLLAMA_UNAVAILABLE':return 'unavailable';
        case 'AGENT_UNGROUNDED_RESPONSE':return 'ungrounded';
        default:return 'invalid_output';
    }
}
