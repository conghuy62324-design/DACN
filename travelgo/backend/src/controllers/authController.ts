import { Request, Response, NextFunction } from 'express';

const MOCK_USERS = [
  {
    id: 'u-admin',
    fullName: 'HuGo Admin',
    email: 'admin@hugotravel.vn',
    password: 'password123',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    phone: '0905123456',
  },
  {
    id: 'u-1',
    fullName: 'Lê Đăng Khôi',
    email: 'khoidan@hugotravel.vn',
    password: 'password123',
    role: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    phone: '0905123456',
  },
  {
    id: 'u-2',
    fullName: 'Nguyễn Thảo Anh',
    email: 'thaoanh@hugotravel.vn',
    password: 'password123',
    role: 'user',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    phone: '0987654321',
  },
];


export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email?.toLowerCase());

      if (!user || user.password !== password) {
        // Return friendly demo user info if test login
        res.status(401).json({
          success: false,
          message: 'Email hoặc mật khẩu không chính xác',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Đăng nhập thành công!',
        data: {
          user: {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
            phone: user.phone,
          },
          token: `jwt-token-${user.id}-${Date.now()}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fullName, email, password, phone } = req.body;
      if (!fullName || !email || !password) {
        res.status(400).json({ success: false, message: 'Vui lòng cung cấp đầy đủ thông tin đăng ký' });
        return;
      }

      const newUser = {
        id: `u-${Date.now()}`,
        fullName,
        email,
        password,
        role: 'user',
        avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
        phone: phone || '',
      };
      MOCK_USERS.push(newUser);

      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công!',
        data: {
          user: {
            id: newUser.id,
            fullName: newUser.fullName,
            email: newUser.email,
            role: newUser.role,
            avatarUrl: newUser.avatarUrl,
            phone: newUser.phone,
          },
          token: `jwt-token-${newUser.id}-${Date.now()}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Mock profile response
      res.json({
        success: true,
        data: MOCK_USERS[0],
      });
    } catch (error) {
      next(error);
    }
  }
}
