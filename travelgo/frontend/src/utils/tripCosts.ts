import type { TripSession } from '../types';

/** Display stored estimates. Never infer a legacy unit, night count, or reprice totals. */
export function tripCostView(trip: Pick<TripSession, 'costBasis' | 'nightsCount' | 'totalEstimatedCostVND' | 'totalBudgetUserVND' | 'costAssumptions' | 'pacing' | 'transportation'>) {
  const isGroup = trip.costBasis === 'GROUP_VND_V1';
  return {
    isGroup,
    nights: trip.nightsCount,
    total: trip.totalEstimatedCostVND,
    budget: trip.totalBudgetUserVND,
    assumptions: Array.isArray(trip.costAssumptions) ? trip.costAssumptions : [],
    label: isGroup ? 'Chi phí ước tính VND cho cả nhóm; không phải giá booking được bảo đảm.'
      : 'Chi phí bản cũ chưa xác nhận đơn vị. Giữ nguyên số tiền đã lưu, chưa hỗ trợ sửa itinerary hoặc chuyển đơn vị tự động.',
    pacing: ({ relaxed: 'Thư giãn (đã lưu)', balanced: 'Cân bằng', packed: 'Khám phá nhiều (đã lưu)' } as Record<string, string>)[trip.pacing] || 'Chưa lưu',
    transportation: ({ car: 'Ô tô', motorbike: 'Xe máy', flight: 'Máy bay (đã lưu)', train: 'Tàu hỏa (đã lưu)' } as Record<string, string>)[trip.transportation || ''] || 'Chưa lưu',
  };
}
