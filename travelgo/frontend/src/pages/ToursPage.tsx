import {LocationCombobox} from '../components/common/LocationCombobox';
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Compass,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  ArrowRight,
  Star,
  Route,
} from 'lucide-react';
import { TourService } from '../services/tourService';
import { TourPackage } from '../types';
import { useTelemetry } from '../context/TelemetryContext';
import {CatalogBreadcrumb,CatalogSkeletonGrid,CatalogState,catalogErrorText} from '../components/explore/CatalogPageFilters';
import '../styles/hg-catalog.css';

export const ToursPage: React.FC = () => {
  const navigate = useNavigate();
  const { track } = useTelemetry();
  const [tours, setTours] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState('bayesian');


  const CATEGORIES = [
    { id: 'all', label: 'Tất cả thể loại' },
    { id: 'culture', label: 'Văn hóa & Di sản' },
    { id: 'beach', label: 'Biển đảo' },
    { id: 'nature', label: 'Thiên nhiên núi non' },
    { id: 'resort', label: 'Nghỉ dưỡng & Sống chậm' },
  ];

  useEffect(() => {
    fetchTours();
  }, [selectedCity, selectedCategory, selectedDuration, sortBy]);

  const fetchTours = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await TourService.getTours({
        city: selectedCity,
        category: selectedCategory,
        durationDays: selectedDuration,
        sortBy,
        search: searchQuery || undefined,
      });
      setTours(data);
    } catch (err) {
      console.error('Error fetching tours:', err);
      setTours([]);
      setError(catalogErrorText(err, 'Chưa tải được danh sách tour. Vui lòng thử lại sau ít phút.'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTours();
  };

  const resetFilters = () => {
    setSelectedCity('all');
    setSelectedCategory('all');
    setSelectedDuration(undefined);
    setSearchQuery('');
  };

  let list: React.ReactNode;
  if (loading) {
    list = <CatalogSkeletonGrid count={3} label="Đang tải tour…"/>;
  } else if (error) {
    list = <CatalogState role="alert" tone="error" title="Chưa tải được tour" text={error} actions={<button type="button" className="hg-cat-btn hg-cat-btn--outline" onClick={fetchTours}>Thử lại</button>}/>;
  } else if (tours.length === 0) {
    list = <CatalogState
      role="status"
      icon={<Compass size={32} aria-hidden="true"/>}
      title="Không tìm thấy tour phù hợp"
      text="Thử thay đổi bộ lọc, hoặc tự tạo lịch trình riêng bằng HuGo Planner."
      actions={<>
        <button type="button" onClick={resetFilters} className="hg-cat-btn hg-cat-btn--outline">Xóa bộ lọc</button>
        <Link to="/tour-planner" className="hg-cat-btn hg-cat-btn--ghost">Tạo lịch trình riêng</Link>
      </>}
    />;
  } else {
    list = (
      <div className="hg-cat-grid">
        {tours.map((tour) => (
          <article key={tour.id} className="hg-cat-card">
            <Link
              to={`/tours/${tour.id}`}
              tabIndex={-1}
              aria-hidden="true"
              onClick={() => void track({ itemId: tour.id, itemType: 'tour', eventType: 'CLICK', uiSurface: 'tour_list' })}
              className="hg-cat-card__media"
            >
              <img src={tour.heroImage} alt="" loading="lazy" decoding="async" onError={(e) => e.currentTarget.parentElement?.classList.add('hg-cat-imgfail')} />
              <span className="hg-cat-card__badges">
                <span className="hg-cat-badge"><MapPin size={12} aria-hidden="true" />{tour.destinationCity}</span>
                <span className="hg-cat-badge hg-cat-badge--dark">{tour.durationDays}N{tour.durationNights}Đ</span>
              </span>
            </Link>

            <div className="hg-cat-card__body">
              <div className="hg-cat-card__meta">
                <span>Khởi hành từ {tour.departureCity}</span>
                {tour.reviewCount > 0 ? (
                  <span>
                    <Star size={14} aria-hidden="true" />
                    <b>{tour.bayesianScore.toFixed(2)}</b> ({tour.reviewCount} đánh giá)
                  </span>
                ) : (
                  <span>Chưa có đánh giá</span>
                )}
              </div>
              <h3 className="hg-cat-card__title">
                <Link
                  to={`/tours/${tour.id}`}
                  onClick={() => void track({ itemId: tour.id, itemType: 'tour', eventType: 'CLICK', uiSurface: 'tour_list' })}
                >
                  {tour.title}
                </Link>
              </h3>
              {tour.summary && <p className="hg-cat-card__text">{tour.summary}</p>}

              {tour.highlights.length > 0 && (
                <ul className="hg-cat-checks hg-cat-checks--1" aria-label="Điểm nhấn nổi bật">
                  {tour.highlights.slice(0, 3).map((hl, idx) => (
                    <li key={idx}>
                      <CheckCircle2 size={16} aria-hidden="true" />
                      <span>{hl}</span>
                    </li>
                  ))}
                </ul>
              )}

              {tour.itineraryDays.length > 0 && (
                <div className="hg-cat-card__why">
                  <Route size={16} aria-hidden="true" />
                  <span>
                    {tour.itineraryDays.slice(0, 3).map((day) => `N${day.day}: ${day.title}`).join(' · ')}
                    {tour.itineraryDays.length > 3 ? ' · …' : ''}
                  </span>
                </div>
              )}
            </div>

            <div className="hg-cat-card__foot">
              <div className="hg-cat-price">
                <span className="hg-cat-price__label">Chi phí trọn gói từ</span>
                <span className="hg-cat-price__value">
                  {new Intl.NumberFormat('vi-VN').format(tour.priceVND)} ₫ <small>/ khách</small>
                </span>
              </div>

              <div className="hg-cat-card__actions">
                <button
                  type="button"
                  onClick={() => navigate('/tour-planner', { state: { templateTour: tour } })}
                  className="hg-cat-btn hg-cat-btn--ghost hg-cat-btn--sm"
                  title="Sao chép lịch trình này để tự tùy biến"
                >
                  <span>Tùy biến</span>
                </button>
                <Link
                  to={`/tours/${tour.id}`}
                  onClick={() => void track({ itemId: tour.id, itemType: 'tour', eventType: 'CLICK', uiSurface: 'tour_list' })}
                  className="hg-cat-btn hg-cat-btn--primary hg-cat-btn--sm"
                >
                  Chi tiết tour
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="hg-cat">
      <header className="hg-cat-head">
        <div className="hg-container">
          <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Tour du lịch'}]}/>
          <div className="hg-cat-head__row">
            <div className="hg-cat-head__text">
              <p className="hg-cat-eyebrow"><Compass size={16} aria-hidden="true"/>Xếp hạng theo điểm đánh giá Bayesian</p>
              <h1 className="hg-cat-h1">Tour du lịch trọn gói</h1>
              <p className="hg-cat-lead">
                Các tour mẫu kết hợp điểm tham quan tiêu biểu, lịch trình theo ngày và chi phí minh bạch. Muốn tự sắp xếp? HuGo Planner giúp bạn tạo lịch trình riêng.
              </p>
            </div>
            <div className="hg-cat-head__actions">
              <Link to="/tour-planner" className="hg-cat-btn hg-cat-btn--outline">
                Tạo lịch trình riêng
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="hg-container hg-cat-main">
        <section className="hg-cat-panel" aria-label="Tìm và lọc tour">
          <form onSubmit={handleSearchSubmit} className="hg-cat-searchrow hg-cat-searchrow--tours">
            <label className="hg-cat-field">
              <span>Tìm kiếm</span>
              <span className="hg-cat-inputwrap">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Tìm tour"
                  placeholder="Tên tour, điểm tham quan…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="hg-cat-input"
                />
              </span>
            </label>

            <LocationCombobox label="Điểm đến tour" value={selectedCity} onChange={setSelectedCity}/>

            <label className="hg-cat-field">
              <span>Thể loại</span>
              <select
                aria-label="Thể loại tour"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="hg-cat-select"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="hg-cat-field">
              <span>Sắp xếp</span>
              <select
                aria-label="Sắp xếp tour"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="hg-cat-select"
              >
                <option value="bayesian">Điểm Bayesian cao nhất</option>
                <option value="priceAsc">Giá thấp đến cao</option>
                <option value="priceDesc">Giá cao đến thấp</option>
                <option value="duration">Thời lượng dài ngày</option>
              </select>
            </label>

            <button type="submit" className="hg-cat-btn hg-cat-btn--cta hg-cat-btn--lg">
              <Search size={18} aria-hidden="true" />Tìm
            </button>
          </form>

          <div className="hg-cat-chips hg-cat-chips--row" role="group" aria-label="Thời lượng tour">
            <span className="hg-cat-chips__label"><Clock size={16} aria-hidden="true" />Thời lượng</span>
            <button
              type="button"
              aria-pressed={selectedDuration === undefined}
              onClick={() => setSelectedDuration(undefined)}
              className="hg-cat-chip"
            >
              Tất cả
            </button>
            {[2, 3, 4].map((d) => (
              <button
                type="button"
                key={d}
                aria-pressed={selectedDuration === d}
                onClick={() => setSelectedDuration(d)}
                className="hg-cat-chip"
              >
                {d} ngày {d > 1 ? `${d - 1} đêm` : ''}
              </button>
            ))}
          </div>
        </section>

        <section aria-label="Danh sách tour">
          <div className="hg-cat-resultbar">
            <h2 className="hg-cat-h2">Tour phù hợp</h2>
            <p className="hg-cat-count" role="status">{loading ? 'Đang tải…' : error ? '' : `${tours.length} tour`}</p>
          </div>
          {list}
        </section>
      </div>
    </div>
  );
};
