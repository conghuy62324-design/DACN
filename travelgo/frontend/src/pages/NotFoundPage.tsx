import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, MapPin, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-28 pb-20 flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
          <Compass className="w-10 h-10 animate-spin-slow" />
        </div>

        <div>
          <span className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight block mb-2">
            404
          </span>
          <h1 className="text-xl font-bold text-slate-800">
            Không tìm thấy trang yêu cầu
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            Đường dẫn bạn đang tìm kiếm có thể đã được thay đổi hoặc không tồn tại trên hệ thống HuGo Travel.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <Link
            to="/"
            className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-md flex items-center justify-center space-x-2 text-sm transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Quay về Trang chủ</span>
          </Link>
          <Link
            to="/explore"
            className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl flex items-center justify-center space-x-2 text-sm transition-all"
          >
            <MapPin className="w-4 h-4 text-orange-500" />
            <span>Khám phá bản đồ du lịch</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
