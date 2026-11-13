import { Booking, BlogPost, Business, BusinessMember, Place, Ticket, Tour } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';

export class PartnerService {
  static async getBusinesses(userId: string) {
    const memberships = await BusinessMember.findAll({ where: { userId }, attributes: ['businessId', 'permissions'] });
    const businesses = await Business.findAll({ where: { id: memberships.map((membership) => membership.businessId) } });
    return businesses.map((business) => ({
      ...business.toJSON(),
      permissions: memberships.find((membership) => membership.businessId === business.id)?.permissions || [],
    }));
  }

  static async getBusiness(userId: string, businessId: string) {
    const membership = await BusinessMember.findOne({ where: { userId, businessId } });
    if (!membership) throw new HttpError(403, 'Bạn không có quyền truy cập cơ sở này', 'BUSINESS_ACCESS_DENIED');
    const business = await Business.findByPk(businessId);
    if (!business) throw new HttpError(404, 'Không tìm thấy cơ sở kinh doanh', 'BUSINESS_NOT_FOUND');
    return { ...business.toJSON(), permissions: membership.permissions };
  }

  static async getDashboard(userId: string, businessId?: string) {
    const businesses = await this.getBusinesses(userId);
    const selected = businessId ? businesses.find((business) => business.id === businessId) : businesses[0];
    if (businessId && !selected) throw new HttpError(403, 'Bạn không có quyền truy cập cơ sở này', 'BUSINESS_ACCESS_DENIED');
    if (!selected) return { businesses: [], selectedBusiness: null, metrics: null };
    const [totalBookings, pendingBookings, confirmedBookings, completedBookings, revenue, places, tours, tickets, blogs] = await Promise.all([
      Booking.count({ where: { businessId: selected.id } }),
      Booking.count({ where: { businessId: selected.id, bookingStatus: 'PENDING' } }),
      Booking.count({ where: { businessId: selected.id, bookingStatus: 'CONFIRMED' } }),
      Booking.count({ where: { businessId: selected.id, bookingStatus: 'COMPLETED' } }),
      Booking.sum('totalAmount', { where: { businessId: selected.id, bookingStatus: 'COMPLETED' } }),
      Place.count({ where: { businessId: selected.id } }),
      Tour.count({ where: { businessId: selected.id } }),
      Ticket.count({ where: { businessId: selected.id } }),
      BlogPost.count({ where: { businessId: selected.id } }),
    ]);
    return { businesses, selectedBusiness: selected, metrics: { totalBookings, pendingBookings, confirmedBookings, completedBookings, revenue: Number(revenue || 0), places, tours, tickets, blogs, source: 'DATABASE' } };
  }

  static async getBookings(userId: string, businessId: string, page = 1, limit = 20) {
    await this.getBusiness(userId, businessId);
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const result = await Booking.findAndCountAll({
      where: { businessId },
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    });
    return { items: result.rows, total: result.count, page: safePage, limit: safeLimit };
  }
}
