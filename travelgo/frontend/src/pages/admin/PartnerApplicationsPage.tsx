import React, { useEffect, useState } from 'react';
import { Check, Clock3, RefreshCw, X } from 'lucide-react';
import { PlatformService } from '../../services/platformService';
import { PartnerApplication } from '../../types';

export const PartnerApplicationsPage: React.FC = () => {
  const [items, setItems] = useState<PartnerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setError('');
    try { setItems((await PlatformService.getPartnerApplications()).items); }
    catch (requestError: any) { setError(requestError?.message || 'Không thể tải hồ sơ.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (application: PartnerApplication, status: 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO') => {
    const reason = status === 'APPROVED' ? undefined : window.prompt(status === 'REJECTED' ? 'Lý do từ chối:' : 'Thông tin cần bổ sung:');
    if (status !== 'APPROVED' && !reason?.trim()) return;
    if (!window.confirm(`Xác nhận ${status === 'APPROVED' ? 'phê duyệt' : 'cập nhật'} hồ sơ “${application.businessName}”?`)) return;
    setProcessing(application.id);
    try { await PlatformService.decidePartnerApplication(application.id, status, reason || undefined); await load(); }
    catch (requestError: any) { setError(requestError?.message || 'Không thể xử lý hồ sơ.'); }
    finally { setProcessing(null); }
  };

  return <div className="space-y-6">
    <div className="flex items-end justify-between"><div><p className="text-sm font-bold text-cyan-700">PARTNER ONBOARDING</p><h1 className="mt-1 text-3xl font-black">Duyệt hồ sơ đối tác</h1><p className="mt-2 text-sm text-slate-500">Mỗi quyết định được lưu vào Audit Log.</p></div><button onClick={load} className="rounded-xl border bg-white p-2.5" aria-label="Làm mới"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button></div>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-4">Cơ sở</th><th className="p-4">Đại diện</th><th className="p-4">Liên hệ</th><th className="p-4">Địa chỉ</th><th className="p-4">Trạng thái</th><th className="p-4 text-right">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">
        {!loading && !items.length && <tr><td colSpan={6} className="p-10 text-center text-slate-500">Chưa có hồ sơ đối tác.</td></tr>}
        {items.map((item) => <tr key={item.id} className="align-top hover:bg-slate-50/60"><td className="p-4"><p className="font-bold">{item.businessName}</p><p className="mt-1 text-xs text-cyan-700">{item.businessType.replace('_', ' ')}</p></td><td className="p-4">{item.representativeName}</td><td className="p-4"><p>{item.email}</p><p className="text-xs text-slate-500">{item.phone}</p></td><td className="p-4 max-w-xs">{item.address}, {item.city}</td><td className="p-4"><span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700"><Clock3 className="h-3 w-3" />{item.status}</span>{item.decisionReason && <p className="mt-2 max-w-xs text-xs text-slate-500">{item.decisionReason}</p>}</td><td className="p-4"><div className="flex justify-end gap-2"><button disabled={processing === item.id || !['PENDING','NEEDS_MORE_INFO'].includes(item.status)} onClick={() => decide(item, 'APPROVED')} className="rounded-lg bg-emerald-600 p-2 text-white disabled:opacity-30" title="Phê duyệt"><Check className="h-4 w-4" /></button><button disabled={processing === item.id || !['PENDING','NEEDS_MORE_INFO'].includes(item.status)} onClick={() => decide(item, 'NEEDS_MORE_INFO')} className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white disabled:opacity-30">Bổ sung</button><button disabled={processing === item.id || !['PENDING','NEEDS_MORE_INFO'].includes(item.status)} onClick={() => decide(item, 'REJECTED')} className="rounded-lg bg-rose-600 p-2 text-white disabled:opacity-30" title="Từ chối"><X className="h-4 w-4" /></button></div></td></tr>)}
      </tbody></table></div>
    </div>
  </div>;
};
