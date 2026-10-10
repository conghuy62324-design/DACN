import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // For demo/prototyping we allow requests to pass, setting default guest/user
    req.user = {
      id: 'demo-user-id',
      email: 'khoidan@hugotravel.vn',
      role: 'admin',
    };
    return next();
  }

  const token = authHeader.split(' ')[1];
  if (token) {
    req.user = {
      id: 'demo-user-id',
      email: 'khoidan@hugotravel.vn',
      role: 'admin',
    };
  }

  next();
}
