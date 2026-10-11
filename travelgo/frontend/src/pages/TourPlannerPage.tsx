import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import L from 'leaflet';
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
  Plane,
  Train,
  Bike,
  Heart,
  Share2,
  Layers,
  ArrowUpDown
} from 'lucide-react';
import { TourService } from '../services/tourService';
import { TripService } from '../services/tripService';
import { PlannerInput, GeneratedItinerary, ItineraryDay, ItineraryActivity, TourPackage } from '../types';
import { useBooking } from '../context/BookingContext';

export const TourPlannerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { openBooking } = useBooking();
  const templateTour = (location.state as any)?.templateTour as TourPackage | undefined;


  // Form State
  const [departureCity, setDepartureCity] = useState(templateTour?.departureCity || 'Hà Nội');
  const [destinationCity, setDestinationCity] = useState(templateTour?.destinationCity || 'Đà Nẵng');
  const [startDate, setStartDate] = useState('2026-10-20');
  const [endDate, setEndDate] = useState('2026-10-22');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [totalBudget, setTotalBudget] = useState(templateTour ? templateTour.priceVND * 2 : 6000000);
  const [transportation, setTransportation] = useState<'flight' | 'car' | 'train' | 'motorbike'>('car');
  const [preferences, setPreferences] = useState<string[]>(['am-thuc', 'thien-nhien']);
  const [pacing, setPacing] = useState<'relaxed' | 'balanced' | 'packed'>('balanced');

  // Generation & Result State
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<GeneratedItinerary | null>(null);
  const [selectedDayTab, setSelectedDayTab] = useState<number | 'all'>('all');
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const [isSavingTrip, setIsSavingTrip] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const linesLayerRef = useRef<L.LayerGroup | null>(null);

  const PREFERENCE_OPTIONS = [
    { id: 'bien', label: 'Du lịch biển' },
    { id: 'thien-nhien', label: 'Khám phá thiên nhiên' },
    { id: 'van-hoa', label: 'Văn hóa & Lịch sử' },
    { id: 'am-thuc', label: 'Ẩm thực' },
    { id: 'nghi-duong', label: 'Nghỉ dưỡng' },
    { id: 'check-in', label: 'Check-in chụp ảnh' },
    { id: 'phieu-luu', label: 'Phiêu lưu mạo hiểm' },
    { id: 'mua-sam', label: 'Mua sắm & Giải trí' },
  ];

  const DAY_COLORS = ['#2563eb', '#ea580c', '#059669', '#9333ea', '#db2777', '#0891b2'];

  const togglePreference = (id: string) => {
    if (preferences.includes(id)) {
      if (preferences.length > 1) {
        setPreferences(preferences.filter((p) => p !== id));
      }
    } else {
      setPreferences([...preferences, id]);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    setSaveSuccessMessage(null);

    try {
      const input: PlannerInput = {
        departureCity,
        destinationCity,
        startDate,
        endDate,
        adults,
        children,
        totalBudget,
        transportation,
        preferences,
        pacing,
      };

      const result = await TourService.planItinerary(input);
      setItinerary(result);
      setSelectedDayTab('all');
    } catch (err) {
      console.error('Failed to generate smart itinerary:', err);
      alert('Không thể tạo lịch trình. Vui lòng kiểm tra lại thông tin đầu vào.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Reorder activity up / down
  const moveActivity = (dayNumber: number, actIndex: number, direction: 'up' | 'down') => {
    if (!itinerary) return;
    const day = itinerary.days.find((d) => d.dayNumber === dayNumber);
    if (!day) return;

    const newIndex = direction === 'up' ? actIndex - 1 : actIndex + 1;
    if (newIndex < 0 || newIndex >= day.activities.length) return;

    const updatedActivities = [...day.activities];
    const temp = updatedActivities[actIndex];
    updatedActivities[actIndex] = updatedActivities[newIndex];
    updatedActivities[newIndex] = temp;

    const updatedDays = itinerary.days.map((d) =>
      d.dayNumber === dayNumber ? { ...d, activities: updatedActivities } : d
    );

    setItinerary({
      ...itinerary,
      days: updatedDays,
    });
  };

  // Delete activity
  const deleteActivity = (dayNumber: number, actId: string) => {
    if (!itinerary) return;
    const updatedDays = itinerary.days.map((d) => {
      if (d.dayNumber === dayNumber) {
        const remaining = d.activities.filter((a) => a.id !== actId);
        const dayCost = remaining.reduce((sum, a) => sum + (a.estimatedCostVND || 0), 0);
        return { ...d, activities: remaining, dayEstimatedCostVND: dayCost };
      }
      return d;
    });

    const totalEst = updatedDays.reduce((sum, d) => sum + d.dayEstimatedCostVND, 0);
    const diff = itinerary.totalBudgetUserVND - totalEst;

    setItinerary({
      ...itinerary,
      days: updatedDays,
      totalEstimatedCostVND: totalEst,
      costDifferenceVND: diff,
      budgetStatus: diff >= 0 ? 'within_budget' : 'over_budget',
    });
  };

  // Save to My Trips
  const handleSaveToMyTrips = async () => {
    if (!itinerary) return;
    setIsSavingTrip(true);
    try {
      const savedTrip = await TripService.saveTripFromPlanner(itinerary);
      setSaveSuccessMessage('Đã lưu hành trình vào Chuyến đi của tôi!');
      setTimeout(() => {
        navigate(`/my-trips/${savedTrip.id}`);
      }, 1200);
    } catch (err) {
      console.error('Failed to save trip:', err);
      alert('Không thể lưu chuyến đi. Vui lòng thử lại.');
    } finally {
      setIsSavingTrip(false);
    }
  };

  // Initialize & Update Leaflet Map when Itinerary changes
  useEffect(() => {
    if (!itinerary || !mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [16.0544, 108.2022],
        zoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
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
          html: `
            <div style="background-color: ${dayColor}; color: white; width: 28px; height: 28px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
              ${day.dayNumber}.${actIdx + 1}
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const marker = L.marker(pos, { icon: customIcon });
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; min-width: 180px;">
            <div style="font-size: 10px; font-weight: bold; color: ${dayColor}; margin-bottom: 2px;">NGÀY ${day.dayNumber} - ${act.timeSlot.toUpperCase()}</div>
            <strong style="font-size: 13px; color: #0f172a;">${act.title}</strong>
            <p style="margin: 4px 0; color: #475569; font-size: 11px;">${act.description}</p>
            <div style="font-size: 11px; font-weight: bold; color: #ea580c; margin-top: 4px;">Chi phí ước tính: ${new Intl.NumberFormat('vi-VN').format(act.estimatedCostVND)}đ</div>
          </div>
        `);

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
              Thuật toán tự động kết hợp điểm Bayesian Average, sở thích cá nhân, bán kính địa lý và ngân sách để đề xuất lịch trình nhiều ngày hoàn hảo nhất.
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
                <span>{isSavingTrip ? 'Đang lưu...' : 'Lưu hành trình này'}</span>
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

            <form onSubmit={handleGenerate} className="space-y-6">
              {/* Row 1: Departure & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Điểm khởi hành
                  </label>
                  <select
                    name="departureCity"
                    value={departureCity}
                    onChange={(e) => setDepartureCity(e.target.value)}
                    className="w-full py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium text-slate-800"
                  >
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="TP.HCM">TP. Hồ Chí Minh</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Hải Phòng">Hải Phòng</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Điểm đến khám phá
                  </label>
                  <select
                    name="destinationCity"
                    value={destinationCity}
                    onChange={(e) => setDestinationCity(e.target.value)}
                    className="w-full py-2.5 px-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-bold text-sky-800"
                  >
                    <option value="Đà Nẵng">Đà Nẵng (Biển Mỹ Khê & Bà Nà)</option>
                    <option value="Đà Lạt">Đà Lạt (Ngàn hoa & Săn mây)</option>
                    <option value="Phú Quốc">Phú Quốc (Đảo ngọc & Cano đảo)</option>
                    <option value="Sapa">Sapa (Fansipan & Thung lũng)</option>
                    <option value="Hà Nội">Hà Nội (Thủ đô ngàn năm văn hiến)</option>
                    <option value="Hội An">Hội An (Phố cổ hoa đăng)</option>
                  </select>
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
                    step="500000"
                    min="1000000"
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
                    Phương tiện di chuyển chính
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'car', label: 'Ô tô/Xe', icon: Car },
                      { id: 'flight', label: 'Máy bay', icon: Plane },
                      { id: 'train', label: 'Tàu hỏa', icon: Train },
                      { id: 'motorbike', label: 'Xe máy', icon: Bike },
                    ].map((item) => {
                      const Icon = item.icon;
                      const active = transportation === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setTransportation(item.id as any)}
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
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Nhịp độ di chuyển
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'relaxed', label: 'Thư giãn', desc: '1-2 điểm/ngày' },
                      { id: 'balanced', label: 'Cân bằng', desc: '2-3 điểm/ngày' },
                      { id: 'packed', label: 'Khám phá nhiều', desc: '4+ điểm/ngày' },
                    ].map((item) => {
                      const active = pacing === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setPacing(item.id as any)}
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
                  disabled={isGenerating}
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
                    {itinerary.daysCount} Ngày {Math.max(1, itinerary.daysCount - 1)} Đêm
                  </span>
                  <span className="text-slate-500 text-xs">
                    Khởi hành: {itinerary.departureCity} &rarr; {itinerary.destinationCity}
                  </span>
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">{itinerary.title}</h2>
                <p className="text-xs text-slate-500 mt-1">{itinerary.summary}</p>
              </div>

              {/* Budget Assessment Badge */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 min-w-[280px]">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-500">Ngân sách dự kiến:</span>
                  <span className="font-bold text-slate-800">
                    {new Intl.NumberFormat('vi-VN').format(itinerary.totalBudgetUserVND)}đ
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-slate-500">Tổng chi phí ước tính:</span>
                  <span className="font-extrabold text-orange-600">
                    {new Intl.NumberFormat('vi-VN').format(itinerary.totalEstimatedCostVND)}đ
                  </span>
                </div>

                <div
                  className={`text-[11px] p-2 rounded-lg font-medium flex items-start gap-1.5 ${
                    itinerary.budgetStatus === 'within_budget'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}
                >
                  {itinerary.budgetStatus === 'within_budget' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                  )}
                  <span>{itinerary.budgetAdvice}</span>
                </div>
              </div>
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
                          {new Intl.NumberFormat('vi-VN').format(day.dayEstimatedCostVND)}đ
                        </span>
                      </div>

                      {/* Activities in this day */}
                      <div className="p-4 space-y-3.5">
                        {day.activities.map((act, actIdx) => (
                          <div
                            key={act.id}
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

                                  {/* Transit time & aerial distance note */}
                                  {act.aerialDistanceToNextKm !== undefined && (
                                    <div className="mt-2 text-[11px] text-sky-700 bg-sky-50 px-2 py-1 rounded inline-flex items-center gap-1">
                                      <Navigation className="w-3 h-3 text-sky-500" />
                                      <span>
                                        Đến điểm kế tiếp: ~{act.aerialDistanceToNextKm.toFixed(1)} km (đường chim bay theo Haversine) • Dự kiến di chuyển ~{act.estimatedTransitMinutes} phút
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
                                    className="p-1 rounded text-rose-400 hover:text-rose-600"
                                    title="Xóa địa điểm này"
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
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs font-bold text-orange-600">
                            {new Intl.NumberFormat('vi-VN').format(itinerary.hotelSuggestion.priceFrom)}đ / đêm
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
                  <div ref={mapContainerRef} className="w-full h-[480px] z-10" />

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
                      {isSavingTrip ? 'Đang lưu...' : 'Lưu vào Chuyến đi'}
                    </button>
                    <button
                      onClick={() =>
                        openBooking({
                          serviceType: 'tour',
                          serviceId: itinerary.id,
                          serviceName: itinerary.title,
                          unitPrice: itinerary.totalEstimatedCostVND,
                        })
                      }
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold py-2.5 px-3 rounded-xl text-xs transition-all text-center"
                    >
                      Đặt các dịch vụ
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

