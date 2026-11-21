import React from 'react';
import { AlertTriangle, LucideIcon, RotateCw } from 'lucide-react';

interface AccountStateProps {
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  tone?: 'empty' | 'error';
}

// Khối trạng thái rỗng / lỗi dùng chung cho các trang tài khoản.
export function AccountState({ icon: Icon, title, description, actions, tone = 'empty' }: AccountStateProps) {
  return (
    <div className={'hg-acc-state' + (tone === 'error' ? ' hg-acc-state--error' : '')} role={tone === 'error' ? 'alert' : undefined}>
      <span className="hg-acc-state__icon" aria-hidden="true">
        <Icon size={26} />
      </span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {actions && <div className="hg-acc-state__actions">{actions}</div>}
    </div>
  );
}

export function AccountLoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <AccountState
      tone="error"
      icon={AlertTriangle}
      title="Chưa tải được dữ liệu"
      description={message}
      actions={
        onRetry && (
          <button type="button" className="hg-acc-btn hg-acc-btn--outline" onClick={onRetry}>
            <RotateCw size={16} aria-hidden="true" />
            <span>Thử lại</span>
          </button>
        )
      }
    />
  );
}
