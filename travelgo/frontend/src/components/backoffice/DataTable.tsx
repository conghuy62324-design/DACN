import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BoMenu, BoMenuItem } from './BoMenu';
import { boButtonClass } from './BoButton';
import { EmptyState, ErrorState, Skeleton } from './States';
import { fmtNumber } from './format';

export interface DataColumn<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  hideBelow?: 768 | 1024 | 1280;
  primary?: boolean;
  /** Vai trò ở chế độ card (<768). Mặc định: primary → title, key 'status' → status, còn lại → meta. */
  card?: 'title' | 'status' | 'meta' | 'hide';
  /** Nhãn chữ thuần dùng trong card khi header là node. */
  cardLabel?: string;
}

export interface RowAction {
  label: string;
  onClick?: () => void;
  to?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: 'danger' | 'primary';
  disabled?: boolean;
  title?: string;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  onChange: (page: number, limit: number) => void;
  sizes?: number[];
}

export interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty: { title: string; description?: React.ReactNode; action?: React.ReactNode; icon?: LucideIcon };
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  pagination?: Pagination;
  onRowClick?: (row: T) => void;
  selectedKey?: string | null;
  rowActions?: (row: T) => RowAction[];
  /** Ẩn với mắt, cho screen reader. */
  caption: string;
  mobile?: 'cards' | 'scroll';
  /** Lớp nền cho dòng (vd. tô warning). */
  rowClassName?: (row: T) => string | undefined;
}

const hideClass = (hideBelow?: number) => (hideBelow ? `hgbo-hide-${hideBelow}` : '');
const alignClass = (align?: string) => (align === 'right' ? 'is-right' : align === 'center' ? 'is-center' : '');

const cellValue = <T,>(column: DataColumn<T>, row: T, index: number): React.ReactNode => {
  if (column.render) return column.render(row, index);
  const value = (row as any)[column.key];
  return value === null || value === undefined || value === '' ? '—' : String(value);
};

const InlineAction: React.FC<{ action: RowAction }> = ({ action }) => {
  const Icon = action.icon;
  const variant = action.tone === 'primary' ? 'primary' : action.tone === 'danger' ? 'ghost-danger' : 'ghost';
  const cls = boButtonClass(variant, 'sm');
  const content = (
    <span className="hgbo-btn__content">
      {Icon && <Icon aria-hidden="true" />}
      {action.label}
    </span>
  );
  const stop = (event: React.SyntheticEvent) => event.stopPropagation();
  if (action.to && !action.disabled) {
    return (
      <Link className={cls} to={action.to} title={action.title} onClick={stop}>
        {content}
      </Link>
    );
  }
  if (action.href && !action.disabled) {
    return (
      <a className={cls} href={action.href} target="_blank" rel="noopener" title={action.title} onClick={stop}>
        {content}
      </a>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      disabled={action.disabled}
      title={action.title}
      onClick={(event) => {
        event.stopPropagation();
        action.onClick?.();
      }}
    >
      {content}
    </button>
  );
};

const Actions: React.FC<{ actions: RowAction[]; label: string }> = ({ actions, label }) => {
  if (!actions.length) return null;
  const inline = actions.length <= 2 ? actions : actions.slice(0, 2);
  const rest = actions.length <= 2 ? [] : actions.slice(2);
  return (
    <>
      {inline.map((action) => (
        <InlineAction key={action.label} action={action} />
      ))}
      {rest.length > 0 && (
        <BoMenu
          label={`Thao tác khác cho ${label}`}
          items={rest.map<BoMenuItem>((action) => ({ ...action, tone: action.tone === 'danger' ? 'danger' : undefined }))}
        />
      )}
    </>
  );
};

function pageList(page: number, pages: number): (number | 'gap')[] {
  if (pages <= 5) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page, page - 1, page + 1]);
  const sorted = Array.from(set).filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b).slice(0, 5);
  const out: (number | 'gap')[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push('gap');
    out.push(p);
  });
  return out;
}

const Pager: React.FC<{ pagination: Pagination }> = ({ pagination }) => {
  const { page, limit, total, onChange, sizes = [20, 50, 100] } = pagination;
  const pages = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <nav className="hgbo-pager" aria-label="Phân trang">
      <span className="hgbo-num">
        Hiển thị {fmtNumber(from)}–{fmtNumber(to)} trên {fmtNumber(total)}
      </span>
      <div className="hgbo-pager__pages">
        <button type="button" className="hgbo-pager__btn" aria-label="Trang trước" disabled={page <= 1} onClick={() => onChange(page - 1, limit)}>
          <ChevronLeft aria-hidden="true" />
        </button>
        {pageList(page, pages).map((p, i) =>
          p === 'gap' ? (
            <span key={`gap-${i}`} className="hgbo-pager__gap" aria-hidden="true">…</span>
          ) : (
            <button
              key={p}
              type="button"
              className="hgbo-pager__btn"
              aria-label={`Trang ${p}`}
              aria-current={p === page ? 'page' : undefined}
              onClick={() => onChange(p, limit)}
            >
              {p}
            </button>
          ),
        )}
        <button type="button" className="hgbo-pager__btn" aria-label="Trang sau" disabled={page >= pages} onClick={() => onChange(page + 1, limit)}>
          <ChevronRight aria-hidden="true" />
        </button>
      </div>
      <label className="hgbo-pager__size">
        <span>Mỗi trang</span>
        <select className="hgbo-select" value={limit} onChange={(event) => onChange(1, Number(event.target.value))}>
          {sizes.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
      </label>
    </nav>
  );
};

/** Bảng dữ liệu. <768 mặc định chuyển thành card. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  error,
  onRetry,
  empty,
  sort,
  onSortChange,
  pagination,
  onRowClick,
  selectedKey,
  rowActions,
  caption,
  mobile = 'cards',
  rowClassName,
}: DataTableProps<T>) {
  const hasActions = !!rowActions;
  const primary = columns.find((c) => c.primary) || columns[0];
  const cardRole = (column: DataColumn<T>) => column.card || (column === primary ? 'title' : column.key === 'status' ? 'status' : column.hideBelow === 1280 ? 'hide' : 'meta');
  const titleOf = (row: T, index: number) => {
    const value = cellValue(primary, row, index);
    return typeof value === 'string' ? value : rowKey(row);
  };

  const headerCell = (column: DataColumn<T>) => {
    const active = sort?.key === column.key;
    const ariaSort = column.sortable ? (active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined;
    const SortIcon = !active ? ArrowUpDown : sort!.dir === 'asc' ? ArrowUp : ArrowDown;
    return (
      <th
        key={column.key}
        scope="col"
        aria-sort={ariaSort as any}
        className={[hideClass(column.hideBelow), alignClass(column.align), column.primary ? 'is-primary' : ''].filter(Boolean).join(' ') || undefined}
        style={column.width ? { width: column.width } : undefined}
      >
        {column.sortable && onSortChange ? (
          <button
            type="button"
            className="hgbo-dt__sort"
            onClick={() => onSortChange({ key: column.key, dir: active && sort!.dir === 'asc' ? 'desc' : 'asc' })}
          >
            {column.header}
            <SortIcon aria-hidden="true" />
          </button>
        ) : (
          column.header
        )}
      </th>
    );
  };

  let body: React.ReactNode;
  if (loading) {
    body = Array.from({ length: 5 }, (_, i) => (
      <tr key={`skel-${i}`} className="hgbo-dt__skel">
        {columns.map((column) => (
          <td key={column.key} className={hideClass(column.hideBelow) || undefined}>
            <Skeleton height={14} width={column.primary ? '80%' : '60%'} />
          </td>
        ))}
        {hasActions && <td />}
      </tr>
    ));
  } else if (!error && rows.length) {
    body = rows.map((row, index) => {
      const key = rowKey(row);
      const selected = selectedKey === key;
      return (
        <tr
          key={key}
          className={['hgbo-dt__row', onRowClick ? 'hgbo-dt__row--click' : '', selected ? 'is-selected' : '', rowClassName?.(row) || ''].filter(Boolean).join(' ')}
          aria-selected={onRowClick ? selected : undefined}
          tabIndex={onRowClick ? 0 : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onKeyDown={onRowClick ? (event) => {
            if ((event.key === 'Enter' || event.key === ' ') && event.target === event.currentTarget) {
              event.preventDefault();
              onRowClick(row);
            }
          } : undefined}
        >
          {columns.map((column) => (
            <td
              key={column.key}
              className={[hideClass(column.hideBelow), alignClass(column.align), column.primary ? 'is-primary' : ''].filter(Boolean).join(' ') || undefined}
            >
              {cellValue(column, row, index)}
            </td>
          ))}
          {hasActions && (
            <td className="is-right">
              <div className="hgbo-dt__actions">
                <Actions actions={rowActions!(row)} label={titleOf(row, index)} />
              </div>
            </td>
          )}
        </tr>
      );
    });
  }

  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <div className={`hgbo-dt ${mobile === 'cards' ? 'hgbo-dt--cards' : ''}`.trim()} aria-busy={loading || undefined}>
      {error && !loading ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : showEmpty ? (
        <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={empty.action} />
      ) : (
        <>
          <div className="hgbo-dt__scroll">
            <table className="hgbo-dt__table">
              <caption className="hgbo-sr">{caption}</caption>
              <thead>
                <tr>
                  {columns.map(headerCell)}
                  {hasActions && (
                    <th scope="col" className="is-right">
                      <span className="hgbo-sr">Thao tác</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>{body}</tbody>
            </table>
          </div>
          {mobile === 'cards' && (
            <div className="hgbo-dt__cards" role="list" aria-label={caption}>
              {loading
                ? Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="hgbo-dt-card" role="listitem">
                      <Skeleton width="70%" height={16} />
                      <div className="hgbo-dt-card__meta">
                        <Skeleton width="50%" height={12} />
                        <Skeleton width="40%" height={12} />
                      </div>
                    </div>
                  ))
                : rows.map((row, index) => {
                    const key = rowKey(row);
                    const statusCol = columns.find((c) => cardRole(c) === 'status');
                    const metaCols = columns.filter((c) => cardRole(c) === 'meta');
                    const actions = rowActions ? rowActions(row) : [];
                    return (
                      <div key={key} role="listitem" className={`hgbo-dt-card ${selectedKey === key ? 'is-selected' : ''} ${rowClassName?.(row) || ''}`.trim()}>
                        <div className="hgbo-dt-card__head">
                          <div className="hgbo-dt-card__title">
                            {onRowClick ? (
                              <button type="button" className="hgbo-dt-card__titlebtn" onClick={() => onRowClick(row)}>
                                {cellValue(primary, row, index)}
                              </button>
                            ) : (
                              cellValue(primary, row, index)
                            )}
                          </div>
                          {statusCol && <div>{cellValue(statusCol, row, index)}</div>}
                        </div>
                        {metaCols.length > 0 && (
                          <div className="hgbo-dt-card__meta">
                            {metaCols.map((column) => (
                              <div key={column.key}>
                                <span className="hgbo-dt-card__k">{column.cardLabel || (typeof column.header === 'string' ? column.header : '')}</span>
                                {(column.cardLabel || typeof column.header === 'string') && ': '}
                                {cellValue(column, row, index)}
                              </div>
                            ))}
                          </div>
                        )}
                        {actions.length > 0 && (
                          <div className="hgbo-dt-card__actions">
                            <Actions actions={actions} label={titleOf(row, index)} />
                          </div>
                        )}
                      </div>
                    );
                  })}
            </div>
          )}
        </>
      )}
      {pagination && !error && (pagination.total > 0 || pagination.page > 1) && <Pager pagination={pagination} />}
      {loading && <span className="hgbo-sr" role="status">Đang tải dữ liệu…</span>}
    </div>
  );
}
