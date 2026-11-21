import {LocationCombobox} from '../common/LocationCombobox';
import React from 'react';
import { LockKeyhole, Search, SlidersHorizontal, Sparkles, WalletCards } from 'lucide-react';
import { PREFERENCE_OPTIONS } from '../../constants/travelPreferences';
import '../../styles/hg-catalog.css';

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
  const formattedBudget = budgetInput && /^\d+$/.test(budgetInput)
    ? `${Number(budgetInput).toLocaleString('vi-VN')} ₫/ngày/người`
    : undefined;

  return (
    <section data-testid="explore-smart-filters" className="hg-cat-panel hg-cat-smart">
      <div className="hg-cat-smart__head">
        <Sparkles size={18} aria-hidden="true" />
        <div>
          <h2 className="hg-cat-panel__title">Gợi ý theo tiêu chí của bạn</h2>
          <p className="hg-cat-note">
            Heuristic minh bạch kết hợp sở thích, giá từ và uy tín Bayesian — không phải mô hình Learning-to-Rank.
          </p>
        </div>
      </div>

      <div className="hg-cat-form">
        <div>
          <div className="hg-cat-field__row hg-cat-smart__label">
            <span className="hg-cat-subhead">Bạn thích trải nghiệm nào?</span>
            <span className="hg-cat-note">Chọn nhiều</span>
          </div>
          <div className="hg-cat-chips" aria-label="Sở thích du lịch">
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
                  className="hg-cat-chip"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {!isAuthenticated ? (
            <p className="hg-cat-note hg-cat-smart__hint">
              <LockKeyhole size={14} aria-hidden="true" /> Đăng nhập để dùng sở thích và ngân sách cho lần gợi ý này.
            </p>
          ) : !personalizationEnabled ? (
            <p data-testid="explore-one-shot-note" className="hg-cat-note hg-cat-smart__hint">
              Cá nhân hóa đang tắt: lựa chọn này chỉ dùng cho lần gợi ý hiện tại, không lưu vào hồ sơ.
            </p>
          ) : (
            <p className="hg-cat-note hg-cat-smart__hint">Sở thích được gửi tới máy chủ để xếp hạng địa điểm đủ điều kiện.</p>
          )}
        </div>

        <label htmlFor="explore-budget" className="hg-cat-field">
          <span className="hg-cat-smart__label"><WalletCards size={16} aria-hidden="true" /> Ngân sách mỗi ngày / người</span>
          <span className="hg-cat-inputwrap">
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
              className="hg-cat-input"
            />
            <i aria-hidden="true">VND</i>
          </span>
          <span id="explore-budget-help" className={'hg-cat-field__hint' + (budgetError ? ' hg-cat-field__hint--error' : '')}>
            {budgetError || formattedBudget || 'Để trống nếu không muốn dùng ngân sách. Giá chỉ là ước tính từ giá tham khảo.'}
          </span>
        </label>

        <hr className="hg-cat-divider" />

        <span className="hg-cat-inputwrap">
          <Search size={18} aria-hidden="true" />
          <input
            data-testid="explore-search"
            type="search"
            aria-label="Tìm địa điểm"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Tìm địa điểm, khách sạn, nhà hàng..."
            className="hg-cat-input"
          />
        </span>

        <div className="hg-cat-chips" aria-label="Loại địa điểm">
          {[
            { id: 'all', label: 'Tất cả' },
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
              className="hg-cat-chip"
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="hg-cat-filters">
          <LocationCombobox label="Địa phương nâng cao" value={city} onChange={setCity}/>

          <label className="hg-cat-field">
            <span>Đánh giá tối thiểu</span>
            <select
              data-testid="explore-min-rating"
              value={minRating}
              onChange={(event) => setMinRating(Number(event.target.value))}
              className="hg-cat-select"
            >
              <option value={0}>Tất cả</option>
              <option value={4}>Từ 4,0 ★</option>
              <option value={4.5}>Từ 4,5 ★</option>
              <option value={4.8}>Từ 4,8 ★</option>
            </select>
          </label>

          {isAuthenticated ? (
            <div data-testid="explore-server-rank" className="hg-cat-field">
              <span><SlidersHorizontal size={14} aria-hidden="true" /> Thứ tự</span>
              <span className="hg-cat-tag">Xếp hạng từ máy chủ</span>
            </div>
          ) : (
            <label className="hg-cat-field">
              <span>Sắp xếp</span>
              <select
                data-testid="explore-public-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="hg-cat-select"
              >
                <option value="bayesian">Uy tín (Bayesian)</option>
                <option value="priceAsc">Giá từ thấp đến cao</option>
                <option value="priceDesc">Giá từ cao đến thấp</option>
              </select>
            </label>
          )}
        </div>
      </div>
    </section>
  );
};
