import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { EyeOff, ExternalLink, MessageSquareWarning, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import {
  BoButton,
  ConfirmDialog,
  DataColumn,
  DataTable,
  DescList,
  DetailDrawer,
  DrawerSection,
  EmptyState,
  PageHeader,
  StatusPill,
  errorCode,
  errorMessage,
  fmtNumber,
  useBackofficeBreadcrumbs,
  useQueryParams,
  useToast,
} from '../../components/backoffice';

interface QueueItem {
  id: string;
  targetId: string;
  comment: string | null;
  moderationStatus: string;
  reports: number;
}

type Action = 'PUBLISHED' | 'HIDDEN' | 'REJECTED';

const TABS = [
  { key: 'pending', label: 'Chờ duyệt' },
  { key: 'reported', label: 'Bị báo cáo' },
  { key: 'all', label: 'Tất cả' },
];

const PRESETS = ['Spam/quảng cáo', 'Ngôn từ xúc phạm', 'Lộ thông tin cá nhân', 'Gây hiểu nhầm'];

const ReportPill: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? <StatusPill status="REPORTED" tone="danger" label={`${fmtNumber(count)} báo cáo`} size="sm" /> : <span className="hgbo-muted hgbo-num">0</span>;

export const AdminReviewsPage: React.FC = () => {
  const { get, set } = useQueryParams();
  const { toast } = useToast();
  const tab = TABS.some((t) => t.key === get('tab')) ? get('tab') : 'pending';
  const openId = get('id');
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [dialog, setDialog] = useState<{ item: QueueItem; action: Action } | null>(null);

  useBackofficeBreadcrumbs([{ label: 'Kiểm duyệt' }, { label: 'Đánh giá & báo cáo' }]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    setDisabled(false);
    try {
      setItems(await AdminBackofficeService.reviewQueue());
    } catch (requestError) {
      if (errorCode(requestError) === 'REVIEW_INSIGHTS_UNAVAILABLE') setDisabled(true);
      else setError(errorMessage(requestError, 'Không thể tải hàng chờ đánh giá.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => ({
    pending: items.filter((i) => i.moderationStatus === 'PENDING').length,
    reported: items.filter((i) => i.reports > 0).length,
    all: items.length,
  }), [items]);

  const rows = useMemo(() => {
    if (tab === 'pending') return items.filter((i) => i.moderationStatus === 'PENDING');
    if (tab === 'reported') return items.filter((i) => i.reports > 0);
    return items;
  }, [items, tab]);

  const selected = items.find((i) => i.id === openId) || null;

  const act = async (reason?: string) => {
    if (!dialog) return;
    await AdminBackofficeService.moderateReview(dialog.item.id, dialog.action, reason);
    toast({ tone: 'success', message: 'Đã cập nhật. Điểm tổng hợp công khai do máy chủ tính lại.' });
    await load();
  };

  const actions = (item: QueueItem) => [
    { label: 'Hiển thị', icon: ShieldCheck, tone: 'primary' as const, disabled: item.moderationStatus === 'PUBLISHED' && item.reports === 0, onClick: () => setDialog({ item, action: 'PUBLISHED' }) },
    { label: 'Ẩn', icon: EyeOff, disabled: item.moderationStatus === 'HIDDEN', onClick: () => setDialog({ item, action: 'HIDDEN' }) },
    { label: 'Từ chối', icon: X, tone: 'danger' as const, disabled: item.moderationStatus === 'REJECTED', onClick: () => setDialog({ item, action: 'REJECTED' }) },
  ];

  const columns: DataColumn<QueueItem>[] = [
    {
      key: 'comment',
      header: 'Nội dung',
      primary: true,
      render: (row) => (
        <>
          <span className="hgbo-clamp3">{row.comment || <span className="hgbo-muted">Không có bình luận</span>}</span>
          <button type="button" className="hgbo-link hgbo-small" onClick={(event) => { event.stopPropagation(); set({ id: row.id }); }}>Xem thêm</button>
        </>
      ),
    },
    {
      key: 'target',
      header: 'Đối tượng',
      render: (row) => (
        <a className="hgbo-link" href={`/places/${row.targetId}`} target="_blank" rel="noopener" onClick={(event) => event.stopPropagation()}>
          Mở trang
          <span className="hgbo-sr"> (tab mới)</span>
          {' '}
          <ExternalLink size={14} aria-hidden="true" />
        </a>
      ),
    },
    { key: 'reports', header: 'Báo cáo', render: (row) => <ReportPill count={row.reports} /> },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusPill status={row.moderationStatus} domain="review" /> },
  ];

  const dialogReason = dialog && dialog.action !== 'PUBLISHED'
    ? { required: true, label: dialog.action === 'HIDDEN' ? 'Lý do ẩn' : 'Lý do từ chối', presets: PRESETS }
    : undefined;

  return (
    <div>
      <PageHeader
        title="Đánh giá & báo cáo vi phạm"
        subtitle="Không sửa nội dung hay điểm sao thay khách. Hàng chờ tối đa 100 mục mới nhất."
        actions={<BoButton icon={RefreshCw} loading={loading} onClick={load}>Làm mới</BoButton>}
        tabs={disabled ? undefined : TABS.map((t) => ({ key: t.key, label: t.label, badge: loading ? undefined : counts[t.key as keyof typeof counts] }))}
        tabValue={tab}
        onTabChange={(key) => set({ tab: key === 'pending' ? null : key })}
        tabsLabel="Lọc hàng chờ đánh giá"
      />
      {disabled ? (
        <EmptyState icon={MessageSquareWarning} title="Kiểm duyệt đánh giá chưa được bật trên máy chủ." description="Khi máy chủ bật tổng hợp đánh giá, hàng chờ sẽ hiện ở đây." />
      ) : (
        <DataTable
          caption="Hàng chờ kiểm duyệt đánh giá"
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={loading}
          error={error}
          onRetry={load}
          empty={{ icon: MessageSquareWarning, title: tab === 'reported' ? 'Không có đánh giá bị báo cáo' : 'Không có đánh giá chờ duyệt' }}
          onRowClick={(row) => set({ id: row.id })}
          selectedKey={openId || null}
          rowActions={actions}
        />
      )}
      <DetailDrawer
        open={!!openId && !disabled}
        onClose={() => set({ id: null })}
        title="Chi tiết đánh giá"
        status={selected?.moderationStatus}
        statusDomain="review"
        loading={loading && !selected}
        error={!loading && !selected ? 'Đánh giá không còn trong hàng chờ.' : null}
        footer={selected ? actions(selected).map((a) => (
          <BoButton key={a.label} variant={a.tone === 'primary' ? 'primary' : a.tone === 'danger' ? 'danger' : 'secondary'} icon={a.icon} disabled={a.disabled} onClick={a.onClick}>{a.label}</BoButton>
        )) : undefined}
      >
        {selected && (
          <>
            <DrawerSection title="Nội dung">
              <p className="hgbo-pre">{selected.comment || 'Không có bình luận.'}</p>
            </DrawerSection>
            <DrawerSection title="Thông tin">
              <DescList
                items={[
                  { label: 'Đối tượng', value: <a className="hgbo-link" href={`/places/${selected.targetId}`} target="_blank" rel="noopener">Mở trang công khai</a> },
                  { label: 'Báo cáo', value: <ReportPill count={selected.reports} /> },
                ]}
              />
            </DrawerSection>
          </>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={!!dialog}
        tone={dialog?.action === 'PUBLISHED' ? 'default' : 'danger'}
        title={dialog?.action === 'PUBLISHED' ? 'Hiển thị đánh giá này?' : dialog?.action === 'HIDDEN' ? 'Ẩn đánh giá này?' : 'Từ chối đánh giá này?'}
        description="Điểm tổng hợp công khai do máy chủ tính lại sau thao tác."
        confirmLabel={dialog?.action === 'PUBLISHED' ? 'Hiển thị' : dialog?.action === 'HIDDEN' ? 'Ẩn đánh giá' : 'Từ chối'}
        reason={dialogReason}
        onConfirm={act}
        onClose={() => setDialog(null)}
      />
    </div>
  );
};
