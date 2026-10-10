import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/statsService.js';

export class StatsController {
  public static async getDashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await StatsService.getDashboardStats();
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
