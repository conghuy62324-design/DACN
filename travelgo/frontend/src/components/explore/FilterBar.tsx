import React from 'react';
import { LockKeyhole, Search, SlidersHorizontal, Sparkles, WalletCards } from 'lucide-react';
import { PREFERENCE_OPTIONS } from '../../constants/travelPreferences';

interface FilterBarProps {
  search: string;
  setSearch: (value: string) => void;
  category: string;
  setCategory: (value: string) => void;
  city: string;
  setCity: (value: string) => void;
  minRating: number;
  setMinRating: (value: number) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  preferences: string[];
  togglePreference: (value: string) => void;
  budgetInput: string;
  setBudgetInput: (value: string) => void;
  budgetError?: string;
  isAuthenticated: boolean;
  personalizationEnabled: boolean;
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
  preferences,
  togglePreference,
  budgetInput,
  setBudgetInput,
  budgetError,
  isAuthenticated,
  personalizationEnabled,
}) => {
  const cities = ['Tất cả', 'Đà Nẵng', 'Phú Quốc', 'Sapa', 'Hạ Long', 'Hà Giang', 'Hội An'];
  const formattedBudget = budgetInput && /^\d+$/.test(budgetInput)
    ? `${Number(budgetInput).toLocaleString('vi-VN')} ₫/ngày/người`
    : undefined;

  return (
    <section data-testid="explore-smart-filters" className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-4 py-4 text-white sm:px-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-white/10 p-2 ring-1 ring-white/15">
            <Sparkles className="h-4 w-4 text-amber-300" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold tracking-tight">Gợi ý theo tiêu chí của bạn</h2>
            <p className="mt-1 text-xs leading-5 text-slate-300">
              Heuristic minh bạch kết hợp sở thích, giá từ và uy tín Bayesian — không phải mô hình Learning-to-Rank.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <label className="text-xs font-extrabold text-slate-800">Bạn thích trải nghiệm nào?</label>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Chọn nhiều</span>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Sở thích du lịch">
            {PREFERENCE_OPTIONS.map((option) => {
              const selected = preferences.includes(option.id);
              return (
                <button
                  key={option.id}
                  type="button"
                  data-testid={`explore-preference-${option.id}`}
                  aria-pressed={selected}
                  disabled={!isAuthenticated}
                  onClick={() => togglePreference(option.id)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-45 ${
                    selected
                      ? 'border-teal-600 bg-teal-600 text-white shadow-sm shadow-teal-600/20'
                      : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {!isAuthenticated ? (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] leading-4 text-slate-500">
              <LockKeyhole className="h-3.5 w-3.5 shrink-0" /> Đăng nhập để dùng preference và ngân sách one-shot.
            </p>
          ) : !personalizationEnabled ? (
            <p data-testid="explore-one-shot-note" className="mt-2 text-[11px] leading-4 text-teal-700">
              Personalization đang tắt: lựa chọn này chỉ dùng cho lần gợi ý hiện tại, không lưu vào hồ sơ.
            </p>
          ) : (
            <p className="mt-2 text-[11px] leading-4 text-slate-500">Sở thích được gửi tới backend để xếp hạng Place đủ điều kiện.</p>
          )}
        </div>

        <div>
          <label htmlFor="explore-budget" className="mb-2 flex items-center gap-2 text-xs font-extrabold text-slate-800">
            <WalletCards className="h-4 w-4 text-orange-500" /> Ngân sách mỗi ngày / người
          </label>
          <div className="relative">
            <input
              id="explore-budget"
              data-testid="explore-budget"
              inputMode="numeric"
              autoComplete="off"
              value={budgetInput}
              disabled={!isAuthenticated}
              onChange={(event) => setBudgetInput(event.target.value)}
              placeholder="Ví dụ: 1500000"
              aria-invalid={Boolean(budgetError)}
              aria-describedby="explore-budget-help"
              className={`w-full rounded-xl border bg-slate-50 px-3 py-2.5 pr-14 text-sm font-semibold text-slate-800 outline-none transition focus:bg-white focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                budgetError ? 'border-rose-300 focus:ring-rose-200' : 'border-slate-200 focus:border-orange-400 focus:ring-orange-100'
              }`}
            />
            <span className="pointer-events-none absolute right-3 top-2.5 text-xs font-bold text-slate-400">VND</span>
          </div>
          <p id="explore-budget-help" className={`mt-1.5 text-[11px] leading-4 ${budgetError ? 'text-rose-600' : 'text-slate-500'}`}>
            {budgetError || formattedBudget || 'Để trống nếu không muốn dùng ngân sách. Giá chỉ là ước tính từ priceFrom.'}
          </p>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <div className="relative mb-3">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              data-testid="explore-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm địa điểm, khách sạn, nhà hàng..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="mb-3 flex items-center gap-2 overflow-x-auto pb-1" aria-label="Loại địa điểm">
            {[
              { id: 'all', label: 'Tất cả Place' },
              { id: 'attraction', label: 'Tham quan' },
              { id: 'hotel', label: 'Khách sạn' },
              { id: 'restaurant', label: 'Nhà hàng' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`explore-category-${tab.id}`}
                aria-pressed={category === tab.id}
                onClick={() => setCategory(tab.id)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  category === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Tỉnh / Thành
              <select
                data-testid="explore-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none"
              >
                {cities.map((value) => <option key={value} value={value === 'Tất cả' ? 'all' : value}>{value}</option>)}
              </select>
            </label>

            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Đánh giá tối thiểu
              <select
                data-testid="explore-min-rating"
                value={minRating}
                onChange={(event) => setMinRating(Number(event.target.value))}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-semibold normal-case tracking-normal text-slate-700 outline-none"
              >
                <option value={0}>Tất cả sao</option>
                <option value={4}>Từ 4.0 ★</option>
                <option value={4.5}>Từ 4.5 ★</option>
                <option value={4.8}>Từ 4.8 ★</option>
              </select>
            </label>

            {isAuthenticated ? (
              <div data-testid="explore-server-rank" className="rounded-lg border border-teal-100 bg-teal-50 p-2">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-teal-700">
                  <SlidersHorizontal className="h-3 w-3" /> Thứ tự
                </span>
                <span className="mt-1 block text-xs font-bold text-slate-800">Xếp hạng từ server</span>
              </div>
            ) : (
              <label className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Sắp xếp public
                <select
                  data-testid="explore-public-sort"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs font-bold normal-case tracking-normal text-orange-600 outline-none"
                >
                  <option value="bayesian">Bayesian uy tín</option>
                  <option value="priceAsc">Giá từ thấp đến cao</option>
                  <option value="priceDesc">Giá từ cao đến thấp</option>
                </select>
              </label>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
