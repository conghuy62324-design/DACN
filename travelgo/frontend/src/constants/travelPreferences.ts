export const PREFERENCE_OPTIONS = [
  { id: 'bien', label: 'Du lịch biển' },
  { id: 'thien-nhien', label: 'Khám phá thiên nhiên' },
  { id: 'van-hoa', label: 'Văn hóa & Lịch sử' },
  { id: 'am-thuc', label: 'Ẩm thực' },
  { id: 'nghi-duong', label: 'Nghỉ dưỡng' },
  { id: 'check-in', label: 'Check-in chụp ảnh' },
  { id: 'phieu-luu', label: 'Phiêu lưu mạo hiểm' },
  { id: 'mua-sam', label: 'Mua sắm & Giải trí' },
] as const;

export type TravelPreferenceId = typeof PREFERENCE_OPTIONS[number]['id'];

export const preferenceLabel = (id: string): string =>
  PREFERENCE_OPTIONS.find((option) => option.id === id)?.label || id;
