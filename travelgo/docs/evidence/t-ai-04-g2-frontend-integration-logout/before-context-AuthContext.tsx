import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { User, UserRole } from '../types';
import { AuthService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { fullName: string; email: string; password: string; phone?: string }) => Promise<User>;
  logout: () => void;
  hasRole: (...roles: UserRole[]) => boolean;
  isAdmin: boolean;
  isPartner: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(user: User): User {
  if (Array.isArray(user.roles)) return user;
  const roleMap = { admin: 'SUPER_ADMIN', partner: 'PARTNER', user: 'CUSTOMER' } as const;
  return { ...user, roles: [roleMap[user.role || 'user']] };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionVersion = useRef(0);

  const clearSession = () => {
    sessionVersion.current++;
    setUser(null);
    localStorage.removeItem('travelgo_user');
    localStorage.removeItem('travelgo_token');
    setLoading(false);
  };

  useEffect(() => {
    const token = localStorage.getItem('travelgo_token');
    const version = sessionVersion.current;
    let active = true;
    const isCurrent = () => active && version === sessionVersion.current && localStorage.getItem('travelgo_token') === token;
    if (!token) {
      localStorage.removeItem('travelgo_user');
      setLoading(false);
      return;
    }
    AuthService.me()
      .then((currentUser) => {
        if (!isCurrent()) return;
        const normalized = normalizeUser(currentUser);
        setUser(normalized);
        localStorage.setItem('travelgo_user', JSON.stringify(normalized));
      })
      .catch(() => {
        if (isCurrent()) clearSession();
      })
      .finally(() => { if (isCurrent()) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.addEventListener('travelgo:unauthorized', clearSession);
    return () => window.removeEventListener('travelgo:unauthorized', clearSession);
  }, []);

  const persistSession = (result: { user: User; token: string }, version: number) => {
    // A completed logout/401/new login supersedes any outstanding auth response.
    if (version !== sessionVersion.current) throw new Error('Phiên đăng nhập đã thay đổi. Vui lòng thử lại.');
    sessionVersion.current++;
    const normalized = normalizeUser(result.user);
    localStorage.setItem('travelgo_token', result.token);
    localStorage.setItem('travelgo_user', JSON.stringify(normalized));
    setUser(normalized);
    setLoading(false);
    return normalized;
  };

  const login = async (email: string, password: string) => {
    const version = sessionVersion.current;
    return persistSession(await AuthService.login(email, password), version);
  };
  const register = async (input: { fullName: string; email: string; password: string; phone?: string }) => {
    const version = sessionVersion.current;
    return persistSession(await AuthService.register(input), version);
  };

  const logout = clearSession;

  const value = useMemo<AuthContextType>(() => {
    const hasRole = (...roles: UserRole[]) => !!user && roles.some((role) => user.roles.includes(role));
    return { user, loading, login, register, logout, hasRole, isAdmin: hasRole('SUPER_ADMIN'), isPartner: hasRole('PARTNER') };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  return context;
};
