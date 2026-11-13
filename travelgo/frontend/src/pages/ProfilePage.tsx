import React from 'react';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types';

const roleLabels: Record<UserRole, string> = {
  CUSTOMER: 'Khách hàng',
  PARTNER: 'Đối tác',
  SUPER_ADMIN: 'Quản trị viên',
};

export const ProfilePage: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <p role="status" className="pt-24 px-4">Đang xác thực phiên đăng nhập…</p>;
  if (!user) return null;

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <section aria-label="Hồ sơ cá nhân" className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-100">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={`Ảnh đại diện của ${user.fullName}`} className="w-24 h-24 shrink-0 rounded-full object-cover" />
            ) : (
              <div aria-label="Chưa có ảnh đại diện" role="img" className="w-24 h-24 shrink-0 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center">
                <User aria-hidden="true" className="w-12 h-12" />
              </div>
            )}
            <div className="min-w-0 w-full text-center sm:text-left space-y-3 [overflow-wrap:anywhere]">
              <h1 className="text-2xl font-extrabold text-slate-900">{user.fullName || 'Chưa cung cấp'}</h1>
              <p className="text-sm text-slate-500">Hồ sơ hiện chỉ hỗ trợ xem.</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start text-sm">
                <Link to="/bookings" className="px-3 py-2 bg-slate-100 rounded-lg font-medium hover:bg-slate-200">Lịch sử đặt dịch vụ</Link>
                <Link to="/favorites" className="px-3 py-2 bg-slate-100 rounded-lg font-medium hover:bg-slate-200">Danh sách yêu thích</Link>
              </div>
            </div>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm [overflow-wrap:anywhere]">
            <div className="min-w-0"><dt className="text-slate-500 mb-1">Họ và tên</dt><dd className="font-medium text-slate-900">{user.fullName || 'Chưa cung cấp'}</dd></div>
            <div className="min-w-0"><dt className="text-slate-500 mb-1">Email</dt><dd className="font-medium text-slate-900">{user.email || 'Chưa cung cấp'}</dd></div>
            <div className="min-w-0"><dt className="text-slate-500 mb-1">Số điện thoại</dt><dd data-testid="profile-phone" className="font-medium text-slate-900">{user.phone?.trim() || 'Chưa cung cấp'}</dd></div>
            <div className="min-w-0"><dt className="text-slate-500 mb-1">Vai trò</dt><dd data-testid="profile-roles" className="font-medium text-slate-900">{user.roles.map(role => roleLabels[role]).join(', ') || 'Chưa cung cấp'}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  );
};
