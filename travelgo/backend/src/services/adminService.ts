import { Op } from 'sequelize';
import { AuditLog, BlogPost, Booking, Business, PartnerApplication, Place, Tour, User, UserRole } from '../models/index.js';

export class AdminService {
  static async getDashboard() {
    const [totalUsers, totalCustomers, totalPartners, pendingPartners, totalBusinesses, totalHotels, totalRestaurants, totalPlaces, totalTours, totalBookings, pendingBookings, confirmedBookings, completedBookings, cancelledBookings, rejectedBookings, revenue, recentActivity] = await Promise.all([
      User.count(),
      UserRole.count({ where: { role: 'CUSTOMER' } }),
      UserRole.count({ where: { role: 'PARTNER' } }),
      PartnerApplication.count({ where: { status: 'PENDING' } }),
      Business.count(),
      Business.count({ where: { type: { [Op.in]: ['HOTEL', 'HOMESTAY', 'RESORT'] } } }),
      Business.count({ where: { type: 'RESTAURANT' } }),
      Place.count(),
      Tour.count(),
      Booking.count(),
      Booking.count({ where: { bookingStatus: 'PENDING' } }),
      Booking.count({ where: { bookingStatus: 'CONFIRMED' } }),
      Booking.count({ where: { bookingStatus: 'COMPLETED' } }),
      Booking.count({ where: { bookingStatus: 'CANCELLED' } }),
      Booking.count({ where: { bookingStatus: 'REJECTED' } }),
      Booking.sum('totalAmount', { where: { bookingStatus: { [Op.ne]: 'CANCELLED' } } }),
      AuditLog.findAll({ limit: 8, order: [['createdAt', 'DESC']] }),
    ]);
    return {
      totalUsers,
      totalCustomers,
      totalPartners,
      pendingPartners,
      totalBusinesses,
      totalHotels,
      totalRestaurants,
      totalPlaces,
      totalTours,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      rejectedBookings,
      totalRevenue: Number(revenue || 0),
      pendingPlaces: await Place.count({ where: { status: 'PENDING' } }),
      pendingTours: await Tour.count({ where: { status: 'PENDING' } }),
      pendingBlogs: await BlogPost.count({ where: { status: 'PENDING' } }),
      recentActivity,
      source: 'DATABASE',
    };
  }

  static async getBusinesses(page: number, limit: number) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const result = await Business.findAndCountAll({ limit: safeLimit, offset: (safePage - 1) * safeLimit, order: [['createdAt', 'DESC']] });
    return { items: result.rows, total: result.count, page: safePage, limit: safeLimit };
  }

  static async getBookings(page: number, limit: number) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const result = await Booking.findAndCountAll({ limit: safeLimit, offset: (safePage - 1) * safeLimit, order: [['createdAt', 'DESC']] });
    return { items: result.rows, total: result.count, page: safePage, limit: safeLimit };
  }
}
