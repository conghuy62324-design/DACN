import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapView } from '../components/explore/MapView';
import { FilterBar } from '../components/explore/FilterBar';
import { PlaceSidebar } from '../components/explore/PlaceSidebar';
import { PlaceService } from '../services/placeService';
import { Place } from '../types';
import { Map, List, Compass, Sparkles } from 'lucide-react';

export const ExplorePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [city, setCity] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('bayesian');
  const [loading, setLoading] = useState(true);

  // Mobile View Toggle: 'list' or 'map'
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');

  useEffect(() => {
    const fetchPlaces = async () => {
      setLoading(true);
      try {
        const data = await PlaceService.getPlaces({
          category: category !== 'all' ? category : undefined,
          city: city !== 'all' ? city : undefined,
          search: search || undefined,
          minRating: minRating > 0 ? minRating : undefined,
          sortBy: sortBy,
        });
        setPlaces(data);
        if (data.length > 0 && !selectedPlace) {
          setSelectedPlace(data[0]);
        }
      } catch (err) {
        console.error('Error fetching places:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaces();
  }, [category, city, search, minRating, sortBy]);

  const handleSelectPlace = (place: Place) => {
    setSelectedPlace(place);
    // On mobile, automatically switch to map view when card is clicked to see its location
    if (window.innerWidth < 1024) {
      setMobileView('map');
    }
  };

  return (
    <div className="min-h-screen pt-20 pb-16 bg-slate-100/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-teal-600 font-bold text-xs uppercase tracking-wider mb-1">
              <Compass className="w-4 h-4" />
              <span>Bản đồ du lịch tương tác</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Khám phá Việt Nam theo vị trí địa lý
            </h1>
          </div>

          {/* Mobile View Toggle Button */}
          <div className="lg:hidden flex bg-white rounded-xl p-1 shadow-sm border border-slate-200">
            <button
              onClick={() => setMobileView('list')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                mobileView === 'list'
                  ? 'bg-slate-900 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Xem danh sách ({places.length})</span>
            </button>
            <button
              onClick={() => setMobileView('map')}
              className={`flex-1 flex items-center justify-center space-x-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
                mobileView === 'map'
                  ? 'bg-orange-500 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="w-4 h-4" />
              <span>Xem bản đồ</span>
            </button>
          </div>
        </div>

        {/* Main Content: Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Filters + List (Hidden on mobile if map view active) */}
          <div
            className={`lg:col-span-5 space-y-4 ${
              mobileView === 'map' ? 'hidden lg:block' : 'block'
            }`}
          >
            <FilterBar
              search={search}
              setSearch={setSearch}
              category={category}
              setCategory={setCategory}
              city={city}
              setCity={setCity}
              minRating={minRating}
              setMinRating={setMinRating}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />

            <PlaceSidebar
              places={places}
              selectedPlace={selectedPlace}
              onSelectPlace={handleSelectPlace}
            />
          </div>

          {/* Right Column: Leaflet Interactive Map (Hidden on mobile if list view active) */}
          <div
            className={`lg:col-span-7 h-[550px] lg:h-[720px] sticky top-24 ${
              mobileView === 'list' ? 'hidden lg:block' : 'block'
            }`}
          >
            <MapView
              places={places}
              selectedPlace={selectedPlace}
              onSelectPlace={setSelectedPlace}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
