import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle, Compass, List, LoaderCircle, Map, RefreshCw, Sparkles } from 'lucide-react';
import { MapView } from '../components/explore/MapView';
import { FilterBar } from '../components/explore/FilterBar';
import { PlaceSidebar } from '../components/explore/PlaceSidebar';
import { PlaceService } from '../services/placeService';
import { Place } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTelemetry } from '../context/TelemetryContext';
import { RecommendationApi, RecommendationResponse } from '../services/recommendationService';
import {
  buildExploreRecommendationInput,
  recommendationFallbackMessage,
  validateDailyBudget,
} from '../utils/exploreRecommendation';

const PLACE_CATEGORIES = new Set(['all', 'attraction', 'hotel', 'restaurant']);

type RecommendationMeta = Pick<RecommendationResponse,
  'requestId' | 'consent' | 'fallback' | 'rankingContext' | 'limitations'>;

export const ExplorePage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { consent } = useTelemetry();
  const [searchParams] = useSearchParams();
  const rawInitialCategory = searchParams.get('category') || 'all';
  const initialCategory = PLACE_CATEGORIES.has(rawInitialCategory) ? rawInitialCategory : 'all';

  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(initialCategory);
  const [city, setCity] = useState('all');
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('bayesian');
  const [preferences, setPreferences] = useState<string[]>([]);
  const [budgetInput, setBudgetInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [retryToken, setRetryToken] = useState(0);
  const [recommendationMeta, setRecommendationMeta] = useState<RecommendationMeta>();
  const [mobileView, setMobileView] = useState<'list' | 'map'>('list');
  const requestSequence = useRef(0);

  const budgetValidation = useMemo(() => validateDailyBudget(budgetInput), [budgetInput]);
  const fallbackMessage = recommendationFallbackMessage(recommendationMeta?.fallback);
  const hasOneShotCriteria = preferences.length > 0 || budgetValidation.value > 0;

  useEffect(() => {
    setPreferences([]);
    setBudgetInput('');
  }, [user?.id]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    if (authLoading) return;
    if (user && !budgetValidation.valid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    const timer = window.setTimeout(async () => {
      try {
        const requestInput = buildExploreRecommendationInput({
          category,
          city,
          search,
          minRating,
          preferences: user ? preferences : [],
          dailyBudgetPerPerson: user ? budgetValidation.value : 0,
        });
        const recommendation = user
          ? await RecommendationApi.recommendPlaces(requestInput)
          : undefined;
        const data = recommendation?.items || await PlaceService.getPlaces({
          category: requestInput.filters.category,
          city: requestInput.filters.destinationCity,
          search: requestInput.filters.search,
          minRating: requestInput.filters.minRating,
          sortBy,
        });
        if (sequence !== requestSequence.current) return;

        setPlaces(data);
        setRecommendationMeta(recommendation ? {
          requestId: recommendation.requestId,
          consent: recommendation.consent,
          fallback: recommendation.fallback,
          rankingContext: recommendation.rankingContext,
          limitations: recommendation.limitations,
        } : undefined);
        setSelectedPlace((current) => data.find((place) => place.id === current?.id) || data[0] || null);
      } catch (error) {
        if (sequence !== requestSequence.current) return;
        console.error('Error fetching places:', error);
        setRecommendationMeta(undefined);
        setPlaces([]);
        setSelectedPlace(null);
        setLoadError(user
          ? 'Không thể tải danh sách gợi ý lúc này. Vui lòng kiểm tra kết nối và thử lại.'
          : 'Không thể tải danh sách địa điểm công khai lúc này. Vui lòng thử lại.');
      } finally {
        if (sequence === requestSequence.current) setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [
    category,
    city,
    search,
    minRating,
    sortBy,
    preferences,
    budgetValidation.valid,
    budgetValidation.value,
    user?.id,
    authLoading,
    consent.analyticsEnabled,
    consent.personalizationEnabled,
    retryToken,
  ]);

  const togglePreference = (value: string) => {
    setPreferences((current) => current.includes(value)
      ? current.filter((preference) => preference !== value)
      : [...current, value]);
  };

  const handleSelectPlace = (place: Place) => {
    setSelectedPlace(place);
    if (window.innerWidth < 1024) setMobileView('map');
  };

  const rankingLabel = user
    ? hasOneShotCriteria
      ? 'Gợi ý theo tiêu chí bạn vừa chọn'
      : 'Gợi ý cân bằng theo uy tín Bayesian'
    : sortBy === 'bayesian'
      ? 'Đề xuất công khai phổ biến theo Bayesian'
      : sortBy === 'priceAsc'
        ? 'Danh sách công khai theo giá từ thấp đến cao'
        : 'Danh sách công khai theo giá từ cao đến thấp';

  const publicExplanation = user
    ? undefined
    : sortBy === 'bayesian'
      ? 'Xếp hạng công khai theo độ uy tín Bayesian; chưa cá nhân hóa.'
      : 'Danh sách công khai theo giá tham khảo từ priceFrom; chưa cá nhân hóa.';

  return (
    <div className="min-h-screen bg-slate-100/70 pb-16 pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col justify-between gap-4 py-6 sm:flex-row sm:items-end">
          <div>
            <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-600">
              <Compass className="h-4 w-4" />
              <span>Khám phá thông minh</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
              Địa điểm phù hợp cho hành trình của bạn
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Chọn sở thích và ngân sách để HuGo xếp hạng Place bằng heuristic có giải thích và điểm uy tín Bayesian.
            </p>
          </div>

          <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm lg:hidden">
            <button
              type="button"
              onClick={() => setMobileView('list')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                mobileView === 'list' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="h-4 w-4" /> Danh sách ({places.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileView('map')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                mobileView === 'map' ? 'bg-orange-500 text-white shadow' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Map className="h-4 w-4" /> Bản đồ
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className={`space-y-4 lg:col-span-5 ${mobileView === 'map' ? 'hidden lg:block' : 'block'}`}>
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
              preferences={preferences}
              togglePreference={togglePreference}
              budgetInput={budgetInput}
              setBudgetInput={setBudgetInput}
              budgetError={user && !budgetValidation.valid ? budgetValidation.error : undefined}
              isAuthenticated={Boolean(user)}
              personalizationEnabled={consent.personalizationEnabled}
            />

            <section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <Sparkles className="h-4 w-4 shrink-0 text-teal-600" />
                  <div className="min-w-0">
                    <p data-testid="explore-ranking-mode" className="truncate text-xs font-extrabold text-slate-800">{rankingLabel}</p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {user ? 'Giữ nguyên thứ tự rank do backend trả về.' : 'Không tạo requestId hoặc impression recommendation.'}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
                  {places.length} kết quả
                </span>
              </div>
            </section>

            {fallbackMessage ? (
              <div data-testid="recommendation-fallback" role="status" className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-5 text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{fallbackMessage}</span>
              </div>
            ) : null}

            {loadError ? (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <p>{loadError}</p>
                <button
                  type="button"
                  data-testid="explore-retry"
                  onClick={() => setRetryToken((value) => value + 1)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Thử lại
                </button>
              </div>
            ) : null}

            {loading ? (
              <div data-testid="explore-loading" role="status" className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                <LoaderCircle className="h-4 w-4 animate-spin text-teal-600" /> Đang lọc và xếp hạng gợi ý...
              </div>
            ) : null}

            <PlaceSidebar
              places={places}
              selectedPlace={selectedPlace}
              onSelectPlace={handleSelectPlace}
              recommendationRequestId={recommendationMeta?.requestId}
              trackingEnabled={Boolean(recommendationMeta?.consent.analytics)}
              loading={loading}
              publicExplanation={publicExplanation}
            />
          </div>

          <div className={`sticky top-24 h-[550px] lg:col-span-7 lg:h-[720px] ${mobileView === 'list' ? 'hidden lg:block' : 'block'}`}>
            <MapView places={places} selectedPlace={selectedPlace} onSelectPlace={setSelectedPlace} />
          </div>
        </main>
      </div>
    </div>
  );
};
