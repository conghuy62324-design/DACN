import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Compass,
  Hotel,
  UtensilsCrossed,
  Ticket,
  User,
  Heart,
  Bookmark,
  Menu,
  X,
  ShieldCheck,
  LogOut,
  ChevronDown,
  Sparkles,
  Map,
  Route,
  CalendarDays,
  Building2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';

interface DropdownItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  description?: string;
}

interface NavDropdownProps {
  label: string;
  items: DropdownItem[];
  isActive: boolean;
}

const NavDropdown: React.FC<NavDropdownProps> = ({ label, items, isActive }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1 text-[15px] font-medium transition-colors py-1 ${
          isActive ? 'text-orange-600 font-semibold' : 'text-slate-700 hover:text-orange-500'
        }`}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-slate-100 rotate-45" />
          {items.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-orange-50 group transition-colors"
            >
              <span className="mt-0.5 text-orange-500 group-hover:text-orange-600 shrink-0">{item.icon}</span>
              <span>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-orange-600">{item.label}</p>
                {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

interface MobileLinkProps {
  to: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
  extraClass?: string;
}
const MobileLink: React.FC<MobileLinkProps> = ({ to, label, isActive, onClick, extraClass }) => (
  <Link
    to={to}
    onClick={onClick}
    className={`block px-3 py-2 rounded-lg text-base font-medium ${
      extraClass ?? (isActive ? 'bg-orange-50 text-orange-600 font-semibold' : 'text-slate-700 hover:bg-slate-50')
    }`}
  >
    {label}
  </Link>
);

export const Navbar: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileTourOpen, setMobileTourOpen] = useState(false);
  const [mobileServiceOpen, setMobileServiceOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const location = useLocation();
  const { user, logout, isAdmin, isPartner } = useAuth();
  const { favorites } = useFavorites();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node))
        setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };
  const isGroupActive = (paths: string[]) => paths.some((p) => isActive(p));

  const tourItems: DropdownItem[] = [
    { label: 'Tour du lịch', path: '/tours', icon: <Route className="w-4 h-4" />, description: 'Khám phá các gói tour hấp dẫn' },
    { label: 'Tạo lịch trình', path: '/tour-planner', icon: <CalendarDays className="w-4 h-4" />, description: 'Tự thiết kế hành trình cá nhân' },
    { label: 'Chuyến đi của tôi', path: '/my-trips', icon: <Map className="w-4 h-4" />, description: 'Xem và quản lý chuyến đi' },
  ];

  const serviceItems: DropdownItem[] = [
    { label: 'Khách sạn', path: '/hotels', icon: <Hotel className="w-4 h-4" />, description: 'Tìm nơi lưu trú lý tưởng' },
    { label: 'Nhà hàng', path: '/restaurants', icon: <UtensilsCrossed className="w-4 h-4" />, description: 'Ẩm thực địa phương đặc sắc' },
    { label: 'Vé tham quan', path: '/tickets', icon: <Ticket className="w-4 h-4" />, description: 'Đặt vé điểm du lịch nhanh chóng' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-md py-3'
          : 'bg-white py-4 border-b border-slate-100 shadow-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-orange-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Compass className="w-6 h-6 animate-spin-slow" />
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-slate-900">
              HuGo<span className="text-orange-500">Travel</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            <Link
              to="/"
              className={`text-[15px] font-medium transition-colors relative py-1 ${
                isActive('/') ? 'text-orange-600 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500 after:rounded-full' : 'text-slate-700 hover:text-orange-500'
              }`}
            >
              Trang chủ
            </Link>
            <Link
              to="/explore"
              className={`text-[15px] font-medium transition-colors relative py-1 ${
                isActive('/explore') ? 'text-orange-600 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500 after:rounded-full' : 'text-slate-700 hover:text-orange-500'
              }`}
            >
              Khám phá
            </Link>
            <NavDropdown
              label="Tour & Lịch trình"
              items={tourItems}
              isActive={isGroupActive(['/tours', '/tour-planner', '/my-trips'])}
            />
            <NavDropdown
              label="Dịch vụ"
              items={serviceItems}
              isActive={isGroupActive(['/hotels', '/restaurants', '/tickets'])}
            />
            <Link
              to="/blog"
              className={`text-[15px] font-medium transition-colors relative py-1 ${
                isActive('/blog') ? 'text-orange-600 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-orange-500 after:rounded-full' : 'text-slate-700 hover:text-orange-500'
              }`}
            >
              Blog
            </Link>
          </nav>

          {/* Desktop Right */}
          <div className="hidden lg:flex items-center gap-3 shrink-0">
            {/* Favorites */}
            <Link
              to="/favorites"
              className="relative p-2 text-slate-600 hover:text-orange-500 hover:bg-orange-50 rounded-full transition-colors"
              title="Địa điểm yêu thích"
            >
              <Heart className="w-5 h-5" />
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* User section */}
            {user ? (
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setUserDropdownOpen((v) => !v)}
                  aria-expanded={userDropdownOpen}
                  className="flex items-center space-x-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  <img src={user.avatarUrl} alt={user.fullName} className="w-8 h-8 rounded-full object-cover" />
                  <span className="text-sm font-medium text-slate-800 pr-1 max-w-[100px] truncate">{user.fullName}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs text-slate-500">Đã đăng nhập với</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{user.email}</p>
                      {isAdmin && (
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                          Quản trị viên (Admin)
                        </span>
                      )}
                    </div>
                    <Link to="/profile" onClick={() => setUserDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600">
                      <User className="w-4 h-4 mr-3 text-slate-400" /> Hồ sơ cá nhân
                    </Link>
                    <Link to="/my-trips" onClick={() => setUserDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600">
                      <Compass className="w-4 h-4 mr-3 text-slate-400" /> Chuyến đi của tôi
                    </Link>
                    <Link to="/bookings" onClick={() => setUserDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600">
                      <Bookmark className="w-4 h-4 mr-3 text-slate-400" /> Lịch sử đặt vé &amp; dịch vụ
                    </Link>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setUserDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50">
                        <ShieldCheck className="w-4 h-4 mr-3 text-blue-500" /> Giao diện Quản trị
                      </Link>
                    )}
                    {isPartner && (
                      <Link to="/partner" onClick={() => setUserDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-teal-700 font-medium hover:bg-teal-50">
                        <Building2 className="w-4 h-4 mr-3 text-teal-600" /> Chuyển sang trang Đối tác
                      </Link>
                    )}
                    {!isPartner && (
                      <Link to="/become-partner" onClick={() => setUserDropdownOpen(false)} className="flex items-center px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600">
                        <Building2 className="w-4 h-4 mr-3 text-slate-400" /> Trở thành đối tác
                      </Link>
                    )}
                    <div className="border-t border-slate-100 my-1" />
                    <button
                      onClick={() => { logout(); setUserDropdownOpen(false); }}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <LogOut className="w-4 h-4 mr-3" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-slate-700 hover:text-orange-500 px-3 py-2 transition-colors">
                Đăng nhập
              </Link>
            )}

            {/* CTA */}
            <Link
              to="/tour-planner"
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-sm font-bold px-5 py-2.5 rounded-full shadow-md shadow-orange-500/20 hover:shadow-orange-500/40 transition-all duration-200"
            >
              <Sparkles className="w-4 h-4" />
              Tạo lịch trình
            </Link>
          </div>

          {/* Mobile Controls */}
          <div className="flex items-center space-x-2 lg:hidden">
            <Link to="/favorites" className="relative p-2 text-slate-700">
              <Heart className="w-6 h-6" />
              {favorites.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {favorites.length}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Mở menu"
              className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 mt-3 pt-3 pb-4 space-y-1 animate-in slide-in-from-top-4 duration-200">
            <MobileLink to="/" label="Trang chủ" isActive={isActive('/')} onClick={() => setMobileMenuOpen(false)} />
            <MobileLink to="/explore" label="Khám phá" isActive={isActive('/explore')} onClick={() => setMobileMenuOpen(false)} />

            {/* Tour dropdown */}
            <div>
              <button
                onClick={() => setMobileTourOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Tour &amp; Lịch trình
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileTourOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileTourOpen && (
                <div className="pl-4 space-y-1 mt-1">
                  {tourItems.map((item) => (
                    <MobileLink key={item.path} to={item.path} label={item.label} isActive={isActive(item.path)} onClick={() => setMobileMenuOpen(false)} />
                  ))}
                </div>
              )}
            </div>

            {/* Service dropdown */}
            <div>
              <button
                onClick={() => setMobileServiceOpen((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
              >
                Dịch vụ
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${mobileServiceOpen ? 'rotate-180' : ''}`} />
              </button>
              {mobileServiceOpen && (
                <div className="pl-4 space-y-1 mt-1">
                  {serviceItems.map((item) => (
                    <MobileLink key={item.path} to={item.path} label={item.label} isActive={isActive(item.path)} onClick={() => setMobileMenuOpen(false)} />
                  ))}
                </div>
              )}
            </div>

            <MobileLink to="/blog" label="Blog" isActive={isActive('/blog')} onClick={() => setMobileMenuOpen(false)} />

            <div className="border-t border-slate-100 pt-3 space-y-1 mt-2">
              {user ? (
                <>
                  <MobileLink to="/profile" label={`Hồ sơ (${user.fullName})`} isActive={false} onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/my-trips" label="Chuyến đi của tôi" isActive={false} onClick={() => setMobileMenuOpen(false)} />
                  <MobileLink to="/bookings" label="Lịch sử đặt vé &amp; dịch vụ" isActive={false} onClick={() => setMobileMenuOpen(false)} />
                  {isAdmin && (
                    <MobileLink
                      to="/admin"
                      label="Trang Quản trị (Admin)"
                      isActive={false}
                      onClick={() => setMobileMenuOpen(false)}
                      extraClass="text-blue-600 font-semibold hover:bg-blue-50 block px-3 py-2 rounded-lg text-base"
                    />
                  )}
                  {isPartner && (
                    <MobileLink to="/partner" label="Trang quản lý Đối tác" isActive={false} onClick={() => setMobileMenuOpen(false)} extraClass="text-teal-700 font-semibold hover:bg-teal-50 block px-3 py-2 rounded-lg text-base" />
                  )}
                  {!isPartner && (
                    <MobileLink to="/become-partner" label="Trở thành đối tác" isActive={false} onClick={() => setMobileMenuOpen(false)} />
                  )}
                  <button
                    onClick={() => { logout(); setMobileMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-rose-600 font-medium hover:bg-rose-50 rounded-lg text-base"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <MobileLink to="/login" label="Đăng nhập / Đăng ký" isActive={false} onClick={() => setMobileMenuOpen(false)} />
              )}
              <Link
                to="/tour-planner"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 rounded-full shadow-md mt-3"
              >
                <Sparkles className="w-4 h-4" />
                Tạo lịch trình
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
