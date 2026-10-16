import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, Lightbulb, MapPin, Sparkles } from 'lucide-react';
import { Place } from '../../types';
import { RatingBadge } from '../common/RatingBadge';
import { formatCurrencyVND } from '../../utils/formatters';
import { useFavorites } from '../../context/FavoritesContext';
import { useTelemetry } from '../../context/TelemetryContext';
import { useRecommendationVisibility } from '../../hooks/useRecommendationVisibility';
import { RecommendedPlace } from '../../services/recommendationService';
import { recommendationReasonLabels } from '../../utils/exploreRecommendation';

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
}

interface PlaceCardProps {
  item: DisplayPlace;
  index: number;
  selected: boolean;
  requestId?: string;
  trackingEnabled: boolean;
  publicExplanation?: string;
  onSelectPlace: (place: Place) => void;
}

const PlaceCard: React.FC<PlaceCardProps> = ({
  item,
  index,
  selected,
  requestId,
  trackingEnabled,
  publicExplanation,
  onSelectPlace,
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

  return (
    <div
      ref={cardRef}
      data-testid={`recommendation-card-${item.id}`}
      data-attribution-ready={attributionReady ? 'true' : 'false'}
      onClick={() => { recordClick(); onSelectPlace(item); }}
      className={`cursor-pointer overflow-hidden rounded-2xl border bg-white p-3 transition-all hover:shadow-md ${
        selected ? 'border-orange-500 bg-orange-50/20 shadow-sm ring-2 ring-orange-500/20' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex gap-3.5">
        <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100">
          <img src={item.heroImage} alt={item.name} className="h-full w-full object-cover" />
          {item.rank ? (
            <span className="absolute left-1.5 top-1.5 rounded-md bg-slate-950/85 px-1.5 py-1 text-[10px] font-extrabold text-white backdrop-blur-sm">
              #{item.rank}
            </span>
          ) : null}
          <button
            type="button"
            aria-pressed={favorited}
            aria-label={favorited ? 'Bỏ lưu địa điểm' : 'Lưu địa điểm'}
            disabled={isPending(item.id)}
            onClick={(event) => {
              event.stopPropagation();
              toggleFavorite(item, 'explore_results', attributedRequestId);
            }}
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm backdrop-blur-sm hover:text-rose-500 disabled:opacity-50"
          >
            <Heart className={`h-3.5 w-3.5 ${favorited ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div className="mb-0.5 flex items-center gap-1 text-[11px] text-slate-500">
              <MapPin className="h-3 w-3 flex-shrink-0 text-orange-500" />
              <span className="truncate">{item.city}</span>
            </div>
            <h3 className="line-clamp-2 text-sm font-bold leading-snug text-slate-900 transition-colors hover:text-orange-600">{item.name}</h3>
            <div className="mt-1"><RatingBadge rating={item.rating} reviewCount={item.reviewCount} showBayesianDetail size="sm" /></div>
          </div>
          <div className="mt-2 flex items-end justify-between border-t border-slate-100 pt-2">
            <div>
              <span className="block text-[10px] text-slate-400">Giá tham khảo từ</span>
              <span className="text-sm font-extrabold text-slate-900">{formatCurrencyVND(item.priceFrom)}</span>
            </div>
            <Link
              to={detailUrl}
              onClick={(event) => { event.stopPropagation(); recordClick(); }}
              className="flex items-center text-xs font-bold text-orange-600 hover:text-orange-700"
            >
              Chi tiết <ArrowRight className="ml-0.5 h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-3 border-t border-slate-100 pt-3">
        <div data-testid={`recommendation-why-${item.id}`} className="flex items-start gap-2 text-[11px] leading-4 text-slate-600">
          {item.why ? <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /> : <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-500" />}
          <span>{item.why || publicExplanation || 'Địa điểm công khai đủ điều kiện hiển thị; chưa cá nhân hóa.'}</span>
        </div>
        {reasonLabels.length > 0 ? (
          <div data-testid={`recommendation-reasons-${item.id}`} className="mt-2 flex flex-wrap gap-1.5">
            {reasonLabels.map((label) => (
              <span key={label} className="rounded-full border border-teal-100 bg-teal-50 px-2 py-1 text-[10px] font-bold text-teal-700">
                {label}
              </span>
            ))}
          </div>
        ) : null}
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
}) => (
  <div className="max-h-[720px] space-y-3 overflow-y-auto pr-1" aria-busy={loading}>
    {!loading && places.length === 0 ? (
      <div data-testid="explore-empty" className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
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
          onSelectPlace={onSelectPlace}
        />
      ))
    )}
  </div>
);
