import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Clock3, MapPin, XCircle } from 'lucide-react';
import { PlatformService } from '../services/platformService';
import { BusinessType, PartnerApplication } from '../types';

const businessTypes: Array<{ value: BusinessType; label: string }> = [
  { value: 'HOTEL', label: 'Khách sạn' }, { value: 'HOMESTAY', label: 'Homestay' }, { value: 'RESORT', label: 'Resort' }, { value: 'RESTAURANT', label: 'Nhà hàng' }, { value: 'TOUR_OPERATOR', label: 'Đơn vị tổ chức Tour' },
];

export const BecomePartnerPage: React.FC = () => {
  const [applications, setApplications] = useState<PartnerApplication[]>([]);
  const [form, setForm] = useState({ representativeName: '', businessName: '', businessType: 'HOTEL' as BusinessType, email: '', phone: '', address: '', city: '', latitude: '', longitude: '', taxCode: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const load = () => PlatformService.getMyPartnerApplications().then(setApplications).catch(() => undefined);
  useEffect(() => { load(); }, []);
  // Show the latest submission, so a historical decision cannot replace a newer application.
  // The API orders by createdAt DESC; keep that order for equal timestamps.
  const latest = [...applications].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  const active = latest && ['PENDING', 'NEEDS_MORE_INFO', 'APPROVED'].includes(latest.status);
  const displayed = latest && (active || latest.status === 'REJECTED') ? latest : undefined;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSubmitting(true); setError(''); setSuccess('');
    try {
      await PlatformService.submitPartnerApplication({ ...form, latitude: form.latitude ? Number(form.latitude) : undefined, longitude: form.longitude ? Number(form.longitude) : undefined, verificationDetails: { taxCode: form.taxCode } });
      setSuccess('Hồ sơ đã được gửi. HuGo Travel sẽ phản hồi sau khi xác minh.'); await load();
    } catch (requestError: any) { setError(requestError?.message || 'Không thể gửi hồ sơ.'); }
    finally { setSubmitting(false); }
  };

  return <div className="min-h-screen bg-slate-50 pb-20 pt-28"><div className="mx-auto max-w-5xl px-4"><div className="mb-8 text-center"><span className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-xs font-bold text-teal-700"><Building2 className="h-4 w-4" />HuGo Partner Network</span><h1 className="mt-4 text-4xl font-black tracking-tight">Đưa dịch vụ của bạn đến gần du khách</h1><p className="mx-auto mt-3 max-w-2xl text-slate-500">Nộp hồ sơ xác minh. Quyền PARTNER chỉ được cấp sau khi quản trị viên phê duyệt.</p></div>
    {displayed && <section data-testid="partner-application-status" data-application-id={displayed.id} className={`mx-auto max-w-2xl rounded-3xl border bg-white p-8 shadow-sm ${displayed.status === 'REJECTED' ? 'mb-6 border-rose-200' : 'border-teal-100'}`}><div className="flex items-start gap-4">{displayed.status === 'APPROVED' ? <CheckCircle2 className="h-10 w-10 shrink-0 text-emerald-600" /> : displayed.status === 'REJECTED' ? <XCircle className="h-10 w-10 shrink-0 text-rose-600" /> : <Clock3 className="h-10 w-10 shrink-0 text-amber-500" />}<div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-widest text-slate-500">Trạng thái hồ sơ</p><h2 className="mt-1 break-words text-2xl font-black">{displayed.businessName}</h2><span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${displayed.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>{displayed.status}</span>{displayed.decisionReason && <p className="mt-4 whitespace-pre-wrap break-words rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Phản hồi: {displayed.decisionReason}</p>}<p className="mt-4 text-sm text-slate-500">Gửi lúc {new Date(displayed.createdAt).toLocaleString('vi-VN')}</p>{displayed.status === 'REJECTED' && <p className="mt-4 text-sm text-slate-600">Bạn có thể gửi hồ sơ mới bằng biểu mẫu bên dưới.</p>}</div></div></section>}
    {!active &&
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9"><div className="grid gap-5 sm:grid-cols-2">
      {[['representativeName','Họ tên người đại diện'],['businessName','Tên cơ sở kinh doanh'],['email','Email liên hệ'],['phone','Số điện thoại'],['city','Tỉnh / thành phố'],['taxCode','Mã số thuế / thông tin xác minh']].map(([name,label]) => <label key={name} className="text-sm font-bold text-slate-700">{label}<input required value={(form as any)[name]} onChange={(e) => setForm({...form,[name]:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-teal-500" /></label>)}
      <label className="text-sm font-bold text-slate-700">Loại hình kinh doanh<select value={form.businessType} onChange={(e) => setForm({...form,businessType:e.target.value as BusinessType})} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-teal-500">{businessTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label className="text-sm font-bold text-slate-700 sm:col-span-2">Địa chỉ cơ sở<textarea required value={form.address} onChange={(e) => setForm({...form,address:e.target.value})} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:ring-2 focus:ring-teal-500" /></label>
      <div className="sm:col-span-2 rounded-2xl bg-teal-50 p-4"><p className="flex items-center gap-2 text-sm font-bold text-teal-800"><MapPin className="h-4 w-4" />Vị trí bản đồ (không bắt buộc)</p><div className="mt-3 grid gap-3 sm:grid-cols-2"><input type="number" step="any" placeholder="Vĩ độ" value={form.latitude} onChange={(e) => setForm({...form,latitude:e.target.value})} className="rounded-xl border border-teal-200 px-4 py-3 text-sm" /><input type="number" step="any" placeholder="Kinh độ" value={form.longitude} onChange={(e) => setForm({...form,longitude:e.target.value})} className="rounded-xl border border-teal-200 px-4 py-3 text-sm" /></div></div>
    </div>{error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}{success && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}<button disabled={submitting} className="mt-6 w-full rounded-xl bg-teal-700 px-5 py-3.5 font-bold text-white hover:bg-teal-800 disabled:opacity-60">{submitting ? 'Đang gửi hồ sơ…' : 'Gửi hồ sơ xét duyệt'}</button></form>}
    </div></div>;
};
