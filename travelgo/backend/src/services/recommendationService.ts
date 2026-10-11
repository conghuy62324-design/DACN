import { PlaceData } from './placeService.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { RatingService } from './ratingService.js';
import { GeoService, Coordinates } from './geoService.js';

export interface RecommendationWeights {
  quality: number;      // Trọng số chất lượng đánh giá (mặc định 0.35)
  preference: number;   // Trọng số sở thích cá nhân (mặc định 0.25)
  budget: number;       // Trọng số phù hợp ngân sách (mặc định 0.25)
  distance: number;     // Trọng số vị trí / khoảng cách (mặc định 0.15)
}

export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  quality: 0.35,
  preference: 0.25,
  budget: 0.25,
  distance: 0.15,
};

export interface RecommendationQuery {
  destinationCity: string;
  preferences: string[];     // e.g. ['Du lịch biển', 'Ẩm thực', 'Khám phá thiên nhiên', 'Văn hóa và lịch sử']
  dailyBudgetPerPerson: number; // Ngân sách mỗi người / ngày (VNĐ)
  centerCoords?: Coordinates;   // Tọa độ trung tâm để tính khoảng cách
  weights?: Partial<RecommendationWeights>;
}

export interface RecommendedPlaceResult {
  place: PlaceData;
  score: number;             // Điểm tổng hợp đã chuẩn hóa [0..1]
  breakdown: {
    qualityScore: number;    // Điểm chất lượng Bayesian [0..1]
    preferenceScore: number; // Điểm khớp sở thích [0..1]
    budgetScore: number;     // Điểm phù hợp ngân sách [0..1]
    distanceScore: number;   // Điểm cự ly thuận tiện [0..1]
  };
  matchedPreferences: string[];
  explanation: string;       // Giải thích lý do gợi ý
}

export class RecommendationService {
  public static async recommendFromDatabase(query: RecommendationQuery): Promise<RecommendedPlaceResult[]> {
    return this.recommendPlaces(await RecommendationRepository.getApprovedPlaces(), query);
  }
  /**
   * Bản đồ từ khóa sở thích của người dùng ánh xạ vào tags/highlights của địa điểm
   */
  private static readonly PREFERENCE_KEYWORDS: Record<string, string[]> = {
    'Du lịch biển': ['biển', 'bãi tắm', 'lặn ngắm san hô', 'cano', 'hải sản', 'sunset', 'đảo'],
    'bien': ['biển', 'bãi tắm', 'lặn ngắm san hô', 'cano', 'hải sản', 'sunset', 'đảo'],
    'Khám phá thiên nhiên': ['núi', 'thác', 'rừng', 'sông', 'vịnh', 'mây', 'ruộng bậc thang', 'đèo', 'hang động'],
    'thien-nhien': ['núi', 'thác', 'rừng', 'sông', 'vịnh', 'mây', 'ruộng bậc thang', 'đèo', 'hang động'],
    'Văn hóa và lịch sử': ['phố cổ', 'chùa', 'di sản', 'lăng', 'bảo tàng', 'kiến trúc', 'làng nghề', 'truyền thống'],
    'van-hoa': ['phố cổ', 'chùa', 'di sản', 'lăng', 'bảo tàng', 'kiến trúc', 'làng nghề', 'truyền thống'],
    'Ẩm thực': ['mì quảng', 'cao lầu', 'hải sản', 'đặc sản', 'nhà hàng', 'ẩm thực', 'bánh xèo', 'buffet', 'cơm gà'],
    'am-thuc': ['mì quảng', 'cao lầu', 'hải sản', 'đặc sản', 'nhà hàng', 'ẩm thực', 'bánh xèo', 'buffet', 'cơm gà'],
    'Nghỉ dưỡng': ['resort', 'spa', '5 sao', 'hồ bơi', 'yên tĩnh', 'nghỉ dưỡng', 'massage', 'view biển', 'ban công'],
    'nghi-duong': ['resort', 'spa', '5 sao', 'hồ bơi', 'yên tĩnh', 'nghỉ dưỡng', 'massage', 'view biển', 'ban công'],
    'Check-in chụp ảnh': ['cầu vàng', 'sống ảo', 'hoàng hôn', 'đèn lồng', 'kiến trúc pháp', 'view đẹp', 'check-in'],
    'check-in': ['cầu vàng', 'sống ảo', 'hoàng hôn', 'đèn lồng', 'kiến trúc pháp', 'view đẹp', 'check-in'],
    'Phiêu lưu': ['leo núi', 'phượt', 'kayak', 'cáp treo', 'hẻm vực', 'xe máy', 'chinh phục'],
    'phieu-luu': ['leo núi', 'phượt', 'kayak', 'cáp treo', 'hẻm vực', 'xe máy', 'chinh phục'],
    'Mua sắm': ['chợ đêm', 'quà lưu niệm', 'đặc sản', 'ngọc trai', 'nước mắm', 'chợ'],
    'mua-sam': ['chợ đêm', 'quà lưu niệm', 'đặc sản', 'ngọc trai', 'nước mắm', 'chợ'],
  };


  /**
   * Tính toán và xếp hạng danh sách địa điểm theo thuật toán Content-Based Recommendation
   */
  public static recommendPlaces(
    places: PlaceData[],
    query: RecommendationQuery
  ): RecommendedPlaceResult[] {
    const weights: RecommendationWeights = {
      ...DEFAULT_RECOMMENDATION_WEIGHTS,
      ...(query.weights || {}),
    };

    // Lọc theo thành phố nếu được chỉ định
    let candidates = [...places];
    if (query.destinationCity && query.destinationCity !== 'all') {
      const cityQuery = query.destinationCity.toLowerCase();
      candidates = candidates.filter(
        (p) =>
          p.city.toLowerCase().includes(cityQuery) ||
          p.province.toLowerCase().includes(cityQuery)
      );
    }

    if (candidates.length === 0) {
      candidates = [...places]; // Fallback nếu không có địa điểm nào cùng tên chính xác
    }

    // Tọa độ mỏ neo trung tâm
    const center =
      query.centerCoords ||
      (candidates.length > 0
        ? { latitude: candidates[0].latitude, longitude: candidates[0].longitude }
        : { latitude: 16.0544, longitude: 108.2022 });

    const results: RecommendedPlaceResult[] = candidates.map((place) => {
      // 1. Điểm chất lượng Bayesian Rating chuẩn hóa về [0..1]
      const bayesianScore = RatingService.calculateBayesianAverage(place.reviewCount, place.rating);
      const qualityScore = Math.min(1, Math.max(0, bayesianScore / 5.0));

      // 2. Điểm khớp sở thích người dùng [0..1]
      const { score: preferenceScore, matched } = this.calculatePreferenceMatch(
        place,
        query.preferences
      );

      // 3. Điểm phù hợp ngân sách [0..1]
      const budgetScore = this.calculateBudgetSuitability(
        place.priceFrom,
        query.dailyBudgetPerPerson
      );

      // 4. Điểm cự ly thuận tiện [0..1] (Càng gần trung tâm điểm càng cao)
      const distanceKm = GeoService.calculateHaversineDistance(center, {
        latitude: place.latitude,
        longitude: place.longitude,
      });
      // Chuẩn hóa: khoảng cách dưới 5km = 1.0, 30km = 0.2, >50km = 0.05
      const distanceScore = Math.max(0.05, Math.min(1, 1 - distanceKm / 40));

      // 5. Tổng hợp điểm số có trọng số
      const finalScore =
        qualityScore * weights.quality +
        preferenceScore * weights.preference +
        budgetScore * weights.budget +
        distanceScore * weights.distance;

      // 6. Xây dựng lý do gợi ý minh bạch cho người dùng (Explainability)
      const explanation = this.generateExplanation({
        place,
        bayesianScore,
        matchedPreferences: matched,
        budgetScore,
      });

      return {
        place,
        score: Number(finalScore.toFixed(3)),
        breakdown: {
          qualityScore: Number(qualityScore.toFixed(2)),
          preferenceScore: Number(preferenceScore.toFixed(2)),
          budgetScore: Number(budgetScore.toFixed(2)),
          distanceScore: Number(distanceScore.toFixed(2)),
        },
        matchedPreferences: matched,
        explanation,
      };
    });

    // Sắp xếp theo điểm tổng hợp giảm dần
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Tính điểm trùng khớp giữa thuộc tính địa điểm và sở thích người dùng
   */
  private static calculatePreferenceMatch(
    place: PlaceData,
    userPreferences: string[]
  ): { score: number; matched: string[] } {
    if (!userPreferences || userPreferences.length === 0) {
      return { score: 0.6, matched: ['Được đề xuất chung'] }; // Mặc định cân bằng
    }

    const matched: string[] = [];
    const placeText = [
      place.name,
      place.summary,
      place.description,
      ...(place.highlights || []),
      ...(place.amenities || []),
    ]
      .join(' ')
      .toLowerCase();

    for (const pref of userPreferences) {
      const keywords = this.PREFERENCE_KEYWORDS[pref] || [pref.toLowerCase()];
      const hasMatch = keywords.some((kw) => placeText.includes(kw));

      if (hasMatch) {
        matched.push(pref);
      }
    }

    // Điểm khớp theo tỉ lệ số sở thích thỏa mãn
    const ratio = matched.length / userPreferences.length;
    // Cho điểm cơ bản 0.2 và tăng dần theo tỉ lệ
    const score = Math.min(1, Math.max(0.15, 0.2 + ratio * 0.8));

    return {
      score: Number(score.toFixed(2)),
      matched: matched.length > 0 ? matched : ['Điểm đến tiêu biểu'],
    };
  }

  /**
   * Tính mức độ tương thích ngân sách [0..1]
   */
  private static calculateBudgetSuitability(
    placePrice: number,
    dailyBudget: number
  ): number {
    if (!dailyBudget || dailyBudget <= 0) return 0.8;

    // Chi phí địa điểm lý tưởng nằm trong khoảng 10% - 70% ngân sách 1 ngày
    if (placePrice === 0) return 0.95; // Miễn phí tham quan luôn được điểm cao

    const ratio = placePrice / dailyBudget;

    if (ratio <= 0.4) {
      return 1.0; // Rất tiết kiệm, phù hợp ngân sách
    } else if (ratio <= 0.75) {
      return 0.85; // Vừa vặn ngân sách
    } else if (ratio <= 1.1) {
      return 0.6; // Chạm ngưỡng ngân sách
    } else if (ratio <= 1.5) {
      return 0.35; // Hơi vượt ngân sách
    } else {
      return 0.15; // Quá đắt so với ngân sách của người dùng
    }
  }

  /**
   * Tạo lý do gợi ý minh bạch cho người dùng
   */
  private static generateExplanation(params: {
    place: PlaceData;
    bayesianScore: number;
    matchedPreferences: string[];
    budgetScore: number;
  }): string {
    const reasons: string[] = [];

    if (params.matchedPreferences.length > 0) {
      reasons.push(`Phù hợp sở thích [${params.matchedPreferences.join(', ')}]`);
    }

    if (params.bayesianScore >= 4.7) {
      reasons.push(`Đánh giá Bayesian xuất sắc (${params.bayesianScore.toFixed(2)}★)`);
    } else if (params.bayesianScore >= 4.4) {
      reasons.push(`Được cộng đồng đánh giá tốt (${params.bayesianScore.toFixed(2)}★)`);
    }

    if (params.budgetScore >= 0.85) {
      reasons.push('Chi phí rất phù hợp với ngân sách dự kiến');
    }

    return reasons.join(' • ') || 'Điểm đến nổi bật tại khu vực này';
  }
}
