import { PlaceService } from './placeService.js';
import { BookingService } from './bookingService.js';
import { BlogService } from './blogService.js';

export class StatsService {
  public static async getDashboardStats() {
    const places = await PlaceService.getAllPlaces();
    const bookings = await BookingService.getAllBookings();
    const blogs = await BlogService.getAllBlogs();

    const totalRevenue = bookings
      .filter((b) => b.bookingStatus !== 'cancelled')
      .reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

    const pendingBookings = bookings.filter((b) => b.bookingStatus === 'pending').length;
    const confirmedBookings = bookings.filter((b) => b.bookingStatus === 'confirmed').length;

    return {
      overview: {
        totalRevenue,
        totalBookings: bookings.length,
        totalPlaces: places.length,
        totalBlogs: blogs.length,
        pendingBookings,
        confirmedBookings,
      },
      recentBookings: bookings.slice(0, 5),
      popularPlaces: places.slice(0, 5),
    };
  }
}
