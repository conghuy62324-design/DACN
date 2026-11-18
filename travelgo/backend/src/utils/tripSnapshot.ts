import {TIME_AWARE_V2,timeMinute,validCoordinate} from './plannerScheduling.js';
import type { TripSessionAttributes } from '../models/TripSession.js';
import { calculatePlannerDays } from './plannerValidation.js';
import { HttpError } from './httpError.js';
import { validateTravelPreferences } from './travelPreferences.js';

export const MAX_TRIP_ACTIVITIES_PER_DAY = 20;
const MAX_CENTS = 999_999_999_999_999; // DECIMAL(15,2), safely below Number.MAX_SAFE_INTEGER.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fail = (message: string, code = 'INVALID_TRIP_INPUT'): never => { throw new HttpError(400, message, code); };
function record(value: unknown, label: string): Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} phải là object.`);
  return value as Record<string, any>;
}
function fields(value: Record<string, any>, allowed: readonly string[], label: string) {
  const unknown = Object.keys(value).find((key) => !allowed.includes(key));
  if (unknown) fail(`${label}: không được ghi trường ${unknown}.`, 'SPOOFED_TRIP_FIELD');
}
function text(value: unknown, label: string, max: number, empty = false): string {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) fail(`${label} phải là chuỗi ${empty ? '0' : '1'}–${max} ký tự.`);
  return value as string;
}
function integer(value: unknown, label: string, min: number, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min || value > max) fail(`${label} phải là số nguyên ${min}–${max}.`);
  return value as number;
}
function finite(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) fail(`${label} không phải số hữu hạn trong giới hạn.`);
  return value as number;
}
function cents(value: unknown, label: string): number {
  const amount = finite(value, label, 0, MAX_CENTS / 100);
  const scaled = amount * 100;
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || rounded > MAX_CENTS || Number(amount.toFixed(2)) !== amount) fail(`${label} chỉ hỗ trợ tối đa 2 chữ số thập phân.`);
  return rounded;
}
function sumMoney(amounts: number[], label: string): number {
  const sum = amounts.reduce((total, value) => total + cents(value, label), 0);
  if (!Number.isSafeInteger(sum) || sum > MAX_CENTS) fail(`${label} vượt giới hạn DECIMAL(15,2).`);
  return sum / 100;
}
export function assertTripId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !uuid.test(value)) fail('Trip ID phải là UUID hợp lệ.', 'INVALID_TRIP_ID');
}
export function tripCreateBody(value: unknown): unknown {
  const body = record(value, 'Trip body');
  fields(body, ['itinerary'], 'Trip body');
  return body.itinerary;
}

const activityFields = ['id', 'placeId', 'timeSlot', 'title', 'description', 'category', 'durationMinutes', 'estimatedCostVND', 'costSource', 'latitude', 'longitude', 'imageUrl', 'recommendationReason', 'aerialDistanceToNextKm', 'estimatedTransitMinutes'];
const dayFields = ['dayNumber', 'date', 'themeTitle', 'activities', 'dayEstimatedCostVND', 'lodgingNights', 'lodgingEstimatedCostVND', 'lodgingCostSource', 'centroid'];
const snapshotFields = ['id', 'title', 'departureCity', 'destinationCity', 'startDate', 'endDate', 'daysCount', 'nightsCount', 'costBasis', 'costAssumptions', 'transportation', 'pacing', 'adults', 'children', 'preferences', 'totalBudgetUserVND', 'totalEstimatedCostVND', 'costDifferenceVND', 'budgetStatus', 'overBudgetVND', 'constraintViolations', 'budgetAdvice', 'days', 'summary', 'hotelSuggestion', 'selectedPlaceIds', 'createdAt'];
export type SnapshotFields = Pick<TripSessionAttributes, 'name' | 'departureCity' | 'destinationCity' | 'startDate' | 'endDate' | 'daysCount' | 'totalBudgetVND' | 'estimatedCostVND' | 'pacing' | 'preferences' | 'itinerary' | 'selectedPlaceIds' | 'plannerMetadata'>;

/** Accept an explicit, versioned group estimate; never upgrade an unversioned snapshot. */
export function prepareTripSnapshot(value: unknown): SnapshotFields {
  const input = record(value, 'itinerary');
  const timed=input.planningVersion===TIME_AWARE_V2;
  fields(input,timed?[...snapshotFields,'planningVersion','planning']:snapshotFields,'itinerary');
  if(timed){const m=record(input.planning,'planning');fields(m,['requestedPace','effectivePace','feasibility','warnings','route','catalogFingerprint','mandatoryIds','replanning'],'planning');
    if(!['relaxed','balanced','packed'].includes(m.requestedPace)||!['relaxed','balanced','packed'].includes(m.effectivePace)||!['FEASIBLE_UNDER_ASSUMPTIONS','PARTIALLY_FEASIBLE','INFEASIBLE','DATA_INSUFFICIENT'].includes(m.feasibility))fail('Planning metadata invalid.');
    if(!Array.isArray(m.warnings)||m.warnings.length>50||m.warnings.some((w:unknown)=>typeof w!=='string'||! /^[A-Z0-9_]{1,100}$/.test(w)))fail('Planning warnings invalid.');
    if(typeof m.catalogFingerprint!=='string'||! /^[a-f0-9]{64}$/.test(m.catalogFingerprint)||!Array.isArray(m.mandatoryIds)||m.mandatoryIds.length>10||m.mandatoryIds.some((v:unknown)=>typeof v!=='string'||!uuid.test(v)))fail('Planning provenance invalid.');
    const route=record(m.route,'route');fields(route,['beforeKm','afterKm','basis'],'route');if(!(route.beforeKm===null&&route.afterKm===null)){finite(route.beforeKm,'beforeKm',0,500000);finite(route.afterKm,'afterKm',0,500000);}if(route.basis!=='HAVERSINE_SAME_CANDIDATES'||route.afterKm>route.beforeKm)fail('Planning route invalid.');
    if(m.replanning){fields(m.replanning,['changedDays','unchangedDays'],'replanning');for(const k of ['changedDays','unchangedDays'])if(!Array.isArray(m.replanning[k])||m.replanning[k].length>10||m.replanning[k].some((v:unknown)=>!Number.isSafeInteger(v)||Number(v)<1||Number(v)>10))fail('Replanning metadata invalid.');}
  }
  if (input.costBasis !== 'GROUP_VND_V1') {
    throw new HttpError(422, 'Chưa thể lưu mới itinerary không có GROUP_VND_V1. Hãy tạo lịch mới; không tự chuyển đơn vị dữ liệu cũ.', 'UNVERSIONED_TRIP_SNAPSHOT');
  }
  const daysCount = calculatePlannerDays(input.startDate, input.endDate);
  if (input.daysCount !== daysCount) fail('daysCount phải khớp khoảng ngày và số phần tử days.');
  if (input.nightsCount !== undefined && input.nightsCount !== daysCount - 1) fail('nightsCount phải bằng daysCount−1.');
  const adults = integer(input.adults, 'adults', 1);
  const children = integer(input.children, 'children', 0);
  if (!Number.isSafeInteger(adults + children)) fail('Tổng số khách không an toàn.');
  const name = text(input.title, 'title', 255);
  const departureCity = text(input.departureCity, 'departureCity', 120);
  const destinationCity = text(input.destinationCity, 'destinationCity', 120);
  if (!['relaxed', 'balanced', 'packed'].includes(input.pacing)) fail('pacing không hợp lệ.');
  // Save/read snapshots may retain legacy modes. This is not the generate validator.
  if (input.transportation !== undefined && !['car', 'motorbike', 'flight', 'train'].includes(input.transportation)) fail('transportation không hợp lệ.');
  const totalBudgetVND = cents(input.totalBudgetUserVND, 'totalBudgetUserVND') / 100;
  if (input.totalEstimatedCostVND !== undefined) cents(input.totalEstimatedCostVND, 'totalEstimatedCostVND');
  if (!Array.isArray(input.costAssumptions) || input.costAssumptions.length < 1 || input.costAssumptions.length > 20) fail('costAssumptions phải có 1–20 dòng.');
  const costAssumptions = input.costAssumptions.map((item: unknown) => text(item, 'costAssumptions', 1000));
  for (const key of ['id', 'summary', 'budgetAdvice', 'createdAt']) {
    if (input[key] !== undefined) text(input[key], key, key === 'summary' ? 4000 : key === 'budgetAdvice' ? 2000 : 120, true);
  }
  if (input.costDifferenceVND !== undefined) finite(input.costDifferenceVND, 'costDifferenceVND', -MAX_CENTS / 100, MAX_CENTS / 100);
  if (input.budgetStatus !== undefined && !['within_budget', 'over_budget'].includes(input.budgetStatus)) fail('budgetStatus không hợp lệ.');
  // Validate shape, then discard client feasibility claims; serialize derives them.
  if (input.overBudgetVND !== undefined) cents(input.overBudgetVND, 'overBudgetVND');
  if (input.constraintViolations !== undefined && (!Array.isArray(input.constraintViolations) ||
    input.constraintViolations.length > 10 || input.constraintViolations.some((v: unknown) => v !== 'BUDGET_EXCEEDED'))) fail('constraintViolations không hợp lệ.');
  if (input.hotelSuggestion !== undefined) record(input.hotelSuggestion, 'hotelSuggestion'); // Not stored or trusted for prices.
  if (input.selectedPlaceIds !== undefined) {
    if (!Array.isArray(input.selectedPlaceIds) || input.selectedPlaceIds.length > 200) fail('selectedPlaceIds không hợp lệ.');
    input.selectedPlaceIds.forEach((id: unknown) => { if (typeof id !== 'string' || !uuid.test(id)) fail('selectedPlaceIds chứa UUID không hợp lệ.'); });
  }
  if (!Array.isArray(input.days) || input.days.length !== daysCount) fail('days phải là mảng đúng 1–10 ngày theo khoảng ngày.');
  const ids = new Set<string>();
  const activityIds = new Set<string>();
  const days = input.days.map((raw: unknown, index: number) => {
    const day = record(raw, 'day'); fields(day,timed?[...dayFields,'travelWindow']:dayFields,'day');
    const expectedDate = new Date(`${input.startDate}T00:00:00Z`); expectedDate.setUTCDate(expectedDate.getUTCDate() + index);
    if (day.dayNumber !== index + 1 || day.date !== expectedDate.toISOString().slice(0, 10)) fail('dayNumber/date phải liên tục và khớp startDate.');
    text(day.themeTitle, 'themeTitle', 255);
    const centroid = record(day.centroid, 'centroid'); fields(centroid, ['latitude', 'longitude'], 'centroid');
    if(!(timed&&centroid.latitude===null&&centroid.longitude===null)){finite(centroid.latitude,'centroid.latitude',-90,90);finite(centroid.longitude,'centroid.longitude',-180,180);}
    if(timed){fields(day.travelWindow,['start','end'],'travelWindow');integer(day.travelWindow.start,'window.start',0,1439);integer(day.travelWindow.end,'window.end',1,1440);if(day.travelWindow.start>=day.travelWindow.end)fail('Travel window invalid.');}
    const lodgingNights = index < daysCount - 1 ? 1 : 0;
    if (day.lodgingNights !== lodgingNights) fail('lodgingNights không khớp quy tắc N−1 đêm.');
    const lodgingEstimatedCostVND = cents(day.lodgingEstimatedCostVND, 'lodgingEstimatedCostVND') / 100;
    if (!lodgingNights && lodgingEstimatedCostVND !== 0) fail('Ngày 0 đêm không được phát sinh phí lưu trú.');
    if (day.dayEstimatedCostVND !== undefined) cents(day.dayEstimatedCostVND, 'dayEstimatedCostVND');
    if (day.lodgingCostSource !== undefined) text(day.lodgingCostSource, 'lodgingCostSource', 1000);
    if (!Array.isArray(day.activities) || day.activities.length > MAX_TRIP_ACTIVITIES_PER_DAY) fail('activities phải là mảng từ 0 đến 20 hoạt động/ngày.');
    const activities = day.activities.map((rawActivity: unknown) => {
      const activity = record(rawActivity, 'activity'); fields(activity,timed?[...activityFields,'startMinute','endMinute','expectedStart','expectedEnd','schedulingSource','transitBeforeMinutes','transitBasis','bufferBeforeMinutes','openingHoursStatus']:activityFields,'activity');
      const id = text(activity.id, 'activity.id', 120);
      if (!/^[A-Za-z0-9_-]+$/.test(id) || activityIds.has(id)) fail('activity.id phải duy nhất và chỉ chứa chữ/số/_/-.');
      activityIds.add(id);
      if (activity.placeId !== undefined) {
        if (typeof activity.placeId !== 'string' || !uuid.test(activity.placeId)) fail('Place activity cần placeId UUID; hoạt động tự tạo phải bỏ placeId.');
        ids.add(activity.placeId.toLowerCase());
      }
      if (!['morning', 'lunch', 'afternoon', 'dinner', 'evening'].includes(activity.timeSlot)) fail('timeSlot không hợp lệ.');
      if (!['sightseeing', 'food', 'hotel', 'leisure'].includes(activity.category)) fail('category hoạt động không hợp lệ.');
      text(activity.title, 'activity.title', 255); text(activity.description, 'activity.description', 4000, true);
      integer(activity.durationMinutes, 'durationMinutes', 0, 1440);
      const estimatedCostVND = cents(activity.estimatedCostVND, 'activity.estimatedCostVND') / 100;
      if (activity.costSource !== undefined) text(activity.costSource, 'costSource', 1000);
      if (activity.category === 'hotel' && estimatedCostVND !== 0) fail('Phí hotel nằm ở lodging; activity hotel phải là 0đ để tránh tính trùng.');
      if(!(timed&&activity.latitude===null&&activity.longitude===null)){finite(activity.latitude,'latitude',-90,90);finite(activity.longitude,'longitude',-180,180);}
      if(timed){integer(activity.startMinute,'startMinute',day.travelWindow.start,day.travelWindow.end);integer(activity.endMinute,'endMinute',day.travelWindow.start,day.travelWindow.end);
        if(activity.endMinute-activity.startMinute!==activity.durationMinutes||activity.durationMinutes<=0||timeMinute(activity.expectedStart)!==activity.startMinute||timeMinute(activity.expectedEnd)!==activity.endMinute)fail('Activity timing invalid.');
        text(activity.schedulingSource,'schedulingSource',100);for(const k of ['transitBeforeMinutes','bufferBeforeMinutes'])if(activity[k]!==undefined)integer(activity[k],k,0,1440);for(const k of ['transitBasis','openingHoursStatus'])if(activity[k]!==undefined)text(activity[k],k,100);
      }
      if (activity.imageUrl !== undefined) text(activity.imageUrl, 'imageUrl', 2048, true);
      if (activity.recommendationReason !== undefined) text(activity.recommendationReason, 'recommendationReason', 1000, true);
      if (activity.aerialDistanceToNextKm !== undefined) finite(activity.aerialDistanceToNextKm, 'aerialDistanceToNextKm', 0, 50_000);
      if (activity.estimatedTransitMinutes !== undefined) finite(activity.estimatedTransitMinutes, 'estimatedTransitMinutes', 0, 525_600);
      return { ...activity, ...(activity.placeId === undefined ? {} : { placeId: activity.placeId.toLowerCase() }), estimatedCostVND };
    });
    if(timed&&activities.some((a,i)=>i>0&&a.startMinute<activities[i-1].endMinute))fail('Overlapping activities.');
    return { ...day, centroid: { ...centroid }, activities, lodgingNights, lodgingEstimatedCostVND,
      dayEstimatedCostVND: sumMoney([...activities.map((activity) => activity.estimatedCostVND), lodgingEstimatedCostVND], 'day total') };
  });
  const lodgingPlaceId=input.hotelSuggestion?.id;
  if(lodgingPlaceId!==undefined&&(typeof lodgingPlaceId!=='string'||!uuid.test(lodgingPlaceId)))fail('Lodging ID invalid.');
  const plannerMetadata = { schemaVersion: timed?2:1,...(lodgingPlaceId?{lodgingPlaceId}:{}),...(timed?{planningVersion:TIME_AWARE_V2,planning:structuredClone(input.planning)}:{}), costBasis: 'GROUP_VND_V1', nightsCount: daysCount - 1,
    costAssumptions, adults, children, ...(input.transportation === undefined ? {} : { transportation: input.transportation }) };
  if (Buffer.byteLength(JSON.stringify(plannerMetadata), 'utf8') > 32768) fail('Metadata Trip vượt 32 KiB UTF-8.', 'TRIP_METADATA_TOO_LARGE');
  return {
    name, departureCity, destinationCity, startDate: input.startDate, endDate: input.endDate, daysCount,
    totalBudgetVND, estimatedCostVND: sumMoney(days.map((day) => day.dayEstimatedCostVND), 'trip total'),
    pacing: input.pacing, preferences: validateTravelPreferences(input.preferences), itinerary: days,
    selectedPlaceIds: [...ids],
    plannerMetadata,
  };
}

const snapshotUpdates = ['days', 'itinerary', 'startDate', 'endDate', 'daysCount', 'nightsCount', 'adults', 'children', 'costBasis', 'costAssumptions', 'transportation', 'pacing', 'totalBudgetUserVND', 'totalEstimatedCostVND','planningVersion','planning','hotelSuggestion'];
const editable = ['name', 'title', 'notes', 'actualSpentVND', 'isPublic', 'preferences', ...snapshotUpdates];
export function prepareTripUpdate(value: unknown, existing: TripSessionAttributes): Partial<TripSessionAttributes> {
  const input = record(value, 'Trip update'); fields(input, editable, 'Trip update');
  const updates: Partial<TripSessionAttributes> = {};
  if (input.name !== undefined && input.title !== undefined && input.name !== input.title) fail('name và title mâu thuẫn.');
  if (input.name !== undefined || input.title !== undefined) updates.name = text(input.name ?? input.title, 'title', 255);
  if (input.notes !== undefined) updates.notes = text(input.notes, 'notes', 5000, true);
  if (input.actualSpentVND !== undefined) updates.actualSpentVND = cents(input.actualSpentVND, 'actualSpentVND') / 100;
  if (input.isPublic !== undefined) {
    if (typeof input.isPublic !== 'boolean') fail('isPublic phải là boolean.');
    updates.isPublic = input.isPublic;
  }
  if (input.preferences !== undefined) updates.preferences = validateTravelPreferences(input.preferences);
  const changesSnapshot = snapshotUpdates.some((key) => input[key] !== undefined);
  if (!changesSnapshot) return updates;
  if (existing.plannerMetadata?.costBasis !== 'GROUP_VND_V1') {
    throw new HttpError(422, 'Trip cũ chưa có đơn vị chi phí xác nhận: chỉ sửa tên/sở thích/ghi chú, không tự chuyển đổi itinerary hoặc chi phí.', 'LEGACY_TRIP_ITINERARY_READ_ONLY');
  }
  if (input.days !== undefined && input.itinerary !== undefined) fail('Chỉ gửi một trong days hoặc itinerary.');
  const metadata = existing.plannerMetadata;
  const merged: any = {
    title: updates.name ?? existing.name, departureCity: existing.departureCity, destinationCity: existing.destinationCity,
    startDate: existing.startDate, endDate: existing.endDate, daysCount: existing.daysCount,
    ...(metadata.planningVersion?{planningVersion:metadata.planningVersion,planning:metadata.planning}:{}),
    costBasis: metadata.costBasis, costAssumptions: metadata.costAssumptions, transportation: metadata.transportation,
    adults: metadata.adults, children: metadata.children, pacing: existing.pacing,
    totalBudgetUserVND: Number(existing.totalBudgetVND), preferences: updates.preferences ?? existing.preferences,
    days: input.itinerary !== undefined ? input.itinerary : input.days !== undefined ? input.days : existing.itinerary,
    ...(metadata.lodgingPlaceId?{hotelSuggestion:{id:metadata.lodgingPlaceId}}:{}),
  };
  for (const key of snapshotUpdates.filter((key) => key !== 'days' && key !== 'itinerary')) {
    if (input[key] !== undefined) merged[key] = input[key];
  }
  return { ...updates, ...prepareTripSnapshot(merged) };
}
