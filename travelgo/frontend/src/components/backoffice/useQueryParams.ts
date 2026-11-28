import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/** Đọc/ghi trạng thái lọc vào URL query (?status=PENDING&q=) — tải lại trang vẫn giữ. */
export function useQueryParams() {
  const [params, setParams] = useSearchParams();
  const get = useCallback((key: string, fallback = '') => params.get(key) ?? fallback, [params]);
  const set = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        for (const [key, value] of Object.entries(patch)) {
          if (value === null || value === undefined || value === '') next.delete(key);
          else next.set(key, String(value));
        }
        return next;
      }, { replace: true });
    },
    [setParams],
  );
  return { params, get, set, search: params.toString() ? `?${params.toString()}` : '' };
}

/** Giá trị trễ (debounce) cho ô tìm lọc ở client — 300ms. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [state, setState] = useState(value);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      setState(value);
      return;
    }
    const timer = window.setTimeout(() => setState(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return state;
}
