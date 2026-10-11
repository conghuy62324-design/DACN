import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { PartnerApplicationService } from '../services/partnerApplicationService.js';

export class PartnerApplicationController {
  static async submit(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const application = await PartnerApplicationService.submit(req.user!.id, req.body);
      res.status(201).json({ success: true, message: 'Hồ sơ đã được gửi và đang chờ xét duyệt', data: application });
    } catch (error) {
      next(error);
    }
  }

  static async getMine(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const applications = await PartnerApplicationService.getMine(req.user!.id);
      res.json({ success: true, data: applications });
    } catch (error) {
      next(error);
    }
  }
}
