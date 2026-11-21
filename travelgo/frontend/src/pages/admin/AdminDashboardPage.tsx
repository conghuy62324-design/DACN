import React, { useCallback, useEffect, useState } from 'react';
import {
  Building2,
  CalendarCheck,
  Compass,
  FileCheck2,
  Hotel,
  MapPinned,
  MessageSquareWarning,
  Newspaper,
  RefreshCw,
  Route,
  Store,
  UserRound,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { AdminDashboardData, PlatformService } from '../../services/platformService';
import { AdminBackofficeService } from '../../services/adminBackofficeService';
import {
  AuditList,
  BoButton,
  EmptyState,
  ErrorState,
  KpiTile,
  PageHeader,
  Skeleton,
  StatusTone,
  entityLabel,
  errorCode,
  errorMessage,
  fmtNumber,
  fmtPercent,
  fmtTime,
  statusMeta,
} from '../../components/backoffice';

type ReviewCount = { value: number | null; hint?: string };

const BOOKING_SEGMENTS: { key: keyof AdminDashboardData; status: string }[] = [
  { key: 'pendingBookings', status: 'PENDING' },
  { key: 'confirmedBookings', status: 'CONFIRMED' },
  { key: 'completedBookings', status: 'COMPLETED' },
  { key: 'cancelledBookings', status: 'CANCELLED' },
  { key: 'rejectedBookings', status: 'REJECTED' },
];

const toneBg = (tone: StatusTone) => `hgbo-tone-bg--${tone === 'archived' ? 'neutral' : tone}`;

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const BookingBreakdown: React.FC<{ data: AdminDashboardData }> = ({ data }) => {
  const total = num(data.totalBookings);
  if (total === null) return <EmptyState title="Chưa có dữ liệu booking" plain />;
  if (total === 0) return <EmptyState icon={CalendarCheck} title="Chưa có booking" plain />;
  const rows = BOOKING_SEGMENTS.map((segment) => {
    const meta = statusMeta(segment.status, 'booking');
    const value = num(data[segment.key]);
    return { ...segment, label: meta.label, tone: meta.tone, value, pct: value === null ? null : (value / total) * 100 };
  });
  const aria = rows.map((row) => `${row.label}: ${row.value === null ? 'chưa có dữ liệu' : fmtNumber(row.value)}`).join(', ');
  return (
    <>
      <div className="hgbo-stackbar" role="img" aria-label={`Booking theo trạng thái — ${aria}. Tổng ${fmtNumber(total)}.`}>
        {rows.map((row) => (row.pct ? (
          <span key={row.status} className={toneBg(row.tone)} style={{ width: `${row.pct}%` }} />
        ) : null))}
      </div>
      <table className="hgbo-legend">
        <caption className="hgbo-sr">Số booking theo trạng thái</caption>
        <tbody>
          {rows.map((row) => (
            <tr key={row.status}>
              <td>
                <span className={`hgbo-legend__sw ${toneBg(row.tone)}`} aria-hidden="true" />
                {row.label}
              </td>
              <td>{row.value === null ? '—' : fmtNumber(row.value)}</td>
              <td>{row.pct === null ? '—' : fmtPercent(Math.round(row.pct * 10) / 10)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>Tổng</td>
            <td>{fmtNumber(total)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </>
  );
};

export const AdminDashboardPage: React.FC = () => {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [reviews, setReviews] = useState<ReviewCount>({ value: null });
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const items = await AdminBackofficeService.reviewQueue();
      setReviews({ value: items.length });
    } catch (requestError) {
      setReviews({ value: null, hint: errorCode(requestError) === 'REVIEW_INSIGHTS_UNAVAILABLE' ? 'Chưa bật trên máy chủ' : 'Chưa có dữ liệu' });
    } finally {
      setReviewsLoading(false);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await PlatformService.getAdminDashboard());
      setLoadedAt(new Date());
    } catch (requestError) {
      setError(errorMessage(requestError, 'Không thể tải dữ liệu quản trị.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadReviews();
  }, [load, loadReviews]);

  const refresh = () => {
    load();
    loadReviews();
  };

  const value = (key: keyof AdminDashboardData) => (data ? num(data[key]) : null);
  const warn = (v: number | null) => (v && v > 0 ? 'warning' : 'neutral');

  return (
    <div className="hgbo-stack">
      <PageHeader
        title="Bảng điều khiển"
        meta={loadedAt ? `Nguồn: cơ sở dữ liệu · cập nhật ${fmtTime(loadedAt)}` : 'Nguồn: cơ sở dữ liệu'}
        actions={(
          <BoButton icon={RefreshCw} loading={loading} onClick={refresh}>Làm mới</BoButton>
        )}
      />
      {error && !loading ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          <section aria-labelledby="dash-todo">
            <h2 className="hgbo-section-title" id="dash-todo">Việc cần xử lý</h2>
            <div className="hgbo-kpis hgbo-kpis--6">
              <KpiTile label="Hồ sơ đối tác chờ duyệt" icon={FileCheck2} loading={loading} value={value('pendingPartners')} tone={warn(value('pendingPartners'))} href="/admin/partner-applications?status=PENDING" />
              <KpiTile label="Địa điểm chờ duyệt" icon={MapPinned} loading={loading} value={value('pendingPlaces')} tone={warn(value('pendingPlaces'))} href="/admin/places" />
              <KpiTile label="Tour chờ duyệt" icon={Route} loading={loading} value={value('pendingTours')} tone={warn(value('pendingTours'))} href="/admin/tours" />
              <KpiTile label="Bài viết chờ duyệt" icon={Newspaper} loading={loading} value={value('pendingBlogs')} tone={warn(value('pendingBlogs'))} href="/admin/blogs" />
              <KpiTile label="Booking chờ xác nhận" icon={CalendarCheck} loading={loading} value={value('pendingBookings')} tone={warn(value('pendingBookings'))} href="/admin/bookings" />
              <KpiTile
                label="Đánh giá cần xem"
                icon={MessageSquareWarning}
                loading={reviewsLoading}
                value={reviews.value}
                hint={reviews.hint}
                tone={warn(reviews.value)}
                href="/admin/reviews"
                format={(n) => (n >= 100 ? '100+' : fmtNumber(n))}
              />
            </div>
          </section>
          <section aria-labelledby="dash-scale">
            <h2 className="hgbo-section-title" id="dash-scale">Quy mô nền tảng</h2>
            <div className="hgbo-kpis">
              <KpiTile label="Người dùng" icon={Users} loading={loading} value={value('totalUsers')} />
              <KpiTile label="Khách hàng" icon={UserRound} loading={loading} value={value('totalCustomers')} />
              <KpiTile label="Đối tác" icon={Building2} loading={loading} value={value('totalPartners')} />
              <KpiTile label="Doanh nghiệp" icon={Store} loading={loading} value={value('totalBusinesses')} />
              <KpiTile label="Doanh nghiệp lưu trú" icon={Hotel} loading={loading} value={value('totalHotels')} hint="Business loại khách sạn, homestay, resort" />
              <KpiTile label="Nhà hàng" icon={UtensilsCrossed} loading={loading} value={value('totalRestaurants')} />
              <KpiTile label="Địa điểm" icon={Compass} loading={loading} value={value('totalPlaces')} />
              <KpiTile label="Tour" icon={Route} loading={loading} value={value('totalTours')} />
            </div>
          </section>
          <div className="hgbo-dash-split">
            <section className="hgbo-card" aria-labelledby="dash-bookings">
              <h2 className="hgbo-section-title" id="dash-bookings">Booking theo trạng thái</h2>
              {loading || !data ? (
                <div className="hgbo-stack hgbo-stack--sm">
                  <Skeleton height={12} />
                  <Skeleton height={120} />
                </div>
              ) : (
                <BookingBreakdown data={data} />
              )}
            </section>
            <section className="hgbo-card" aria-labelledby="dash-activity">
              <h2 className="hgbo-section-title" id="dash-activity">Hoạt động quản trị gần đây</h2>
              {loading || !data ? (
                <div className="hgbo-stack hgbo-stack--sm">
                  <Skeleton height={16} width="70%" />
                  <Skeleton height={16} width="55%" />
                  <Skeleton height={16} width="65%" />
                </div>
              ) : (
                <AuditList
                  emptyText="Chưa có hoạt động quản trị."
                  items={(data.recentActivity || []).slice(0, 8).map((activity) => ({
                    action: activity.action,
                    at: activity.createdAt,
                    reason: entityLabel(activity.entityType) ? `Đối tượng: ${entityLabel(activity.entityType)}` : undefined,
                  }))}
                />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
