import React, { useEffect, useState } from 'react';
import { ArrowRight, Plus, RefreshCw, Send, Trash2 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ManagementService, PartnerResource } from '../../services/managementService';
import { formatCurrencyVND } from '../../utils/formatters';

const labels: Record<PartnerResource, string> = {
  places: 'Địa điểm & cơ sở',
  tours: 'Tour du lịch',
  tickets: 'Vé & tồn kho',
  blogs: 'Bài viết',
};
const allowed = new Set(Object.keys(labels));
const titleOf = (resource: PartnerResource, item: any) => resource === 'places' ? item.name : item.title;
const priceOf = (resource: PartnerResource, item: any) => resource === 'places' ? item.priceFrom : resource === 'tours' ? item.priceVND : resource === 'tickets' ? item.price : null;

export const PartnerResourceListPage: React.FC = () => {
  const resource = String(useParams().resource) as PartnerResource;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const load = async (nextPage = page) => {
    if (!allowed.has(resource)) return;
    setLoading(true);
    setError('');
    try {
      const result = await ManagementService.partnerList(resource, { search, status: status || undefined, page: nextPage, limit: 20 });
      setItems(result.items || []);
      setPages(result.pages || Math.max(1, Math.ceil(result.total / result.limit)));
      setPage(nextPage);
    } catch (requestError: any) {
      setError(requestError?.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    load(1);
  }, [resource, status]);

  const submit = async (id: string) => {
    if (resource === 'tickets') return;
    try {
      await ManagementService.partnerSubmit(resource, id);
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || 'Không thể gửi duyệt.');
    }
  };

  const archive = async (id: string, title: string) => {
    if (!window.confirm(`Ngừng hiển thị “${title}”? Dữ liệu sẽ được giữ lại để kiểm toán.`)) return;
    try {
      await ManagementService.partnerDelete(resource, id);
      await load();
    } catch (requestError: any) {
      setError(requestError?.message || 'Không thể ngừng hiển thị nội dung.');
    }
  };

  if (!allowed.has(resource)) return <div className="rounded-2xl bg-white p-8">Module không tồn tại.</div>;

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[.2em] text-teal-700">Partner content</p>
        <h1 className="mt-1 text-3xl font-black">{labels[resource]}</h1>
        <p className="mt-2 text-sm text-slate-500">Dữ liệu chỉ gồm các cơ sở bạn được phân quyền.</p>
      </div>
      <Link to={`/partner/${resource}/new`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-3 text-sm font-bold text-white">
        <Plus className="h-4 w-4" />Tạo mới
      </Link>
    </div>

    <div className="flex flex-wrap gap-2">
      <input value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && load(1)} placeholder="Tìm theo tên…" className="min-w-[220px] flex-1 rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500" />
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-teal-200 bg-white px-4 py-3 text-sm">
        <option value="">Mọi trạng thái</option>
        {resource === 'tickets' ? <><option>ACTIVE</option><option>INACTIVE</option></> : <><option>DRAFT</option><option>PENDING</option><option>APPROVED</option><option>REJECTED</option><option>SUSPENDED</option></>}
      </select>
      <button type="button" aria-label="Tải lại" onClick={() => load(1)} className="rounded-xl border border-teal-200 bg-white px-4"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
    </div>

    {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <div className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-teal-950 text-teal-50"><tr><th className="px-5 py-4">Nội dung</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4">Giá / Sức chứa</th><th className="px-5 py-4 text-right">Thao tác</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {!loading && !items.length && <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">Chưa có dữ liệu. Hãy tạo nội dung đầu tiên.</td></tr>}
            {items.map((item) => {
              const title = titleOf(resource, item);
              const archived = resource === 'tickets' ? item.status === 'INACTIVE' : item.status === 'SUSPENDED';
              return <tr key={item.id} data-testid={`partner-${resource}-row`} className="hover:bg-teal-50/40">
                <td className="px-5 py-4"><div className="flex items-center gap-3">{(item.heroImage || item.coverImage || item.imageUrl) && <img src={item.heroImage || item.coverImage || item.imageUrl} className="h-12 w-16 rounded-lg object-cover" alt="" />}<div><p className="font-bold text-slate-900">{title}</p><p className="text-xs text-slate-500">{item.city || item.destinationCity || item.departureCity || item.destinationName}</p></div></div></td>
                <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{item.status || '—'}</span></td>
                <td className="px-5 py-4">{priceOf(resource, item) !== null ? formatCurrencyVND(priceOf(resource, item)) : ''}{resource === 'tickets' && <p className="text-xs text-slate-500">{item.availableSeats}/{item.capacity} chỗ</p>}{resource === 'tours' && <p className="text-xs text-slate-500">{item.availableCapacity}/{item.capacity} chỗ</p>}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-2">
                  {resource !== 'tickets' && ['DRAFT', 'REJECTED'].includes(item.status) && <button type="button" onClick={() => submit(item.id)} className="rounded-lg border border-amber-200 px-3 py-2 text-xs font-bold text-amber-700"><Send className="mr-1 inline h-3 w-3" />Gửi duyệt</button>}
                  <Link to={`/partner/${resource}/${item.id}/edit`} className="rounded-lg bg-teal-50 px-3 py-2 text-xs font-bold text-teal-800">Chi tiết <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
                  {!archived && <button type="button" aria-label={`Ngừng hiển thị ${title}`} onClick={() => archive(item.id, title)} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700"><Trash2 className="h-3 w-3" /></button>}
                </div></td>
              </tr>;
            })}
          </tbody>
        </table>
      </div>
    </div>
    <div className="flex items-center justify-end gap-3 text-sm"><button disabled={page <= 1} onClick={() => load(page - 1)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Trang trước</button><span>{page}/{pages}</span><button disabled={page >= pages} onClick={() => load(page + 1)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40">Trang sau</button></div>
  </div>;
};
