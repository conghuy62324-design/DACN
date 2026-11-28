import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Bookmark,
  Building2,
  CalendarDays,
  ChevronDown,
  Compass,
  Heart,
  Home,
  Hotel,
  LogIn,
  LogOut,
  Map,
  Menu,
  Route,
  ShieldCheck,
  Sparkles,
  Ticket,
  User,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import '../../styles/hg-shell.css';

type NavItem = { label: string; path: string; icon: React.ReactNode; description?: string; className?: string };

const focusableSelector = 'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';

/** Logo dùng chung cho header, drawer và footer. */
export const HuGoLogo: React.FC<{ onClick?: () => void }> = ({ onClick }) => (
  <Link to="/" className="hg-logo" aria-label="HuGo Travel – Trang chủ" onClick={onClick}>
    <span className="hg-logo-mark" aria-hidden="true">
      <Compass />
    </span>
    <span className="hg-logo-text" aria-hidden="true">
      HuGo<span>Travel</span>
    </span>
  </Link>
);

const MoreMenu: React.FC<{ items: NavItem[]; isActive: boolean; isCurrent: (path: string) => boolean }> = ({ items, isActive, isCurrent }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div
      ref={ref}
      className="hg-more"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={'hg-more-trigger' + (isActive ? ' is-active' : '')}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        Thêm
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className="hg-menu-panel">
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={'hg-menu-item' + (item.className ? ' ' + item.className : '')}
              aria-current={isCurrent(item.path) ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {item.icon}
              <span>
                {item.label}
                {item.description && <small>{item.description}</small>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const location = useLocation();
  const { user, logout, isAdmin, isPartner } = useAuth();
  const { favorites } = useFavorites();
  const canUseAssistant = !user || user.roles.includes('CUSTOMER');

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setUserDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  // Drawer: khóa cuộn body, focus nút đóng, đóng khi lên desktop, trả focus về nút menu khi đóng.
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const media = window.matchMedia('(min-width: 1024px)');
    const onMedia = () => {
      if (media.matches) setMobileMenuOpen(false);
    };
    media.addEventListener('change', onMedia);
    const menuButton = menuButtonRef.current;
    return () => {
      document.body.style.overflow = overflow;
      media.removeEventListener('change', onMedia);
      if (menuButton && menuButton.offsetParent !== null) menuButton.focus();
    };
  }, [mobileMenuOpen]);

  const trapFocus = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !drawerRef.current) return;
    const items = Array.from(drawerRef.current.querySelectorAll<HTMLElement>(focusableSelector)).filter((x) => x.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };
  const current = (path: string) => (isActive(path) ? ('page' as const) : undefined);
  const closeMenu = () => setMobileMenuOpen(false);
  const closeUser = () => setUserDropdownOpen(false);

  const mainItems: NavItem[] = [
    { label: 'Trang chủ', path: '/', icon: <Home aria-hidden="true" /> },
    { label: 'Khách sạn', path: '/hotels', icon: <Hotel aria-hidden="true" /> },
    { label: 'Nhà hàng', path: '/restaurants', icon: <UtensilsCrossed aria-hidden="true" /> },
    { label: 'Khám phá', path: '/explore', icon: <Compass aria-hidden="true" /> },
    { label: 'Lịch trình', path: '/tour-planner', icon: <CalendarDays aria-hidden="true" /> },
    ...(canUseAssistant ? [{ label: 'Trợ lý AI', path: '/assistant', icon: <Sparkles aria-hidden="true" />, className: 'hg-nav-ai' }] : []),
  ];

  const moreItems: NavItem[] = [
    ...(canUseAssistant
      ? [{ label: 'Trợ lý AI', path: '/assistant', icon: <Sparkles aria-hidden="true" />, description: 'Trao đổi để phác thảo chuyến đi', className: 'hg-more-ai' }]
      : []),
    { label: 'Tour du lịch', path: '/tours', icon: <Route aria-hidden="true" />, description: 'Gói tour theo điểm đến' },
    { label: 'Vé tham quan', path: '/tickets', icon: <Ticket aria-hidden="true" />, description: 'Vé điểm du lịch' },
    { label: 'Cẩm nang', path: '/blog', icon: <BookOpen aria-hidden="true" />, description: 'Kinh nghiệm du lịch' },
    { label: 'Chuyến đi của tôi', path: '/my-trips', icon: <Map aria-hidden="true" />, description: 'Xem và quản lý chuyến đi' },
  ];

  const drawerServiceItems: NavItem[] = [
    { label: 'Tour du lịch', path: '/tours', icon: <Route aria-hidden="true" /> },
    { label: 'Vé tham quan', path: '/tickets', icon: <Ticket aria-hidden="true" /> },
    { label: 'Cẩm nang', path: '/blog', icon: <BookOpen aria-hidden="true" /> },
  ];

  const favoriteLink = (
    <Link to="/favorites" className="hg-icon-btn" aria-label="Danh sách yêu thích" title="Địa điểm yêu thích">
      <Heart aria-hidden="true" />
      {favorites.length > 0 && (
        <span className="hg-badge-count" aria-hidden="true">
          {favorites.length}
        </span>
      )}
    </Link>
  );

  return (
    <header className={'hg-header' + (isScrolled ? ' is-scrolled' : '')}>
      <div className="hg-container hg-header-inner">
        <HuGoLogo />

        <nav className="hg-nav" aria-label="Điều hướng chính">
          {mainItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={'hg-nav-link' + (item.className ? ' ' + item.className : '')}
              aria-current={current(item.path)}
            >
              {item.label}
            </Link>
          ))}
          <MoreMenu items={moreItems} isActive={['/tours', '/tickets', '/blog', '/my-trips'].some(isActive)} isCurrent={isActive} />
        </nav>

        <div className="hg-header-actions">
          {favoriteLink}

          <div className="hg-desktop-only">
            {user ? (
              <div className="hg-account" ref={userDropdownRef}>
                <button
                  type="button"
                  className="hg-account-trigger"
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  aria-expanded={userDropdownOpen}
                  aria-label="Menu tài khoản"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="hg-avatar" />
                  ) : (
                    <span className="hg-avatar" aria-hidden="true">
                      <User />
                    </span>
                  )}
                  <span className="hg-account-name">{user.fullName}</span>
                  <ChevronDown size={16} aria-hidden="true" />
                </button>

                {userDropdownOpen && (
                  <div className="hg-menu-panel hg-menu-panel--right">
                    <div className="hg-menu-account">
                      <small>Đã đăng nhập với</small>
                      <b>{user.email}</b>
                      {isAdmin && <span className="hg-role-badge">Quản trị viên (Admin)</span>}
                    </div>
                    <Link to="/profile" onClick={closeUser} className="hg-menu-item">
                      <User aria-hidden="true" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>
                    <Link to="/my-trips" onClick={closeUser} className="hg-menu-item">
                      <Compass aria-hidden="true" />
                      <span>Chuyến đi của tôi</span>
                    </Link>
                    <Link to="/bookings" onClick={closeUser} className="hg-menu-item">
                      <Bookmark aria-hidden="true" />
                      <span>Lịch sử đặt vé &amp; dịch vụ</span>
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={closeUser} className="hg-menu-item">
                        <ShieldCheck aria-hidden="true" />
                        <span>Giao diện Quản trị</span>
                      </Link>
                    )}
                    {isPartner && (
                      <Link to="/partner" onClick={closeUser} className="hg-menu-item">
                        <Building2 aria-hidden="true" />
                        <span>Chuyển sang trang Đối tác</span>
                      </Link>
                    )}
                    {!isPartner && (
                      <Link to="/become-partner" onClick={closeUser} className="hg-menu-item">
                        <Building2 aria-hidden="true" />
                        <span>Trở thành đối tác</span>
                      </Link>
                    )}
                    <div className="hg-menu-divider" />
                    <button
                      type="button"
                      onClick={() => {
                        logout();
                        closeUser();
                      }}
                      className="hg-menu-item hg-menu-item--danger"
                    >
                      <LogOut aria-hidden="true" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="hg-btn-outline">
                Đăng nhập
              </Link>
            )}
          </div>

          <button
            ref={menuButtonRef}
            type="button"
            className="hg-icon-btn hg-mobile-only"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Mở menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="hg-mobile-drawer"
          >
            <Menu aria-hidden="true" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="hg-drawer-layer">
          <button type="button" className="hg-drawer-overlay" aria-hidden="true" tabIndex={-1} onClick={closeMenu} />
          <div
            id="hg-mobile-drawer"
            ref={drawerRef}
            className="hg-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Menu điều hướng"
            onKeyDown={trapFocus}
          >
            <div className="hg-drawer-head">
              <HuGoLogo onClick={closeMenu} />
              <button ref={closeButtonRef} type="button" className="hg-icon-btn" aria-label="Đóng menu" onClick={closeMenu}>
                <X aria-hidden="true" />
              </button>
            </div>

            <div className="hg-drawer-body">
              <nav aria-label="Điều hướng chính (di động)">
                {mainItems.map((item) => (
                  <Link key={item.path} to={item.path} className="hg-drawer-link" aria-current={current(item.path)} onClick={closeMenu}>
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="hg-drawer-group">
                <p className="hg-drawer-title">Dịch vụ khác</p>
                {drawerServiceItems.map((item) => (
                  <Link key={item.path} to={item.path} className="hg-drawer-link" aria-current={current(item.path)} onClick={closeMenu}>
                    {item.icon}
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="hg-drawer-divider" />

              {user ? (
                <div className="hg-drawer-group">
                  <div className="hg-drawer-user">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="hg-avatar" />
                    ) : (
                      <span className="hg-avatar" aria-hidden="true">
                        <User />
                      </span>
                    )}
                    <span>
                      <b>{user.fullName}</b>
                      <small>{user.email}</small>
                    </span>
                  </div>
                  <Link to="/profile" className="hg-drawer-link" aria-current={current('/profile')} onClick={closeMenu}>
                    <User aria-hidden="true" />
                    Hồ sơ cá nhân
                  </Link>
                  <Link to="/my-trips" className="hg-drawer-link" aria-current={current('/my-trips')} onClick={closeMenu}>
                    <Map aria-hidden="true" />
                    Chuyến đi của tôi
                  </Link>
                  <Link to="/bookings" className="hg-drawer-link" aria-current={current('/bookings')} onClick={closeMenu}>
                    <Bookmark aria-hidden="true" />
                    Lịch sử đặt vé &amp; dịch vụ
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" className="hg-drawer-link" onClick={closeMenu}>
                      <ShieldCheck aria-hidden="true" />
                      Trang Quản trị (Admin)
                    </Link>
                  )}
                  {isPartner && (
                    <Link to="/partner" className="hg-drawer-link" onClick={closeMenu}>
                      <Building2 aria-hidden="true" />
                      Trang quản lý Đối tác
                    </Link>
                  )}
                  {!isPartner && (
                    <Link to="/become-partner" className="hg-drawer-link" aria-current={current('/become-partner')} onClick={closeMenu}>
                      <Building2 aria-hidden="true" />
                      Trở thành đối tác
                    </Link>
                  )}
                  <button
                    type="button"
                    className="hg-drawer-link hg-drawer-link--danger"
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                  >
                    <LogOut aria-hidden="true" />
                    Đăng xuất
                  </button>
                </div>
              ) : (
                <Link to="/login" className="hg-btn-outline hg-drawer-login" onClick={closeMenu}>
                  <LogIn size={18} aria-hidden="true" />
                  Đăng nhập / Đăng ký
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
