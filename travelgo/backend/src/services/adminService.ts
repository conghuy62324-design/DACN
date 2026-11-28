import { Op } from 'sequelize';
import { AuditLog, BlogPost, Booking, Business, PartnerApplication, Place, Tour, User, UserRole } from '../models/index.js';
import { HttpError } from '../utils/httpError.js';
import { attachHotelStays } from '../hotels/hotelStay.js';

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

  static async getBookings(page: number, limit: number, filters?: { status?: string; search?: string; businessId?: string; placeId?: string; from?: string; to?: string }) {
    const legacyCall = filters === undefined;
    filters = filters || {};
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const where: any = {};
    if (filters.status) {
      if (!['PENDING','CONFIRMED','COMPLETED','CANCELLED','REJECTED'].includes(filters.status)) throw new HttpError(400,'Trạng thái không hợp lệ.','BOOKING_FILTER');
      where.bookingStatus=filters.status;
    }
    for (const key of ['placeId','businessId'] as const) if(filters[key]) {
      if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(filters[key]))throw new HttpError(400,'Mã bộ lọc không hợp lệ.','BOOKING_FILTER');where[key]=filters[key];
    }
    for(const key of ['from','to'] as const)if(filters[key]){const parsed=new Date(filters[key]+'T00:00:00Z');if(!/^\d{4}-\d\d-\d\d$/.test(filters[key])||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==filters[key])throw new HttpError(400,'Ngày lọc không hợp lệ.','BOOKING_FILTER');}
    if(filters.from&&filters.to&&filters.from>filters.to)throw new HttpError(400,'Khoảng ngày không hợp lệ.','BOOKING_FILTER');
    if(filters.from||filters.to)where.bookingDate={...(filters.from?{[Op.gte]:filters.from}:{}),...(filters.to?{[Op.lte]:filters.to}:{})};
    if(filters.search){if(filters.search.length>120)throw new HttpError(400,'Từ khóa quá dài.','BOOKING_FILTER');const pattern='%'+filters.search.replace(/[\\%_]/g,'\\$&')+'%';where[Op.or]=['bookingCode','customerName','serviceName'].map(k=>({[k]:{[Op.iLike]:pattern}}));}
    const result = await Booking.findAndCountAll({ where, limit: safeLimit, offset: (safePage - 1) * safeLimit, order: [['createdAt', 'DESC'],['id','DESC']] });
    // Calls without filters retain the pre-existing return contract exactly.
    if(legacyCall)return { items: result.rows, total: result.count, page: safePage, limit: safeLimit };
    const safe=result.rows.map(row=>{const {requestFingerprint,...value}=row.toJSON();return value;});
    return { items: await attachHotelStays(safe), total: result.count, page: safePage, limit: safeLimit, pages:Math.ceil(result.count/safeLimit) };
  }
}
