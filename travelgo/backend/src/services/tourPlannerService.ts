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
  pacing: 'balanced';
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
  latitude: number;
  longitude: number;
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
  centroid: { latitude: number; longitude: number };
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
    options?: { catalog: PlaceData[] }
  ): Promise<GeneratedItinerary> {
    const input = validatePlannerInput(rawInput);
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
    const allPlaces = catalog.filter(isPubliclyEligible);
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
      mandatoryAttractions.length > daysCount * 2 ||
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
    if (!attractionCandidates.length) {
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
    const spotsToSchedule = [
      ...mandatoryAttractions,
      ...recommendedAttractions.map((result) => result.place).filter((place) => !mandatorySet.has(place.id)),
    ].slice(0, daysCount * 2);
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
      const activities: ItineraryActivity[] = [];
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
      for (let i = 0; i < activities.length - 1; i++) {
        const dist = GeoService.calculateHaversineDistance(
          { latitude: activities[i].latitude, longitude: activities[i].longitude },
          { latitude: activities[i + 1].latitude, longitude: activities[i + 1].longitude }
        );
        activities[i].aerialDistanceToNextKm = dist;
        activities[i].estimatedTransitMinutes = GeoService.estimateTravelTimeMinutes(dist, input.transportation);
      }

      const centroid = GeoService.calculateCentroid(
        activities.map((a) => ({ latitude: a.latitude, longitude: a.longitude }))
      );

      days.push({
        dayNumber,
        date: dateStr,
        themeTitle: `Ngày ${dayNumber}: Khám phá văn hóa & danh thắng ${input.destinationCity}`,
        activities,
        dayEstimatedCostVND: dayCost,
        lodgingNights,
        lodgingEstimatedCostVND,
        lodgingCostSource: lodgingNights ? lodgingEstimate.source : '0 đêm: không tính phí lưu trú.',
        centroid,
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

    return {
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
      summary: `Hành trình ${daysCount} ngày theo tiêu chí đã chọn. Nhịp cân bằng: tối đa 2 điểm tham quan/ngày, không tính bữa ăn. ETA giữa các điểm bằng ${input.transportation === 'motorbike' ? 'xe máy' : 'ô tô'} là ước lượng từ khoảng cách Haversine, không phải tuyến đường bộ hoặc thời gian thực; chưa tính chặng và chi phí liên tỉnh.`,
      hotelSuggestion: selectedHotel,
      selectedPlaceIds,
      createdAt: new Date().toISOString(),
    };
  }
}
