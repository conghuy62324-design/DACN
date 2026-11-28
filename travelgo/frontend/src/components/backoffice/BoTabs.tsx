import React, { useRef } from 'react';
import { Link } from 'react-router-dom';

export interface BoTabItem {
  key: string;
  label: string;
  to?: string;
  badge?: number | string | null;
  disabled?: boolean;
}

export interface BoTabsProps {
  items: BoTabItem[];
  value: string;
  onChange?: (key: string) => void;
  /** aria-label cho nhóm tab */
  label?: string;
  className?: string;
}

const Badge: React.FC<{ value: BoTabItem['badge'] }> = ({ value }) => {
  if (value === null || value === undefined || value === '') return null;
  return <span className="hgbo-tab__badge">{value}</span>;
};

/** Tab gạch chân. Mục có `to` là link (đồng bộ URL); không có `to` thì là role="tablist". */
export const BoTabs: React.FC<BoTabsProps> = ({ items, value, onChange, label = 'Chọn mục', className = '' }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const linkMode = items.some((item) => item.to);

  if (linkMode) {
    return (
      <nav className={`hgbo-tabs ${className}`.trim()} aria-label={label}>
        {items.map((item) =>
          item.disabled || !item.to ? (
            <span key={item.key} className="hgbo-tab" aria-disabled="true">
              {item.label}
              <Badge value={item.badge} />
            </span>
          ) : (
            <Link
              key={item.key}
              to={item.to}
              className="hgbo-tab"
              aria-current={item.key === value ? 'page' : undefined}
              onClick={() => onChange?.(item.key)}
            >
              {item.label}
              <Badge value={item.badge} />
            </Link>
          ),
        )}
      </nav>
    );
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
    const enabled = items.filter((item) => !item.disabled);
    const index = enabled.findIndex((item) => item.key === value);
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % enabled.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + enabled.length) % enabled.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = enabled.length - 1;
    event.preventDefault();
    const target = enabled[next];
    if (!target) return;
    onChange?.(target.key);
    window.requestAnimationFrame(() => listRef.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(target.key)}"]`)?.focus());
  };

  return (
    <div ref={listRef} className={`hgbo-tabs ${className}`.trim()} role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          data-key={item.key}
          className="hgbo-tab"
          aria-selected={item.key === value}
          tabIndex={item.key === value ? 0 : -1}
          disabled={item.disabled}
          onClick={() => onChange?.(item.key)}
        >
          {item.label}
          <Badge value={item.badge} />
        </button>
      ))}
    </div>
  );
};
