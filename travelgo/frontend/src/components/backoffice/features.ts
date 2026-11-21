// Cờ chức năng back-office (Gói E giữ file này).
// Mỗi cờ ứng với một nhóm API ĐỀ XUẤT trong docs/web-team/PROPOSED_API_CONTRACTS.md (PAC) chưa có ở backend thật.
// Mặc định TẮT: trang hiện ApiPendingState, không có dữ liệu mẫu.
// Chỉ bật (sửa giá trị bên dưới) khi backend thật + migration đã được duyệt và chạy trên DB SYNTHETIC.
//
// Riêng khi DỰNG GIAO DIỆN với mock cục bộ, có thể bật tạm bằng biến môi trường lúc chạy Vite:
//   VITE_BO_FEATURES=all            (bật tất cả)
//   VITE_BO_FEATURES=cms,adminUsers (bật từng cờ)
// Không dùng biến này khi nghiệm thu.

export const BO_FEATURE_DEFAULTS = {
  /** PAC §1 — GET/PATCH /admin/users */
  adminUsers: false,
  /** PAC §2 — /admin/cms/* (banner, sections, featured) */
  cms: false,
  /** PAC §4.2 — GET /admin/promotions, POST /admin/promotions/:id/suspend */
  adminPromotions: false,
  /** PAC §3 — GET/PATCH /admin/settings */
  settings: false,
  /** PAC §8 — GET /admin/businesses/:id, /admin/businesses/:businessId/bookings */
  adminBusinessDetail: false,
  /** PAC §8 — GET /admin/bookings nhận status/search/from/to/placeId/businessId */
  adminBookingFilters: false,
  /** PAC §4.1 — GET /partner/hotels/:id/promotions (Gói F) */
  partnerPromotions: false,
  /** PAC §5 — /partner/reviews (Gói F) */
  partnerReviews: false,
  /** PAC §7 — thông báo in-app */
  notifications: false,
};

export type BoFeature = keyof typeof BO_FEATURE_DEFAULTS;

export const BO_FEATURE_CONTRACT: Record<BoFeature, string> = {
  adminUsers: 'PAC §1',
  cms: 'PAC §2',
  adminPromotions: 'PAC §4.2',
  settings: 'PAC §3',
  adminBusinessDetail: 'PAC §8',
  adminBookingFilters: 'PAC §8',
  partnerPromotions: 'PAC §4.1',
  partnerReviews: 'PAC §5',
  notifications: 'PAC §7',
};

function readOverride(): Set<string> {
  const raw = String((import.meta as any).env?.VITE_BO_FEATURES || '').trim();
  if (!raw) return new Set();
  if (raw === 'all') return new Set(Object.keys(BO_FEATURE_DEFAULTS));
  return new Set(raw.split(',').map((item) => item.trim()).filter(Boolean));
}

const override = readOverride();

export const BO_FEATURES: Record<BoFeature, boolean> = Object.fromEntries(
  (Object.keys(BO_FEATURE_DEFAULTS) as BoFeature[]).map((key) => [key, BO_FEATURE_DEFAULTS[key] || override.has(key)]),
) as Record<BoFeature, boolean>;

export const isBoFeatureOn = (key: BoFeature) => BO_FEATURES[key];
