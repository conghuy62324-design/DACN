import React, { createContext, useContext, useState, useEffect } from 'react';
import { Place } from '../types';

interface FavoritesContextType {
  favorites: Place[];
  toggleFavorite: (place: Place) => void;
  isFavorite: (id: string) => boolean;
}

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: [],
  toggleFavorite: () => {},
  isFavorite: () => false,
});

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<Place[]>(() => {
    const saved = localStorage.getItem('travelgo_favorites');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('travelgo_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (place: Place) => {
    setFavorites((prev) => {
      const exists = prev.some((p) => p.id === place.id);
      if (exists) {
        return prev.filter((p) => p.id !== place.id);
      } else {
        return [...prev, place];
      }
    });
  };

  const isFavorite = (id: string) => {
    return favorites.some((p) => p.id === id);
  };

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
