import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { TelemetryService } from '../services/telemetryService.js';
import { RecommendationExposureService } from '../services/recommendationExposureService.js';

export class IntelligenceController {
  static async recommend(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      res.status(201).json({ success: true, data: await RecommendationExposureService.createRequest(req.user!.id, req.body) });
    } catch (error) { next(error); }
  }

  static async acknowledgeVisible(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await RecommendationExposureService.acknowledgeVisible(req.user!.id, req.body);
      res.status(202).json({ success: true, data: {
        id: result.impression?.id, recorded: result.recorded, duplicate: result.duplicate,
        reason: result.reason, acknowledgedAt: result.impression?.acknowledgedAt,
      } });
    } catch (error) { next(error); }
  }

  static async collectEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await TelemetryService.collectClientEvent(req.user!.id, req.body);
      res.status(202).json({
        success: true,
        data: {
          id: result.event?.id,
          recorded: result.recorded,
          duplicate: result.duplicate,
          reason: result.reason,
          acceptedAt: result.event?.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getConsent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await TelemetryService.getConsent(req.user!.id) }); } catch (error) { next(error); }
  }

  static async updateConsent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await TelemetryService.updateConsent(req.user!.id, req.body || {}) }); } catch (error) { next(error); }
  }
}
