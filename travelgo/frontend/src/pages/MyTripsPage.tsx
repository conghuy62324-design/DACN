import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Bookmark,
  Plus,
  Trash2,
  ArrowRight,
  TrendingUp,
  FileText,
  AlertCircle
} from 'lucide-react';
import { TripService } from '../services/tripService';
import { TripSession } from '../types';

export const MyTripsPage: React.FC = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState<TripSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'upcoming' | 'completed'>('all');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const data = await TripService.getTrips();
      setTrips(data);
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa chuyến đi này khỏi danh sách?')) {
      try {
        await TripService.deleteTrip(id);
        setTrips(trips.filter((t) => t.id !== id));
      } catch (err) {
        console.error('Failed to delete trip:', err);
        alert('Không thể xóa chuyến đi.');
      }
    }
  };

  const filteredTrips = trips.filter((t) => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="inline-flex items-center space-x-2 bg-sky-100 text-sky-800 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              <Compass className="w-3.5 h-3.5 text-sky-600" />
              <span>Hành trình cá nhân & Check-in thời gian thực</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Chuyến Đi Của Tôi
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">
              Quản lý các hành trình đã lưu, theo dõi tiến độ tham quan từng địa điểm và viết Blog chia sẻ trải nghiệm.
            </p>
          </div>

          <Link
            to="/tour-planner"
            className="inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-4 rounded-xl text-xs sm:text-sm shadow-md transition-all gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo lịch trình mới</span>
          </Link>
        </div>

        {/* Status Filters */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
          {[
            { id: 'all', label: 'Tất cả chuyến đi' },
            { id: 'active', label: 'Đang diễn ra' },
            { id: 'upcoming', label: 'Sắp tới' },
            { id: 'completed', label: 'Đã hoàn thành' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trips Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
                <div className="h-6 bg-slate-200 rounded w-3/4 mb-4" />
                <div className="h-2 bg-slate-200 rounded mb-4" />
                <div className="h-8 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-sm max-w-lg mx-auto">
            <Bookmark className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Chưa có chuyến đi nào trong danh mục</h3>
            <p className="text-slate-500 text-xs sm:text-sm mt-1 mb-6">
              Hãy dùng công cụ HuGo Planner để thiết lập lịch trình cá nhân hoặc chọn một tour mẫu yêu thích để bắt đầu!
            </p>
            <Link
              to="/tour-planner"
              className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-xl shadow-md inline-block"
            >
              Tạo lịch trình ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => {
              const statusConfig = {
                active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', label: 'Đang diễn ra' },
                upcoming: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', label: 'Sắp tới' },
                completed: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', label: 'Đã hoàn thành' },
                cancelled: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', label: 'Đã hủy' },
              }[trip.status];

              return (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/my-trips/${trip.id}`)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Top status & city badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        {trip.destinationCity}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition-colors line-clamp-2 mb-2">
                      {trip.title}
                    </h3>

                    {/* Dates & duration */}
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-4">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{trip.startDate} &rarr; {trip.endDate}</span>
                      <span>({trip.daysCount} ngày)</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 font-medium">Tiến độ tham quan</span>
                        <span className="font-extrabold text-sky-700">{trip.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${trip.progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        Đã check-in: {trip.checkins.length} điểm tham quan
                      </div>
                    </div>
                  </div>

                  {/* Footer stats & actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 font-medium">Dự toán ngân sách</div>
                      <div className="text-sm font-bold text-orange-600">
                        {new Intl.NumberFormat('vi-VN').format(trip.totalBudgetUserVND)}đ
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDeleteTrip(trip.id, e)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Xóa chuyến đi"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-sky-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        <span>Chi tiết</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
