import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Place } from '../types';
import { FavoriteApi } from '../services/favoriteService';
import { TelemetrySurface } from '../services/telemetryService';
import { useAuth } from './AuthContext';

interface FavoritesContextType {
  favorites: Place[];
  loading: boolean;
  error: string | null;
  toggleFavorite: (place: Place, uiSurface?: TelemetrySurface, requestId?: string) => Promise<void>;
  isFavorite: (id: string) => boolean;
  isPending: (id: string) => boolean;
  refresh: () => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [favorites, setFavorites] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const loadVersion = useRef(0);

  const refresh = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    const version = ++loadVersion.current;
    setLoading(true);
    setError(null);
    try {
      const records = await FavoriteApi.list();
      if (version === loadVersion.current) setFavorites(records.map((record) => record.place));
    } catch {
      if (version === loadVersion.current) {
        setFavorites([]);
        setError('Không thể tải danh sách yêu thích từ máy chủ.');
      }
    } finally {
      if (version === loadVersion.current) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    localStorage.removeItem('travelgo_favorites');
    if (authLoading) return;
    if (!user) {
      loadVersion.current += 1;
      setFavorites([]);
      setPendingIds(new Set());
      setError(null);
      setLoading(false);
      return;
    }
    void refresh();
  }, [authLoading, user?.id, refresh]);

  const toggleFavorite = useCallback(async (
    place: Place,
    uiSurface: TelemetrySurface = 'favorites',
    requestId?: string,
  ) => {
    if (!user) {
      window.location.assign('/login');
      return;
    }
    if (pendingIds.has(place.id)) return;
    const exists = favorites.some((item) => item.id === place.id);
    setPendingIds((current) => new Set(current).add(place.id));
    setError(null);
    try {
      const result = exists
        ? await FavoriteApi.remove(place.id, uiSurface, requestId)
        : await FavoriteApi.add(place.id, uiSurface, requestId);
      if (result.favorite) {
        setFavorites((current) => [
          result.favorite!.place,
          ...current.filter((item) => item.id !== result.favorite!.place.id),
        ]);
      } else {
        setFavorites((current) => current.filter((item) => item.id !== place.id));
      }
    } catch {
      setError('Không thể đồng bộ Favorite với máy chủ. Vui lòng thử lại.');
      await refresh();
    } finally {
      setPendingIds((current) => {
        const next = new Set(current);
        next.delete(place.id);
        return next;
      });
    }
  }, [favorites, pendingIds, refresh, user]);

  const value = useMemo<FavoritesContextType>(() => ({
    favorites,
    loading,
    error,
    toggleFavorite,
    isFavorite: (id: string) => favorites.some((place) => place.id === id),
    isPending: (id: string) => pendingIds.has(id),
    refresh,
  }), [favorites, loading, error, pendingIds, refresh, toggleFavorite]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export const useFavorites = () => {
  const value = useContext(FavoritesContext);
  if (!value) throw new Error('useFavorites phải nằm trong FavoritesProvider');
  return value;
};
