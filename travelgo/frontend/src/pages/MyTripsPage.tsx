import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Bookmark, Calendar, Loader2, MapPin, Plus, Trash2 } from 'lucide-react';
import { TripService } from '../services/tripService';
import { TripSession } from '../types';
import { AccountShell } from '../components/account/AccountShell';
import { AccountLoadError, AccountState } from '../components/account/AccountState';
import { friendlyError } from '../components/account/accountErrors';
import '../styles/hg-account.css';

type TripFilter = 'all' | 'active' | 'upcoming' | 'completed';

const filters: Array<{ id: TripFilter; label: string }> = [
  { id: 'all', label: 'Tất cả chuyến đi' },
  { id: 'active', label: 'Đang diễn ra' },
  { id: 'upcoming', label: 'Sắp tới' },
  { id: 'completed', label: 'Đã hoàn thành' },
];

const statusConfig: Record<TripSession['status'], { tone: 'ok' | 'info' | 'neutral' | 'bad'; label: string }> = {
  active: { tone: 'ok', label: 'Đang diễn ra' },
  upcoming: { tone: 'info', label: 'Sắp tới' },
  completed: { tone: 'neutral', label: 'Đã hoàn thành' },
  cancelled: { tone: 'bad', label: 'Đã hủy' },
};

function dateLabel(value?: string): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function TripCard({ trip, onDelete }: { trip: TripSession; onDelete: (id: string) => Promise<void> }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const status = statusConfig[trip.status] || { tone: 'info' as const, label: trip.status };
  const percent = Math.max(0, Math.min(100, Number(trip.progressPercent) || 0));
  const checked = trip.progress?.checkedActivityIds.length ?? 0;
  const eligible = trip.progress?.eligibleActivityIds.length ?? 0;

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await onDelete(trip.id);
    } catch (err) {
      console.error('Failed to delete trip:', err);
      setError(friendlyError(err, 'Không thể xóa chuyến đi.'));
      setBusy(false);
    }
  };

  return (
    <article
      data-testid="trip-card"
      data-trip-id={trip.id}
      onClick={() => navigate(`/my-trips/${trip.id}`)}
      className="hg-acc-card hg-acc-trip"
    >
      <div className="hg-acc-trip__top">
        <span className="hg-acc-trip__city">
          <MapPin size={14} aria-hidden="true" />
          {trip.destinationCity}
        </span>
        <span className={'hg-acc-pill hg-acc-pill--' + status.tone}>{status.label}</span>
      </div>
      <Link to={`/my-trips/${trip.id}`} className="hg-acc-trip__title" onClick={(e) => e.stopPropagation()}>
        <h3>{trip.title}</h3>
      </Link>
      <p className="hg-acc-trip__dates">
        <Calendar size={16} aria-hidden="true" />
        <span>
          {dateLabel(trip.startDate)} → {dateLabel(trip.endDate)}
        </span>
        <span>({trip.daysCount} ngày)</span>
      </p>
      <div className="hg-acc-progress">
        <div className="hg-acc-progress__row">
          <span id={`trip-progress-${trip.id}`}>Tiến độ tham quan</span>
          <b>{percent}%</b>
        </div>
        <progress value={percent} max={100} aria-labelledby={`trip-progress-${trip.id}`} />
        <small>
          Đã check-in: {checked}/{eligible} hoạt động
        </small>
      </div>
      {error && (
        <p className="hg-acc-notice hg-acc-notice--error" role="alert">
          <AlertTriangle size={16} aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
      {confirming ? (
        <div className="hg-acc-confirm" role="group" aria-label="Xác nhận xóa chuyến đi" onClick={(e) => e.stopPropagation()}>
          <p>Bạn có chắc chắn muốn xóa chuyến đi này khỏi danh sách?</p>
          <div className="hg-acc-confirm__actions">
            <button type="button" className="hg-acc-btn hg-acc-btn--ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Giữ lại
            </button>
            <button type="button" className="hg-acc-btn hg-acc-btn--danger-solid" disabled={busy} onClick={() => void remove()}>
              {busy && <Loader2 size={16} className="hg-acc-spin" aria-hidden="true" />}
              <span>{busy ? 'Đang xóa…' : 'Xóa chuyến đi'}</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="hg-acc-trip__foot">
          <div className="hg-acc-trip__budget">
            <span>Ngân sách dự kiến</span>
            <b>{new Intl.NumberFormat('vi-VN').format(trip.totalBudgetUserVND)}đ</b>
          </div>
          <div className="hg-acc-trip__actions">
            {trip.costBasis==='GROUP_VND_V1'&&<Link onClick={e=>e.stopPropagation()} to={'/assistant?trip='+encodeURIComponent(trip.id)} className="hg-acc-link">Tiếp tục với trợ lý</Link>}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setConfirming(true);
              }}
              className="hg-acc-btn hg-acc-btn--ghost hg-acc-btn--icon"
              title="Xóa chuyến đi"
              aria-label={`Xóa chuyến đi ${trip.title}`}
            >
              <Trash2 size={16} aria-hidden="true" />
            </button>
            <span className="hg-acc-trip__more" aria-hidden="true">
              <span>Chi tiết</span>
              <ArrowRight size={16} />
            </span>
          </div>
        </div>
      )}
    </article>
  );
}

export const MyTripsPage: React.FC = () => {
  const [trips, setTrips] = useState<TripSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filterStatus, setFilterStatus] = useState<TripFilter>('all');

  useEffect(() => {
    fetchTrips();
  }, []);

  const fetchTrips = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await TripService.getTrips();
      setTrips(data);
    } catch (err) {
      console.error('Failed to load trips:', err);
      setLoadError(friendlyError(err, 'Chưa tải được danh sách chuyến đi.'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTrip = async (id: string) => {
    await TripService.deleteTrip(id);
    setTrips((current) => current.filter((t) => t.id !== id));
  };

  const filteredTrips = trips.filter((t) => {
    if (filterStatus === 'all') return true;
    return t.status === filterStatus;
  });

  let content: React.ReactNode;
  if (loading) {
    content = (
      <div className="hg-acc-grid hg-acc-grid--2" role="status" aria-label="Đang tải chuyến đi">
        {[1, 2].map((i) => (
          <div key={i} className="hg-acc-card hg-acc-skel-card animate-pulse">
            <span className="hg-acc-skel hg-acc-skel--line hg-acc-skel--short" />
            <span className="hg-acc-skel hg-acc-skel--title" />
            <span className="hg-acc-skel hg-acc-skel--line" />
            <span className="hg-acc-skel hg-acc-skel--block" />
          </div>
        ))}
      </div>
    );
  } else if (loadError) {
    content = <AccountLoadError message={loadError} onRetry={() => void fetchTrips()} />;
  } else if (filteredTrips.length === 0) {
    content = (
      <AccountState
        icon={Bookmark}
        title="Chưa có chuyến đi nào trong danh mục"
        description="Hãy dùng HuGo Planner để tạo lịch trình cá nhân, sau đó lưu lại để theo dõi tại đây."
        actions={
          <Link to="/tour-planner" className="hg-acc-btn hg-acc-btn--cta">
            Tạo lịch trình ngay
          </Link>
        }
      />
    );
  } else {
    content = (
      <div className="hg-acc-grid hg-acc-grid--2">
        {filteredTrips.map((trip) => (
          <TripCard key={trip.id} trip={trip} onDelete={handleDeleteTrip} />
        ))}
      </div>
    );
  }

  return (
    <AccountShell
      title="Chuyến đi của tôi"
      description="Quản lý các hành trình đã lưu, theo dõi tiến độ tham quan từng địa điểm."
      actions={
        <Link to="/tour-planner" className="hg-acc-btn hg-acc-btn--cta">
          <Plus size={16} aria-hidden="true" />
          <span>Tạo lịch trình mới</span>
        </Link>
      }
    >
      <div className="hg-acc-filters" role="group" aria-label="Lọc chuyến đi theo trạng thái">
        {filters.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className="hg-acc-filter"
            aria-pressed={filterStatus === tab.id}
            onClick={() => setFilterStatus(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {content}
    </AccountShell>
  );
};
