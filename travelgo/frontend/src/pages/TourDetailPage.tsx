import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Calendar,
  Sparkles,
  CheckCircle2,
  XCircle,
  Share2,
  Heart,
  ArrowRight,
  ShieldCheck,
  Building,
  Utensils,
  Camera,
  ChevronRight,
  Info
} from 'lucide-react';
import { TourService } from '../services/tourService';
import { TourPackage } from '../types';
import { useBooking } from '../context/BookingContext';
import { RatingBadge } from '../components/common/RatingBadge';

export const TourDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openBooking } = useBooking();
  const [tour, setTour] = useState<TourPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);


  useEffect(() => {
    if (id) {
      fetchTour(id);
    }
  }, [id]);

  const fetchTour = async (tourId: string) => {
    setLoading(true);
    try {
      const data = await TourService.getTourById(tourId);
      setTour(data);
    } catch (err) {
      console.error('Failed to load tour details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Đang tải chi tiết tour HuGo Travel...</p>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy tour du lịch</h2>
          <p className="text-slate-500 text-sm mb-6">Tour này không tồn tại hoặc đã ngừng cung cấp.</p>
          <Link to="/tours" className="bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm">
            Xem tất cả tour
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-sky-600">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/tours" className="hover:text-sky-600">Tour du lịch</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-800 font-medium truncate max-w-xs">{tour.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Main Grid: Left details (8 cols) & Right booking card (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            {/* Title & Header */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="bg-sky-100 text-sky-800 text-xs font-semibold px-3 py-1 rounded-full">
                  {tour.durationDays} Ngày {tour.durationNights} Đêm
                </span>
                <span className="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  {tour.destinationCity}
                </span>
                <span className="text-xs text-slate-500">Khởi hành: {tour.departureCity}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {tour.title}
              </h1>
            </div>

            {/* Photo Gallery Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-2xl overflow-hidden shadow-sm">
              <div className="sm:col-span-2 h-72 sm:h-96">
                <img
                  src={tour.heroImage}
                  alt={tour.title}
                  className="w-full h-full object-cover rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-3 h-72 sm:h-96">
                {tour.galleryImages.slice(0, 2).map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${tour.title} gallery ${i}`}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ))}
              </div>
            </div>

            {/* Bayesian Average Explainer Card */}
            <div className="bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="font-bold text-slate-900 text-base">
                      Đánh Giá & Xếp Hạng Thuật Toán Bayesian
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">Điểm gốc: {tour.rating}★</span>
                      <span className="bg-emerald-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-lg">
                        Bayesian Score: {tour.bayesianScore.toFixed(2)} / 5.0
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    Hệ thống tính toán trọng số theo công thức{' '}
                    <code className="bg-white/80 px-1 py-0.5 rounded text-sky-800 font-mono text-[11px]">
                      S = (v / (v + m)) * R + (m / (v + m)) * C
                    </code>{' '}
                    với hệ số tự tin <code>m = 10</code> và trung bình cộng toàn hệ thống <code>C = 4.20</code>. Điều này giúp loại bỏ tình trạng sai lệch khi một địa điểm chỉ có 1-2 lượt đánh giá ảo 5 sao.
                  </p>
                </div>
              </div>
            </div>

            {/* Overview / Description */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
              <h2 className="text-lg font-bold text-slate-900 mb-3">Mô tả chương trình</h2>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line mb-6">
                {tour.description}
              </p>

              {/* Highlights */}
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3">
                Trải nghiệm đặc quyền nổi bật:
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {tour.highlights.map((h, i) => (
                  <div key={i} className="flex items-center space-x-2 text-sm text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Day by Day Itinerary */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900">Lịch trình chi tiết từng ngày</h2>
                <span className="text-xs text-slate-500 font-medium">
                  {tour.itineraryDays.length} Ngày khám phá
                </span>
              </div>

              {/* Day selection tabs */}
              <div className="flex space-x-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
                {tour.itineraryDays.map((d) => (
                  <button
                    key={d.day}
                    onClick={() => setActiveDay(d.day)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      activeDay === d.day
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Ngày {d.day}
                  </button>
                ))}
              </div>

              {/* Active Day Detail */}
              {tour.itineraryDays
                .filter((d) => d.day === activeDay)
                .map((day) => (
                  <div key={day.day} className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <span className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 font-extrabold text-sm flex items-center justify-center">
                        N{day.day}
                      </span>
                      <h3 className="text-base font-bold text-slate-900">{day.title}</h3>
                    </div>

                    <p className="text-sm text-slate-600 leading-relaxed pl-11">
                      {day.description}
                    </p>

                    {/* Places visited on this day */}
                    <div className="pl-11 mt-3">
                      <div className="text-xs font-semibold text-slate-500 mb-2">Điểm ghé thăm chính:</div>
                      <div className="flex flex-wrap gap-2">
                        {day.places.map((place, idx) => (
                          <span
                            key={idx}
                            className="bg-sky-50 text-sky-800 text-xs font-medium px-3 py-1 rounded-lg border border-sky-200/60 flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3 text-sky-600" />
                            {place}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Inclusions & Exclusions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200/80">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Dịch vụ bao gồm & Không bao gồm</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mb-3">
                    <CheckCircle2 className="w-4 h-4" /> Giá tour bao gồm:
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {tour.inclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-rose-700 flex items-center gap-1.5 mb-3">
                    <XCircle className="w-4 h-4" /> Giá tour không bao gồm:
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {tour.exclusions.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: BOOKING & PLANNER SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200/90 sticky top-24">
              <div className="mb-4">
                <span className="text-xs text-slate-400 font-medium">Giá tour trọn gói</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-orange-600">
                  {new Intl.NumberFormat('vi-VN').format(tour.priceVND)}{' '}
                  <span className="text-xs font-normal text-slate-500">VNĐ / khách</span>
                </div>
              </div>

              {/* Demo Notice */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2 mb-6">
                <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Chế độ trải nghiệm thử nghiệm:</strong> Booking mô phỏng và xác nhận tức thì trong hệ thống nghiên cứu HuGo Travel.
                </span>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() =>
                    openBooking({
                      serviceType: 'tour',
                      serviceId: tour.id,
                      serviceName: tour.title,
                      unitPrice: tour.priceVND,
                    })
                  }
                  className="w-full bg-gradient-to-r from-sky-600 to-sky-700 hover:from-sky-700 hover:to-sky-800 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all text-sm"
                >
                  Đặt giữ chỗ ngay
                </button>

                <button
                  onClick={() => navigate('/tour-planner', { state: { templateTour: tour } })}
                  className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-300 font-bold py-3 px-4 rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  <span>Sao chép & Tự sửa lịch trình</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Info Checklist */}
              <div className="mt-6 pt-5 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Thời lượng:</span>
                  <span className="font-semibold text-slate-800">{tour.durationDays} Ngày {tour.durationNights} Đêm</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Điểm đến:</span>
                  <span className="font-semibold text-slate-800">{tour.destinationCity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Hỗ trợ hủy:</span>
                  <span className="font-semibold text-emerald-600">Miễn phí trước 48h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Bảo hiểm du lịch:</span>
                  <span className="font-semibold text-slate-800">Đã bao gồm 100tr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

