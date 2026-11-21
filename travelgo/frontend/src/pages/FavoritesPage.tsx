import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, ImageOff, Loader2, MapPin } from 'lucide-react';
import { useFavorites } from '../context/FavoritesContext';
import { formatCurrencyVND } from '../utils/formatters';
import { RatingBadge } from '../components/common/RatingBadge';
import { AccountShell } from '../components/account/AccountShell';
import { AccountLoadError, AccountState } from '../components/account/AccountState';
import { Place } from '../types';
import '../styles/hg-account.css';

const categoryLabels: Record<Place['category'], string> = {
  hotel: 'Khách sạn',
  restaurant: 'Nhà hàng',
  attraction: 'Điểm tham quan',
  tour: 'Tour',
};

function FavoriteMedia({ item }: { item: Place }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="hg-acc-fav__media">
      {item.heroImage && !failed ? (
        <img src={item.heroImage} alt={item.name} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      ) : (
        <span className="hg-acc-fav__placeholder" aria-hidden="true">
          <ImageOff size={28} />
        </span>
      )}
    </div>
  );
}

function FavoritesSkeleton() {
  return (
    <div className="hg-acc-grid" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <div key={key} className="hg-acc-card hg-acc-fav animate-pulse">
          <span className="hg-acc-skel hg-acc-skel--media" />
          <div className="hg-acc-fav__body">
            <span className="hg-acc-skel hg-acc-skel--line hg-acc-skel--short" />
            <span className="hg-acc-skel hg-acc-skel--title" />
            <span className="hg-acc-skel hg-acc-skel--line" />
          </div>
        </div>
      ))}
    </div>
  );
}

export const FavoritesPage: React.FC = () => {
  const { favorites, toggleFavorite, loading, error, isPending, refresh } = useFavorites();

  let content: React.ReactNode;
  if (loading) {
    content = (
      <>
        <p role="status" className="hg-acc-result">
          Đang đồng bộ danh sách yêu thích từ máy chủ…
        </p>
        <FavoritesSkeleton />
      </>
    );
  } else if (error && favorites.length === 0) {
    content = <AccountLoadError message={error} onRetry={() => void refresh()} />;
  } else if (favorites.length === 0) {
    content = (
      <AccountState
        icon={Heart}
        title="Chưa có mục yêu thích nào"
        description="Nhấn biểu tượng trái tim trên thẻ khách sạn hoặc địa điểm để lưu lại vào đây."
        actions={
          <>
            <Link to="/explore" className="hg-acc-btn hg-acc-btn--cta">
              Khám phá ngay
            </Link>
            <Link to="/hotels" className="hg-acc-btn hg-acc-btn--outline">
              Tìm khách sạn
            </Link>
          </>
        }
      />
    );
  } else {
    content = (
      <>
        {error && (
          <p role="alert" className="hg-acc-notice hg-acc-notice--error hg-acc-gap">
            <span>{error}</span>
          </p>
        )}
        <p className="hg-acc-result">{favorites.length} mục đã lưu</p>
        <div className="hg-acc-grid">
          {favorites.map((item) => {
            const pending = isPending(item.id);
            return (
              <article key={item.id} className="hg-acc-card hg-acc-fav">
                <FavoriteMedia item={item} />
                <button
                  type="button"
                  onClick={() => toggleFavorite(item)}
                  disabled={pending}
                  className="hg-acc-fav__remove"
                  aria-label={`Bỏ lưu ${item.name}`}
                  title="Xóa khỏi yêu thích"
                >
                  {pending ? <Loader2 size={18} className="hg-acc-spin" aria-hidden="true" /> : <Heart size={18} fill="currentColor" aria-hidden="true" />}
                </button>
                <div className="hg-acc-fav__body">
                  <div className="hg-acc-fav__meta">
                    {categoryLabels[item.category] && <span>{categoryLabels[item.category]}</span>}
                    {item.city && (
                      <span>
                        <MapPin size={14} aria-hidden="true" />
                        {item.city}
                      </span>
                    )}
                  </div>
                  <Link to={`/places/${item.id}`} className="hg-acc-fav__title">
                    <h3>{item.name}</h3>
                  </Link>
                  <RatingBadge rating={item.rating} reviewCount={item.reviewCount} showBayesianDetail={false} size="sm" />
                  <div className="hg-acc-fav__foot">
                    {item.priceFrom > 0 ? (
                      <span className="hg-acc-fav__price">
                        Từ <b>{formatCurrencyVND(item.priceFrom)}</b>
                      </span>
                    ) : (
                      <span className="hg-acc-fav__price">Chưa có giá tham khảo</span>
                    )}
                    <Link to={`/places/${item.id}`} className="hg-acc-link" aria-label={`Xem chi tiết ${item.name}`}>
                      <span>Xem chi tiết</span>
                      <ArrowRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <AccountShell title="Yêu thích" description="Khách sạn và địa điểm bạn đã lưu để lên kế hoạch cho chuyến đi sắp tới.">
      {content}
    </AccountShell>
  );
};
