import { PlaceData } from './placeService.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { RecommendationService } from './recommendationService.js';
import { GeoService } from './geoService.js';
import type { TravelPreference } from '../utils/travelPreferences.js';
import { HttpError } from '../utils/httpError.js';

export interface PlannerInput {
  departureCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  totalBudget: number; // VNĐ
  transportation: 'flight' | 'car' | 'train' | 'motorbike';
  preferences: TravelPreference[];
  pacing: 'relaxed' | 'balanced' | 'packed';
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
  adults: number;
  children: number;
  pacing: 'relaxed' | 'balanced' | 'packed';
  preferences: TravelPreference[];
  totalBudgetUserVND: number;
  totalEstimatedCostVND: number;
  costDifferenceVND: number;
  budgetStatus: 'within_budget' | 'over_budget';
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
  const destination = normalizedText(destinationCity);
  return [place.city, place.province].some((value) => {
    const location = normalizedText(value);
    return location === destination || location.includes(destination) || destination.includes(location);
  });
}

export class TourPlannerService {
  /**
   * Tính số ngày từ ngày bắt đầu đến ngày kết thúc
   */
  public static calculateDaysBetween(startDateStr: string, endDateStr: string): number {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, Math.min(10, diffDays || 3));
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
    input: PlannerInput
  ): Promise<GeneratedItinerary> {

    const daysCount = this.calculateDaysBetween(input.startDate, input.endDate);
    const totalPassengers = Math.max(1, input.adults + input.children * 0.7);
    const dailyBudgetPerPerson = input.totalBudget > 0
      ? input.totalBudget / totalPassengers / daysCount
      : 1500000;

    // 1. Lấy tất cả dữ liệu địa điểm, nhà hàng và khách sạn
    const catalog = await RecommendationRepository.getApprovedPlaces();
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
    const attractionCandidates = allPlaces.filter(
      (p) => p.category === 'tour' || p.category === 'attraction'
    );
    const restaurantCandidates = allPlaces.filter((p) => p.category === 'restaurant');
    const hotelCandidates = allPlaces.filter((p) => p.category === 'hotel');

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
      hotelCandidates.length > 0 ? hotelCandidates : allPlaces,
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
      currentDate.setDate(startDateObj.getDate() + dayIdx);
      const dateStr = currentDate.toISOString().split('T')[0];

      const dayNumber = dayIdx + 1;
      const daySpots = dailyClusters[dayIdx] || [];
      const activities: ItineraryActivity[] = [];
      let dayCost = 0;

      // Buổi sáng: Điểm tham quan 1
      const morningSpot = daySpots[0];
      if (morningSpot) {
        const morningCost = Math.min(morningSpot.priceFrom || 300000, dailyBudgetPerPerson * 0.4);
        activities.push({
          id: `act-${dayNumber}-morning`,
          placeId: morningSpot.id,
          timeSlot: 'morning',
          title: `Khám phá ${morningSpot.name}`,
          description: morningSpot.summary || 'Tham quan và trải nghiệm văn hóa cảnh quan đặc sắc.',
          category: 'sightseeing',
          durationMinutes: 180,
          estimatedCostVND: morningCost,
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
      const lunchCost = 150000;
      activities.push({
        id: `act-${dayNumber}-lunch`,
        placeId: lunchRestaurant?.id,
        timeSlot: 'lunch',
        title: lunchRestaurant ? `Thưởng thức ẩm thực tại ${lunchRestaurant.name}` : 'Nghỉ ngơi và dùng bữa trưa đặc sản địa phương',
        description: lunchRestaurant?.summary || 'Thưởng thức các món ngon truyền thống nổi tiếng chuẩn vị bản địa.',
        category: 'food',
        durationMinutes: 90,
        estimatedCostVND: lunchCost,
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
        const afternoonCost = Math.min(afternoonSpot.priceFrom || 200000, dailyBudgetPerPerson * 0.3);
        activities.push({
          id: `act-${dayNumber}-afternoon`,
          placeId: afternoonSpot.id,
          timeSlot: 'afternoon',
          title: `Check-in ${afternoonSpot.name}`,
          description: afternoonSpot.summary || 'Trải nghiệm buổi chiều thư giãn, chụp ảnh lưu niệm.',
          category: 'sightseeing',
          durationMinutes: 150,
          estimatedCostVND: afternoonCost,
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
      const dinnerCost = 200000;
      activities.push({
        id: `act-${dayNumber}-dinner`,
        timeSlot: 'dinner',
        title: 'Ăn tối, dạo chợ đêm & Thưởng ngoạn phố lên đèn',
        description: 'Tận hưởng không khí đêm náo nhiệt, thưởng thức đồ ăn vặt và mua sắm đặc sản.',
        category: 'food',
        durationMinutes: 120,
        estimatedCostVND: dinnerCost,
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
          title: `Nhận phòng tại ${mandatoryHotels[0].name}`,
          description: mandatoryHotels[0].summary || 'Khách sạn do bạn chủ động chọn cho hành trình.',
          category: 'hotel',
          durationMinutes: 60,
          estimatedCostVND: 0,
          latitude: mandatoryHotels[0].latitude,
          longitude: mandatoryHotels[0].longitude,
          imageUrl: mandatoryHotels[0].heroImage,
          recommendationReason: 'Khách sạn bắt buộc do bạn chọn từ trang chi tiết địa điểm.',
        });
      }

      // Tiền phòng khách sạn mỗi đêm (nếu chuyến đi nhiều ngày)
      const hotelNightCost = selectedHotel ? Math.round(selectedHotel.priceFrom / totalPassengers) : 400000;
      dayCost += hotelNightCost;

      // Tính khoảng cách cự ly giữa các hoạt động trong ngày
      for (let i = 0; i < activities.length - 1; i++) {
        const dist = GeoService.calculateHaversineDistance(
          { latitude: activities[i].latitude, longitude: activities[i].longitude },
          { latitude: activities[i + 1].latitude, longitude: activities[i + 1].longitude }
        );
        activities[i].aerialDistanceToNextKm = dist;
        activities[i].estimatedTransitMinutes = GeoService.estimateTravelTimeMinutes(dist, 'car');
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
        centroid,
      });

      grandTotalCost += dayCost;
    }

    // Nhân tổng chi phí cho toàn bộ số người
    const totalTripEstimatedCost = Math.round(grandTotalCost * totalPassengers);
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
      title: `Hành trình ${daysCount}N${daysCount > 1 ? daysCount - 1 : 1}Đ khám phá ${input.destinationCity}`,
      departureCity: input.departureCity || 'Toàn quốc',
      destinationCity: input.destinationCity,
      startDate: input.startDate,
      endDate: input.endDate,
      daysCount,
      adults: input.adults,
      children: input.children,
      pacing: input.pacing,
      preferences: [...input.preferences],
      totalBudgetUserVND: input.totalBudget,
      totalEstimatedCostVND: totalTripEstimatedCost,
      costDifferenceVND: costDiff,
      budgetStatus: isWithinBudget ? 'within_budget' : 'over_budget',
      budgetAdvice,
      days,
      summary: `Hành trình du lịch ${daysCount} ngày được thiết kế thông minh dựa trên thuật toán Content-Based và khoảng cách địa lý, đáp ứng các sở thích [${input.preferences.join(', ')}] với nhịp độ ${input.pacing === 'relaxed' ? 'Thư giãn' : input.pacing === 'packed' ? 'Khám phá nhiều' : 'Cân bằng'}.`,
      hotelSuggestion: selectedHotel,
      selectedPlaceIds,
      createdAt: new Date().toISOString(),
    };
  }
}
