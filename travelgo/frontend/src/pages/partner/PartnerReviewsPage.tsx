// Đánh giá của cơ sở (PAC §5, cờ BO_FEATURES.partnerReviews). Cờ tắt: ApiPendingState, không dữ liệu mẫu.
// Partner chỉ phản hồi; không sửa/xóa đánh giá của khách, không tự tính điểm hạng mục.
import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquare, MessageSquareReply, Star } from 'lucide-react';
import {
  Alert,
  ApiPendingState,
  BO_FEATURES,
  BO_FEATURE_CONTRACT,
  BoButton,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FilterBar,
  FilterSelect,
  KpiTile,
  LoadingState,
  PageHeader,
  StatusPill,
  TextareaField,
  errorMessage,
  fmtDate,
  useQueryParams,
} from '../../components/backoffice';
import { PartnerBackofficeService, PartnerReview, PartnerReviewPage } from '../../services/partnerBackofficeService';
import { PlatformService } from '../../services/platformService';
import { Business } from '../../types';
import '../../styles/hg-partner.css';
import { usePartnerHotels } from './hotel/partnerContext';

const Stars: React.FC<{ value: number }> = ({ value }) => (
  <span className="hgp-stars" role="img" aria-label={`${value} trên 5 sao`}>
    {Array.from({ length: 5 }, (_, i) => (
      <Star key={i} aria-hidden="true" className={i < Math.round(value) ? 'is-on' : ''} />
    ))}
    <b>{value}</b>
  </span>
);

const ReviewCard: React.FC<{ review: PartnerReview; onChanged: (r: PartnerReview) => void }> = ({ review, onChanged }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(review.reply?.text || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const trimmed = text.trim();

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await PartnerBackofficeService.reply(review.id, trimmed, review.replyVersion);
      onChanged({ ...review, ...updated });
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e, 'Không lưu được phản hồi.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <li className="hgp-review">
      <div className="hgp-review__head">
        <Stars value={review.rating} />
        <span className="hgbo-strong">{review.userName || 'Khách'}</span>
        {review.verificationStatus === 'VERIFIED' && <StatusPill status="VERIFIED" domain="review" size="sm" />}
        <span className="hgbo-small hgbo-muted">{fmtDate(review.createdAt)}</span>
        {review.placeName && <span className="hgbo-small hgbo-muted">· {review.placeName}</span>}
      </div>
      <p className="hgp-review__body">{review.comment}</p>
      {review.reply && !editing && (
        <div className="hgp-review__reply">
          <p className="hgbo-small hgbo-muted">
            Phản hồi của cơ sở
            {review.reply.repliedBy ? ` · bởi ${review.reply.repliedBy}` : ''}
            {' · '}
            {fmtDate(review.reply.repliedAt)}
          </p>
          <p className="hgbo-pre">{review.reply.text}</p>
        </div>
      )}
      {editing ? (
        <div className="hgbo-stack hgbo-stack--sm">
          <TextareaField
            label="Phản hồi của cơ sở"
            rows={4}
            maxLength={2000}
            counter
            hint="Văn bản thuần, 1–2000 ký tự. Phản hồi hiển thị công khai dưới đánh giá."
            value={text}
            onChange={setText}
          />
          {error && <Alert tone="danger">{error}</Alert>}
          <div className="hgbo-row">
            <BoButton variant="secondary" disabled={busy} onClick={() => { setEditing(false); setText(review.reply?.text || ''); setError(''); }}>Hủy bỏ</BoButton>
            <BoButton variant="primary" loading={busy} disabled={!trimmed || trimmed.length > 2000} onClick={save}>Lưu phản hồi</BoButton>
          </div>
        </div>
      ) : (
        <div className="hgbo-row">
          <BoButton variant="secondary" size="sm" icon={MessageSquareReply} onClick={() => setEditing(true)}>
            {review.reply ? 'Sửa phản hồi' : 'Phản hồi'}
          </BoButton>
          {review.reply && (
            <BoButton variant="ghost-danger" size="sm" onClick={() => setDeleting(true)}>Xóa phản hồi</BoButton>
          )}
        </div>
      )}
      <ConfirmDialog
        open={deleting}
        title="Xóa phản hồi"
        tone="danger"
        description="Phản hồi của cơ sở sẽ bị gỡ khỏi đánh giá này. Đánh giá của khách giữ nguyên."
        confirmLabel="Xóa phản hồi"
        onClose={() => setDeleting(false)}
        onConfirm={async () => {
          const updated = await PartnerBackofficeService.deleteReply(review.id, review.reply!.version);
          onChanged({ ...review, ...updated, reply: null });
          setText('');
        }}
      />
    </li>
  );
};

const ReviewsEnabled: React.FC = () => {
  const ctx = usePartnerHotels();
  const query = useQueryParams();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState('');
  const [data, setData] = useState<PartnerReviewPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const rawPlace = query.get('placeId');
  // Mặc định khách sạn đang chọn ở switcher; 'all' = mọi khách sạn của Business.
  const placeId = rawPlace === 'all' ? '' : rawPlace || ctx?.currentHotelId || '';
  const replied = query.get('replied');
  const minRating = query.get('minRating');
  const page = Number(query.get('page', '1')) || 1;

  useEffect(() => {
    PlatformService.getPartnerDashboard()
      .then((d) => {
        setBusinesses(d.businesses);
        const hotel = ctx?.current;
        const byHotel = hotel ? d.businesses.find((b) => (hotel.businessId ? b.id === hotel.businessId : b.name === hotel.businessName)) : undefined;
        setBusinessId(byHotel?.id || d.selectedBusiness?.id || '');
        if (!d.businesses.length) setLoading(false);
      })
      .catch((e) => {
        setError(errorMessage(e, 'Không thể tải cơ sở.'));
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    if (!businessId) return;
    setLoading(true);
    setError('');
    try {
      setData(await PartnerBackofficeService.reviews({ businessId, placeId: placeId || undefined, replied: replied || undefined, minRating: minRating ? Number(minRating) : undefined, page, limit: 20 }));
    } catch (e) {
      setError(errorMessage(e, 'Không tải được đánh giá.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId, placeId, replied, minRating, page]);

  const business = businesses.find((b) => b.id === businessId);
  const hotels = (ctx?.hotels || []).filter((h) => !business || h.businessName === business.name);
  const summary = data?.summary;
  const pages = data?.pages || 1;

  return (
    <div className="hgp-page hgbo-stack">
      <PageHeader
        title="Đánh giá"
        subtitle="Đánh giá đã công bố của khách. Bạn có thể phản hồi; không sửa hay xóa đánh giá của khách."
        actions={businesses.length > 1 ? (
          <div className="hgbo-field hgp-bizselect">
            <label className="hgbo-field__label" htmlFor="hgp-reviews-business">Cơ sở kinh doanh</label>
            <select id="hgp-reviews-business" className="hgbo-select" value={businessId} onChange={(e) => { setBusinessId(e.target.value); query.set({ placeId: 'all', page: null }); }}>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        ) : undefined}
      />
      <div className="hgbo-kpis hgbo-kpis--3">
        <KpiTile label="Số đánh giá" value={summary?.count} loading={loading && !data} icon={MessageSquare} />
        <KpiTile
          label="Điểm trung bình"
          value={summary?.average ?? null}
          loading={loading && !data}
          icon={Star}
          format={(v) => `${v.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/5`}
        />
        <KpiTile label="Chưa phản hồi" value={summary?.unreplied} loading={loading && !data} tone={summary?.unreplied ? 'warning' : 'neutral'} icon={MessageSquareReply} />
      </div>
      <FilterBar
        activeCount={(placeId ? 1 : 0) + (replied ? 1 : 0) + (minRating ? 1 : 0)}
        onReset={() => query.set({ placeId: 'all', replied: null, minRating: null, page: null })}
      >
        <FilterSelect
          label="Khách sạn"
          value={placeId}
          allLabel="Tất cả khách sạn"
          options={hotels.map((h) => ({ value: h.id, label: h.name }))}
          onChange={(v) => query.set({ placeId: v || 'all', page: null })}
        />
        <FilterSelect
          label="Phản hồi"
          value={replied}
          options={[{ value: 'false', label: 'Chưa phản hồi' }, { value: 'true', label: 'Đã phản hồi' }]}
          onChange={(v) => query.set({ replied: v, page: null })}
        />
        <FilterSelect
          label="Điểm"
          value={minRating}
          allLabel="Mọi mức sao"
          options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `Từ ${n} sao` }))}
          onChange={(v) => query.set({ minRating: v, page: null })}
        />
      </FilterBar>
      {error ? (
        <ErrorState message={error} onRetry={() => void load()} />
      ) : loading && !data ? (
        <LoadingState variant="detail" rows={6} />
      ) : !businessId ? (
        <EmptyState title="Chưa có cơ sở được cấp quyền" description="Liên hệ quản trị viên nếu hồ sơ của bạn đã được phê duyệt." />
      ) : !data?.items.length ? (
        <EmptyState icon={MessageSquare} title="Chưa có đánh giá phù hợp" description="Đánh giá chỉ hiện sau khi được công bố." />
      ) : (
        <>
          <ul className="hgp-reviews" aria-busy={loading || undefined}>
            {data.items.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onChanged={(updated) => setData((d) => (d ? { ...d, items: d.items.map((r) => (r.id === updated.id ? updated : r)) } : d))}
              />
            ))}
          </ul>
          {pages > 1 && (
            <nav className="hgbo-pager" aria-label="Phân trang đánh giá">
              <span className="hgbo-num">Trang {page}/{pages} · {data.total} đánh giá</span>
              <div className="hgbo-pager__pages">
                <button type="button" className="hgbo-pager__btn" aria-label="Trang trước" disabled={page <= 1} onClick={() => query.set({ page: page - 1 })}>
                  <ChevronLeft aria-hidden="true" />
                </button>
                <button type="button" className="hgbo-pager__btn" aria-label="Trang sau" disabled={page >= pages} onClick={() => query.set({ page: page + 1 })}>
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
};

export const PartnerReviewsPage: React.FC = () => {
  if (!BO_FEATURES.partnerReviews) {
    return (
      <div className="hgp-page hgbo-stack">
        <PageHeader title="Đánh giá" subtitle="Xem và phản hồi đánh giá đã công bố của cơ sở." />
        <ApiPendingState feature="Đánh giá của cơ sở" contractRef={BO_FEATURE_CONTRACT.partnerReviews} />
      </div>
    );
  }
  return <ReviewsEnabled />;
};
