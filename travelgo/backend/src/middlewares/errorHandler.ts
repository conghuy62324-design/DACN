import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  // Database exceptions may contain contact details, SQL bind values or tokens.
  // Log classification only; never serialize the exception/request body.
  console.error('Server Error:', {name:err?.name||'Error',code:err?.code||err?.parent?.code||'INTERNAL_ERROR',statusCode:err?.statusCode||500});

  const statusCode = err.statusCode || 500;
  const message = statusCode>=500 ? 'Dịch vụ tạm thời chưa hoàn thành yêu cầu. Vui lòng kiểm tra lại trạng thái trước khi thử lại.' : err.message || 'Yêu cầu chưa hoàn thành.';

  res.status(statusCode).json({
    success: false,
    message,
    code: err.code,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
}
