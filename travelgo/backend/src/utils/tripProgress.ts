import { HttpError } from './httpError.js';

type Activity = { id: string; placeId?: string; title: string };
type Entry = Record<string, any>;
const validId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(id);
const entries = (value: unknown): Entry[] => Array.isArray(value) ? value.filter((v) => v && typeof v === 'object' && !Array.isArray(v)) : [];
const reference = (activity: Activity) => typeof activity.placeId === 'string' ? activity.placeId.toLowerCase() : undefined;

/** All categories count, but ambiguous/missing IDs on legacy rows are not invented. */
export function activityIndex(itinerary: unknown) {
  const all = entries(itinerary).flatMap((day) => entries(day.activities));
  const counts = new Map<string, number>();
  for (const a of all) if (validId(a.id)) counts.set(a.id, (counts.get(a.id) || 0) + 1);
  const eligible = all.filter((a) => validId(a.id) && counts.get(a.id) === 1 && typeof a.title === 'string'
    && (a.placeId === undefined || typeof a.placeId === 'string')) as Activity[];
  return { all: all as Activity[], eligible, ineligibleActivityCount: all.length - eligible.length };
}

function resolve(entry: Entry, index: ReturnType<typeof activityIndex>): Activity | undefined {
  const { all, eligible } = index;
  if (entry.excludedFromProgress) return undefined;
  if (entry.activityId !== undefined) {
    return eligible.find((a) => a.id === entry.activityId && (typeof entry.placeId === 'string' ? entry.placeId.toLowerCase() : undefined) === reference(a));
  }
  if (typeof entry.placeId !== 'string') return undefined;
  // Old custom check-ins stored activity.id in placeId. Never match by title.
  const candidates = all.filter((a) => reference(a) === entry.placeId.toLowerCase() || (!a.placeId && a.id === entry.placeId));
  return candidates.length === 1 && eligible.includes(candidates[0]) ? candidates[0] : undefined;
}

export function tripProgress(itinerary: unknown, history: unknown) {
  const index = activityIndex(itinerary);
  const { eligible, ineligibleActivityCount } = index;
  const checked = new Set<string>();
  const checkins = entries(history).map((entry) => {
    const activity = resolve(entry, index);
    const resolvedActivityId = activity && !checked.has(activity.id) ? activity.id : undefined;
    if (resolvedActivityId) checked.add(resolvedActivityId);
    const hasAttachedLocation = typeof entry.latitude === 'number' && Number.isFinite(entry.latitude) && Math.abs(entry.latitude) <= 90
      && typeof entry.longitude === 'number' && Number.isFinite(entry.longitude) && Math.abs(entry.longitude) <= 180;
    // Projection only: keep historical fields but never interpret verifiedViaGeo as proof.
    return { ...entry, resolvedActivityId, hasAttachedLocation };
  });
  return {
    checkins,
    progressPercent: eligible.length ? Math.round(100 * checked.size / eligible.length) : 0,
    progress: { eligibleActivityIds: eligible.map((a) => a.id), checkedActivityIds: [...checked],
      unmatchedCheckinCount: checkins.filter((c) => !c.resolvedActivityId).length, ineligibleActivityCount },
  };
}

/** Persist safe old associations before editing the itinerary; retain every history record. */
export function reconcileCheckins(before: unknown, after: unknown, history: unknown): unknown[] {
  const oldIndex = activityIndex(before);
  const nextIndex = activityIndex(after).eligible;
  return (Array.isArray(history) ? history : []).map((raw) => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.excludedFromProgress) return raw;
    const activity = resolve(raw, oldIndex);
    if (!activity) return { ...raw, excludedFromProgress: 'legacy_unresolved' };
    const next = nextIndex.find((a) => a.id === activity.id);
    const linked = { ...raw, activityId: activity.id, ...(activity.placeId ? { placeId: activity.placeId }
      : { ...(raw.placeId !== undefined ? { legacyPlaceId: raw.placeId } : {}), placeId: undefined }) };
    if (!next) return { ...linked, excludedFromProgress: 'activity_removed' };
    if (reference(next) !== reference(activity)) return { ...linked, excludedFromProgress: 'activity_reference_changed' };
    return linked;
  });
}

export function validateCheckinBody(value: unknown): { activityId?: string; placeId?: string; notes?: string; geo?: { latitude: number; longitude: number; accuracyMeters?: number } } {
  const bad = (message: string): never => { throw new HttpError(400, message, 'INVALID_TRIP_CHECKIN'); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) bad('Check-in body phải là object.');
  const body = value as Entry;
  if (Object.keys(body).some((k) => !['activityId', 'placeId', 'placeName', 'notes', 'geo'].includes(k))) bad('Check-in có trường không được hỗ trợ.');
  if ((body.activityId === undefined) === (body.placeId === undefined)) bad('Gửi đúng một activityId hoặc placeId cũ.');
  if (body.activityId !== undefined && !validId(body.activityId)) bad('activityId không hợp lệ.');
  if (body.placeId !== undefined && !validId(body.placeId)) bad('placeId cũ không hợp lệ.');
  if (body.placeName !== undefined && (typeof body.placeName !== 'string' || body.placeName.length > 255)) bad('placeName không hợp lệ.');
  if (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 5000)) bad('notes phải là chuỗi tối đa 5000 ký tự.');
  if (body.geo !== undefined) {
    const geo = body.geo;
    if (!geo || typeof geo !== 'object' || Array.isArray(geo) || Object.keys(geo).some((k) => !['latitude', 'longitude', 'accuracyMeters'].includes(k))) bad('geo không hợp lệ.');
    if (typeof geo.latitude !== 'number' || !Number.isFinite(geo.latitude) || Math.abs(geo.latitude) > 90
      || typeof geo.longitude !== 'number' || !Number.isFinite(geo.longitude) || Math.abs(geo.longitude) > 180) bad('Tọa độ phải hữu hạn và đúng giới hạn.');
    if (geo.accuracyMeters !== undefined && (typeof geo.accuracyMeters !== 'number' || !Number.isFinite(geo.accuracyMeters) || geo.accuracyMeters < 0)) bad('accuracyMeters phải hữu hạn và không âm.');
  }
  return body;
}

export function resolveCheckinActivity(itinerary: unknown, input: { activityId?: string; placeId?: string }) {
  const { all, eligible, ineligibleActivityCount } = activityIndex(itinerary);
  const candidates = input.activityId !== undefined ? eligible.filter((a) => a.id === input.activityId)
    : all.filter((a) => reference(a) === input.placeId?.toLowerCase() || (!a.placeId && a.id === input.placeId));
  if (candidates.length > 1) throw new HttpError(409, 'Place xuất hiện nhiều lần; hãy chọn activityId cụ thể.', 'AMBIGUOUS_TRIP_ACTIVITY');
  if (!candidates.length || !eligible.includes(candidates[0])) throw new HttpError(ineligibleActivityCount ? 409 : 400, 'Không tìm thấy activity duy nhất thuộc lịch; dữ liệu cũ thiếu/trùng ID cần được xử lý riêng.', 'INVALID_TRIP_ACTIVITY');
  return candidates[0];
}
