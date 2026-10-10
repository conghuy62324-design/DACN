import { MOCK_PLACES, PlaceData, MOCK_REVIEWS } from '../utils/mockData.js';
import { RatingService, CriteriaRatings } from './ratingService.js';

let placesDb: PlaceData[] = [...MOCK_PLACES];
let reviewsDb = [...MOCK_REVIEWS];

export class PlaceService {
  public static async getAllPlaces(params?: {
    category?: string;
    city?: string;
    search?: string;
    minRating?: number;
    sortBy?: 'bayesian' | 'rating' | 'priceAsc' | 'priceDesc';
  }): Promise<PlaceData[]> {
    let result = [...placesDb];

    if (params?.category && params.category !== 'all') {
      result = result.filter((p) => p.category === params.category);
    }

    if (params?.city && params.city !== 'all') {
      const cityLower = params.city.toLowerCase();
      result = result.filter((p) => p.city.toLowerCase().includes(cityLower) || p.province.toLowerCase().includes(cityLower));
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.summary.toLowerCase().includes(q) ||
          p.city.toLowerCase().includes(q)
      );
    }

    if (params?.minRating) {
      result = result.filter((p) => p.rating >= params.minRating!);
    }

    // Recalculate Bayesian score to ensure fresh accuracy
    result = result.map((p) => ({
      ...p,
      bayesianRating: RatingService.calculateBayesianAverage(p.reviewCount, p.rating),
    }));

    // Sorting
    switch (params?.sortBy) {
      case 'bayesian':
        result.sort((a, b) => b.bayesianRating - a.bayesianRating);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'priceAsc':
        result.sort((a, b) => a.priceFrom - b.priceFrom);
        break;
      case 'priceDesc':
        result.sort((a, b) => b.priceFrom - a.priceFrom);
        break;
      default:
        result.sort((a, b) => b.bayesianRating - a.bayesianRating);
    }

    return result;
  }

  public static async getPlaceByIdOrSlug(idOrSlug: string): Promise<PlaceData | null> {
    const found = placesDb.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
    if (!found) return null;

    return {
      ...found,
      bayesianRating: RatingService.calculateBayesianAverage(found.reviewCount, found.rating),
    };
  }

  public static async getReviewsByTarget(targetId: string) {
    return reviewsDb.filter((r) => r.targetId === targetId);
  }

  public static async addReview(targetId: string, reviewData: {
    userName: string;
    userAvatar?: string;
    rating: number;
    criteria?: CriteriaRatings;
    comment: string;
  }) {
    const newReview = {
      id: `rev-${Date.now()}`,
      targetType: 'place',
      targetId,
      userName: reviewData.userName,
      userAvatar: reviewData.userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80',
      rating: reviewData.rating,
      ratingService: reviewData.criteria?.service ?? reviewData.rating,
      ratingPrice: reviewData.criteria?.price ?? reviewData.rating,
      ratingLocation: reviewData.criteria?.location ?? reviewData.rating,
      ratingExperience: reviewData.criteria?.experience ?? reviewData.rating,
      comment: reviewData.comment,
      createdAt: new Date().toISOString(),
    };

    reviewsDb.unshift(newReview);

    // Update Place stats
    const place = placesDb.find((p) => p.id === targetId);
    if (place) {
      const targetReviews = reviewsDb.filter((r) => r.targetId === targetId);
      const avg = targetReviews.reduce((sum, r) => sum + r.rating, 0) / targetReviews.length;
      place.reviewCount = targetReviews.length;
      place.rating = Number(avg.toFixed(1));
      place.bayesianRating = RatingService.calculateBayesianAverage(place.reviewCount, place.rating);
    }

    return newReview;
  }

  public static async createPlace(newPlace: Partial<PlaceData>): Promise<PlaceData> {
    const place: PlaceData = {
      id: `p-${Date.now()}`,
      name: newPlace.name || 'Địa điểm mới',
      slug: (newPlace.name || 'dia-diem-moi').toLowerCase().replace(/\s+/g, '-'),
      category: newPlace.category || 'tour',
      summary: newPlace.summary || '',
      description: newPlace.description || '',
      city: newPlace.city || 'Đà Nẵng',
      province: newPlace.province || newPlace.city || 'Đà Nẵng',
      address: newPlace.address || '',
      latitude: newPlace.latitude || 16.0544,
      longitude: newPlace.longitude || 108.2022,
      priceFrom: newPlace.priceFrom || 0,
      rating: 5.0,
      reviewCount: 1,
      bayesianRating: RatingService.calculateBayesianAverage(1, 5.0),
      duration: newPlace.duration || 'Trong ngày',
      heroImage: newPlace.heroImage || 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
      galleryImages: newPlace.galleryImages || [],
      highlights: newPlace.highlights || [],
      amenities: newPlace.amenities || [],
      itinerary: newPlace.itinerary || [],
      isFeatured: false,
    };

    placesDb.unshift(place);
    return place;
  }

  public static async deletePlace(id: string): Promise<boolean> {
    const idx = placesDb.findIndex((p) => p.id === id);
    if (idx !== -1) {
      placesDb.splice(idx, 1);
      return true;
    }
    return false;
  }
}
