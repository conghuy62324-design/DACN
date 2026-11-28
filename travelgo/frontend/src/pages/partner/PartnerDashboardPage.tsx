// Tổng quan Partner. Nguồn: PlatformService.getPartnerDashboard(businessId) + GET /partner/hotels (qua ngữ cảnh switcher).
// Không có ô doanh thu (quyết định 6.1.1). Thiếu số thì "—", không tự đổi thành 0.
import React, { useEffect, useRef, useState } from 'react';
import { Building2, CalendarCheck, CheckCircle2, CircleCheck, Clock3, MapPinned, Newspaper, Route, Ticket } from 'lucide-react';
import {
  DataColumn,
  DataTable,
  EmptyState,
  ErrorState,
  KpiTile,
  PageHeader,
  StatusPill,
  businessTypeLabel,
  errorMessage,
} from '../../components/backoffice';
import { PlatformService } from '../../services/platformService';
import { Business } from '../../types';
import '../../styles/hg-partner.css';
import { usePartnerHotels } from './hotel/partnerContext';
import { contentPending } from './hotel/shared';

interface DashboardState {
  businesses: Business[];
  selectedBusiness: Business | null;
  metrics: null | { totalBookings: number; pendingBookings: number; confirmedBookings: number; completedBookings: number; revenue: number; places: number; tours: number; tickets: number; blogs: number; source: 'DATABASE' };
}

export const PartnerDashboardPage: React.FC = () => {
  const [state, setState] = useState<DashboardState | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const ctx = usePartnerHotels();
  const synced = useRef<string | null>(null);

  const load = async (businessId?: string) => {
    setLoading(true);
    setError('');
    try {
      setState(await PlatformService.getPartnerDashboard(businessId));
    } catch (requestError: any) {
      setError(errorMessage(requestError, 'Không thể tải dashboard đối tác.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  // Ngữ cảnh Business theo khách sạn đang chọn ở switcher (khớp businessName; không khớp thì giữ select riêng).
  useEffect(() => {
    const hotel = ctx?.current;
    if (!state || !hotel || synced.current === hotel.id) return;
    synced.current = hotel.id;
    const match = state.businesses.find((b) => (hotel.businessId ? b.id === hotel.businessId : b.name === hotel.businessName));
    if (match && match.id !== state.selectedBusiness?.id) void load(match.id);
  }, [ctx?.current, state]);

  const business = state?.selectedBusiness || null;
  const metrics = state?.metrics;
  const allHotels = ctx?.enabled ? ctx.hotels : [];
  const ownHotels = business ? allHotels.filter((h) => h.businessName === business.name) : [];
  const hotels = ownHotels.length ? ownHotels : allHotels;

  const hotelColumns: DataColumn<any>[] = [
    { key: 'name', header: 'Khách sạn', primary: true, render: (h) => <span className="hgbo-strong">{h.name}</span> },
    { key: 'businessName', header: 'Doanh nghiệp', hideBelow: 1024, render: (h) => h.businessName || '—', card: ownHotels.length ? 'hide' : 'meta' },
    { key: 'status', header: 'Trạng thái', render: (h) => <StatusPill status={h.status} domain="moderation" size="sm" /> },
    {
      key: 'pending',
      header: 'Nội dung',
      render: (h) => (contentPending(h) ? <StatusPill status="PENDING" size="sm" label="Có thay đổi chưa gửi duyệt" /> : <span className="hgbo-muted">Đã đồng bộ</span>),
    },
  ];

  const businessSelect = state?.businesses.length ? (
    <div className="hgbo-field hgp-bizselect">
      <label className="hgbo-field__label" htmlFor="hgp-dashboard-business">Cơ sở kinh doanh</label>
      <select
        id="hgp-dashboard-business"
        className="hgbo-select"
        value={business?.id || ''}
        onChange={(event) => void load(event.target.value)}
      >
        {state.businesses.map((b) => (
          <option key={b.id} value={b.id}>{b.name} · {businessTypeLabel(b.type)}</option>
        ))}
      </select>
    </div>
  ) : undefined;

  return (
    <div className="hgp-page hgbo-stack">
      <PageHeader
        title="Tổng quan cơ sở"
        subtitle="Booking và số liệu chỉ thuộc cơ sở bạn được cấp quyền."
        actions={businessSelect}
      />
      {error && <ErrorState message={error} onRetry={() => void load(business?.id)} />}
      {!loading && state && !business && (
        <EmptyState
          icon={Building2}
          title="Chưa có cơ sở được cấp quyền"
          description="Liên hệ quản trị viên nếu hồ sơ của bạn đã được phê duyệt."
        />
      )}
      {(business || (loading && !state)) && (
        <>
          {business && (
            <section className="hgbo-card hgp-bizcard">
              <div>
                <p className="hgbo-small hgbo-muted">{businessTypeLabel(business.type)}</p>
                <h2 className="hgp-bizcard__name">{business.name}</h2>
                <p className="hgbo-small hgbo-muted">{[business.address, business.city].filter(Boolean).join(', ') || 'Chưa có địa chỉ'}</p>
              </div>
              <StatusPill status={business.status} domain="business" />
            </section>
          )}
          <section aria-labelledby="hgp-dash-bookings">
            <h2 className="hgbo-section-title" id="hgp-dash-bookings">Đơn đặt</h2>
            <div className="hgbo-kpis">
              <KpiTile label="Tổng booking" value={metrics?.totalBookings} loading={loading} icon={CalendarCheck} href="/partner/bookings" />
              <KpiTile
                label="Chờ xác nhận"
                value={metrics?.pendingBookings}
                loading={loading}
                icon={Clock3}
                tone={metrics?.pendingBookings ? 'warning' : 'neutral'}
                href="/partner/bookings?status=PENDING"
              />
              <KpiTile label="Đã xác nhận" value={metrics?.confirmedBookings} loading={loading} icon={CircleCheck} href="/partner/bookings?status=CONFIRMED" />
              <KpiTile label="Hoàn thành" value={metrics?.completedBookings} loading={loading} icon={CheckCircle2} tone="success" href="/partner/bookings?status=COMPLETED" />
            </div>
          </section>
          {ctx?.enabled && (
            <section aria-labelledby="hgp-dash-hotels" className="hgbo-stack hgbo-stack--sm">
              <h2 className="hgbo-section-title" id="hgp-dash-hotels">Khách sạn của bạn</h2>
              <DataTable
                caption="Khách sạn của bạn"
                columns={hotelColumns}
                rows={hotels}
                rowKey={(h) => h.id}
                loading={ctx.loading}
                error={ctx.error || null}
                onRetry={ctx.reload}
                rowActions={(h) => [
                  { label: 'Giá & tồn', to: `/partner/hotels/${h.id}/calendar` },
                  ['DRAFT', 'REJECTED'].includes(h.status)
                    ? { label: 'Tiếp tục thiết lập', to: `/partner/hotels/${h.id}/setup`, tone: 'primary' as const }
                    : { label: 'Quản lý', to: `/partner/hotels/${h.id}/overview` },
                ]}
                empty={{ icon: Building2, title: 'Chưa có khách sạn', description: 'Thêm khách sạn để bắt đầu thiết lập phòng, giá và tồn phòng.' }}
              />
            </section>
          )}
          <section aria-labelledby="hgp-dash-services">
            <h2 className="hgbo-section-title" id="hgp-dash-services">Dịch vụ khác</h2>
            <div className="hgbo-kpis">
              <KpiTile label="Địa điểm" value={metrics?.places} loading={loading} icon={MapPinned} href="/partner/places" />
              <KpiTile label="Tour" value={metrics?.tours} loading={loading} icon={Route} href="/partner/tours" />
              <KpiTile label="Vé" value={metrics?.tickets} loading={loading} icon={Ticket} href="/partner/tickets" />
              <KpiTile label="Bài viết" value={metrics?.blogs} loading={loading} icon={Newspaper} href="/partner/blogs" />
            </div>
          </section>
        </>
      )}
    </div>
  );
};
