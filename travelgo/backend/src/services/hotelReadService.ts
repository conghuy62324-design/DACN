import {hotelStayWritesEnabled} from '../hotels/stayConfirmation.js';
import { HOTEL_DOMAIN_ENABLED, type HotelAuthority, type HotelAddress, type RoomType, type RatePlan, type RateNight, type InventoryDay, type Promotion, type StayRequest } from '../hotels/contracts.js';
import { assertPublishedHotel, hotelSourceVersion, quoteHotelStay, eligiblePromotion } from '../hotels/pricing.js';
import { hotelError, uuid, normalizeStayRequest, validateRoom, validateRate, stayDates } from '../hotels/validation.js';
export type HotelReadSnapshot = {
    asOf: string;
    authority: HotelAuthority;
    identity: {
        id: string;
        name: string;
        slug: string;
        summary: string;
        description: string;
        accommodationType: string;
        amenities: string[];
    };
    address: HotelAddress | null;
    profile: {
        checkInTime: string;
        checkOutTime: string;
        timeZone: 'Asia/Ho_Chi_Minh';
        timeSource?: string;
        policies: Record<string, unknown>;
        services: string[];
        starRating: number | null;
        starVerified: boolean;
    };
    rooms: RoomType[];
    rates: RatePlan[];
    nightly: RateNight[];
    inventory: InventoryDay[];
    promotions: Promotion[];
    media: {
        id: string;
        placeId: string;
        roomTypeId: string | null;
        url: string;
        status: 'PENDING' | 'APPROVED' | 'REJECTED';
        rights: 'UNVERIFIED' | 'OWNED' | 'PARTNER_CONFIRMED';
        position: number;
        altText?: string;
    }[];
};
/** Shared website/Agent retrieval port. Production adapter must use one repeatable-read READ ONLY DB transaction. */
export interface HotelReadStore {
    snapshot(placeId: string, stay?: StayRequest): Promise<HotelReadSnapshot | null>;
}
export class HotelReadService {
    constructor(private readonly store: HotelReadStore, private readonly enabled = HOTEL_DOMAIN_ENABLED(), private readonly allowSynthetic = false) { }
    async detail(placeId: string, stay?: StayRequest, withOfferChoices = false) {
        if (!this.enabled)
            hotelError('HOTEL_DOMAIN_NOT_ENABLED', 'Nền tảng phòng chưa được kích hoạt.', 503);
        uuid(placeId);
        if (stay)
            stay = normalizeStayRequest(stay);
        const s = await this.store.snapshot(placeId, stay);
        if (!s)
            hotelError('HOTEL_NOT_FOUND', 'Không tìm thấy khách sạn.', 404);
        assertPublishedHotel(s!.authority);
        if (s!.authority.isDemo && !this.allowSynthetic)
            hotelError('HOTEL_DEMO_NOT_PUBLIC', 'Dữ liệu DEMO không được xuất bản như kinh doanh thật.', 404);
        if (s!.identity.id !== placeId || s!.authority.placeId !== placeId || s!.rooms.some(r => r.placeId !== placeId) || s!.rates.some(r => r.placeId !== placeId))
            hotelError('HOTEL_SNAPSHOT_SCOPE', 'Dữ liệu khách sạn không cùng phạm vi.', 409);
        const now = Date.parse(s!.asOf);
        if (!Number.isFinite(now))
            hotelError('HOTEL_SNAPSHOT_CLOCK', 'Thời gian snapshot không hợp lệ.', 409);
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
        const nextMidnight = Date.parse(today + 'T00:00:00+07:00') + 86400000;
        const futureBoundaries = s!.promotions.filter(p => p.placeId === placeId && p.status === 'ACTIVE').flatMap(p => [Date.parse(p.bookingStartsAt), Date.parse(p.bookingEndsAt)]).filter(n => n > now), validUntil = new Date(Math.min(now + 60000, nextMidnight, ...futureBoundaries)).toISOString();
        const media = s!.media.filter(m => m.placeId === placeId && m.status === 'APPROVED' && m.rights !== 'UNVERIFIED' && (/^\/media\/hotels\/[a-zA-Z0-9/_\-.]+$/.test(m.url) || /^\/api\/hotel-media\/[a-f0-9-]{36}$/.test(m.url)) && !m.url.split('/').includes('..')).sort((a, b) => a.position - b.position).map(m => ({ id: m.id, roomTypeId: m.roomTypeId, url: m.url, altText: m.altText || '' }));
        if(withOfferChoices&&s!.rates.filter(r=>r.status==='ACTIVE').length>80)hotelError('HOTEL_OFFER_LIMIT','Khách sạn có quá nhiều gói giá để hiển thị cùng lúc.',422);
        const rooms = s!.rooms.filter(r => r.status === 'ACTIVE').map(room => {
            validateRoom(room);
            const rates = s!.rates.filter(r => r.roomTypeId === room.id && r.status === 'ACTIVE' && (stay || r.validFrom <= today && today < r.validUntil));
            const offers = rates.map(rate => {
                validateRate(rate);
                const terms = structuredClone({ name: rate.name, mealPlan: rate.mealPlan, cancellation: rate.cancellation, tax: rate.tax, fees: rate.fees, mandatoryFeesKnown: rate.mandatoryFeesKnown, includedAdults:rate.includedAdults,extraAdultVndPerNight:rate.extraAdultVndPerNight,childPolicy:rate.childPolicy,childBands:rate.childBands });
                if (!stay)
                    return { ratePlanId: rate.id, terms, currency: rate.currency, baseAmountVnd: rate.baseAmountVnd, priceBasis: rate.priceBasis, authority: 'UNDATED_RATE_REFERENCE', availability: null, binding: false };
                try {
                    const result = { ratePlanId: rate.id, terms, authority: 'SERVER_QUOTE_SNAPSHOT', quote: quoteHotelStay({ authority: s!.authority, room, rate, nightly: s!.nightly.filter(n => n.ratePlanId === rate.id), inventory: s!.inventory.filter(n => n.roomTypeId === room.id), promotions: s!.promotions.filter(p => p.placeId === placeId), request: stay, asOf: s!.asOf }) };
                    const promotionChoices: any[]=[];
                    if(withOfferChoices){const input={authority:s!.authority,room,rate,nightly:s!.nightly.filter(n=>n.ratePlanId===rate.id),inventory:s!.inventory.filter(n=>n.roomTypeId===room.id),promotions:s!.promotions,request:stay,asOf:s!.asOf};const candidates=s!.promotions.filter(p=>eligiblePromotion(p,input,stayDates(stay.checkIn,stay.checkOut)));if(candidates.length>8)hotelError('HOTEL_PROMOTION_LIMIT','Gói giá có quá nhiều ưu đãi.',422);for(const p of candidates)promotionChoices.push({id:p.id,name:p.name,quote:quoteHotelStay({...input,request:{...stay,promotionId:p.id}})});}
                    return {...result,...(withOfferChoices?{promotionChoices}:{})};
                }
                catch (e: any) {
                    if (typeof e.code !== 'string' || !e.code.startsWith('HOTEL_'))
                        throw e;
                    return { ratePlanId: rate.id, authority: 'NOT_A_QUOTE', code: e.code, availability: null };
                }
            });
            return { ...room, media: media.filter(m => m.roomTypeId === room.id), offers };
        });
        return { identity: s!.identity, address: s!.address, profile: { ...s!.profile, starRating: s!.profile.starVerified ? s!.profile.starRating : null }, hotelMedia: media.filter(m => m.roomTypeId === null), rooms, contentRevision: s!.authority.contentVersion, commercialRevision: s!.authority.commercialVersion, provenance: { source: 'AUTHORIZED_POSTGRESQL_HOTEL_SNAPSHOT', coordinateStatus: s!.address?.coordinateStatus || 'UNKNOWN', addressSource: s!.address?.source || null }, promotions: s!.promotions.filter(p => p.status === 'ACTIVE' && Date.parse(p.bookingStartsAt) <= now && now < Date.parse(p.bookingEndsAt)), asOf: s!.asOf, validUntil, sourceVersion: hotelSourceVersion({ authority: s!.authority, identity: s!.identity, address: s!.address, profile: s!.profile, rooms: s!.rooms, rates: s!.rates, nightly: s!.nightly, inventory: s!.inventory, promotions: s!.promotions, media }), cacheControl: 'no-store', isDemo: s!.authority.isDemo, bookingEnabled: s!.authority.isDemo && hotelStayWritesEnabled(), executionAuthority: false as const, caveats: ['Tồn phòng và giá phải được kiểm lại trong transaction Booking.', 'Tiện nghi khách sạn không tự suy thành tiện nghi riêng của phòng.', 'Giá không ngày chỉ là tham khảo, không cam kết còn phòng.'] };
    }
}
