import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { ReviewService } from '../services/reviewService.js';

export class ReviewController {
  static async mine(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReviewService.listMine(req.user!.id);
      res.json({ success: true, count: data.length, data });
    } catch (error) { next(error); }
  }

  static async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReviewService.update(String(req.params.id), req.user!.id, req.body);
      res.json({ success: true, message: 'Đã cập nhật đánh giá', data });
    } catch (error) { next(error); }
  }

  static async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReviewService.remove(String(req.params.id), req.user!.id);
      res.json({ success: true, message: 'Đã xóa đánh giá', data });
    } catch (error) { next(error); }
  }

  static async moderate(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await ReviewService.moderate(String(req.params.id), req.user!.id, req.body);
      res.json({ success: true, message: 'Đã cập nhật moderation đánh giá', data });
    } catch (error) { next(error); }
  }
}
