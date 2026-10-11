import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

export const ProtectedRoute: React.FC<{ roles?: UserRole[] }> = ({ roles }) => {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-600">Đang xác thực phiên đăng nhập…</div>;
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles?.length && !hasRole(...roles)) return <Navigate to="/403" replace />;
  return <Outlet />;
};
