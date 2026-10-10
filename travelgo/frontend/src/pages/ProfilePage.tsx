import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Phone, ShieldCheck, Bookmark, Heart, Award, Check } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '0905123456');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm space-y-8">
          {/* Profile Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 pb-6 border-b border-slate-100">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80'}
              alt={user?.fullName}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-orange-500/20 shadow-md"
            />
            <div className="text-center sm:text-left space-y-1">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{user?.fullName}</h1>
                {isAdmin ? (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    Admin
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                    Thành viên thân thiết
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <div className="pt-2 flex flex-wrap gap-2 justify-center sm:justify-start text-xs text-slate-600">
                <Link to="/bookings" className="px-3 py-1 bg-slate-100 rounded-lg font-medium hover:bg-slate-200">
                  Lịch sử đặt dịch vụ
                </Link>
                <Link to="/favorites" className="px-3 py-1 bg-slate-100 rounded-lg font-medium hover:bg-slate-200">
                  Danh sách yêu thích
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-2xl bg-orange-50/70 border border-orange-100">
              <span className="text-2xl font-black text-orange-600 block">3</span>
              <span className="text-xs text-slate-600 font-medium">Chuyến đi đã đặt</span>
            </div>
            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-100">
              <span className="text-2xl font-black text-teal-600 block">450</span>
              <span className="text-xs text-slate-600 font-medium">Điểm tích lũy</span>
            </div>
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
              <span className="text-2xl font-black text-indigo-600 block">Hạng Vàng</span>
              <span className="text-xs text-slate-600 font-medium">Cấp bậc thành viên</span>
            </div>
          </div>

          {/* Edit form */}
          <form onSubmit={handleSave} className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-lg font-bold text-slate-900">Thông tin cá nhân</h3>

            {savedSuccess && (
              <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs flex items-center space-x-2 border border-emerald-200">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Cập nhật thông tin cá nhân thành công!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Họ và tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-slate-900 hover:bg-orange-500 text-white font-bold text-sm rounded-xl transition-colors"
            >
              Lưu thay đổi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
