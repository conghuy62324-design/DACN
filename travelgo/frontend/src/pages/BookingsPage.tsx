import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  BedDouble,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Loader2,
  ReceiptText,
  Search,
  SearchX,
  Ticket,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { HotelBookingSummary } from '../components/hotels/HotelBookingSummary';
import { AccountShell } from '../components/account/AccountShell';
import { AccountLoadError, AccountState } from '../components/account/AccountState';
import { friendlyError } from '../components/account/accountErrors';
import { BookingService } from '../services/bookingService';
import { Booking } from '../types';
import { formatCurrencyVND } from '../utils/formatters';
import '../styles/hg-account.css';

type Status = Booking['bookingStatus'];
type StatusFilter = 'ALL' | Status;

const statusMeta: Record<Status, { label: string; tone: 'ok' | 'warn' | 'bad' | 'info'; icon: typeof Clock }> = {
  PENDING: { label: 'Chờ xác nhận', tone: 'warn', icon: Clock },
  CONFIRMED: { label: 'Đã xác nhận', tone: 'ok', icon: CheckCircle2 },
  COMPLETED: { label: 'Đã hoàn thành', tone: 'info', icon: CheckCircle2 },
  CANCELLED: { label: 'Đã hủy', tone: 'bad', icon: XCircle },
  REJECTED: { label: 'Bị từ chối', tone: 'bad', icon: XCircle },
};
const STATUS_ORDER: Status[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED'];

const serviceMeta: Record<Booking['serviceType'], { label: string; icon: typeof Clock }> = {
  tour: { label: 'Tour', icon: Compass },
  hotel: { label: 'Khách sạn', icon: BedDouble },
  restaurant: { label: 'Nhà hàng', icon: UtensilsCrossed },
  ticket: { label: 'Vé', icon: Ticket },
};

const paymentLabels: Record<string, string> = {
  paid: 'Đã thanh toán',
  refunded: 'Đã hoàn tiền',
  unpaid: 'Chưa thanh toán',
};

function dateLabel(value?: string): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('vi-VN');
}

function StatusPill({ status }: { status: string }) {
  const meta = statusMeta[status as Status];
  if (!meta) return <span className="hg-acc-pill">{status}</span>;
  const Icon = meta.icon;
  return (
    <span className={'hg-acc-pill hg-acc-pill--' + meta.tone}>
      <Icon size={14} aria-hidden="true" />
      <span>{meta.label}</span>
    </span>
  );
}

function ServiceBookingCard({ booking: b, onCancel }: { booking: Booking; onCancel: (id: string) => Promise<void> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const service = serviceMeta[b.serviceType];
  const ServiceIcon = service?.icon || ReceiptText;
  const cancellable = !['CANCELLED', 'COMPLETED', 'REJECTED'].includes(b.bookingStatus);

  const confirmCancel = async () => {
    setBusy(true);
    setError('');
    try {
      await onCancel(b.id);
      setConfirming(false);
    } catch (cancelError) {
      console.error(cancelError);
      setError(friendlyError(cancelError, 'Chưa hủy được đơn. Vui lòng thử lại.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="hg-acc-card hg-acc-order" data-booking-id={b.id}>
      <div className="hg-acc-order__head">
        <div className="hg-acc-order__code">
          <small>Mã đơn đặt</small>
          <b>{b.bookingCode}</b>
        </div>
        <StatusPill status={b.bookingStatus} />
      </div>
      <div className="hg-acc-order__body">
        <div>
          <div className="hg-acc-order__service">
            <span className="hg-acc-order__icon" aria-hidden="true">
              <ServiceIcon size={20} />
            </span>
            <div>
              <h3>{b.serviceName}</h3>
              <p>{service?.label || 'Dịch vụ'}</p>
            </div>
          </div>
          <dl className="hg-acc-order__dl">
            <div>
              <dt>Ngày sử dụng</dt>
              <dd>
                {dateLabel(b.bookingDate) || 'Chưa có'}
                {b.returnDate && <> → {dateLabel(b.returnDate)}</>}
              </dd>
            </div>
            <div>
              <dt>Số lượng khách</dt>
              <dd>
                {b.adultsCount} người lớn · {b.childrenCount} trẻ em
              </dd>
            </div>
            <div>
              <dt>Người đặt</dt>
              <dd>{b.customerName}</dd>
            </div>
            {b.notes && (
              <div>
                <dt>Ghi chú</dt>
                <dd>{b.notes}</dd>
              </div>
            )}
          </dl>
        </div>
        <div className="hg-acc-order__price">
          <span>Tổng tiền</span>
          <strong>{formatCurrencyVND(b.totalAmount)}</strong>
          <small>{paymentLabels[b.paymentStatus] || 'Chưa thanh toán'}</small>
        </div>
      </div>
      {error && (
        <p className="hg-acc-notice hg-acc-notice--error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {confirming && (
        <div className="hg-acc-confirm" role="group" aria-label="Xác nhận hủy dịch vụ">
          <p>Bạn có chắc chắn muốn hủy đơn {b.bookingCode} không? Đơn không bị xóa khỏi lịch sử.</p>
          <div className="hg-acc-confirm__actions">
            <button type="button" className="hg-acc-btn hg-acc-btn--ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Giữ đơn
            </button>
            <button type="button" className="hg-acc-btn hg-acc-btn--danger-solid" disabled={busy} onClick={() => void confirmCancel()}>
              {busy && <Loader2 size={16} className="hg-acc-spin" aria-hidden="true" />}
              <span>{busy ? 'Đang hủy…' : 'Xác nhận hủy'}</span>
            </button>
          </div>
        </div>
      )}
      <div className="hg-acc-order__foot">
        <span>Ngày đặt: {new Date(b.createdAt).toLocaleDateString('vi-VN')}</span>
        {cancellable && !confirming && (
          <button type="button" className="hg-acc-btn hg-acc-btn--danger" onClick={() => setConfirming(true)}>
            Hủy dịch vụ
          </button>
        )}
      </div>
    </article>
  );
}

function BookingsSkeleton() {
  return (
    <div className="hg-acc-list" aria-hidden="true">
      {[0, 1].map((key) => (
        <div key={key} className="hg-acc-card hg-acc-skel-card animate-pulse">
          <span className="hg-acc-skel hg-acc-skel--line hg-acc-skel--short" />
          <span className="hg-acc-skel hg-acc-skel--title" />
          <span className="hg-acc-skel hg-acc-skel--line" />
          <span className="hg-acc-skel hg-acc-skel--block" />
        </div>
      ))}
    </div>
  );
}

export const BookingsPage: React.FC = () => {
  const [loadError, setLoadError] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | Booking['serviceType']>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('travelgo_token');
    setBookings([]);
    setLoadError('');
    if (reload === 0) window.scrollTo(0, 0);
    const fetchBookings = async () => {
      setLoading(true);
      try {
        const data = await BookingService.getBookings();
        if (active && localStorage.getItem('travelgo_token') === token) setBookings(data);
      } catch (e) {
        if (active) setLoadError(friendlyError(e, 'Chưa tải được lịch sử đặt dịch vụ.'));
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchBookings();
    return () => {
      active = false;
    };
  }, [reload]);

  const handleCancelBooking = async (id: string) => {
    await BookingService.cancelBooking(id);
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, bookingStatus: 'CANCELLED' } : b)));
  };

  const counts = useMemo(() => {
    const result: Partial<Record<Status, number>> = {};
    for (const b of bookings) result[b.bookingStatus] = (result[b.bookingStatus] || 0) + 1;
    return result;
  }, [bookings]);
  const types = useMemo(() => Array.from(new Set(bookings.map((b) => (b.hotelStay ? 'hotel' : b.serviceType)))), [bookings]);

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi-VN');
    return bookings.filter((b) => {
      if (statusFilter !== 'ALL' && b.bookingStatus !== statusFilter) return false;
      if (typeFilter !== 'ALL' && (b.hotelStay ? 'hotel' : b.serviceType) !== typeFilter) return false;
      if (!needle) return true;
      const haystack = [b.bookingCode, b.serviceName, b.hotelStay?.hotel?.name].filter(Boolean).join(' ').toLocaleLowerCase('vi-VN');
      return haystack.includes(needle);
    });
  }, [bookings, statusFilter, typeFilter, query]);

  const filtered = statusFilter !== 'ALL' || typeFilter !== 'ALL' || query.trim() !== '';
  const resetFilters = () => {
    setStatusFilter('ALL');
    setTypeFilter('ALL');
    setQuery('');
  };

  let content: React.ReactNode;
  if (loading) {
    content = (
      <>
        <p role="status" className="hg-acc-result">
          Đang tải đơn đặt chỗ…
        </p>
        <BookingsSkeleton />
      </>
    );
  } else if (loadError) {
    content = <AccountLoadError message={loadError} onRetry={() => setReload((n) => n + 1)} />;
  } else if (bookings.length === 0) {
    content = (
      <AccountState
        icon={ReceiptText}
        title="Chưa có đơn đặt nào"
        description="Khi bạn đặt phòng khách sạn, tour, vé hoặc nhà hàng, đơn sẽ hiển thị tại đây."
        actions={
          <>
            <Link to="/hotels" className="hg-acc-btn hg-acc-btn--cta">
              Tìm khách sạn
            </Link>
            <Link to="/explore" className="hg-acc-btn hg-acc-btn--outline">
              Khám phá điểm đến
            </Link>
          </>
        }
      />
    );
  } else {
    content = (
      <>
        <div className="hg-acc-filters" role="group" aria-label="Lọc theo trạng thái">
          <button type="button" className="hg-acc-filter" aria-pressed={statusFilter === 'ALL'} onClick={() => setStatusFilter('ALL')}>
            <span>Tất cả</span>
            <span className="hg-acc-filter__count">{bookings.length}</span>
          </button>
          {STATUS_ORDER.filter((status) => counts[status]).map((status) => (
            <button
              key={status}
              type="button"
              className="hg-acc-filter"
              aria-pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
            >
              <span>{statusMeta[status].label}</span>
              <span className="hg-acc-filter__count">{counts[status]}</span>
            </button>
          ))}
        </div>
        <div className="hg-acc-toolbar">
          <label className="hg-acc-search">
            <span className="sr-only">Tìm theo mã đơn hoặc tên dịch vụ</span>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              className="hg-acc-input"
              placeholder="Tìm mã đơn hoặc tên dịch vụ"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {types.length > 1 && (
            <select
              className="hg-acc-select"
              aria-label="Lọc theo loại dịch vụ"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
            >
              <option value="ALL">Mọi loại dịch vụ</option>
              {types.map((type) => (
                <option key={type} value={type}>
                  {serviceMeta[type]?.label || type}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="hg-acc-result" aria-live="polite">
          {filtered ? `Hiển thị ${visible.length} / ${bookings.length} đơn` : `${bookings.length} đơn đặt chỗ`}
        </p>
        {visible.length === 0 ? (
          <AccountState
            icon={SearchX}
            title="Không có đơn phù hợp"
            description="Thử chọn trạng thái khác hoặc xóa từ khóa tìm kiếm."
            actions={
              <button type="button" className="hg-acc-btn hg-acc-btn--outline" onClick={resetFilters}>
                Xóa bộ lọc
              </button>
            }
          />
        ) : (
          <div className="hg-acc-list">
            {visible.map((b) =>
              b.hotelStay ? (
                <HotelBookingSummary
                  key={b.id}
                  booking={b}
                  onCancel={async (id) => {
                    const result = await BookingService.cancelBooking(id);
                    setBookings((items) => items.map((item) => (item.id === id ? result : item)));
                  }}
                />
              ) : (
                <ServiceBookingCard key={b.id} booking={b} onCancel={handleCancelBooking} />
              ),
            )}
          </div>
        )}
      </>
    );
  }

  return (
    <AccountShell
      title="Đơn đặt chỗ"
      description="Theo dõi trạng thái đơn khách sạn, tour, nhà hàng và vé bạn đã đặt."
    >
      {content}
    </AccountShell>
  );
};
