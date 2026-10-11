export interface Place {
  id: string;
  businessId?: string;
  name: string;
  slug: string;
  category: 'tour' | 'attraction' | 'hotel' | 'restaurant';
  summary: string;
  description: string;
  city: string;
  province: string;
  address: string;
  latitude: number;
  longitude: number;
  priceFrom: number;
  rating: number;
  reviewCount: number;
  bayesianRating: number;
  duration?: string;
  heroImage: string;
  galleryImages: string[];
  highlights: string[];
  amenities: string[];
  itinerary?: { day: number; title: string; desc: string; image?: string }[];
  isFeatured?: boolean;
  district?: string;
  openingHours?: Record<string, unknown>;
  contactInfo?: Record<string, unknown>;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}

export interface Ticket {
  id: string;
  businessId?: string;
  title: string;
  type: 'flight' | 'bus' | 'train' | 'tour' | 'sightseeing';
  operator: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string;
  arrivalTime?: string;
  duration?: string;
  price: number;
  originalPrice?: number;
  availableSeats: number;
  capacity: number;
  features: string[];
  imageUrl?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Booking {
  id: string;
  bookingCode: string;
  serviceType: 'tour' | 'hotel' | 'restaurant' | 'ticket';
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  returnDate?: string;
  adultsCount: number;
  childrenCount: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  bookingStatus: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'REJECTED';
  quantity: number;
  discountAmount: number;
  businessId?: string;
  notes?: string;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  businessId?: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  destinationName: string;
  authorName: string;
  authorAvatar?: string;
  coverImage: string;
  costEstimate?: string;
  tripDuration?: string;
  tags: string[];
  likesCount: number;
  isFeatured?: boolean;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  createdAt: string;
}

export interface Review {
  id: string;
  targetType: string;
  targetId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  ratingService?: number;
  ratingPrice?: number;
  ratingLocation?: number;
  ratingExperience?: number;
  comment: string;
  createdAt: string;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  roles: UserRole[];
  /** Legacy field accepted while old sessions are being migrated. */
  role?: 'user' | 'admin' | 'partner';
  avatarUrl?: string;
  phone?: string;
}

export type UserRole = 'CUSTOMER' | 'PARTNER' | 'SUPER_ADMIN';

export type BusinessType = 'HOTEL' | 'HOMESTAY' | 'RESORT' | 'RESTAURANT' | 'TOUR_OPERATOR';

export interface Business {
  id: string;
  name: string;
  type: BusinessType;
  email: string;
  phone: string;
  address: string;
  city: string;
  status: 'ACTIVE' | 'SUSPENDED';
  permissions?: string[];
}

export type PartnerApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO' | 'SUSPENDED';

export interface PartnerApplication {
  id: string;
  representativeName: string;
  businessName: string;
  businessType: BusinessType;
  email: string;
  phone: string;
  address: string;
  city: string;
  imageUrls: string[];
  verificationDetails: Record<string, unknown>;
  status: PartnerApplicationStatus;
  decisionReason?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface TourPackage {
  id: string;
  businessId?: string;
  title: string;
  slug: string;
  destinationCity: string;
  departureCity: string;
  durationDays: number;
  durationNights: number;
  category: 'beach' | 'culture' | 'nature' | 'resort' | 'adventure';
  summary: string;
  description: string;
  heroImage: string;
  galleryImages: string[];
  priceVND: number;
  rating: number;
  reviewCount: number;
  bayesianScore: number;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  itineraryDays: {
    day: number;
    title: string;
    description: string;
    places: string[];
    image?: string;
  }[];
  isTemplate: boolean;
  createdAt: string;
  capacity?: number;
  availableCapacity?: number;
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}

export interface PlannerInput {
  departureCity: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  totalBudget: number;
  transportation: 'flight' | 'car' | 'train' | 'motorbike';
  preferences: string[];
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
  totalBudgetUserVND: number;
  totalEstimatedCostVND: number;
  costDifferenceVND: number;
  budgetStatus: 'within_budget' | 'over_budget';
  budgetAdvice: string;
  days: ItineraryDay[];
  summary: string;
  hotelSuggestion?: Place;
  createdAt: string;
}

export interface TripCheckin {
  placeId: string;
  placeName: string;
  checkedInAt: string;
  latitude?: number;
  longitude?: number;
  verifiedViaGeo: boolean;
  notes?: string;
  photoUrl?: string;
}

export interface TripSession {
  id: string;
  userId: string;
  userName: string;
  title: string;
  destinationCity: string;
  departureCity: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  totalBudgetUserVND: number;
  totalEstimatedCostVND: number;
  actualSpentVND: number;
  pacing: 'relaxed' | 'balanced' | 'packed';
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  preferences: string[];
  days: ItineraryDay[];
  checkins: TripCheckin[];
  progressPercent: number;
  notes?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

