import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Lightbulb, MapPin, SearchX, Sparkles } from 'lucide-react';
import { Place } from '../../types';
import { RatingBadge } from '../common/RatingBadge';
import { formatCurrencyVND } from '../../utils/formatters';
import { useFavorites } from '../../context/FavoritesContext';
import { useTelemetry } from '../../context/TelemetryContext';
import { useRecommendationVisibility } from '../../hooks/useRecommendationVisibility';
import { RecommendedPlace } from '../../services/recommendationService';
import { recommendationReasonLabels } from '../../utils/exploreRecommendation';
import {accommodationLabels,cuisineLabels} from './ServiceFilters';
import '../../styles/hg-catalog.css';

type DisplayPlace = Place & Partial<Pick<RecommendedPlace, 'rank' | 'reasonCodes' | 'why' | 'scoreBreakdown'>>;

interface PlaceSidebarProps {
  places: DisplayPlace[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  recommendationRequestId?: string;
  trackingEnabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  publicExplanation?: string;
  grid?:boolean;
}

interface PlaceCardProps {
  item: DisplayPlace;
  index: number;
  selected: boolean;
  requestId?: string;
  trackingEnabled: boolean;
  publicExplanation?: string;
  onSelectPlace: (place: Place) => void;
  grid?:boolean;
}

const PlaceCard: React.FC<PlaceCardProps> = ({
  item,
  index,
  selected,
  requestId,
  trackingEnabled,
  publicExplanation,
  onSelectPlace,
  grid=false,
}) => {
  const { toggleFavorite, isFavorite, isPending } = useFavorites();
  const { track } = useTelemetry();
  const cardRef = useRef<HTMLDivElement>(null);
  const itemType = item.category === 'hotel' || item.category === 'restaurant' ? item.category : 'place';
  const attributionRequestId = trackingEnabled ? requestId : undefined;
  const attributionReady = useRecommendationVisibility(cardRef, {
    requestId: attributionRequestId, itemId: item.id, itemType, uiSurface: 'explore_results',
  });
  const attributedRequestId = attributionReady ? attributionRequestId : undefined;
  const detailUrl = attributedRequestId
    ? `/places/${item.id}?recommendationRequestId=${encodeURIComponent(attributedRequestId)}`
    : `/places/${item.id}`;
  const favorited = isFavorite(item.id);
  const reasonLabels = recommendationReasonLabels(item.reasonCodes || []);

  const recordClick = () => void track({
    itemId: item.id, itemType, eventType: 'CLICK', uiSurface: 'explore_results',
    requestId: attributedRequestId, context: { position: item.rank || index + 1 },
  });

  const typeLabel = item.category==='hotel'
    ? accommodationLabels[item.catalogMetadata?.accommodationType||'']||'Lưu trú'
    : item.category==='restaurant'
      ? (item.catalogMetadata?.cuisines||[]).map(k=>cuisineLabels[k]).filter(Boolean).join(' · ')||'Nhà hàng'
      : 'Điểm tham quan';
  const area = item.city+(item.geography?.provinceName&&item.geography.provinceName!==item.city?' · '+item.geography.provinceName:'');

  return (
    <div
      ref={cardRef}
      data-testid={`recommendation-card-${item.id}`}
      data-attribution-ready={attributionReady ? 'true' : 'false'}
      aria-current={selected ? 'true' : undefined}
      onClick={() => { recordClick(); onSelectPlace(item); }}
      className="hg-cat-card hg-cat-card--clickable"
    >
      <div className="hg-cat-card__media">
        <img src={item.heroImage} alt={item.name} loading="lazy" decoding="async" onError={e=>e.currentTarget.parentElement?.classList.add('hg-cat-imgfail')}/>
        <span className="hg-cat-card__badges">
          {item.rank ? <span className="hg-cat-badge hg-cat-badge--dark">#{item.rank}</span> : null}
          <span className="hg-cat-badge">{typeLabel}</span>
        </span>
        <button
          type="button"
          aria-pressed={favorited}
          aria-label={favorited ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}
          disabled={isPending(item.id)}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(item, 'explore_results', attributedRequestId);
          }}
          className="hg-cat-fav"
        >
          <Heart size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="hg-cat-card__body">
        <div className="hg-cat-card__meta">
          <span>
            <MapPin size={14} aria-hidden="true" />
            {area}
          </span>
        </div>
        <h3 className="hg-cat-card__title">
          <Link to={detailUrl} onClick={(event) => { event.stopPropagation(); recordClick(); }}>{item.name}</Link>
        </h3>
        <div className="hg-cat-rating"><RatingBadge rating={item.rating} reviewCount={item.reviewCount} showBayesianDetail size="sm" /></div>
        <p data-testid={`recommendation-why-${item.id}`} className="hg-cat-card__why">
          {item.why ? <Lightbulb size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
          <span>{item.why || publicExplanation || 'Địa điểm công khai đủ điều kiện hiển thị; chưa cá nhân hóa.'}</span>
        </p>
        {reasonLabels.length > 0 ? (
          <div data-testid={`recommendation-reasons-${item.id}`} className="hg-cat-card__tags">
            {reasonLabels.map((label) => (
              <span key={label} className="hg-cat-tag">{label}</span>
            ))}
          </div>
        ) : null}
        <Link onClick={e=>e.stopPropagation()} to={'/assistant?listing='+encodeURIComponent(item.id)} className="hg-cat-ai"><Sparkles size={16} aria-hidden="true" />Tư vấn bằng AI</Link>
      </div>

      <div className="hg-cat-card__foot">
        <div className="hg-cat-price">
          <span className="hg-cat-price__label">Giá tham khảo từ</span>
          <span className="hg-cat-price__value">{item.priceFrom==null?'Chưa có giá':formatCurrencyVND(item.priceFrom)}</span>
          <span className="hg-cat-price__note">VND · đơn vị chưa xác minh</span>
        </div>
        <div className="hg-cat-card__actions">
          <Link
            to={detailUrl}
            onClick={(event) => { event.stopPropagation(); recordClick(); }}
            className="hg-cat-btn hg-cat-btn--outline hg-cat-btn--sm"
          >
            Chi tiết <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export const PlaceSidebar: React.FC<PlaceSidebarProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  recommendationRequestId,
  trackingEnabled = false,
  loading = false,
  emptyMessage = 'Không tìm thấy địa điểm nào phù hợp với bộ lọc.',
  publicExplanation,
  grid=false,
}) => (
  <div className={grid?'hg-cat-grid':'hg-cat-stack hg-cat-scroll'} aria-busy={loading}>
    {!loading && places.length === 0 ? (
      <div data-testid="explore-empty" className="hg-cat-state" role="status">
        <SearchX size={32} aria-hidden="true" />
        <p>{emptyMessage}</p>
      </div>
    ) : (
      places.map((item, index) => (
        <PlaceCard
          key={item.id}
          item={item}
          index={index}
          selected={selectedPlace?.id === item.id}
          requestId={recommendationRequestId}
          trackingEnabled={trackingEnabled}
          publicExplanation={publicExplanation}
          grid={grid}
          onSelectPlace={onSelectPlace}
        />
      ))
    )}
  </div>
);
