// Nhãn tiếng Việt + tone cho mã trạng thái (spec back-office 1.4). Mã lạ → neutral, hiện mã gốc.

export type StatusDomain =
  | 'moderation'
  | 'booking'
  | 'partnerApp'
  | 'user'
  | 'cms'
  | 'media'
  | 'promotion'
  | 'review'
  | 'business'
  | 'room'
  | 'rate';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'archived';

export interface StatusMeta {
  label: string;
  tone: StatusTone;
  /** true khi cần icon AlertCircle 12 (NEEDS_MORE_INFO) */
  alert?: boolean;
  known: boolean;
}

const BASE: Record<string, [string, StatusTone]> = {
  PENDING: ['Chờ duyệt', 'warning'],
  NEEDS_MORE_INFO: ['Cần bổ sung', 'warning'],
  APPROVED: ['Đã duyệt', 'success'],
  REJECTED: ['Bị từ chối', 'danger'],
  SUSPENDED: ['Tạm ngưng', 'danger'],
  DRAFT: ['Bản nháp', 'neutral'],
  SCHEDULED: ['Đã lên lịch', 'info'],
  PUBLISHED: ['Đang hiển thị', 'success'],
  HIDDEN: ['Đã ẩn', 'neutral'],
  ARCHIVED: ['Đã lưu trữ', 'archived'],
  ACTIVE: ['Hoạt động', 'success'],
  CONFIRMED: ['Đã xác nhận', 'info'],
  COMPLETED: ['Hoàn thành', 'success'],
  CANCELLED: ['Đã hủy', 'neutral'],
  RUNNING: ['Đang hiệu lực', 'success'],
  UPCOMING: ['Sắp diễn ra', 'info'],
  EXPIRED: ['Hết hạn', 'neutral'],
  VERIFIED: ['Đã lưu trú', 'info'],
};

const OVERRIDES: Partial<Record<StatusDomain, Record<string, string>>> = {
  booking: { PENDING: 'Chờ xác nhận', REJECTED: 'Đã từ chối' },
  promotion: { ARCHIVED: 'Đã kết thúc', ACTIVE: 'Đang áp dụng' },
  room: { ACTIVE: 'Đang áp dụng' },
  rate: { ACTIVE: 'Đang áp dụng' },
};

export function statusMeta(status: string | null | undefined, domain?: StatusDomain): StatusMeta {
  const code = String(status ?? '').trim();
  const key = code.toUpperCase();
  const base = BASE[key];
  if (!base) return { label: code || '—', tone: 'neutral', known: false };
  const label = (domain && OVERRIDES[domain]?.[key]) || base[0];
  return { label, tone: base[1], alert: key === 'NEEDS_MORE_INFO', known: true };
}

export const statusLabel = (status: string | null | undefined, domain?: StatusDomain) => statusMeta(status, domain).label;

const PAYMENT: Record<string, string> = {
  UNPAID: 'Chưa thanh toán',
  PAID: 'Đã thanh toán',
  REFUNDED: 'Đã hoàn tiền',
};

/** Thanh toán chỉ hiện dạng chữ, không pill, không nút đổi. */
export function paymentLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return PAYMENT[String(code).toUpperCase()] || String(code);
}

const ROLE: Record<string, string> = {
  CUSTOMER: 'Khách hàng',
  PARTNER: 'Đối tác',
  SUPER_ADMIN: 'Quản trị viên',
};

export const roleLabel = (role: string) => ROLE[role] || role;

const BUSINESS_TYPE: Record<string, string> = {
  HOTEL: 'Khách sạn',
  HOMESTAY: 'Homestay',
  RESORT: 'Khu nghỉ dưỡng',
  RESTAURANT: 'Nhà hàng',
  TOUR_OPERATOR: 'Đơn vị lữ hành',
};

export const businessTypeLabel = (type: string | null | undefined) => (type ? BUSINESS_TYPE[type] || type.replace(/_/g, ' ') : '—');

const ENTITY: Record<string, string> = {
  Booking: 'Booking',
  PartnerApplication: 'Hồ sơ đối tác',
  Place: 'Địa điểm',
  Tour: 'Tour',
  TourPackage: 'Tour',
  BlogPost: 'Bài viết',
  Review: 'Đánh giá',
  Business: 'Doanh nghiệp',
  User: 'Người dùng',
  Hotel: 'Khách sạn',
  HotelProfile: 'Khách sạn',
  Banner: 'Banner',
  Promotion: 'Ưu đãi',
};

export const entityLabel = (type: string | null | undefined) => (type ? ENTITY[type] || type : '');

const ACTION_EXACT: Record<string, string> = {
  BOOKING_CANCELLED: 'Hủy booking',
  PARTNER_APPLICATION_APPROVED: 'Duyệt hồ sơ đối tác',
  HOTEL_BOOKING_CREATED: 'Tạo đặt phòng',
  REVIEW_DELETED: 'Xóa đánh giá',
  submit: 'Gửi duyệt',
  moderate: 'Quyết định kiểm duyệt',
};

const ACTION_NOUN: [string, string][] = [
  ['PARTNER_APPLICATION_', 'hồ sơ đối tác'],
  ['HOTEL_BOOKING_', 'đặt phòng'],
  ['HOTEL_MEDIA_', 'ảnh khách sạn'],
  ['HOTEL_', 'khách sạn'],
  ['BOOKING_', 'booking'],
  ['PLACE_', 'địa điểm'],
  ['TOUR_', 'tour'],
  ['BLOG_', 'bài viết'],
  ['REVIEW_', 'đánh giá'],
  ['USER_', 'tài khoản'],
  ['BUSINESS_', 'doanh nghiệp'],
  ['BANNER_', 'banner'],
  ['PROMOTION_', 'ưu đãi'],
];

const ACTION_VERB: Record<string, string> = {
  APPROVED: 'Duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Hủy',
  CONFIRMED: 'Xác nhận',
  COMPLETED: 'Hoàn thành',
  SUSPENDED: 'Tạm ngưng',
  NEEDS_MORE_INFO: 'Yêu cầu bổ sung',
  DRAFT: 'Chuyển về nháp',
  PUBLISHED: 'Hiển thị',
  HIDDEN: 'Ẩn',
  DELETED: 'Xóa',
  CREATED: 'Tạo',
  UPDATED: 'Cập nhật',
  SUBMITTED: 'Gửi duyệt',
  PENDING: 'Chuyển chờ duyệt',
  ACTIVE: 'Kích hoạt',
  ARCHIVED: 'Lưu trữ',
  ROLES_CHANGED: 'Đổi vai trò',
};

/** Đổi mã hành động audit → nhãn tiếng Việt. Mã chưa có nhãn: đổi "_" thành khoảng trắng. */
export function actionLabel(action: string | null | undefined): string {
  const code = String(action ?? '').trim();
  if (!code) return '—';
  if (ACTION_EXACT[code]) return ACTION_EXACT[code];
  const upper = code.toUpperCase();
  for (const [prefix, noun] of ACTION_NOUN) {
    if (upper.startsWith(prefix)) {
      const verb = ACTION_VERB[upper.slice(prefix.length)];
      if (verb) return `${verb} ${noun}`;
    }
  }
  if (ACTION_VERB[upper]) return ACTION_VERB[upper];
  if (BASE[upper]) return BASE[upper][0];
  return code.replace(/_/g, ' ');
}
