import { Request, Response, NextFunction } from 'express';
import { TripSessionService } from '../services/tripSessionService.js';

export class TripController {
  /**
   * GET /api/trips
   */
  public static async getTrips(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.query.userId as string | undefined;
      const trips = TripSessionService.getAllTrips(userId);

      res.json({
        success: true,
        count: trips.length,
        data: trips,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/trips/:id
   */
  public static async getTripById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const trip = TripSessionService.getTripById(id);

      if (!trip) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi yêu cầu',
        });
        return;
      }

      res.json({
        success: true,
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trips
   * Lưu một hành trình mới (từ TourPlanner hoặc tạo tay)
   */
  public static async createTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { itinerary, userId, userName } = req.body;

      if (!itinerary || !itinerary.days) {
        res.status(400).json({
          success: false,
          message: 'Dữ liệu lịch trình không hợp lệ (cần trường itinerary)',
        });
        return;
      }

      const trip = TripSessionService.createTripFromPlanner(
        itinerary,
        userId || 'user_demo_01',
        userName || 'HuGo Traveler'
      );

      res.status(201).json({
        success: true,
        message: 'Lưu hành trình vào Chuyến đi của tôi thành công!',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/trips/:id
   */
  public static async updateTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const updated = TripSessionService.updateTrip(id, req.body);

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi để cập nhật',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Cập nhật chuyến đi thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/trips/:id
   */
  public static async deleteTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const success = TripSessionService.deleteTrip(id);

      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi để xóa',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Đã xóa chuyến đi thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trips/:id/checkin
   * Check-in địa điểm đã ghé thăm với tọa độ tùy chọn
   */
  public static async checkinPlace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { placeId, placeName, geo, notes } = req.body;

      if (!placeId || !placeName) {
        res.status(400).json({
          success: false,
          message: 'Cần placeId và placeName để check-in',
        });
        return;
      }

      const result = TripSessionService.checkinPlace(id, placeId, placeName, geo, notes);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trips/:id/complete
   * Đánh dấu hoàn thành chuyến đi
   */
  public static async completeTrip(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const trip = TripSessionService.completeTrip(id);

      if (!trip) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy chuyến đi',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Chúc mừng bạn đã hoàn thành chuyến đi!',
        data: trip,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/trips/:id/convert-to-blog
   * Chuyển hành trình thành bản nháp Blog chia sẻ kinh nghiệm cộng đồng
   */
  public static async convertToBlog(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const result = TripSessionService.convertToBlogDraft(id);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
