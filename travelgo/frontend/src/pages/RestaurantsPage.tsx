import {CatalogBreadcrumb,CatalogFeedback,CatalogPageFilters,CatalogPagination,CatalogSkeletonGrid,CatalogState,useCatalogPage} from '../components/explore/CatalogPageFilters';
import {cuisineLabels} from '../components/explore/ServiceFilters';
import React from 'react';
import { Link } from 'react-router-dom';
import { UtensilsCrossed, MapPin, Heart, Users, Sparkles } from 'lucide-react';
import { RatingBadge } from '../components/common/RatingBadge';
import { formatCurrencyVND } from '../utils/formatters';
import { useFavorites } from '../context/FavoritesContext';
import { useBooking } from '../context/BookingContext';
import '../styles/hg-catalog.css';

export const RestaurantsPage: React.FC = () => {
  const catalog=useCatalogPage('restaurant');
  const restaurants=catalog.items;
  const {toggleFavorite,isFavorite}=useFavorites();
  const {openBooking}=useBooking();

  let list: React.ReactNode = null;
  if (catalog.loading) list = <CatalogSkeletonGrid label="Đang tải nhà hàng…"/>;
  else if (!catalog.error && restaurants.length === 0) list = <CatalogState
    role="status"
    icon={<UtensilsCrossed size={32} aria-hidden="true"/>}
    title="Chưa có nhà hàng phù hợp"
    text="Chưa có nhà hàng tại địa điểm này. Bạn có thể đổi điểm đến hoặc nới bộ lọc."
  />;
  else if (!catalog.error) list = (
    <div className="hg-cat-grid">
      {restaurants.map((rest) => {
        const favorited = isFavorite(rest.id);
        const cuisines = (rest.catalogMetadata?.cuisines || []).map((k) => cuisineLabels[k]).filter(Boolean);
        return (
          <article key={rest.id} data-testid="service-catalog-card" className="hg-cat-card">
            <div className="hg-cat-card__media">
              <img src={rest.heroImage} alt={rest.name} loading="lazy" decoding="async" onError={(e) => e.currentTarget.parentElement?.classList.add('hg-cat-imgfail')} />
              <span className="hg-cat-card__badges">
                {cuisines.length > 0 && <span className="hg-cat-badge">{cuisines.join(' · ')}</span>}
              </span>
              <button
                type="button"
                aria-pressed={favorited}
                aria-label={favorited ? 'Bỏ lưu nhà hàng' : 'Lưu nhà hàng'}
                onClick={() => toggleFavorite(rest)}
                className="hg-cat-fav"
              >
                <Heart size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="hg-cat-card__body">
              <div className="hg-cat-card__meta">
                <span>
                  <MapPin size={14} aria-hidden="true" />
                  {rest.address || rest.city}
                </span>
              </div>
              <h3 className="hg-cat-card__title">
                <Link to={`/places/${rest.id}`}>{rest.name}</Link>
              </h3>
              <div className="hg-cat-rating">
                <RatingBadge rating={rest.rating} reviewCount={rest.reviewCount} showBayesianDetail={true} size="sm" />
              </div>
              {rest.summary && <p className="hg-cat-card__text">{rest.summary}</p>}
              {rest.highlights.length > 0 && (
                <div className="hg-cat-card__tags">
                  {rest.highlights.slice(0, 4).map((h, i) => (
                    <span key={i} className="hg-cat-tag hg-cat-tag--muted">{h}</span>
                  ))}
                </div>
              )}
              <Link className="hg-cat-ai" to={'/assistant?listing='+encodeURIComponent(rest.id)}>
                <Sparkles size={16} aria-hidden="true" />Tư vấn bằng AI
              </Link>
            </div>

            <div className="hg-cat-card__foot">
              <div className="hg-cat-price">
                <span className="hg-cat-price__label">Giá từ danh mục</span>
                <span className="hg-cat-price__value">{rest.priceFrom==null?'Chưa có giá':formatCurrencyVND(rest.priceFrom)}</span>
                <span className="hg-cat-price__note">Đơn vị giá chưa xác minh</span>
              </div>
              <div className="hg-cat-card__actions">
                <Link to={`/places/${rest.id}`} className="hg-cat-btn hg-cat-btn--ghost hg-cat-btn--sm">
                  Xem chi tiết
                </Link>
                <button
                  type="button"
                  disabled={rest.isDemo||rest.priceFrom==null}
                  onClick={() =>
                    openBooking({
                      serviceType: 'restaurant',
                      serviceId: rest.id,
                      serviceName: rest.name,
                      unitPrice: rest.priceFrom,
                      imageUrl: rest.heroImage,
                    })
                  }
                  className="hg-cat-btn hg-cat-btn--cta hg-cat-btn--sm"
                >
                  <Users size={16} aria-hidden="true" />
                  <span>{rest.isDemo?'Chưa nhận đặt':'Đặt dịch vụ'}</span>
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <div className="hg-cat">
      <header className="hg-cat-head">
        <div className="hg-container">
          <CatalogBreadcrumb items={[{label:'Trang chủ',to:'/'},{label:'Nhà hàng'}]}/>
          <p className="hg-cat-eyebrow"><UtensilsCrossed size={16} aria-hidden="true"/>Ẩm thực ba miền</p>
          <h1 className="hg-cat-h1">Nhà hàng &amp; quán ăn</h1>
          <p className="hg-cat-lead">
            Tìm quán ăn theo loại ẩm thực và ngân sách. Thực đơn, chất gây dị ứng và tình trạng bàn cần được nhà cung cấp xác nhận riêng.
          </p>
        </div>
      </header>

      <div className="hg-container hg-cat-main">
        <CatalogPageFilters {...catalog}/>
        <section aria-label="Danh sách nhà hàng">
          <div className="hg-cat-resultbar">
            <h2 className="hg-cat-h2">Nhà hàng phù hợp</h2>
            <p className="hg-cat-count" role="status">{catalog.loading?'Đang lọc…':catalog.error?'':catalog.meta.total+' nhà hàng'}</p>
          </div>
          <CatalogFeedback {...catalog}/>
          {list}
          <CatalogPagination {...catalog}/>
        </section>
      </div>
    </div>
  );
};
