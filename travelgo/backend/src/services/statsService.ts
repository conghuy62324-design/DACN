import { Op } from 'sequelize';
import { BlogPost, Booking, Place } from '../models/index.js';
import { serializePlace } from './placeService.js';

export class StatsService {
  static async getDashboardStats() {
    const [totalRevenue, totalBookings, totalPlaces, totalBlogs, pendingBookings, confirmedBookings, recentBookings, popularPlaces] = await Promise.all([
      Booking.sum('totalAmount', { where: { bookingStatus: { [Op.ne]: 'CANCELLED' } } }),
      Booking.count(),
      Place.count({ where: { status: 'APPROVED' } }),
      BlogPost.count({ where: { status: 'APPROVED' } }),
      Booking.count({ where: { bookingStatus: 'PENDING' } }),
      Booking.count({ where: { bookingStatus: 'CONFIRMED' } }),
      Booking.findAll({ limit: 5, order: [['createdAt', 'DESC']] }),
      Place.findAll({ where: { status: 'APPROVED' }, limit: 5, order: [['bayesianRating', 'DESC']] }),
    ]);
    return {
      overview: { totalRevenue: Number(totalRevenue || 0), totalBookings, totalPlaces, totalBlogs, pendingBookings, confirmedBookings },
      recentBookings,
      popularPlaces: popularPlaces.map(serializePlace),
      source: 'DATABASE',
    };
  }
}
