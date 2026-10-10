import { GeneratedItinerary, ItineraryDay, ItineraryActivity } from './tourPlannerService.js';
import { BlogService } from './blogService.js';

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

// In-memory store fallback với dữ liệu mẫu sẵn sàng để kiểm thử
const MOCK_TRIPS: TripSession[] = [
  {
    id: 'trip-danang-demo-01',
    userId: 'user_demo_01',
    userName: 'HuGo Traveler',
    title: 'Hành trình khám phá Đà Nẵng – Hội An 3N2Đ cùng gia đình',
    destinationCity: 'Đà Nẵng',
    departureCity: 'Hà Nội',
    startDate: '2026-10-15',
    endDate: '2026-10-17',
    daysCount: 3,
    totalBudgetUserVND: 6000000,
    totalEstimatedCostVND: 5400000,
    actualSpentVND: 2150000,
    pacing: 'balanced',
    status: 'active',
    preferences: ['am-thuc', 'thien-nhien', 'van-hoa'],
    progressPercent: 33,
    isPublic: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    checkins: [
      {
        placeId: 'p2',
        placeName: 'Bán đảo Sơn Trà & Chùa Linh Ứng',
        checkedInAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        latitude: 16.1022,
        longitude: 108.2755,
        verifiedViaGeo: true,
        notes: 'Không khí trong lành, tượng Phật Bà uy nghi hướng ra biển!',
      },
    ],
    days: [
      {
        dayNumber: 1,
        date: '2026-10-15',
        themeTitle: 'Ngày 1: Biển Mỹ Khê & Bán đảo Sơn Trà',
        dayEstimatedCostVND: 1500000,
        centroid: { latitude: 16.08, longitude: 108.26 },
        activities: [
          {
            id: 'act-1-1',
            placeId: 'p2',
            timeSlot: 'morning',
            title: 'Khám phá Bán đảo Sơn Trà',
            description: 'Viếng Chùa Linh Ứng Bãi Bụt, chiêm bái Tượng Phật Bà Quan Âm cao 67m.',
            category: 'sightseeing',
            durationMinutes: 120,
            estimatedCostVND: 50000,
            latitude: 16.1022,
            longitude: 108.2755,
            imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
            recommendationReason: 'Điểm đến thiên nhiên ngắm toàn cảnh vịnh Đà Nẵng tuyệt đẹp.',
          },
          {
            id: 'act-1-2',
            placeId: 'rest-danang-1',
            timeSlot: 'lunch',
            title: 'Ăn trưa: Bánh tráng thịt heo Đại Lộc',
            description: 'Thưởng thức đặc sản Đà Nẵng bánh tráng cuốn thịt heo hai đầu da chấm mắm nêm.',
            category: 'food',
            durationMinutes: 60,
            estimatedCostVND: 120000,
            latitude: 16.065,
            longitude: 108.22,
            imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&w=600&q=80',
          },
          {
            id: 'act-1-3',
            placeId: 'p1',
            timeSlot: 'afternoon',
            title: 'Tắm biển Mỹ Khê',
            description: 'Thư giãn dạo bờ biển cát trắng mịn được Forbes bình chọn top bãi biển hấp dẫn.',
            category: 'leisure',
            durationMinutes: 120,
            estimatedCostVND: 30000,
            latitude: 16.0601,
            longitude: 108.2458,
            imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
          },
          {
            id: 'act-1-4',
            placeId: 'p4',
            timeSlot: 'evening',
            title: 'Ngắm Cầu Rồng phun lửa & dạo sông Hàn',
            description: 'Xem biểu diễn Cầu Rồng phun lửa và nước vào cuối tuần lúc 21:00.',
            category: 'sightseeing',
            durationMinutes: 90,
            estimatedCostVND: 80000,
            latitude: 16.061,
            longitude: 108.2272,
            imageUrl: 'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=600&q=80',
          },
        ],
      },
      {
        dayNumber: 2,
        date: '2026-10-16',
        themeTitle: 'Ngày 2: Kỳ quan Bà Nà Hills & Cầu Vàng',
        dayEstimatedCostVND: 2200000,
        centroid: { latitude: 15.99, longitude: 107.99 },
        activities: [
          {
            id: 'act-2-1',
            placeId: 'p3',
            timeSlot: 'morning',
            title: 'Chinh phục Bà Nà Hills & Cầu Vàng',
            description: 'Đi tuyến cáp treo đạt kỷ lục thế giới, check-in Cầu Vàng trên bàn tay khổng lồ.',
            category: 'sightseeing',
            durationMinutes: 240,
            estimatedCostVND: 950000,
            latitude: 15.9989,
            longitude: 107.9961,
            imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
          },
        ],
      },
      {
        dayNumber: 3,
        date: '2026-10-17',
        themeTitle: 'Ngày 3: Phố cổ Hội An & Ẩm thực truyền thống',
        dayEstimatedCostVND: 1700000,
        centroid: { latitude: 15.88, longitude: 108.33 },
        activities: [
          {
            id: 'act-3-1',
            placeId: 'p8',
            timeSlot: 'morning',
            title: 'Dạo phố cổ Hội An & Chùa Cầu',
            description: 'Tham quan các hội quán Phúc Kiến, Quảng Đông và Chùa Cầu trăm năm rêu phong.',
            category: 'sightseeing',
            durationMinutes: 180,
            estimatedCostVND: 150000,
            latitude: 15.8801,
            longitude: 108.338,
            imageUrl: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
          },
        ],
      },
    ],
  },
];

export class TripSessionService {
  /**
   * Lấy tất cả chuyến đi của người dùng
   */
  static getAllTrips(userId?: string): TripSession[] {
    if (!userId) {
      return [...MOCK_TRIPS];
    }
    return MOCK_TRIPS.filter((t) => t.userId === userId || t.isPublic);
  }

  /**
   * Lấy chi tiết chuyến đi theo ID
   */
  static getTripById(id: string): TripSession | null {
    const trip = MOCK_TRIPS.find((t) => t.id === id);
    return trip || null;
  }

  /**
   * Lưu một lịch trình mới từ kết quả Planner hoặc Tour vào danh sách chuyến đi
   */
  static createTripFromPlanner(
    itinerary: GeneratedItinerary,
    userId = 'user_guest',
    userName = 'Khách du lịch HuGo'
  ): TripSession {
    const newTrip: TripSession = {
      id: `trip_${Date.now()}`,
      userId,
      userName,
      title: itinerary.title,
      destinationCity: itinerary.destinationCity,
      departureCity: itinerary.departureCity,
      startDate: itinerary.startDate,
      endDate: itinerary.endDate,
      daysCount: itinerary.daysCount,
      totalBudgetUserVND: itinerary.totalBudgetUserVND,
      totalEstimatedCostVND: itinerary.totalEstimatedCostVND,
      actualSpentVND: 0,
      pacing: itinerary.pacing,
      status: 'upcoming',
      preferences: [],
      days: itinerary.days,
      checkins: [],
      progressPercent: 0,
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MOCK_TRIPS.unshift(newTrip);
    return newTrip;
  }

  /**
   * Cập nhật thông tin chuyến đi
   */
  static updateTrip(id: string, updates: Partial<TripSession>): TripSession | null {
    const index = MOCK_TRIPS.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const current = MOCK_TRIPS[index];
    const updated: TripSession = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    MOCK_TRIPS[index] = updated;
    return updated;
  }

  /**
   * Xóa chuyến đi
   */
  static deleteTrip(id: string): boolean {
    const index = MOCK_TRIPS.findIndex((t) => t.id === id);
    if (index === -1) return false;
    MOCK_TRIPS.splice(index, 1);
    return true;
  }

  /**
   * Check-in địa điểm đã ghé thăm trong chuyến đi
   */
  static checkinPlace(
    tripId: string,
    placeId: string,
    placeName: string,
    geo?: { latitude: number; longitude: number; accuracyMeters?: number },
    notes?: string
  ): { success: boolean; trip?: TripSession; checkin?: TripCheckin; message: string } {
    const trip = this.getTripById(tripId);
    if (!trip) {
      return { success: false, message: 'Không tìm thấy chuyến đi' };
    }

    // Kiểm tra xem đã checkin điểm này chưa
    const existingIndex = trip.checkins.findIndex((c) => c.placeId === placeId);
    const newCheckin: TripCheckin = {
      placeId,
      placeName,
      checkedInAt: new Date().toISOString(),
      latitude: geo?.latitude,
      longitude: geo?.longitude,
      verifiedViaGeo: !!geo && geo.latitude !== undefined,
      notes,
    };

    if (existingIndex >= 0) {
      trip.checkins[existingIndex] = newCheckin;
    } else {
      trip.checkins.push(newCheckin);
    }

    // Tự động chuyển status sang active nếu đang upcoming
    if (trip.status === 'upcoming') {
      trip.status = 'active';
    }

    // Tính lại progressPercent dựa trên tổng số hoạt động
    let totalActivities = 0;
    trip.days.forEach((day) => {
      totalActivities += day.activities.length;
    });

    if (totalActivities > 0) {
      trip.progressPercent = Math.min(100, Math.round((trip.checkins.length / totalActivities) * 100));
    }

    trip.updatedAt = new Date().toISOString();
    return {
      success: true,
      trip,
      checkin: newCheckin,
      message: `Check-in thành công tại ${placeName}!`,
    };
  }

  /**
   * Hoàn thành chuyến đi
   */
  static completeTrip(tripId: string): TripSession | null {
    const trip = this.getTripById(tripId);
    if (!trip) return null;
    trip.status = 'completed';
    trip.progressPercent = 100;
    trip.updatedAt = new Date().toISOString();
    return trip;
  }

  /**
   * Chuyển hành trình đã hoàn thành thành bản nháp Blog chia sẻ kinh nghiệm
   */
  static convertToBlogDraft(tripId: string): {
    success: boolean;
    blogDraft?: {
      title: string;
      destination: string;
      summary: string;
      content: string;
      visitedPlaces: string[];
      totalCostVND: number;
      durationText: string;
      suggestedTags: string[];
      sourceTripId: string;
    };
    message: string;
  } {
    const trip = this.getTripById(tripId);
    if (!trip) {
      return { success: false, message: 'Chuyến đi không tồn tại' };
    }

    const visitedNames = trip.checkins.map((c) => c.placeName);
    const allPlaces = trip.days.flatMap((d) => d.activities.map((a) => a.title));
    const durationText = `${trip.daysCount} ngày ${Math.max(1, trip.daysCount - 1)} đêm`;

    // Tạo nội dung bài viết dạng Markdown có cấu trúc chi tiết
    let markdownContent = `## Ký sự trải nghiệm hành trình thực tế tại ${trip.destinationCity}\n\n`;
    markdownContent += `*Thời lượng chuyến đi: ${durationText} | Khởi hành từ: ${trip.departureCity}*\n\n`;
    markdownContent += `### Tổng quan chi phí & Trải nghiệm\n`;
    markdownContent += `- **Tổng chi phí thực tế:** ${((trip.actualSpentVND || trip.totalEstimatedCostVND) / 1000000).toFixed(1)} triệu VNĐ\n`;
    markdownContent += `- **Số điểm đã check-in:** ${trip.checkins.length} / ${allPlaces.length} điểm tham quan\n\n`;

    trip.days.forEach((day) => {
      markdownContent += `### ${day.themeTitle}\n`;
      day.activities.forEach((act) => {
        const checked = trip.checkins.some((c) => c.placeId === act.placeId || c.placeName === act.title);
        const icon = checked ? '✅' : '📍';
        markdownContent += `- ${icon} **${act.timeSlot.toUpperCase()}:** ${act.title} - ${act.description}\n`;
      });
      markdownContent += `\n`;
    });

    if (trip.checkins.some((c) => c.notes)) {
      markdownContent += `### Ghi chú & Bí kíp bỏ túi\n`;
      trip.checkins
        .filter((c) => c.notes)
        .forEach((c) => {
          markdownContent += `- **${c.placeName}:** ${c.notes}\n`;
        });
      markdownContent += `\n`;
    }

    markdownContent += `> Lịch trình được khởi tạo và tối ưu hóa bởi công cụ **HuGo Travel Planner**. Bạn có thể sao chép lịch trình này để tùy biến cho chuyến đi của riêng mình!\n`;

    return {
      success: true,
      blogDraft: {
        title: `Ký sự hành trình ${trip.destinationCity} ${durationText}: Trải nghiệm thực tế và lịch trình chi tiết`,
        destination: trip.destinationCity,
        summary: `Chia sẻ kinh nghiệm thực tế chuyến đi ${trip.destinationCity} ${durationText} với chi phí khoảng ${(
          (trip.actualSpentVND || trip.totalEstimatedCostVND) / 1000000
        ).toFixed(1)} triệu đồng cùng danh sách các điểm check-in hấp dẫn nhất.`,
        content: markdownContent,
        visitedPlaces: visitedNames.length > 0 ? visitedNames : allPlaces.slice(0, 5),
        totalCostVND: trip.actualSpentVND || trip.totalEstimatedCostVND,
        durationText,
        suggestedTags: [trip.destinationCity, 'Lịch trình chi tiết', 'Kinh nghiệm du lịch', 'HuGo Travel'],
        sourceTripId: trip.id,
      },
      message: 'Chuyển đổi hành trình thành bản nháp Blog thành công!',
    };
  }
}
