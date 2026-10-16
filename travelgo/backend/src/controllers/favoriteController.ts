import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { FavoriteService } from '../services/favoriteService.js';
import { serializePlace } from '../services/placeService.js';

function serialize(result: Awaited<ReturnType<typeof FavoriteService.add>>) {
  return {
    changed: result.changed,
    favorite: result.favorite ? {
      id: result.favorite.id,
      createdAt: result.favorite.createdAt,
      updatedAt: result.favorite.updatedAt,
      place: serializePlace(result.favorite.place),
    } : null,
    telemetry: result.telemetry,
  };
}

export class FavoriteController {
  static async list(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const items = await FavoriteService.list(req.user!.id);
      res.json({ success: true, data: { items, total: items.length } });
    } catch (error) { next(error); }
  }

  static async add(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await FavoriteService.add(req.user!.id, String(req.params.placeId), req.body);
      res.status(result.changed ? 201 : 200).json({ success: true, data: serialize(result) });
    } catch (error) { next(error); }
  }

  static async remove(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await FavoriteService.remove(req.user!.id, String(req.params.placeId), req.body);
      res.json({ success: true, data: serialize(result as Awaited<ReturnType<typeof FavoriteService.add>>) });
    } catch (error) { next(error); }
  }
}
