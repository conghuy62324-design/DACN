import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Archive, ArrowDown, ArrowUp, Eye, ImageOff, Pencil, Plus, Send, Undo2 } from 'lucide-react';
import { AdminBackofficeService } from '../../../services/adminBackofficeService';
import {
  Alert,
  BoButton,
  BoLinkButton,
  BoTabs,
  ConfirmDialog,
  ConfirmDialogProps,
  ConflictBanner,
  DataColumn,
  DataTable,
  StatusPill,
  errorCode,
  errorMessage,
  fmtDateTime,
  fmtShortDateTime,
  isConflictError,
  useQueryParams,
  useToast,
} from '../../../components/backoffice';

export interface Banner {
  id: string;
  title: string;
  subtitle?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  imageDesktop?: string | null;
  imageMobile?: string | null;
  altText?: string | null;
  imageCredit?: string | null;
  status: string;
  position: number;
  startsAt?: string | null;
  endsAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string | null;
  updatedBy?: string | null;
  version: number;
}

const VIEWS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'live', label: 'Đang hiển thị' },
  { key: 'scheduled', label: 'Đã lên lịch' },
  { key: 'draft', label: 'Bản nháp' },
  { key: 'archived', label: 'Đã lưu trữ' },
];

const VIEW_STATUS: Record<string, string | undefined> = { live: 'PUBLISHED', scheduled: 'SCHEDULED', draft: 'DRAFT', archived: 'ARCHIVED' };

export const scheduleText = (b: { startsAt?: string | null; endsAt?: string | null }) => {
  if (!b.startsAt && !b.endsAt) return 'Không giới hạn';
  return `${b.startsAt ? fmtShortDateTime(b.startsAt) : 'Ngay khi xuất bản'} → ${b.endsAt ? fmtShortDateTime(b.endsAt) : 'Không giới hạn'}`;
};

type Pending = { kind: 'publish' | 'unpublish' | 'archive'; banner: Banner };

export const BannerList: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { get, set } = useQueryParams();
  const view = VIEWS.some((v) => v.key === get('view')) ? get('view') : 'all';
  const [items, setItems] = useState<Banner[]>([]);
  const [archived, setArchived] = useState<Banner[]>([]);
  const [order, setOrder] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setConflict(false);
    try {
      const [main, old] = await Promise.all([
        AdminBackofficeService.banners(),
        view === 'archived' ? AdminBackofficeService.banners('ARCHIVED') : Promise.resolve({ items: [] as Banner[], total: 0 }),
      ]);
      setItems([...(main.items || [])].sort((a: Banner, b: Banner) => a.position - b.position));
      setArchived(old.items || []);
      setOrder(null);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải danh sách banner.'));
    } finally {
      setLoading(false);
    }
  }, [view]);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => items.filter((b) => b.status !== 'ARCHIVED'), [items]);
  const ordered = useMemo(() => {
    if (!order) return active;
    const map = new Map(active.map((b) => [b.id, b]));
    return order.map((id) => map.get(id)).filter(Boolean) as Banner[];
  }, [active, order]);

  const rows = useMemo(() => {
    if (view === 'archived') return archived.length ? archived : items.filter((b) => b.status === 'ARCHIVED');
    if (view === 'all') return ordered;
    return ordered.filter((b) => b.status === VIEW_STATUS[view]);
  }, [view, ordered, archived, items]);

  const live = active.filter((b) => b.status === 'PUBLISHED');
  const orderDirty = !!order && order.join(',') !== active.map((b) => b.id).join(',');

  const move = (id: string, delta: number) => {
    const ids = (order || active.map((b) => b.id)).slice();
    const index = ids.indexOf(id);
    const next = index + delta;
    if (index < 0 || next < 0 || next >= ids.length) return;
    [ids[index], ids[next]] = [ids[next], ids[index]];
    setOrder(ids);
  };

  const saveOrder = async () => {
    if (!order) return;
    setSavingOrder(true);
    setOrderError('');
    try {
      await AdminBackofficeService.orderBanners(order);
      toast({ tone: 'success', message: 'Đã lưu thứ tự banner.' });
      await load();
    } catch (requestError) {
      setOrderError(errorCode(requestError) === 'CMS_ORDER_INVALID' ? 'Danh sách banner đã thay đổi. Đã tải lại thứ tự mới nhất.' : errorMessage(requestError, 'Không lưu được thứ tự.'));
      if (errorCode(requestError) === 'CMS_ORDER_INVALID') await load();
    } finally {
      setSavingOrder(false);
    }
  };

  const confirmPending = async (reason?: string) => {
    if (!pending) return;
    const { kind, banner } = pending;
    try {
      if (kind === 'publish') await AdminBackofficeService.publishBanner(banner.id, banner.version, banner.startsAt, banner.endsAt);
      if (kind === 'unpublish') await AdminBackofficeService.unpublishBanner(banner.id, banner.version, reason);
      if (kind === 'archive') await AdminBackofficeService.archiveBanner(banner.id, reason);
    } catch (requestError) {
      if (isConflictError(requestError)) setConflict(true);
      throw requestError;
    }
    toast({ tone: 'success', message: kind === 'publish' ? 'Đã xuất bản banner.' : kind === 'unpublish' ? 'Đã gỡ banner xuống.' : 'Đã lưu trữ banner.' });
    await load();
  };

  const dialogProps = (p: Pending | null): Pick<ConfirmDialogProps, 'title' | 'confirmLabel' | 'tone' | 'reason' | 'impact'> => {
    if (!p || p.kind === 'publish') {
      return {
        title: 'Xuất bản banner?',
        confirmLabel: 'Xuất bản',
        tone: 'default',
        impact: p ? <p>Banner hiển thị từ {p.banner.startsAt ? fmtDateTime(p.banner.startsAt) : 'ngay bây giờ'} đến {p.banner.endsAt ? fmtDateTime(p.banner.endsAt) : 'không giới hạn'}.</p> : undefined,
      };
    }
    if (p.kind === 'unpublish') {
      return { title: 'Gỡ banner xuống?', confirmLabel: 'Gỡ xuống', tone: 'danger', reason: { required: true, label: 'Lý do gỡ xuống' }, impact: <p>Banner chuyển về Bản nháp và không còn hiện trên trang chủ.</p> };
    }
    return { title: 'Lưu trữ banner?', confirmLabel: 'Lưu trữ', tone: 'danger', reason: { required: true, label: 'Lý do lưu trữ' }, impact: <p>Banner bị ẩn khỏi danh sách và trang chủ (xóa mềm, vẫn giữ lịch sử).</p> };
  };

  const canReorder = view === 'all';

  const columns: DataColumn<Banner>[] = [
    {
      key: 'image',
      header: 'Ảnh',
      card: 'hide',
      width: 112,
      render: (row) => (row.imageDesktop ? (
        <img className="hgbo-thumb hgbo-thumb--banner" src={row.imageDesktop} alt="" loading="lazy" />
      ) : (
        <span className="hgbo-thumb hgbo-thumb--banner" aria-hidden="true"><ImageOff /></span>
      )),
    },
    {
      key: 'title',
      header: 'Tiêu đề',
      primary: true,
      render: (row) => (
        <>
          <span className="hgbo-clamp2">{row.title}</span>
          {row.subtitle && <span className="hgbo-dt__cell-sub hgbo-clamp2">{row.subtitle}</span>}
        </>
      ),
    },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusPill status={row.status} domain="cms" /> },
    { key: 'schedule', header: 'Lịch hiển thị', hideBelow: 1024, render: (row) => <span className="hgbo-num">{scheduleText(row)}</span> },
    {
      key: 'order',
      header: 'Thứ tự',
      card: canReorder ? 'meta' : 'hide',
      render: (row) => {
        if (!canReorder || row.status === 'ARCHIVED') return <span className="hgbo-num">{row.position}</span>;
        const index = ordered.findIndex((b) => b.id === row.id);
        return (
          <span className="hgbo-orderbtns">
            <BoButton size="sm" variant="secondary" icon={ArrowUp} aria-label={`Đưa ${row.title} lên`} disabled={index <= 0} onClick={(event) => { event.stopPropagation(); move(row.id, -1); }} />
            <BoButton size="sm" variant="secondary" icon={ArrowDown} aria-label={`Đưa ${row.title} xuống`} disabled={index >= ordered.length - 1} onClick={(event) => { event.stopPropagation(); move(row.id, 1); }} />
          </span>
        );
      },
    },
    {
      key: 'updated',
      header: 'Cập nhật',
      hideBelow: 1280,
      render: (row) => (
        <>
          {row.updatedBy || '—'}
          <span className="hgbo-dt__cell-sub hgbo-num">{fmtDateTime(row.updatedAt)}</span>
        </>
      ),
    },
  ];

  const rowActions = (row: Banner) => {
    if (row.status === 'ARCHIVED') return [];
    const live = row.status === 'PUBLISHED' || row.status === 'SCHEDULED';
    return [
      { label: 'Sửa', icon: Pencil, to: `/admin/cms/banners/${row.id}` },
      { label: 'Xem trước', icon: Eye, to: `/admin/cms/banners/${row.id}?tab=preview` },
      live
        ? { label: 'Gỡ xuống', icon: Undo2, tone: 'danger' as const, onClick: () => setPending({ kind: 'unpublish', banner: row }) }
        : { label: 'Xuất bản', icon: Send, onClick: () => setPending({ kind: 'publish', banner: row }) },
      { label: 'Lưu trữ', icon: Archive, tone: 'danger' as const, onClick: () => setPending({ kind: 'archive', banner: row }) },
    ];
  };

  return (
    <div className="hgbo-stack">
      <Alert
        tone="info"
        action={<BoLinkButton variant="primary" icon={Plus} to="/admin/cms/banners/new">Thêm banner</BoLinkButton>}
      >
        <p>
          {loading ? 'Đang tải…' : live.length ? `Đang hiển thị trên trang chủ: ${live.map((b) => b.title).join(' · ')}` : 'Chưa có banner nào đang hiển thị trên trang chủ.'}
        </p>
      </Alert>
      {conflict && <ConflictBanner onReload={load} busy={loading} />}
      <BoTabs items={VIEWS} value={view} onChange={(key) => set({ view: key === 'all' ? null : key })} label="Lọc banner theo trạng thái" />
      {orderDirty && (
        <div className="hgbo-changebar is-sticky" role="status">
          <span>Thứ tự đã thay đổi</span>
          <span className="hgbo-row">
            <BoButton size="sm" variant="secondary" disabled={savingOrder} onClick={() => setOrder(null)}>Hủy</BoButton>
            <BoButton size="sm" variant="primary" loading={savingOrder} onClick={saveOrder}>Lưu thứ tự</BoButton>
          </span>
        </div>
      )}
      {orderError && <Alert tone="danger">{orderError}</Alert>}
      <DataTable
        caption="Danh sách banner trang chủ"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={{ title: view === 'all' ? 'Chưa có banner' : 'Không có banner ở trạng thái này', action: view === 'all' ? <BoLinkButton variant="primary" icon={Plus} to="/admin/cms/banners/new">Thêm banner</BoLinkButton> : undefined }}
        onRowClick={(row) => row.status !== 'ARCHIVED' && navigate(`/admin/cms/banners/${row.id}`)}
        rowActions={rowActions}
      />
      <ConfirmDialog
        open={!!pending}
        {...dialogProps(pending)}
        description={pending ? `“${pending.banner.title}”` : undefined}
        onConfirm={confirmPending}
        onClose={() => setPending(null)}
      />
    </div>
  );
};
