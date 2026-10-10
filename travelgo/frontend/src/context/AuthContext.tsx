import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, role?: 'user' | 'admin') => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAdmin: false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('travelgo_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default demo user
    return {
      id: 'u-1',
      fullName: 'Lê Đăng Khôi',
      email: 'khoidan@hugotravel.vn',
      role: 'admin',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      phone: '0905123456',
    };
  });

  const login = (email: string, role: 'user' | 'admin' = 'user') => {
    const newUser: User = {
      id: `u-${Date.now()}`,
      fullName: email.split('@')[0],
      email,
      role,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    };
    setUser(newUser);
    localStorage.setItem('travelgo_user', JSON.stringify(newUser));
    localStorage.setItem('travelgo_token', `demo-token-${newUser.id}`);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('travelgo_user');
    localStorage.removeItem('travelgo_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
