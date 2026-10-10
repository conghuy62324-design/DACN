import React from 'react';
import { Search, Filter, Star, Sparkles, MapPin } from 'lucide-react';

interface FilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  minRating: number;
  setMinRating: (v: number) => void;
  sortBy: string;
  setSortBy: (v: string) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  setSearch,
  category,
  setCategory,
  city,
  setCity,
  minRating,
  setMinRating,
  sortBy,
  setSortBy,
}) => {
  const cities = ['Tất cả', 'Đà Nẵng', 'Phú Quốc', 'Sapa', 'Hạ Long', 'Hà Giang', 'Hội An'];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 mb-4 space-y-3">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm địa điểm, khách sạn, nhà hàng..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none"
        />
      </div>

      {/* Categories Buttons */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'tour', label: 'Tour & Điểm đến' },
          { id: 'hotel', label: 'Khách sạn' },
          { id: 'restaurant', label: 'Nhà hàng' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCategory(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              category === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Select Filters (City, Min Rating, Sort) */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-xs">
        {/* City Filter */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Tỉnh / Thành</label>
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium text-slate-700 outline-none"
          >
            {cities.map((c) => (
              <option key={c} value={c === 'Tất cả' ? 'all' : c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Min Rating */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Đánh giá tối thiểu</label>
          <select
            value={minRating}
            onChange={(e) => setMinRating(parseFloat(e.target.value))}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-medium text-slate-700 outline-none"
          >
            <option value={0}>Tất cả sao</option>
            <option value={4.0}>Từ 4.0 ★</option>
            <option value={4.5}>Từ 4.5 ★</option>
            <option value={4.8}>Từ 4.8 ★</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Sắp xếp theo</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 font-bold text-orange-600 outline-none"
          >
            <option value="bayesian">★ Bayesian (Uy tín nhất)</option>
            <option value="rating">Điểm sao cao nhất</option>
            <option value="priceAsc">Giá thấp đến cao</option>
            <option value="priceDesc">Giá cao đến thấp</option>
          </select>
        </div>
      </div>
    </div>
  );
};
