import assert from 'node:assert/strict';
import { BlogPost, Booking, Place, Ticket, Tour } from '../models/index.js';
import { BusinessMember } from '../models/BusinessMember.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';
import { assertBookingTransition, assertCapacity, BookingService, calculateBookingPrice } from '../services/bookingService.js';
import { PartnerService } from '../services/partnerService.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { signAccessToken, verifyAccessToken } from '../services/tokenService.js';
import { BlogRepository } from '../repositories/blogRepository.js';
import { PlaceRepository } from '../repositories/placeRepository.js';
import { TicketRepository } from '../repositories/ticketRepository.js';
import { TourRepository } from '../repositories/tourRepository.js';

async function runMiddleware(middleware: Function, request: any): Promise<any> {
  return new Promise((resolve) => middleware(request, {}, (error?: unknown) => resolve(error || null)));
}

async function run() {
  const passwordHash = await hashPassword('Password123!');
  assert.equal(await verifyPassword('Password123!', passwordHash), true);
  assert.equal(await verifyPassword('wrong-password', passwordHash), false);

  const admin = { id: 'admin-id', email: 'admin@hugotravel.vn', fullName: 'Admin', roles: ['SUPER_ADMIN'] as const };
  const token = signAccessToken({ ...admin, roles: [...admin.roles] });
  assert.deepEqual(verifyAccessToken(token).roles, ['SUPER_ADMIN']);
  assert.throws(() => verifyAccessToken(`${token.slice(0, -1)}x`));

  const request: any = { headers: { authorization: `Bearer ${token}` } };
  assert.equal(await runMiddleware(authenticate, request), null);
  assert.equal(request.user.id, 'admin-id');
  assert.equal(await runMiddleware(requireRoles('SUPER_ADMIN'), request), null);
  assert.equal((await runMiddleware(requireRoles('PARTNER'), request)).statusCode, 403);

  const customerRequest: any = { user: { id: 'customer', roles: ['CUSTOMER'] } };
  assert.equal((await runMiddleware(requireRoles('PARTNER'), customerRequest)).statusCode, 403);
  const partnerRequest: any = { user: { id: 'partner', roles: ['PARTNER'] } };
  assert.equal(await runMiddleware(requireRoles('PARTNER'), partnerRequest), null);
  assert.equal((await runMiddleware(requireRoles('SUPER_ADMIN'), partnerRequest)).statusCode, 403);

  const originalFindMembership = BusinessMember.findOne;
  (BusinessMember.findOne as any) = async () => null;
  await assert.rejects(
    () => PartnerService.getBusiness('partner-a', 'business-b'),
    (error: any) => error.code === 'BUSINESS_ACCESS_DENIED'
  );
  BusinessMember.findOne = originalFindMembership;

  const fakeBooking:any = { id:'11111111-1111-4111-8111-111111111111', businessId:'business-a', userId:'customer-a', unitPrice:100, totalAmount:100, discountAmount:0, toJSON(){return {...this};} };
  const originalBookingFindOne=Booking.findOne; const originalBookingFindByPk=Booking.findByPk;
  (Booking.findOne as any)=async({where}:any)=>where.userId==='customer-a'?fakeBooking:null;
  assert.equal((await BookingService.getOwned('customer-a',fakeBooking.id)).userId,'customer-a');
  await assert.rejects(()=>BookingService.getOwned('customer-b',fakeBooking.id),(error:any)=>error.statusCode===404);
  (Booking.findByPk as any)=async()=>fakeBooking;
  (BusinessMember.findOne as any)=async({where}:any)=>where.userId==='partner-a'&&where.businessId==='business-a'?{permissions:['MANAGE_BOOKINGS']}:null;
  assert.equal((await BookingService.getForPartner('partner-a',fakeBooking.id)).businessId,'business-a');
  await assert.rejects(()=>BookingService.getForPartner('partner-b',fakeBooking.id),(error:any)=>error.code==='BUSINESS_ACCESS_DENIED');
  Booking.findOne=originalBookingFindOne; Booking.findByPk=originalBookingFindByPk; BusinessMember.findOne=originalFindMembership;

  assert.deepEqual(calculateBookingPrice(1_000_000, 2, 1), {
    unitPrice: 1_000_000,
    quantity: 3,
    discountAmount: 300_000,
    totalAmount: 2_700_000,
  });
  assert.doesNotThrow(() => assertCapacity(5, 5));
  assert.throws(() => assertCapacity(4, 5), (error: any) => error.code === 'INSUFFICIENT_CAPACITY');
  assert.doesNotThrow(() => assertBookingTransition('PENDING', 'CONFIRMED'));
  assert.throws(() => assertBookingTransition('COMPLETED', 'CONFIRMED'), (error: any) => error.code === 'INVALID_BOOKING_TRANSITION');

  const publicFilters: Record<string, string> = {};
  const originals = [Place, Tour, Ticket, BlogPost].map((model) => model.findAndCountAll);
  for (const [name, model] of [['place', Place], ['tour', Tour], ['ticket', Ticket], ['blog', BlogPost]] as const) {
    (model.findAndCountAll as any) = async (options: any) => { publicFilters[name] = options.where.status; return { rows: [], count: 0 }; };
  }
  await PlaceRepository.list({}, { publicOnly: true });
  await TourRepository.list({}, { publicOnly: true });
  await TicketRepository.list({}, { publicOnly: true });
  await BlogRepository.list({}, { publicOnly: true });
  assert.deepEqual(publicFilters, { place: 'APPROVED', tour: 'APPROVED', ticket: 'ACTIVE', blog: 'APPROVED' });
  [Place, Tour, Ticket, BlogPost].forEach((model, index) => { model.findAndCountAll = originals[index] as any; });

  console.log('PASS: authentication, RBAC, booking ownership, business isolation, visibility filters, server price, capacity and transitions');
}

run().catch((error) => { console.error('FAIL:', error); process.exit(1); });
