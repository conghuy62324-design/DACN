// Service mỏng cho API ĐỀ XUẤT của kênh Partner (docs/web-team/PROPOSED_API_CONTRACTS.md).
// Chỉ gọi khi cờ BO_FEATURES tương ứng bật (partnerPromotions — PAC §4.1, partnerReviews — PAC §5).
// Không sửa service cũ; dùng chung client `api`.
import { api } from './api';

export interface PartnerReview {
  id: string;
  targetType: string;
  targetId: string;
  placeName?: string;
  userName?: string;
  rating: number;
  comment: string;
  verificationStatus?: string;
  createdAt: string;
  reply: { text: string; repliedAt: string; repliedBy?: string } | null;
}

export interface PartnerReviewPage {
  items: PartnerReview[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  summary?: { count: number; average: number | null; unreplied: number };
}

export const PartnerBackofficeService = {
  /** PAC §4.1 — GET /partner/hotels/:id/promotions */
  async hotelPromotions(hotelId: string, params: { status?: string; effective?: string } = {}): Promise<{ items: any[]; total: number; revision?: number }> {
    const response: any = await api.get(`/partner/hotels/${hotelId}/promotions`, { params });
    return response.data;
  },
  /** PAC §5.1 — GET /partner/reviews */
  async reviews(params: { businessId: string; placeId?: string; replied?: string; minRating?: number; page?: number; limit?: number }): Promise<PartnerReviewPage> {
    const response: any = await api.get('/partner/reviews', { params });
    return response.data;
  },
  /** PAC §5.2 — PUT /partner/reviews/:id/reply */
  async reply(id: string, text: string): Promise<PartnerReview> {
    const response: any = await api.put(`/partner/reviews/${id}/reply`, { text });
    return response.data;
  },
  /** PAC §5.2 — DELETE /partner/reviews/:id/reply */
  async deleteReply(id: string): Promise<PartnerReview> {
    const response: any = await api.delete(`/partner/reviews/${id}/reply`);
    return response.data;
  },
};
