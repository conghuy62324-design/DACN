import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, ArrowRight, Heart } from 'lucide-react';
import { Place } from '../../types';
import { RatingBadge } from '../common/RatingBadge';
import { formatCurrencyVND } from '../../utils/formatters';
import { useFavorites } from '../../context/FavoritesContext';

interface PlaceSidebarProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
}

export const PlaceSidebar: React.FC<PlaceSidebarProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
}) => {
  const { toggleFavorite, isFavorite } = useFavorites();

  return (
    <div className="space-y-3 overflow-y-auto max-h-[640px] pr-1">
      {places.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
          <p className="text-slate-500 text-sm">Không tìm thấy địa điểm nào phù hợp với bộ lọc.</p>
        </div>
      ) : (
        places.map((item) => {
          const isSelected = selectedPlace?.id === item.id;
          const favorited = isFavorite(item.id);

          return (
            <div
              key={item.id}
              onClick={() => onSelectPlace(item)}
              className={`bg-white rounded-2xl p-3 border transition-all cursor-pointer flex space-x-3.5 hover:shadow-md ${
                isSelected
                  ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/20 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Image */}
              <div className="relative w-28 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
                <img
                  src={item.heroImage}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item);
                  }}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-700 hover:text-rose-500"
                >
                  <Heart className={`w-3.5 h-3.5 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
                </button>
              </div>

              {/* Info */}
              <div className="flex-1 flex flex-col justify-between min-w-0">
                <div>
                  <div className="flex items-center space-x-1 text-[11px] text-slate-500 mb-0.5">
                    <MapPin className="w-3 h-3 text-orange-500 flex-shrink-0" />
                    <span className="truncate">{item.city}</span>
                  </div>

                  <h4 className="font-bold text-sm text-slate-900 leading-snug line-clamp-1 hover:text-orange-600 transition-colors">
                    {item.name}
                  </h4>

                  {/* Rating + Bayesian */}
                  <div className="mt-1">
                    <RatingBadge
                      rating={item.rating}
                      reviewCount={item.reviewCount}
                      showBayesianDetail={true}
                      size="sm"
                    />
                  </div>
                </div>

                {/* Price & Detail Link */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 mt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Chỉ từ</span>
                    <span className="text-sm font-extrabold text-slate-900">
                      {formatCurrencyVND(item.priceFrom)}
                    </span>
                  </div>

                  <Link
                    to={`/places/${item.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center"
                  >
                    <span>Chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
                  </Link>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};
