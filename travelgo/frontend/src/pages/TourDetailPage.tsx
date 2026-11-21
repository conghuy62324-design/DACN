import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  Sparkles,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Info,
  Compass,
  Plane,
} from 'lucide-react';
import { TourService } from '../services/tourService';
import { TourPackage } from '../types';
import { useBooking } from '../context/BookingContext';
import { useTelemetry } from '../context/TelemetryContext';
import { useTelemetryView } from '../hooks/useTelemetryView';
import {CatalogBreadcrumb,CatalogState,catalogErrorText} from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

export const TourDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openBooking } = useBooking();
  const { track } = useTelemetry();
  const [tour, setTour] = useState<TourPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeDay, setActiveDay] = useState(1);
  const viewRef = useTelemetryView(!loading ? tour?.id : undefined, 'tour', 'tour_detail');


  useEffect(() => {
    if (id) {
      fetchTour(id);
    }
  }, [id]);

  const fetchTour = async (tourId: string) => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await TourService.getTourById(tourId);
      setTour(data);
    } catch (err: any) {
      console.error('Failed to load tour details:', err);
      // 404 trả câu "Không tìm thấy…" → hiển thị trạng thái không tìm thấy; lỗi khác → trạng thái lỗi kết nối.
      if (!/không tìm thấy|không tồn tại/i.test(String(err?.message || ''))) {
        setLoadError(catalogErrorText(err, 'Chưa tải được chi tiết tour. Vui lòng thử lại sau ít phút.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const crumbs = (title?: string) => <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Tour du lịch',to:'/tours'},{label:title||'Chi tiết tour'}]}/>;

  if (loading) {
    return (
      <div className="hg-cat">
        <div className="hg-container hg-cat-main">
          {crumbs()}
          <div role="status" aria-label="Đang tải chi tiết tour HuGo Travel">
            <div className="hg-cat-skelhead" aria-hidden="true">
              <span className="hg-cat-skel" />
              <span className="hg-cat-skel" />
            </div>
            <div className="hg-cat-gallery" aria-hidden="true">
              <figure><span className="hg-cat-skel hg-cat-skel--fill" /></figure>
              <figure><span className="hg-cat-skel hg-cat-skel--fill" /></figure>
              <figure><span className="hg-cat-skel hg-cat-skel--fill" /></figure>
            </div>
            <span className="hg-cat-sr">Đang tải chi tiết tour HuGo Travel…</span>
          </div>
        </div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="hg-cat">
        <div className="hg-container hg-cat-main">
          {crumbs()}
          {loadError ? (
            <CatalogState
              role="alert"
              tone="error"
              title="Chưa tải được chi tiết tour"
              text={loadError}
              actions={<>
                <button type="button" className="hg-cat-btn hg-cat-btn--outline" onClick={() => id && fetchTour(id)}>Thử lại</button>
                <Link to="/tours" className="hg-cat-btn hg-cat-btn--ghost">Xem tất cả tour</Link>
              </>}
            />
          ) : (
            <CatalogState
              role="status"
              icon={<Compass size={32} aria-hidden="true" />}
              title="Không tìm thấy tour du lịch"
              text="Tour này không tồn tại hoặc đã ngừng cung cấp."
              actions={<Link to="/tours" className="hg-cat-btn hg-cat-btn--outline">Xem tất cả tour</Link>}
            />
          )}
        </div>
      </div>
    );
  }

  const gallery = [tour.heroImage, ...tour.galleryImages.slice(0, 2)].filter(Boolean);

  return (
    <div className="hg-cat">
      <div className="hg-container hg-cat-main">
        {crumbs(tour.title)}

        <div ref={viewRef} className="hg-cat-detail-head">
          <div className="hg-cat-detail-head__text">
            <div className="hg-cat-card__tags">
              <span className="hg-cat-tag">{tour.durationDays} ngày {tour.durationNights} đêm</span>
              <span className="hg-cat-tag hg-cat-tag--muted"><MapPin size={14} aria-hidden="true" />{tour.destinationCity}</span>
            </div>
            <h1 className="hg-cat-h1">{tour.title}</h1>
            <div className="hg-cat-facts">
              <span><Plane size={16} aria-hidden="true" />Khởi hành: {tour.departureCity}</span>
              <span><Clock size={16} aria-hidden="true" />{tour.itineraryDays.length} ngày khám phá</span>
            </div>
          </div>
        </div>

        <div className={'hg-cat-gallery hg-cat-gallery--' + gallery.length}>
          {gallery.map((img, i) => (
            <figure key={i}>
              <img src={img} alt={i === 0 ? tour.title : `${tour.title} – ảnh ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" onError={(e) => e.currentTarget.parentElement?.classList.add('hg-cat-imgfail')} />
            </figure>
          ))}
        </div>

        <div className="hg-cat-layout">
          <div className="hg-cat-stack">
            <section className="hg-cat-box hg-cat-box--muted" aria-label="Cách tính điểm đánh giá">
              <div className="hg-cat-box__head">
                <h2 className="hg-cat-box__title"><Sparkles size={18} aria-hidden="true" /> Điểm đánh giá Bayesian</h2>
                {tour.reviewCount > 0 ? (
                  <span className="hg-cat-tag hg-cat-tag--success">
                    {tour.bayesianScore.toFixed(2)} / 5 · {tour.reviewCount} đánh giá (điểm gốc {tour.rating})
                  </span>
                ) : (
                  <span className="hg-cat-tag hg-cat-tag--muted">Chưa có đánh giá</span>
                )}
              </div>
              <p className="hg-cat-note">
                Điểm được làm mượt theo công thức S = (v / (v + m)) × R + (m / (v + m)) × C, với hệ số tin cậy m = 10 và trung bình toàn hệ thống C = 4,20. Cách này giảm sai lệch khi một tour chỉ có 1–2 lượt đánh giá.
              </p>
            </section>

            <section className="hg-cat-box">
              <h2>Mô tả chương trình</h2>
              <p className="hg-cat-text">{tour.description}</p>
              {tour.highlights.length > 0 && (
                <>
                  <h3 className="hg-cat-box__sub">Điểm nhấn nổi bật</h3>
                  <ul className="hg-cat-checks">
                    {tour.highlights.map((h, i) => (
                      <li key={i}>
                        <CheckCircle2 size={16} aria-hidden="true" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>

            <section className="hg-cat-box">
              <div className="hg-cat-box__head">
                <h2>Lịch trình chi tiết từng ngày</h2>
                <span className="hg-cat-count">{tour.itineraryDays.length} ngày</span>
              </div>

              <div className="hg-cat-chips hg-cat-chips--scroll" role="tablist" aria-label="Chọn ngày">
                {tour.itineraryDays.map((d) => (
                  <button
                    type="button"
                    role="tab"
                    key={d.day}
                    aria-selected={activeDay === d.day}
                    onClick={() => setActiveDay(d.day)}
                    className="hg-cat-tab"
                  >
                    Ngày {d.day}
                  </button>
                ))}
              </div>

              {tour.itineraryDays
                .filter((d) => d.day === activeDay)
                .map((day) => (
                  <div key={day.day} className="hg-cat-day" role="tabpanel">
                    <span className="hg-cat-day__num">N{day.day}</span>
                    <div>
                      <h3>{day.title}</h3>
                      <p>{day.description}</p>
                      {day.places.length > 0 && (
                        <>
                          <p className="hg-cat-day__label">Điểm ghé thăm chính</p>
                          <div className="hg-cat-card__tags">
                            {day.places.map((place, idx) => (
                              <span key={idx} className="hg-cat-tag">
                                <MapPin size={14} aria-hidden="true" />
                                {place}
                              </span>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
            </section>

            <section className="hg-cat-box">
              <h2>Dịch vụ bao gồm &amp; không bao gồm</h2>
              <div className="hg-cat-cols hg-cat-cols--spaced">
                <div>
                  <h3 className="hg-cat-box__sub hg-cat-box__sub--ok">Giá tour bao gồm</h3>
                  {tour.inclusions.length ? (
                    <ul className="hg-cat-checks hg-cat-checks--1">
                      {tour.inclusions.map((item, idx) => (
                        <li key={idx}><CheckCircle2 size={16} aria-hidden="true" /><span>{item}</span></li>
                      ))}
                    </ul>
                  ) : <p className="hg-cat-note">Nhà cung cấp chưa ghi rõ.</p>}
                </div>
                <div>
                  <h3 className="hg-cat-box__sub hg-cat-box__sub--no">Giá tour không bao gồm</h3>
                  {tour.exclusions.length ? (
                    <ul className="hg-cat-checks hg-cat-checks--1 hg-cat-checks--no">
                      {tour.exclusions.map((item, idx) => (
                        <li key={idx}><XCircle size={16} aria-hidden="true" /><span>{item}</span></li>
                      ))}
                    </ul>
                  ) : <p className="hg-cat-note">Nhà cung cấp chưa ghi rõ.</p>}
                </div>
              </div>
            </section>
          </div>

          <aside className="hg-cat-aside" aria-label="Đặt tour">
            <div className="hg-cat-box">
              <span className="hg-cat-price__label">Giá tour trọn gói</span>
              <p className="hg-cat-bigprice">
                {new Intl.NumberFormat('vi-VN').format(tour.priceVND)} ₫ <small>/ khách</small>
              </p>

              <p className="hg-cat-notice hg-cat-notice--spaced">
                <Info size={16} aria-hidden="true" />
                <span>
                  <strong>Chế độ thử nghiệm:</strong> đơn đặt được mô phỏng và xác nhận trong hệ thống nghiên cứu HuGo Travel, chưa thu tiền.
                </span>
              </p>

              <div className="hg-cat-stack hg-cat-stack--tight">
                <button
                  type="button"
                  onClick={() => {
                    void track({ itemId: tour.id, itemType: 'tour', eventType: 'CLICK', uiSurface: 'booking_modal' });
                    openBooking({
                      serviceType: 'tour',
                      serviceId: tour.id,
                      serviceName: tour.title,
                      unitPrice: tour.priceVND,
                    });
                  }}
                  className="hg-cat-btn hg-cat-btn--cta hg-cat-btn--lg hg-cat-btn--block"
                >
                  Đặt giữ chỗ ngay
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/tour-planner', { state: { templateTour: tour } })}
                  className="hg-cat-btn hg-cat-btn--outline hg-cat-btn--block"
                >
                  <span>Sao chép &amp; tự sửa lịch trình</span>
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              </div>

              <hr className="hg-cat-divider hg-cat-divider--spaced" />
              <dl className="hg-cat-kv">
                <div><dt>Thời lượng</dt><dd>{tour.durationDays} ngày {tour.durationNights} đêm</dd></div>
                <div><dt>Điểm đến</dt><dd>{tour.destinationCity}</dd></div>
                <div><dt>Theo dõi đơn</dt><dd>Trong lịch sử tài khoản</dd></div>
                <div><dt>Thanh toán</dt><dd>Chưa xử lý thanh toán (MVP)</dd></div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
