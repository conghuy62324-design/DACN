import { Request, Response, NextFunction } from 'express';

export function validateBookingRequest(req: Request, res: Response, next: NextFunction): void {
  const { serviceType, serviceId, customerName, customerEmail, customerPhone, bookingDate } = req.body;

  const errors: string[] = [];

  if (!serviceType) errors.push('Thiếu loại dịch vụ đặt (serviceType)');
  if (!serviceId) errors.push('Thiếu mã dịch vụ (serviceId)');
  if (!customerName || customerName.trim().length < 2) errors.push('Họ tên khách hàng không hợp lệ');
  if (!customerEmail || !customerEmail.includes('@')) errors.push('Email liên hệ không hợp lệ');
  if (!customerPhone || customerPhone.length < 9) errors.push('Số điện thoại không hợp lệ');
  if (!bookingDate) errors.push('Ngày sử dụng dịch vụ không được để trống');

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Dữ liệu đặt dịch vụ không hợp lệ',
      errors,
    });
    return;
  }

  next();
}

export function validateBlogRequest(req: Request, res: Response, next: NextFunction): void {
  const { title, content, destinationName } = req.body;
  const errors: string[] = [];

  if (!title || title.trim().length < 5) errors.push('Tiêu đề bài viết cần ít nhất 5 ký tự');
  if (!content || content.trim().length < 20) errors.push('Nội dung chia sẻ cần ít nhất 20 ký tự');
  if (!destinationName) errors.push('Vui lòng chọn địa điểm du lịch liên quan');

  if (errors.length > 0) {
    res.status(400).json({
      success: false,
      message: 'Dữ liệu bài viết không hợp lệ',
      errors,
    });
    return;
  }

  next();
}
