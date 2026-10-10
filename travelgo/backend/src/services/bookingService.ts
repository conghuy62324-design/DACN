export interface BookingPayload {
  serviceType: 'tour' | 'hotel' | 'restaurant' | 'ticket';
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  bookingDate: string;
  returnDate?: string;
  adultsCount: number;
  childrenCount: number;
  unitPrice: number;
  totalAmount: number;
  notes?: string;
}

export interface BookingRecord extends BookingPayload {
  id: string;
  bookingCode: string;
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  bookingStatus: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  createdAt: string;
}

let bookingsDb: BookingRecord[] = [
  {
    id: 'bk-demo-1',
    bookingCode: 'TG-202610-8841',
    serviceType: 'tour',
    serviceId: 'p-danang-hoian',
    serviceName: 'Khám phá Đà Nẵng – Hội An 3N2Đ',
    customerName: 'Nguyễn Văn An',
    customerEmail: 'an.nguyen@example.com',
    customerPhone: '0905123456',
    bookingDate: '2026-11-20',
    returnDate: '2026-11-22',
    adultsCount: 2,
    childrenCount: 0,
    unitPrice: 4250000,
    totalAmount: 8500000,
    paymentStatus: 'paid',
    bookingStatus: 'confirmed',
    notes: 'Yêu cầu phòng tầng cao view biển.',
    createdAt: '2026-10-09T08:00:00Z',
  },
  {
    id: 'bk-demo-2',
    bookingCode: 'TG-202610-3912',
    serviceType: 'hotel',
    serviceId: 'p-hotel-coupole-sapa',
    serviceName: 'Hotel de la Coupole – MGallery Sapa',
    customerName: 'Trần Thị Mai',
    customerEmail: 'mai.tran@example.com',
    customerPhone: '0912345678',
    bookingDate: '2026-12-01',
    returnDate: '2026-12-03',
    adultsCount: 2,
    childrenCount: 1,
    unitPrice: 3600000,
    totalAmount: 7200000,
    paymentStatus: 'unpaid',
    bookingStatus: 'pending',
    notes: 'Cần nôi cho em bé.',
    createdAt: '2026-10-10T02:15:00Z',
  },
];

export class BookingService {
  public static async createBooking(data: BookingPayload): Promise<BookingRecord> {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const bookingCode = `TG-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${randomSuffix}`;

    const newBooking: BookingRecord = {
      ...data,
      id: `bk-${Date.now()}`,
      bookingCode,
      paymentStatus: 'unpaid',
      bookingStatus: 'confirmed',
      createdAt: new Date().toISOString(),
    };

    bookingsDb.unshift(newBooking);
    return newBooking;
  }

  public static async getAllBookings(customerEmail?: string): Promise<BookingRecord[]> {
    if (customerEmail) {
      return bookingsDb.filter((b) => b.customerEmail.toLowerCase() === customerEmail.toLowerCase());
    }
    return bookingsDb;
  }

  public static async getBookingByIdOrCode(codeOrId: string): Promise<BookingRecord | null> {
    return bookingsDb.find((b) => b.id === codeOrId || b.bookingCode === codeOrId) || null;
  }

  public static async updateBookingStatus(
    id: string,
    status: 'confirmed' | 'pending' | 'cancelled' | 'completed'
  ): Promise<BookingRecord | null> {
    const booking = bookingsDb.find((b) => b.id === id);
    if (!booking) return null;
    booking.bookingStatus = status;
    return booking;
  }
}
