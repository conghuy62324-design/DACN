import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { BookOpen, Building2, CalendarRange, Compass, LayoutDashboard, LogOut, MapPinned, Menu, Route, Ticket, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { to: '/partner', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/partner/places', label: 'Địa điểm & cơ sở', icon: MapPinned },
  { to: '/partner/tours', label: 'Tour du lịch', icon: Route },
  { to: '/partner/tickets', label: 'Vé & tồn kho', icon: Ticket },
  { to: '/partner/blogs', label: 'Bài viết', icon: BookOpen },
  { to: '/partner/bookings', label: 'Đơn đặt dịch vụ', icon: CalendarRange },
];

export const PartnerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f5faf9] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#063b3b] text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
          <Link to="/partner" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-400 text-teal-950"><Building2 className="h-6 w-6" /></span>
            <span><b className="block text-lg">HuGo Partner</b><small className="text-teal-200">Business Workspace</small></span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Đóng menu"><X /></button>
        </div>
        <nav className="p-4 space-y-1" aria-label="Điều hướng đối tác">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-white text-teal-950 shadow-lg' : 'text-teal-100 hover:bg-white/10'}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 inset-x-0 border-t border-white/10 p-4">
          <Link to="/" className="flex items-center gap-3 px-4 py-2 text-sm text-teal-100 hover:text-white"><Compass className="h-4 w-4" />Về website khách hàng</Link>
          <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm text-rose-200 hover:bg-white/10"><LogOut className="h-4 w-4" />Đăng xuất</button>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setOpen(false)} aria-label="Đóng menu" />}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-teal-100 bg-white/95 px-4 backdrop-blur sm:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-teal-50 lg:hidden" aria-label="Mở menu"><Menu /></button>
          <div className="hidden sm:block"><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Partner operations</p><p className="text-sm text-slate-500">Vận hành cơ sở và xử lý booking</p></div>
          <div className="text-right"><p className="text-sm font-bold">{user?.fullName}</p><p className="text-xs text-teal-700">Đối tác HuGo</p></div>
        </header>
        <main className="p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
};
