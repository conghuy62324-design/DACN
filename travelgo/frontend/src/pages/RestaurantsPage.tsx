import {CatalogPageFilters,CatalogPagination,useCatalogPage} from '../components/explore/CatalogPageFilters';
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
  const catalog=useCatalogPage('restaurant');
  const restaurants=catalog.items;
  const {toggleFavorite,isFavorite}=useFavorites();
  const {openBooking}=useBooking();

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
            Tìm quán ăn theo loại ẩm thực và ngân sách. Thực đơn, chất gây dị ứng và tình trạng bàn cần được nhà cung cấp xác nhận riêng.
          </p>
        </div>

        <CatalogPageFilters {...catalog}/>

        {/* Restaurant Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {restaurants.map((rest) => {
            const favorited = isFavorite(rest.id);

            return (
              <div
                key={rest.id}
                data-testid="service-catalog-card"
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

                    <Link className="text-sm font-bold text-teal-700 underline" to={'/assistant?listing='+encodeURIComponent(rest.id)}>Tư vấn bằng AI</Link>
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

                <div className="p-6 pt-0 border-t border-slate-100 flex flex-wrap gap-3 items-center justify-between mt-4">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Giá từ catalog, đơn vị chưa xác minh</span>
                    <span className="text-xl font-black text-slate-900">{rest.priceFrom==null?'Chưa có giá':formatCurrencyVND(rest.priceFrom)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/places/${rest.id}`}
                      className="px-4 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      Xem chi tiết
                    </Link>
                    <button
                      disabled={rest.isDemo||rest.priceFrom==null}
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
                      <span>{rest.isDemo?'DEMO · Không nhận đặt':'Đặt dịch vụ'}</span>
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
