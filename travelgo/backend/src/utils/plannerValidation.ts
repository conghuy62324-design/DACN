import type { PlannerInput } from '../services/tourPlannerService.js';
import { HttpError } from './httpError.js';
import { validateTravelPreferences } from './travelPreferences.js';

const DAY_MS = 86_400_000;

function calendarDate(value: unknown, field: string): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) {
    throw new HttpError(400, `${field} phải là ngày hợp lệ theo định dạng YYYY-MM-DD.`, 'INVALID_PLANNER_DATE');
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  // Date.parse alone normalizes e.g. February 30 into March instead of rejecting it.
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new HttpError(400, `${field} không phải ngày tồn tại trong lịch.`, 'INVALID_PLANNER_DATE');
  }
  return date.getTime();
}

export function calculatePlannerDays(startDate: unknown, endDate: unknown): number {
  const start = calendarDate(startDate, 'startDate');
  const end = calendarDate(endDate, 'endDate');
  if (end < start) {
    throw new HttpError(400, 'Ngày kết thúc phải từ ngày bắt đầu trở đi.', 'INVALID_PLANNER_DATE_RANGE');
  }
  const days = (end - start) / DAY_MS + 1;
  if (days > 10) {
    throw new HttpError(400, 'Lịch trình chỉ hỗ trợ từ 1 đến 10 ngày, gồm ngày đầu và ngày cuối.', 'PLANNER_DAY_LIMIT_EXCEEDED');
  }
  return days;
}

function location(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 120) {
    throw new HttpError(400, `${field} phải là chuỗi từ 1 đến 120 ký tự.`, 'INVALID_PLANNER_LOCATION');
  }
  return value.trim().normalize('NFC');
}

function count(value: unknown, fallback: number, minimum: number, field: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new HttpError(400, `${field} phải là số nguyên an toàn >= ${minimum}.`, 'INVALID_PLANNER_COUNT');
  }
  return value;
}

/** Missing fields receive defaults; explicitly supplied invalid values never do. */
export function validatePlannerInput(value: unknown, now = new Date()): PlannerInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Dữ liệu Planner phải là object.', 'INVALID_PLANNER_INPUT');
  }
  const input = value as Record<string, unknown>;
  const destinationCity = location(input.destinationCity, 'destinationCity');
  const departureCity = location(input.departureCity === undefined ? 'Hà Nội' : input.departureCity, 'departureCity');
  // Vietnam has UTC+7 year-round. Arithmetic on date-only values below uses UTC.
  const todayVietnam = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const startDate = input.startDate === undefined ? todayVietnam : input.startDate;
  const start = calendarDate(startDate, 'startDate');
  const defaultEnd = new Date(start + 2 * DAY_MS).toISOString().slice(0, 10);
  const endDate = input.endDate === undefined ? defaultEnd : input.endDate;
  calculatePlannerDays(startDate, endDate);

  const adults = count(input.adults, 1, 1, 'adults');
  const children = count(input.children, 0, 0, 'children');
  if (!Number.isSafeInteger(adults + children)) {
    throw new HttpError(400, 'Tổng số khách vượt giới hạn số nguyên an toàn.', 'INVALID_PLANNER_COUNT');
  }
  const totalBudget = input.totalBudget === undefined ? 5_000_000 : input.totalBudget;
  if (typeof totalBudget !== 'number' || !Number.isFinite(totalBudget) || totalBudget <= 0) {
    throw new HttpError(400, 'totalBudget phải là số hữu hạn lớn hơn 0 (VND cho cả nhóm).', 'INVALID_PLANNER_BUDGET');
  }
  // Defaults apply only when missing. Known legacy modes require an explicit new choice.
  const transportation = input.transportation === undefined ? 'car' : input.transportation;
  const pacing = input.pacing === undefined ? 'balanced' : input.pacing;
  if (!['flight', 'car', 'train', 'motorbike'].includes(transportation as string)) {
    throw new HttpError(400, 'Phương tiện không hợp lệ.', 'INVALID_PLANNER_TRANSPORTATION');
  }
  if (!['relaxed', 'balanced', 'packed'].includes(pacing as string)) {
    throw new HttpError(400, 'Nhịp độ không hợp lệ.', 'INVALID_PLANNER_PACING');
  }
  if (transportation !== 'car' && transportation !== 'motorbike') {
    throw new HttpError(400,
      'Planner mới chỉ hỗ trợ car hoặc motorbike để ước lượng thời gian giữa các điểm; chưa hỗ trợ flight/train hay chặng liên tỉnh. Hãy chọn lại phương tiện.',
      'UNSUPPORTED_PLANNER_TRANSPORTATION');
  }
  if (pacing !== 'balanced') {
    throw new HttpError(400,
      'Planner mới chỉ hỗ trợ balanced: tối đa 2 điểm tham quan/ngày, không tính bữa ăn. Hãy chọn lại nhịp độ.',
      'UNSUPPORTED_PLANNER_PACING');
  }
  const mandatoryPlaceIds = input.mandatoryPlaceIds === undefined ? [] : input.mandatoryPlaceIds;
  if (!Array.isArray(mandatoryPlaceIds)) {
    throw new HttpError(400, 'mandatoryPlaceIds phải là một danh sách Place ID.', 'INVALID_MANDATORY_PLACE_IDS');
  }
  return {
    departureCity, destinationCity, startDate: startDate as string, endDate: endDate as string,
    adults, children, totalBudget,
    transportation: transportation as PlannerInput['transportation'],
    pacing: pacing as PlannerInput['pacing'],
    preferences: validateTravelPreferences(input.preferences),
    mandatoryPlaceIds,
  };
}
