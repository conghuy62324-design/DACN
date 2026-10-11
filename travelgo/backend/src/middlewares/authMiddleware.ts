import { NextFunction, Request, Response } from 'express';
import { AuthUser, Role } from '../types/auth.js';
import { HttpError } from '../utils/httpError.js';
import { verifyAccessToken } from '../services/tokenService.js';
import { BusinessMember } from '../models/BusinessMember.js';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục', 'AUTH_REQUIRED');
    }
    req.user = verifyAccessToken(authHeader.slice(7));
    next();
  } catch (error) {
    next(error);
  }
}

export function optionalAuthenticate(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return next();
    if (!authHeader.startsWith('Bearer ')) throw new HttpError(401, 'Authorization header không hợp lệ', 'INVALID_AUTH_HEADER');
    req.user = verifyAccessToken(authHeader.slice(7));
    next();
  } catch (error) {
    next(error);
  }
}

export function requireRoles(...allowedRoles: Role[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new HttpError(401, 'Vui lòng đăng nhập để tiếp tục', 'AUTH_REQUIRED'));
    if (!allowedRoles.some((role) => req.user!.roles.includes(role))) {
      return next(new HttpError(403, 'Bạn không có quyền thực hiện thao tác này', 'FORBIDDEN'));
    }
    next();
  };
}

export function requireBusinessAccess(permission?: string) {
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new HttpError(401, 'Vui lòng đăng nhập để tiếp tục', 'AUTH_REQUIRED');
      if (req.user.roles.includes('SUPER_ADMIN')) return next();

      const businessId = String(req.params.businessId || req.params.id || '');
      if (!businessId) throw new HttpError(400, 'Thiếu mã cơ sở kinh doanh', 'BUSINESS_ID_REQUIRED');

      const membership = await BusinessMember.findOne({ where: { businessId, userId: req.user.id } });
      if (!membership || (permission && !membership.permissions.includes(permission))) {
        throw new HttpError(403, 'Bạn không được cấp quyền với cơ sở kinh doanh này', 'BUSINESS_ACCESS_DENIED');
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

// Compatibility alias for modules that previously imported authMiddleware.
export const authMiddleware = authenticate;
