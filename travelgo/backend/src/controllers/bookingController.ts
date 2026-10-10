import { Request, Response, NextFunction } from 'express';
import { BookingService } from '../services/bookingService.js';

export class BookingController {
  public static async createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const {
        serviceType,
        serviceId,
        serviceName,
        customerName,
        customerEmail,
        customerPhone,
        bookingDate,
        returnDate,
        adultsCount,
        childrenCount,
        unitPrice,
        totalAmount,
        notes,
      } = req.body;

      if (!serviceType || !serviceId || !customerName || !customerEmail || !customerPhone || !bookingDate) {
        res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp đầy đủ thông tin khách hàng và dịch vụ đặt',
        });
        return;
      }

      const booking = await BookingService.createBooking({
        serviceType,
        serviceId,
        serviceName,
        customerName,
        customerEmail,
        customerPhone,
        bookingDate,
        returnDate,
        adultsCount: Number(adultsCount || 1),
        childrenCount: Number(childrenCount || 0),
        unitPrice: Number(unitPrice || 0),
        totalAmount: Number(totalAmount || 0),
        notes,
      });

      res.status(201).json({
        success: true,
        message: 'Đặt dịch vụ thành công!',
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.query;
      const bookings = await BookingService.getAllBookings(email as string);

      res.json({
        success: true,
        count: bookings.length,
        data: bookings,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getBookingByCode(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code;
      const booking = await BookingService.getBookingByIdOrCode(code as string);

      if (!booking) {
        res.status(404).json({
          success: false,
          message: 'Không tìm thấy thông tin đơn đặt phòng / vé',
        });
        return;
      }

      res.json({
        success: true,
        data: booking,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status } = req.body;

      const updated = await BookingService.updateBookingStatus(id as string, status);
      if (!updated) {
        res.status(404).json({ success: false, message: 'Đơn đặt không tồn tại' });
        return;
      }

      res.json({
        success: true,
        message: 'Cập nhật trạng thái đơn đặt thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
