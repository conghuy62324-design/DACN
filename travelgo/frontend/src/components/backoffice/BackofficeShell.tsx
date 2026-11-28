import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, Outlet, matchPath, useLocation } from 'react-router-dom';
import { ChevronDown, ExternalLink, LogOut, Menu, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { BoMenu } from './BoMenu';
import { ToastProvider } from './Toast';
import { Portal, useFocusTrap, useScrollLock } from './overlay';
import { initials } from './format';
import '../../styles/hg-backoffice.css';

export type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number; hidden?: boolean; disabledReason?: string; /** Đường dẫn con cũng làm sáng mục này (matchPath, end). */ activeOn?: string[] };
export type NavGroup = { label?: string; items: NavItem[] };
export type Crumb = { label: string; to?: string };

export interface BackofficeShellProps {
  area: 'admin' | 'partner';
  /** "Quản trị hệ thống" | "Kênh đối tác" */
  brandSubtitle: string;
  /** "Quản trị viên" | "Đối tác" */
  roleLabel: string;
  nav: NavGroup[];
  /** Mặc định lấy từ BreadcrumbContext do trang đặt, hoặc theo mục menu đang chọn. */
  breadcrumbs?: Crumb[];
  topbarSlot?: React.ReactNode;
  /** Mặc định <Outlet/> */
  children?: React.ReactNode;
}

const BreadcrumbContext = createContext<(items: Crumb[] | null) => void>(() => undefined);

/** Trang đặt breadcrumb: useBackofficeBreadcrumbs([{label:'Kiểm duyệt'},{label:'Khách sạn'}]). Gốc khu vực được thêm tự động. */
export function useBackofficeBreadcrumbs(items: Crumb[] | null) {
  const set = useContext(BreadcrumbContext);
  const key = JSON.stringify(items);
  useEffect(() => {
    set(items);
    return () => set(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, set]);
}

const AREA_ROOT: Record<BackofficeShellProps['area'], Crumb> = {
  admin: { label: 'Quản trị', to: '/admin' },
  partner: { label: 'Kênh đối tác', to: '/partner' },
};

function findActive(nav: NavGroup[], pathname: string): { group?: NavGroup; item?: NavItem } {
  let best: { group?: NavGroup; item?: NavItem; len: number } = { len: -1 };
  for (const group of nav) {
    for (const item of group.items) {
      if (item.hidden) continue;
      const hit = matchPath({ path: item.to, end: !!item.end }, pathname);
      if (hit && item.to.length > best.len) best = { group, item, len: item.to.length };
    }
  }
  return best;
}

interface SideNavProps {
  nav: NavGroup[];
  onNavigate?: () => void;
  onTip?: (tip: { label: string; top: number; left: number } | null) => void;
}

const SideNav: React.FC<SideNavProps> = ({ nav, onNavigate, onTip }) => {
  const { pathname } = useLocation();
  const showTip = (label: string) => (event: React.SyntheticEvent<HTMLElement>) => {
    if (!onTip) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onTip({ label, top: rect.top + rect.height / 2, left: rect.right + 8 });
  };
  const hideTip = () => onTip?.(null);
  return (
    <nav className="hgbo-nav" aria-label="Điều hướng chính">
      {nav.map((group, gi) => {
        const items = group.items.filter((item) => !item.hidden);
        if (!items.length) return null;
        return (
          <div key={group.label || `group-${gi}`}>
            {group.label && (
              <p className="hgbo-nav__group-label">
                <span>{group.label}</span>
              </p>
            )}
            <ul className="hgbo-nav__group">
              {items.map((item) => {
                const Icon = item.icon;
                const badge = item.badge && item.badge > 0 ? item.badge : null;
                const name = badge ? `${item.label} (${badge} mục chờ)` : item.label;
                if (item.disabledReason) {
                  return (
                    <li key={item.to}>
                      <span
                        className="hgbo-nav__item"
                        aria-disabled="true"
                        title={item.disabledReason}
                        tabIndex={0}
                        aria-label={`${item.label} — ${item.disabledReason}`}
                        onMouseEnter={showTip(item.label)}
                        onMouseLeave={hideTip}
                        onFocus={showTip(item.label)}
                        onBlur={hideTip}
                      >
                        <Icon aria-hidden="true" />
                        <span className="hgbo-nav__label">{item.label}</span>
                      </span>
                    </li>
                  );
                }
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => 'hgbo-nav__item' + (!isActive && item.activeOn?.some((p) => matchPath({ path: p, end: true }, pathname)) ? ' is-active' : '')}
                      aria-label={name}
                      onClick={() => {
                        hideTip();
                        onNavigate?.();
                      }}
                      onMouseEnter={showTip(item.label)}
                      onMouseLeave={hideTip}
                      onFocus={showTip(item.label)}
                      onBlur={hideTip}
                    >
                      <Icon aria-hidden="true" />
                      <span className="hgbo-nav__label">{item.label}</span>
                      {badge && <span className="hgbo-nav__badge" aria-hidden="true">{badge > 99 ? '99+' : badge}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
};

const Brand: React.FC<{ area: BackofficeShellProps['area']; subtitle: string; onClick?: () => void }> = ({ area, subtitle, onClick }) => (
  <Link to={AREA_ROOT[area].to!} className="hgbo-brand" aria-label={`HuGo Travel — ${subtitle}`} onClick={onClick}>
    <span className="hgbo-brand__name">HuGo Travel</span>
    <span className="hgbo-brand__sub">{subtitle}</span>
    <span className="hgbo-brand__mark" aria-hidden="true">H</span>
  </Link>
);

/** Khung back-office dùng chung Admin/Partner (spec 1.2). Đã đặt sẵn ToastProvider. */
export const BackofficeShell: React.FC<BackofficeShellProps> = ({ area, brandSubtitle, roleLabel, nav, breadcrumbs, topbarSlot, children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [tip, setTip] = useState<{ label: string; top: number; left: number } | null>(null);
  const [pageCrumbs, setPageCrumbs] = useState<Crumb[] | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  useFocusTrap(drawerOpen, drawerRef, closeDrawer, { returnFocus: menuButtonRef });
  useScrollLock(drawerOpen);

  useEffect(() => {
    setDrawerOpen(false);
    setTip(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    const media = window.matchMedia('(min-width:1024px)');
    const onChange = () => media.matches && setDrawerOpen(false);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [drawerOpen]);

  const crumbs = useMemo<Crumb[]>(() => {
    const root = AREA_ROOT[area];
    const source = breadcrumbs || pageCrumbs;
    if (source && source.length) return source[0].to === root.to ? source : [root, ...source];
    const active = findActive(nav, location.pathname);
    if (!active.item) return [root];
    if (active.item.to === root.to) return [{ label: active.item.label }];
    return [root, ...(active.group?.label ? [{ label: active.group.label }] : []), { label: active.item.label }];
  }, [area, breadcrumbs, pageCrumbs, nav, location.pathname]);

  const current = crumbs[crumbs.length - 1]?.label;
  useEffect(() => {
    if (current) document.title = `${current} · HuGo Travel`;
  }, [current]);

  const name = user?.fullName || user?.email || 'Tài khoản';

  return (
    <BreadcrumbContext.Provider value={setPageCrumbs}>
      <ToastProvider>
        <div className={`hgbo-app hgbo-app--${area}`}>
          <a className="hgbo-skip" href="#hgbo-main">Bỏ qua tới nội dung chính</a>
          <aside className="hgbo-sidebar" aria-label="Thanh điều hướng">
            <Brand area={area} subtitle={brandSubtitle} />
            <SideNav nav={nav} onTip={setTip} />
          </aside>
          {tip && (
            <div className="hgbo-tip" role="presentation" style={{ top: tip.top, left: tip.left }}>
              {tip.label}
            </div>
          )}
          {drawerOpen && (
            <Portal>
              <div className="hgbo-overlay hgbo-navdrawer-overlay" aria-hidden="true" onClick={closeDrawer} />
              <div ref={drawerRef} className="hgbo-navdrawer" role="dialog" aria-modal="true" aria-label="Menu điều hướng" tabIndex={-1}>
                <div className="hgbo-navdrawer__head">
                  <Brand area={area} subtitle={brandSubtitle} onClick={closeDrawer} />
                  <button type="button" className="hgbo-navdrawer__close" aria-label="Đóng menu" onClick={closeDrawer}>
                    <X size={20} aria-hidden="true" />
                  </button>
                </div>
                <SideNav nav={nav} onNavigate={closeDrawer} />
              </div>
            </Portal>
          )}
          <div className="hgbo-main">
            <header className="hgbo-topbar">
              <button
                ref={menuButtonRef}
                type="button"
                className="hgbo-topbar__menu"
                aria-label="Mở menu"
                aria-expanded={drawerOpen}
                onClick={() => setDrawerOpen(true)}
              >
                <Menu size={22} aria-hidden="true" />
              </button>
              <nav className="hgbo-crumbs" aria-label="Đường dẫn">
                <ol>
                  {crumbs.map((crumb, index) => {
                    const last = index === crumbs.length - 1;
                    return (
                      <li key={`${crumb.label}-${index}`}>
                        {last ? (
                          <span aria-current="page">{crumb.label}</span>
                        ) : crumb.to ? (
                          <Link to={crumb.to}>{crumb.label}</Link>
                        ) : (
                          <span>{crumb.label}</span>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </nav>
              {topbarSlot && <div className="hgbo-topbar__slot">{topbarSlot}</div>}
              <div className="hgbo-topbar__right">
                <a className="hgbo-viewsite" href="/" target="_blank" rel="noopener" aria-label="Xem website (mở tab mới)">
                  <ExternalLink aria-hidden="true" />
                  <span>Xem website</span>
                </a>
                <span className="hgbo-rolepill">{roleLabel}</span>
                <BoMenu
                  label={`Tài khoản: ${name}`}
                  wide
                  buttonClassName="hgbo-userbtn"
                  buttonContent={(
                    <>
                      <span className="hgbo-avatar" aria-hidden="true">{initials(name)}</span>
                      <span className="hgbo-userbtn__name">{name}</span>
                      <ChevronDown aria-hidden="true" />
                    </>
                  )}
                  header={(
                    <div className="hgbo-menu__who">
                      <b>{user?.fullName || '—'}</b>
                      {user?.email && <span>{user.email}</span>}
                    </div>
                  )}
                  items={[{ label: 'Đăng xuất', icon: LogOut, tone: 'danger', onClick: logout }]}
                />
              </div>
            </header>
            <main id="hgbo-main" className="hgbo-content" tabIndex={-1}>
              {children ?? <Outlet />}
            </main>
          </div>
        </div>
      </ToastProvider>
    </BreadcrumbContext.Provider>
  );
};
