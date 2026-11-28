import { api } from './api';

// Service mỏng cho khu Admin (Gói E). Không sửa service cũ.
// Nhóm 1 — API ĐÃ CÓ ở backend (routes/*.ts): businesses, bookings, reviews queue, admin hotels.
// Nhóm 2 — API ĐỀ XUẤT (PAC): chỉ gọi khi cờ BO_FEATURES tương ứng bật.

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages?: number;
}

const data = (response: any) => response?.data;

export const AdminBackofficeService = {
  // ---------- API đã có ----------
  /** GET /admin/partner-applications?status&page&limit (cùng endpoint PlatformService.getPartnerApplications, thêm phân trang) */
  async partnerApplications(status: string | undefined, page: number, limit: number): Promise<Paged<any>> {
    return data(await api.get('/admin/partner-applications', { params: { ...(status ? { status } : {}), page, limit } }));
  },

  /** GET /admin/businesses?page&limit (chưa có tìm/lọc phía server) */
  async businesses(page: number, limit: number): Promise<Paged<any>> {
    return data(await api.get('/admin/businesses', { params: { page, limit } }));
  },

  /** GET /admin/bookings?page&limit (chưa có lọc phía server; khi cờ adminBookingFilters bật thì gửi thêm filters) */
  async bookings(page: number, limit: number, filters: Record<string, string> = {}): Promise<Paged<any>> {
    return data(await api.get('/admin/bookings', { params: { page, limit, ...filters } }));
  },

  /** GET /bookings/:code (SUPER_ADMIN) */
  async bookingByCode(code: string): Promise<any> {
    return data(await api.get(`/bookings/${encodeURIComponent(code)}`));
  },

  /** PATCH /bookings/:id/status {status:'CANCELLED', reason} — xử lý ngoại lệ, chỉ hủy. */
  async cancelBooking(id: string, reason: string): Promise<any> {
    return data(await api.patch(`/bookings/${id}/status`, { status: 'CANCELLED', reason }));
  },

  /** GET /reviews/moderation-queue → [{id,targetId,comment,moderationStatus,reports}] (≤100) */
  async reviewQueue(): Promise<any[]> {
    const out = data(await api.get('/reviews/moderation-queue'));
    return Array.isArray(out) ? out : out?.items || [];
  },

  /** PATCH /reviews/:id/moderation {status, reason} */
  async moderateReview(id: string, status: 'PUBLISHED' | 'HIDDEN' | 'REJECTED', reason?: string): Promise<any> {
    return data(await api.patch(`/reviews/${id}/moderation`, reason ? { status, reason } : { status }));
  },

  /** GET /admin/hotels → [{id,name,status,contentVersion,approvedContentVersion,commercialVersion,businessName}] */
  async adminHotels(): Promise<any[]> {
    const out = data(await api.get('/admin/hotels'));
    return Array.isArray(out) ? out : out?.items || [];
  },

  /** GET /hotels (công khai, chỉ khách sạn đủ điều kiện công khai) — dùng chọn khách sạn nổi bật. */
  async publicHotels(nameOrAddress: string, limit = 20): Promise<any[]> {
    const params: Record<string, unknown> = { limit };
    if (nameOrAddress.trim()) params.nameOrAddress = nameOrAddress.trim();
    const out = data(await api.get('/hotels', { params }));
    return Array.isArray(out) ? out : out?.items || [];
  },

  // ---------- API đề xuất (PAC) — sau cờ BO_FEATURES ----------
  /** PAC §8 */
  async businessDetail(id: string): Promise<any> {
    return data(await api.get(`/admin/businesses/${id}`));
  },
  async businessBookings(id: string, limit = 10): Promise<Paged<any>> {
    return data(await api.get(`/admin/businesses/${id}/bookings`, { params: { page: 1, limit } }));
  },

  /** PAC §1 */
  async users(params: Record<string, string | number>): Promise<Paged<any>> {
    return data(await api.get('/admin/users', { params }));
  },
  async user(id: string): Promise<any> {
    return data(await api.get(`/admin/users/${id}`));
  },
  async setUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', reason: string, version: number): Promise<any> {
    return data(await api.patch(`/admin/users/${id}/status`, { status, reason, version }));
  },
  async setUserRoles(id: string, roles: string[], reason: string, version: number): Promise<any> {
    return data(await api.patch(`/admin/users/${id}/roles`, { roles, reason, version }));
  },

  /** PAC §2.1 */
  async banners(status?: string): Promise<{ items: any[]; total: number }> {
    return data(await api.get('/admin/cms/banners', { params: status ? { status } : undefined }));
  },
  async banner(id: string): Promise<any> {
    return data(await api.get(`/admin/cms/banners/${id}`));
  },
  async createBanner(input: Record<string, unknown>): Promise<any> {
    return data(await api.post('/admin/cms/banners', input));
  },
  async updateBanner(id: string, input: Record<string, unknown>): Promise<any> {
    return data(await api.put(`/admin/cms/banners/${id}`, input));
  },
  async publishBanner(id: string, version: number, startsAt?: string | null, endsAt?: string | null): Promise<any> {
    const body: Record<string, unknown> = { version };
    if (startsAt) body.startsAt = startsAt;
    if (endsAt) body.endsAt = endsAt;
    return data(await api.post(`/admin/cms/banners/${id}/publish`, body));
  },
  async unpublishBanner(id: string, version: number, reason?: string): Promise<any> {
    return data(await api.post(`/admin/cms/banners/${id}/unpublish`, reason ? { version, reason } : { version }));
  },
  async restoreBanner(id: string, revision: number, version: number): Promise<any> {
    return data(await api.post(`/admin/cms/banners/${id}/restore`, { revision, version }));
  },
  async orderBanners(items: { id: string; version: number }[]): Promise<any> {
    return data(await api.put('/admin/cms/banners/order', { items }));
  },
  async archiveBanner(id: string, version: number, reason?: string): Promise<any> {
    return data(await api.delete(`/admin/cms/banners/${id}`, { data: { version, reason: reason || 'Archive reviewed banner' } }));
  },

  /** PAC §2.2 */
  async sections(): Promise<{ items: any[] }> {
    return data(await api.get('/admin/cms/sections'));
  },
  async patchSection(key: string, input: Record<string, unknown>): Promise<any> {
    return data(await api.patch(`/admin/cms/sections/${key}`, input));
  },
  async orderSections(items: { id: string; version: number }[]): Promise<any> {
    return data(await api.put('/admin/cms/sections/order', { items }));
  },

  /** PAC §2.3 */
  async featuredHotels(): Promise<{ items: any[]; version: number }> {
    return data(await api.get('/admin/cms/featured-hotels'));
  },
  async saveFeaturedHotels(placeIds: string[], version: number): Promise<any> {
    return data(await api.put('/admin/cms/featured-hotels', { placeIds, version }));
  },

  /** PAC §4.2 */
  async promotions(params: Record<string, string | number>): Promise<Paged<any>> {
    return data(await api.get('/admin/promotions', { params }));
  },
  async suspendPromotion(id: string, reason: string, revision: number): Promise<any> {
    return data(await api.post(`/admin/promotions/${id}/suspend`, { reason }, { headers: { 'If-Match': String(revision) } }));
  },

  /** PAC §3.1 */
  async settings(): Promise<any> {
    return data(await api.get('/admin/settings'));
  },
  async saveSettings(input: Record<string, unknown>): Promise<any> {
    return data(await api.patch('/admin/settings', input));
  },
};
