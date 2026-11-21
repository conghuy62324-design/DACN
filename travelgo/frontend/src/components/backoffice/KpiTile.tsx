import React from 'react';
import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from './States';
import { fmtNumber } from './format';

export interface KpiTileProps {
  label: string;
  value: number | null | undefined;
  loading?: boolean;
  href?: string;
  tone?: 'neutral' | 'warning' | 'danger' | 'success';
  icon?: LucideIcon;
  hint?: string;
  /** Định dạng số tùy chọn (vd. "100+"). Không có kiểu tiền tệ. */
  format?: (value: number) => string;
}

/** Ô KPI. `null/undefined` → "—" + "Chưa có dữ liệu" (không tự đổi thành 0). */
export const KpiTile: React.FC<KpiTileProps> = ({ label, value, loading = false, href, tone = 'neutral', icon: Icon, hint, format }) => {
  const missing = value === null || value === undefined || Number.isNaN(Number(value));
  const shown = missing ? '—' : format ? format(Number(value)) : fmtNumber(Number(value));
  const hintText = missing && !loading ? hint || 'Chưa có dữ liệu' : hint;
  const body = (
    <>
      <div className="hgbo-kpi__top">
        <span className="hgbo-kpi__label">{label}</span>
        {Icon && (
          <span className={`hgbo-kpi__icon ${tone !== 'neutral' ? `hgbo-kpi__icon--${tone}` : ''}`.trim()} aria-hidden="true">
            <Icon />
          </span>
        )}
      </div>
      {loading ? (
        <Skeleton width={96} height={28} />
      ) : (
        <span className="hgbo-kpi__value">{shown}</span>
      )}
      {hintText && !loading && <span className="hgbo-kpi__hint">{hintText}</span>}
    </>
  );
  if (href) {
    return (
      <Link className="hgbo-kpi" to={href} aria-busy={loading || undefined}>
        {body}
      </Link>
    );
  }
  return (
    <div className="hgbo-kpi" aria-busy={loading || undefined}>
      {body}
    </div>
  );
};
