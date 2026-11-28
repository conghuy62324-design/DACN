import {normalizeVietnamese, moneyMentions} from './vietnameseNormalizer.js';
import type {RoomView} from '../hotels/contracts.js';
import type {CatalogFilters} from '../services/registeredCatalogService.js';

/** User criteria, never inventory/price facts. Owned by the existing consent/TTL session. */
export type HotelRequestConstraints = {
    streetName?: string;
    roomView?: RoomView;
    nights?: number;
    roomCount?: number;
    partySize?: number;
    durationDays?: number;
    tripTotalMaxVnd?: number;
    stayTotalMaxVnd?: number;
    perRoomNightMaxVnd?: number;
};
export type MoneyScope='TRIP_TOTAL'|'STAY_TOTAL'|'NIGHTLY_PER_ROOM'|'UNDATED_REFERENCE_PRICE'|'UNKNOWN_MONEY_SCOPE';
export const hotelLanguage=(message:string)=>normalizeVietnamese(message).normalized.replace(/\b(mot|hai|ba|bon|tu|nam|sau|bay|tam|chin|muoi)\s+(phong|dem|nguoi|ng|khach)\b/g,(_,n,u)=>({mot:1,hai:2,ba:3,bon:4,tu:4,nam:5,sau:6,bay:7,tam:8,chin:9,muoi:10} as Record<string,number>)[n]+' '+u);
export type ConsultationMoneyRole='tripTotalMaxVnd'|'stayTotalMaxVnd'|'perRoomNightMaxVnd'|'transportVnd'|'reserveVnd'|'foodVnd'|'sightseeingVnd';
const moneyRoles: [ConsultationMoneyRole,RegExp][] = [
    ['tripTotalMaxVnd', /\b(?:ca chuyen(?: di)?|toan chuyen(?: di)?|toan bo chuyen(?: di)?|ngan sach chuyen(?: di)?|ngan sach ca nhom|tong ngan sach)\b/g],
    ['stayTotalMaxVnd', /\b(?:(?:tong|ca) (?:tien|chi phi|gia) (?:phong|khach san|luu tru|o)|(?:tong|ca) (?:ky )?luu tru|ca ky|(?:tien|chi phi) (?:phong|khach san|luu tru)|ngan sach (?:phong|khach san|luu tru))\b/g],
    ['perRoomNightMaxVnd', /\b(?:moi phong moi dem|moi dem|phong\s*\/\s*dem)\b|\/\s*(?:phong\s*\/\s*)?dem\b/g],
    ['transportVnd', /\b(?:tien|chi phi|ngan sach) (?:di chuyen|di lai|van chuyen)\b/g],
    ['reserveVnd', /\b(?:du phong|du tru)\b/g],
    ['foodVnd', /\b(?:tien|chi phi|ngan sach) (?:an uong|an)\b/g],
    ['sightseeingVnd', /\b(?:tien|chi phi|ngan sach) (?:tham quan|ve tham quan)\b/g],
];

/** Bind explicit units and purposes to individual amounts before merging the request. */
export function readConsultationMoney(message:string, fallback?:ConsultationMoneyRole) {
    const s=hotelLanguage(message).replace(/\b\d{1,3}(?:[.,]\d{3})+(?=\s*(?:vnd|dong)\b)/g,n=>n.replace(/[.,]/g,''));
    const mentions=moneyMentions(s);
    const amounts:Partial<Record<ConsultationMoneyRole,number>>={};
    const ambiguous=new Set<ConsultationMoneyRole|'unknown'>();
    for(const [i,m] of mentions.entries()){
        const before=s.slice(mentions[i-1]?.end??0,m.start).split(/[,;.!]|\bva\b/).at(-1)!;
        const after=s.slice(m.end,mentions[i+1]?.start??s.length).split(/[,;.!]|\bva\b/)[0].replace(/^\s*(?:cho|danh cho)\s+/,'');
        const suffix=moneyRoles.find(([,p])=>[...after.matchAll(p)].some(hit=>hit.index===after.search(/\S/)))?.[0];
        const nearest=moneyRoles.flatMap(([role,p])=>[...before.matchAll(p)].map(hit=>({role,end:hit.index!+hit[0].length}))).sort((a,b)=>b.end-a.end)[0]?.role;
        const role=suffix||nearest||(mentions.length===1?fallback:undefined);
        const incompatibleUnit=/^\s*(?:\/\s*|moi\s+)(?:nguoi|ngay|bua)\b/.test(after);
        if(!role||m.relative||incompatibleUnit||!Number.isSafeInteger(m.amount)||m.amount<0||m.amount>9_999_999_999_999||amounts[role]!==undefined&&amounts[role]!==m.amount){
            ambiguous.add(role??'unknown');
            if(role)delete amounts[role];
        }else if(!ambiguous.has(role))amounts[role]=m.amount;
    }
    return {amounts,ambiguous:[...ambiguous],count:mentions.length};
}
export function hotelMoneyScope(message:string,hotelContext=false):MoneyScope{
 const s=hotelLanguage(message),amounts=moneyMentions(s).filter(m=>!m.relative);
 if(amounts.length!==1)return 'UNKNOWN_MONEY_SCOPE';
 if(/\b(?:ngan sach|tong tien|tong chi phi)\s+(?:cho )?(?:ca |toan bo )?(?:chuyen|chuyen di)\b|\bngan sach ca nhom\b/.test(s))return 'TRIP_TOTAL';
 if(/\b(?:moi phong moi dem|moi dem|phong \/ dem)\b|\/\s*dem\b/.test(s))return 'NIGHTLY_PER_ROOM';
 if(/\b(?:ca|tong) (?:tien|chi phi|gia) (?:phong|khach san|luu tru|o)\b|\b(?:tien|chi phi) (?:phong|khach san|luu tru) (?:cho )?(?:ca|toan bo)\b|\btong tien cho ca nhom\b/.test(s)&&(/\b(?:phong|khach san|luu tru|chi phi o)\b/.test(s)||hotelContext))return 'STAY_TOTAL';
 if(/\b(?:phong|khach san|noi o|cho o)\b/.test(s)||hotelContext)return 'UNDATED_REFERENCE_PRICE';
 return 'UNKNOWN_MONEY_SCOPE';
}
export type HotelCapabilityReading = {patch: HotelRequestConstraints; question?: string;moneyScope?:MoneyScope};
export function readHotelRequest(message: string, hotelContext: boolean, native=false): HotelCapabilityReading {
    const s = hotelLanguage(message);
    const patch: HotelRequestConstraints = {};
    // Hypotheses, negated requirements and mutation requests cannot install constraints.
    if (/\b(?:neu|gia su|chua chac|khong can|khong muon|dung|sql|insert|delete|huy dat|tu dat)\b/.test(s)) return {patch};
    const hotel = hotelContext || /\b(?:khach san|phong|noi o|cho o|luu tru|chi phi o)\b/.test(s);
    if (!hotel) return {patch};
    const availability = /\b(?:con phong|het phong|phong trong|available|availability)\b/.test(s);
    if (availability && !native) return {patch, question: 'TravelGo chưa xác minh tình trạng còn phòng cho yêu cầu này. Mình giữ nguyên lựa chọn và thông tin chuyến đi; cần tra tồn phòng theo ngày và loại phòng trước khi xác nhận.'};
    if (!native && /\b(?:loai phong|hang phong|kieu phong)\b/.test(s) && /\b(?:re hon|gia thap hon|doi|tim|xem)\b/.test(s))
        return {patch, question: 'Mình giữ nguyên khách sạn đang chọn. Chưa có dữ liệu hạng phòng và giá phòng được xác minh để tìm phòng rẻ hơn trong khách sạn đó; mình chưa chuyển sang khách sạn khác.'};
    const street = /(?:^|\s)đường\s+([\p{L}\p{M}\d ]+?)(?=\s+(?:ở|tại|dưới|có|không|với|tầm|giá)(?:\s|$)|[,.;?!]|$)/iu.exec(message)
        || /\bduong\s+([a-z\d ]+?)(?=\s+(?:o|tai|duoi|co|khong|voi|tam|gia)\b|[,.;?!]|$)/i.exec(message);
    if (street) patch.streetName = street[1].trim().slice(0,80);
    const view = /\b(?:view|huong|nhin ra)\s+(bien|nui|thanh pho|vuon|ho boi|ho)\b/.exec(s);
    if (view) patch.roomView = ({bien:'SEA',nui:'MOUNTAIN','thanh pho':'CITY',vuon:'GARDEN','ho boi':'POOL',ho:'LAKE'} as Record<string,RoomView>)[view[1]];
    const nights = /\b([1-9]\d?)\s*dem\b/.exec(s);
    if (nights) patch.nights = +nights[1];
    const people = /\b([1-9]\d?)\s*(?:nguoi|ng|khach)\b/.exec(s);
    if (people) patch.partySize = +people[1];
    const scope=hotelMoneyScope(message,hotelContext);
    const stayTotal=scope==='STAY_TOTAL',perNight=scope==='NIGHTLY_PER_ROOM';
    const rooms=/\b([1-9]\d?)\s*phong\b/.exec(s);if(rooms)patch.roomCount=+rooms[1];
    if (stayTotal || perNight) {
        const amounts = moneyMentions(s).filter(m => !m.relative);
        // Multiple amounts need clarification, never choose one arbitrarily.
        if (amounts.length === 1 && /\b(?:duoi|toi da|khong qua|tam|thanh|xuong|len|con)\b/.test(s)) {
            if (stayTotal) patch.stayTotalMaxVnd = amounts[0].amount;
            else patch.perRoomNightMaxVnd = amounts[0].amount;
        }
    }
    if(native)return {patch,moneyScope:scope};
    if (Object.keys(patch).length && (street || view || stayTotal || perNight))
        return {patch, question: 'Mình đã giữ các điều kiện phòng bạn vừa nêu, tách riêng tổng kỳ lưu trú và giá mỗi đêm. Catalog hiện chưa được xác minh tên đường, hướng phòng, đơn vị giá phòng và tồn phòng tương ứng. Mình chưa dùng giá tham khảo khách sạn để khẳng định có phòng phù hợp hoặc tính tổng tiền.'};
    return {patch:{}};
}

/** Explicit withdrawal only; a negative observation is not permission to remove a requirement. */
export function withdrawnAmenities(message:string): string[] {
    const s = normalizeVietnamese(message).normalized;
    if (/\b(?:neu|gia su|chua chac|dung bo|khong bo|khong phai)\b/.test(s)) return [];
    const labels: [RegExp,string][] = [[/\b(?:ho boi|be boi)\b/g,'Hồ bơi'],[/\bwi(?:\s*-\s*|\s*)fi\b/g,'Wi-Fi'],[/\b(?:bai (?:do |dau )?xe)\b/g,'Bãi đỗ xe']];
    return labels.filter(([pattern]) => [...s.matchAll(pattern)].some(m => /\b(?:khong can|khoi can|bo(?: yeu cau| dieu kien)?)\s*$/.test(s.slice(Math.max(0,m.index!-36),m.index)))).map(([,label])=>label);
}
export function removeAmenities(filters:CatalogFilters|undefined, labels:string[]) {
    if (filters?.amenities) filters.amenities = filters.amenities.filter(a=>!labels.includes(a));
}
