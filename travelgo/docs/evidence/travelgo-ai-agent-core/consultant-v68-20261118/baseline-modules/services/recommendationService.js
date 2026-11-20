"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = exports.DEFAULT_RECOMMENDATION_WEIGHTS = void 0;
const recommendationRepository_js_1 = require("../repositories/recommendationRepository.js");
const ratingService_js_1 = require("./ratingService.js");
const geoService_js_1 = require("./geoService.js");
const vietnam_js_1 = require("../geography/vietnam.js");
exports.DEFAULT_RECOMMENDATION_WEIGHTS = {
    quality: 0.35,
    preference: 0.25,
    budget: 0.25,
    distance: 0.15,
};
const round6 = (value) => Number(value.toFixed(6));
const text = (value) => String(value ?? '').toLocaleLowerCase('vi-VN');
class RecommendationService {
    static { this.PREFERENCE_KEYWORDS = {
        'du lịch biển': ['biển', 'bãi tắm', 'lặn ngắm san hô', 'cano', 'hải sản', 'sunset', 'đảo'],
        bien: ['biển', 'bãi tắm', 'lặn ngắm san hô', 'cano', 'hải sản', 'sunset', 'đảo'],
        'khám phá thiên nhiên': ['núi', 'thác', 'rừng', 'sông', 'vịnh', 'mây', 'ruộng bậc thang', 'đèo', 'hang động'],
        'thien-nhien': ['núi', 'thác', 'rừng', 'sông', 'vịnh', 'mây', 'ruộng bậc thang', 'đèo', 'hang động'],
        'văn hóa và lịch sử': ['phố cổ', 'chùa', 'di sản', 'lăng', 'bảo tàng', 'kiến trúc', 'làng nghề', 'truyền thống'],
        'van-hoa': ['phố cổ', 'chùa', 'di sản', 'lăng', 'bảo tàng', 'kiến trúc', 'làng nghề', 'truyền thống'],
        'ẩm thực': ['mì quảng', 'cao lầu', 'hải sản', 'đặc sản', 'nhà hàng', 'ẩm thực', 'bánh xèo', 'buffet', 'cơm gà'],
        'am-thuc': ['mì quảng', 'cao lầu', 'hải sản', 'đặc sản', 'nhà hàng', 'ẩm thực', 'bánh xèo', 'buffet', 'cơm gà'],
        'nghỉ dưỡng': ['resort', 'spa', '5 sao', 'hồ bơi', 'yên tĩnh', 'nghỉ dưỡng', 'massage', 'view biển', 'ban công'],
        'nghi-duong': ['resort', 'spa', '5 sao', 'hồ bơi', 'yên tĩnh', 'nghỉ dưỡng', 'massage', 'view biển', 'ban công'],
        'check-in chụp ảnh': ['cầu vàng', 'sống ảo', 'hoàng hôn', 'đèn lồng', 'kiến trúc pháp', 'view đẹp', 'check-in'],
        'check-in': ['cầu vàng', 'sống ảo', 'hoàng hôn', 'đèn lồng', 'kiến trúc pháp', 'view đẹp', 'check-in'],
        'phiêu lưu': ['leo núi', 'phượt', 'kayak', 'cáp treo', 'hẻm vực', 'xe máy', 'chinh phục'],
        'phieu-luu': ['leo núi', 'phượt', 'kayak', 'cáp treo', 'hẻm vực', 'xe máy', 'chinh phục'],
        'mua sắm': ['chợ đêm', 'quà lưu niệm', 'đặc sản', 'ngọc trai', 'nước mắm', 'chợ'],
        'mua-sam': ['chợ đêm', 'quà lưu niệm', 'đặc sản', 'ngọc trai', 'nước mắm', 'chợ'],
    }; }
    static async recommendFromDatabase(query) {
        return this.recommendPlaces(await recommendationRepository_js_1.RecommendationRepository.getApprovedPlaces(), query);
    }
    static recommendForRequest(places, input) {
        const eligible = places.filter((place) => this.isPubliclyEligible(place));
        const withoutDestination = this.applyFilters(eligible, { ...input.filters, destinationCity: undefined });
        const destination = input.filters.destinationCity?.trim();
        const exact = destination && destination !== 'all'
            ? this.applyFilters(withoutDestination, { destinationCity: destination })
            : withoutDestination;
        const fallbackApplied = Boolean(destination && destination !== 'all' && exact.length === 0 && withoutDestination.length > 0);
        const candidates = fallbackApplied ? withoutDestination : exact;
        const center = input.centerCoords || this.centroid(candidates);
        const ranked = this.scoreCandidates(candidates, {
            destinationCity: 'all',
            preferences: input.preferences,
            dailyBudgetPerPerson: input.dailyBudgetPerPerson,
            centerCoords: center,
            weights: input.weights,
        }).slice(0, input.limit);
        return {
            items: ranked,
            fallback: {
                applied: fallbackApplied,
                code: fallbackApplied ? 'NO_DESTINATION_MATCH' : null,
                ...(fallbackApplied ? { requestedDestination: destination } : {}),
            },
            rankingContext: {
                candidateCount: candidates.length,
                distanceBasis: input.centerCoords
                    ? 'PROVIDED_CENTER_AERIAL'
                    : center
                        ? 'FILTERED_CANDIDATE_CENTROID_AERIAL'
                        : 'DISABLED',
            },
        };
    }
    static recommendPlaces(places, query) {
        const candidates = this.applyFilters(places.filter((place) => this.isPubliclyEligible(place)), query);
        const center = query.centerCoords || this.centroid(candidates);
        return this.scoreCandidates(candidates, { ...query, centerCoords: center });
    }
    static scoreCandidates(places, query) {
        const weights = { ...exports.DEFAULT_RECOMMENDATION_WEIGHTS, ...(query.weights || {}) };
        const results = places.map((place) => {
            const bayesianScore = ratingService_js_1.RatingService.calculateBayesianAverage(place.reviewCount, place.rating);
            const qualityScore = round6(Math.min(1, Math.max(0, bayesianScore / 5)));
            const preference = this.calculatePreferenceMatch(place, query.preferences);
            const preferenceScore = round6(preference.score);
            const budgetScore = round6(this.calculateBudgetSuitability(place.priceFrom, query.dailyBudgetPerPerson));
            const distanceScore = round6(query.centerCoords
                ? this.calculateDistanceScore(query.centerCoords, place)
                : 0);
            const finalScore = round6(qualityScore * weights.quality +
                preferenceScore * weights.preference +
                budgetScore * weights.budget +
                distanceScore * weights.distance);
            return {
                place,
                score: finalScore,
                breakdown: { qualityScore, preferenceScore, budgetScore, distanceScore },
                matchedPreferences: preference.matched,
                explanation: this.generateExplanation({
                    place,
                    bayesianScore,
                    matchedPreferences: preference.matched,
                    budgetScore,
                    hasBudgetInput: query.dailyBudgetPerPerson > 0,
                }),
            };
        });
        return results.sort((a, b) => {
            if (b.score !== a.score)
                return b.score - a.score;
            const bBayesian = ratingService_js_1.RatingService.calculateBayesianAverage(b.place.reviewCount, b.place.rating);
            const aBayesian = ratingService_js_1.RatingService.calculateBayesianAverage(a.place.reviewCount, a.place.rating);
            if (bBayesian !== aBayesian)
                return bBayesian - aBayesian;
            return String(a.place.id).localeCompare(String(b.place.id), 'en');
        });
    }
    static applyFilters(places, filters) {
        const destination = filters.destinationCity && filters.destinationCity !== 'all'
            ? text(filters.destinationCity.trim())
            : undefined;
        const search = filters.search ? text(filters.search.trim()) : undefined;
        return places.filter((place) => {
            if (destination && ((0, vietnam_js_1.resolveLocation)(filters.destinationCity) ? !(0, vietnam_js_1.matchesLocation)(place, filters.destinationCity) : !text(place.city).includes(destination) && !text(place.province).includes(destination)))
                return false;
            if (filters.category && filters.category !== 'all' && place.category !== filters.category)
                return false;
            if (filters.minRating !== undefined && Number(place.rating) < filters.minRating)
                return false;
            if (search && !text(`${place.name} ${place.summary} ${place.city}`).includes(search))
                return false;
            return true;
        });
    }
    static isPubliclyEligible(place) {
        const candidate = place;
        if (candidate.status && candidate.status !== 'APPROVED')
            return false;
        if (!candidate.businessId)
            return true;
        return candidate.business?.status === 'ACTIVE';
    }
    static centroid(places) {
        const valid = places.filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude));
        if (!valid.length)
            return undefined;
        return {
            latitude: valid.reduce((sum, place) => sum + place.latitude, 0) / valid.length,
            longitude: valid.reduce((sum, place) => sum + place.longitude, 0) / valid.length,
        };
    }
    static calculateDistanceScore(center, place) {
        const distanceKm = geoService_js_1.GeoService.calculateHaversineDistance(center, {
            latitude: place.latitude,
            longitude: place.longitude,
        });
        return Math.max(0.05, Math.min(1, 1 - distanceKm / 40));
    }
    static calculatePreferenceMatch(place, userPreferences) {
        if (!userPreferences?.length)
            return { score: 0.6, matched: [] };
        const placeText = text([
            place.name,
            place.summary,
            place.description,
            ...(place.highlights || []),
            ...(place.amenities || []),
        ].join(' '));
        const matched = userPreferences.filter((preference) => {
            const normalized = text(preference.trim());
            const keywords = this.PREFERENCE_KEYWORDS[normalized] || [normalized];
            return keywords.some((keyword) => placeText.includes(text(keyword)));
        });
        const ratio = matched.length / userPreferences.length;
        return { score: Math.min(1, Math.max(0.15, 0.2 + ratio * 0.8)), matched };
    }
    static calculateBudgetSuitability(placePrice, dailyBudget) {
        if (!dailyBudget || dailyBudget <= 0)
            return 0.8;
        if (placePrice === 0)
            return 0.95;
        const ratio = placePrice / dailyBudget;
        if (ratio <= 0.4)
            return 1;
        if (ratio <= 0.75)
            return 0.85;
        if (ratio <= 1.1)
            return 0.6;
        if (ratio <= 1.5)
            return 0.35;
        return 0.15;
    }
    static generateExplanation(params) {
        const reasons = [];
        if (params.matchedPreferences.length) {
            reasons.push(`Phù hợp sở thích [${params.matchedPreferences.join(', ')}]`);
        }
        if (params.place.reviewCount > 0 && params.bayesianScore >= 4.7) {
            reasons.push(`Đánh giá Bayesian xuất sắc (${params.bayesianScore.toFixed(2)}★)`);
        }
        else if (params.place.reviewCount > 0 && params.bayesianScore >= 4.4) {
            reasons.push(`Được cộng đồng đánh giá tốt (${params.bayesianScore.toFixed(2)}★)`);
        }
        if (params.hasBudgetInput && params.budgetScore >= 0.85) {
            reasons.push('Chi phí ước tính theo giá từ phù hợp với ngân sách đã nhập');
        }
        return reasons.join(' • ') || 'Gợi ý cân bằng từ các địa điểm đủ điều kiện hiển thị';
    }
}
exports.RecommendationService = RecommendationService;
