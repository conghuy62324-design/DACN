import { createHmac, timingSafeEqual } from 'node:crypto';
import { ENV } from '../config/env.js';
import { AuthUser, isRole } from '../types/auth.js';
import { HttpError } from '../utils/httpError.js';

interface TokenPayload extends AuthUser {
  iat: number;
  exp: number;
}

const encode = (value: string) => Buffer.from(value).toString('base64url');
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

function signature(payload: string): string {
  return createHmac('sha256', ENV.JWT_SECRET).update(payload).digest('base64url');
}

export function signAccessToken(user: AuthUser): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TokenPayload = { ...user, iat: now, exp: now + ENV.JWT_EXPIRES_SECONDS };
  const encodedPayload = encode(JSON.stringify(payload));
  return `${encodedPayload}.${signature(encodedPayload)}`;
}

export function verifyAccessToken(token: string): AuthUser {
  const [encodedPayload, receivedSignature, extra] = token.split('.');
  if (!encodedPayload || !receivedSignature || extra) {
    throw new HttpError(401, 'Token truy cập không hợp lệ', 'INVALID_TOKEN');
  }

  const expected = Buffer.from(signature(encodedPayload));
  const received = Buffer.from(receivedSignature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    throw new HttpError(401, 'Token truy cập không hợp lệ', 'INVALID_TOKEN');
  }

  try {
    const payload = JSON.parse(decode(encodedPayload)) as TokenPayload;
    if (!payload.id || !payload.email || !Array.isArray(payload.roles) || !payload.roles.every(isRole)) {
      throw new Error('invalid payload');
    }
    if (!payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new HttpError(401, 'Phiên đăng nhập đã hết hạn', 'TOKEN_EXPIRED');
    }
    return {
      id: payload.id,
      email: payload.email,
      fullName: payload.fullName,
      roles: payload.roles,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, 'Token truy cập không hợp lệ', 'INVALID_TOKEN');
  }
}
