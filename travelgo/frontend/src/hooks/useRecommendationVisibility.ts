import { RefObject, useEffect, useState } from 'react';
import { RecommendationApi } from '../services/recommendationService';
import { TelemetryItemType } from '../services/telemetryService';

export function useRecommendationVisibility(
  ref: RefObject<HTMLElement>,
  input: { requestId?: string; itemId: string; itemType: Extract<TelemetryItemType, 'place' | 'hotel' | 'restaurant'>; uiSurface: 'home_featured' | 'explore_results' | 'tour_planner' },
): boolean {
  const [attributionReady, setAttributionReady] = useState(false);

  useEffect(() => {
    setAttributionReady(false);
    const requestId = input.requestId;
    if (!requestId || !ref.current || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let sent = false;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      const visible = !!entry?.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === 'visible';
      if (!visible) {
        if (timer) clearTimeout(timer);
        timer = undefined;
        return;
      }
      if (!timer && !sent) timer = setTimeout(async () => {
        sent = true;
        try {
          const result = await RecommendationApi.acknowledgeVisible({ ...input, requestId, visibleRatio: Math.max(0.5, entry.intersectionRatio), dwellMs: 2000 });
          setAttributionReady(result.recorded || result.duplicate);
        } catch (error) {
          console.warn('Recommendation visibility was not acknowledged', error);
        }
      }, 2000);
    }, { threshold: [0.5] });
    observer.observe(ref.current);
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [ref, input.requestId, input.itemId, input.itemType, input.uiSurface]);

  return attributionReady;
}
