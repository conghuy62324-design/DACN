import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { BookOpen, Building2, Compass, FileCheck2, LayoutDashboard, LogOut, MapPinned, Menu, Route, ShieldCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const primaryNavigation = [
  { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/admin/partner-applications', label: 'Duyệt hồ sơ đối tác', icon: FileCheck2 },
  { to: '/admin/places', label: 'Duyệt địa điểm', icon: MapPinned },
  { to: '/admin/tours', label: 'Duyệt tour', icon: Route },
  { to: '/admin/blogs', label: 'Duyệt bài viết', icon: BookOpen },
];

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0b1f3a] text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10"><ShieldCheck className="h-6 w-6 text-cyan-300" /></span>
            <span><b className="block text-lg">HuGo Travel</b><small className="text-slate-400">Super Admin Console</small></span>
          </Link>
          <button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Đóng menu"><X /></button>
        </div>
        <nav className="p-4 space-y-1" aria-label="Điều hướng quản trị">
          {primaryNavigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${isActive ? 'bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/20' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
              <Icon className="h-4 w-4" />{label}
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 inset-x-0 border-t border-white/10 p-4">
          <Link to="/" className="flex items-center gap-3 px-4 py-2 text-sm text-slate-300 hover:text-white"><Compass className="h-4 w-4" />Về website khách hàng</Link>
          <button onClick={logout} className="mt-1 flex w-full items-center gap-3 rounded-xl px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"><LogOut className="h-4 w-4" />Đăng xuất</button>
        </div>
      </aside>
      {open && <button className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setOpen(false)} aria-label="Đóng menu" />}
      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-slate-100 lg:hidden" aria-label="Mở menu"><Menu /></button>
          <div className="hidden sm:block"><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Platform operations</p><p className="text-sm text-slate-500">Dữ liệu quản trị tập trung và có kiểm soát</p></div>
          <div className="text-right"><p className="text-sm font-bold">{user?.fullName}</p><p className="text-xs text-slate-500">Super Admin</p></div>
        </header>
        <main className="p-4 sm:p-8"><Outlet /></main>
      </div>
    </div>
  );
};
