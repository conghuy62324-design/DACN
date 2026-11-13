export const PLANNER_TRANSPORT_OPTIONS = [
  { value: 'car', label: 'Ô tô' },
  { value: 'motorbike', label: 'Xe máy' },
] as const;

export const BALANCED_PACING_DESCRIPTION = 'Tối đa 2 điểm tham quan/ngày, không tính bữa ăn.';

/** Preserve explicit legacy values; only missing fields receive defaults. */
export function initialPlannerModes(source: unknown): { pacing: unknown; transportation: unknown } {
  const value = source && typeof source === 'object' && !Array.isArray(source)
    ? source as Record<string, unknown> : {};
  return {
    pacing: value.pacing === undefined ? 'balanced' : value.pacing,
    transportation: value.transportation === undefined ? 'car' : value.transportation,
  };
}

type ModeSelection =
  | { valid: true; pacing: 'balanced'; transportation: 'car' | 'motorbike' }
  | { valid: false; message: string };

const display = (value: unknown) => typeof value === 'string' && value ? value : 'không hợp lệ';

export function validatePlannerModes(pacing: unknown, transportation: unknown): ModeSelection {
  if (pacing !== 'balanced') {
    return { valid: false,
      message: `Nhịp độ ${display(pacing)} của dữ liệu cũ chưa được hỗ trợ khi tạo lịch mới. Hãy chọn Cân bằng: tối đa 2 điểm tham quan/ngày, không tính bữa ăn.` };
  }
  if (transportation !== 'car' && transportation !== 'motorbike') {
    return { valid: false,
      message: `Phương tiện ${display(transportation)} chưa được hỗ trợ khi tạo lịch mới. Hãy chọn Ô tô hoặc Xe máy để ước lượng ETA giữa các điểm; chưa tính chặng và chi phí liên tỉnh.` };
  }
  return { valid: true, pacing, transportation };
}
