// Danh sách khách sạn khi URL chưa có :hotelId (Partner: /partner/hotels, Admin: /admin/hotels).
// Dữ liệu là GET …/hotels (≤100 dòng) do container tải; lọc/sắp xếp ở client.
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus } from 'lucide-react';
import {
  BoLinkButton,
  DataColumn,
  DataTable,
  FilterBar,
  FilterSelect,
  PageHeader,
  SortState,
  StatusPill,
  useDebounced,
  useQueryParams,
} from '../../../components/backoffice';
import { contentPending } from './shared';

interface Props {
  admin: boolean;
  embedded: boolean;
  base: string;
  list: any[];
  loading: boolean;
  error: string;
  onRetry: () => void;
}

const STATUS_OPTIONS = ['DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'].map((value) => ({
  value,
  label: { DRAFT: 'Bản nháp', PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Bị từ chối', SUSPENDED: 'Tạm ngưng' }[value] as string,
}));

export const HotelListView: React.FC<Props> = ({ admin, embedded, base, list, loading, error, onRetry }) => {
  const navigate = useNavigate();
  const query = useQueryParams();
  const [q, setQ] = useState(query.get('q'));
  const debounced = useDebounced(q);
  const status = query.get('status');
  const pendingOnly = query.get('pending') === '1';
  const [sort, setSort] = useState<SortState | null>(null);

  const rows = useMemo(() => {
    const text = debounced.trim().toLowerCase();
    let out = list.filter((h) => (!status || h.status === status) && (!pendingOnly || contentPending(h)) && (!text || String(h.name).toLowerCase().includes(text) || String(h.businessName || '').toLowerCase().includes(text)));
    if (sort) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      out = [...out].sort((a, b) => String(a[sort.key] ?? '').localeCompare(String(b[sort.key] ?? ''), 'vi') * dir);
    }
    return out;
  }, [list, debounced, status, pendingOnly, sort]);

  const columns: DataColumn<any>[] = [
    {
      key: 'name',
      header: 'Khách sạn',
      primary: true,
      sortable: true,
      render: (h) => <span className="hgbo-strong">{h.name}</span>,
    },
    {
      key: 'businessName',
      header: 'Doanh nghiệp',
      sortable: true,
      hideBelow: 1024,
      render: (h) => h.businessName || '—',
    },
    {
      key: 'status',
      header: 'Trạng thái',
      render: (h) => <StatusPill status={h.status} domain="moderation" size="sm" />,
    },
    {
      key: 'content',
      header: 'Nội dung',
      render: (h) => (
        <div className="hgp-cellstack">
          <span>
            v{h.contentVersion}
            {' · '}
            {h.approvedContentVersion == null ? 'đã duyệt: chưa có' : `đã duyệt v${h.approvedContentVersion}`}
          </span>
          {contentPending(h) && (
            <StatusPill status="PENDING" size="sm" label={admin ? 'Có thay đổi chờ duyệt' : 'Có thay đổi chưa gửi duyệt'} />
          )}
        </div>
      ),
    },
    {
      key: 'commercialVersion',
      header: 'Giá/tồn',
      hideBelow: 1280,
      render: (h) => `v${h.commercialVersion}`,
    },
  ];

  const activeCount = (status ? 1 : 0) + (pendingOnly ? 1 : 0) + (debounced.trim() ? 1 : 0);

  return (
    <div className="hgp-page hgbo-stack">
      {!embedded && (
        <PageHeader
          title={admin ? 'Kiểm duyệt khách sạn' : 'Khách sạn của bạn'}
          subtitle={admin ? 'Duyệt đúng phiên bản nội dung. Giá và tồn phòng do đối tác quản lý.' : 'Chọn hoặc tạo khách sạn để quản lý hồ sơ, phòng, giá và tồn phòng.'}
          actions={!admin ? (
            <BoLinkButton variant="primary" icon={Plus} to={`${base}/new`}>
              Thêm khách sạn
            </BoLinkButton>
          ) : undefined}
        />
      )}
      <FilterBar
        search={{ value: q, onChange: (value) => { setQ(value); query.set({ q: value }); }, placeholder: 'Tìm theo tên khách sạn', label: 'Tìm khách sạn' }}
        activeCount={activeCount}
        onReset={() => {
          setQ('');
          query.set({ q: null, status: null, pending: null });
        }}
      >
        <FilterSelect
          label="Trạng thái"
          value={status}
          options={STATUS_OPTIONS}
          onChange={(value) => query.set({ status: value })}
        />
        <label className="hgp-inlinecheck">
          <input
            type="checkbox"
            checked={pendingOnly}
            onChange={(event) => query.set({ pending: event.target.checked ? '1' : null })}
          />
          {admin ? 'Chỉ hiện mục có thay đổi chờ duyệt' : 'Chỉ hiện mục có thay đổi chưa gửi duyệt'}
        </label>
        <div className="hgbo-field">
          <label className="hgbo-field__label" htmlFor="hgp-quick-hotel">Mở nhanh</label>
          <select
            id="hgp-quick-hotel"
            className="hgbo-select"
            aria-label="Chọn khách sạn"
            value=""
            onChange={(event) => event.target.value && navigate(`${base}/${event.target.value}/overview`)}
          >
            <option value="">Chọn khách sạn trong phạm vi quản lý</option>
            {list.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
      </FilterBar>
      <DataTable
        caption={admin ? 'Danh sách khách sạn cần kiểm duyệt' : 'Danh sách khách sạn của bạn'}
        columns={columns}
        rows={rows}
        rowKey={(h) => h.id}
        loading={loading}
        error={error || null}
        onRetry={onRetry}
        sort={sort}
        onSortChange={setSort}
        onRowClick={(h) => navigate(`${base}/${h.id}/overview`)}
        rowActions={(h) => admin
          ? [{ label: 'Xem', to: `${base}/${h.id}/overview` }]
          : [
            { label: 'Quản lý', to: `${base}/${h.id}/overview` },
            ...(['DRAFT', 'REJECTED'].includes(h.status) ? [{ label: 'Tiếp tục thiết lập', to: `${base}/${h.id}/setup` }] : [{ label: 'Giá & tồn', to: `${base}/${h.id}/calendar` }]),
          ]}
        empty={{
          icon: Building2,
          title: list.length ? 'Không có khách sạn khớp bộ lọc' : admin ? 'Chưa có khách sạn nào' : 'Chưa có khách sạn trong phạm vi của bạn',
          description: !admin && !list.length ? 'Tạo khách sạn đầu tiên để bắt đầu thiết lập phòng, giá và tồn phòng.' : undefined,
          action: !admin && !list.length ? <BoLinkButton variant="primary" icon={Plus} to={`${base}/new`}>Thêm khách sạn</BoLinkButton> : undefined,
        }}
      />
    </div>
  );
};
