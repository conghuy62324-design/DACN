import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PlaceService } from '../services/placeService';
import { Place } from '../types';
import { UtensilsCrossed, Star, MapPin, Clock, Heart, Users } from 'lucide-react';
import { RatingBadge } from '../components/common/RatingBadge';
import { formatCurrencyVND } from '../utils/formatters';
import { useFavorites } from '../context/FavoritesContext';
import { useBooking } from '../context/BookingContext';

export const RestaurantsPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Place[]>([]);
  const [city, setCity] = useState('all');
  const [loading, setLoading] = useState(true);

  const { toggleFavorite, isFavorite } = useFavorites();
  const { openBooking } = useBooking();

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchRestaurants = async () => {
      setLoading(true);
      try {
        const data = await PlaceService.getPlaces({
          category: 'restaurant',
          city: city !== 'all' ? city : undefined,
        });
        setRestaurants(data);
      } catch (e) {
        console.error('Failed to load restaurants:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [city]);

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-amber-950 to-orange-950 rounded-3xl p-8 sm:p-12 text-white shadow-xl mb-10">
          <span className="inline-block px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            Tinh hoa ẩm thực ba miền
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Khám phá những nhà hàng & quán ăn trứ danh
          </h1>
          <p className="text-amber-200 text-sm sm:text-base max-w-2xl leading-relaxed">
            Thưởng thức hương vị ẩm thực truyền thống và ẩm thực fusion độc đáo, đặt bàn trước dễ dàng không lo hết chỗ.
          </p>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-8 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-500">Lọc theo thành phố:</span>
            {['all', 'Đà Nẵng', 'Hội An'].map((c) => (
              <button
                key={c}
                onClick={() => setCity(c)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  city === c
                    ? 'bg-amber-500 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {c === 'all' ? 'Tất cả' : c}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">{restaurants.length} Nhà hàng nổi bật</span>
        </div>

        {/* Restaurant Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {restaurants.map((rest) => {
            const favorited = isFavorite(rest.id);

            return (
              <div
                key={rest.id}
                className="bg-white rounded-3xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img src={rest.heroImage} alt={rest.name} className="w-full h-full object-cover" />
                    <button
                      onClick={() => toggleFavorite(rest)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-rose-500 transition-all shadow"
                    >
                      <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                    </button>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-xs text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-orange-500 mr-1" />
                        <span>{rest.address}</span>
                      </div>
                      <RatingBadge rating={rest.rating} reviewCount={rest.reviewCount} showBayesianDetail={true} size="sm" />
                    </div>

                    <Link to={`/places/${rest.id}`}>
                      <h3 className="text-xl font-bold text-slate-900 leading-snug hover:text-amber-600 transition-colors">
                        {rest.name}
                      </h3>
                    </Link>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {rest.summary}
                    </p>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {rest.highlights.map((h, i) => (
                        <span key={i} className="text-xs bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg border border-amber-100">
                          ★ {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Mức giá trung bình từ</span>
                    <span className="text-xl font-black text-slate-900">{formatCurrencyVND(rest.priceFrom)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/places/${rest.id}`}
                      className="px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Xem thực đơn
                    </Link>
                    <button
                      onClick={() =>
                        openBooking({
                          serviceType: 'restaurant',
                          serviceId: rest.id,
                          serviceName: rest.name,
                          unitPrice: rest.priceFrom,
                          imageUrl: rest.heroImage,
                        })
                      }
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow transition-colors flex items-center space-x-1.5"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Đặt bàn ngay</span>
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
