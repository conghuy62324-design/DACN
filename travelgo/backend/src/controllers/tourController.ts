import { Request, Response, NextFunction } from 'express';
import { TourService } from '../services/tourService.js';
import { TourPlannerService, PlannerInput } from '../services/tourPlannerService.js';

export class TourController {
  /**
   * GET /api/tours
   * Lấy danh sách tour du lịch với bộ lọc và phân loại
   */
  public static async getTours(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { city, category, maxPrice, durationDays, sortBy, search } = req.query;

      const tours = await TourService.getAllTours({
        city: city as string,
        category: category as any,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        days: durationDays ? Number(durationDays) : undefined,
        sortBy: sortBy as any,
        search: search as string,
      });

      res.json({
        success: true,
        count: tours.length,
        data: tours,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tours/:id
   * Lấy chi tiết một tour theo id hoặc slug
   */
  public static async getTourById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const tour = await TourService.getTourByIdOrSlug(id);

      if (!tour) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy tour du lịch yêu cầu',
        });
        return;
      }

      res.json({
        success: true,
        data: tour,
      });
    } catch (error) {
      next(error);
    }
  }


  /**
   * POST /api/tours/plan
   * Thuật toán Heuristic & Bayesian Planner tạo lịch trình tour thông minh cá nhân hóa
   */
  public static async planItinerary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input: PlannerInput = req.body;

      if (!input.destinationCity) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp điểm đến (destinationCity)',
        });
        return;
      }

      const itinerary = await TourPlannerService.generateSmartItinerary({
        departureCity: input.departureCity || 'Hà Nội',
        destinationCity: input.destinationCity,
        startDate: input.startDate || new Date().toISOString().split('T')[0],
        endDate: input.endDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        adults: Number(input.adults) || 1,
        children: Number(input.children) || 0,
        totalBudget: Number(input.totalBudget) || 5000000,
        transportation: input.transportation || 'car',
        preferences: Array.isArray(input.preferences) ? input.preferences : ['am-thuc', 'thien-nhien'],
        pacing: input.pacing || 'balanced',
        mandatoryPlaceIds: input.mandatoryPlaceIds || [],
      });

      res.json({
        success: true,
        message: 'Tạo lịch trình du lịch thông minh thành công',
        data: itinerary,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tours (Admin)
   */
  public static async createTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tour = await TourService.createTour(req.body);
      res.status(201).json({
        success: true,
        data: tour,
        message: 'Tạo tour du lịch thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tours/:id (Admin)
   */
  public static async updateTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const updated = await TourService.updateTour(id, req.body);

      if (!updated) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy tour để cập nhật',
        });
        return;
      }

      res.json({
        success: true,
        data: updated,
        message: 'Cập nhật tour du lịch thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/tours/:id (Admin)
   */
  public static async deleteTour(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const success = await TourService.deleteTour(id);


      if (!success) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy tour để xóa',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Đã xóa tour thành công',
      });
    } catch (error) {
      next(error);
    }
  }
}
