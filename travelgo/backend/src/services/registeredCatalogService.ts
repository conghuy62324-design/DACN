import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { RecommendationService, DEFAULT_RECOMMENDATION_WEIGHTS } from './recommendationService.js';
import { calculateBookingPrice } from './bookingService.js';
import { HttpError } from '../utils/httpError.js';
import { catalogVisible, isDemoListing } from './catalogPolicy.js';
import { validatePlaceQuery } from './catalogQuery.js';
import {matchesLocation,publicGeography} from '../geography/vietnam.js';
export const fold = (v: string) => v.normalize('NFD').replace(/\p{M}/gu, '').replace(/[đĐ]/g, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
export type CatalogFilters = {
    locationId?:string;
    city?: string;
    maxPriceFrom?: number;
    amenities?: string[];
    preferences?: string[];
    excludedKeywords?: string[];
    verifiedAvailabilityRequired?: boolean;
    minPriceFrom?:number; accommodationType?:string; cuisine?:string; restaurantCuisine?:string;
    hotelMaxPriceFrom?:number; minRating?:number; sort?:string; approvedSince?:string;
};
const bad = () => new HttpError(400, 'Bộ lọc catalog không hợp lệ.', 'AGENT_INVALID_FILTERS');
export function validateCatalogFilters(f: any): CatalogFilters {
    if (!f || typeof f !== 'object' || Array.isArray(f) || Object.keys(f).some(k => !['locationId','city', 'maxPriceFrom', 'amenities', 'preferences', 'excludedKeywords', 'verifiedAvailabilityRequired','minPriceFrom','accommodationType','cuisine','restaurantCuisine','hotelMaxPriceFrom','minRating','sort','approvedSince'].includes(k)))
        throw bad();
    if (f.city !== undefined && (typeof f.city !== 'string' || !f.city.trim() || f.city.length > 120) || f.maxPriceFrom !== undefined && (!Number.isFinite(f.maxPriceFrom) || f.maxPriceFrom < 0) || f.verifiedAvailabilityRequired !== undefined && typeof f.verifiedAvailabilityRequired !== 'boolean')
        throw bad();
    for (const k of ['amenities', 'preferences', 'excludedKeywords'])
        if (f[k] !== undefined && (!Array.isArray(f[k]) || f[k].length > 8 || f[k].some((x: any) => typeof x !== 'string' || !x.trim() || x.length > 80)))
            throw bad();
    try{validatePlaceQuery(Object.fromEntries(['locationId','city','maxPriceFrom','minPriceFrom','accommodationType','cuisine','minRating','sort','approvedSince'].filter(k=>f[k]!==undefined).map(k=>[k,f[k]])));if(f.hotelMaxPriceFrom!==undefined)validatePlaceQuery({maxPriceFrom:f.hotelMaxPriceFrom});if(f.restaurantCuisine!==undefined)validatePlaceQuery({cuisine:f.restaurantCuisine});}catch{throw bad();}
    return structuredClone(f);
}
const uuid = (v: any) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
const image = (v: any) => typeof v === 'string' && (v.startsWith('/') && !v.startsWith('//') || /^https:\/\//.test(v)) ? v : null;
export class RegisteredCatalogService {
    constructor(private loader: () => Promise<any[]> = () => RecommendationRepository.getApprovedPlaces(), private allowedTestIds: ReadonlySet<string> = new Set()) { }
    async eligible() { return (await this.loader()).filter(p => uuid(p.id) && catalogVisible(p) && (!/\[test fixture\]|test-fixture|synthetic|phase\s*35|integration landmark/i.test([p.name, p.slug, p.summary, p.description, p.city].join(' ')) || this.allowedTestIds.has(p.id))); }
    matchesClassification(p:any,f:CatalogFilters,plan=false){
      if(f.locationId&&!matchesLocation(p,f.locationId))return false;
      if(plan&&!['hotel','restaurant'].includes(p.category))return true;
      if(f.minPriceFrom!==undefined&&(this.publicListing(p).priceFrom===null||this.publicListing(p).priceFrom!<f.minPriceFrom))return false;
      if(f.hotelMaxPriceFrom!==undefined&&p.category==='hotel'&&(this.publicListing(p).priceFrom===null||this.publicListing(p).priceFrom!>f.hotelMaxPriceFrom))return false;
      if(f.accommodationType&&(!plan||p.category==='hotel')&&(p.category!=='hotel'||p.catalogMetadata?.accommodationType!==f.accommodationType))return false;
      const cuisine=(plan||p.category==='restaurant')?(f.restaurantCuisine||f.cuisine):f.cuisine;
      if(cuisine&&(!plan||p.category==='restaurant')&&(p.category!=='restaurant'||!p.catalogMetadata?.cuisines?.includes(cuisine)))return false;
      if(f.minRating!==undefined&&f.minRating>0&&(!(p.reviewCount>0)||!Number.isFinite(p.rating)||p.rating<f.minRating))return false;
      if((f.approvedSince||f.sort==='approvedDesc')&&(!p.approvedAt||f.approvedSince&&Date.parse(p.approvedAt)<Date.parse(f.approvedSince)))return false;
      return true;
    }
    private baseListing(p: any) { const price = p.catalogPriceAvailable !== false && p.priceFrom !== null && p.priceFrom !== undefined && Number.isFinite(Number(p.priceFrom)) && Number(p.priceFrom) >= 0 ? Number(p.priceFrom) : null; return { id: p.id, name: p.name, category: p.category, city: p.city, province: p.province, address: p.address, summary: p.summary, description: p.description, heroImage: image(p.heroImage), amenities: Array.isArray(p.amenities) ? p.amenities.filter((x: any) => typeof x === 'string') : [], priceFrom: price, priceUnit: 'CATALOG_FROM_PRICE_UNIT_UNVERIFIED', currency: 'VND', rating: Number.isFinite(p.rating) && p.rating >= 0 && p.rating <= 5 ? p.rating : null, reviewCount: Number.isInteger(p.reviewCount) && p.reviewCount >= 0 ? p.reviewCount : null, status: 'APPROVED', businessStatus: p.businessId ? 'ACTIVE' : 'PLATFORM_OWNED', source: 'TRAVELGO_REGISTERED_CATALOG', href: '/places/' + p.id, availability: 'NOT_VERIFIED', capacity: 'NOT_MANAGED_FOR_PLACES', roomsMenu: 'NO_SEPARATE_ROOM_OR_MENU_TABLE', bookingEligible: !!p.businessId }; }
    publicListing(p:any){return {...this.baseListing(p),geography:publicGeography(p),catalogMetadata:p.catalogMetadata||{},approvedAt:p.approvedAt||null,isDemo:isDemoListing(p),...(isDemoListing(p)?{source:'DEMO',priceUnit:'ASSUMED_DEMO_VND_UNIT_UNVERIFIED',bookingEligible:false}:{} )};}
    async search(category: 'hotel' | 'restaurant' | 'places', filters: CatalogFilters, options?: {nearListingId?: string}) {
        filters = validateCatalogFilters(filters);
        const all = await this.eligible();
        const near=options?.nearListingId?all.find(p=>p.id===options.nearListingId&&p.category==='hotel'):undefined;
        if(options?.nearListingId&&(!near||!Number.isFinite(near.latitude)||!Number.isFinite(near.longitude)||Math.abs(near.latitude)>90||Math.abs(near.longitude)>180))throw new HttpError(422,'Khách sạn chưa có vị trí hợp lệ để tìm xung quanh.','AGENT_LOCATION_UNVERIFIED');
        let candidates = all.filter(p => category === 'places' || p.category === category);
        candidates=candidates.filter(p=>this.matchesClassification(p,filters));
        if (filters.city&&!filters.locationId)
            candidates = candidates.filter(p => matchesLocation(p,filters.city!));
        if (filters.maxPriceFrom !== undefined)
            candidates = candidates.filter(p => this.publicListing(p).priceFrom !== null && this.publicListing(p).priceFrom! <= filters.maxPriceFrom!);
        if (filters.amenities?.length)
            candidates = candidates.filter(p => filters.amenities!.every(a => (p.amenities || []).some((x: string) => fold(x) === fold(a))));
        if (filters.excludedKeywords?.length)
            candidates = candidates.filter(p => !filters.excludedKeywords!.some(k => fold([p.name, p.summary, p.description, ...(p.amenities || [])].join(' ')).includes(fold(k))));
        if (filters.verifiedAvailabilityRequired)
            candidates = [];
        const ranked = RecommendationService.recommendPlaces(candidates, { destinationCity: 'all', dailyBudgetPerPerson: 0, preferences: filters.preferences || [],...(near?{centerCoords:{latitude:near.latitude,longitude:near.longitude}}:{}) });
        if(filters.sort==='priceAsc'||filters.sort==='priceDesc')ranked.sort((a,b)=>{const x=this.publicListing(a.place).priceFrom,y=this.publicListing(b.place).priceFrom;return x===null?y===null?0:1:y===null?-1:(x-y)*(filters.sort==='priceAsc'?1:-1)||a.place.id.localeCompare(b.place.id);});
        if(filters.sort==='approvedDesc')ranked.sort((a,b)=>Date.parse(String(b.place.approvedAt))-Date.parse(String(a.place.approvedAt))||a.place.id.localeCompare(b.place.id));
        return { type: 'registered_options', category, source: 'TRAVELGO_REGISTERED_CATALOG', filters, weights: DEFAULT_RECOMMENDATION_WEIGHTS, ranking: 'Existing deterministic RecommendationService; no new weights; budget cap/area/amenities/exclusions are hard filters, preferences soft.', items: ranked.slice(0, 5).map(r => ({ ...this.publicListing(r.place), score: r.score, scoreBreakdown: r.breakdown, reasons: [...(filters.city ? ['Đúng khu vực ' + filters.city] : []), ...(filters.maxPriceFrom !== undefined ? ['Giá từ catalog không vượt giới hạn đã nhập; đơn vị giá chưa xác minh.'] : []), ...r.matchedPreferences.map(p => 'Có dữ liệu phù hợp sở thích: ' + p), ...(filters.amenities || []).map(a => 'Có tiện ích trong catalog: ' + a)], matchedPreferences: r.matchedPreferences })), warnings: ['Giá từ catalog chưa xác minh đơn vị phòng/đêm hoặc món/phần. Ngày/khách không xác nhận còn phòng, bàn hay sức chứa.', 'Không có dữ liệu thực đơn đầy đủ; loại trừ từ khóa không là cam kết an toàn dị ứng.', ...(filters.verifiedAvailabilityRequired ? ['Hệ thống không có inventory phòng/bàn để đáp ứng yêu cầu availability đã xác minh.'] : [])] };
    }
    async details(id: any) { if (!uuid(id))
        throw bad(); const p = (await this.eligible()).find(x => x.id === id); if (!p)
        throw new HttpError(404, 'Địa điểm không còn đủ điều kiện hiển thị.', 'AGENT_LISTING_NOT_FOUND'); return this.publicListing(p); }
    async compare(ids: any) { if (!Array.isArray(ids) || ids.length < 2 || ids.length > 5 || new Set(ids).size !== ids.length || ids.some(x => !uuid(x)))
        throw bad(); const all = await this.eligible(), items = ids.map(id => { const p = all.find(x => x.id === id); if (!p)
        throw new HttpError(404, 'Có lựa chọn không còn hợp lệ.', 'AGENT_LISTING_NOT_FOUND'); return this.publicListing(p); }); return { type: 'comparison', source: 'TRAVELGO_REGISTERED_CATALOG', items, warning: 'So sánh giá từ cùng trường catalog; không khẳng định giá phòng theo đêm hoặc availability.' }; }
    async bookingPreview(id: string, adults: number, children: number) { const p = await this.details(id); if (!['hotel', 'restaurant'].includes(p.category) || !Number.isSafeInteger(adults) || adults < 1 || adults > 100 || !Number.isSafeInteger(children) || children < 0 || children > 100)
        throw bad(); if (!p.bookingEligible || p.priceFrom === null)
        return { type: 'booking_preview', listing: p, bookable: false, availability: 'NOT_VERIFIED', reply: 'Chưa có giá/Business hợp lệ để chuẩn bị Booking.' }; return { type: 'booking_preview', listing: p, bookable: true, pricing: calculateBookingPrice(p.priceFrom, adults, children), pricingBasis: 'EXISTING_BOOKING_MVP_PER_GUEST_WITH_CHILD_DISCOUNT_NOT_ROOM_NIGHT', availability: 'NOT_VERIFIED', bookingCreated: false, reply: 'Đây là dự tính theo hàm giá Booking server, chưa tạo Booking. Hãy mở trang dịch vụ và xác nhận theo luồng Booking hiện có.' }; }
}
