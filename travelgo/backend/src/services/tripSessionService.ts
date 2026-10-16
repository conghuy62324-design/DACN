import { TripSession as TripModel } from '../models/TripSession.js';
import { TripRepository } from '../repositories/tripRepository.js';
import { HttpError } from '../utils/httpError.js';
import { validateTravelPreferences } from '../utils/travelPreferences.js';
import { GeneratedItinerary, ItineraryDay } from './tourPlannerService.js';

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
  selectedPlaceIds: string[];
  checkins: TripCheckin[];
  progressPercent: number;
  notes?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TripUpdateInput {
  name?: string;
  notes?: string;
  actualSpentVND?: number;
  isPublic?: boolean;
  itinerary?: ItineraryDay[];
  preferences?: unknown;
}

const serialize = (model: any): TripSession => {
  const value = model.toJSON ? model.toJSON() : model;
  return {
    id: value.id,
    userId: value.userId,
    userName: 'HuGo Traveler',
    title: value.name,
    destinationCity: value.destinationCity,
    departureCity: value.departureCity,
    startDate: value.startDate,
    endDate: value.endDate,
    daysCount: value.daysCount,
    totalBudgetUserVND: Number(value.totalBudgetVND),
    totalEstimatedCostVND: Number(value.estimatedCostVND),
    actualSpentVND: Number(value.actualSpentVND),
    pacing: value.pacing,
    status: value.status,
    preferences: Array.isArray(value.preferences) ? value.preferences : [],
    days: Array.isArray(value.itinerary) ? value.itinerary : [],
    selectedPlaceIds: Array.isArray(value.selectedPlaceIds) ? value.selectedPlaceIds : [],
    checkins: Array.isArray(value.checkins) ? value.checkins : [],
    progressPercent: value.progressPercent,
    notes: value.notes,
    isPublic: value.isPublic,
    createdAt: new Date(value.createdAt).toISOString(),
    updatedAt: new Date(value.updatedAt).toISOString(),
  };
};

export class TripSessionService {
  static async getAllTrips(userId: string) {
    return (await TripRepository.listByUser(userId)).map(serialize);
  }

  static async getTripById(id: string, userId: string) {
    const trip = await TripRepository.findOwned(id, userId);
    return trip ? serialize(trip) : null;
  }

  static async createTripFromPlanner(itinerary: GeneratedItinerary, userId: string, _userName: string) {
    const preferences = validateTravelPreferences(
      (itinerary as GeneratedItinerary & { preferences?: unknown }).preferences
    );
    return serialize(await TripModel.create({
      userId,
      name: itinerary.title,
      destinationCity: itinerary.destinationCity,
      departureCity: itinerary.departureCity,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      daysCount: itinerary.daysCount,
      totalBudgetVND: itinerary.totalBudgetUserVND,
      estimatedCostVND: itinerary.totalEstimatedCostVND,
      actualSpentVND: 0,
      pacing: itinerary.pacing,
      status: 'upcoming',
      preferences,
      itinerary: itinerary.days,
      selectedPlaceIds: [...new Set(itinerary.days.flatMap((day) =>
        day.activities.map((activity) => activity.placeId).filter(Boolean)
      ) as string[])],
      selectedTourIds: [],
      checkins: [],
      progressPercent: 0,
      isPublic: false,
    }));
  }

  static async updateTrip(id: string, userId: string, updates: TripUpdateInput) {
    const trip = await TripRepository.findOwned(id, userId);
    if (!trip) return null;

    const { preferences, ...otherUpdates } = updates;
    const safeUpdates: Omit<TripUpdateInput, 'preferences'> & { preferences?: string[] } = otherUpdates;
    if (preferences !== undefined) {
      safeUpdates.preferences = validateTravelPreferences(preferences);
    }
    await trip.update(safeUpdates);
    return serialize(trip);
  }

  static async deleteTrip(id: string, userId: string) {
    const trip = await TripRepository.findOwned(id, userId);
    if (!trip) return false;
    await trip.destroy();
    return true;
  }

  static async checkinPlace(
    tripId: string,
    userId: string,
    placeId: string,
    placeName: string,
    geo?: { latitude: number; longitude: number; accuracyMeters?: number },
    notes?: string
  ) {
    const trip = await TripRepository.findOwned(tripId, userId);
    if (!trip) throw new HttpError(404, 'Không tìm thấy chuyến đi');
    const checkins = [...(trip.checkins as TripCheckin[])];
    const value: TripCheckin = {
      placeId,
      placeName,
      checkedInAt: new Date().toISOString(),
      latitude: geo?.latitude,
      longitude: geo?.longitude,
      verifiedViaGeo: !!geo,
      notes,
    };
    const index = checkins.findIndex((item) => item.placeId === placeId);
    if (index >= 0) checkins[index] = value;
    else checkins.push(value);
    const activities = (trip.itinerary as any[]).flatMap((day) => day.activities || []).length;
    await trip.update({
      checkins,
      status: trip.status === 'upcoming' ? 'active' : trip.status,
      progressPercent: activities ? Math.min(100, Math.round(checkins.length / activities * 100)) : 0,
    });
    return { success: true, trip: serialize(trip), checkin: value, message: `Check-in thành công tại ${placeName}!` };
  }

  static async completeTrip(id: string, userId: string) {
    const trip = await TripRepository.findOwned(id, userId);
    if (!trip) return null;
    await trip.update({ status: 'completed', progressPercent: 100 });
    return serialize(trip);
  }

  static async convertToBlogDraft(id: string, userId: string) {
    const trip = await this.getTripById(id, userId);
    if (!trip) throw new HttpError(404, 'Chuyến đi không tồn tại');
    const visited = trip.checkins.map((item) => item.placeName);
    const all = trip.days.flatMap((day) => day.activities.map((activity) => activity.title));
    const duration = `${trip.daysCount} ngày ${Math.max(1, trip.daysCount - 1)} đêm`;
    let content = `## Ký sự trải nghiệm tại ${trip.destinationCity}\n\n*${duration} | Khởi hành từ ${trip.departureCity}*\n\n`;
    trip.days.forEach((day) => {
      content += `### ${day.themeTitle}\n`;
      day.activities.forEach((activity) => {
        content += `- **${activity.timeSlot.toUpperCase()}:** ${activity.title} - ${activity.description}\n`;
      });
      content += '\n';
    });
    return {
      success: true,
      blogDraft: {
        title: `Ký sự ${trip.destinationCity} ${duration}`,
        destination: trip.destinationCity,
        summary: `Chia sẻ hành trình ${trip.destinationCity} ${duration}.`,
        content,
        visitedPlaces: visited.length ? visited : all.slice(0, 5),
        totalCostVND: trip.actualSpentVND || trip.totalEstimatedCostVND,
        durationText: duration,
        suggestedTags: [trip.destinationCity, 'Kinh nghiệm du lịch', 'HuGo Travel'],
        sourceTripId: trip.id,
      },
      message: 'Chuyển đổi hành trình thành bản nháp Blog thành công!',
    };
  }
}
