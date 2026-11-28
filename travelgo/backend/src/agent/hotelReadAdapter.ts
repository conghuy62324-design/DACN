import type {HotelReadService} from '../services/hotelReadService.js';
import type {HotelQuote,StayRequest} from '../hotels/contracts.js';
import {HOTEL_CONTRACT} from '../hotels/contracts.js';
import {HttpError} from '../utils/httpError.js';

/** AI-side read port only. Deliberately not mounted as a tool until native integration acceptance. */
export type NativeHotelReadPort = Pick<HotelReadService,'detail'>;
export class AgentHotelReadAdapter {
    constructor(private readonly port?: NativeHotelReadPort, private readonly now=Date.now, private readonly allowDemo=false) {}
    async detail(placeId:string, stay?:StayRequest, compareRooms=false) {
        if (!this.port) return {status:'UNSUPPORTED' as const, executed:false, capability:'NATIVE_HOTEL_READ_NOT_BOUND', mutationAuthority:false};
        const d = await this.port.detail(placeId,stay,compareRooms);
        const now=this.now(), asOf=Date.parse(d.asOf), until=Date.parse(d.validUntil);
        if(d.identity.id!==placeId || d.provenance.source!=='AUTHORIZED_POSTGRESQL_HOTEL_SNAPSHOT' || !d.sourceVersion || !Number.isFinite(asOf) || !Number.isFinite(until) || asOf>now || until<=now || now-asOf>60000)
            throw new HttpError(409,'Cần đọc lại snapshot khách sạn đúng phạm vi và còn hiệu lực.','AGENT_HOTEL_SNAPSHOT_INVALID');
        if(d.isDemo&&!this.allowDemo)throw new HttpError(409,'Không dùng DEMO như dữ liệu kinh doanh thật.','AGENT_HOTEL_DEMO_NOT_ALLOWED');
        const rooms=d.rooms.map(room=>({id:room.id,placeId:room.placeId,name:room.name,areaM2:room.areaM2,beds:room.beds,bedrooms:room.bedrooms,bathrooms:room.bathrooms,maxOccupancy:room.maxOccupancy,maxAdults:room.maxAdults,maxChildren:room.maxChildren,view:room.view,amenities:[...room.amenities],
            balcony:room.balcony??null,hasWindow:room.hasWindow??null,kitchen:room.kitchen??null,privateBathroom:room.privateBathroom??null,
            offers:room.offers.flatMap(offer=>[offer,...(compareRooms&&'promotionChoices' in offer?(offer.promotionChoices??[]).map(p=>({...offer,quote:p.quote,promotionName:p.name})):[])]).map(offer=>{
            if('quote' in offer && offer.quote){
                const q:HotelQuote=offer.quote;
                if(!stay || q.contract!==HOTEL_CONTRACT || q.placeId!==placeId || q.roomTypeId!==room.id || q.ratePlanId!==offer.ratePlanId || q.currency!=='VND' || q.priceBasis!=='PER_ROOM_NIGHT' || q.binding!==false || q.checkIn!==stay.checkIn || q.checkOut!==stay.checkOut || q.roomCount!==stay.rooms.length || q.adults!==stay.rooms.reduce((n,r)=>n+r.adults,0) || q.children!==stay.rooms.reduce((n,r)=>n+r.childAges.length,0) || q.isDemo!==d.isDemo || q.asOf!==d.asOf || !q.sourceVersion || Date.parse(q.expiresAt)<=now || !Number.isFinite(Date.parse(q.expiresAt)) || !Number.isSafeInteger(q.totalVnd) || q.totalVnd<0)
                    throw new HttpError(409,'Báo giá phòng không khớp yêu cầu đã xác minh.','AGENT_HOTEL_QUOTE_SCOPE');
                return {kind:'STAY_QUOTE_SNAPSHOT' as const,ratePlanId:q.ratePlanId,totalStayVnd:q.totalVnd,nights:q.nights,roomCount:q.roomCount,priceBasis:q.priceBasis,discountVnd:q.discountVnd,promotionId:q.promotionId,...('promotionName' in offer&&typeof offer.promotionName==='string'?{promotionName:offer.promotionName}:{}),minimumAvailableRooms:q.minimumAvailableRooms,asOf:q.asOf,expiresAt:new Date(Math.min(Date.parse(q.expiresAt),until)).toISOString(),sourceVersion:q.sourceVersion,binding:false as const,caveats:[...q.caveats]};
            }
            if('baseAmountVnd' in offer && offer.authority==='UNDATED_RATE_REFERENCE')
                return {kind:'UNDATED_REFERENCE' as const,ratePlanId:offer.ratePlanId,amountVnd:offer.baseAmountVnd,priceBasis:offer.priceBasis,availability:'UNKNOWN' as const,binding:false as const};
            return {kind:'UNKNOWN' as const,ratePlanId:offer.ratePlanId,availability:'UNKNOWN' as const,binding:false as const};
        })}));
        return {status:'READ' as const,executed:true,placeId,name:d.identity.name,dataClass:d.isDemo?'DEMO' as const:'AUTHORIZED_BUSINESS_SNAPSHOT' as const,address:d.address,services:[...d.profile.services],propertyAmenities:[...d.identity.amenities],rooms,...(stay?{stay:{checkIn:stay.checkIn,checkOut:stay.checkOut,rooms:stay.rooms.map(r=>({adults:r.adults,childAges:[...r.childAges]}))}}:{}),asOf:d.asOf,validUntil:d.validUntil,sourceVersion:d.sourceVersion,mutationAuthority:false,bookingAuthority:false,caveats:[...d.caveats]};
    }
}
