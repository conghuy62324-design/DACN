import React, { useEffect, useState } from 'react';
import { Building2, CalendarCheck, CheckCircle2, Clock3, WalletCards } from 'lucide-react';
import { PlatformService } from '../../services/platformService';
import { Business } from '../../types';
import { formatCurrencyVND } from '../../utils/formatters';

interface DashboardState {
  businesses: Business[];
  selectedBusiness: Business | null;
  metrics: null | { totalBookings: number; pendingBookings: number; confirmedBookings: number; completedBookings: number; revenue: number; places: number; tours: number; tickets: number; blogs: number; source: 'DATABASE' };
}

export const PartnerDashboardPage: React.FC = () => {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (businessId?: string) => {
    setLoading(true); setError('');
    try { setState(await PlatformService.getPartnerDashboard(businessId)); }
    catch (requestError: any) { setError(requestError?.message || 'Không thể tải dashboard đối tác.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return <div className="space-y-7">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-sm font-bold text-teal-700">KHÔNG GIAN VẬN HÀNH</p><h1 className="mt-1 text-3xl font-black">Tổng quan cơ sở</h1><p className="mt-2 text-sm text-slate-500">Booking và số liệu chỉ thuộc cơ sở bạn được cấp quyền.</p></div>{state?.businesses.length ? <label className="block min-w-[280px] text-xs font-bold text-slate-500">CƠ SỞ ĐANG QUẢN LÝ<select value={state.selectedBusiness?.id || ''} onChange={(event) => load(event.target.value)} className="mt-2 w-full rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-teal-500">{state.businesses.map((business) => <option key={business.id} value={business.id}>{business.name} · {business.type}</option>)}</select></label> : null}</div>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    {!loading && state && !state.selectedBusiness && <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center"><Building2 className="mx-auto h-10 w-10 text-amber-700" /><h2 className="mt-4 text-xl font-black">Chưa có cơ sở được cấp quyền</h2><p className="mt-2 text-sm text-amber-800">Liên hệ quản trị viên nếu hồ sơ của bạn đã được phê duyệt.</p></div>}
    {state?.selectedBusiness && <>
      <section className="rounded-2xl bg-gradient-to-r from-[#063b3b] to-[#0f6963] p-6 text-white shadow-lg"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-200">{state.selectedBusiness.type.replace('_', ' ')}</p><h2 className="mt-2 text-2xl font-black">{state.selectedBusiness.name}</h2><p className="mt-1 text-sm text-teal-100">{state.selectedBusiness.address}, {state.selectedBusiness.city}</p></div><span className="self-start rounded-full bg-emerald-300/20 px-3 py-1 text-xs font-bold text-emerald-100">{state.selectedBusiness.status}</span></div></section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[['Tổng booking', state.metrics?.totalBookings, CalendarCheck, 'text-blue-700 bg-blue-50'], ['Chờ xử lý', state.metrics?.pendingBookings, Clock3, 'text-amber-700 bg-amber-50'], ['Đã hoàn thành', state.metrics?.completedBookings, CheckCircle2, 'text-emerald-700 bg-emerald-50']].map(([label, value, Icon, color]: any) => <article key={label} className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"><div className={`inline-flex rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></div><p className="mt-4 text-sm font-semibold text-slate-500">{label}</p><p className="mt-1 text-3xl font-black">{loading ? '—' : value || 0}</p></article>)}
        <article className="rounded-2xl border border-teal-100 bg-white p-5 shadow-sm"><div className="inline-flex rounded-xl bg-teal-50 p-2.5 text-teal-700"><WalletCards className="h-5 w-5" /></div><p className="mt-4 text-sm font-semibold text-slate-500">Doanh thu hoàn tất</p><p className="mt-1 text-2xl font-black">{formatCurrencyVND(state.metrics?.revenue || 0)}</p></article>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">{[['Địa điểm',state.metrics?.places],['Tour',state.metrics?.tours],['Vé',state.metrics?.tickets],['Bài viết',state.metrics?.blogs]].map(([label,value])=><div key={label as string} className="rounded-xl border border-teal-100 bg-white px-4 py-3"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-1 text-xl font-black">{value||0}</p></div>)}</div>
    </>}
  </div>;
};
