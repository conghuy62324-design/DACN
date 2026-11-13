import {CatalogPageFilters,CatalogPagination,useCatalogPage} from '../components/explore/CatalogPageFilters';
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
  const catalog=useCatalogPage('hotel');
  const hotels=catalog.items;
  const {toggleFavorite,isFavorite}=useFavorites();
  const {openBooking}=useBooking();

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
            Tìm nơi lưu trú theo điểm đến, loại hình và tiện ích. Kiểm tra thông tin giá và xác nhận dịch vụ trước khi đặt.
          </p>
        </div>

        <CatalogPageFilters {...catalog}/>

        {/* Hotel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {hotels.map((h) => {
            const favorited = isFavorite(h.id);

            return (
              <div
                key={h.id}
                data-testid="service-catalog-card"
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

                    <Link className="text-sm font-bold text-teal-700 underline" to={'/assistant?listing='+encodeURIComponent(h.id)}>Tư vấn bằng AI</Link>
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

                <div className="p-6 pt-0 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between mt-4">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Giá từ catalog, đơn vị chưa xác minh</span>
                    <span className="text-2xl font-black text-slate-900">{h.priceFrom==null?'Chưa có giá':formatCurrencyVND(h.priceFrom)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/places/${h.id}`}
                      className="px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Xem chi tiết
                    </Link>
                    <button
                      disabled={h.isDemo||h.priceFrom==null}
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
                      {h.isDemo?'DEMO · Không nhận đặt':'Đặt dịch vụ'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <CatalogPagination {...catalog}/>
      </div>
    </div>
  );
};
