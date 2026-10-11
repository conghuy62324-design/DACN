import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { PartnerService } from '../services/partnerService.js';

export class PartnerController {
  static async businesses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await PartnerService.getBusinesses(req.user!.id) });
    } catch (error) {
      next(error);
    }
  }

  static async business(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await PartnerService.getBusiness(req.user!.id, String(req.params.id)) });
    } catch (error) {
      next(error);
    }
  }

  static async dashboard(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await PartnerService.getDashboard(req.user!.id, req.query.businessId as string | undefined) });
    } catch (error) {
      next(error);
    }
  }

  static async bookings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PartnerService.getBookings(
        req.user!.id,
        String(req.params.businessId),
        Number(req.query.page || 1),
        Number(req.query.limit || 20)
      );
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}
