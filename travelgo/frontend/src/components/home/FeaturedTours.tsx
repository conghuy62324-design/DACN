import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, MapPin, Heart, ArrowRight } from 'lucide-react';
import { Place } from '../../types';
import { RatingBadge } from '../common/RatingBadge';
import { formatCurrencyVND } from '../../utils/formatters';
import { useFavorites } from '../../context/FavoritesContext';
import { useBooking } from '../../context/BookingContext';

interface FeaturedToursProps {
  tours: Place[];
}

export const FeaturedTours: React.FC<FeaturedToursProps> = ({ tours }) => {
  const { toggleFavorite, isFavorite } = useFavorites();
  const { openBooking } = useBooking();

  return (
    <section className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12">
          <div>
            <span className="text-teal-600 font-bold text-xs uppercase tracking-widest block mb-2">
              Tour nổi bật / Vé & dịch vụ trải nghiệm
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Những hành trình tuyệt vời nhất đang chờ đón bạn
            </h2>
          </div>
          <Link
            to="/tours"
            className="mt-4 sm:mt-0 inline-flex items-center text-sm font-bold text-orange-600 hover:text-orange-700 transition-colors group"
          >
            <span>Xem tất cả tour</span>
            <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Link>

        </div>

        {/* 4 Cards Grid Matching Image 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tours.slice(0, 4).map((item, index) => {
            const favorited = isFavorite(item.id);
            const badgeText = index === 0 ? 'Bán chạy' : index === 1 ? 'Cao cấp' : index === 2 ? 'Ưu đãi' : 'Được yêu thích';
            const badgeColor =
              index === 0
                ? 'bg-amber-500 text-white'
                : index === 1
                ? 'bg-sky-600 text-white'
                : 'bg-emerald-500 text-white';

            return (
              <div
                key={item.id}
                className="group bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col border border-slate-100"
              >
                {/* Photo & Badge */}
                <div className="relative aspect-[16/11] overflow-hidden bg-slate-100">
                  <img
                    src={item.heroImage}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                  {/* Badge */}
                  <span
                    className={`absolute top-3 left-3 text-[11px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-wider shadow-sm ${badgeColor}`}
                  >
                    {badgeText}
                  </span>

                  {/* Favorite button */}
                  <button
                    onClick={() => toggleFavorite(item)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-slate-700 hover:text-rose-500 hover:bg-white transition-all shadow-sm"
                    title={favorited ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                  >
                    <Heart className={`w-4 h-4 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                  </button>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Meta info: duration & city */}
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.duration || 'Trong ngày'}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-slate-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-orange-500" />
                        <span className="truncate max-w-[100px]">{item.city}</span>
                      </div>
                    </div>

                    {/* Title */}
                    <Link to={`/places/${item.id}`}>
                      <h3 className="font-bold text-slate-900 text-base leading-snug line-clamp-2 group-hover:text-orange-600 transition-colors mb-2">
                        {item.name}
                      </h3>
                    </Link>

                    {/* Excerpt */}
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {item.summary}
                    </p>

                    {/* Bayesian Rating Badge */}
                    <div className="mb-4">
                      <RatingBadge
                        rating={item.rating}
                        reviewCount={item.reviewCount}
                        showBayesianDetail={false}
                        size="sm"
                      />
                    </div>
                  </div>

                  {/* Bottom Price & Actions Matching Image 1 */}
                  <div className="border-t border-slate-100 pt-3 flex items-center justify-between mt-auto">
                    <div>
                      <span className="text-[11px] text-slate-400 block">Chỉ từ</span>
                      <span className="text-base font-black text-slate-900">
                        {formatCurrencyVND(item.priceFrom)}
                      </span>
                    </div>

                    <Link
                      to={`/places/${item.id}`}
                      className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Xem chi tiết</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
