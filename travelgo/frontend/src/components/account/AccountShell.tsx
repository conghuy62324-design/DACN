import React from 'react';
import { NavLink } from 'react-router-dom';
import { Building2, Heart, LucideIcon, Map, ReceiptText, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';
import '../../styles/hg-account.css';

export const roleLabels: Record<UserRole, string> = {
  CUSTOMER: 'Khách hàng',
  PARTNER: 'Đối tác',
  SUPER_ADMIN: 'Quản trị viên',
};

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'H';
  const last = words[words.length - 1];
  return last.charAt(0).toLocaleUpperCase('vi-VN');
}

interface AccountShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// Vỏ chung cho khu tài khoản: sidebar 260px (≥1024) hoặc thanh tab cuộn ngang dính dưới header.
// Không chứa nút bấm hay email để không trùng phần tử mà e2e trang Hồ sơ đang kiểm.
export function AccountShell({ title, description, actions, children }: AccountShellProps) {
  const { user, isPartner } = useAuth();
  const items: NavItem[] = [
    { to: '/profile', label: 'Hồ sơ', icon: UserRound },
    { to: '/bookings', label: 'Đơn đặt chỗ', icon: ReceiptText },
    { to: '/favorites', label: 'Yêu thích', icon: Heart },
    { to: '/my-trips', label: 'Chuyến đi', icon: Map },
    isPartner
      ? { to: '/partner', label: 'Kênh đối tác', icon: Building2 }
      : { to: '/become-partner', label: 'Trở thành đối tác', icon: Building2 },
  ];
  const name = user?.fullName?.trim() || 'Tài khoản HuGo';
  const roles = user?.roles?.map((role) => roleLabels[role]).filter(Boolean).join(', ');

  return (
    <div className="hg-acc">
      <div className="hg-container hg-acc__layout">
        <aside className="hg-acc__side" aria-label="Tài khoản của tôi">
          {user && (
            <div className="hg-acc-user">
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt="" className="hg-acc-user__avatar" />
              ) : (
                <span className="hg-acc-user__avatar" aria-hidden="true">
                  {initialsOf(name)}
                </span>
              )}
              <div className="hg-acc-user__text">
                <p className="hg-acc-user__name">{name}</p>
                {roles && <p className="hg-acc-user__role">{roles}</p>}
              </div>
            </div>
          )}
          <nav className="hg-acc-nav" aria-label="Mục tài khoản">
            <ul>
              {items.map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink to={to} end>
                    <Icon size={18} aria-hidden="true" />
                    <span>{label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
        <div className="hg-acc__main">
          <div className="hg-acc-head">
            <div className="hg-acc-head__text">
              <h1>{title}</h1>
              {description && <p>{description}</p>}
            </div>
            {actions && <div className="hg-acc-head__actions">{actions}</div>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
