import React from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../context/FavoritesContext';
import { Heart, Trash2, ArrowRight, MapPin } from 'lucide-react';
import { formatCurrencyVND } from '../utils/formatters';
import { RatingBadge } from '../components/common/RatingBadge';

export const FavoritesPage: React.FC = () => {
  const { favorites, toggleFavorite } = useFavorites();

  return (
    <div className="min-h-screen pt-24 pb-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <span className="text-rose-500 font-bold text-xs uppercase tracking-wider block mb-1">
            Danh sách lưu trữ
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900">
            Địa điểm & Tour du lịch yêu thích
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Các điểm đến và dịch vụ bạn đã lưu lại để lên kế hoạch cho kỳ nghỉ sắp tới.
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Chưa có mục yêu thích nào</h3>
            <p className="text-slate-500 text-sm">
              Hãy nhấn biểu tượng trái tim trên các thẻ tour hoặc khách sạn để lưu lại vào đây nhé!
            </p>
            <Link
              to="/explore"
              className="inline-block px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-colors"
            >
              Khám phá ngay
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl overflow-hidden shadow-card border border-slate-100 flex flex-col justify-between group"
              >
                <div>
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <img src={item.heroImage} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <button
                      onClick={() => toggleFavorite(item)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 text-rose-500 hover:bg-rose-50 flex items-center justify-center shadow"
                      title="Xóa khỏi yêu thích"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-5 space-y-2">
                    <div className="flex items-center text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 mr-1" />
                      <span>{item.city}</span>
                    </div>

                    <Link to={`/places/${item.id}`}>
                      <h3 className="text-base font-bold text-slate-900 line-clamp-1 hover:text-orange-600 transition-colors">
                        {item.name}
                      </h3>
                    </Link>

                    <RatingBadge rating={item.rating} reviewCount={item.reviewCount} showBayesianDetail={false} size="sm" />
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-100 flex items-center justify-between mt-3">
                  <span className="text-base font-extrabold text-slate-900">{formatCurrencyVND(item.priceFrom)}</span>
                  <Link
                    to={`/places/${item.id}`}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center"
                  >
                    <span>Xem ngay</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
