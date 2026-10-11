import { User } from '../types';
import { api } from './api';

interface AuthResult {
  user: User;
  token: string;
}

export const AuthService = {
  async login(email: string, password: string): Promise<AuthResult> {
    const response: any = await api.post('/auth/login', { email, password });
    return response.data;
  },

  async register(input: { fullName: string; email: string; password: string; phone?: string }): Promise<AuthResult> {
    const response: any = await api.post('/auth/register', input);
    return response.data;
  },

  async me(): Promise<User> {
    const response: any = await api.get('/auth/me');
    return response.data;
  },
};
