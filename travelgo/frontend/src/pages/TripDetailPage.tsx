import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import {
  Compass,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  CheckCircle2,
  Navigation,
  FileText,
  Share2,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Flag,
  PenTool,
  Check,
  Send
} from 'lucide-react';
import { TripService } from '../services/tripService';
import { TripSession, TripCheckin, ItineraryDay, ItineraryActivity } from '../types';
import { PREFERENCE_OPTIONS } from '../constants/travelPreferences';

export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);
  const [currentGps, setCurrentGps] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [checkinNotes, setCheckinNotes] = useState<{ [actId: string]: string }>({});
  const [isConvertingToBlog, setIsConvertingToBlog] = useState(false);
  const [preferenceDraft, setPreferenceDraft] = useState<string[]>([]);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (id) {
      fetchTrip(id);
    }
  }, [id]);

  const fetchTrip = async (tripId: string) => {
    setLoading(true);
    try {
      const data = await TripService.getTripById(tripId);
      setTrip(data);
      setPreferenceDraft(data.preferences || []);
    } catch (err) {
      console.error('Failed to load trip details:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (preference: string) => {
    setPreferenceMessage(null);
    setPreferenceDraft((current) => current.includes(preference)
      ? current.filter((item) => item !== preference)
      : [...current, preference]);
  };

  const savePreferences = async (nextPreferences = preferenceDraft) => {
    if (!trip) return;
    setIsSavingPreferences(true);
    setPreferenceMessage(null);
    try {
      const updated = await TripService.updateTrip(trip.id, { preferences: nextPreferences });
      setTrip(updated);
      setPreferenceDraft(updated.preferences || []);
      setPreferenceMessage(nextPreferences.length > 0 ? 'Đã lưu sở thích.' : 'Đã xóa toàn bộ sở thích.');
    } catch (err) {
      console.error('Failed to update trip preferences:', err);
      setPreferenceMessage('Không thể cập nhật sở thích.');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const clearPreferences = async () => {
    setPreferenceDraft([]);
    await savePreferences([]);
  };

  // Request browser Geolocation
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setGpsError('Trình duyệt của bạn không hỗ trợ Geolocation API.');
      return;
    }

    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setGpsLoading(false);
      },
      (err) => {
        console.warn('Geolocation denied or unavailable:', err);
        setGpsError('Không thể lấy vị trí GPS (người dùng từ chối hoặc thiết bị không hỗ trợ). Bạn vẫn có thể check-in thủ công bình thường!');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Perform Check-in
  const handleCheckin = async (act: ItineraryActivity) => {
    if (!trip) return;
    const note = checkinNotes[act.id] || '';

    try {
      const res = await TripService.checkinPlace(
        trip.id,
        act.placeId || act.id,
        act.title,
        currentGps || undefined,
        note || undefined
      );

      if (res.success && res.trip) {
        setTrip(res.trip);
      }
    } catch (err) {
      console.error('Checkin failed:', err);
      alert('Không thể hoàn thành check-in. Vui lòng thử lại.');
    }
  };

  // Status transitions
  const handleStartTrip = async () => {
    if (!trip) return;
    try {
      const updated = await TripService.updateTrip(trip.id, { status: 'active' });
      if (updated) setTrip(updated);
    } catch (err) {
      console.error('Failed to start trip:', err);
    }
  };

  const handleCompleteTrip = async () => {
    if (!trip) return;
    try {
      const updated = await TripService.completeTrip(trip.id);
      if (updated) setTrip(updated);
    } catch (err) {
      console.error('Failed to complete trip:', err);
    }
  };

  // Convert Trip to Blog Draft
  const handleConvertToBlog = async () => {
    if (!trip) return;
    setIsConvertingToBlog(true);
    try {
      const result = await TripService.convertToBlogDraft(trip.id);
      if (result.success && result.blogDraft) {
        navigate('/blog/create', { state: { prefilledDraft: result.blogDraft } });
      } else {
        alert(result.message || 'Không thể tạo bản nháp Blog.');
      }
    } catch (err) {
      console.error('Failed to convert to blog:', err);
      alert('Không thể chuyển đổi hành trình sang Blog.');
    } finally {
      setIsConvertingToBlog(false);
    }
  };

  // Map effect
  useEffect(() => {
    if (!trip || !mapContainerRef.current) return;

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
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    const markersGroup = markersLayerRef.current;
    if (!map || !markersGroup) return;

    markersGroup.clearLayers();
    const allCoords: [number, number][] = [];

    trip.days.forEach((day) => {
      day.activities.forEach((act) => {
        if (!act.latitude || !act.longitude) return;

        const pos: [number, number] = [act.latitude, act.longitude];
        allCoords.push(pos);

        const isChecked = trip.checkins.some(
          (c) => c.placeId === (act.placeId || act.id) || c.placeName === act.title
        );

        const customIcon = L.divIcon({
          className: 'custom-checkin-marker',
          html: `
            <div style="background-color: ${isChecked ? '#10b981' : '#0284c7'}; color: white; width: 30px; height: 30px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);">
              ${isChecked ? '✓' : `N${day.dayNumber}`}
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker(pos, { icon: customIcon });
        marker.bindPopup(`
          <div style="font-size: 12px; font-family: inherit;">
            <div style="font-weight: bold; color: ${isChecked ? '#10b981' : '#0284c7'};">
              ${isChecked ? '✓ ĐÃ GHÉ THĂM' : 'ĐIỂM DỰ KIẾN'}
            </div>
            <strong>${act.title}</strong>
            <p style="margin: 4px 0; color: #64748b; font-size: 11px;">${act.description}</p>
          </div>
        `);

        markersGroup.addLayer(marker);
      });
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [trip]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Đang tải chi tiết hành trình HuGo...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28 pb-16 text-center">
        <div className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy chuyến đi</h2>
          <Link to="/my-trips" className="bg-sky-600 text-white font-semibold px-5 py-2.5 rounded-xl text-sm inline-block">
            Quay lại Chuyến đi của tôi
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20 pb-20">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <Link to="/my-trips" className="hover:text-sky-600 flex items-center gap-1">
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Chuyến đi của tôi</span>
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-800 font-medium truncate max-w-xs">{trip.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Main Header Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-500" />
                  {trip.destinationCity}
                </span>
                <span className="text-xs bg-sky-100 text-sky-800 font-semibold px-3 py-1 rounded-full">
                  {trip.daysCount} Ngày {Math.max(1, trip.daysCount - 1)} Đêm
                </span>
                <span className="text-xs text-slate-500">
                  {trip.startDate} &rarr; {trip.endDate}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {trip.title}
              </h1>
            </div>

            {/* Status & Control Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {trip.status === 'upcoming' && (
                <button
                  onClick={handleStartTrip}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  <span>Bắt đầu chuyến đi</span>
                </button>
              )}

              {trip.status === 'active' && (
                <button
                  onClick={handleCompleteTrip}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hoàn thành chuyến đi</span>
                </button>
              )}

              <button
                onClick={handleConvertToBlog}
                disabled={isConvertingToBlog}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
              >
                <PenTool className="w-4 h-4" />
                <span>{isConvertingToBlog ? 'Đang tạo bản nháp...' : 'Chuyển thành bài Blog'}</span>
              </button>
            </div>
          </div>

          <div data-testid="trip-preferences" className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-slate-900">Sở thích bạn đã cung cấp</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Chỉ các lựa chọn bạn chủ động đánh dấu được lưu cùng chuyến đi.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  data-testid="save-trip-preferences"
                  onClick={() => savePreferences()}
                  disabled={isSavingPreferences}
                  className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl"
                >
                  {isSavingPreferences ? 'Đang lưu...' : 'Lưu sở thích'}
                </button>
                <button
                  type="button"
                  data-testid="clear-trip-preferences"
                  onClick={clearPreferences}
                  disabled={isSavingPreferences || preferenceDraft.length === 0}
                  className="bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl"
                >
                  Xóa tất cả
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {PREFERENCE_OPTIONS.map((preference) => {
                const selected = preferenceDraft.includes(preference.id);
                return (
                  <button
                    key={preference.id}
                    type="button"
                    data-testid={`trip-preference-${preference.id}`}
                    aria-pressed={selected}
                    onClick={() => togglePreference(preference.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-colors ${selected
                      ? 'bg-orange-50 text-orange-800 border-orange-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                  >
                    {preference.label}
                  </button>
                );
              })}
            </div>
            {preferenceDraft.length === 0 && (
              <p data-testid="empty-trip-preferences" className="text-xs text-slate-500 mt-3">
                Chưa có sở thích nào được lưu. Các Trip cũ vẫn hoạt động bình thường.
              </p>
            )}
            {preferenceMessage && (
              <p role="status" className="text-xs font-semibold text-emerald-700 mt-3">{preferenceMessage}</p>
            )}
          </div>

          {/* Progress Bar & Geolocation Status */}
          <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-8">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">
                  Tiến độ hoàn thành: {trip.checkins.length} điểm đã check-in
                </span>
                <span className="font-extrabold text-emerald-600 text-sm">{trip.progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${trip.progressPercent}%` }}
                />
              </div>
            </div>

            {/* GPS Tool */}
            <div className="md:col-span-4 bg-slate-50 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-sky-600" />
                  <span className="text-xs font-bold text-slate-700">GPS Tùy chọn</span>
                </div>
                <button
                  onClick={requestCurrentLocation}
                  disabled={gpsLoading}
                  className="bg-white hover:bg-slate-100 text-sky-700 border border-slate-200 font-semibold text-xs px-2.5 py-1 rounded-lg transition-colors"
                >
                  {gpsLoading ? 'Đang dò GPS...' : currentGps ? 'Đã lấy tọa độ' : 'Lấy vị trí'}
                </button>
              </div>
              {currentGps && (
                <div className="text-[11px] text-emerald-700 font-medium mt-1">
                  Đã định vị: {currentGps.latitude.toFixed(4)}, {currentGps.longitude.toFixed(4)}
                </div>
              )}
              {gpsError && <div className="text-[10px] text-amber-700 mt-1">{gpsError}</div>}
            </div>
          </div>
        </div>

        {/* 2-Column Tracking: Left Activities Timeline, Right Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: 7 cols Timeline */}
          <div className="lg:col-span-7 space-y-6">
            {/* Day Selector */}
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-none">
              {trip.days.map((day) => (
                <button
                  key={day.dayNumber}
                  onClick={() => setActiveDay(day.dayNumber)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    activeDay === day.dayNumber
                      ? 'bg-sky-600 text-white shadow-md'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Ngày {day.dayNumber}
                </button>
              ))}
            </div>

            {/* Active Day Activities */}
            {trip.days
              .filter((d) => d.dayNumber === activeDay)
              .map((day) => (
                <div key={day.dayNumber} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-base">{day.themeTitle}</h3>
                    <span className="text-xs text-slate-500">{day.date}</span>
                  </div>

                  <div className="space-y-4">
                    {day.activities.map((act) => {
                      const checkin = trip.checkins.find(
                        (c) => c.placeId === (act.placeId || act.id) || c.placeName === act.title
                      );
                      const isChecked = !!checkin;

                      return (
                        <div
                          key={act.id}
                          data-testid="saved-trip-activity"
                          data-place-id={act.placeId || ''}
                          className={`p-4 rounded-2xl border transition-all ${
                            isChecked
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : 'bg-slate-50/50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {act.timeSlot}
                                </span>
                                {isChecked && (
                                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Đã check-in</span>
                                    {checkin.verifiedViaGeo && <span>(GPS)</span>}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm">{act.title}</h4>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.description}</p>
                            </div>

                            {/* Checkin Action Button */}
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => handleCheckin(act)}
                                className={`text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                                  isChecked
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-sky-600 hover:bg-sky-700 text-white'
                                }`}
                              >

                                {isChecked ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Check-in lại</span>
                                  </>
                                ) : (
                                  <>
                                    <MapPin className="w-3.5 h-3.5" />
                                    <span>Check-in</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Notes field */}
                          <div className="mt-3 pt-3 border-t border-slate-200/60">
                            {isChecked && checkin.notes ? (
                              <div className="text-xs text-emerald-800 bg-emerald-100/60 p-2.5 rounded-xl">
                                <strong>Ghi chú của bạn:</strong> {checkin.notes}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Ghi chú nhanh (ví dụ: món ngon, view đẹp)..."
                                  value={checkinNotes[act.id] || ''}
                                  onChange={(e) =>
                                    setCheckinNotes({ ...checkinNotes, [act.id]: e.target.value })
                                  }
                                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700"
                                />
                                <button
                                  onClick={() => handleCheckin(act)}
                                  className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                                >
                                  Lưu
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
          </div>

          {/* RIGHT: 5 cols Leaflet Map */}
          <div className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-600" />
                  Bản đồ theo dõi thực địa
                </span>
                <span className="text-[11px] text-emerald-600 font-bold">
                  ✓ Xanh lá: Đã check-in
                </span>
              </div>
              <div ref={mapContainerRef} className="w-full h-[450px] z-10" />
            </div>

            {/* Convert to Blog Card */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl p-5 text-white shadow-md">
              <h4 className="font-bold text-base mb-1">Chia sẻ trải nghiệm với cộng đồng</h4>
              <p className="text-xs text-orange-100 mb-4 leading-relaxed">
                Tự động tổng hợp toàn bộ các điểm bạn đã check-in, ghi chú và hình ảnh thành một bài viết Blog du lịch chuẩn mực để bạn bè tham khảo!
              </p>
              <button
                onClick={handleConvertToBlog}
                disabled={isConvertingToBlog}
                className="w-full bg-white hover:bg-slate-100 text-orange-700 font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-sm"
              >
                {isConvertingToBlog ? 'Đang xử lý...' : 'Tạo bài Blog từ chuyến đi này ngay'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
