import type { GeneratedItinerary } from '../types';

export function removePlannerActivity(itinerary: GeneratedItinerary, dayNumber: number, activityId: string): GeneratedItinerary {
  const days = itinerary.days.map((day) => {
    if (day.dayNumber !== dayNumber) return day;
    const activities = day.activities.filter((activity) => activity.id !== activityId);
    // A hotel marker has zero activity cost; lodging is independent of stop edits.
    // Preserve any unitemized subtotal for older, unversioned in-memory responses.
    const lodging = day.lodgingEstimatedCostVND ?? Math.max(0, day.dayEstimatedCostVND -
      day.activities.reduce((sum, activity) => sum + activity.estimatedCostVND, 0));
    const dayEstimatedCostVND = activities.reduce((sum, activity) => sum + activity.estimatedCostVND, 0) + lodging;
    return { ...day, activities, dayEstimatedCostVND };
  });
  const totalEstimatedCostVND = days.reduce((sum, day) => sum + day.dayEstimatedCostVND, 0);
  const costDifferenceVND = itinerary.totalBudgetUserVND - totalEstimatedCostVND;
  const amount = new Intl.NumberFormat('vi-VN').format(Math.abs(costDifferenceVND));
  const budgetAdvice = costDifferenceVND >= 0
    ? `Chi phí ước tính cho cả nhóm nằm trong ngân sách; còn khoảng ${amount}đ. Giá thực tế và khoản chưa tính có thể khác.`
    : `Chi phí ước tính cho cả nhóm vượt ngân sách khoảng ${amount}đ; hãy kiểm tra các khoản và giá thực tế.`;
  return { ...itinerary, days, totalEstimatedCostVND, costDifferenceVND, budgetAdvice,
    overBudgetVND: Math.max(0, -costDifferenceVND),
    constraintViolations: costDifferenceVND < 0 ? ['BUDGET_EXCEEDED'] : [],
    budgetStatus: costDifferenceVND >= 0 ? 'within_budget' : 'over_budget' };
}

export function movePlannerActivity(itinerary: GeneratedItinerary, dayNumber: number, index: number, direction: 'up' | 'down'): GeneratedItinerary {
  const day = itinerary.days.find((item) => item.dayNumber === dayNumber);
  if (!day) return itinerary;
  const next = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || index >= day.activities.length || next < 0 || next >= day.activities.length) return itinerary;
  const activities = [...day.activities];
  [activities[index], activities[next]] = [activities[next], activities[index]];
  return { ...itinerary, days: itinerary.days.map((item) => item.dayNumber === dayNumber ? { ...item, activities } : item) };
}
