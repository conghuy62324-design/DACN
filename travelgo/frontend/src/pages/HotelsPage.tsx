import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlaceService } from '../services/placeService';
import { Place } from '../types';
import { Hotel, Star, MapPin, Check, ArrowRight, Heart } from 'lucide-react';
import { RatingBadge } from '../components/common/RatingBadge';
import { formatCurrencyVND } from '../utils/formatters';
import { useFavorites } from '../context/FavoritesContext';
import { useBooking } from '../context/BookingContext';

export const HotelsPage: React.FC = () => {
  const [hotels, setHotels] = useState<Place[]>([]);
  const [city, setCity] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [maxPrice, setMaxPrice] = useState(15000000);
  const [loading, setLoading] = useState(true);

  const { toggleFavorite, isFavorite } = useFavorites();
  const { openBooking } = useBooking();

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchHotels = async () => {
      setLoading(true);
      try {
        const data = await PlaceService.getPlaces({
          category: 'hotel',
          city: city !== 'all' ? city : undefined,
          minRating: minRating > 0 ? minRating : undefined,
        });
        setHotels(data.filter((h) => h.priceFrom <= maxPrice));
      } catch (e) {
        console.error('Failed to load hotels:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [city, minRating, maxPrice]);

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-950 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-10">
          <span className="inline-block px-3 py-1 bg-indigo-500 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            Khách sạn & Resort đẳng cấp
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Nơi nghỉ dưỡng lý tưởng cho chuyến đi của bạn
          </h1>
          <p className="text-indigo-200 text-sm sm:text-base max-w-2xl leading-relaxed">
            Từ resort ven biển sang trọng đến khách sạn boutique ấm cúng, tận hưởng kỳ nghỉ trọn vẹn với giá tốt nhất và xác nhận tức thì.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Thành phố / Khu vực</label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none"
            >
              <option value="all">Tất cả địa điểm</option>
              <option value="Đà Nẵng">Đà Nẵng</option>
              <option value="Sapa">Sapa</option>
              <option value="Phú Quốc">Phú Quốc</option>
              <option value="Hạ Long">Hạ Long</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1">Đánh giá tối thiểu</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold outline-none"
            >
              <option value={0}>Tất cả sao</option>
              <option value={4.5}>Từ 4.5 ★ (Rất tốt)</option>
              <option value={4.8}>Từ 4.8 ★ (Xuất sắc)</option>
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-bold text-slate-500">Mức giá tối đa</label>
              <span className="text-xs font-extrabold text-indigo-600">{formatCurrencyVND(maxPrice)}</span>
            </div>
            <input
              type="range"
              min={1000000}
              max={20000000}
              step={500000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer mt-2"
            />
          </div>
        </div>

        {/* Hotel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {hotels.map((h) => {
            const favorited = isFavorite(h.id);

            return (
              <div
                key={h.id}
                className="bg-white rounded-3xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img src={h.heroImage} alt={h.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => toggleFavorite(h)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-rose-500 transition-all shadow"
                    >
                      <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 mr-1" />
                        <span>{h.address}</span>
                      </div>
                      <RatingBadge rating={h.rating} reviewCount={h.reviewCount} showBayesianDetail={true} size="sm" />
                    </div>

                    <Link to={`/places/${h.id}`}>
                      <h3 className="text-xl font-bold text-slate-900 leading-snug hover:text-indigo-600 transition-colors">
                        {h.name}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {h.summary}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {h.amenities.slice(0, 3).map((a, i) => (
                        <span key={i} className="text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-100">
                          ✓ {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Giá mỗi đêm từ</span>
                    <span className="text-2xl font-black text-slate-900">{formatCurrencyVND(h.priceFrom)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/places/${h.id}`}
                      className="px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Xem chi tiết
                    </Link>
                    <button
                      onClick={() =>
                        openBooking({
                          serviceType: 'hotel',
                          serviceId: h.id,
                          serviceName: h.name,
                          unitPrice: h.priceFrom,
                          imageUrl: h.heroImage,
                        })
                      }
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition-colors"
                    >
                      Đặt phòng ngay
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
