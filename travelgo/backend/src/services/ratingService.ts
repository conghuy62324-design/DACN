import { ENV } from '../config/env.js';

export interface CriteriaRatings {
  service?: number;
  price?: number;
  location?: number;
  experience?: number;
}

export interface RatingWeights {
  service: number;
  price: number;
  location: number;
  experience: number;
}

export const DEFAULT_WEIGHTS: RatingWeights = {
  service: 0.25,
  price: 0.25,
  location: 0.25,
  experience: 0.25,
};

export class RatingService {
  /**
   * Tính điểm trung bình điều chỉnh Bayesian (Bayesian Average Rating)
   * Formula: S = (v / (v + m)) * R + (m / (v + m)) * C
   *
   * @param v Tổng số lượt đánh giá của địa điểm (voter count)
   * @param R Điểm trung bình số sao thực tế của địa điểm (average rating, 1..5)
   * @param m Ngưỡng số lượt đánh giá tối thiểu (threshold, mặc định lấy từ config = 10)
   * @param C Điểm trung bình chung của toàn hệ thống (system mean, mặc định = 4.20)
   * @returns S Điểm xếp hạng Bayesian đã chuẩn hóa (làm tròn 2 chữ số thập phân)
   */
  public static calculateBayesianAverage(
    v: number,
    R: number,
    m: number = ENV.BAYESIAN_MIN_REVIEWS,
    C: number = ENV.BAYESIAN_MEAN_PRIOR
  ): number {
    // Ràng buộc số sao thực tế hợp lệ từ 1.0 đến 5.0
    const clampedR = Math.min(5, Math.max(1, R || C));

    if (v <= 0) {
      return Number(C.toFixed(2));
    }
    const score = (v / (v + m)) * clampedR + (m / (v + m)) * C;
    return Number(Math.min(5, Math.max(1, score)).toFixed(2));
  }

  /**
   * Tính điểm trung bình hệ thống C thực tế từ danh sách địa điểm/đánh giá
   */
  public static computeSystemMean<T extends { rating: number; reviewCount: number }>(
    items: T[],
    defaultMean: number = ENV.BAYESIAN_MEAN_PRIOR
  ): number {
    const validItems = items.filter((item) => item.reviewCount > 0);
    if (validItems.length === 0) return defaultMean;

    const totalWeightedStars = validItems.reduce((acc, curr) => acc + curr.rating * curr.reviewCount, 0);
    const totalVotes = validItems.reduce((acc, curr) => acc + curr.reviewCount, 0);

    if (totalVotes === 0) return defaultMean;
    const computedMean = totalWeightedStars / totalVotes;
    return Number(computedMean.toFixed(2));
  }

  /**
   * Trả về phân tích chi tiết giữa điểm sao thực tế và điểm Bayesian
   */
  public static getRatingAnalysis(
    reviewCount: number,
    rawRating: number,
    m: number = ENV.BAYESIAN_MIN_REVIEWS,
    C: number = ENV.BAYESIAN_MEAN_PRIOR
  ) {
    const bayesianScore = this.calculateBayesianAverage(reviewCount, rawRating, m, C);
    const delta = Number((bayesianScore - rawRating).toFixed(2));

    let confidenceLevel: 'Cao' | 'Tin cậy' | 'Mới ghi nhận' = 'Mới ghi nhận';
    if (reviewCount >= 50) confidenceLevel = 'Cao';
    else if (reviewCount >= m) confidenceLevel = 'Tin cậy';

    return {
      rawRating: Number(rawRating.toFixed(2)),
      bayesianScore,
      reviewCount,
      delta,
      confidenceLevel,
      formula: `S = (${reviewCount}/(${reviewCount}+${m})) * ${rawRating.toFixed(1)} + (${m}/(${reviewCount}+${m})) * ${C.toFixed(2)}`,
    };
  }

  /**
   * Tính điểm tổng hợp theo đa tiêu chí: Giá cả, Dịch vụ, Vị trí, Trải nghiệm
   */
  public static calculateMultiCriteriaRating(
    criteria: CriteriaRatings,
    weights: RatingWeights = DEFAULT_WEIGHTS
  ): number {
    let totalWeight = 0;
    let weightedSum = 0;

    if (criteria.service !== undefined) {
      weightedSum += criteria.service * weights.service;
      totalWeight += weights.service;
    }
    if (criteria.price !== undefined) {
      weightedSum += criteria.price * weights.price;
      totalWeight += weights.price;
    }
    if (criteria.location !== undefined) {
      weightedSum += criteria.location * weights.location;
      totalWeight += weights.location;
    }
    if (criteria.experience !== undefined) {
      weightedSum += criteria.experience * weights.experience;
      totalWeight += weights.experience;
    }

    if (totalWeight === 0) return 5.0;
    const finalRating = weightedSum / totalWeight;
    return Number(finalRating.toFixed(2));
  }

  /**
   * Tính điểm Bayesian cho danh sách địa điểm và sắp xếp theo độ uy tín
   */
  public static rankPlacesByBayesian<T extends { rating: number; reviewCount: number }>(
    places: T[],
    m: number = ENV.BAYESIAN_MIN_REVIEWS,
    C: number = ENV.BAYESIAN_MEAN_PRIOR
  ): (T & { bayesianScore: number })[] {
    return places
      .map((item) => ({
        ...item,
        bayesianScore: this.calculateBayesianAverage(item.reviewCount, item.rating, m, C),
      }))
      .sort((a, b) => b.bayesianScore - a.bayesianScore);
  }
}
