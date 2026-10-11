import { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/ticketService.js';

export class TicketController {
  public static async getTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { type, fromCity, toCity, maxPrice, search, page, limit } = req.query;
      const result = await TicketService.listPublic({
        type: type as string,
        fromCity: fromCity as string,
        toCity: toCity as string,
        maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
        search: search as string,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.json({
        success: true,
        count: result.items.length,
        data: result.items,
        pagination: { total: result.total, page: result.page, limit: result.limit },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getTicketById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = (Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) as string;
      const ticket = await TicketService.getTicketById(id);

      if (!ticket) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin vé du lịch',
        });
        return;
      }

      res.json({
        success: true,
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }
}
