import {TIME_AWARE_V2,pacePolicy,schedulePlannerDay,catalogFingerprint,validCoordinate,routeDistance,type PlannerScheduling,type TravelPace} from '../utils/plannerScheduling.js';
import {prepareTripSnapshot} from '../utils/tripSnapshot.js';
import { PlaceData } from './placeService.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { RecommendationService } from './recommendationService.js';
import { GeoService } from './geoService.js';
import type { TravelPreference } from '../utils/travelPreferences.js';
import { HttpError } from '../utils/httpError.js';
import { calculatePlannerDays, validatePlannerInput } from '../utils/plannerValidation.js';
import { assessPlannerBudget } from '../utils/plannerFeasibility.js';
import {matchesLocation,resolveLocation} from '../geography/vietnam.js';

export interface PlannerInput {
  departureCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  totalBudget: number; // VNĐ
  transportation: 'car' | 'motorbike';
  preferences: TravelPreference[];
  pacing: TravelPace;
  planningVersion?:typeof TIME_AWARE_V2;
  arrivalTime?:string;departureTime?:string;excludedPlaceIds?:string[];
  mandatoryPlaceIds?: string[];
}

export interface ItineraryActivity {
  id: string;
  placeId?: string;
  timeSlot: 'morning' | 'lunch' | 'afternoon' | 'dinner' | 'evening';
  title: string;
  description: string;
  category: 'sightseeing' | 'food' | 'hotel' | 'leisure';
  durationMinutes: number;
  estimatedCostVND: number;
  costSource?: string;
  latitude: number | null;
  longitude: number | null;
  startMinute?:number;endMinute?:number;expectedStart?:string;expectedEnd?:string;
  schedulingSource?:string;transitBeforeMinutes?:number;transitBasis?:string;bufferBeforeMinutes?:number;openingHoursStatus?:string;
  imageUrl?: string;
  recommendationReason?: string;
  aerialDistanceToNextKm?: number;
  estimatedTransitMinutes?: number;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  themeTitle: string;
  activities: ItineraryActivity[];
  dayEstimatedCostVND: number;
  lodgingNights: number;
  lodgingEstimatedCostVND: number; // Whole-group estimate, separate from activities.
  lodgingCostSource?: string;
  centroid: { latitude: number | null; longitude: number | null };
  travelWindow?:{start:number;end:number};
}

export interface GeneratedItinerary {
  id: string;
  title: string;
  departureCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  nightsCount: number;
  costBasis: 'GROUP_VND_V1';
  costAssumptions: string[];
  transportation: PlannerInput['transportation'];
  adults: number;
  children: number;
  pacing: 'relaxed' | 'balanced' | 'packed';
  preferences: TravelPreference[];
  totalBudgetUserVND: number;
  totalEstimatedCostVND: number;
  costDifferenceVND: number;
  budgetStatus: 'within_budget' | 'over_budget';
  overBudgetVND: number;
  constraintViolations: string[];
  budgetAdvice: string;
  days: ItineraryDay[];
  summary: string;
  hotelSuggestion?: PlaceData;
  selectedPlaceIds: string[];
  createdAt: string;
  planningVersion?:typeof TIME_AWARE_V2;
  planning?:PlannerScheduling;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MANDATORY_PLACES = 10;
const normalizedText = (value: unknown) => String(value ?? '').normalize('NFC').trim().toLocaleLowerCase('vi-VN');

function isPubliclyEligible(place: PlaceData): boolean {
  const candidate = place as PlaceData & {
    status?: string;
    businessId?: string | null;
    business?: { status?: string } | null;
  };
  if (candidate.status && candidate.status !== 'APPROVED') return false;
  if (!candidate.businessId) return true;
  return candidate.business?.status === 'ACTIVE';
}

function matchesDestination(place: PlaceData, destinationCity: string): boolean {
  if(resolveLocation(destinationCity))return matchesLocation(place,destinationCity);
  const destination = normalizedText(destinationCity);
  return [place.city, place.province].some((value) => {
    const location = normalizedText(value);
    return Boolean(location && destination) && location === destination;
  });
}

export class TourPlannerService {
  /** Internal, read-only edit of one server-held plan. Other days remain byte-identical. */
  public static async replanItinerary(rawInput:PlannerInput,baseline:GeneratedItinerary,edit:{dayNumber:number;pace?:TravelPace;removePlaceId?:string;removeActivityId?:string;replacementRestaurantId?:string;departureTime?:string},options:{catalog:PlaceData[]}):Promise<GeneratedItinerary>{
    const input=validatePlannerInput(rawInput),rows=options.catalog;
    if(input.planningVersion!==TIME_AWARE_V2||baseline.planningVersion!==TIME_AWARE_V2||!baseline.planning||baseline.costBasis!=='GROUP_VND_V1')throw new HttpError(409,'Cần bản lập lịch có giờ còn hiệu lực.','PLANNER_BASELINE_UNSUPPORTED');
    const sameLocation=(a:string,b:string)=>(resolveLocation(a)?.id||normalizedText(a))===(resolveLocation(b)?.id||normalizedText(b));
    if(!sameLocation(input.destinationCity,baseline.destinationCity)||!sameLocation(input.departureCity,baseline.departureCity)||input.startDate!==baseline.startDate||input.endDate!==baseline.endDate||input.adults!==baseline.adults||input.children!==baseline.children||input.totalBudget!==baseline.totalBudgetUserVND||input.transportation!==baseline.transportation)throw new HttpError(409,'Thông tin chuyến đã thay đổi; cần tạo lại trước khi sửa cục bộ.','PLANNER_BASELINE_STALE');
    const verifiedSnapshot=prepareTripSnapshot(baseline);if(Number(verifiedSnapshot.estimatedCostVND)!==baseline.totalEstimatedCostVND)throw new HttpError(409,'Chi phí snapshot không còn nhất quán.','PLANNER_BASELINE_STALE');
    const sourceIds=[...baseline.selectedPlaceIds,...(baseline.hotelSuggestion?[baseline.hotelSuggestion.id]:[])];
    if(catalogFingerprint(rows,sourceIds)!==baseline.planning.catalogFingerprint)throw new HttpError(409,'Catalog của lịch trình đã thay đổi.','PLANNER_BASELINE_STALE');
    if(!Number.isSafeInteger(edit.dayNumber)||edit.dayNumber<1||edit.dayNumber>baseline.daysCount)throw new HttpError(400,'Ngày cần sửa chưa hợp lệ.','INVALID_REPLAN_DAY');
    const oldDay=baseline.days[edit.dayNumber-1],mandatory=baseline.planning.mandatoryIds;
    if(edit.removePlaceId&&(!oldDay.activities.some(a=>a.placeId===edit.removePlaceId)||mandatory.includes(edit.removePlaceId)))throw new HttpError(422,'Không thể bỏ địa điểm bắt buộc hoặc ngoài ngày được chọn.','REPLAN_SELECTION_CONFLICT');
    const removedActivity=edit.removeActivityId?oldDay.activities.find(a=>a.id===edit.removeActivityId):undefined;
    if(edit.removeActivityId&&(!removedActivity||removedActivity.placeId&&mandatory.includes(removedActivity.placeId)||removedActivity.category==='hotel'||removedActivity.category==='leisure'))throw new HttpError(422,'Hoạt động cần giữ theo lựa chọn hoặc chính sách; chưa thể bỏ.','REPLAN_SELECTION_CONFLICT');
    if(removedActivity?.category==='sightseeing')edit={...edit,removePlaceId:removedActivity.placeId};
    const excluded=[...new Set([...(input.excludedPlaceIds||[]),...baseline.days.filter(d=>d.dayNumber!==edit.dayNumber).flatMap(d=>d.activities.filter(a=>a.category==='sightseeing').map(a=>a.placeId!)),...(edit.removePlaceId?[edit.removePlaceId]:[]),...(edit.replacementRestaurantId?oldDay.activities.filter(a=>a.category==='food'&&a.placeId!==edit.replacementRestaurantId).map(a=>a.placeId!).filter(Boolean):[])])];
    const pinned=mandatory.filter(id=>oldDay.activities.some(a=>a.placeId===id));
    if(edit.replacementRestaurantId){const restaurant=rows.find(p=>p.id===edit.replacementRestaurantId);if(!restaurant||restaurant.category!=='restaurant'||mandatory.some(id=>oldDay.activities.some(a=>a.placeId===id&&a.category==='food')&&id!==restaurant.id))throw new HttpError(422,'Nhà hàng thay thế chưa hợp lệ hoặc xung đột lựa chọn bắt buộc.','REPLAN_SELECTION_CONFLICT');pinned.push(restaurant.id);}
    if(baseline.hotelSuggestion)pinned.push(baseline.hotelSuggestion.id);
    const retainTarget=!!(edit.removePlaceId||edit.replacementRestaurantId||edit.departureTime||edit.pace==='relaxed'||edit.removeActivityId);
    const targetSights=oldDay.activities.filter(a=>a.category==='sightseeing'&&a.placeId!==edit.removePlaceId).map(a=>a.placeId!);
    const targetCatalog=retainTarget?rows.filter(p=>!['attraction','tour'].includes(p.category)||targetSights.includes(p.id)):rows;
    const updated=await this.generatePersonalizedItinerary({...input,startDate:oldDay.date,endDate:oldDay.date,pacing:edit.pace||input.pacing,mandatoryPlaceIds:[...new Set(pinned)],excludedPlaceIds:excluded,arrivalTime:edit.dayNumber===1?input.arrivalTime:undefined,departureTime:edit.departureTime||(edit.dayNumber===baseline.daysCount?input.departureTime:undefined)},{catalog:targetCatalog,allowEmptySightseeing:true,omittedSlots:removedActivity?.category==='food'?[removedActivity.timeSlot]:undefined});
    const day=structuredClone(updated.days[0]);if(!oldDay.activities.some(a=>a.category==='hotel'))day.activities=day.activities.filter(a=>a.category!=='hotel');day.dayNumber=oldDay.dayNumber;day.date=oldDay.date;day.themeTitle=oldDay.themeTitle;
    for(const activity of day.activities)activity.id=activity.id.replace(/^act-1-/,`act-${edit.dayNumber}-`);
    day.lodgingNights=oldDay.lodgingNights;day.lodgingEstimatedCostVND=oldDay.lodgingEstimatedCostVND;day.lodgingCostSource=oldDay.lodgingCostSource;day.dayEstimatedCostVND=day.activities.reduce((n,a)=>n+a.estimatedCostVND,0)+day.lodgingEstimatedCostVND;
    const result=structuredClone(baseline);result.days[edit.dayNumber-1]=day;result.totalEstimatedCostVND=result.days.reduce((n,d)=>n+d.dayEstimatedCostVND,0);Object.assign(result,assessPlannerBudget(result.totalBudgetUserVND,result.totalEstimatedCostVND));
    result.selectedPlaceIds=[...new Set(result.days.flatMap(d=>d.activities.map(a=>a.placeId).filter((id):id is string=>!!id)))];
    if(mandatory.some(id=>!result.selectedPlaceIds.includes(id)))throw new HttpError(422,'Chưa giữ đủ địa điểm bắt buộc.','MANDATORY_PLACE_SCHEDULING_FAILED');
    const retainedCoordinatesKnown=result.days.filter(d=>d.dayNumber!==edit.dayNumber).flatMap(d=>d.activities.filter(a=>a.category==='sightseeing')).every(validCoordinate);
    const retainedDistance=result.days.filter(d=>d.dayNumber!==edit.dayNumber).reduce((n,d)=>n+routeDistance(d.activities.filter(a=>a.category==='sightseeing').map(a=>rows.find(p=>p.id===a.placeId)),rows.find(p=>p.id===result.hotelSuggestion?.id)),0);
    result.planning={...result.planning!,feasibility:result.overBudgetVND?'PARTIALLY_FEASIBLE':updated.planning!.feasibility,warnings:[...new Set([...result.planning!.warnings,...updated.planning!.warnings,'LOCAL_REPLAN_OTHER_DAYS_RETAINED'])],route:{beforeKm:retainedCoordinatesKnown&&updated.planning!.route.beforeKm!==null?Number((retainedDistance+updated.planning!.route.beforeKm).toFixed(2)):null,afterKm:retainedCoordinatesKnown&&updated.planning!.route.afterKm!==null?Number((retainedDistance+updated.planning!.route.afterKm).toFixed(2)):null,basis:'HAVERSINE_SAME_CANDIDATES'},catalogFingerprint:catalogFingerprint(rows,[...result.selectedPlaceIds,...(result.hotelSuggestion?[result.hotelSuggestion.id]:[])]),replanning:{changedDays:[edit.dayNumber],unchangedDays:result.days.filter(d=>d.dayNumber!==edit.dayNumber).map(d=>d.dayNumber)}};
    if(result.planning!.warnings.some(w=>/CONFLICT|OUTSIDE|PARTIAL_DAY/.test(w)))result.planning!.feasibility='PARTIALLY_FEASIBLE';
    result.summary=`Đã lập lại ngày ${edit.dayNumber}; các ngày còn lại được giữ nguyên. Chưa lưu hoặc thay đổi Trip.`;
    return result;
  }
  /**
   * Tính số ngày từ ngày bắt đầu đến ngày kết thúc
   */
  public static calculateDaysBetween(startDateStr: string, endDateStr: string): number {
    return calculatePlannerDays(startDateStr, endDateStr);
  }

  public static async generateSmartItinerary(
    input: PlannerInput
  ): Promise<GeneratedItinerary> {
    return this.generatePersonalizedItinerary(input);
  }

  /**
   * Tạo lịch trình cá nhân hóa thông minh
   */
  public static async generatePersonalizedItinerary(
    rawInput: PlannerInput,
    options?: { catalog: PlaceData[];allowEmptySightseeing?:boolean;omittedSlots?:ItineraryActivity['timeSlot'][] }
  ): Promise<GeneratedItinerary> {
    const input = validatePlannerInput(rawInput);
    const timeAware=input.planningVersion===TIME_AWARE_V2,policy=pacePolicy(input.pacing),dayCapacity=timeAware?policy.maxSightseeing:2;
    const scheduleWarnings:string[]=[],route:{beforeKm:number|null;afterKm:number|null}={beforeKm:0,afterKm:0};
    const daysCount = this.calculateDaysBetween(input.startDate, input.endDate);
    const nightsCount = Math.max(daysCount - 1, 0);
    const totalPassengers = input.adults + input.children * 0.7;
    const dailyBudgetPerPerson = input.totalBudget / totalPassengers / daysCount;
    const groupCost = (perAdultEquivalent: number): number => {
      const amount = Math.round(perAdultEquivalent * totalPassengers);
      if (!Number.isSafeInteger(amount) || amount < 0) {
        throw new HttpError(400, 'Chi phí ước tính vượt giới hạn tính toán an toàn.', 'PLANNER_COST_LIMIT_EXCEEDED');
      }
      return amount;
    };
    // Preserve genuine zero. Missing values stay missing even if a public serializer
    // normalizes them to zero; the repository carries availability separately.
    const priceEstimate = (place: PlaceData | null | undefined, fallback: number, unit: string) => {
      const price = place?.priceFrom;
      const available = place?.catalogPriceAvailable !== false &&
        typeof price === 'number' && Number.isFinite(price) && price >= 0;
      return {
        amount: available ? price : fallback,
        source: available
          ? `Catalog priceFrom (${place!.name}): ${price} VND; giả định ${unit}, chưa xác minh đơn vị/giá dịch vụ.`
          : `Giả định planner T11-B: ${fallback} VND/${unit}; ${place?.name ?? 'chưa chọn dịch vụ'} thiếu giá catalog hợp lệ, chưa xác minh.`,
      };
    };

    // 1. Lấy tất cả dữ liệu địa điểm, nhà hàng và khách sạn
    // Internal service seam for request-scoped catalog constraints. HTTP never supplies catalog rows.
    const catalog = options?.catalog ?? await RecommendationRepository.getApprovedPlaces();
    const allPlaces = catalog.filter(isPubliclyEligible).filter(p=>!timeAware||!input.excludedPlaceIds?.includes(p.id));
    const rawMandatoryIds = input.mandatoryPlaceIds ?? [];
    if (!Array.isArray(rawMandatoryIds)) {
      throw new HttpError(400, 'mandatoryPlaceIds phải là một danh sách Place ID.', 'INVALID_MANDATORY_PLACE_IDS');
    }
    if (rawMandatoryIds.length > MAX_MANDATORY_PLACES) {
      throw new HttpError(400, `Chỉ được chọn tối đa ${MAX_MANDATORY_PLACES} địa điểm bắt buộc.`, 'MANDATORY_PLACE_LIMIT_EXCEEDED');
    }
    if (rawMandatoryIds.some((id) => typeof id !== 'string' || !UUID_PATTERN.test(id))) {
      throw new HttpError(400, 'Một hoặc nhiều Place ID không đúng định dạng UUID.', 'INVALID_MANDATORY_PLACE_ID');
    }
    const mandatoryIds = [...new Set(rawMandatoryIds)];
    const mandatoryPlaces = mandatoryIds.map((id) => {
      const place = allPlaces.find((candidate) => candidate.id === id);
      if (!place) {
        throw new HttpError(422, 'Địa điểm bắt buộc không tồn tại hoặc không còn đủ điều kiện hiển thị.', 'MANDATORY_PLACE_UNAVAILABLE');
      }
      if (!matchesDestination(place, input.destinationCity)) {
        throw new HttpError(422, `Địa điểm "${place.name}" không thuộc điểm đến ${input.destinationCity}.`, 'MANDATORY_PLACE_DESTINATION_MISMATCH');
      }
      return place;
    });

    const mandatoryAttractions = mandatoryPlaces.filter((place) => place.category === 'tour' || place.category === 'attraction');
    const mandatoryRestaurants = mandatoryPlaces.filter((place) => place.category === 'restaurant');
    const mandatoryHotels = mandatoryPlaces.filter((place) => place.category === 'hotel');
    if (
      mandatoryAttractions.length > daysCount * dayCapacity ||
      mandatoryRestaurants.length > daysCount ||
      mandatoryHotels.length > 1
    ) {
      throw new HttpError(
        422,
        `Lịch trình ${daysCount} ngày không đủ chỗ cho các địa điểm bắt buộc đã chọn.`,
        'MANDATORY_PLACE_CAPACITY_EXCEEDED',
      );
    }

    // Tách riêng danh mục
    const destinationPlaces = allPlaces.filter((place) => matchesDestination(place, input.destinationCity));
    const attractionCandidates = destinationPlaces.filter(
      (p) => p.category === 'tour' || p.category === 'attraction'
    );
    if (!attractionCandidates.length&&!options?.allowEmptySightseeing) {
      throw new HttpError(422,
        `Chưa đủ dữ liệu để tạo lịch trình tham quan tại ${input.destinationCity}: không có điểm tham quan hợp lệ. Hãy sửa yêu cầu hoặc chọn điểm đến khác rồi tạo lại.`,
        'NO_SIGHTSEEING_FOR_DESTINATION');
    }
    const restaurantCandidates = destinationPlaces.filter((p) => p.category === 'restaurant');
    const hotelCandidates = destinationPlaces.filter((p) => p.category === 'hotel');

    // 2. Chạy thuật toán Recommendation cho điểm tham quan
    const recommendedAttractions = RecommendationService.recommendPlaces(
      attractionCandidates,
      {
        destinationCity: input.destinationCity,
        preferences: input.preferences,
        dailyBudgetPerPerson,
      }
    );

    // 3. Phân cụm các điểm tham quan theo ngày dựa vào GIS GeoService
    const mandatorySet = new Set(mandatoryIds);
    let ranked=recommendedAttractions.map(r=>r.place);
    // Source classifications support preferences, never listing names.
    if(timeAware&&input.preferences.some(p=>p==='thien-nhien'||p==='van-hoa')){
      const supports=(p:PlaceData)=>input.preferences.some(pref=>pref==='thien-nhien'?(p.highlights||[]).some(h=>/thiên nhiên|nature/i.test(h)):pref==='van-hoa'?(p.highlights||[]).some(h=>/văn hóa|lịch sử|culture|history/i.test(h)):false);
      ranked=[...ranked.filter(supports),...ranked.filter(p=>!supports(p))];
    }
    const spotsToSchedule = [
      ...mandatoryAttractions,
      ...ranked.filter((place) => !mandatorySet.has(place.id)),
    ].slice(0, daysCount * dayCapacity);
    const dailyClusters = GeoService.clusterPlacesIntoDays(spotsToSchedule, daysCount);

    // 4. Khách sạn lưu trú phù hợp
    const recommendedHotels = RecommendationService.recommendPlaces(
      hotelCandidates,
      {
        destinationCity: input.destinationCity,
        preferences: ['Nghỉ dưỡng', ...input.preferences],
        dailyBudgetPerPerson: dailyBudgetPerPerson * 0.8,
      }
    );
    const selectedHotel = mandatoryHotels[0] || recommendedHotels.find((result) => !mandatorySet.has(result.place.id))?.place;
    const recommendedRestaurants = RecommendationService.recommendPlaces(
      restaurantCandidates,
      {
        destinationCity: input.destinationCity,
        preferences: ['am-thuc', ...input.preferences],
        dailyBudgetPerPerson: dailyBudgetPerPerson * 0.35,
      }
    ).map((result) => result.place);
    const restaurantsToSchedule = [
      ...mandatoryRestaurants,
      ...recommendedRestaurants.filter((place) => !mandatorySet.has(place.id)),
    ];

    // 5. Xây dựng chi tiết từng ngày (Morning, Lunch, Afternoon, Dinner)
    const days: ItineraryDay[] = [];
    let grandTotalCost = 0;

    const startDateObj = new Date(input.startDate);

    for (let dayIdx = 0; dayIdx < daysCount; dayIdx++) {
      const currentDate = new Date(startDateObj);
      currentDate.setUTCDate(startDateObj.getUTCDate() + dayIdx);
      const dateStr = currentDate.toISOString().split('T')[0];

      const dayNumber = dayIdx + 1;
      const daySpots = dailyClusters[dayIdx] || [];
      let activities: ItineraryActivity[] = [];
      let travelWindow:{start:number;end:number}|undefined;
      let dayCost = 0;

      // Buổi sáng: Điểm tham quan 1
      const morningSpot = daySpots[0];
      if (morningSpot) {
        const estimate = priceEstimate(morningSpot, 300000, 'người lớn quy đổi/lượt tham quan');
        const morningCost = groupCost(estimate.amount);
        activities.push({
          id: `act-${dayNumber}-morning`,
          placeId: morningSpot.id,
          timeSlot: 'morning',
          title: `Khám phá ${morningSpot.name}`,
          description: morningSpot.summary || 'Tham quan và trải nghiệm văn hóa cảnh quan đặc sắc.',
          category: 'sightseeing',
          durationMinutes: 180,
          estimatedCostVND: morningCost,
          costSource: estimate.source,
          latitude: morningSpot.latitude,
          longitude: morningSpot.longitude,
          imageUrl: morningSpot.heroImage,
          recommendationReason: mandatorySet.has(morningSpot.id)
            ? 'Địa điểm bắt buộc do bạn chọn từ trang chi tiết.'
            : 'Điểm tham quan được xếp hạng theo sở thích và tiêu chí hành trình của bạn.',
        });
        dayCost += morningCost;
      }

      // Buổi trưa: Ăn trưa tại nhà hàng đặc sản
      const lunchRestaurant = restaurantsToSchedule[dayIdx] || null;
      const lunchEstimate = priceEstimate(lunchRestaurant, 150000, 'người lớn quy đổi/bữa trưa');
      const lunchCost = groupCost(lunchEstimate.amount);
      activities.push({
        id: `act-${dayNumber}-lunch`,
        placeId: lunchRestaurant?.id,
        timeSlot: 'lunch',
        title: lunchRestaurant ? `Thưởng thức ẩm thực tại ${lunchRestaurant.name}` : 'Nghỉ ngơi và dùng bữa trưa đặc sản địa phương',
        description: lunchRestaurant?.summary || 'Thưởng thức các món ngon truyền thống nổi tiếng chuẩn vị bản địa.',
        category: 'food',
        durationMinutes: 90,
        estimatedCostVND: lunchCost,
        costSource: lunchEstimate.source,
        latitude: lunchRestaurant ? lunchRestaurant.latitude : (morningSpot?.latitude || 16.0544) + 0.005,
        longitude: lunchRestaurant ? lunchRestaurant.longitude : (morningSpot?.longitude || 108.2022) + 0.005,
        imageUrl: lunchRestaurant?.heroImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=600&q=80',
        recommendationReason: lunchRestaurant && mandatorySet.has(lunchRestaurant.id)
          ? 'Nhà hàng bắt buộc do bạn chọn từ trang chi tiết.'
          : 'Gợi ý ẩm thực phù hợp với điểm đến và ngân sách ước tính.',
      });
      dayCost += lunchCost;

      // Buổi chiều: Điểm tham quan 2 / Check-in
      const afternoonSpot = daySpots[1];
      if (afternoonSpot) {
        const estimate = priceEstimate(afternoonSpot, 300000, 'người lớn quy đổi/lượt tham quan');
        const afternoonCost = groupCost(estimate.amount);
        activities.push({
          id: `act-${dayNumber}-afternoon`,
          placeId: afternoonSpot.id,
          timeSlot: 'afternoon',
          title: `Check-in ${afternoonSpot.name}`,
          description: afternoonSpot.summary || 'Trải nghiệm buổi chiều thư giãn, chụp ảnh lưu niệm.',
          category: 'sightseeing',
          durationMinutes: 150,
          estimatedCostVND: afternoonCost,
          costSource: estimate.source,
          latitude: afternoonSpot.latitude,
          longitude: afternoonSpot.longitude,
          imageUrl: afternoonSpot.heroImage,
          recommendationReason: mandatorySet.has(afternoonSpot.id)
            ? 'Địa điểm bắt buộc do bạn chọn từ trang chi tiết.'
            : 'Gợi ý check-in phù hợp với điểm đến và cụm địa lý của ngày.',
        });
        dayCost += afternoonCost;
      }

      if(timeAware)for(const spot of daySpots.slice(2,dayCapacity)){
        const estimate=priceEstimate(spot,300000,'người lớn quy đổi/lượt tham quan');
        activities.push({id:'act-'+dayNumber+'-visit-'+spot.id,placeId:spot.id,timeSlot:'afternoon',title:spot.name,description:spot.summary||'Điểm trong catalog TravelGo.',category:'sightseeing',durationMinutes:150,estimatedCostVND:groupCost(estimate.amount),costSource:estimate.source,latitude:spot.latitude,longitude:spot.longitude,imageUrl:spot.heroImage,recommendationReason:'Địa điểm trong tập ứng viên; lịch được kiểm quỹ thời gian.'});
      }
      // Buổi tối: Dạo phố / Ăn tối & Khách sạn
      const dinnerCost = groupCost(200000);
      activities.push({
        id: `act-${dayNumber}-dinner`,
        timeSlot: 'dinner',
        title: 'Ăn tối, dạo chợ đêm & Thưởng ngoạn phố lên đèn',
        description: 'Tận hưởng không khí đêm náo nhiệt, thưởng thức đồ ăn vặt và mua sắm đặc sản.',
        category: 'food',
        durationMinutes: 120,
        estimatedCostVND: dinnerCost,
        costSource: 'Giả định planner T11-B: 200000 VND/người lớn quy đổi/bữa tối; chưa chọn dịch vụ, chưa xác minh giá.',
        latitude: (afternoonSpot?.latitude || 16.0544) - 0.004,
        longitude: (afternoonSpot?.longitude || 108.2022) + 0.003,
        imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=600&q=80',
        recommendationReason: 'Hoạt động trải nghiệm không gian về đêm đặc trưng của điểm đến.',
      });
      dayCost += dinnerCost;

      if (dayIdx === 0 && mandatoryHotels[0]) {
        activities.push({
          id: `act-${dayNumber}-hotel`,
          placeId: mandatoryHotels[0].id,
          timeSlot: 'evening',
          title: nightsCount > 0 ? `Khách sạn dự kiến: ${mandatoryHotels[0].name}` : `Khách sạn tham khảo: ${mandatoryHotels[0].name}`,
          description: mandatoryHotels[0].summary || 'Khách sạn do bạn chủ động chọn cho hành trình.',
          category: 'hotel',
          durationMinutes: 60,
          estimatedCostVND: 0,
          costSource: 'Mốc khách sạn 0đ; chi phí lưu trú tách riêng, không tính trùng.',
          latitude: mandatoryHotels[0].latitude,
          longitude: mandatoryHotels[0].longitude,
          imageUrl: mandatoryHotels[0].heroImage,
          recommendationReason: 'Khách sạn do bạn chọn. Phí lưu trú ước tính nằm ở mục riêng của ngày; không phải xác nhận đặt phòng.',
        });
      }

      if(timeAware){
        activities=activities.filter(a=>!options?.omittedSlots?.includes(a.timeSlot));
        const scheduled=schedulePlannerDay(activities,allPlaces,input,dayIdx,daysCount,mandatorySet,selectedHotel);activities=scheduled.activities;for(const activity of activities)if(activity.imageUrl==null)delete activity.imageUrl;travelWindow=scheduled.window;scheduleWarnings.push(...scheduled.warnings);route.beforeKm=route.beforeKm===null||scheduled.route.beforeKm===null?null:route.beforeKm+scheduled.route.beforeKm;route.afterKm=route.afterKm===null||scheduled.route.afterKm===null?null:route.afterKm+scheduled.route.afterKm;
        for(const a of activities)if(a.category==='sightseeing'||a.category==='food'){
          const place=allPlaces.find(p=>p.id===a.placeId),fallback=a.category==='sightseeing'?300000:a.timeSlot==='dinner'?200000:150000;
          const estimate=priceEstimate(a.timeSlot==='dinner'?null:place,fallback,a.category==='sightseeing'?'người lớn quy đổi/lượt tham quan':'người lớn quy đổi/bữa ăn');a.estimatedCostVND=groupCost(estimate.amount);a.costSource=estimate.source;
        }
        dayCost=activities.reduce((sum,a)=>sum+a.estimatedCostVND,0);
      }
      // One estimated room for the group; only the first N-1 days have a night.
      // priceFrom has no reliable room/night unit yet; disclose the assumption.
      const lodgingNights = dayIdx < nightsCount ? 1 : 0;
      const lodgingEstimate = priceEstimate(selectedHotel, 400000, 'nhóm/đêm (1 phòng giả định)');
      const lodgingEstimatedCostVND = lodgingNights
        ? Math.round(lodgingEstimate.amount)
        : 0;
      if (!Number.isSafeInteger(lodgingEstimatedCostVND)) {
        throw new HttpError(400, 'Chi phí lưu trú vượt giới hạn tính toán an toàn.', 'PLANNER_COST_LIMIT_EXCEEDED');
      }
      dayCost += lodgingEstimatedCostVND;

      // Tính khoảng cách cự ly giữa các hoạt động trong ngày
      for (let i = 0; !timeAware && i < activities.length - 1; i++) {
        const dist = GeoService.calculateHaversineDistance(
          { latitude: activities[i].latitude!, longitude: activities[i].longitude! },
          { latitude: activities[i + 1].latitude!, longitude: activities[i + 1].longitude! }
        );
        activities[i].aerialDistanceToNextKm = dist;
        activities[i].estimatedTransitMinutes = GeoService.estimateTravelTimeMinutes(dist, input.transportation);
      }

      const points=activities.filter(a=>!timeAware||validCoordinate(a)).map(a=>({latitude:a.latitude!,longitude:a.longitude!}));
      const centroid=points.length?GeoService.calculateCentroid(points):{latitude:null,longitude:null};

      days.push({
        dayNumber,
        date: dateStr,
        themeTitle: `Ngày ${dayNumber}: Khám phá văn hóa & danh thắng ${timeAware?(resolveLocation(input.destinationCity)?.catalogName||input.destinationCity):input.destinationCity}`,
        activities,
        dayEstimatedCostVND: dayCost,
        lodgingNights,
        lodgingEstimatedCostVND,
        lodgingCostSource: lodgingNights ? lodgingEstimate.source : '0 đêm: không tính phí lưu trú.',
        centroid,
        ...(timeAware?{travelWindow}:{}),
      });

      grandTotalCost += dayCost;
    }

    // Activity/day amounts already refer to the whole group; do not multiply twice.
    const totalTripEstimatedCost = grandTotalCost;
    if (!Number.isSafeInteger(totalTripEstimatedCost)) {
      throw new HttpError(400, 'Tổng chi phí vượt giới hạn tính toán an toàn.', 'PLANNER_COST_LIMIT_EXCEEDED');
    }
    const costDiff = input.totalBudget - totalTripEstimatedCost;
    const isWithinBudget = costDiff >= 0;

    let budgetAdvice = '';
    if (isWithinBudget) {
      budgetAdvice = `Tổng chi phí ước tính nằm trong ngân sách đã nhập. Bạn còn khoảng ${new Intl.NumberFormat('vi-VN').format(costDiff)}đ cho chi tiêu phát sinh hoặc mua sắm quà lưu niệm.`;
    } else {
      budgetAdvice = `Chi phí dự kiến vượt ngân sách khoảng ${new Intl.NumberFormat('vi-VN').format(Math.abs(costDiff))}đ. Gợi ý: Có thể cân nhắc phòng khách sạn tiêu chuẩn hoặc lựa chọn các quán ăn địa phương bình dân hơn để tiết kiệm.`;
    }

    const selectedPlaceIds = [...new Set(days.flatMap((day) =>
      day.activities.map((activity) => activity.placeId).filter((id): id is string => Boolean(id))
    ))];
    const missingMandatory = mandatoryIds.filter((id) => !selectedPlaceIds.includes(id));
    if (missingMandatory.length) {
      throw new HttpError(422, 'Không thể xếp địa điểm bắt buộc vào lịch trình hiện tại.', 'MANDATORY_PLACE_SCHEDULING_FAILED');
    }

    const warnings=[...new Set(scheduleWarnings)];
    if(timeAware&&!input.arrivalTime)warnings.push('ARRIVAL_TIME_ASSUMED');if(timeAware&&!input.departureTime)warnings.push('DEPARTURE_TIME_ASSUMED');
    return {
      ...(timeAware?{planningVersion:TIME_AWARE_V2,planning:{requestedPace:input.pacing,effectivePace:input.pacing,feasibility:(costDiff<0||warnings.some(w=>/CONFLICT|OUTSIDE|PARTIAL_DAY/.test(w))?'PARTIALLY_FEASIBLE':warnings.some(w=>/UNVERIFIED|UNKNOWN/.test(w))?'DATA_INSUFFICIENT':'FEASIBLE_UNDER_ASSUMPTIONS') as PlannerScheduling['feasibility'],warnings,route:{beforeKm:route.beforeKm===null?null:Number(route.beforeKm.toFixed(2)),afterKm:route.afterKm===null?null:Number(route.afterKm.toFixed(2)),basis:'HAVERSINE_SAME_CANDIDATES' as const},catalogFingerprint:catalogFingerprint(allPlaces,[...selectedPlaceIds,...(selectedHotel?[selectedHotel.id]:[])]),mandatoryIds}}:{}),
      id: `itinerary-${Date.now()}`,
      title: `Hành trình ${daysCount}N${nightsCount}Đ khám phá ${resolveLocation(input.destinationCity)?.catalogName||input.destinationCity}`,
      departureCity: resolveLocation(input.departureCity)?.catalogName||input.departureCity||'Toàn quốc',
      destinationCity: resolveLocation(input.destinationCity)?.catalogName||input.destinationCity,
      startDate: input.startDate,
      endDate: input.endDate,
      daysCount,
      nightsCount,
      costBasis: 'GROUP_VND_V1',
      transportation: input.transportation,
      costAssumptions: [
        'Mọi khoản activity, tổng ngày và tổng chuyến là VND cho cả nhóm, làm tròn từng khoản đến 1 VND; ngân sách cũng cho cả nhóm.',
        'Ước tính hoạt động/ăn uống quy đổi mỗi người lớn = 1, trẻ em = 0,7; đây là giả định lập kế hoạch, không phải chính sách giá của nhà cung cấp.',
        'priceFrom chưa có đơn vị và sức chứa đáng tin cậy. Tạm ước tính một phòng cho cả nhóm mỗi đêm; không bảo đảm đủ chỗ hoặc đúng giá phòng/đêm.',
        'Lưu trú dùng priceFrom khách sạn, thiếu giá dùng 400.000đ/nhóm/đêm; chỉ tính N−1 đêm. Phí này tách khỏi activity khách sạn có giá 0đ.',
        'Tham quan dùng priceFrom, thiếu giá tạm tính 300.000đ/người lớn quy đổi/lượt. Bữa trưa dùng priceFrom nhà hàng, thiếu giá tạm tính 150.000đ; bữa tối tạm tính 200.000đ/người lớn quy đổi. Nguồn giả định: định mức planner T11-B trong source, chưa khảo sát giá thị trường; xem nhãn từng khoản. Giá 0 được giữ nguyên; không cắt giá theo ngân sách.',
        'Chưa bao gồm vé máy bay/tàu, chi phí chặng khởi hành hoặc giá vận chuyển thực tế; tổng này không phải giá trọn gói hay bảo đảm đủ ngân sách.',
      ],
      adults: input.adults,
      children: input.children,
      pacing: input.pacing,
      preferences: [...input.preferences],
      totalBudgetUserVND: input.totalBudget,
      totalEstimatedCostVND: totalTripEstimatedCost,
      ...assessPlannerBudget(input.totalBudget, totalTripEstimatedCost),
      budgetAdvice,
      days,
      summary: timeAware?`Nhịp ${input.pacing==='relaxed'?'nghỉ dưỡng':input.pacing==='packed'?'khám phá nhiều':'cân bằng'}; thời gian và di chuyển chỉ là ước tính. Chưa xác minh đường bộ, thời tiết, còn chỗ hoặc chi phí liên tỉnh.`:`Hành trình ${daysCount} ngày theo tiêu chí đã chọn. Nhịp cân bằng: tối đa 2 điểm tham quan/ngày, không tính bữa ăn. ETA giữa các điểm bằng ${input.transportation === 'motorbike' ? 'xe máy' : 'ô tô'} là ước lượng từ khoảng cách Haversine, không phải tuyến đường bộ hoặc thời gian thực; chưa tính chặng và chi phí liên tỉnh.`,
      hotelSuggestion: selectedHotel,
      selectedPlaceIds,
      createdAt: new Date().toISOString(),
    };
  }
}
