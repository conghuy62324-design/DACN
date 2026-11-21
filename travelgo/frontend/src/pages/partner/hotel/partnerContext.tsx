// Ngữ cảnh khách sạn đang chọn ở kênh Partner (switcher trên topbar + menu).
// URL là nguồn chính; localStorage['hg.partner.hotelId'] chỉ để nhớ lựa chọn cuối (bọc try/catch).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { matchPath, useLocation } from 'react-router-dom';
import { api } from '../../../services/api';

export interface PartnerHotelSummary {
  id: string;
  name: string;
  status: string;
  contentVersion: number;
  approvedContentVersion: number | null;
  commercialVersion: number;
  businessName?: string;
  /** Đề xuất additive (spec 6.6) — chưa có ở backend thật. */
  businessId?: string;
}

interface PartnerHotelsValue {
  enabled: boolean;
  hotels: PartnerHotelSummary[];
  loading: boolean;
  error: string;
  /** Khách sạn trong URL hiện tại (nếu có). */
  urlHotelId: string | null;
  /** URL trước, rồi lựa chọn đã nhớ (chỉ khi còn trong danh sách). */
  currentHotelId: string | null;
  current: PartnerHotelSummary | null;
  reload: () => void;
  remember: (id: string) => void;
}

const KEY = 'hg.partner.hotelId';

const readRemembered = () => {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

const Ctx = createContext<PartnerHotelsValue | null>(null);

/** null khi ngoài PartnerLayout (vd. trang admin). */
export const usePartnerHotels = () => useContext(Ctx);

export const hotelDomainEnabled = () => import.meta.env.VITE_HOTEL_DOMAIN_ENABLED === 'true';

export const PartnerHotelsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const enabled = hotelDomainEnabled();
  const location = useLocation();
  const [hotels, setHotels] = useState<PartnerHotelSummary[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [remembered, setRemembered] = useState<string | null>(readRemembered);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setLoading(true);
    api
      .get('/partner/hotels')
      .then((r: any) => {
        if (!live) return;
        setHotels(Array.isArray(r.data) ? r.data : []);
        setError('');
      })
      .catch((e: any) => live && setError(e?.message || 'Không tải được danh sách khách sạn.'))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [enabled, tick]);

  const match = matchPath({ path: '/partner/hotels/:hotelId/*' }, location.pathname);
  const raw = match?.params.hotelId;
  const urlHotelId = raw && raw !== 'new' ? raw : null;

  const remember = useCallback((id: string) => {
    setRemembered(id);
    try {
      window.localStorage.setItem(KEY, id);
    } catch {
      /* chỉ để tiện, bỏ qua */
    }
  }, []);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  const value = useMemo<PartnerHotelsValue>(() => {
    const known = (id: string | null) => (id && hotels.some((h) => h.id === id) ? id : null);
    const currentHotelId = urlHotelId || known(remembered);
    return {
      enabled,
      hotels,
      loading,
      error,
      urlHotelId,
      currentHotelId,
      current: hotels.find((h) => h.id === currentHotelId) || null,
      reload,
      remember,
    };
  }, [enabled, hotels, loading, error, urlHotelId, remembered, reload, remember]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
