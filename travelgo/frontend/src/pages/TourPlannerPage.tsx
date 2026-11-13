import {LocationCombobox} from '../components/common/LocationCombobox';
import { PlannerBudgetNotice } from '../components/common/PlannerBudgetNotice';
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import L from 'leaflet';
import { GoogleMap } from '../components/maps/GoogleMap';
import { googleMapsSelected } from '../utils/googleMapsLoader';
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  DollarSign,
  Users,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bed,
  Utensils,
  Camera,
  Car,
  Bike,
  Heart,
  Share2,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { TourService } from '../services/tourService';
import { TripService } from '../services/tripService';
import { PlaceService } from '../services/placeService';
import { PlannerInput, GeneratedItinerary, ItineraryDay, ItineraryActivity, Place, TourPackage } from '../types';
import { useAuth } from '../context/AuthContext';
import { PREFERENCE_OPTIONS, preferenceLabel } from '../constants/travelPreferences';
import { isMandatoryPlannerActivity, movePlannerActivity, removePlannerActivity } from '../utils/plannerCosts';
import { BALANCED_PACING_DESCRIPTION, PLANNER_TRANSPORT_OPTIONS, initialPlannerModes, validatePlannerModes } from '../utils/plannerModes';
import { plannerPopup, roundMapMarker } from '../utils/mapPopup';

export const TourPlannerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const templateTour = (location.state as any)?.templateTour as TourPackage | undefined;
  const mandatoryPlaceId = searchParams.get('mandatoryPlaceId');


  // Form State
  const [departureCity, setDepartureCity] = useState(templateTour?.departureCity || 'Hà Nội');
  const [destinationCity, setDestinationCity] = useState(templateTour?.destinationCity || 'Đà Nẵng');
  const [startDate, setStartDate] = useState('2026-10-20');
  const [endDate, setEndDate] = useState('2026-10-22');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [totalBudget, setTotalBudget] = useState(templateTour ? templateTour.priceVND * 2 : 6000000);
  const [transportation, setTransportation] = useState<unknown>(() => initialPlannerModes(templateTour).transportation);
  const [preferences, setPreferences] = useState<string[]>([]);
  const [pacing, setPacing] = useState<unknown>(() => initialPlannerModes(templateTour).pacing);
  const modeSelection = validatePlannerModes(pacing, transportation);

  // Generation & Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState<number | 'all'>('all');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [mandatoryPlace, setMandatoryPlace] = useState<Place | null>(null);
  const [mandatoryPlaceLoading, setMandatoryPlaceLoading] = useState(Boolean(mandatoryPlaceId));
  const [mandatoryPlaceError, setMandatoryPlaceError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);

  const DAY_COLORS = ['#2563eb', '#ea580c', '#059669', '#9333ea', '#db2777', '#0891b2'];

  useEffect(() => {
    let active = true;
    if (!mandatoryPlaceId) {
      setMandatoryPlace(null);
      setMandatoryPlaceError(null);
      setMandatoryPlaceLoading(false);
      return () => { active = false; };
    }
    if (authLoading) return () => { active = false; };
    if (!user) {
      navigate('/login', {
        replace: true,
        state: { from: `/tour-planner?mandatoryPlaceId=${encodeURIComponent(mandatoryPlaceId)}` },
      });
      return () => { active = false; };
    }

    setMandatoryPlaceLoading(true);
    setMandatoryPlaceError(null);
    PlaceService.getPlaceById(mandatoryPlaceId)
      .then((place) => {
        if (!active) return;
        setMandatoryPlace(place);
        setDestinationCity(place.city || place.province);
      })
      .catch((error: any) => {
        if (!active) return;
        setMandatoryPlace(null);
        setMandatoryPlaceError(error?.response?.data?.message || 'Không thể tải địa điểm đã chọn. Hãy bỏ chọn và thử lại.');
      })
      .finally(() => {
        if (active) setMandatoryPlaceLoading(false);
      });
    return () => { active = false; };
  }, [authLoading, mandatoryPlaceId, navigate, user]);

  const removeMandatoryPlace = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('mandatoryPlaceId');
    setSearchParams(next, { replace: true });
    setMandatoryPlace(null);
    setMandatoryPlaceError(null);
  };

  const togglePreference = (id: string) => {
    if (preferences.includes(id)) {
      setPreferences(preferences.filter((p) => p !== id));
    } else {
      setPreferences([...preferences, id]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modeSelection.valid === false) {
      setGenerationError(modeSelection.message);
      return;
    }
    if (mandatoryPlaceId && !mandatoryPlace) {
      setGenerationError('Địa điểm đã chọn chưa sẵn sàng. Hãy bỏ chọn hoặc chờ tải xong trước khi tạo lịch trình.');
      return;
    }
    setItinerary(null);
    setIsGenerating(true);
    setSaveSuccessMessage(null);
    setGenerationError(null);
    setSaveError(null);

    try {
      const input: PlannerInput = {
        departureCity,
        destinationCity,
        startDate,
        endDate,
        adults,
        children,
        totalBudget,
        transportation: modeSelection.transportation,
        preferences,
        pacing: modeSelection.pacing,
        mandatoryPlaceIds: mandatoryPlace ? [mandatoryPlace.id] : [],
      };

      const result = await TourService.planItinerary(input);
      setItinerary(result);
      setSelectedDayTab('all');
    } catch (err: any) {
      console.error('Failed to generate smart itinerary:', err);
      setGenerationError((err?.code ?? err?.response?.data?.code) === 'NO_SIGHTSEEING_FOR_DESTINATION'
        ? '\u0043h\u01b0a \u0111\u1ee7 d\u1eef li\u1ec7u \u0111\u1ec3 t\u1ea1o l\u1ecbch tr\u00ecnh tham quan t\u1ea1i \u0111i\u1ec3m \u0111\u1ebfn. H\u00e3y s\u1eeda y\u00eau c\u1ea7u ho\u1eb7c ch\u1ecdn \u0111i\u1ec3m \u0111\u1ebfn kh\u00e1c r\u1ed3i t\u1ea1o l\u1ea1i.'
        : err?.response?.data?.message || err?.message || 'Không thể tạo lịch trình. Vui lòng kiểm tra lại thông tin đầu vào.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reorder activity up / down
  const moveActivity = (dayNumber: number, actIndex: number, direction: 'up' | 'down') => {
    if (!itinerary) return;
    setItinerary(movePlannerActivity(itinerary, dayNumber, actIndex, direction));
  };

  // Delete activity
  const deleteActivity = (dayNumber: number, actId: string) => {
    if (!itinerary) return;
    setItinerary(removePlannerActivity(itinerary, dayNumber, actId));
  };

  // Save to My Trips
  const handleSaveToMyTrips = async () => {
    if (!itinerary) return;
    if (!user) {
      navigate('/login', { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    setIsSavingTrip(true);
    setSaveError(null);
    try {
      const savedTrip = await TripService.saveTripFromPlanner(itinerary);
      setSaveSuccessMessage('Đã lưu hành trình vào Chuyến đi của tôi!');
      setTimeout(() => {
        navigate(`/my-trips/${savedTrip.id}`);
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save trip:', err);
      setSaveError(err?.response?.data?.message || 'Không thể lưu chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Initialize & Update Leaflet Map when Itinerary changes
  useEffect(() => {
    if (googleMapsSelected() || !itinerary || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [16.0544, 108.2022],
        zoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://a.tile.openstreetmap.de/{z}/{x}/{y}.png', {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Tiles: <a href="https://openstreetmap.de/">OpenStreetMap Deutschland</a>',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      linesLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    const linesGroup = linesLayerRef.current;

    if (!map || !markersGroup || !linesGroup) return;

    markersGroup.clearLayers();
    linesGroup.clearLayers();

    const allCoords: [number, number][] = [];

    // Filter days based on selected tab
    const daysToRender =
      selectedDayTab === 'all'
        ? itinerary.days
        : itinerary.days.filter((d) => d.dayNumber === selectedDayTab);

    daysToRender.forEach((day) => {
      const dayColor = DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length];
      const dayCoords: [number, number][] = [];

      day.activities.forEach((act, actIdx) => {
        if (!act.latitude || !act.longitude) return;

        const pos: [number, number] = [act.latitude, act.longitude];
        dayCoords.push(pos);
        allCoords.push(pos);

        const customIcon = L.divIcon({
          className: 'custom-itinerary-marker',
          html: roundMapMarker(`${day.dayNumber}.${actIdx + 1}`, dayColor, 28),
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker(pos, { icon: customIcon });
        marker.bindPopup(plannerPopup(day.dayNumber, act, dayColor));

        marker.on('click', () => {
          setSelectedActivityId(act.id);
        });

        markersGroup.addLayer(marker);
      });

      // Connect day stops with colored polyline
      if (dayCoords.length > 1) {
        const polyline = L.polyline(dayCoords, {
          color: dayColor,
          weight: 3.5,
          opacity: 0.8,
          dashArray: '6, 6',
        });
        linesGroup.addLayer(polyline);
      }
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [itinerary, selectedDayTab]);

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20">
      {/* Top Header Banner */}
      <div className="bg-slate-900 text-white py-8 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-orange-500/20 text-orange-400 border border-orange-500/30 px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Recommendation & GIS Clustering</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              HuGo Tour Planner – Tạo Lịch Trình Cá Nhân Hóa
            </h1>
            <p className="mt-1 text-slate-400 text-xs sm:text-sm max-w-2xl">
              Hệ thống kết hợp Bayesian Average, sở thích, ngân sách và phân cụm Haversine đường chim bay. Đây là gợi ý tham khảo, không phải tối ưu tuyến đường bộ thực tế.
            </p>
          </div>

          {itinerary && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setItinerary(null)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Nhập lại cấu hình
              </button>
              <button
                onClick={handleSaveToMyTrips}
                disabled={isSavingTrip}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{isSavingTrip ? 'Đang lưu...' : (itinerary.totalEstimatedCostVND > itinerary.totalBudgetUserVND ? 'Lưu phương án tham khảo' : 'Lưu hành trình này')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {saveSuccessMessage && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-2xl mb-6 flex items-center justify-between text-sm shadow-sm animate-fade-in">
            <span className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {saveSuccessMessage}
            </span>
            <span className="text-xs text-emerald-600">Đang chuyển sang Chuyến đi của tôi...</span>
          </div>
        )}
        {saveError && (
          <div role="alert" className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl mb-6 text-sm font-semibold">
            {saveError}
          </div>
        )}
        {generationError && (
          <div role="alert" data-testid="planner-generation-error" className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl mb-6 text-sm font-semibold">
            {generationError}
          </div>
        )}

        {!itinerary ? (
          /* STEP 1: PLANNER INPUT FORM */
          <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200/90 p-6 sm:p-10">
            <div className="text-center max-w-xl mx-auto mb-8">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                Bạn muốn đi đâu và trải nghiệm thế nào?
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1.5">
                Nhập thông tin cơ bản, hệ thống sẽ tự động tổng hợp các điểm tham quan, ẩm thực và nơi lưu trú phù hợp nhất.
              </p>
            </div>

            {(mandatoryPlaceLoading || mandatoryPlace || mandatoryPlaceError) && (
              <div data-testid="mandatory-place-panel" className="mb-6 rounded-2xl border border-orange-200 bg-orange-50/70 p-4">
                {mandatoryPlaceLoading ? (
                  <div className="flex items-center gap-3 text-sm font-semibold text-orange-800">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    Đang xác minh địa điểm đã chọn từ máy chủ…
                  </div>
                ) : mandatoryPlace ? (
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <img src={mandatoryPlace.heroImage} alt={mandatoryPlace.name} className="h-20 w-full rounded-xl object-cover sm:w-28" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-extrabold uppercase tracking-wider text-orange-700">Địa điểm bắt buộc</p>
                      <h3 className="truncate text-base font-extrabold text-slate-900">{mandatoryPlace.name}</h3>
                      <p className="mt-1 text-xs text-slate-600">
                        {mandatoryPlace.city || mandatoryPlace.province} · {mandatoryPlace.category} · Nguồn giá và giả định sẽ ghi trong dự toán.
                      </p>
                    </div>
                    <button
                      type="button"
                      data-testid="remove-mandatory-place"
                      onClick={removeMandatoryPlace}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Bỏ chọn
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p role="alert" className="text-sm font-semibold text-rose-700">{mandatoryPlaceError}</p>
                    <button type="button" onClick={removeMandatoryPlace} className="rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 border border-slate-200">
                      Bỏ địa điểm lỗi
                    </button>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Row 1: Departure & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Điểm khởi hành
                  </label>
                  <LocationCombobox label="Điểm khởi hành" value={departureCity} onChange={setDepartureCity} allowAll={false}/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Điểm đến khám phá
                  </label>
                  <LocationCombobox label="Điểm đến khám phá" value={destinationCity} onChange={setDestinationCity} allowAll={false}/>
                </div>
              </div>

              {/* Row 2: Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Ngày khởi hành
                  </label>
                  <input
                    name="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> Ngày kết thúc
                  </label>
                  <input
                    name="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                </div>
              </div>

              {/* Row 3: Passengers & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-500" /> Người lớn
                  </label>
                  <input
                    name="adults"
                    type="number"
                    min="1"
                    max="20"
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Trẻ em
                  </label>
                  <input
                    name="children"
                    type="number"
                    min="0"
                    max="10"
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-500" /> Tổng ngân sách (VNĐ)
                  </label>
                  <input
                    name="totalBudget"
                    type="number"
                    step="any"
                    min="0.01"
                    value={totalBudget}
                    onChange={(e) => setTotalBudget(Number(e.target.value))}
                    className="w-full py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold text-orange-600"
                  />
                </div>
              </div>

              {/* Row 4: Transportation & Pacing */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Phương tiện ước lượng giữa các điểm
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PLANNER_TRANSPORT_OPTIONS.map((item) => {
                      const Icon = item.value === 'car' ? Car : Bike;
                      const active = transportation === item.value;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setTransportation(item.value)}
                          aria-pressed={active}
                          data-testid={`planner-transport-${item.value}`}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1 ${
                            active
                              ? 'border-sky-600 bg-sky-50 text-sky-800 font-bold shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-[11px]">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-xs text-slate-500">ETA là ước lượng từ khoảng cách Haversine. Chưa hỗ trợ máy bay/tàu hoặc tính chặng và chi phí liên tỉnh.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Nhịp độ lịch trình mới
                  </label>
                  <div>
                    {[
                      { id: 'balanced', label: 'Cân bằng', desc: BALANCED_PACING_DESCRIPTION },
                    ].map((item) => {
                      const active = pacing === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPacing(item.id)}
                          aria-pressed={active}
                          data-testid="planner-pacing-balanced"
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center ${
                            active
                              ? 'border-orange-500 bg-orange-50 text-orange-800 font-bold shadow-sm'
                              : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <span className="text-xs">{item.label}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {modeSelection.valid === false && (
                <p role="alert" data-testid="planner-legacy-mode-warning" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">
                  {modeSelection.message} Dữ liệu gốc vẫn được giữ nguyên; cần chọn lại trước khi tạo lịch mới.
                </p>
              )}

              {/* Preferences Multi-Select */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Sở thích du lịch của bạn (chọn nhiều để cá nhân hóa)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PREFERENCE_OPTIONS.map((pref) => {
                    const isSelected = preferences.includes(pref.id);
                    return (
                      <button
                        key={pref.id}
                        type="button"
                        data-testid={`planner-preference-${pref.id}`}
                        aria-pressed={isSelected}
                        onClick={() => togglePreference(pref.id)}
                        className={`text-xs px-3.5 py-2 rounded-xl border font-medium transition-all flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-orange-400" />}
                        <span>{pref.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit CTA */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isGenerating || mandatoryPlaceLoading || modeSelection.valid === false}
                  className="w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg transition-all text-sm flex items-center justify-center gap-2 group"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Thuật toán đang phân cụm địa lý và xếp hạng Bayesian...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
                      <span>Tạo lịch trình cho tôi</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 2: GENERATED RESULTS 2-COLUMN VIEW */
          <div className="space-y-6">
            {/* Top Itinerary Metrics Bar */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-lg">
                    {itinerary.daysCount} Ngày {itinerary.nightsCount ?? Math.max(0, itinerary.daysCount - 1)} Đêm
                  </span>
                  <span className="text-slate-500 text-xs">
                    Khởi hành: {itinerary.departureCity} &rarr; {itinerary.destinationCity}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">{itinerary.title}</h2>
                <p className="text-xs text-slate-500 mt-1">{itinerary.summary}</p>
                <p className="text-xs text-slate-600 mt-2">Chi phí VND cho cả nhóm; lưu trú tính riêng theo số đêm, không phải báo giá.</p>
                {itinerary.costAssumptions?.length ? (
                  <details className="mt-2 text-xs text-slate-600">
                    <summary className="cursor-pointer font-semibold">Giả định chi phí và khoản chưa bao gồm</summary>
                    <ul className="mt-2 list-disc pl-4 space-y-1">
                      {itinerary.costAssumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                    </ul>
                  </details>
                ) : null}
                <div data-testid="generated-preferences" className="flex flex-wrap gap-1.5 mt-3">
                  {itinerary.preferences.length > 0 ? itinerary.preferences.map((preference) => (
                    <span key={preference} className="text-[11px] bg-orange-50 text-orange-800 border border-orange-200 px-2.5 py-1 rounded-full font-semibold">
                      {preferenceLabel(preference)}
                    </span>
                  )) : (
                    <span className="text-[11px] text-slate-500">Bạn chưa chọn sở thích cá nhân.</span>
                  )}
                </div>
              </div>

              <PlannerBudgetNotice budget={itinerary.totalBudgetUserVND} estimate={itinerary.totalEstimatedCostVND}
                onRevise={() => setItinerary(null)} />
            </div>

            {/* Split Grid: Left Details & Right Interactive Map */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* LEFT COLUMN: 7 cols */}
              <div className="lg:col-span-7 space-y-6">
                {/* Day Filter Tabs */}
                <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    onClick={() => setSelectedDayTab('all')}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                      selectedDayTab === 'all'
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Tất cả các ngày ({itinerary.days.length})
                  </button>
                  {itinerary.days.map((day) => (
                    <button
                      key={day.dayNumber}
                      onClick={() => setSelectedDayTab(day.dayNumber)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        selectedDayTab === day.dayNumber
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length] }}
                      />
                      <span>Ngày {day.dayNumber}</span>
                    </button>
                  ))}
                </div>

                {/* Day Activities List */}
                {itinerary.days
                  .filter((d) => selectedDayTab === 'all' || d.dayNumber === selectedDayTab)
                  .map((day) => (
                    <div
                      key={day.dayNumber}
                      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                    >
                      {/* Day Header */}
                      <div className="bg-slate-50 px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-6 h-6 rounded-lg text-white font-extrabold text-xs flex items-center justify-center shadow-xs"
                            style={{ backgroundColor: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length] }}
                          >
                            {day.dayNumber}
                          </span>
                          <h3 className="font-bold text-slate-800 text-sm">{day.themeTitle}</h3>
                        </div>
                        <span className="text-xs font-semibold text-orange-600">
                          {new Intl.NumberFormat('vi-VN').format(day.dayEstimatedCostVND)}đ / nhóm
                        </span>
                      </div>

                      {/* Activities in this day */}
                      <div className="p-4 space-y-3.5">
                        {(day.lodgingNights ?? 0) > 0 && (
                          <p className="text-xs text-slate-600" data-testid="day-lodging-cost">
                            Đã gồm lưu trú {day.lodgingNights} đêm: {new Intl.NumberFormat('vi-VN').format(day.lodgingEstimatedCostVND ?? 0)}đ / nhóm (ước tính 1 phòng).
                            {day.lodgingCostSource && <span className="block">{day.lodgingCostSource}</span>}
                          </p>
                        )}
                        {day.activities.map((act, actIdx) => (
                          <div
                            key={act.id}
                            data-testid="itinerary-activity"
                            data-place-id={act.placeId || ''}
                            className={`p-3.5 rounded-xl border transition-all ${
                              selectedActivityId === act.id
                                ? 'border-sky-500 bg-sky-50/50 shadow-sm'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start space-x-3">
                                <span
                                  className="w-7 h-7 rounded-full text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5"
                                  style={{ backgroundColor: DAY_COLORS[(day.dayNumber - 1) % DAY_COLORS.length] }}
                                >
                                  {actIdx + 1}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                      {act.timeSlot}
                                    </span>
                                    {act.recommendationReason && (
                                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded border border-emerald-200">
                                        {act.recommendationReason}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="font-bold text-slate-900 text-sm">{act.title}</h4>
                                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.description}</p>
                                  {act.costSource && <p className="text-xs text-slate-500 mt-1" data-testid="activity-cost-source">{act.costSource}</p>}

                                  {/* Transit time & aerial distance note */}
                                  {act.aerialDistanceToNextKm !== undefined && (
                                    <div className="mt-2 text-[11px] text-sky-700 bg-sky-50 px-2 py-1 rounded inline-flex items-center gap-1">
                                      <Navigation className="w-3 h-3 text-sky-500" />
                                      <span>
                                        Đến điểm kế tiếp: ~{act.aerialDistanceToNextKm.toFixed(1)} km đường chim bay (Haversine) • ETA giữa các điểm ~{act.estimatedTransitMinutes} phút là ước lượng từ khoảng cách Haversine, không phải tuyến đường bộ hoặc thời gian thực.
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Price & Reorder Buttons */}
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                <span className="text-xs font-bold text-slate-800">
                                  {new Intl.NumberFormat('vi-VN').format(act.estimatedCostVND)}đ
                                </span>
                                <div className="flex items-center gap-1 mt-1">
                                  <button
                                    onClick={() => moveActivity(day.dayNumber, actIdx, 'up')}
                                    disabled={actIdx === 0}
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                    title="Di chuyển lên"
                                  >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => moveActivity(day.dayNumber, actIdx, 'down')}
                                    disabled={actIdx === day.activities.length - 1}
                                    className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                                    title="Di chuyển xuống"
                                  >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteActivity(day.dayNumber, act.id)}
                                    disabled={isMandatoryPlannerActivity(act) || Boolean(mandatoryPlace && act.placeId === mandatoryPlace.id)}
                                    className="p-1 rounded text-rose-400 hover:text-rose-600"
                                    title={mandatoryPlace && act.placeId === mandatoryPlace.id
                                      ? 'Địa điểm bắt buộc; quay lại cấu hình và bỏ chọn để xóa.'
                                      : 'Xóa địa điểm này'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                {/* Suggested Hotel Lodging Card */}
                {itinerary.hotelSuggestion && (
                  <div className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bed className="w-4 h-4 text-indigo-600" />
                        <h3 className="font-bold text-slate-800 text-sm">Gợi ý khách sạn lưu trú phù hợp</h3>
                      </div>
                      <span className="text-xs text-indigo-600 font-semibold">
                        {itinerary.hotelSuggestion.city}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <img
                        src={itinerary.hotelSuggestion.heroImage}
                        alt={itinerary.hotelSuggestion.name}
                        className="w-full sm:w-28 h-20 object-cover rounded-xl"
                      />
                      <div className="flex-1">
                        <h4 className="font-bold text-slate-900 text-sm">{itinerary.hotelSuggestion.name}</h4>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {itinerary.hotelSuggestion.address}
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span data-testid="hotel-estimate-source" className="text-xs text-slate-600">
                            {(itinerary.nightsCount ?? Math.max(0, itinerary.daysCount - 1)) > 0
                              ? itinerary.days.find((day) => (day.lodgingNights ?? 0) > 0)?.lodgingCostSource || 'Ước tính một phòng/nhóm/đêm; xem lưu trú từng ngày, chưa xác minh giá.'
                              : 'Chuyến đi 0 đêm: khách sạn chỉ để tham khảo, không tính phí lưu trú.'}
                          </span>
                          <span className="text-xs text-emerald-600 font-medium">
                            Bayesian Score: {itinerary.hotelSuggestion.bayesianRating.toFixed(2)}★
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: 5 cols Interactive Leaflet Map */}
              <div className="lg:col-span-5 sticky top-24 space-y-4">
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-sky-600" />
                      <span className="text-xs font-bold text-slate-800">
                        Bản đồ hành trình & Tuyến đường GIS
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500">Màu sắc theo từng ngày</span>
                  </div>

                  {/* Leaflet Map Div */}
                  {googleMapsSelected() ? <GoogleMap height={480} points={itinerary.days.filter(d=>selectedDayTab==='all'||d.dayNumber===selectedDayTab).flatMap(d=>d.activities.map(a=>({id:a.id,name:a.title,latitude:a.latitude,longitude:a.longitude})))} selectedId={selectedActivityId || undefined} onSelect={setSelectedActivityId}/> : <div ref={mapContainerRef} className="w-full z-10" style={{ height: 480 }} />}

                  {/* Map Legend */}
                  <div className="p-3 bg-white border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="font-semibold text-[11px] text-slate-400">Chú giải:</span>
                    {itinerary.days.map((d) => (
                      <div key={d.dayNumber} className="flex items-center gap-1.5">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: DAY_COLORS[(d.dayNumber - 1) % DAY_COLORS.length] }}
                        />
                        <span className="text-[11px]">Ngày {d.dayNumber}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action Card */}
                <div className="bg-gradient-to-r from-sky-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md">
                  <h4 className="font-bold text-sm mb-1">Đã hài lòng với lịch trình này?</h4>
                  <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                    Lưu vào tài khoản để theo dõi thời gian thực, check-in từng địa điểm khi đi du lịch và tự động chuyển thành bài viết Blog!
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleSaveToMyTrips}
                      disabled={isSavingTrip}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition-all text-center"
                    >
                      {isSavingTrip ? 'Đang lưu...' : (itinerary.totalEstimatedCostVND > itinerary.totalBudgetUserVND ? 'Lưu phương án tham khảo' : 'Lưu vào Chuyến đi')}
                    </button>
                    <button
                      onClick={() => navigate('/tours')}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-2.5 px-3 rounded-xl text-xs transition-all text-center"
                    >
                      Chọn tour có thể đặt
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

