import React, { useEffect, useState } from 'react';
import { Building2, CalendarCheck, CircleDollarSign, Clock3, Compass, Hotel, RefreshCw, Route, Store, Users } from 'lucide-react';
import { AdminDashboardData, PlatformService } from '../../services/platformService';
import { formatCurrencyVND } from '../../utils/formatters';

const metricConfig = [
  ['totalCustomers', 'Khách hàng', Users, 'bg-blue-50 text-blue-700'],
  ['totalPartners', 'Đối tác', Building2, 'bg-cyan-50 text-cyan-700'],
  ['pendingPartners', 'Hồ sơ chờ duyệt', Clock3, 'bg-amber-50 text-amber-700'],
  ['totalHotels', 'Cơ sở lưu trú', Hotel, 'bg-indigo-50 text-indigo-700'],
  ['totalRestaurants', 'Nhà hàng', Store, 'bg-rose-50 text-rose-700'],
  ['totalPlaces', 'Địa điểm', Compass, 'bg-teal-50 text-teal-700'],
  ['totalTours', 'Tour', Route, 'bg-violet-50 text-violet-700'],
  ['totalBookings', 'Booking', CalendarCheck, 'bg-emerald-50 text-emerald-700'],
] as const;

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError('');
    try { setData(await PlatformService.getAdminDashboard()); }
    catch (requestError: any) { setError(requestError?.message || 'Không thể tải dữ liệu quản trị.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-sm font-bold text-cyan-700">TỔNG QUAN NỀN TẢNG</p><h1 className="mt-1 text-3xl font-black tracking-tight">Trung tâm điều hành HuGo Travel</h1><p className="mt-2 text-sm text-slate-500">Chỉ số được tổng hợp trực tiếp từ cơ sở dữ liệu.</p></div>
        <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-slate-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Làm mới</button>
      </div>
      {error && <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metricConfig.map(([key, label, Icon, color]) => (
          <article key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><span className={`rounded-xl p-2.5 ${color}`}><Icon className="h-5 w-5" /></span></div>
            <p className="mt-5 text-3xl font-black">{loading ? '—' : data?.[key] ?? 0}</p>
          </article>
        ))}
        <article className="rounded-2xl bg-[#0b1f3a] p-5 text-white shadow-lg sm:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between"><span className="text-sm font-semibold text-slate-300">Doanh thu ghi nhận</span><CircleDollarSign className="h-6 w-6 text-cyan-300" /></div>
          <p className="mt-5 text-2xl font-black">{loading ? '—' : formatCurrencyVND(data?.totalRevenue || 0)}</p><p className="mt-2 text-xs text-slate-400">Không bao gồm booking đã hủy</p>
        </article>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5"><h2 className="font-extrabold">Hoạt động quản trị gần đây</h2><p className="text-xs text-slate-500">Audit log cho các quyết định quan trọng</p></div>
        <div className="divide-y divide-slate-100">
          {!loading && !data?.recentActivity.length && <p className="p-8 text-center text-sm text-slate-500">Chưa có hoạt động quản trị.</p>}
          {data?.recentActivity.map((activity) => <div key={activity.id} className="flex items-center justify-between gap-4 px-6 py-4"><div><p className="text-sm font-bold">{activity.action.replace(/_/g, ' ')}</p><p className="text-xs text-slate-500">{activity.entityType}</p></div><time className="text-xs text-slate-400">{new Date(activity.createdAt).toLocaleString('vi-VN')}</time></div>)}
        </div>
      </section>
    </div>
  );
};
