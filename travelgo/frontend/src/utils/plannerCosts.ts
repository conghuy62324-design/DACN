import type { GeneratedItinerary, ItineraryActivity } from '../types';

type CostedItinerary = Pick<GeneratedItinerary, 'days' | 'totalBudgetUserVND' | 'totalEstimatedCostVND'>;
const sumMoney = (amounts: number[]) => amounts.reduce((sum, amount) => sum + Math.round(amount * 100), 0) / 100;
const selectedIds = (days: CostedItinerary['days']) => [...new Set(days.flatMap(day =>
  day.activities.map(activity => activity.placeId).filter((id): id is string => Boolean(id))))];

/** Existing planner markers survive Trip JSON snapshots; older unknown markers
 * are not guessed from category or price. This is UI protection, not server auth. */
export function isMandatoryPlannerActivity(activity: ItineraryActivity): boolean {
  return Boolean(activity.placeId) && [
    'Địa điểm bắt buộc do bạn chọn từ trang chi tiết.',
    'Nhà hàng bắt buộc do bạn chọn từ trang chi tiết.',
    'Khách sạn do bạn chọn. Phí lưu trú ước tính nằm ở mục riêng của ngày; không phải xác nhận đặt phòng.',
  ].includes(activity.recommendationReason ?? '');
}

export function removePlannerActivity<T extends CostedItinerary>(itinerary: T, dayNumber: number, activityId: string): T {
  const target = itinerary.days.find(day => day.dayNumber === dayNumber)?.activities.find(activity => activity.id === activityId);
  if (target && isMandatoryPlannerActivity(target)) return itinerary;
  const days = itinerary.days.map((day) => {
    if (day.dayNumber !== dayNumber) return day;
    const activities = day.activities.filter((activity) => activity.id !== activityId);
    // A hotel marker has zero activity cost; lodging is independent of stop edits.
    // Preserve any unitemized subtotal for older, unversioned in-memory responses.
    const lodging = day.lodgingEstimatedCostVND ?? Math.max(0, day.dayEstimatedCostVND -
      day.activities.reduce((sum, activity) => sum + activity.estimatedCostVND, 0));
    const dayEstimatedCostVND = sumMoney([...activities.map(activity => activity.estimatedCostVND), lodging]);
    return { ...day, activities, dayEstimatedCostVND };
  });
  const totalEstimatedCostVND = sumMoney(days.map(day => day.dayEstimatedCostVND));
  const costDifferenceVND = Math.round((itinerary.totalBudgetUserVND - totalEstimatedCostVND) * 100) / 100;
  const amount = new Intl.NumberFormat('vi-VN').format(Math.abs(costDifferenceVND));
  const budgetAdvice = costDifferenceVND >= 0
    ? `Chi phí ước tính cho cả nhóm nằm trong ngân sách; còn khoảng ${amount}đ. Giá thực tế và khoản chưa tính có thể khác.`
    : `Chi phí ước tính cho cả nhóm vượt ngân sách khoảng ${amount}đ; hãy kiểm tra các khoản và giá thực tế.`;
  return { ...itinerary, days, totalEstimatedCostVND, costDifferenceVND, budgetAdvice,
    selectedPlaceIds: selectedIds(days),
    overBudgetVND: Math.max(0, -costDifferenceVND),
    constraintViolations: costDifferenceVND < 0 ? ['BUDGET_EXCEEDED'] : [],
    budgetStatus: costDifferenceVND >= 0 ? 'within_budget' : 'over_budget' };
}

export function movePlannerActivity<T extends CostedItinerary>(itinerary: T, dayNumber: number, index: number, direction: 'up' | 'down'): T {
  const day = itinerary.days.find((item) => item.dayNumber === dayNumber);
  if (!day) return itinerary;
  const next = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= day.activities.length || next < 0 || next >= day.activities.length) return itinerary;
  const activities = [...day.activities];
  [activities[index], activities[next]] = [activities[next], activities[index]];
  const days = itinerary.days.map((item) => item.dayNumber === dayNumber ? { ...item, activities } : item);
  return { ...itinerary, days, selectedPlaceIds: selectedIds(days) };
}
