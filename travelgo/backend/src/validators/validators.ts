import { Request, Response, NextFunction } from 'express';

function validationError(res: Response, errors: string[]): void {
  res.status(400).json({ success: false, message: 'Dữ liệu gửi lên không hợp lệ', errors });
}

export function validateLogin(req: Request, res: Response, next: NextFunction): void {
  const { email, password } = req.body;
  const errors: string[] = [];
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email không hợp lệ');
  if (typeof password !== 'string' || password.length < 8) errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  if (errors.length) return validationError(res, errors);
  next();
}

export function validateRegistration(req: Request, res: Response, next: NextFunction): void {
  const { fullName, email, password, phone } = req.body;
  const errors: string[] = [];
  if (typeof fullName !== 'string' || fullName.trim().length < 2) errors.push('Họ tên phải có ít nhất 2 ký tự');
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email không hợp lệ');
  if (typeof password !== 'string' || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    errors.push('Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số');
  }
  if (phone && (typeof phone !== 'string' || !/^[0-9+ ()-]{9,20}$/.test(phone))) errors.push('Số điện thoại không hợp lệ');
  if (errors.length) return validationError(res, errors);
  next();
}

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

export function validatePartnerApplication(req: Request, res: Response, next: NextFunction): void {
  const { representativeName, businessName, businessType, email, phone, address, city, latitude, longitude } = req.body;
  const errors: string[] = [];
  if (typeof representativeName !== 'string' || representativeName.trim().length < 2) errors.push('Tên người đại diện không hợp lệ');
  if (typeof businessName !== 'string' || businessName.trim().length < 2) errors.push('Tên cơ sở không hợp lệ');
  if (!['HOTEL', 'HOMESTAY', 'RESORT', 'RESTAURANT', 'TOUR_OPERATOR'].includes(businessType)) errors.push('Loại hình kinh doanh không hợp lệ');
  if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email không hợp lệ');
  if (typeof phone !== 'string' || !/^[0-9+ ()-]{9,20}$/.test(phone)) errors.push('Số điện thoại không hợp lệ');
  if (typeof address !== 'string' || address.trim().length < 5) errors.push('Địa chỉ không hợp lệ');
  if (typeof city !== 'string' || city.trim().length < 2) errors.push('Tỉnh/thành phố không hợp lệ');
  if (latitude !== undefined && (Number(latitude) < -90 || Number(latitude) > 90)) errors.push('Vĩ độ không hợp lệ');
  if (longitude !== undefined && (Number(longitude) < -180 || Number(longitude) > 180)) errors.push('Kinh độ không hợp lệ');
  if (errors.length) return validationError(res, errors);
  next();
}

export function validateSecureBookingRequest(req: Request, res: Response, next: NextFunction): void {
  const { serviceType, serviceId, customerPhone, bookingDate, adultsCount, childrenCount, quantity } = req.body;
  const errors: string[] = [];
  if (!['tour', 'hotel', 'restaurant', 'ticket'].includes(serviceType)) errors.push('Loại dịch vụ không hợp lệ');
  if (typeof serviceId !== 'string' || !serviceId.trim()) errors.push('Thiếu mã dịch vụ');
  if (typeof customerPhone !== 'string' || !/^[0-9+ ()-]{9,20}$/.test(customerPhone)) errors.push('Số điện thoại không hợp lệ');
  if (typeof bookingDate !== 'string' || Number.isNaN(Date.parse(bookingDate))) errors.push('Ngày sử dụng không hợp lệ');
  if (!Number.isInteger(Number(adultsCount)) || Number(adultsCount) < 0) errors.push('Số người lớn không hợp lệ');
  if (!Number.isInteger(Number(childrenCount)) || Number(childrenCount) < 0) errors.push('Số trẻ em không hợp lệ');
  if (quantity !== undefined && (!Number.isInteger(Number(quantity)) || Number(quantity) < 1)) errors.push('Số lượng không hợp lệ');
  if (quantity === undefined && Number(adultsCount) + Number(childrenCount) < 1) errors.push('Tổng số khách phải lớn hơn 0');
  if (errors.length) return validationError(res, errors);
  next();
}
