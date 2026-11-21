import React from 'react';
import { AlertTriangle, CircleAlert, CircleCheck, Hourglass, Inbox, Info, RefreshCw } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { BoButton } from './BoButton';

export const Skeleton: React.FC<{ width?: number | string; height?: number | string; className?: string }> = ({ width = '100%', height = 14, className = '' }) => (
  <span
    className={`hgbo-skel ${className}`.trim()}
    style={{ width, height }}
    aria-hidden="true"
  />
);

export interface LoadingStateProps {
  /** Hình dạng skeleton theo nội dung. */
  variant?: 'table' | 'kpi' | 'grid' | 'detail' | 'form';
  rows?: number;
  label?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ variant = 'table', rows = 5, label = 'Đang tải dữ liệu…' }) => {
  if (variant === 'kpi') {
    return (
      <div className="hgbo-kpis" role="status" aria-label={label}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="hgbo-kpi">
            <Skeleton width="60%" height={13} />
            <Skeleton width={96} height={28} />
          </div>
        ))}
      </div>
    );
  }
  if (variant === 'grid') {
    return (
      <div className="hgbo-kpis" role="status" aria-label={label}>
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} height={160} />
        ))}
      </div>
    );
  }
  return (
    <div className="hgbo-card hgbo-stack hgbo-stack--sm" role="status" aria-label={label}>
      {variant !== 'table' && <Skeleton width="40%" height={18} />}
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={variant === 'table' ? 32 : 16} width={variant === 'table' ? '100%' : `${90 - (i % 3) * 15}%`} />
      ))}
    </div>
  );
};

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  plain?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon = Inbox, title, description, action, plain }) => (
  <div className={`hgbo-state ${plain ? 'hgbo-state--plain' : ''}`.trim()}>
    <Icon className="hgbo-state__icon" aria-hidden="true" />
    <p className="hgbo-state__title">{title}</p>
    {description && <p className="hgbo-state__desc">{description}</p>}
    {action && <div className="hgbo-state__action">{action}</div>}
  </div>
);

export interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  title?: string;
  plain?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, title = 'Không tải được dữ liệu', plain }) => (
  <div className={`hgbo-state hgbo-state--error ${plain ? 'hgbo-state--plain' : ''}`.trim()} role="alert">
    <CircleAlert className="hgbo-state__icon" aria-hidden="true" />
    <p className="hgbo-state__title">{title}</p>
    <p className="hgbo-state__desc">{message}</p>
    {onRetry && (
      <div className="hgbo-state__action">
        <BoButton icon={RefreshCw} onClick={onRetry}>Thử lại</BoButton>
      </div>
    )}
  </div>
);

export interface ApiPendingStateProps {
  feature: string;
  contractRef: string;
  description?: string;
}

/** Chức năng chờ API được duyệt. Không đặt dữ liệu mẫu phía sau. */
export const ApiPendingState: React.FC<ApiPendingStateProps> = ({ feature, contractRef, description }) => (
  <div className="hgbo-state hgbo-state--pending" role="status">
    <Hourglass className="hgbo-state__icon" aria-hidden="true" />
    <p className="hgbo-state__title">{feature}</p>
    <p className="hgbo-state__desc">
      Chức năng này chờ API được duyệt ({contractRef}). Chưa có dữ liệu thật để hiển thị.
    </p>
    {description && <p className="hgbo-state__desc">{description}</p>}
  </div>
);

export interface AlertProps {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  children: React.ReactNode;
  action?: React.ReactNode;
  role?: 'alert' | 'status';
}

const ALERT_ICON: Record<string, LucideIcon> = { info: Info, warning: AlertTriangle, danger: CircleAlert, success: CircleCheck };

export const Alert: React.FC<AlertProps> = ({ tone = 'info', children, action, role }) => {
  const Icon = ALERT_ICON[tone];
  return (
    <div className={`hgbo-alert hgbo-alert--${tone}`} role={role || (tone === 'danger' ? 'alert' : undefined)}>
      <Icon aria-hidden="true" />
      <div className="hgbo-alert__body">{children}</div>
      {action && <div className="hgbo-alert__action">{action}</div>}
    </div>
  );
};

/** Lỗi 409 *_VERSION_CONFLICT / If-Match sai. */
export const ConflictBanner: React.FC<{ onReload: () => void; busy?: boolean }> = ({ onReload, busy }) => (
  <Alert
    tone="warning"
    role="alert"
    action={(
      <BoButton size="sm" icon={RefreshCw} loading={busy} onClick={onReload}>Tải lại</BoButton>
    )}
  >
    <p>Dữ liệu đã được thay đổi ở nơi khác. Tải lại để xem bản mới nhất, thay đổi chưa lưu của bạn sẽ mất.</p>
  </Alert>
);

export const isConflictError = (error: unknown) => {
  const code = (error as any)?.code;
  return typeof code === 'string' && (/_VERSION_CONFLICT$/.test(code) || code === 'HOTEL_PRECONDITION_REQUIRED');
};
