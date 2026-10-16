import { useEffect, useRef } from 'react';
import { TelemetryItemType, TelemetrySurface } from '../services/telemetryService';
import { useTelemetry } from '../context/TelemetryContext';

export function useTelemetryView(itemId: string | undefined, itemType: TelemetryItemType, uiSurface: TelemetrySurface) {
  const elementRef = useRef<HTMLDivElement>(null);
  const sentRef = useRef(false);
  const { consent, track } = useTelemetry();

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !itemId || !consent.analyticsEnabled || sentRef.current) return;
    const storageKey = `hugo_view_v1:${uiSurface}:${itemType}:${itemId}`;
    if (sessionStorage.getItem(storageKey)) { sentRef.current = true; return; }
    let timer: number | undefined;
    const stopTimer = () => { if (timer !== undefined) window.clearTimeout(timer); timer = undefined; };
    const observer = new IntersectionObserver(([entry]) => {
      const visible = entry.isIntersecting && entry.intersectionRatio >= 0.5 && document.visibilityState === 'visible';
      if (!visible) {
        stopTimer();
      } else if (timer === undefined) {
        timer = window.setTimeout(() => {
          if (sentRef.current) return;
          sentRef.current = true;
          sessionStorage.setItem(storageKey, '1');
          void track({ itemId, itemType, eventType: 'VIEW', uiSurface, context: { dwellMs: 2000 } });
        }, 2000);
      }
    }, { threshold: [0.5] });
    observer.observe(element);
    const visibility = () => {
      if (document.visibilityState !== 'visible') stopTimer();
      else {
        observer.unobserve(element);
        observer.observe(element);
      }
    };
    document.addEventListener('visibilitychange', visibility);
    return () => { stopTimer(); observer.disconnect(); document.removeEventListener('visibilitychange', visibility); };
  }, [itemId, itemType, uiSurface, consent.analyticsEnabled, track]);

  return elementRef;
}
