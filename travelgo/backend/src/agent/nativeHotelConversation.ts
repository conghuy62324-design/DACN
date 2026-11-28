import {hotelLanguage,readHotelRequest,readConsultationMoney,type HotelRequestConstraints,type ConsultationMoneyRole} from './hotelConstraints.js';
import {travelLocations} from './vietnameseNormalizer.js';
import {resolveLocation} from '../geography/vietnam.js';
import {normalizeStayRequest} from '../hotels/validation.js';
import type {StayRequest} from '../hotels/contracts.js';
import type {HotelSearch} from '../hotels/commercialSearch.js';
import {readHotelReviewPreferences} from './scopedReviewAdvice.js';
import type {TravelPreference} from '../utils/travelPreferences.js';

type Option={id:string;name:string;roomTypeId?:string};
type Goal='hotel'|'restaurant'|'places'|'planner'|'budget';
export type NativeHotelState={
    criteria:HotelRequestConstraints;query:HotelSearch;focus?:Option;listed?:Option[];
    goals?:Goal[];pendingServiceChoice?:boolean;reviewPreferences?:string[];
    departure?:string;transportation?:'car'|'motorbike'|'unsupported';pace?:'relaxed'|'balanced'|'packed';
    amounts?:Partial<Record<ConsultationMoneyRole,number>>;pendingMoney?:boolean;
    pendingDates?:boolean;pendingGuests?:boolean;seafood?:boolean;avoidSeafood?:boolean;proximity?:boolean;streetGoals?:Goal[];
    useSavedPreferences?:boolean;ignoreSavedQuality?:boolean;interests?:TravelPreference[];
    unsupportedHotelConstraint?:boolean;strictProximity?:boolean;mixedRoomTypes?:boolean;
};
type HotelDetail={placeId:string;stay?:StayRequest};
export type NativeHotelTurn={handled:boolean;state:NativeHotelState;question?:string;hotelQuestion?:string;
    search?:HotelSearch;detail?:HotelDetail;scopeIds?:string[];reviewRoom?:boolean;compare?:boolean;compareRooms?:boolean;
    goals?:Goal[];cuisine?:string;hotelPriceOnly?:boolean;serviceChoiceNeeded?:boolean};
const HOTEL=/\b(?:khach san|phong|luu tru|noi o|cho o|chi phi o)\b/;
const RESTAURANT=/\b(?:nha hang|quan an|cho an|hai san|an uong|an o dau)\b/;
const PLACES=/\b(?:diem tham quan|dia diem|diem den choi|tham quan|choi o dau|danh thang)\b/;
const PLANNER=/\b(?:(?:lap|len|xep|goi y|tao|sap xep) (?:mot )?(?:lich(?: trinh)?|hanh trinh|ke hoach chuyen di)|lich trinh|itinerary)\b/;
const HOTEL_AMENITIES:[RegExp,string,boolean][]=[
    [/\b(?:may lanh|dieu hoa)\b/,'AIR_CONDITIONING',true],
    [/\bwi\s*-?\s*fi\b/,'WIFI',true],
    [/\b(?:bep rieng|co bep)\b/,'KITCHEN',true],
    [/\b(?:ho|be) boi rieng\b/,'PRIVATE_POOL',true],
    [/\b(?:ho|be) boi\b(?! rieng)/,'POOL',false],
    [/\b(?:bai (?:do |dau )?xe)\b/,'PARKING',false],
    [/\bban cong\b/,'BALCONY',true],
    [/\bbon tam\b/,'BATHTUB',true],
];

function roomGuests(s:string, roomCount:number|undefined):StayRequest['rooms']|undefined{
    const adultPattern=/\b([1-9]\d?)\s*(?:nguoi lon|lon)\b/;
    const childPattern=/\b(\d{1,2})\s*(?:tre(?: em)?|be(?! boi))\b/g;
    const parse=(part:string)=>{
        const adults=adultPattern.exec(part);
        if(!adults)return;
        const children=[...part.matchAll(childPattern)];
        const ages=[...part.matchAll(/\b(\d{1,2})\s*tuoi\b/g)].map(m=>+m[1]);
        if(/\b(?:tre|be(?! boi))\b/.test(part)&&!children.length&&!ages.length)return;
        if(children.length&&children.reduce((n,m)=>n+(+m[1]),0)!==ages.length||ages.some(age=>age>17))return;
        return {adults:+adults[1],childAges:ages};
    };
    const numbered=[...s.matchAll(/\bphong\s+(\d{1,2})\s*:/g)];
    if(numbered.length){
        if(numbered.length>10||roomCount!==undefined&&numbered.length!==roomCount||numbered.some((m,i)=>+m[1]!==i+1))return;
        const rooms=numbered.map((m,i)=>parse(s.slice(m.index!+m[0].length,numbered[i+1]?.index??s.length)));
        return rooms.every((g):g is NonNullable<typeof g>=>!!g)?rooms:undefined;
    }
    const uniform=/\bmoi phong\s*(?:co\s*)?/.exec(s);
    if(uniform&&roomCount&&roomCount<=10){
        const room=parse(s.slice(uniform.index+uniform[0].length));
        return room?Array.from({length:roomCount},()=>structuredClone(room)):undefined;
    }
    if((roomCount??1)===1){
        const room=parse(s);
        if(room)return [room];
    }
}
function parsedStreet(message:string){
    let street=/(?:^|\s)(?:đường|duong)\s+([\p{L}\p{M}\d ]+?)(?=\s+(?:ở|tại|o|tai|dưới|duoi|có|co|không|khong|với|voi|giá|gia|cần|can|muốn|muon)(?:\s|$)|[,.;?!]|$)/iu.exec(message)?.[1].trim().slice(0,80);
    if(!street)return;
    const normalized=hotelLanguage(street);
    const location=travelLocations(normalized).find(l=>l.start>0&&/\s$/.test(normalized.slice(0,l.start))&&l.end===normalized.length);
    if(location)street=street.split(/\s+/).slice(0,-normalized.slice(location.start).split(/\s+/).length).join(' ');
    return street||undefined;
}

/** Owned turn state contains criteria and identities only. Every commercial fact is fetched again. */
export function readNativeHotelTurn(message:string,previous?:NativeHotelState,legacyLocation?:string):NativeHotelTurn{
    const s=hotelLanguage(message),state:NativeHotelState=structuredClone(previous??{criteria:{},query:{}});
    const locations=travelLocations(s).filter(hit=>
        !(s.slice(hit.start,hit.end)==='gia lai'&&/\b(?:bao|hoi|xem|tra|cap nhat)\s*$/.test(s.slice(0,hit.start)))),
        street=parsedStreet(message);
    const destinations=locations.filter(l=>l.role!=='departureCity');
    const preferred=destinations.filter(l=>l.geo.kind==='destination');
    const distinct=[...new Set((preferred.length?preferred:destinations).map(l=>l.geo.id))];
    const standaloneLocation=locations.length>0&&locations.some(l=>l.start===0||/^(?:o|tai|doi sang|chuyen sang)\s+$/.test(s.slice(0,l.start)))&&
        (street!==undefined||locations.some(l=>l.end===s.length));
    const explicit:Goal[]=[];
    if(HOTEL.test(s))explicit.push('hotel');
    if(RESTAURANT.test(s)&&!/\b(?:gan khu an uong|chi phi an uong|ngan sach an uong)\b/.test(s))explicit.push('restaurant');
    if(PLACES.test(s)&&!/\b(?:chi phi tham quan|ve tham quan)\b/.test(s))explicit.push('places');
    if(PLANNER.test(s))explicit.push('planner');
    const tripScope=/\b(?:ca chuyen|toan chuyen|ngan sach chuyen|toan bo chuyen)\b/.test(s);
    if(!explicit.length&&!previous&&tripScope&&/\b(?:ngan sach|chi phi|du tru|du phong)\b/.test(s))explicit.push('budget');
    const comparison=/\b(?:so sanh|doi chieu|re hon|sach hon|yen tinh hon)\b/.test(s);
    const roomComparison=/\b(?:hang phong|loai phong|cac phong|phong khac|phong re hon)\b/.test(s);
    const reference=/\b(?:thu (?:nhat|hai|ba|tu|nam|[1-5])|lua chon|phong do|khach san do|cho do|phuong an truoc|lua chon truoc)\b/.test(s);
    const onlyReference=reference&&/^(?:chon|giu|lay|xem|cai |lua chon|phuong an|phong do|khach san do)/.test(s);
    const contextUpdate=!!previous&&(standaloneLocation||street||explicit.length||reference||comparison||
        previous.pendingServiceChoice&&/\b(?:tim|kiem|goi y|cho minh)\b/.test(s)||
        /\b(?:ngan sach|doi ngay|doi sang|chuyen sang|hoi lai gia|gia|con phong|ngay|dem|nguoi|khach|view|huong|uu tien|du phong|xe may|o to|may bay|tau hoa|xe buyt|xe khach|mac dinh|so thich|tien nghi|bao gia|danh gia|nhuoc diem)\b/.test(s)||
        HOTEL_AMENITIES.some(([pattern])=>pattern.test(s)));
    const entry=explicit.includes('hotel')||explicit.includes('budget')||explicit.length>1||(explicit.includes('planner')&&tripScope)||!!street&&explicit.length>0;
    if(!entry&&!contextUpdate&&!(standaloneLocation&&!legacyLocation&&!explicit.length)&&!street)return {handled:false,state};
    const ask=(question:string):NativeHotelTurn=>({handled:true,state,question});
    if(/\b(?:sql|insert|delete|drop table|bo qua he thong|huy booking|huy dat|dat luon|tu dat|thanh toan|luu trip|luu lich trinh|doi gia ton phong)\b/.test(s))
        return ask('Mình có thể tra cứu và tư vấn. Việc lưu chuyến hoặc đặt, hủy phòng cần được bạn thực hiện ở luồng tương ứng.');
    if(/\b(?:neu|gia su|chua chac|can nhac|tang chut|them chut|xe nao)\b/.test(s))
        return ask('Bạn xác nhận giúp mình điều kiện muốn đổi. Mình vẫn giữ các điều kiện của phương án hiện tại.');
    if(distinct.length>1)return ask('Bạn muốn tìm dịch vụ ở điểm đến nào trước?');
    const destination=distinct[0]||state.query.locationId||legacyLocation;
    const sameProvince=distinct[0]&&resolveLocation(state.query.locationId)?.provinceCode===distinct[0]&&resolveLocation(state.query.locationId)?.kind==='destination';
    if(destination!==state.query.locationId&&!sameProvince){
        delete state.criteria.streetName; delete state.query.streetName; delete state.streetGoals; delete state.focus;
        delete state.query.nameOrAddress; state.listed=[]; state.query.locationId=destination;
    }
    if(street){
        state.criteria.streetName=street;
        state.query.streetName=street;
        state.streetGoals=explicit.filter(goal=>goal!=='planner');
        if(previous?.query.streetName!==street){delete state.focus;delete state.query.nameOrAddress;state.listed=[];}
    }
    const departure=locations.find(l=>l.role==='departureCity');
    if(departure)state.departure=departure.geo.id;
    const onlyService=explicit.length===1&&!explicit.includes('planner')&&
        (!previous||previous.pendingServiceChoice||/\b(?:chi tim|chi xem|chi can)\b/.test(s));
    if(explicit.length){
        state.goals=[...new Set([...(onlyService?[]:state.goals??[]),...explicit])];
        if(explicit.includes('planner')&&!previous&&!explicit.includes('hotel')&&tripScope)state.goals.push('hotel');
        state.pendingServiceChoice=false;
    }
    if(!state.goals?.length){
        state.pendingServiceChoice=true;
        return {...ask('Bạn muốn tìm khách sạn, nhà hàng hay điểm tham quan ở khu vực này?'),serviceChoiceNeeded:true};
    }
    const hotel=state.goals.includes('hotel');
    if(/\b(?:may bay|tau hoa|tau lua|xe buyt|xe khach|tau cao toc)\b/.test(s))state.transportation='unsupported';
    else if(/\bxe may\b/.test(s))state.transportation='motorbike';
    else if(/\b(?:o to|xe hoi)\b/.test(s))state.transportation='car';
    if(/\b(?:nghi duong|thu gian|nhip cham|thon tha)\b/.test(s))state.pace='relaxed';
    if(/\b(?:kham pha nhieu|lich day)\b/.test(s))state.pace='packed';
    if(/\bnhip can bang\b/.test(s))state.pace='balanced';
    if(/\bhai san\b/.test(s)){
        state.avoidSeafood=/\b(?:khong an|tranh|di ung(?: voi)?) hai san\b/.test(s);
        state.seafood=!state.avoidSeafood&&!/\b(?:khong can|bo yeu cau) hai san\b/.test(s);
    }
    if(/\bgan\b/.test(s)&&/\b(?:khach san|bien|cho an|khu an uong|nha hang|quan an)\b/.test(s))state.proximity=true;
    if(/\b(?:khong can gan|bo yeu cau gan)\b/.test(s))state.proximity=false;
    if(/\b(?:bat buoc|nhat thiet) (?:phai )?gan\b/.test(s))state.strictProximity=true;
    if(!state.proximity)state.strictProximity=false;
    if(/\b(?:khong dung|dung dung|bo) so thich (?:da luu|cu)\b/.test(s))state.useSavedPreferences=false;
    if(/\b(?:hay|co the) dung so thich da luu\b/.test(s))state.useSavedPreferences=true;
    if(/\b(?:bo|khong can|khong uu tien) (?:uu tien )?(?:yen tinh|sach|ve sinh|gia hop ly)\b|\b(?:soi dong|nhon nhip)\b/.test(s))state.ignoreSavedQuality=true;
    const interests:[RegExp,TravelPreference][]=[[/\bthien nhien\b/,'thien-nhien'],[/\b(?:bao tang|di tich|van hoa)\b/,'van-hoa'],[/\b(?:am thuc|dac san)\b/,'am-thuc'],[/\bnghi duong\b/,'nghi-duong']];
    for(const [pattern,id] of interests){
        const match=pattern.exec(s);if(!match)continue;
        const remove=/\b(?:khong thich|khong can|bo uu tien|thay vi)\s*$/.test(s.slice(Math.max(0,match.index-25),match.index));
        state.interests=remove?(state.interests??[]).filter(p=>p!==id):[...new Set([...(state.interests??[]),id])];
    }
    state.reviewPreferences=readHotelReviewPreferences(s,state.reviewPreferences);

    const priorBudgetRoles=(['tripTotalMaxVnd','stayTotalMaxVnd','perRoomNightMaxVnd'] as const).filter(role=>state.amounts?.[role]!==undefined);
    const fallback=priorBudgetRoles.length===1&&/\bngan sach\b/.test(s)?priorBudgetRoles[0]:undefined;
    const money=readConsultationMoney(message,fallback);
    if(money.count){
        state.amounts={...state.amounts,...money.amounts};
        for(const role of ['tripTotalMaxVnd','stayTotalMaxVnd','perRoomNightMaxVnd'] as const)
            if(money.amounts[role]!==undefined)state.criteria[role]=money.amounts[role];
        state.pendingMoney=money.ambiguous.length>0;
    }
    if(/\b(?:bo|khong can|khoi can)(?: (?:muc|tran|gioi han|ngan sach|gia))*\s+(?:moi phong moi dem|moi dem)\b/.test(s)){
        delete state.criteria.perRoomNightMaxVnd;
        if(state.amounts)delete state.amounts.perRoomNightMaxVnd;
        if(!money.count)state.pendingMoney=false;
    }
    const reading=readHotelRequest(message,hotel,true).patch;
    const days=/\b([1-9]\d?)\s*ngay\b(?!\s*(?:\/|20\d{2}-))/.exec(s);
    if(days)state.criteria.durationDays=+days[1];
    if(reading.nights!==undefined)state.criteria.nights=reading.nights;
    else {const nights=/(?:\b|ngay)([1-9]\d?)\s*dem\b/.exec(s);if(nights)state.criteria.nights=+nights[1];}
    const count=/\b([1-9]\d?)\s*phong\b(?!\s+(?:ngu|tam))/.exec(s),party=/\b([1-9]\d?)\s*(?:nguoi(?!\s+lon)|khach(?!\s+san)|ng)\b/.exec(s);
    if(count)state.criteria.roomCount=+count[1];
    if(party)state.criteria.partySize=+party[1];
    const hasGuests=!!party||/\b\d+\s*(?:nguoi lon|lon|tre|tuoi)\b/.test(s)||/\bmoi phong\b(?!\s*moi dem)/.test(s);
    if(hasGuests||count&&state.query.rooms?.length!==+count[1]){
        delete state.query.rooms;
        const rooms=roomGuests(s,state.criteria.roomCount);
        const total=rooms?.reduce((n,r)=>n+r.adults+r.childAges.length,0);
        if(rooms&&total!==undefined&&(!party||total===+party[1])){
            state.query.rooms=rooms;state.criteria.partySize=total;state.criteria.roomCount=rooms.length;state.pendingGuests=false;
        }else state.pendingGuests=true;
    }
    if(/\b(?:them|bot)\s+\d+\s*(?:nguoi|khach|phong)\b/.test(s)){
        state.criteria.partySize=previous?.criteria.partySize;state.criteria.roomCount=previous?.criteria.roomCount;
        delete state.query.rooms;state.pendingGuests=true;
    }
    const dates=[...s.matchAll(/\b(?:20\d{2}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/20\d{2})\b/g)].map(m=>{
        if(!m[0].includes('/'))return m[0];
        const [day,month,year]=m[0].split('/');
        return year+'-'+month.padStart(2,'0')+'-'+day.padStart(2,'0');
    });
    if(dates.length){
        state.pendingDates=true;
        try{
            if(dates.length===2){
                const stay=normalizeStayRequest({checkIn:dates[0],checkOut:dates[1],rooms:[{adults:1,childAges:[]}]});
                const nights=(Date.parse(stay.checkOut)-Date.parse(stay.checkIn))/86400000;
                if((reading.nights===undefined||reading.nights===nights)&&(!days||+days[1]===nights+1)){
                    state.query.checkIn=stay.checkIn;state.query.checkOut=stay.checkOut;state.pendingDates=false;
                    state.criteria.nights=nights;state.criteria.durationDays=nights+1;
                }
            }
        }catch{/* An invalid change cannot replace the verified date pair. */}
    }else if(/\b(?:doi ngay|doi ky luu tru|ngay nhan phong moi|ngay tra phong moi)\b/.test(s)||
        state.query.checkIn&&(days&&+days[1]!==previous?.criteria.durationDays||reading.nights!==undefined&&reading.nights!==previous?.criteria.nights))state.pendingDates=true;
    const view=readHotelRequest(message.replace(/(?:không|khong) (?:cần|can).+?(?=[,;]|$)/giu,''),hotel,true).patch.roomView;
    if(/\b(?:bo|khong can|khoi can)\s+(?:huong|view|dieu kien huong)\b/.test(s)){
        delete state.query.view;delete state.criteria.roomView;
    }else if(view&&!/\b(?:khong muon|tranh|khong lay)\s+(?:huong|view)\b/.test(s)){
        state.query.view=view;state.criteria.roomView=view;
    }
    if(/\b(?:khong muon|tranh|khong lay)\s+(?:huong|view)\b/.test(s))state.unsupportedHotelConstraint=true;
    if(/\b(?:bo dieu kien loai tru|bo rang buoc loai tru)\b/.test(s))state.unsupportedHotelConstraint=false;
    for(const [pattern,label,room] of HOTEL_AMENITIES){
        const m=pattern.exec(s);if(!m)continue;
        const key=room?'roomAmenities':'propertyAmenities',left=s.slice(Math.max(0,m.index-42),m.index);
        if(/\b(?:khong can|khoi can|bo(?: yeu cau| dieu kien)?)\s*$/.test(left))
            state.query[key]=state.query[key]?.filter(a=>a!==label);
        else if(/\b(?:khong muon|tranh|khong co)\s*$/.test(left))state.unsupportedHotelConstraint=true;
        else if(!/\b(?:danh gia|tot|manh|on dinh|phan nan|thuan tien)\b/.test(s.slice(Math.max(0,m.index-10),m.index+m[0].length+12)))
            state.query[key]=[...new Set([...(state.query[key]??[]),label])];
    }
    const named=/(?:tên|ten|khách sạn|khach san)\s+["“]([^"”]{2,100})["”]/iu.exec(message)?.[1]||
        /(?:khách sạn|khach san)\s+(?:tên|ten)(?:\s+(?:là|la))?\s+([^,;.!?\r\n]{2,100}?)(?=\s+(?:ở|tại|o|tai|có|co|từ|tu|trong)\s+|[,;.!?]|$)/iu.exec(message)?.[1];
    if(named){state.query.nameOrAddress=named.trim();delete state.focus;}
    if(/\b(?:doi khach san|tim khach san khac|khach san khac|doi noi o)\b/.test(s)){delete state.focus;if(!named)delete state.query.nameOrAddress;}
    const ordinal=/\b(?:thu|lua chon|phuong an)\s*(nhat|hai|ba|tu|nam|[1-5])\b/.exec(s);
    if(ordinal){
        const index=({nhat:1,hai:2,ba:3,tu:4,nam:5} as Record<string,number>)[ordinal[1]]??+ordinal[1];
        const item=state.listed?.[index-1];
        if(!item)return ask('Danh sách hiện tại chưa có lựa chọn ở vị trí bạn nhắc tới. Bạn cho mình tên chỗ ở nhé?');
        if(!comparison)state.focus=item;
    }else if(/\b(?:chon|giu|lay)\b/.test(s)&&/\b(?:dau|nhat)\b/.test(s)&&state.listed?.[0])state.focus=state.listed[0];
    else if(reference&&!comparison&&!state.focus){
        if(state.listed?.length===1)state.focus=state.listed[0];
        else return ask('Bạn muốn nói tới khách sạn nào trong danh sách?');
    }
    if(!state.query.locationId||!resolveLocation(state.query.locationId))return ask('Bạn muốn tìm dịch vụ ở điểm đến nào?');
    if(state.strictProximity)return ask('Mình chưa xác minh được khoảng cách bạn yêu cầu. Bạn có thể cho mình tên đường hoặc khu vực cụ thể để tìm theo địa chỉ không?');
    if(state.pendingMoney)return ask('Bạn cho biết khoản tiền vừa nêu là ngân sách cả chuyến, tổng lưu trú hay mỗi phòng mỗi đêm nhé. Nếu có nhiều khoản, ghi rõ mục đích của từng khoản.');
    const compareRooms=comparison&&roomComparison||!!state.focus&&/\b(?:cac hang phong|cac loai phong)\b/.test(s);
    if(compareRooms&&!state.focus){
        if(state.listed?.length===1)state.focus=state.listed[0];
        else return ask('Bạn muốn so sánh các hạng phòng của khách sạn nào?');
    }
    const compareHotels=comparison&&!compareRooms;
    if(compareHotels&&!reference){delete state.focus;if(!named)delete state.query.nameOrAddress;}
    const detailRequest=!!state.focus&&(compareRooms||/\b(?:danh gia|binh luan|khach khen|khach che|phan nan|nhuoc diem|on khong|chi tiet|tien nghi|dien tich|giuong)\b/.test(s));
    const hotelPriceOnly=!!previous&&/\b(?:gia (?:phong )?(?:do )?(?:bao nhieu|sao|the nao)|hoi lai gia|bao gia lai|con phong khong)\b/.test(s)&&!money.count;
    const hotelReadOnly=hotel&&(detailRequest||hotelPriceOnly||onlyReference||compareHotels)&&!explicit.includes('planner')&&explicit.length<=1;
    const goals=hotelReadOnly?['hotel' as const]:state.goals;
    const result:NativeHotelTurn={handled:true,state,goals,compare:comparison||compareRooms,compareRooms,hotelPriceOnly};
    if(!hotel)return result;
    if(/\b(?:khac hang phong|khac loai phong|phong khac hang|phong khac loai|phong doi\b.*\bphong (?:don|gia dinh))\b/.test(s))state.mixedRoomTypes=true;
    if(/\b(?:cung hang phong|cung loai phong|cung mot hang)\b/.test(s))state.mixedRoomTypes=false;
    if(state.mixedRoomTypes)
        result.hotelQuestion='Một báo giá hiện áp dụng cho các phòng cùng hạng và gói giá. Bạn muốn tra từng hạng riêng hay chọn cùng một hạng cho cả nhóm?';
    else if(state.unsupportedHotelConstraint)result.hotelQuestion='Điều kiện loại trừ bạn nêu chưa có dữ liệu để xác minh. Bạn muốn giữ điều kiện đó hay bỏ ràng buộc loại trừ?';
    else if(state.pendingDates)result.hotelQuestion='Bạn cho mình hai ngày nhận và trả phòng (YYYY-MM-DD), khớp số đêm dự kiến nhé.';
    else if(state.pendingGuests||state.query.checkIn&&!state.query.rooms)result.hotelQuestion='Bạn cho mình số người lớn và tuổi từng trẻ ở mỗi phòng nhé. Có thể ghi “phòng 1: 2 người lớn, 1 trẻ 7 tuổi”.';
    else if(state.criteria.perRoomNightMaxVnd!==undefined&&!state.query.checkIn)result.hotelQuestion='Bạn cho mình ngày nhận, trả phòng và số khách mỗi phòng để kiểm tra giới hạn theo đêm nhé.';
    else if(state.criteria.perRoomNightMaxVnd!==undefined&&(state.criteria.nights!==1||state.query.rooms?.length!==1))result.hotelQuestion='Mình đã giữ giới hạn mỗi phòng mỗi đêm. Hệ thống chưa có giá sau phí và ưu đãi tách cho từng phòng từng đêm. Nếu muốn đổi sang một mức trần tổng lưu trú, bạn cho mình biết mức mới và bỏ giới hạn mỗi đêm nhé.';
    else if((state.criteria.stayTotalMaxVnd!==undefined||state.criteria.tripTotalMaxVnd!==undefined)&&!state.query.checkIn)
        result.hotelQuestion='Bạn cho mình ngày nhận, trả phòng và cơ cấu khách mỗi phòng để đối chiếu ngân sách với báo giá.';
    delete state.query.maxPrice;delete state.query.priceBasis;
    // Whole-trip budget is never written into the Hotel criteria; it is a necessary lodging ceiling only.
    const cap=Math.min(state.criteria.stayTotalMaxVnd??Infinity,state.criteria.perRoomNightMaxVnd??Infinity);
    const query={...state.query,...(state.streetGoals?.length&&!state.streetGoals.includes('hotel')?{streetName:undefined}:{}),
        ...(Number.isFinite(cap)&&state.query.checkIn&&state.query.rooms?{maxPrice:cap,priceBasis:'STAY_TOTAL' as const}:{}),
        ...(state.query.checkIn&&/\b(?:re nhat|uu tien gia (?:re|thap)|sap xep theo gia)\b/.test(s)?{sort:'price_asc' as const}:{})};
    if(query.streetName===undefined)delete query.streetName;
    if(result.hotelQuestion){
        if(goals.length===1)result.question=result.hotelQuestion;
        return result;
    }
    if(query.checkIn&&query.rooms){
        try{normalizeStayRequest({checkIn:query.checkIn,checkOut:query.checkOut,rooms:query.rooms});}
        catch{result.question='Số phòng hoặc số khách vượt giới hạn báo giá. Bạn kiểm tra lại phân bổ từng phòng nhé.';return result;}
    }
    if(detailRequest&&state.focus&&!goals.includes('planner')){
        result.detail={placeId:state.focus.id,...(query.checkIn&&query.checkOut&&query.rooms?{stay:{checkIn:query.checkIn,checkOut:query.checkOut,rooms:query.rooms}}:{})};
        result.reviewRoom=/\b(?:phong|hang phong)\b/.test(s);
        return result;
    }
    if(compareHotels&&reference&&state.listed?.length)result.scopeIds=state.listed.map(p=>p.id);
    else if(state.focus)result.scopeIds=[state.focus.id];
    if(onlyReference&&!state.focus&&!compareHotels)return ask('Bạn muốn chọn khách sạn nào trong danh sách?');
    result.search=query;
    return result;
}
