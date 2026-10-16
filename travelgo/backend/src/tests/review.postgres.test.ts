import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { Booking, Place, Review, User } from '../models/index.js';
import {
  assertDatabaseSentinel, assertTestDatabaseWriteOptIn, requireSeedPassword,
} from '../utils/testDatabaseGuard.js';

type Result = { status: number; body: any };

async function main(): Promise<void> {
  assertTestDatabaseWriteOptIn('Verified Review PostgreSQL integration test');
  const seedPassword = requireSeedPassword();
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'Verified Review PostgreSQL integration test');
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to determine test server port');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const api = async (method: string, route: string, body?: object, token?: string, headers?: Record<string, string>): Promise<Result> => {
    const response = await fetch(`${baseUrl}${route}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };
  const register = async (label: string) => {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const result = await api('POST', '/api/auth/register', {
      email: `review.${label}.${suffix}@example.test`, fullName: `Review ${label}`,
      password: 'Review2026!', phone: '0901234567',
    });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return result.body.data as { token: string; user: { id: string } };
  };
  const login = async (email: string, password: string) => {
    const result = await api('POST', '/api/auth/login', { email, password });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    return result.body.data as { token: string; user: { id: string } };
  };
  const createBooking = async (token: string, place: Place, label: string) => {
    const result = await api('POST', '/api/bookings', {
      serviceType: place.category, serviceId: place.id, bookingDate: '2027-03-10', returnDate: '2027-03-11',
      adultsCount: 1, childrenCount: 0, customerPhone: '0901234567',
    }, token, { 'Idempotency-Key': `review-${label}-${Date.now()}-${Math.random()}` });
    assert.equal(result.status, 201, JSON.stringify(result.body));
    return result.body.data;
  };
  const complete = async (bookingId: string, adminToken: string) => {
    const confirmed = await api('PATCH', `/api/bookings/${bookingId}/status`, { status: 'CONFIRMED' }, adminToken);
    assert.equal(confirmed.status, 200, JSON.stringify(confirmed.body));
    const completed = await api('PATCH', `/api/bookings/${bookingId}/status`, { status: 'COMPLETED' }, adminToken);
    assert.equal(completed.status, 200, JSON.stringify(completed.body));
  };

  try {
    const hotel = await Place.findOne({ where: { slug: 'hugo-riverside-seed', status: 'APPROVED' } });
    const restaurant = await Place.findOne({ where: { slug: 'hugo-seafood-seed', status: 'APPROVED' } });
    assert.ok(hotel && restaurant, 'Seed hotel and restaurant are required');
    const admin = await login('admin@hugotravel.vn', seedPassword);
    const owner = await register('owner');
    const other = await register('other');
    const optOut = await register('optout');
    const payload = { rating: 5, criteria: { service: 5, location: 4 }, comment: 'Trải nghiệm thực tế rất tốt và phục vụ chu đáo.' };

    const unauthorized = await api('POST', `/api/places/${hotel.id}/reviews`, payload);
    assert.equal(unauthorized.status, 401);
    const spoofed = await api('POST', `/api/places/${hotel.id}/reviews`, {
      ...payload, userId: other.user.id, userName: 'Giả mạo', verified: true, environment: 'production', moderationStatus: 'PUBLISHED',
    }, owner.token);
    assert.equal(spoofed.status, 400);
    assert.equal(spoofed.body.code, 'SPOOFED_REVIEW_FIELD');
    assert.equal((await api('POST', `/api/places/${hotel.id}/reviews`, { ...payload, rating: 6 }, owner.token)).body.code, 'INVALID_REVIEW_RATING');
    assert.equal((await api('POST', `/api/places/${hotel.id}/reviews`, { ...payload, comment: 'ngắn' }, owner.token)).body.code, 'INVALID_REVIEW_COMMENT');

    const pendingBooking = await createBooking(owner.token, hotel, 'owner');
    const premature = await api('POST', `/api/places/${hotel.id}/reviews`, { ...payload, bookingId: pendingBooking.id }, owner.token);
    assert.equal(premature.status, 409);
    assert.equal(premature.body.code, 'REVIEW_BOOKING_NOT_COMPLETED');
    const crossUserBooking = await api('POST', `/api/places/${hotel.id}/reviews`, { ...payload, bookingId: pendingBooking.id }, other.token);
    assert.equal(crossUserBooking.status, 404);
    const confirmedBooking = await api('PATCH', `/api/bookings/${pendingBooking.id}/status`, { status: 'CONFIRMED' }, admin.token);
    assert.equal(confirmedBooking.status, 200);
    const confirmedReview = await api('POST', `/api/places/${hotel.id}/reviews`, { ...payload, bookingId: pendingBooking.id }, owner.token);
    assert.equal(confirmedReview.status, 409);
    assert.equal(confirmedReview.body.code, 'REVIEW_BOOKING_NOT_COMPLETED');
    const completedBooking = await api('PATCH', `/api/bookings/${pendingBooking.id}/status`, { status: 'COMPLETED' }, admin.token);
    assert.equal(completedBooking.status, 200);
    const mismatch = await api('POST', `/api/places/${restaurant.id}/reviews`, { ...payload, bookingId: pendingBooking.id }, owner.token);
    assert.equal(mismatch.status, 409);
    assert.equal(mismatch.body.code, 'REVIEW_BOOKING_TARGET_MISMATCH');

    const consent = await api('PUT', '/api/intelligence/consent', {
      analyticsEnabled: true, personalizationEnabled: true,
    }, owner.token);
    assert.equal(consent.status, 200);
    const concurrent = await Promise.all(Array.from({ length: 6 }, () =>
      api('POST', `/api/places/${hotel.id}/reviews`, { ...payload, bookingId: pendingBooking.id }, owner.token)));
    assert.equal(concurrent.filter((result) => result.status === 201).length, 1);
    assert.equal(concurrent.filter((result) => result.status === 409 && result.body.code === 'REVIEW_ALREADY_EXISTS').length, 5);
    assert.equal(await Review.count({ where: { bookingId: pendingBooking.id } }), 1);
    const verified = await Review.findOne({ where: { bookingId: pendingBooking.id } });
    assert.equal(verified?.verificationStatus, 'VERIFIED');
    assert.equal(verified?.source, 'CUSTOMER_SUBMISSION');
    assert.equal(verified?.environment, 'test');
    assert.equal(verified?.aiUsageAllowed, true);
    assert.deepEqual(verified?.criteriaProvided, { service: true, price: false, location: true, experience: false });
    assert.equal(verified?.ratingPrice, null);

    const duplicate = await api('POST', `/api/places/${hotel.id}/reviews`, { ...payload, bookingId: pendingBooking.id }, owner.token);
    assert.equal(duplicate.status, 409);
    const publicList = await api('GET', `/api/places/${hotel.id}/reviews`);
    const publicVerified = publicList.body.data.find((review: any) => review.id === verified!.id);
    assert.equal(publicVerified.verificationStatus, 'VERIFIED');
    assert.equal(publicVerified.bookingId, undefined, 'Public API must not leak booking identifiers');
    assert.equal(publicVerified.userId, undefined, 'Public API must not leak user identifiers');

    const forgedUpdate = await api('PATCH', `/api/reviews/${verified!.id}`, { ...payload, bookingId: pendingBooking.id }, owner.token);
    assert.equal(forgedUpdate.status, 400);
    const otherUpdate = await api('PATCH', `/api/reviews/${verified!.id}`, { ...payload, rating: 1 }, other.token);
    assert.equal(otherUpdate.status, 404);
    const otherDelete = await api('DELETE', `/api/reviews/${verified!.id}`, undefined, other.token);
    assert.equal(otherDelete.status, 404);
    const ownerUpdate = await api('PATCH', `/api/reviews/${verified!.id}`, {
      rating: 4, criteria: { price: 3 }, comment: 'Nội dung đã cập nhật nhưng provenance booking không đổi.',
    }, owner.token);
    assert.equal(ownerUpdate.status, 200);
    assert.equal(ownerUpdate.body.data.verificationStatus, 'VERIFIED');
    assert.equal(ownerUpdate.body.data.rating, 4);

    const hide = await api('PATCH', `/api/reviews/${verified!.id}/moderation`, {
      status: 'HIDDEN', reason: 'Kiểm tra moderation Task 5',
    }, admin.token);
    assert.equal(hide.status, 200);
    assert.equal((await api('PATCH', `/api/reviews/${verified!.id}/moderation`, { status: 'PUBLISHED' }, other.token)).status, 403);
    const hiddenList = await api('GET', `/api/places/${hotel.id}/reviews`);
    assert.equal(hiddenList.body.data.some((review: any) => review.id === verified!.id), false);
    const mine = await api('GET', '/api/reviews/me', undefined, owner.token);
    assert.equal(mine.status, 200);
    assert.equal(mine.body.data.find((review: any) => review.id === verified!.id).moderationStatus, 'HIDDEN');
    assert.equal((await api('PATCH', `/api/reviews/${verified!.id}/moderation`, { status: 'PUBLISHED' }, admin.token)).status, 200);

    const unverified = await api('POST', `/api/places/${restaurant.id}/reviews`, {
      rating: 3, comment: 'Đánh giá tương thích không gắn booking vẫn hoạt động bình thường.',
    }, other.token);
    assert.equal(unverified.status, 201, JSON.stringify(unverified.body));
    assert.equal(unverified.body.data.verificationStatus, 'UNVERIFIED');
    assert.equal((await Review.findByPk(unverified.body.data.id))?.bookingId, null);
    assert.equal((await Review.findByPk(unverified.body.data.id))?.aiUsageAllowed, false);

    const optOutBooking = await createBooking(optOut.token, restaurant, 'optout');
    await complete(optOutBooking.id, admin.token);
    const optOutReview = await api('POST', `/api/places/${restaurant.id}/reviews`, {
      ...payload, bookingId: optOutBooking.id,
    }, optOut.token);
    assert.equal(optOutReview.status, 201);
    const optOutRow = await Review.findByPk(optOutReview.body.data.id);
    assert.equal(optOutRow?.verificationStatus, 'VERIFIED');
    assert.equal(optOutRow?.aiUsageAllowed, false, 'Opt-out must not break review but must block AI use');

    const privacyDelete = await api('PUT', '/api/intelligence/consent', {
      analyticsEnabled: false, personalizationEnabled: false, deleteExistingEvents: true,
    }, owner.token);
    assert.equal(privacyDelete.status, 200);
    assert.equal((await Review.findByPk(verified!.id))?.aiUsageAllowed, false);
    assert.ok(await Review.findByPk(verified!.id), 'Privacy deletion must preserve functional review');

    const deleteUnverified = await api('DELETE', `/api/reviews/${unverified.body.data.id}`, undefined, other.token);
    assert.equal(deleteUnverified.status, 200);
    assert.equal(await Review.findByPk(unverified.body.data.id), null);
    const accountReviewId = optOutReview.body.data.id;
    await User.destroy({ where: { id: optOut.user.id } });
    const retainedAfterAccountDelete = await Review.findByPk(accountReviewId);
    assert.ok(retainedAfterAccountDelete, 'Published review is retained for integrity after account deletion');
    assert.equal(retainedAfterAccountDelete?.userId, null);
    assert.equal(retainedAfterAccountDelete?.userName, 'Người dùng đã xóa');
    assert.equal(retainedAfterAccountDelete?.userAvatar, null);
    assert.equal(retainedAfterAccountDelete?.aiUsageAllowed, false);
    assert.equal(await Booking.count({ where: { id: optOutBooking.id, userId: null } }), 1);
    assert.equal(await Review.count({ where: { environment: 'production', source: 'CUSTOMER_SUBMISSION' } }), 0);

    const exportable = await register('exportable');
    assert.equal((await api('PUT', '/api/intelligence/consent', {
      analyticsEnabled: true, personalizationEnabled: true,
    }, exportable.token)).status, 200);
    const exportableBooking = await createBooking(exportable.token, hotel, 'exportable');
    await complete(exportableBooking.id, admin.token);
    const exportableReview = await api('POST', `/api/places/${hotel.id}/reviews`, {
      rating: 5, criteria: { experience: 5 },
      comment: 'Dòng đánh giá consented dùng để kiểm tra export test có provenance rõ ràng.',
      bookingId: exportableBooking.id,
    }, exportable.token);
    assert.equal(exportableReview.status, 201);
    assert.equal((await Review.findByPk(exportableReview.body.data.id))?.aiUsageAllowed, true);
    assert.equal((await Review.findByPk(exportableReview.body.data.id))?.verificationStatus, 'VERIFIED');

    console.log(JSON.stringify({
      result: 'PASS', checks: 75, database: process.env.DB_NAME, environment: 'test',
      bookingLifecycleVerified: true, oneBookingOneReview: true, concurrentSuccesses: 1,
      identitySpoofingBlocked: true, ownerOnlyMutation: true, moderationFiltering: true,
      bookinglessCompatibility: 'UNVERIFIED', optOutFunctional: true,
      privacyDeletePreservesFunction: true, productionRowsCreated: 0,
    }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error('Verified Review PostgreSQL integration test failed:', error);
  process.exitCode = 1;
});
