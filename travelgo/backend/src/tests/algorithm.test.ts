import { RatingService } from '../services/ratingService.js';
import { GeoService } from '../services/geoService.js';
import { RecommendationService } from '../services/recommendationService.js';
import { TourPlannerService } from '../services/tourPlannerService.js';
import { PlaceService } from '../services/placeService.js';

interface TestCase {
  name: string;
  fn: () => boolean | Promise<boolean>;
}

const tests: TestCase[] = [
  // 1. BAYESIAN AVERAGE RATING TESTS
  {
    name: 'Bayesian: Địa điểm chưa có đánh giá (v = 0) trả về điểm trung bình hệ thống C (4.20)',
    fn: () => {
      const score = RatingService.calculateBayesianAverage(0, 0, 10, 4.2);
      return Math.abs(score - 4.2) < 0.001;
    },
  },
  {
    name: 'Bayesian: Địa điểm có 1 đánh giá 5.0 sao bị kéo về gần C hơn địa điểm có 150 đánh giá 4.85 sao',
    fn: () => {
      const score1 = RatingService.calculateBayesianAverage(1, 5.0, 10, 4.2); // (1*5 + 10*4.2) / 11 = 4.27
      const score2 = RatingService.calculateBayesianAverage(150, 4.85, 10, 4.2); // (150*4.85 + 10*4.2) / 160 = 4.809
      return score2 > score1;
    },
  },
  {
    name: 'Bayesian: Hai địa điểm cùng 4.9 sao nhưng 5 lượt đánh giá vs 300 lượt đánh giá',
    fn: () => {
      const fewReviews = RatingService.calculateBayesianAverage(5, 4.9, 10, 4.2); // (5*4.9 + 42) / 15 = 4.433
      const manyReviews = RatingService.calculateBayesianAverage(300, 4.9, 10, 4.2); // (300*4.9 + 42) / 310 = 4.877
      return manyReviews > fewReviews && manyReviews > 4.85;
    },
  },
  {
    name: 'Bayesian: Giới hạn điểm đánh giá hợp lệ nằm trong khoảng [1, 5]',
    fn: () => {
      const low = RatingService.calculateBayesianAverage(10, 0.5, 10, 4.2);
      const high = RatingService.calculateBayesianAverage(10, 6.5, 10, 4.2);
      return low >= 1.0 && high <= 5.0;
    },
  },

  // 2. GEOGRAPHIC GIS & HAVERSINE TESTS
  {
    name: 'GeoService: Tính khoảng cách Haversine giữa Cầu Rồng và Chùa Linh Ứng (Đà Nẵng)',
    fn: () => {
      // Cầu Rồng: 16.061, 108.2272; Chùa Linh Ứng: 16.1022, 108.2755
      const distKm = GeoService.calculateHaversineDistance(
        { latitude: 16.061, longitude: 108.2272 },
        { latitude: 16.1022, longitude: 108.2755 }
      );
      // Khoảng cách đường chim bay khoảng 6.8 - 7.2 km
      return distKm > 6.0 && distKm < 8.0;
    },
  },
  {
    name: 'GeoService: Ước tính thời gian di chuyển với nhãn cảnh báo đường chim bay',
    fn: () => {
      const transitMin = GeoService.estimateTravelTimeMinutes(10, 'car');
      return transitMin > 0 && transitMin <= 40;
    },
  },
  {
    name: 'GeoService: Phân cụm địa lý nhiều ngày nhóm các điểm gần nhau',
    fn: async () => {
      const places = await PlaceService.getAllPlaces({ city: 'Đà Nẵng' });
      const clusters = GeoService.clusterPlacesIntoDays(places, 3);
      return clusters.length === 3 && clusters[0].length > 0;
    },
  },

  // 3. RECOMMENDATION ENGINE TESTS
  {
    name: 'Recommendation: Điểm phù hợp sở thích tăng khi trùng nhiều danh mục',
    fn: async () => {
      const places = await PlaceService.getAllPlaces();
      const recs = RecommendationService.recommendPlaces(places, {
        destinationCity: 'Đà Nẵng',
        preferences: ['am-thuc', 'thien-nhien'],
        dailyBudgetPerPerson: 2000000,
      });

      return recs.length > 0 && recs[0].score >= recs[recs.length - 1].score;
    },
  },
  {
    name: 'Recommendation: Ngân sách tiết kiệm (300.000đ/ngày) ưu tiên các điểm có chi phí phù hợp (budgetScore >= 0.8)',
    fn: async () => {
      const places = await PlaceService.getAllPlaces();
      const lowBudgetRecs = RecommendationService.recommendPlaces(places, {
        destinationCity: 'Đà Nẵng',
        preferences: ['am-thuc'],
        dailyBudgetPerPerson: 300000,
        weights: { budget: 0.6, quality: 0.1, preference: 0.2, distance: 0.1 },
      });

      return lowBudgetRecs.length > 0 && lowBudgetRecs[0].breakdown.budgetScore >= 0.8;
    },
  },




  // 4. TOUR PLANNER & ITINERARY SCHEDULER TESTS
  {
    name: 'TourPlanner: Tạo lịch trình 3N2Đ phân bổ đủ các ngày và tính chi phí',
    fn: async () => {
      const plan = await TourPlannerService.generateSmartItinerary({
        destinationCity: 'Đà Nẵng',
        departureCity: 'Hà Nội',
        startDate: '2026-10-20',
        endDate: '2026-10-22',
        adults: 2,
        children: 0,
        totalBudget: 6000000,
        transportation: 'car',
        preferences: ['am-thuc', 'thien-nhien'],
        pacing: 'balanced',
      });

      return (
        plan.daysCount === 3 &&
        plan.days.length === 3 &&
        plan.days[0].activities.length > 0 &&
        plan.totalEstimatedCostVND > 0 &&
        plan.hotelSuggestion !== undefined
      );
    },
  },
  {
    name: 'TourPlanner: Đánh giá ngân sách chính xác (within_budget vs over_budget)',
    fn: async () => {
      const tightPlan = await TourPlannerService.generateSmartItinerary({
        destinationCity: 'Đà Nẵng',
        departureCity: 'Hà Nội',
        startDate: '2026-10-20',
        endDate: '2026-10-22',
        adults: 2,
        children: 0,
        totalBudget: 1000000, // Quá ít cho 3 ngày
        transportation: 'car',
        preferences: ['am-thuc'],
        pacing: 'relaxed',
      });

      return tightPlan.budgetStatus === 'over_budget' && tightPlan.costDifferenceVND < 0;
    },
  },
];

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('   HUGO TRAVEL - UNIT TEST SUITE THUẬT TOÁN & GIS');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    const t = tests[i];
    try {
      const ok = await t.fn();
      if (ok) {
        console.log(`[PASS] (${i + 1}/${tests.length}) ${t.name}`);
        passed++;
      } else {
        console.error(`[FAIL] (${i + 1}/${tests.length}) ${t.name}`);
        failed++;
      }
    } catch (err) {
      console.error(`[ERROR] (${i + 1}/${tests.length}) ${t.name}:`, err);
      failed++;
    }
  }

  console.log('\n------------------------------------------------------');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed}/${tests.length} TEST PASSED (${Math.round((passed / tests.length) * 100)}%)`);
  if (failed > 0) {
    console.log(`SỐ TEST FAILED: ${failed}`);
  } else {
    console.log('TẤT CẢ CÁC RÀNG BUỘC THUẬT TOÁN ĐÃ ĐẠT CHUẨN ĐẶT RA!');
  }
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runTestSuite();
