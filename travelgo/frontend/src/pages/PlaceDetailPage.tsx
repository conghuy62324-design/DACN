import {HotelPublicDetail} from './HotelPublicDetail';
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MapPin, 
  Clock, 
  Star, 
  ShieldCheck, 
  Heart, 
  Share2, 
  Check, 
  Calendar, 
  Users, 
  MessageSquare, 
  Info,
  Plus,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Place, Review } from '../types';
import { PlaceService } from '../services/placeService';
import { BookingService } from '../services/bookingService';
import { RatingBadge } from '../components/common/RatingBadge';
import { formatCurrencyVND } from '../utils/formatters';
import { useFavorites } from '../context/FavoritesContext';
import { useBooking } from '../context/BookingContext';
import { useTelemetry } from '../context/TelemetryContext';
import { useTelemetryView } from '../hooks/useTelemetryView';
import { useAuth } from '../context/AuthContext';
import { Booking } from '../types';
import {ReviewInsightsPanel} from '../components/common/ReviewInsightsPanel';
import {api} from '../services/api';
import {CatalogBreadcrumb,CatalogState,catalogErrorText} from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

export const PlaceDetailPage: React.FC = () => {
 const {id}=useParams();const enabled=import.meta.env.VITE_HOTEL_DOMAIN_ENABLED==='true';
 const explicit=new URLSearchParams(window.location.search).get('hotel')==='1'||window.location.pathname.startsWith('/hotels/');
 const [native,setNative]=useState<boolean|null>(null);
 useEffect(()=>{if(!enabled||explicit)return;const c=new AbortController();setNative(null);void api.get('/hotels/'+id,{signal:c.signal}).then(()=>{if(!c.signal.aborted)setNative(true);}).catch(e=>{if(!c.signal.aborted)setNative(e.code!=='HOTEL_NOT_FOUND');});return()=>c.abort();},[id,enabled,explicit]);
 if(enabled&&!explicit&&native===null)return <div className="pt-28 pb-16 text-center" role="status">Đang kiểm tra thông tin nơi lưu trú…</div>;
 return enabled&&(explicit||native)?<HotelPublicDetail/>:<LegacyPlaceDetailPage/>;
};
const LegacyPlaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recommendationRequestId = searchParams.get('recommendationRequestId') || undefined;
  const [place, setPlace] = useState<Place | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [similarPlaces, setSimilarPlaces] = useState<Place[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'itinerary' | 'inclusions' | 'policies' | 'reviews'>(()=>new URLSearchParams(window.location.search).get('tab')==='reviews'?'reviews':'overview');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retry, setRetry] = useState(0);

  // Booking Card State
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  // New Review Form State
  const [newReviewScore, setNewReviewScore] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [analysisConsent,setAnalysisConsent]=useState(false),[editingReviewId,setEditingReviewId]=useState<string>(),[reviewRevision,setReviewRevision]=useState(0),[reportReasons,setReportReasons]=useState<Record<string,string>>({});
  const [selectedReviewBooking, setSelectedReviewBooking] = useState('');
  const [eligibleReviewBookings, setEligibleReviewBookings] = useState<Booking[]>([]);
  const [myReviewIds, setMyReviewIds] = useState<Set<string>>(new Set());
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState('');
  const [reviewErrorMsg, setReviewErrorMsg] = useState('');

  const { toggleFavorite, isFavorite, isPending } = useFavorites();
  const { openBooking } = useBooking();
  const { track } = useTelemetry();
  const { user } = useAuth();
  const telemetryItemType = place?.category === 'hotel' || place?.category === 'restaurant' ? place.category : 'place';
  const viewRef = useTelemetryView(!loading ? place?.id : undefined, telemetryItemType, 'place_detail');

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchPlaceData = async () => {
      setLoading(true);
      setLoadError('');
      try {
        const placeData = await PlaceService.getPlaceById(id || 'p-danang-hoian');
        setPlace(placeData);

        const revData = await PlaceService.getReviews(placeData.id);
        setReviews(revData);

        if (user) {
          const [bookings, mine] = await Promise.all([BookingService.getBookings(), PlaceService.getMyReviews()]);
          const reviewedBookingIds = new Set(mine.map((review) => review.bookingId).filter(Boolean));
          setEligibleReviewBookings(bookings.filter((booking) =>
            booking.bookingStatus === 'COMPLETED' && booking.placeId === placeData.id && !reviewedBookingIds.has(booking.id)));
          setMyReviewIds(new Set(mine.map((review) => review.id)));
        } else {
          setEligibleReviewBookings([]);
          setMyReviewIds(new Set());
        }

        const allPlaces = await PlaceService.getPlaces();
        setSimilarPlaces(allPlaces.filter((p) => p.id !== placeData.id).slice(0, 3));
      } catch (err: any) {
        console.error('Failed to load place:', err);
        setLoadError(/không tìm thấy|không tồn tại/i.test(String(err?.message || '')) ? 'NOT_FOUND' : catalogErrorText(err, 'Chưa tải được thông tin địa điểm. Vui lòng thử lại sau ít phút.'));
      } finally {
        setLoading(false);
      }
    };

    fetchPlaceData();
  }, [id, user?.id, retry]);
  useEffect(()=>{if(!loading&&activeTab==='reviews'&&/^#review-[0-9a-f-]{36}$/i.test(window.location.hash))document.getElementById(window.location.hash.slice(1))?.scrollIntoView({block:'center'});},[loading,activeTab,reviews]);

  if (loading || !place) {
    return (
      <div className="hg-cat">
        <div className="hg-container hg-cat-main">
          <CatalogBreadcrumb items={[{ label: 'Trang chủ', to: '/' }, { label: 'Khám phá', to: '/explore' }, { label: 'Chi tiết' }]} />
          {loading ? (
            <div role="status">
              <span className="hg-cat-sr">Đang tải thông tin hành trình...</span>
              <div className="hg-cat-skelhead" aria-hidden="true">
                <span className="hg-cat-skel" />
                <span className="hg-cat-skel" />
              </div>
              <div className="hg-cat-gallery" aria-hidden="true">
                <figure><span className="hg-cat-skel hg-cat-skel--fill" /></figure>
                <figure><span className="hg-cat-skel hg-cat-skel--fill" /></figure>
                <figure><span className="hg-cat-skel hg-cat-skel--fill" /></figure>
              </div>
            </div>
          ) : loadError === 'NOT_FOUND' ? (
            <CatalogState
              role="status"
              icon={<MapPin size={32} aria-hidden="true" />}
              title="Không tìm thấy địa điểm"
              text="Địa điểm không tồn tại hoặc đã tạm ngừng hiển thị."
              actions={<Link to="/explore" className="hg-cat-btn hg-cat-btn--outline">Khám phá dịch vụ khác</Link>}
            />
          ) : (
            <CatalogState
              role="alert"
              tone="error"
              title="Chưa tải được thông tin địa điểm"
              text={loadError || 'Kết nối tới máy chủ chưa ổn định. Vui lòng thử lại sau ít phút.'}
              actions={<>
                <button type="button" className="hg-cat-btn hg-cat-btn--outline" onClick={() => setRetry((v) => v + 1)}>Thử lại</button>
                <Link to="/explore" className="hg-cat-btn hg-cat-btn--ghost">Về trang Khám phá</Link>
              </>}
            />
          )}
        </div>
      </div>
    );
  }

  const unitPrice = place.priceFrom;
  const totalPrice = unitPrice * adults + unitPrice * 0.7 * children;
  const favorited = isFavorite(place.id);

  const handleBookingClick = () => {
    if(place.isDemo||place.priceFrom==null)return;
    if (place.category !== 'hotel' && place.category !== 'restaurant') { navigate('/tours'); return; }
    void track({ itemId: place.id, itemType: telemetryItemType, eventType: 'CLICK', uiSurface: 'booking_modal', requestId: recommendationRequestId });
    openBooking({
      serviceType: place.category as any,
      serviceId: place.id,
      serviceName: place.name,
      unitPrice: place.priceFrom,
      initialDate: selectedDate,
      imageUrl: place.heroImage,
      recommendationRequestId,
    });
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newReviewComment.trim()) return;

    setSubmittingReview(true);
    setReviewErrorMsg('');
    try {
      const added = await (editingReviewId?PlaceService.updateReview(editingReviewId, {rating:newReviewScore,comment:newReviewComment,analysisConsent:analysisConsent?'REVIEW_INSIGHTS_V1':'DECLINED'}):PlaceService.addReview(place.id, {
        bookingId: selectedReviewBooking || undefined,
        rating: newReviewScore,
        comment: newReviewComment,
        analysisConsent:analysisConsent?'REVIEW_INSIGHTS_V1':'DECLINED',
      }));

      setReviews((current) => editingReviewId?current.map(r=>r.id===editingReviewId?added:r):[added, ...current]);
      setEditingReviewId(undefined);setAnalysisConsent(false);setReviewRevision(v=>v+1);
      setMyReviewIds((current) => new Set(current).add(added.id));
      if (selectedReviewBooking) {
        setEligibleReviewBookings((current) => current.filter((booking) => booking.id !== selectedReviewBooking));
      }
      setReviewSuccessMsg(added.verificationStatus === 'VERIFIED'
        ? 'Đánh giá xác thực từ booking hoàn thành đã được ghi nhận.'
        : 'Đánh giá đã được ghi nhận là chưa xác thực.');
      setNewReviewComment('');
      setSelectedReviewBooking('');

      // Refresh place stats
      const updated = await PlaceService.getPlaceById(place.id);
      setPlace(updated);
    } catch (e: any) {
      setReviewErrorMsg(/^(?:REVIEW_|INVALID_REVIEW)/.test(e?.code||'')?e.message:'Không thể gửi đánh giá. Hãy kiểm tra nội dung hoặc sửa đánh giá đang có.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleAddToItinerary = () => {
    const plannerDestination = `/tour-planner?mandatoryPlaceId=${encodeURIComponent(place.id)}`;
    void track({
      itemId: place.id,
      itemType: telemetryItemType,
      eventType: 'CLICK',
      uiSurface: 'place_detail',
      requestId: recommendationRequestId,
    });
    if (!user) {
      navigate('/login', { state: { from: plannerDestination } });
      return;
    }
    navigate(plannerDestination);
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!window.confirm('Xóa đánh giá này?')) return;
    try {
      await PlaceService.deleteReview(reviewId);setReviewRevision(v=>v+1);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      setMyReviewIds((current) => { const next = new Set(current); next.delete(reviewId); return next; });
      const updated = await PlaceService.getPlaceById(place.id);
      setPlace(updated);
    } catch (e: any) {
      setReviewErrorMsg(e?.response?.data?.message || 'Không thể xóa đánh giá.');
    }
  };

  const categoryCrumb = place.category === 'hotel'
    ? { label: 'Khách sạn', to: '/hotels' }
    : place.category === 'restaurant'
      ? { label: 'Nhà hàng', to: '/restaurants' }
      : { label: 'Khám phá', to: '/explore' };
  const gallery = [place.heroImage, ...place.galleryImages.slice(1, 3)].filter(Boolean);
  const tabs = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'itinerary', label: 'Lịch trình chi tiết' },
    { id: 'inclusions', label: 'Dịch vụ bao gồm' },
    { id: 'policies', label: 'Chính sách & hủy' },
    { id: 'reviews', label: `Đánh giá (${reviews.length})` },
  ];

  return (
    <div className="hg-cat">
      <div className="hg-container hg-cat-main">
        <CatalogBreadcrumb items={[{ label: 'Trang chủ', to: '/' }, categoryCrumb, { label: place.name }]} />

        {/* Tiêu đề + hành động */}
        <div className="hg-cat-detail-head">
          <div className="hg-cat-detail-head__text">
            <h1 className="hg-cat-h1">{place.name}</h1>
            <div className="hg-cat-facts">
              <span className="hg-cat-rating">
                <RatingBadge
                  rating={place.rating}
                  reviewCount={place.reviewCount}
                  showBayesianDetail={true}
                  size="md"
                />
              </span>
              <span>
                <MapPin size={16} aria-hidden="true" />
                {place.address || place.province}
              </span>
              {place.duration && (
                <span>
                  <Clock size={16} aria-hidden="true" />
                  {place.duration}
                </span>
              )}
            </div>
            <Link to={'/assistant?listing='+encodeURIComponent(place.id)} className="hg-cat-ai">
              <Sparkles size={16} aria-hidden="true" />Tư vấn dịch vụ này bằng AI
            </Link>
          </div>

          <div className="hg-cat-head__actions">
            <button
              type="button"
              data-testid="add-place-to-itinerary"
              onClick={handleAddToItinerary}
              className="hg-cat-btn hg-cat-btn--outline"
            >
              <Plus size={16} aria-hidden="true" />
              <span>Thêm vào lịch trình</span>
            </button>
            <button
              type="button"
              data-testid="place-favorite"
              aria-pressed={favorited}
              disabled={isPending(place.id)}
              onClick={() => toggleFavorite(place, 'place_detail', recommendationRequestId)}
              className="hg-cat-btn hg-cat-btn--ghost hg-cat-like"
            >
              <Heart size={16} aria-hidden="true" />
              <span>{favorited ? 'Đã lưu' : 'Lưu lại'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Đã sao chép liên kết chia sẻ vào khay nhớ tạm!');
              }}
              className="hg-cat-btn hg-cat-btn--ghost"
            >
              <Share2 size={16} aria-hidden="true" />
              <span>Chia sẻ</span>
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div ref={viewRef} className={'hg-cat-gallery hg-cat-gallery--' + Math.max(1, gallery.length)}>
          {gallery.length === 0 ? (
            <figure className="hg-cat-imgfail" aria-hidden="true" />
          ) : gallery.map((img, idx) => (
            <figure key={idx}>
              <img
                src={img}
                alt={idx === 0 ? place.name : `${place.name} – ảnh ${idx + 1}`}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                onError={(e) => e.currentTarget.parentElement?.classList.add('hg-cat-imgfail')}
              />
            </figure>
          ))}
        </div>

        <div className="hg-cat-layout">
          {/* Cột trái: tab nội dung */}
          <div className="hg-cat-stack">
            <div className="hg-cat-anchor" role="tablist" aria-label="Thông tin chi tiết">
              {tabs.map((tab) => (
                <button
                  type="button"
                  role="tab"
                  key={tab.id}
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: Tổng quan */}
            {activeTab === 'overview' && (
              <section className="hg-cat-box" role="tabpanel">
                <h2>Tổng quan</h2>
                <p className="hg-cat-text">{place.description || place.summary || 'Nhà cung cấp chưa cập nhật mô tả.'}</p>
                {place.highlights.length > 0 && (
                  <>
                    <h3 className="hg-cat-box__sub">Điểm nhấn nổi bật</h3>
                    <ul className="hg-cat-checks">
                      {place.highlights.map((h, i) => (
                        <li key={i}>
                          <Check size={16} aria-hidden="true" />
                          <span>{h}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}

            {/* TAB 2: Lịch trình */}
            {activeTab === 'itinerary' && (
              <section className="hg-cat-box" role="tabpanel">
                <h2>Lịch trình chi tiết</h2>
                {place.itinerary && place.itinerary.length > 0 ? (
                  <ol className="hg-cat-days hg-cat-days--spaced">
                    {place.itinerary.map((step) => (
                      <li key={step.day} className="hg-cat-day">
                        <span className="hg-cat-day__num">{step.day}</span>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.desc}</p>
                          {step.image && (
                            <div className="hg-cat-day__img">
                              <img src={step.image} alt={step.title} loading="lazy" decoding="async" />
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="hg-cat-note">Lịch trình chi tiết sẽ được gửi kèm hợp đồng du lịch.</p>
                )}
              </section>
            )}

            {/* TAB 3: Dịch vụ bao gồm */}
            {activeTab === 'inclusions' && (
              <section className="hg-cat-box" role="tabpanel">
                <h2>Dịch vụ đã bao gồm</h2>
                {place.amenities.length > 0 ? (
                  <ul className="hg-cat-checks hg-cat-checks--spaced">
                    {place.amenities.map((item, idx) => (
                      <li key={idx}>
                        <Check size={16} aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="hg-cat-note">Nhà cung cấp chưa cung cấp danh sách dịch vụ.</p>}

                <h3 className="hg-cat-box__sub">Dịch vụ chưa bao gồm</h3>
                <ul className="hg-cat-bullets">
                  <li>Chi phí cá nhân ngoài chương trình (giặt là, đồ uống mini bar)</li>
                  <li>Tiền bồi dưỡng (tip) cho tài xế và hướng dẫn viên (tùy tâm)</li>
                  <li>Thuế VAT (nếu xuất hóa đơn đỏ công ty)</li>
                </ul>
              </section>
            )}

            {/* TAB 4: Chính sách */}
            {activeTab === 'policies' && (
              <section className="hg-cat-box" role="tabpanel">
                <h2>Chính sách đặt &amp; hủy</h2>
                <div className="hg-cat-stack hg-cat-stack--spaced">
                  <div className="hg-cat-box hg-cat-box--muted hg-cat-box--flat">
                    <h3>Theo dõi và hủy đơn</h3>
                    <p className="hg-cat-note">Bạn có thể hủy đơn đang chờ hoặc đã xác nhận trong lịch sử. Hệ thống MVP chưa xử lý thanh toán hay hoàn tiền.</p>
                  </div>
                  <div className="hg-cat-box hg-cat-box--muted hg-cat-box--flat">
                    <h3>Chính sách trẻ em</h3>
                    <p className="hg-cat-note">Giá MVP theo số khách: người lớn tính đơn giá, trẻ em giảm 30%. Số tiền xác nhận lấy từ máy chủ khi tạo đơn.</p>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 5: Đánh giá */}
            {activeTab === 'reviews' && (
              <section className="hg-cat-stack" role="tabpanel">
                <div className="hg-cat-box">
                  <div className="hg-cat-box__head">
                    <h2>Đánh giá từ khách hàng</h2>
                    <span className="hg-cat-rating">
                      <RatingBadge
                        rating={place.rating}
                        reviewCount={place.reviewCount}
                        showBayesianDetail={true}
                        size="md"
                      />
                    </span>
                  </div>

                  {reviewSuccessMsg && (
                    <p className="hg-cat-notice hg-cat-notice--success">
                      <ShieldCheck size={16} aria-hidden="true" />
                      <span>{reviewSuccessMsg}</span>
                    </p>
                  )}
                  {reviewErrorMsg && (
                    <p role="alert" className="hg-cat-notice hg-cat-notice--error">
                      <Info size={16} aria-hidden="true" />
                      <span>{reviewErrorMsg}</span>
                    </p>
                  )}

                  <ReviewInsightsPanel placeId={place.id} revision={reviewRevision}/>
                </div>

                {/* Form đánh giá */}
                <form aria-label="Đánh giá dịch vụ" onSubmit={handleAddReview} className="hg-cat-box hg-cat-form">
                  <h3 className="hg-cat-box__title">
                    <MessageSquare size={18} aria-hidden="true" />
                    Để lại trải nghiệm thực tế của bạn
                  </h3>

                  {!user && <p className="hg-cat-note">Vui lòng đăng nhập để gửi đánh giá.</p>}
                  <label className="hg-cat-check">
                    <input type="checkbox" checked={analysisConsent} onChange={e=>setAnalysisConsent(e.target.checked)}/>
                    <span>Tôi cho phép tổng hợp bình luận công khai này để tư vấn; không dùng thông tin riêng tư của tôi.</span>
                  </label>
                  <div className="hg-cat-form__grid">
                    <label className="hg-cat-field">
                      <span>Booking đã hoàn thành (không bắt buộc)</span>
                      <select
                        disabled={!!editingReviewId} data-testid="review-booking"
                        value={selectedReviewBooking}
                        onChange={(e) => setSelectedReviewBooking(e.target.value)}
                        className="hg-cat-select"
                      >
                        <option value="">Không gắn đơn đã hoàn thành — đánh giá chưa xác thực</option>
                        {eligibleReviewBookings.map((booking) => (
                          <option key={booking.id} value={booking.id}>{booking.bookingCode} — {booking.serviceName}</option>
                        ))}
                      </select>
                    </label>
                    <div className="hg-cat-field">
                      <label htmlFor="review-rating">Đánh giá số sao</label>
                      <select
                        id="review-rating"
                        value={newReviewScore}
                        onChange={(e) => setNewReviewScore(Number(e.target.value))}
                        className="hg-cat-select"
                      >
                        <option value={5}>★★★★★ 5 sao (Tuyệt vời)</option>
                        <option value={4}>★★★★☆ 4 sao (Rất tốt)</option>
                        <option value={3}>★★★☆☆ 3 sao (Bình thường)</option>
                        <option value={2}>★★☆☆☆ 2 sao (Kém)</option>
                        <option value={1}>★☆☆☆☆ 1 sao (Rất tệ)</option>
                      </select>
                    </div>
                  </div>

                  <div className="hg-cat-field">
                    <label htmlFor="review-comment">Nội dung đánh giá</label>
                    <textarea
                      id="review-comment"
                      rows={3}
                      required
                      minLength={10}
                      maxLength={2000}
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="Chia sẻ cảm nhận về hướng dẫn viên, khách sạn, chất lượng phục vụ..."
                      className="hg-cat-textarea"
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={submittingReview || !user}
                      data-testid="review-submit"
                      className="hg-cat-btn hg-cat-btn--cta"
                    >
                      {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
                    </button>
                  </div>
                </form>

                {/* Danh sách đánh giá */}
                {reviews.length === 0 ? (
                  <p className="hg-cat-note">Chưa có đánh giá nào cho dịch vụ này.</p>
                ) : (
                  <div className="hg-cat-stack">
                    {reviews.map((rev) => (
                      <div key={rev.id} id={'review-'+rev.id} className="hg-cat-review">
                        <div className="hg-cat-review__head">
                          <div className="hg-cat-review__who">
                            <span className="hg-cat-avatar">
                              {rev.userAvatar ? <img src={rev.userAvatar} alt="" /> : (rev.userName || 'K').trim().charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="hg-cat-review__name">{rev.userName}</p>
                              <div className="hg-cat-review__sub">
                                <span>{new Date(rev.createdAt).toLocaleDateString('vi-VN')}</span>
                                {rev.verificationStatus === 'VERIFIED' ? (
                                  <span data-testid="verified-review">
                                    <ShieldCheck size={14} aria-hidden="true" /> Đã xác thực booking
                                  </span>
                                ) : <span>Chưa xác thực</span>}
                              </div>
                            </div>
                          </div>
                          <span className="hg-cat-stars" role="img" aria-label={`${Math.round(rev.rating)} trên 5 sao`}>
                            {[...Array(Math.round(rev.rating))].map((_, i) => (
                              <Star key={i} size={16} aria-hidden="true" />
                            ))}
                          </span>
                        </div>
                        <p className="hg-cat-review__body">{rev.comment}</p>
                        {(user || myReviewIds.has(rev.id)) && (
                          <div className="hg-cat-review__tools">
                            {user&&<>
                              <select aria-label="Lý do báo cáo đánh giá" className="hg-cat-select" value={reportReasons[rev.id]||'SPAM'} onChange={e=>setReportReasons(v=>({...v,[rev.id]:e.target.value}))}>
                                <option value="SPAM">Spam</option>
                                <option value="ABUSE">Nội dung không phù hợp</option>
                                <option value="PRIVACY">Thông tin riêng tư</option>
                                <option value="MISLEADING">Thông tin gây hiểu nhầm</option>
                              </select>
                              <button type="button" className="hg-cat-link" onClick={async()=>{try{await api.post('/reviews/'+rev.id+'/report',{reason:reportReasons[rev.id]||'SPAM'});setReviewSuccessMsg('Đã gửi báo cáo để quản trị viên kiểm tra.');}catch{setReviewErrorMsg('Chưa gửi được báo cáo.');}}}>Báo cáo đánh giá</button>
                            </>}
                            {myReviewIds.has(rev.id)&&<button type="button" className="hg-cat-link" onClick={()=>{setEditingReviewId(rev.id);setNewReviewScore(rev.rating);setNewReviewComment(rev.comment);setAnalysisConsent(false);}}>Sửa đánh giá</button>}
                            {myReviewIds.has(rev.id) && (
                              <button type="button" onClick={() => handleDeleteReview(rev.id)} className="hg-cat-link hg-cat-link--danger">
                                Xóa đánh giá
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Cột phải: khung đặt dịch vụ */}
          <aside className="hg-cat-aside" aria-label="Đặt dịch vụ">
            <div className="hg-cat-box">
              <span className="hg-cat-price__label">Giá áp dụng</span>
              <p className="hg-cat-bigprice">
                {unitPrice==null?'Chưa có giá':formatCurrencyVND(unitPrice)} {unitPrice!=null&&<small>/ khách</small>}
              </p>

              <div className="hg-cat-form hg-cat-form--aside">
                <label className="hg-cat-field">
                  <span><Calendar size={16} aria-hidden="true" />Ngày khởi hành</span>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="hg-cat-input"
                  />
                </label>

                <div className="hg-cat-stepper">
                  <span>Người lớn</span>
                  <div>
                    <button type="button" aria-label="Giảm người lớn" disabled={adults<=1} onClick={() => setAdults(Math.max(1, adults - 1))}>−</button>
                    <b aria-live="polite">{adults}</b>
                    <button type="button" aria-label="Tăng người lớn" onClick={() => setAdults(adults + 1)}>+</button>
                  </div>
                </div>

                <div className="hg-cat-stepper">
                  <span>Trẻ em<small>Giảm 30% đơn giá</small></span>
                  <div>
                    <button type="button" aria-label="Giảm trẻ em" disabled={children<=0} onClick={() => setChildren(Math.max(0, children - 1))}>−</button>
                    <b aria-live="polite">{children}</b>
                    <button type="button" aria-label="Tăng trẻ em" onClick={() => setChildren(children + 1)}>+</button>
                  </div>
                </div>

                <dl className="hg-cat-kv hg-cat-kv--total">
                  <div>
                    <dt>Tổng cộng (tạm tính)</dt>
                    <dd>{unitPrice==null?'Chưa có giá':formatCurrencyVND(totalPrice)}</dd>
                  </div>
                </dl>

                <button
                  type="button"
                  onClick={handleBookingClick}
                  disabled={place.isDemo||place.priceFrom==null}
                  className="hg-cat-btn hg-cat-btn--cta hg-cat-btn--lg hg-cat-btn--block"
                >
                  {place.isDemo?'Chưa nhận đặt dịch vụ':place.priceFrom==null?'Chưa có giá được xác minh':place.category === 'hotel' || place.category === 'restaurant' ? 'Đặt dịch vụ ngay' : 'Xem tour có thể đặt'}
                </button>

                <ul className="hg-cat-checks hg-cat-checks--1">
                  <li><ShieldCheck size={16} aria-hidden="true" /><span>Đơn đặt được lưu trong lịch sử tài khoản</span></li>
                  <li><Check size={16} aria-hidden="true" /><span>Theo dõi xác nhận từ đối tác trong lịch sử</span></li>
                </ul>
              </div>
            </div>
          </aside>
        </div>

        {/* Gợi ý khác */}
        {similarPlaces.length > 0 && (
          <section className="hg-cat-similar" aria-labelledby="similar-title">
            <div className="hg-cat-resultbar">
              <div>
                <h2 id="similar-title" className="hg-cat-h2">Có thể bạn cũng quan tâm</h2>
                <p className="hg-cat-count">Một số dịch vụ khác đang hiển thị trên HuGo Travel</p>
              </div>
              <Link to="/explore" className="hg-cat-link">
                Xem tất cả <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>

            <div className="hg-cat-grid">
              {similarPlaces.map((sim) => (
                <Link key={sim.id} to={`/places/${sim.id}`} className="hg-cat-card">
                  <span className="hg-cat-card__media">
                    <img src={sim.heroImage} alt="" loading="lazy" decoding="async" onError={(e) => e.currentTarget.parentElement?.classList.add('hg-cat-imgfail')} />
                  </span>
                  <span className="hg-cat-card__body">
                    <span className="hg-cat-card__meta">
                      <span>
                        <Star size={14} aria-hidden="true" />
                        {Number.isFinite(sim.rating)&&sim.reviewCount>0?`${Number(sim.rating).toFixed(1)} (${sim.reviewCount})`:'Chưa có đánh giá'}
                      </span>
                      {sim.duration && <span><Clock size={14} aria-hidden="true" />{sim.duration}</span>}
                    </span>
                    <span className="hg-cat-card__title">{sim.name}</span>
                  </span>
                  <span className="hg-cat-card__foot">
                    <span className="hg-cat-price">
                      <span className="hg-cat-price__label">Giá tham khảo từ</span>
                      <span className="hg-cat-price__value">{sim.priceFrom==null?'Chưa có giá':formatCurrencyVND(sim.priceFrom)}</span>
                    </span>
                    <span className="hg-cat-link">Xem <ArrowRight size={16} aria-hidden="true" /></span>
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
