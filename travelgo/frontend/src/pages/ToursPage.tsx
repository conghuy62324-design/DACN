import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Star,
  Users
} from 'lucide-react';
import { TourService } from '../services/tourService';
import { TourPackage } from '../types';
import { RatingBadge } from '../components/common/RatingBadge';

export const ToursPage: React.FC = () => {
  const navigate = useNavigate();
  const [tours, setTours] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState('bayesian');

  const CITIES = [
    { id: 'all', name: 'Tất cả điểm đến' },
    { id: 'Đà Nẵng', name: 'Đà Nẵng' },
    { id: 'Đà Lạt', name: 'Đà Lạt' },
    { id: 'Phú Quốc', name: 'Phú Quốc' },
    { id: 'Sapa', name: 'Sapa' },
    { id: 'Hà Nội', name: 'Hà Nội' },
  ];

  const CATEGORIES = [
    { id: 'all', label: 'Tất cả thể loại' },
    { id: 'culture', label: 'Văn hóa & Di sản' },
    { id: 'beach', label: 'Biển đảo' },
    { id: 'nature', label: 'Thiên nhiên núi non' },
    { id: 'resort', label: 'Nghỉ dưỡng & Sống chậm' },
  ];

  useEffect(() => {
    fetchTours();
  }, [selectedCity, selectedCategory, selectedDuration, sortBy]);

  const fetchTours = async () => {
    setLoading(true);
    try {
      const data = await TourService.getTours({
        city: selectedCity,
        category: selectedCategory,
        durationDays: selectedDuration,
        sortBy,
        search: searchQuery || undefined,
      });
      setTours(data);
    } catch (err) {
      console.error('Error fetching tours:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTours();
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-16">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8 mb-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 bg-sky-500/20 text-sky-300 border border-sky-400/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Xếp hạng thông minh theo Bayesian Average</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Tour Du Lịch Trọn Gói & Hành Trình Tuyển Chọn
              </h1>
              <p className="mt-2 text-slate-300 text-base max-w-2xl">
                Khám phá các tour du lịch mẫu chuẩn mực, kết hợp điểm tham quan biểu tượng, lịch trình tối ưu thời gian di chuyển và minh bạch chi phí.
              </p>
            </div>

            {/* Quick Action to Planner */}
            <div className="bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 max-w-md flex-shrink-0">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Compass className="w-5 h-5 text-orange-400" />
                Muốn một lịch trình của riêng bạn?
              </h3>
              <p className="text-xs text-slate-200 mt-1 mb-3">
                Thuật toán HuGo Planner sẽ tự động phân cụm địa lý, tính toán thời gian và cân đối ngân sách cho bạn.
              </p>
              <Link
                to="/tour-planner"
                className="inline-flex items-center justify-center w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold py-2.5 px-4 rounded-xl text-sm shadow-md transition-all group"
              >
                <span>Tạo lịch trình cá nhân hóa</span>
                <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Search & Filter Bar */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200/80 mb-8">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search input */}
            <div className="md:col-span-4 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm tên tour, điểm tham quan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
              />
            </div>

            {/* Destination select */}
            <div className="md:col-span-3">
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category select */}
            <div className="md:col-span-3">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort select */}
            <div className="md:col-span-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full py-2.5 px-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-700 font-medium"
              >
                <option value="bayesian">Điểm Bayesian cao nhất</option>
                <option value="priceAsc">Giá thấp đến cao</option>
                <option value="priceDesc">Giá cao đến thấp</option>
                <option value="duration">Thời lượng dài ngày</option>
              </select>
            </div>
          </form>

          {/* Quick Duration Pills */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" /> Thời lượng:
            </span>
            <button
              onClick={() => setSelectedDuration(undefined)}
              className={`px-3 py-1 rounded-full transition-colors ${
                selectedDuration === undefined
                  ? 'bg-sky-600 text-white font-medium'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            {[2, 3, 4].map((d) => (
              <button
                key={d}
                onClick={() => setSelectedDuration(d)}
                className={`px-3 py-1 rounded-full transition-colors ${
                  selectedDuration === d
                    ? 'bg-sky-600 text-white font-medium'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {d} ngày {d > 1 ? `${d - 1} đêm` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Tour List Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 animate-pulse">
                <div className="h-48 bg-slate-200 rounded-xl mb-4" />
                <div className="h-5 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : tours.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto">
            <Compass className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800">Không tìm thấy tour phù hợp</h3>
            <p className="text-slate-500 text-sm mt-1 mb-6">
              Vui lòng thử thay đổi bộ lọc tìm kiếm hoặc sử dụng công cụ tạo lịch trình tự động HuGo Planner.
            </p>
            <button
              onClick={() => {
                setSelectedCity('all');
                setSelectedCategory('all');
                setSelectedDuration(undefined);
                setSearchQuery('');
              }}
              className="text-sky-600 hover:text-sky-700 text-sm font-semibold inline-block"
            >
              Xóa bộ lọc
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
            {tours.map((tour) => (
              <div
                key={tour.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group"
              >
                {/* Image Banner */}
                <div className="relative h-60 overflow-hidden bg-slate-900">
                  <img
                    src={tour.heroImage}
                    alt={tour.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-95"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span className="bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg border border-white/20 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-400" />
                      {tour.destinationCity}
                    </span>
                    <span className="bg-sky-600/90 text-white text-xs font-semibold px-2.5 py-1 rounded-lg">
                      {tour.durationDays}N{tour.durationNights}Đ
                    </span>
                  </div>

                  {/* Rating Badge */}
                  <div className="absolute top-3 right-3">
                    <div className="bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl shadow-md flex items-center space-x-1.5 border border-white/40">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                      <span className="font-extrabold text-slate-800 text-xs">{tour.bayesianScore.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500">({tour.reviewCount})</span>
                    </div>
                  </div>

                  {/* Bottom Image Info */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="text-[11px] text-sky-200 font-medium">Khởi hành từ: {tour.departureCity}</span>
                    <h2 className="text-lg font-bold line-clamp-1 group-hover:text-sky-300 transition-colors">
                      {tour.title}
                    </h2>
                  </div>
                </div>

                {/* Body Details */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-slate-600 text-sm line-clamp-2 mb-4 leading-relaxed">
                      {tour.summary}
                    </p>

                    {/* Highlights */}
                    <div className="space-y-1.5 mb-5">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">Điểm nhấn nổi bật:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {tour.highlights.slice(0, 4).map((hl, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200/60 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                            {hl}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Daily Itinerary Mini Timeline */}
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 mb-5">
                      <div className="text-xs font-semibold text-slate-500 mb-2">Chương trình chi tiết tóm tắt:</div>
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {tour.itineraryDays.map((day) => (
                          <div key={day.day} className="flex items-start gap-2">
                            <span className="font-bold text-sky-700 bg-sky-100 px-1.5 py-0.5 rounded text-[10px] flex-shrink-0">
                              N{day.day}
                            </span>
                            <span className="line-clamp-1">{day.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Price & Action Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Chi phí trọn gói từ</div>
                      <div className="text-xl font-extrabold text-orange-600">
                        {new Intl.NumberFormat('vi-VN').format(tour.priceVND)}{' '}
                        <span className="text-xs font-normal text-slate-500">đ/khách</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/tours/${tour.id}`}
                        className="bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-all"
                      >
                        Chi tiết tour
                      </Link>
                      <button
                        onClick={() => navigate('/tour-planner', { state: { templateTour: tour } })}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-semibold text-xs py-2.5 px-3 rounded-xl transition-all flex items-center gap-1"
                        title="Sao chép lịch trình này để tự tùy biến"
                      >
                        <span>Tùy biến</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
