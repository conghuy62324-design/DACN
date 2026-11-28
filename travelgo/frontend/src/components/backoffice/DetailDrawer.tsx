import React, { useId, useRef } from 'react';
import { X } from 'lucide-react';
import { Portal, useFocusTrap, useScrollLock } from './overlay';
import { StatusPill } from './StatusPill';
import { StatusDomain } from './statusLabels';
import { ErrorState, LoadingState } from './States';

export interface DetailDrawerProps {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Mã trạng thái → StatusPill ở header; hoặc truyền node tùy ý. */
  status?: string | React.ReactNode;
  statusDomain?: StatusDomain;
  width?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}

/** Drawer chi tiết trượt từ phải. Focus trap, Esc đóng. Trang tự gắn drawer với URL. */
export const DetailDrawer: React.FC<DetailDrawerProps> = ({ open, onClose, title, subtitle, status, statusDomain, width = 'md', loading, error, onRetry, footer, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useFocusTrap(open, ref, onClose);
  useScrollLock(open);
  if (!open) return null;
  return (
    <Portal>
      <div className="hgbo-overlay" aria-hidden="true" onClick={onClose} />
      <div
        ref={ref}
        className={`hgbo-drawer ${width !== 'md' ? `hgbo-drawer--${width}` : ''}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="hgbo-drawer__head">
          <div className="hgbo-drawer__titles">
            <h2 className="hgbo-drawer__title" id={titleId}>{title}</h2>
            {subtitle && <p className="hgbo-drawer__subtitle">{subtitle}</p>}
          </div>
          {typeof status === 'string' ? <StatusPill status={status} domain={statusDomain} /> : status}
          <button type="button" className="hgbo-btn hgbo-btn--ghost hgbo-btn--icon" aria-label="Đóng" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="hgbo-drawer__body">
          {loading ? <LoadingState variant="detail" rows={6} /> : error ? <ErrorState message={error} onRetry={onRetry} plain /> : children}
        </div>
        {footer && !loading && !error && <div className="hgbo-drawer__foot">{footer}</div>}
      </div>
    </Portal>
  );
};

export const DrawerSection: React.FC<{ title: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }> = ({ title, children, actions }) => (
  <section className="hgbo-dsec">
    <div className="hgbo-section-head">
      <h3 className="hgbo-dsec__title">{title}</h3>
      {actions}
    </div>
    {children}
  </section>
);

export interface DescItem {
  label: React.ReactNode;
  value: React.ReactNode;
  hidden?: boolean;
}

/** dl 2 cột: nhãn 13 muted / giá trị 14. Giá trị rỗng hiện "—". */
export const DescList: React.FC<{ items: DescItem[] }> = ({ items }) => (
  <dl className="hgbo-dl">
    {items.filter((item) => !item.hidden).map((item, index) => (
      <React.Fragment key={index}>
        <dt>{item.label}</dt>
        <dd>{item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}</dd>
      </React.Fragment>
    ))}
  </dl>
);
