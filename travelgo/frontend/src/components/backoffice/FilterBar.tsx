import React, { useId, useRef, useState } from 'react';
import { SlidersHorizontal, Search, X } from 'lucide-react';
import { BoButton } from './BoButton';
import { useFocusTrap, useScrollLock } from './overlay';

export interface FilterBarSearch {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Nhãn (dùng làm aria-label, giữ nhãn e2e cũ nếu có). */
  label: string;
  maxLength?: number;
}

export interface FilterBarProps {
  search?: FilterBarSearch;
  /** Các ô lọc (select, date…). */
  children?: React.ReactNode;
  activeCount: number;
  onReset: () => void;
  /** Lọc phía server: gọi khi Enter ở ô tìm hoặc "Áp dụng". */
  onSubmit?: () => void;
  /** Dòng ghi chú 13 muted (vd. "Lọc trong trang hiện tại"). */
  note?: React.ReactNode;
}

/**
 * ≥768: 1 hàng, tự xuống dòng. <768: ô tìm + nút "Bộ lọc (n)" mở bottom sheet 80dvh.
 * Trang tự ghi trạng thái lọc vào URL query (xem useQueryParams).
 */
export const FilterBar: React.FC<FilterBarProps> = ({ search, children, activeCount, onReset, onSubmit, note }) => {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const searchId = useId();
  const sheetTitleId = useId();
  const hasFields = React.Children.toArray(children).some(Boolean);
  useFocusTrap(open, panelRef, () => setOpen(false), { returnFocus: toggleRef });
  useScrollLock(open);

  return (
    <div className="hgbo-filter">
      {search && (
        <form
          className="hgbo-filter__search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit?.();
          }}
        >
          <label className="hgbo-sr" htmlFor={searchId}>{search.label}</label>
          <Search aria-hidden="true" />
          <input
            id={searchId}
            className="hgbo-input"
            type="search"
            value={search.value}
            placeholder={search.placeholder}
            maxLength={search.maxLength}
            aria-label={search.label}
            onChange={(event) => search.onChange(event.target.value)}
          />
        </form>
      )}
      {hasFields && (
        <>
          <button
            ref={toggleRef}
            type="button"
            className="hgbo-btn hgbo-btn--secondary hgbo-filter__toggle"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <span className="hgbo-btn__content">
              <SlidersHorizontal aria-hidden="true" />
              Bộ lọc{activeCount > 0 ? ` (${activeCount})` : ''}
            </span>
          </button>
          {open && <div className="hgbo-overlay hgbo-overlay--modal hgbo-filter-overlay is-open" aria-hidden="true" onClick={() => setOpen(false)} />}
          <div
            ref={panelRef}
            className={`hgbo-filter__panel ${open ? 'is-open' : ''}`.trim()}
            role={open ? 'dialog' : undefined}
            aria-modal={open || undefined}
            aria-labelledby={open ? sheetTitleId : undefined}
          >
            <div className="hgbo-filter__sheethead">
              <span id={sheetTitleId}>Bộ lọc</span>
              <BoButton variant="ghost" icon={X} aria-label="Đóng bộ lọc" onClick={() => setOpen(false)} />
            </div>
            <div className="hgbo-filter__fields">
              {children}
              {activeCount > 0 && (
                <BoButton variant="ghost" className="hgbo-filter__reset-inline" onClick={onReset}>Xóa lọc</BoButton>
              )}
            </div>
            <div className="hgbo-filter__sheetfoot">
              <BoButton variant="secondary" disabled={activeCount === 0} onClick={onReset}>Xóa lọc</BoButton>
              <BoButton
                variant="primary"
                onClick={() => {
                  onSubmit?.();
                  setOpen(false);
                }}
              >
                Áp dụng
              </BoButton>
            </div>
          </div>
        </>
      )}
      {!hasFields && activeCount > 0 && (
        <BoButton variant="ghost" onClick={onReset}>Xóa lọc</BoButton>
      )}
      {note && <p className="hgbo-filter__note">{note}</p>}
    </div>
  );
};

export interface FilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  /** Nhãn của lựa chọn "tất cả" (value ""). */
  allLabel?: string;
  id?: string;
}

/** Select gọn cho FilterBar: nhãn trên, cao 40 (mobile 44). */
export const FilterSelect: React.FC<FilterSelectProps> = ({ label, value, onChange, options, allLabel = 'Tất cả', id }) => {
  const auto = useId();
  const fid = id || auto;
  return (
    <div className="hgbo-field">
      <label className="hgbo-field__label" htmlFor={fid}>{label}</label>
      <select id={fid} className="hgbo-select" value={value} aria-label={label} onChange={(event) => onChange(event.target.value)}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
};
