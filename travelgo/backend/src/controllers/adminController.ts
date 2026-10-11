import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { PARTNER_APPLICATION_STATUSES, PartnerApplicationStatus } from '../models/PartnerApplication.js';
import { AdminService } from '../services/adminService.js';
import { PartnerApplicationService } from '../services/partnerApplicationService.js';
import { HttpError } from '../utils/httpError.js';

const pageParams = (query: Record<string, unknown>) => ({ page: Number(query.page || 1), limit: Number(query.limit || 20) });

export class AdminController {
  static async dashboard(_req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      res.json({ success: true, data: await AdminService.getDashboard() });
    } catch (error) {
      next(error);
    }
  }

  static async partnerApplications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as PartnerApplicationStatus | undefined;
      if (status && !PARTNER_APPLICATION_STATUSES.includes(status)) throw new HttpError(400, 'Trạng thái hồ sơ không hợp lệ');
      const { page, limit } = pageParams(req.query);
      res.json({ success: true, data: await PartnerApplicationService.list(status, page, limit) });
    } catch (error) {
      next(error);
    }
  }

  static async pendingPartnerApplications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = pageParams(req.query);
      res.json({ success: true, data: await PartnerApplicationService.list('PENDING', page, limit) });
    } catch (error) {
      next(error);
    }
  }

  static async decidePartnerApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, reason } = req.body;
      if (!['APPROVED', 'REJECTED', 'NEEDS_MORE_INFO'].includes(status)) {
        throw new HttpError(400, 'Quyết định xét duyệt không hợp lệ', 'INVALID_DECISION');
      }
      const result = await PartnerApplicationService.decide(
        String(req.params.id),
        status,
        req.user!.id,
        reason,
        req.ip
      );
      res.json({ success: true, message: 'Đã cập nhật hồ sơ đối tác', data: result });
    } catch (error) {
      next(error);
    }
  }

  static async businesses(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = pageParams(req.query);
      res.json({ success: true, data: await AdminService.getBusinesses(page, limit) });
    } catch (error) {
      next(error);
    }
  }

  static async bookings(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit } = pageParams(req.query);
      res.json({ success: true, data: await AdminService.getBookings(page, limit) });
    } catch (error) {
      next(error);
    }
  }
}
