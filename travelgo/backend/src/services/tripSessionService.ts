import { TripSession as TripModel } from '../models/TripSession.js';
import { TripRepository } from '../repositories/tripRepository.js';
import { HttpError } from '../utils/httpError.js';
import { sequelize } from '../config/database.js';
import { assertTripId, prepareTripSnapshot, prepareTripUpdate } from '../utils/tripSnapshot.js';
import { GeneratedItinerary, ItineraryDay } from './tourPlannerService.js';
import { reconcileCheckins, resolveCheckinActivity, tripProgress, validateCheckinBody } from '../utils/tripProgress.js';
import { assessPlannerBudget } from '../utils/plannerFeasibility.js';
import { createHash } from 'node:crypto';

export interface TripCheckin {
  activityId?: string;
  resolvedActivityId?: string;
  placeId?: string;
  placeName: string;
  checkedInAt: string;
  latitude?: number;
  longitude?: number;
  verifiedViaGeo?: boolean;
  hasAttachedLocation?: boolean;
  accuracyMeters?: number;
  excludedFromProgress?: string;
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
  progress: { eligibleActivityIds: string[]; checkedActivityIds: string[]; unmatchedCheckinCount: number; ineligibleActivityCount: number };
  notes?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  costBasis?: string;
  nightsCount?: number;
  costAssumptions?: string[];
  transportation?: 'car' | 'motorbike' | 'flight' | 'train';
  adults?: number;
  children?: number;
  costDifferenceVND?: number;
  budgetStatus?: 'within_budget' | 'over_budget';
  overBudgetVND?: number;
  constraintViolations?: string[];
}

const serialize = (model: any): TripSession => {
  const value = model.toJSON ? model.toJSON() : model;
  const progress = tripProgress(value.itinerary, value.checkins);
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
    ...progress,
    checkins: progress.checkins as TripCheckin[],
    notes: value.notes,
    isPublic: value.isPublic,
    createdAt: new Date(value.createdAt).toISOString(),
    updatedAt: new Date(value.updatedAt).toISOString(),
    // Read without upgrading legacy units, changing modes or repricing old JSON.
    ...(value.plannerMetadata && typeof value.plannerMetadata === 'object' ? {
      costBasis: value.plannerMetadata.costBasis,
      nightsCount: value.plannerMetadata.nightsCount,
      costAssumptions: value.plannerMetadata.costAssumptions,
      transportation: value.plannerMetadata.transportation,
      adults: value.plannerMetadata.adults,
      children: value.plannerMetadata.children,
      ...(value.plannerMetadata.costBasis === 'GROUP_VND_V1' ? {
        ...assessPlannerBudget(Number(value.totalBudgetVND), Number(value.estimatedCostVND)),
      } : {}),
    } : {}),
  };
};

export class TripSessionService {
  static async getAllTrips(userId: string) {
    return (await TripRepository.listByUser(userId)).map(serialize);
  }

  static async getTripById(id: string, userId: string) {
    assertTripId(id);
    const trip = await TripRepository.findOwned(id, userId);
    return trip ? serialize(trip) : null;
  }

  static async createTripFromPlanner(itinerary: GeneratedItinerary, userId: string, _userName: string) {
    const snapshot = prepareTripSnapshot(itinerary);
    return serialize(await TripModel.create({
      userId,
      ...snapshot,
      actualSpentVND: 0,
      status: 'upcoming',
      selectedTourIds: [],
      checkins: [],
      progressPercent: 0,
      isPublic: false,
    }));
  }

  static async updateTrip(id: string, userId: string, updates: unknown, expectedVersion?: string) {
    assertTripId(id);
    return sequelize.transaction(async (transaction) => {
      const trip = await TripRepository.findOwned(id, userId, transaction);
      if (!trip) return null;
      if (expectedVersion !== undefined && createHash('sha256').update(JSON.stringify(serialize(trip))).digest('hex') !== expectedVersion) {
        throw new HttpError(409, 'Trip đã thay đổi; hãy xem trước và xác nhận lại.', 'AGENT_TRIP_CHANGED');
      }
      const patch = prepareTripUpdate(updates, trip.toJSON());
      if (patch.itinerary !== undefined) {
        patch.checkins = reconcileCheckins(trip.itinerary, patch.itinerary, trip.checkins);
        patch.progressPercent = tripProgress(patch.itinerary, patch.checkins).progressPercent;
      }
      if (Object.keys(patch).length) await trip.update(patch, { transaction });
      return serialize(trip);
    });
  }

  static async deleteTrip(id: string, userId: string) {
    const trip = await TripRepository.findOwned(id, userId);
    if (!trip) return false;
    await trip.destroy();
    return true;
  }

  static async checkinPlace(tripId: string, userId: string, body: unknown) {
    assertTripId(tripId);
    const input = validateCheckinBody(body);
    return sequelize.transaction(async (transaction) => {
      const trip = await TripRepository.findOwned(tripId, userId, transaction);
      if (!trip) throw new HttpError(404, 'Không tìm thấy chuyến đi');
      const activity = resolveCheckinActivity(trip.itinerary, input);
      const existing = tripProgress(trip.itinerary, trip.checkins).checkins.find((c) => c.resolvedActivityId === activity.id);
      if (existing && ['active', 'completed'].includes(trip.status)) {
        return { success: true, trip: serialize(trip), checkin: existing, message: 'Activity đã được check-in; giữ nguyên bản ghi đầu tiên.' };
      }
      if (trip.status !== 'active') throw new HttpError(409, 'Chỉ check-in mới khi chuyến đi đang diễn ra. Hãy bắt đầu chuyến đi trước.', 'INVALID_TRIP_TRANSITION');
      const value: TripCheckin = { activityId: activity.id, ...(activity.placeId ? { placeId: activity.placeId } : {}),
        placeName: activity.title, checkedInAt: new Date().toISOString(), notes: input.notes,
        ...(input.geo ? { latitude: input.geo.latitude, longitude: input.geo.longitude, accuracyMeters: input.geo.accuracyMeters } : {}), verifiedViaGeo: false };
      const checkins = [...reconcileCheckins(trip.itinerary, trip.itinerary, trip.checkins), value];
      await trip.update({ checkins, progressPercent: tripProgress(trip.itinerary, checkins).progressPercent }, { transaction });
      return { success: true, trip: serialize(trip), checkin: { ...value, hasAttachedLocation: !!input.geo }, message: 'Đã check-in hoạt động.' };
    });
  }

  private static async transition(id: string, userId: string, action: 'start' | 'complete') {
    assertTripId(id);
    return sequelize.transaction(async (transaction) => {
      const trip = await TripRepository.findOwned(id, userId, transaction);
      if (!trip) return null;
      const target = action === 'start' ? 'active' : 'completed';
      if (trip.status === target) return serialize(trip);
      const from = action === 'start' ? 'upcoming' : 'active';
      if (trip.status !== from) throw new HttpError(409, 'Trạng thái chuyến đi không cho phép thao tác này.', 'INVALID_TRIP_TRANSITION');
      const checkins = reconcileCheckins(trip.itinerary, trip.itinerary, trip.checkins);
      await trip.update({ status: target, checkins, progressPercent: tripProgress(trip.itinerary, checkins).progressPercent }, { transaction });
      return serialize(trip);
    });
  }

  static startTrip(id: string, userId: string) { return this.transition(id, userId, 'start'); }
  static completeTrip(id: string, userId: string) { return this.transition(id, userId, 'complete'); }

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
