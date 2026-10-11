import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { AI_EVENT_TYPES, AI_ITEM_TYPES, UserEvent } from '../models/UserEvent.js';
import { HttpError } from '../utils/httpError.js';

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedItemTypes = new Set<string>(AI_ITEM_TYPES);
const allowedEventTypes = new Set<string>(AI_EVENT_TYPES);

export class IntelligenceController {
  static async collectEvent(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const sessionId = String(req.body?.sessionId || '').trim();
      const itemId = String(req.body?.itemId || '').trim();
      const itemType = String(req.body?.itemType || '').trim();
      const eventType = String(req.body?.eventType || '').trim();
      const source = String(req.body?.source || 'organic').trim().slice(0, 50);
      const requestId = req.body?.requestId ? String(req.body.requestId) : undefined;
      const context = req.body?.context ?? {};

      if (sessionId.length < 8 || sessionId.length > 120) throw new HttpError(400, 'sessionId phải có từ 8 đến 120 ký tự', 'INVALID_SESSION_ID');
      if (!itemId || itemId.length > 120) throw new HttpError(400, 'itemId không hợp lệ', 'INVALID_ITEM_ID');
      if (!allowedItemTypes.has(itemType)) throw new HttpError(400, 'itemType không hợp lệ', 'INVALID_ITEM_TYPE');
      if (!allowedEventTypes.has(eventType)) throw new HttpError(400, 'eventType không hợp lệ', 'INVALID_EVENT_TYPE');
      if (requestId && !uuidPattern.test(requestId)) throw new HttpError(400, 'requestId không hợp lệ', 'INVALID_REQUEST_ID');
      if (!context || typeof context !== 'object' || Array.isArray(context)) throw new HttpError(400, 'context phải là JSON object', 'INVALID_CONTEXT');
      if (JSON.stringify(context).length > 8_000) throw new HttpError(413, 'context vượt quá giới hạn 8 KB', 'CONTEXT_TOO_LARGE');

      const occurredAt = req.body?.occurredAt ? new Date(req.body.occurredAt) : new Date();
      if (Number.isNaN(occurredAt.getTime())) throw new HttpError(400, 'occurredAt không hợp lệ', 'INVALID_EVENT_TIME');
      if (occurredAt.getTime() > Date.now() + 5 * 60_000) throw new HttpError(400, 'occurredAt không được ở tương lai', 'INVALID_EVENT_TIME');

      const event = await UserEvent.create({
        userId: req.user?.id,
        sessionId,
        requestId,
        itemId,
        itemType: itemType as any,
        eventType: eventType as any,
        source,
        context,
        occurredAt,
      });

      res.status(202).json({ success: true, data: { id: event.id, acceptedAt: event.createdAt } });
    } catch (error) {
      next(error);
    }
  }
}
