import { PlannerBudgetNotice } from '../components/common/PlannerBudgetNotice';
import { TripItineraryEditor } from '../components/common/TripItineraryEditor';
import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { GoogleMap } from '../components/maps/GoogleMap';
import { googleMapsSelected } from '../utils/googleMapsLoader';
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
import { tripCostView } from '../utils/tripCosts';
import { roundMapMarker, tripPopup } from '../utils/mapPopup';

export const TripDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<TripSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(1);
  const [currentGps, setCurrentGps] = useState<{ latitude: number; longitude: number; accuracyMeters?: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [checkinNotes, setCheckinNotes] = useState<{ [actId: string]: string }>({});
  const [isConvertingToBlog, setIsConvertingToBlog] = useState(false);
  const [preferenceDraft, setPreferenceDraft] = useState<string[]>([]);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);
  const [editingItinerary, setEditingItinerary] = useState(false);
  const [isSavingItinerary, setIsSavingItinerary] = useState(false);
  const [itineraryMessage, setItineraryMessage] = useState<string | null>(null);

  // Map References
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (id) {
      setEditingItinerary(false); setItineraryMessage(null);
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
    setCurrentGps(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCurrentGps({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
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
    if (!trip || actionBusy) return;
    const note = checkinNotes[act.id] || '';
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await TripService.checkinActivity(
        trip.id,
        act.id,
        currentGps || undefined,
        note || undefined
      );

      if (res.success && res.trip) {
        setTrip(res.trip);
      }
    } catch (err) {
      console.error('Checkin failed:', err);
      setActionError('Không thể check-in hoạt động này. Hãy tải lại lịch và kiểm tra trạng thái chuyến đi.');
    } finally { setActionBusy(false); }
  };

  // Status transitions
  const handleStartTrip = async () => {
    if (!trip || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await TripService.startTrip(trip.id);
      if (updated) setTrip(updated);
    } catch (err) {
      console.error('Failed to start trip:', err);
      setActionError('Không thể bắt đầu chuyến đi ở trạng thái hiện tại. Hãy tải lại lịch.');
    } finally { setActionBusy(false); }
  };

  const handleCompleteTrip = async () => {
    if (!trip || actionBusy) return;
    setActionBusy(true);
    setActionError(null);
    try {
      const updated = await TripService.completeTrip(trip.id);
      if (updated) setTrip(updated);
    } catch (err) {
      console.error('Failed to complete trip:', err);
      setActionError('Không thể kết thúc chuyến đi ở trạng thái hiện tại. Hãy tải lại lịch.');
    } finally { setActionBusy(false); }
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
    if (googleMapsSelected() || !trip || !mapContainerRef.current) return;

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

        const isChecked = trip.progress?.checkedActivityIds.includes(act.id) ?? false;

        const customIcon = L.divIcon({
          className: 'custom-checkin-marker',
          html: roundMapMarker(isChecked ? '✓' : `N${day.dayNumber}`, isChecked ? '#10b981' : '#0284c7', 30),
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker(pos, { icon: customIcon });
        marker.bindPopup(tripPopup(act, isChecked));

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

  const costView = tripCostView(trip);
  const eligibleIds = trip.progress?.eligibleActivityIds || [];
  const checkedIds = trip.progress?.checkedActivityIds || [];
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
                  {trip.daysCount} Ngày • {trip.nightsCount === undefined ? 'Chưa lưu số đêm' : `${trip.nightsCount} Đêm`}
                </span>
                <span className="text-xs text-slate-500">
                  {trip.startDate} &rarr; {trip.endDate}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">
                {trip.title}
              </h1>
              <section className="mt-3 space-y-1 text-xs text-slate-600" data-testid="trip-cost-summary">
                <p>{costView.label}</p>
                {costView.isGroup && <PlannerBudgetNotice budget={trip.totalBudgetUserVND} estimate={trip.totalEstimatedCostVND} />}
                <p>Ngân sách đã lưu: {new Intl.NumberFormat('vi-VN').format(trip.totalBudgetUserVND)}đ • Chi phí ước tính đã lưu: {new Intl.NumberFormat('vi-VN').format(trip.totalEstimatedCostVND)}đ</p>
                <p>Nhịp độ: {costView.pacing} • Phương tiện: {costView.transportation}</p>
                {trip.adults !== undefined && <p>Số khách đã lưu: {trip.adults} người lớn, {trip.children ?? 0} trẻ em.</p>}
                {costView.assumptions.length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-semibold">Giả định chi phí đã lưu</summary>
                    <ul className="mt-1 list-disc pl-4 space-y-1">{costView.assumptions.map((item, index) => <li key={index}>{item}</li>)}</ul>
                  </details>
                )}
              </section>
            </div>

            {/* Status & Control Actions */}
            <div className="flex flex-wrap items-center gap-3">
              {trip.costBasis === 'GROUP_VND_V1' && <button type="button" data-testid="edit-trip-itinerary" disabled={editingItinerary || actionBusy || isSavingPreferences} onClick={() => { setItineraryMessage(null); setEditingItinerary(true); }} className="bg-white border border-sky-300 text-sky-800 font-bold px-4 py-2.5 rounded-xl disabled:opacity-50">Chỉnh sửa lịch trình</button>}
              {trip.status === 'upcoming' && (
                <button
                  onClick={handleStartTrip}
                  data-testid="start-trip"
                  disabled={actionBusy || editingItinerary}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <Flag className="w-4 h-4" />
                  <span>Bắt đầu chuyến đi</span>
                </button>
              )}

              {trip.status === 'active' && (
                <button
                  onClick={handleCompleteTrip}
                  data-testid="complete-trip"
                  disabled={actionBusy || editingItinerary}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kết thúc chuyến đi</span>
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

          <p data-testid="trip-status" className="mt-3 text-sm font-semibold">
            Trạng thái: {({ upcoming: 'Chưa bắt đầu', active: 'Đang diễn ra', completed: 'Đã kết thúc', cancelled: 'Đã hủy' })[trip.status]}
          </p>
          <p className="text-xs text-slate-500 mt-1">Kết thúc chuyến đi giữ nguyên tỷ lệ check-in các hoạt động.</p>
          {actionError && <p role="alert" className="text-sm text-red-700 mt-2">{actionError}</p>}

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
                  disabled={isSavingPreferences || editingItinerary}
                  className="bg-sky-600 hover:bg-sky-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl"
                >
                  {isSavingPreferences ? 'Đang lưu...' : 'Lưu sở thích'}
                </button>
                <button
                  type="button"
                  data-testid="clear-trip-preferences"
                  onClick={clearPreferences}
                  disabled={isSavingPreferences || editingItinerary || preferenceDraft.length === 0}
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
            <div className="md:col-span-8" data-testid="trip-progress">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-slate-700">
                  Đã check-in: {checkedIds.length}/{eligibleIds.length} hoạt động
                </span>
                <span className="font-extrabold text-emerald-600 text-sm">{trip.progressPercent}%</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Tính mọi hoạt động trong lịch, gồm ăn/nghỉ và hoạt động tự tạo. Lịch trống có tiến độ 0%.</p>
              {!!trip.progress && (trip.progress.unmatchedCheckinCount > 0 || trip.progress.ineligibleActivityCount > 0) && (
                <p data-testid="trip-history-limit" className="text-xs text-amber-700 mt-2">
                  Có {trip.progress.unmatchedCheckinCount} bản ghi lịch sử không tính vào tiến độ và {trip.progress.ineligibleActivityCount} hoạt động chưa xác định riêng biệt. Giữ lịch sử; không tự gán check-in khi không xác định được hoạt động.
                </p>
              )}
              {trip.checkins.length > 0 && <details className="text-xs mt-2"><summary>Lịch sử check-in</summary><ul>
                {trip.checkins.map((entry, index) => <li key={index}>{entry.placeName} — {entry.checkedInAt}{entry.resolvedActivityId ? '' : ' (không tính vào tiến độ hiện tại)'}{entry.hasAttachedLocation ? ' — Có đính kèm vị trí' : ''}{entry.notes ? ` — ${entry.notes}` : ''}</li>)}
              </ul></details>}
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
                  data-testid="request-trip-location"
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
              <p className="text-[10px] text-slate-500 mt-1">Vị trí chỉ được đính kèm; không xác minh có mặt thực địa. Không cần GPS để check-in.</p>
            </div>
          </div>
        </div>

        {itineraryMessage && <p role="status" data-testid="trip-itinerary-message" className="mb-4 text-emerald-800 font-semibold">{itineraryMessage}</p>}
        {editingItinerary && <TripItineraryEditor key={trip.id} trip={trip} onBusyChange={setIsSavingItinerary} onCancel={() => { if (!isSavingItinerary) setEditingItinerary(false); }} onSaved={updated => { setTrip(updated); setEditingItinerary(false); setItineraryMessage('Đã lưu lịch trình.'); }} />}
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
                  <p className="text-xs text-slate-600">
                    Ước tính đã lưu của ngày: {new Intl.NumberFormat('vi-VN').format(day.dayEstimatedCostVND)}đ{trip.costBasis === 'GROUP_VND_V1' ? ' / nhóm' : ' (đơn vị bản cũ chưa xác nhận)'}
                    {day.lodgingCostSource && <span className="block">{day.lodgingCostSource}</span>}
                    {trip.costBasis === 'GROUP_VND_V1' && ` • Lưu trú ${day.lodgingNights ?? 0} đêm: ${new Intl.NumberFormat('vi-VN').format(day.lodgingEstimatedCostVND ?? 0)}đ / nhóm, đã gồm trong tổng ngày.`}
                  </p>

                  <div className="space-y-4">
                    {day.activities.map((act) => {
                      const checkin = trip.checkins.find((c) => c.resolvedActivityId === act.id);
                      const isChecked = !!checkin;

                      return (
                        <div
                          key={act.id}
                          data-testid="saved-trip-activity"
                          data-activity-id={act.id}
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
                                    {checkin.hasAttachedLocation && <span>(Có đính kèm vị trí)</span>}
                                  </span>
                                )}
                              </div>
                              <h4 className="font-bold text-slate-900 text-sm">{act.title}</h4>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">{act.description}</p>
                              {act.costSource && <p className="text-xs text-slate-500">{act.costSource}</p>}
                              <p className="text-xs text-slate-500 mt-1">Ước tính đã lưu: {new Intl.NumberFormat('vi-VN').format(act.estimatedCostVND)}đ{trip.costBasis === 'GROUP_VND_V1' ? ' / nhóm' : ' (chưa xác nhận đơn vị)'}</p>
                            </div>

                            {/* Checkin Action Button */}
                            <div className="flex-shrink-0">
                              <button
                                onClick={() => handleCheckin(act)}
                                data-testid="checkin-activity"
                                disabled={actionBusy || editingItinerary || isChecked || trip.status !== 'active' || !eligibleIds.includes(act.id)}
                                className={`text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm ${
                                  isChecked
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-sky-600 hover:bg-sky-700 text-white'
                                }`}
                              >

                                {isChecked ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Đã ghi nhận</span>
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
                            ) : !isChecked && trip.status === 'active' && eligibleIds.includes(act.id) ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  maxLength={5000}
                                  placeholder="Ghi chú nhanh (ví dụ: món ngon, view đẹp)..."
                                  value={checkinNotes[act.id] || ''}
                                  onChange={(e) =>
                                    setCheckinNotes({ ...checkinNotes, [act.id]: e.target.value })
                                  }
                                  className="w-full text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 text-slate-700"
                                />
                                <button
                                  onClick={() => handleCheckin(act)}
                                  disabled={actionBusy || editingItinerary}
                                  className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 rounded-lg font-medium transition-colors"
                                >
                                  Lưu
                                </button>
                              </div>
                            ) : null}
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
              {googleMapsSelected() ? <GoogleMap height={450} points={trip.days.flatMap(d=>d.activities.map(a=>({id:a.id,name:a.title,latitude:a.latitude,longitude:a.longitude})))}/> : <div ref={mapContainerRef} className="w-full z-10" style={{ height: 450 }} />}
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
