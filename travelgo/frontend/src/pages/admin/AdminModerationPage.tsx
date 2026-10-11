import React, { useEffect, useState } from 'react';
import { Check, Eye, ShieldAlert, X } from 'lucide-react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ManagementService, ModeratedResource } from '../../services/managementService';

const labels: Record<ModeratedResource,string> = { places:'Địa điểm', tours:'Tour', blogs:'Bài viết' };

export const AdminModerationPage: React.FC = () => {
  const params = useParams();
  const resource = String(params.resource || useLocation().pathname.split('/')[2]) as ModeratedResource;
  const [items,setItems] = useState<any[]>([]);
  const [selected,setSelected] = useState<any|null>(null);
  const [status,setStatus] = useState('PENDING');
  const [reason,setReason] = useState('');
  const [error,setError] = useState('');

  const load = async () => {
    try {
      setItems((await ManagementService.adminList(resource,{status})).items || []);
      if (params.id) setSelected(await ManagementService.adminGet(resource,params.id));
    } catch (requestError:any) { setError(requestError?.message || 'Không thể tải hàng chờ duyệt.'); }
  };
  useEffect(() => { if(labels[resource]) load(); }, [resource,status,params.id]);

  const decide = async (next:'APPROVED'|'REJECTED'|'SUSPENDED') => {
    if (!selected) return;
    if (next==='REJECTED' && !reason.trim()) { setError('Vui lòng nhập lý do từ chối.'); return; }
    try { await ManagementService.moderate(resource,selected.id,next,reason); setSelected(null); setReason(''); await load(); }
    catch (requestError:any) { setError(requestError?.message || 'Không thể moderation nội dung.'); }
  };

  if (!labels[resource]) return <div>Module không tồn tại.</div>;
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-700">Content moderation</p><h1 className="mt-1 text-3xl font-black">Duyệt {labels[resource]}</h1></div><select value={status} onChange={event=>setStatus(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold"><option>PENDING</option><option>APPROVED</option><option>REJECTED</option><option>SUSPENDED</option><option>DRAFT</option></select></div>
    {error&&<div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{items.map(item=><article key={item.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">{(item.heroImage||item.coverImage)&&<img src={item.heroImage||item.coverImage} className="h-44 w-full object-cover"/>}<div className="p-5"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">{item.status}</span><h2 className="mt-3 line-clamp-2 text-lg font-black">{item.name||item.title}</h2><p className="mt-2 line-clamp-2 text-sm text-slate-500">{item.summary||item.excerpt}</p><Link to={`/admin/${resource}/${item.id}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-cyan-800"><Eye className="h-4 w-4"/>Xem và quyết định</Link></div></article>)}</div>
    {!items.length&&<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">Không có nội dung ở trạng thái {status}.</div>}
    {selected&&<div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4"><div className="mx-auto my-8 max-w-3xl rounded-3xl bg-white p-7"><div className="flex justify-between"><div><p className="text-xs font-bold text-cyan-700">{selected.status}</p><h2 className="text-2xl font-black">{selected.name||selected.title}</h2><p className="mt-1 text-sm text-slate-500">Business: {selected.business?.name||selected.businessId||'Nội dung khách hàng'}</p></div><Link to={`/admin/${resource}`} onClick={()=>setSelected(null)}><X/></Link></div>{(selected.heroImage||selected.coverImage)&&<img src={selected.heroImage||selected.coverImage} className="mt-5 max-h-80 w-full rounded-2xl object-cover"/>}<p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-700">{selected.description||selected.content||selected.summary}</p><label className="mt-5 block text-sm font-bold">Lý do / ghi chú<textarea value={reason} onChange={event=>setReason(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal" placeholder="Bắt buộc khi từ chối"/></label><div className="mt-5 flex flex-wrap justify-end gap-3"><button onClick={()=>decide('SUSPENDED')} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold"><ShieldAlert className="h-4 w-4"/>Tạm ngưng</button><button onClick={()=>decide('REJECTED')} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 px-4 py-2 text-sm font-bold text-rose-700"><X className="h-4 w-4"/>Từ chối</button><button onClick={()=>decide('APPROVED')} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white"><Check className="h-4 w-4"/>Phê duyệt</button></div></div></div>}
  </div>;
};
