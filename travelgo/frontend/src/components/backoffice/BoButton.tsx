import React from 'react';
import { Link, LinkProps } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';

export type BoButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'ghost-danger';

export interface BoButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BoButtonVariant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
  loading?: boolean;
}

export function boButtonClass(variant: BoButtonVariant = 'secondary', size: 'md' | 'sm' = 'md', iconOnly = false, extra = '') {
  return [
    'hgbo-btn',
    `hgbo-btn--${variant}`,
    size === 'sm' ? 'hgbo-btn--sm' : '',
    iconOnly ? 'hgbo-btn--icon' : '',
    extra,
  ].filter(Boolean).join(' ');
}

/** Nút back-office. Nút chỉ có icon bắt buộc truyền aria-label. */
export const BoButton = React.forwardRef<HTMLButtonElement, BoButtonProps>(function BoButton(
  { variant = 'secondary', size = 'md', icon: Icon, loading = false, className = '', children, disabled, type = 'button', ...rest },
  ref,
) {
  const iconOnly = !children && !!Icon;
  return (
    <button
      ref={ref}
      type={type}
      className={boButtonClass(variant, size, iconOnly, `${loading ? 'is-loading' : ''} ${className}`.trim())}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      <span className="hgbo-btn__content">
        {Icon && <Icon aria-hidden="true" />}
        {children}
      </span>
      {loading && <span className="hgbo-spin" aria-hidden="true" />}
    </button>
  );
});

export interface BoLinkButtonProps extends LinkProps {
  variant?: BoButtonVariant;
  size?: 'md' | 'sm';
  icon?: LucideIcon;
}

/** Link mang kiểu nút (điều hướng nội bộ). */
export const BoLinkButton: React.FC<BoLinkButtonProps> = ({ variant = 'secondary', size = 'md', icon: Icon, className = '', children, ...rest }) => (
  <Link
    className={boButtonClass(variant, size, !children && !!Icon, className)}
    {...rest}
  >
    <span className="hgbo-btn__content">
      {Icon && <Icon aria-hidden="true" />}
      {children}
    </span>
  </Link>
);
