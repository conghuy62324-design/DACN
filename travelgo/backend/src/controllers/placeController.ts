import { Request, Response, NextFunction } from 'express';
import { PlaceService } from '../services/placeService.js';

export class PlaceController {
  public static async getPlaces(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category, city, search, minRating, sortBy } = req.query;
      const places = await PlaceService.getAllPlaces({
        category: category as string,
        city: city as string,
        search: search as string,
        minRating: minRating ? parseFloat(minRating as string) : undefined,
        sortBy: sortBy as any,
      });

      res.json({
        success: true,
        count: places.length,
        data: places,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPlaceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const place = await PlaceService.getPlaceByIdOrSlug(id);

      if (!place) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin địa điểm hoặc tour du lịch',
        });
        return;
      }

      res.json({
        success: true,
        data: place,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPlaceReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const reviews = await PlaceService.getReviewsByTarget(id);

      res.json({
        success: true,
        count: reviews.length,
        data: reviews,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async addReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const { userName, rating, criteria, comment, userAvatar } = req.body;

      if (!userName || !rating || !comment) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp họ tên, số sao đánh giá và nội dung nhận xét',
        });
        return;
      }

      const review = await PlaceService.addReview(id, {
        userName,
        rating: Number(rating),
        criteria,
        comment,
        userAvatar,
      });

      res.status(201).json({
        success: true,
        message: 'Gửi đánh giá thành công! Điểm Bayesian của địa điểm đã được cập nhật.',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async createPlace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const place = await PlaceService.createPlace(req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo địa điểm mới thành công',
        data: place,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async deletePlace(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const success = await PlaceService.deletePlace(id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Địa điểm không tồn tại' });
        return;
      }
      res.json({ success: true, message: 'Đã xóa địa điểm thành công' });
    } catch (error) {
      next(error);
    }
  }
}
