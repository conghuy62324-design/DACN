import React, { useCallback, useEffect, useState } from 'react';
import { BadgePercent, Ban } from 'lucide-react';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import {
  Alert,
  ApiPendingState,
  BO_FEATURES,
  BO_FEATURE_CONTRACT,
  BoButton,
  ConfirmDialog,
  DataColumn,
  DataTable,
  DescList,
  DetailDrawer,
  DrawerSection,
  FilterBar,
  FilterSelect,
  PageHeader,
  StatusPill,
  errorMessage,
  fmtDate,
  fmtDateTime,
  fmtNumber,
  fmtVnd,
  useBackofficeBreadcrumbs,
  useQueryParams,
  useToast,
} from '../../components/backoffice';

const STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Bản nháp' },
  { value: 'ACTIVE', label: 'Đang áp dụng' },
  { value: 'ARCHIVED', label: 'Đã kết thúc' },
];
const EFFECTIVE_OPTIONS = [
  { value: 'UPCOMING', label: 'Sắp diễn ra' },
  { value: 'RUNNING', label: 'Đang hiệu lực' },
  { value: 'EXPIRED', label: 'Hết hạn' },
];

export const discountText = (p: any): string => {
  if (p.kind === 'PERCENT_BPS') {
    const pct = (Number(p.value) / 100).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
    return p.maxDiscountVnd ? `${pct}%, tối đa ${fmtVnd(p.maxDiscountVnd)}` : `${pct}%`;
  }
  if (p.kind === 'FIXED_STAY') return `${fmtVnd(p.value)} cho cả kỳ`;
  return '—';
};

const scopeText = (p: any) => (p.ratePlanId ? 'Gói giá' : p.roomTypeId ? 'Hạng phòng' : 'Toàn khách sạn');
const rangeDateTime = (from?: string | null, to?: string | null) => `${from ? fmtDateTime(from) : '—'} → ${to ? fmtDateTime(to) : 'Không giới hạn'}`;
const rangeDate = (from?: string | null, to?: string | null) => `${from ? fmtDate(from) : '—'} → ${to ? fmtDate(to) : 'Không giới hạn'}`;

const PromotionsInner: React.FC = () => {
  const { toast } = useToast();
  const { get, set } = useQueryParams();
  const page = Math.max(1, Number(get('page', '1')) || 1);
  const limit = [20, 50, 100].includes(Number(get('limit'))) ? Number(get('limit')) : 20;
  const placeId = get('placeId');
  const status = get('status');
  const effective = get('effective');
  const openId = get('id');
  const [hotels, setHotels] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [suspendOpen, setSuspendOpen] = useState(false);

  useEffect(() => {
    AdminBackofficeService.adminHotels().then(setHotels).catch(() => setHotels([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const filters: Record<string, string | number> = { page, limit };
      if (placeId) filters.placeId = placeId;
      if (status) filters.status = status;
      if (effective) filters.effective = effective;
      const result = await AdminBackofficeService.promotions(filters);
      setItems(result.items || []);
      setTotal(result.total ?? 0);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải danh sách ưu đãi.'));
    } finally {
      setLoading(false);
    }
  }, [page, limit, placeId, status, effective]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = items.find((p) => p.id === openId) || null;
  const close = () => set({ id: null });
  const suspend = async (reason?: string) => {
    if (!selected) return;
    await AdminBackofficeService.suspendPromotion(selected.id, reason || '', selected.revision);
    toast({ tone: 'success', message: `Đã đình chỉ ưu đãi “${selected.name}”.` });
    await load();
  };

  const columns: DataColumn<any>[] = [
    { key: 'name', header: 'Tên', primary: true },
    { key: 'hotelName', header: 'Khách sạn' },
    { key: 'scope', header: 'Phạm vi', hideBelow: 1280, render: scopeText },
    { key: 'discount', header: 'Mức giảm', render: (row) => <span className="hgbo-num">{discountText(row)}</span> },
    { key: 'booking', header: 'Thời gian đặt', hideBelow: 1280, render: (row) => <span className="hgbo-num">{rangeDateTime(row.bookingStartsAt, row.bookingEndsAt)}</span> },
    { key: 'stay', header: 'Thời gian lưu trú', hideBelow: 1024, render: (row) => <span className="hgbo-num">{rangeDate(row.stayFrom, row.stayUntil)}</span> },
    { key: 'minNights', header: 'Tối thiểu', hideBelow: 1280, render: (row) => (row.minNights ? `${fmtNumber(row.minNights)} đêm` : '—') },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (row) => (
        <span className="hgbo-roles">
          <StatusPill status={row.status} domain="promotion" size="sm" />
          {row.effective && <StatusPill status={row.effective} domain="promotion" size="sm" />}
        </span>
      ),
    },
  ];

  const activeCount = (placeId ? 1 : 0) + (status ? 1 : 0) + (effective ? 1 : 0);

  return (
    <>
      <FilterBar
        activeCount={activeCount}
        onReset={() => set({ placeId: null, status: null, effective: null, page: null })}
      >
        <FilterSelect label="Khách sạn" value={placeId} onChange={(v) => set({ placeId: v || null, page: null })} options={hotels.map((h) => ({ value: h.id, label: h.name }))} />
        <FilterSelect label="Trạng thái" value={status} onChange={(v) => set({ status: v || null, page: null })} options={STATUS_OPTIONS} />
        <FilterSelect label="Hiệu lực" value={effective} onChange={(v) => set({ effective: v || null, page: null })} options={EFFECTIVE_OPTIONS} />
      </FilterBar>
      <DataTable
        caption="Danh sách ưu đãi khách sạn"
        columns={columns}
        rows={items}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={{ icon: BadgePercent, title: activeCount ? 'Không có ưu đãi khớp bộ lọc' : 'Chưa có ưu đãi' }}
        onRowClick={(row) => set({ id: row.id })}
        selectedKey={selected?.id}
        pagination={{ page, limit, total, onChange: (p, l) => set({ page: p > 1 ? p : null, limit: l !== 20 ? l : null }) }}
      />
      <DetailDrawer
        open={!!openId}
        onClose={close}
        title={selected?.name || 'Ưu đãi'}
        subtitle={selected?.hotelName}
        status={selected ? (
          <span className="hgbo-roles">
            <StatusPill status={selected.status} domain="promotion" />
            {selected.effective && <StatusPill status={selected.effective} domain="promotion" />}
          </span>
        ) : undefined}
        loading={loading && !selected}
        error={!loading && openId && !selected ? 'Ưu đãi không nằm trong trang đang xem.' : null}
        footer={selected && selected.status !== 'ARCHIVED' ? (
          <BoButton variant="danger" icon={Ban} onClick={() => setSuspendOpen(true)}>Đình chỉ ưu đãi</BoButton>
        ) : undefined}
      >
        {selected && (
          <>
            <DrawerSection title="Điều kiện ưu đãi (chỉ đọc)">
              <DescList
                items={[
                  { label: 'Khách sạn', value: selected.hotelName },
                  { label: 'Phạm vi', value: scopeText(selected) },
                  { label: 'Mức giảm', value: discountText(selected) },
                  { label: 'Thời gian đặt', value: rangeDateTime(selected.bookingStartsAt, selected.bookingEndsAt) },
                  { label: 'Thời gian lưu trú', value: rangeDate(selected.stayFrom, selected.stayUntil) },
                  { label: 'Tối thiểu', value: selected.minNights ? `${fmtNumber(selected.minNights)} đêm` : null },
                ]}
              />
            </DrawerSection>
            <Alert tone="info">
              <p>Quản trị viên không sửa giá trị, điều kiện ưu đãi hay giá phòng của đối tác. Hiệu lực do máy chủ tính theo giờ máy chủ.</p>
            </Alert>
          </>
        )}
      </DetailDrawer>
      <ConfirmDialog
        open={suspendOpen}
        tone="danger"
        title="Đình chỉ ưu đãi?"
        description={selected ? `“${selected.name}” — ${selected.hotelName}` : undefined}
        impact={<p>Ưu đãi chuyển sang Đã kết thúc và không còn áp dụng cho đơn mới.</p>}
        confirmLabel="Đình chỉ"
        reason={{ required: true, label: 'Lý do đình chỉ' }}
        onConfirm={suspend}
        onClose={() => setSuspendOpen(false)}
      />
    </>
  );
};

export const AdminPromotionsPage: React.FC = () => {
  useBackofficeBreadcrumbs([{ label: 'Nội dung website' }, { label: 'Ưu đãi' }]);
  return (
    <div>
      <PageHeader
        title="Ưu đãi"
        subtitle="Xem và lọc ưu đãi của các khách sạn. Chỉ đọc, có thể đình chỉ khi vi phạm."
      />
      {BO_FEATURES.adminPromotions ? (
        <PromotionsInner />
      ) : (
        <ApiPendingState feature="Quản lý ưu đãi" contractRef={BO_FEATURE_CONTRACT.adminPromotions} />
      )}
    </div>
  );
};

