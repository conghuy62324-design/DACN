import { UniqueConstraintError } from 'sequelize';
import { User } from '../models/User.js';
import { UserRole } from '../models/UserRole.js';
import { AuthUser, LEGACY_ROLE_MAP, Role } from '../types/auth.js';
import { HttpError } from '../utils/httpError.js';
import { hashPassword, verifyPassword } from './passwordService.js';
import { signAccessToken } from './tokenService.js';

export interface PublicUser extends AuthUser {
  phone?: string;
  avatarUrl?: string;
}

async function resolveRoles(user: User): Promise<Role[]> {
  const records = await UserRole.findAll({ where: { userId: user.id }, attributes: ['role'] });
  if (records.length > 0) return [...new Set(records.map((record) => record.role))];
  return [LEGACY_ROLE_MAP[user.role] || 'CUSTOMER'];
}

async function toPublicUser(user: User): Promise<PublicUser> {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    roles: await resolveRoles(user),
  };
}

export class AuthService {
  static async login(email: string, password: string) {
    const user = await User.findOne({ where: { email: email.trim().toLowerCase() } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      throw new HttpError(401, 'Email hoặc mật khẩu không chính xác', 'INVALID_CREDENTIALS');
    }
    const publicUser = await toPublicUser(user);
    return { user: publicUser, token: signAccessToken(publicUser) };
  }

  static async register(input: { fullName: string; email: string; password: string; phone?: string }) {
    try {
      const user = await User.create({
        fullName: input.fullName.trim(),
        email: input.email.trim().toLowerCase(),
        passwordHash: await hashPassword(input.password),
        phone: input.phone?.trim(),
        role: 'user',
      });
      await UserRole.create({ userId: user.id, role: 'CUSTOMER' });
      const publicUser = await toPublicUser(user);
      return { user: publicUser, token: signAccessToken(publicUser) };
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new HttpError(409, 'Email đã được sử dụng', 'EMAIL_EXISTS');
      }
      throw error;
    }
  }

  static async getById(userId: string): Promise<PublicUser> {
    const user = await User.findByPk(userId);
    if (!user) throw new HttpError(401, 'Tài khoản không còn tồn tại', 'USER_NOT_FOUND');
    return toPublicUser(user);
  }
}
