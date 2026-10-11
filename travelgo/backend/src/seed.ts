import { sequelize, BlogPost, Booking, Business, BusinessMember, Place, Ticket, Tour, User, UserRole } from './models/index.js';
import { hashPassword } from './services/passwordService.js';
import { Role } from './types/auth.js';
import { assertIsolatedTestDatabase, requireSeedPassword } from './utils/testDatabaseGuard.js';

const accounts: Array<{ fullName: string; email: string; legacyRole: 'user' | 'admin' | 'partner'; roles: Role[] }> = [
  { fullName: 'HuGo Super Admin', email: 'admin@hugotravel.vn', legacyRole: 'admin', roles: ['CUSTOMER', 'SUPER_ADMIN'] },
  { fullName: 'Đối tác Khách sạn An Nhiên', email: 'hotel.a@hugotravel.vn', legacyRole: 'partner', roles: ['CUSTOMER', 'PARTNER'] },
  { fullName: 'Đối tác Khách sạn Biển Xanh', email: 'hotel.b@hugotravel.vn', legacyRole: 'partner', roles: ['CUSTOMER', 'PARTNER'] },
  { fullName: 'Đối tác Nhà hàng Hương Việt', email: 'restaurant@hugotravel.vn', legacyRole: 'partner', roles: ['CUSTOMER', 'PARTNER'] },
  { fullName: 'Đối tác Tour HuGo', email: 'tour@hugotravel.vn', legacyRole: 'partner', roles: ['CUSTOMER', 'PARTNER'] },
  { fullName: 'Khách hàng Minh Anh', email: 'customer.a@hugotravel.vn', legacyRole: 'user', roles: ['CUSTOMER'] },
  { fullName: 'Khách hàng Quốc Bảo', email: 'customer.b@hugotravel.vn', legacyRole: 'user', roles: ['CUSTOMER'] },
];

async function seed() {
  assertIsolatedTestDatabase('Database seed');
  const seedPassword = requireSeedPassword();
  await sequelize.authenticate();
  const passwordHash = await hashPassword(seedPassword);
  const users = new Map<string, User>();
  const businesses = new Map<string, Business>();

  await sequelize.transaction(async (transaction) => {
    for (const account of accounts) {
      const [user] = await User.findOrCreate({
        where: { email: account.email },
        defaults: { fullName: account.fullName, email: account.email, passwordHash, role: account.legacyRole },
        transaction,
      });
      users.set(account.email, user);
      for (const role of account.roles) {
        await UserRole.findOrCreate({ where: { userId: user.id, role }, defaults: { userId: user.id, role }, transaction });
      }
    }

    const businessFixtures = [
      { owner: 'hotel.a@hugotravel.vn', name: 'HuGo Riverside Hotel', type: 'HOTEL' as const, city: 'Đà Nẵng' },
      { owner: 'hotel.b@hugotravel.vn', name: 'HuGo Pine Homestay', type: 'HOMESTAY' as const, city: 'Đà Lạt' },
      { owner: 'restaurant@hugotravel.vn', name: 'HuGo Seafood', type: 'RESTAURANT' as const, city: 'Đà Nẵng' },
      { owner: 'tour@hugotravel.vn', name: 'HuGo Discovery', type: 'TOUR_OPERATOR' as const, city: 'Hội An' },
    ];
    for (const fixture of businessFixtures) {
      const owner = users.get(fixture.owner)!;
      const [business] = await Business.findOrCreate({
        where: { email: fixture.owner, name: fixture.name },
        defaults: { name: fixture.name, type: fixture.type, email: fixture.owner, phone: '0900000000', address: 'Địa chỉ dữ liệu kiểm thử', city: fixture.city },
        transaction,
      });
      businesses.set(fixture.owner, business);
      await BusinessMember.findOrCreate({
        where: { businessId: business.id, userId: owner.id },
        defaults: { businessId: business.id, userId: owner.id, permissions: ['MANAGE_BUSINESS', 'MANAGE_BOOKINGS'] },
        transaction,
      });
    }

    const hotelBusiness = businesses.get('hotel.a@hugotravel.vn')!;
    const restaurantBusiness = businesses.get('restaurant@hugotravel.vn')!;
    const tourBusiness = businesses.get('tour@hugotravel.vn')!;
    const customer = users.get('customer.a@hugotravel.vn')!;
    const tourOwner = users.get('tour@hugotravel.vn')!;

    const [hotel] = await Place.findOrCreate({
      where: { slug: 'hugo-riverside-seed' },
      defaults: { businessId:hotelBusiness.id,name:'HuGo Riverside Hotel',slug:'hugo-riverside-seed',category:'hotel',summary:'Khách sạn ven sông phục vụ dữ liệu kiểm thử.',description:'Dữ liệu PostgreSQL thật dùng để kiểm tra danh sách công khai và quyền sở hữu.',city:'Đà Nẵng',province:'Đà Nẵng',address:'Bạch Đằng, Hải Châu',latitude:16.0678,longitude:108.2208,priceFrom:1200000,rating:4.6,reviewCount:32,bayesianRating:4.51,heroImage:'https://images.unsplash.com/photo-1566073771259-6a8506099945',galleryImages:[],highlights:['Ven sông'],amenities:['Wi-Fi'],isFeatured:true,openingHours:{},contactInfo:{phone:'0900000000'},status:'APPROVED' },
      transaction,
    });
    await Place.findOrCreate({
      where: { slug: 'hugo-seafood-seed' },
      defaults: { businessId:restaurantBusiness.id,name:'HuGo Seafood',slug:'hugo-seafood-seed',category:'restaurant',summary:'Nhà hàng hải sản địa phương.',description:'Fixture thuộc doanh nghiệp khác để kiểm tra business isolation.',city:'Đà Nẵng',province:'Đà Nẵng',address:'Sơn Trà, Đà Nẵng',latitude:16.101,longitude:108.247,priceFrom:350000,rating:4.4,reviewCount:18,bayesianRating:4.33,heroImage:'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',galleryImages:[],highlights:['Hải sản'],amenities:['Bãi đỗ xe'],isFeatured:false,openingHours:{},contactInfo:{phone:'0900000000'},status:'APPROVED' },
      transaction,
    });
    const [tour] = await Tour.findOrCreate({
      where: { slug: 'hugo-hoi-an-discovery-seed' },
      defaults: { businessId:tourBusiness.id,title:'Khám phá Hội An 2N1Đ',slug:'hugo-hoi-an-discovery-seed',destinationCity:'Hội An',departureCity:'Đà Nẵng',durationDays:2,durationNights:1,category:'culture',summary:'Hành trình văn hóa Hội An.',description:'Tour mẫu từ PostgreSQL với capacity có thể kiểm tra.',heroImage:'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b',galleryImages:[],priceVND:2400000,capacity:20,availableCapacity:18,rating:4.7,reviewCount:21,inclusions:['Xe đưa đón'],exclusions:[],highlights:['Phố cổ'],itineraryDays:[],isTemplate:false,status:'APPROVED' },
      transaction,
    });
    await Ticket.findOrCreate({
      where: { title:'Vé tham quan Hội An - fixture', businessId:tourBusiness.id },
      defaults: { businessId:tourBusiness.id,tourId:tour.id,title:'Vé tham quan Hội An - fixture',type:'sightseeing',operator:'HuGo Discovery',departureCity:'Đà Nẵng',arrivalCity:'Hội An',departureTime:new Date('2026-12-20T08:00:00+07:00'),duration:'1 ngày',price:300000,availableSeats:40,capacity:40,status:'ACTIVE',features:['QR check-in'],imageUrl:'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b' },
      transaction,
    });
    await BlogPost.findOrCreate({
      where: { slug:'kinh-nghiem-hoi-an-seed' },
      defaults: { businessId:tourBusiness.id,authorId:tourOwner.id,authorName:tourOwner.fullName,title:'Kinh nghiệm khám phá Hội An',slug:'kinh-nghiem-hoi-an-seed',excerpt:'Gợi ý lịch trình ngắn cho Hội An.',content:'Nội dung fixture PostgreSQL dùng cho luồng duyệt blog của đối tác và quản trị viên.',destinationName:'Hội An',coverImage:'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b',tags:['hoi-an'],likesCount:0,isFeatured:false,status:'PENDING' },
      transaction,
    });
    await Booking.findOrCreate({
      where: { bookingCode:'HG-SEED-0001' },
      defaults: { bookingCode:'HG-SEED-0001',userId:customer.id,businessId:hotelBusiness.id,placeId:hotel.id,serviceType:'hotel',serviceId:hotel.id,serviceName:hotel.name,customerName:customer.fullName,customerEmail:customer.email,customerPhone:'0900000000',bookingDate:'2026-12-20',returnDate:'2026-12-21',adultsCount:2,childrenCount:0,quantity:2,unitPrice:1200000,totalAmount:2400000,discountAmount:0,paymentStatus:'unpaid',bookingStatus:'PENDING' },
      transaction,
    });
  });
  console.log('Database test fixtures created safely; no seed credentials were printed.');
  await sequelize.close();
}

seed().catch(async (error) => {
  console.error('Không thể tạo dữ liệu kiểm thử:', error);
  await sequelize.close();
  process.exit(1);
});
