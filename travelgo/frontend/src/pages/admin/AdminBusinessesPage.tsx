import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RefreshCw, Store } from 'lucide-react';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import {
  Alert,
  BO_FEATURES,
  BoButton,
  DataColumn,
  DataTable,
  DescList,
  DetailDrawer,
  DrawerSection,
  FilterBar,
  FilterSelect,
  LoadingState,
  PageHeader,
  StatusPill,
  businessTypeLabel,
  errorMessage,
  fmtDateTime,
  fmtVnd,
  useDebounced,
  useQueryParams,
} from '../../components/backoffice';

const TYPES = ['HOTEL', 'HOMESTAY', 'RESORT', 'RESTAURANT', 'TOUR_OPERATOR'];
const STATUSES = [
  { value: 'ACTIVE', label: 'Hoạt động' },
  { value: 'SUSPENDED', label: 'Tạm ngưng' },
];

/** Chi tiết mở rộng (PAC §8) — chỉ khi cờ adminBusinessDetail bật. */
const BusinessExtra: React.FC<{ id: string }> = ({ id }) => {
  const [detail, setDetail] = useState<any>(null);
  const [bookings, setBookings] = useState<any[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    setDetail(null);
    setBookings(null);
    setError('');
    Promise.all([AdminBackofficeService.businessDetail(id), AdminBackofficeService.businessBookings(id, 10)])
      .then(([d, b]) => {
        if (!live) return;
        setDetail(d);
        setBookings(b?.items || []);
      })
      .catch((requestError) => live && setError(errorMessage(requestError, 'Không tải được chi tiết doanh nghiệp.')));
    return () => {
      live = false;
    };
  }, [id]);
  if (error) return <Alert tone="danger">{error}</Alert>;
  if (!detail) return <LoadingState variant="detail" rows={4} />;
  const members: any[] = detail.members || detail.memberships || [];
  const places: any[] = detail.hotels || detail.places || [];
  return (
    <>
      <DrawerSection title="Thành viên">
        {members.length ? (
          <ul className="hgbo-stack hgbo-stack--sm">
            {members.map((m, i) => (
              <li key={m.id || m.userId || i}>
                <span className="hgbo-strong">{m.fullName || m.user?.fullName || m.email || m.user?.email || '—'}</span>
                {(m.email || m.user?.email) && <span className="hgbo-dt__cell-sub">{m.email || m.user?.email}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hgbo-muted">Máy chủ chưa trả danh sách thành viên.</p>
        )}
      </DrawerSection>
      <DrawerSection title="Cơ sở / khách sạn">
        {places.length ? (
          <ul className="hgbo-stack hgbo-stack--sm">
            {places.map((p, i) => (
              <li key={p.id || i} className="hgbo-row">
                <span className="hgbo-strong">{p.name || '—'}</span>
                {p.status && <StatusPill status={p.status} domain="moderation" size="sm" />}
              </li>
            ))}
          </ul>
        ) : (
          <p className="hgbo-muted">Chưa có cơ sở.</p>
        )}
      </DrawerSection>
      <DrawerSection title="10 booking gần nhất">
        {bookings && bookings.length ? (
          <ul className="hgbo-stack hgbo-stack--sm">
            {bookings.map((b) => (
              <li key={b.id || b.bookingCode} className="hgbo-row">
                <Link className="hgbo-link hgbo-num" to={`/admin/bookings/${encodeURIComponent(b.bookingCode)}`}>{b.bookingCode}</Link>
                <StatusPill status={b.bookingStatus} domain="booking" size="sm" />
                <span className="hgbo-muted hgbo-small">{fmtVnd(b.totalAmount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="hgbo-muted">Chưa có booking.</p>
        )}
      </DrawerSection>
    </>
  );
};

export const AdminBusinessesPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { get, set, search: query } = useQueryParams();
  const page = Math.max(1, Number(get('page', '1')) || 1);
  const limit = [20, 50, 100].includes(Number(get('limit'))) ? Number(get('limit')) : 20;
  const type = get('type');
  const status = get('status');
  const [search, setSearch] = useState(get('q'));
  const q = useDebounced(search).trim().toLowerCase();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    set({ q: q || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await AdminBackofficeService.businesses(page, limit);
      setItems(result.items || []);
      setTotal(result.total ?? 0);
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải danh sách doanh nghiệp.'));
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => items.filter((item) => {
    if (type && item.type !== type) return false;
    if (status && item.status !== status) return false;
    if (q && ![item.name, item.city, item.email].some((v) => String(v || '').toLowerCase().includes(q))) return false;
    return true;
  }), [items, type, status, q]);

  const activeCount = (type ? 1 : 0) + (status ? 1 : 0) + (search.trim() ? 1 : 0);
  const selected = items.find((item) => item.id === id) || null;
  const close = () => navigate(`/admin/businesses${query}`);

  const columns: DataColumn<any>[] = [
    { key: 'name', header: 'Tên', primary: true },
    { key: 'type', header: 'Loại', render: (row) => businessTypeLabel(row.type) },
    { key: 'city', header: 'Thành phố', hideBelow: 1024 },
    { key: 'status', header: 'Trạng thái', render: (row) => <StatusPill status={row.status} domain="business" /> },
    { key: 'createdAt', header: 'Ngày tạo', hideBelow: 1024, render: (row) => <span className="hgbo-num">{fmtDateTime(row.createdAt)}</span> },
  ];

  return (
    <div>
      <PageHeader
        title="Cơ sở kinh doanh"
        subtitle="Doanh nghiệp đã được cấp trên hệ thống."
        actions={<BoButton icon={RefreshCw} loading={loading} onClick={load}>Làm mới</BoButton>}
      />
      <FilterBar
        search={{ value: search, onChange: setSearch, placeholder: 'Tên, thành phố, email', label: 'Tìm doanh nghiệp', maxLength: 120 }}
        activeCount={activeCount}
        onReset={() => {
          setSearch('');
          set({ type: null, status: null, q: null });
        }}
        note="Lọc trong trang hiện tại — máy chủ chưa hỗ trợ tìm và lọc doanh nghiệp."
      >
        <FilterSelect label="Loại" value={type} onChange={(v) => set({ type: v || null })} options={TYPES.map((t) => ({ value: t, label: businessTypeLabel(t) }))} />
        <FilterSelect label="Trạng thái" value={status} onChange={(v) => set({ status: v || null })} options={STATUSES} />
      </FilterBar>
      <DataTable
        caption="Danh sách doanh nghiệp"
        columns={columns}
        rows={filtered}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={load}
        empty={{ icon: Store, title: activeCount ? 'Không có doanh nghiệp khớp bộ lọc trong trang này' : 'Chưa có doanh nghiệp' }}
        onRowClick={(row) => navigate(`/admin/businesses/${row.id}${query}`)}
        selectedKey={id}
        rowActions={(row) => [{ label: 'Xem', onClick: () => navigate(`/admin/businesses/${row.id}${query}`) }]}
        pagination={{ page, limit, total, onChange: (p, l) => set({ page: p > 1 ? p : null, limit: l !== 20 ? l : null }) }}
      />
      <DetailDrawer
        open={!!id}
        onClose={close}
        title={selected?.name || 'Doanh nghiệp'}
        subtitle={selected ? businessTypeLabel(selected.type) : undefined}
        status={selected?.status}
        statusDomain="business"
        loading={!!id && loading}
        error={!loading && id && !selected ? 'Doanh nghiệp không nằm trong trang đang xem. Máy chủ chưa có API xem chi tiết một doanh nghiệp (PAC §8).' : null}
      >
        {selected && (
          <>
            <DrawerSection title="Thông tin">
              <DescList
                items={[
                  { label: 'Tên', value: selected.name },
                  { label: 'Loại', value: businessTypeLabel(selected.type) },
                  { label: 'Email', value: selected.email },
                  { label: 'Điện thoại', value: selected.phone },
                  { label: 'Địa chỉ', value: selected.address },
                  { label: 'Thành phố', value: selected.city },
                  { label: 'Ngày tạo', value: fmtDateTime(selected.createdAt) },
                ]}
              />
            </DrawerSection>
            {BO_FEATURES.adminBusinessDetail ? (
              <BusinessExtra id={selected.id} />
            ) : (
              <p className="hgbo-muted hgbo-small">Thành viên, danh sách cơ sở và booking của doanh nghiệp sẽ hiện khi máy chủ có API chi tiết (PAC §8).</p>
            )}
            <Alert tone="info">
              <p>Tạm ngưng doanh nghiệp chưa được hỗ trợ; tạm ngưng từng khách sạn tại Kiểm duyệt → Khách sạn.</p>
            </Alert>
          </>
        )}
      </DetailDrawer>
    </div>
  );
};
