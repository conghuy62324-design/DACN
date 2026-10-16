import { Transaction, UniqueConstraintError } from 'sequelize';
import { ENV } from '../config/env.js';
import { sequelize } from '../config/database.js';
import { AuditLog, Booking, Place, Review, TelemetryConsent, User } from '../models/index.js';
import { CriteriaRatings, RatingService } from './ratingService.js';
import { TELEMETRY_POLICY_VERSION } from './telemetryService.js';
import { HttpError } from '../utils/httpError.js';

type ReviewEnvironment = 'production' | 'development' | 'test';
type ModerationStatus = 'PUBLISHED' | 'HIDDEN' | 'REJECTED';

const REVIEW_FIELDS = new Set(['bookingId', 'rating', 'criteria', 'comment']);
const CRITERIA_FIELDS = new Set(['service', 'price', 'location', 'experience']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function environment(): ReviewEnvironment {
  if (ENV.NODE_ENV === 'production') return 'production';
  if (ENV.NODE_ENV === 'test') return 'test';
  return 'development';
}

function assertObject(value: unknown): asserts value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new HttpError(400, 'Payload đánh giá không hợp lệ', 'INVALID_REVIEW');
  }
}

function validateRating(value: unknown, field = 'rating'): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new HttpError(400, `${field} phải là số nguyên từ 1 đến 5`, 'INVALID_REVIEW_RATING');
  }
  return value;
}

function validateInput(raw: unknown) {
  assertObject(raw);
  const unsupported = Object.keys(raw).filter((key) => !REVIEW_FIELDS.has(key));
  if (unsupported.length) {
    throw new HttpError(400, `Client không được gửi trường đánh giá: ${unsupported.join(', ')}`, 'SPOOFED_REVIEW_FIELD');
  }
  const bookingId = raw.bookingId;
  if (bookingId !== undefined && (typeof bookingId !== 'string' || !UUID.test(bookingId))) {
    throw new HttpError(400, 'bookingId không hợp lệ', 'INVALID_REVIEW_BOOKING');
  }
  const rating = validateRating(raw.rating);
  if (typeof raw.comment !== 'string') throw new HttpError(400, 'Nội dung đánh giá là bắt buộc', 'INVALID_REVIEW_COMMENT');
  const comment = raw.comment.trim();
  if (comment.length < 10 || comment.length > 2000 || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(comment)) {
    throw new HttpError(400, 'Nội dung đánh giá phải từ 10 đến 2000 ký tự hợp lệ', 'INVALID_REVIEW_COMMENT');
  }
  let criteria: CriteriaRatings = {};
  if (raw.criteria !== undefined) {
    assertObject(raw.criteria);
    const invalid = Object.keys(raw.criteria).filter((key) => !CRITERIA_FIELDS.has(key));
    if (invalid.length) throw new HttpError(400, `Tiêu chí không hợp lệ: ${invalid.join(', ')}`, 'INVALID_REVIEW_CRITERIA');
    criteria = Object.fromEntries(Object.entries(raw.criteria).map(([key, value]) => [key, validateRating(value, key)]));
  }
  return { bookingId: bookingId as string | undefined, rating, criteria, comment };
}

function criteriaFlags(criteria: CriteriaRatings) {
  return {
    service: criteria.service !== undefined,
    price: criteria.price !== undefined,
    location: criteria.location !== undefined,
    experience: criteria.experience !== undefined,
  };
}

function serialize(review: Review, privateView = false) {
  const value: any = review.toJSON();
  const result: any = {
    id: value.id,
    targetType: value.targetType,
    targetId: value.targetId,
    userName: value.userName,
    userAvatar: value.userAvatar,
    rating: Number(value.rating),
    ratingService: value.ratingService === null || value.ratingService === undefined ? undefined : Number(value.ratingService),
    ratingPrice: value.ratingPrice === null || value.ratingPrice === undefined ? undefined : Number(value.ratingPrice),
    ratingLocation: value.ratingLocation === null || value.ratingLocation === undefined ? undefined : Number(value.ratingLocation),
    ratingExperience: value.ratingExperience === null || value.ratingExperience === undefined ? undefined : Number(value.ratingExperience),
    criteriaProvided: value.criteriaProvided,
    comment: value.comment,
    verificationStatus: value.verificationStatus,
    moderationStatus: value.moderationStatus,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
  if (privateView) {
    result.bookingId = value.bookingId;
    result.moderationReason = value.moderationReason;
    result.source = value.source;
    result.environment = value.environment;
    result.aiUsageAllowed = value.aiUsageAllowed;
  }
  return result;
}

async function updatePlaceRating(place: Place, transaction: Transaction): Promise<void> {
  const aggregate = await Review.findOne({
    attributes: [
      [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      [sequelize.fn('AVG', sequelize.col('rating')), 'average'],
    ],
    where: { targetType: 'place', targetId: place.id, moderationStatus: 'PUBLISHED' },
    raw: true,
    transaction,
  }) as any;
  const count = Number(aggregate?.count || 0);
  const average = Number(aggregate?.average || 0);
  await place.update({
    reviewCount: count,
    rating: average,
    bayesianRating: RatingService.calculateBayesianAverage(count, average),
  }, { transaction });
}

async function lockPlace(targetId: string, transaction: Transaction, requireApproved = false): Promise<Place> {
  const place = await Place.findOne({
    where: requireApproved ? { id: targetId, status: 'APPROVED' } : { id: targetId },
    transaction, lock: transaction.LOCK.UPDATE,
  });
  if (!place) throw new HttpError(404, requireApproved ? 'Không tìm thấy địa điểm đã được duyệt' : 'Không tìm thấy địa điểm', 'PLACE_NOT_FOUND');
  return place;
}

export class ReviewService {
  static async listPublished(targetId: string) {
    const reviews = await Review.findAll({
      where: { targetType: 'place', targetId, moderationStatus: 'PUBLISHED' },
      order: [['createdAt', 'DESC']],
    });
    return reviews.map((review) => serialize(review));
  }

  static async listMine(userId: string) {
    const reviews = await Review.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
    return reviews.map((review) => serialize(review, true));
  }

  static async create(targetId: string, userId: string, raw: unknown) {
    const input = validateInput(raw);
    try {
      return await sequelize.transaction(async (transaction) => {
        const place = await lockPlace(targetId, transaction, true);
        const user = await User.findByPk(userId, { transaction });
        if (!user) throw new HttpError(401, 'Tài khoản không tồn tại', 'ACCOUNT_NOT_FOUND');

        let verificationStatus: 'VERIFIED' | 'UNVERIFIED' = 'UNVERIFIED';
        let verifiedAt: Date | undefined;
        if (input.bookingId) {
          const booking = await Booking.findByPk(input.bookingId, { transaction, lock: transaction.LOCK.UPDATE });
          if (!booking || booking.userId !== userId) {
            throw new HttpError(404, 'Không tìm thấy booking đủ điều kiện của tài khoản', 'REVIEW_BOOKING_NOT_FOUND');
          }
          if (booking.bookingStatus !== 'COMPLETED') {
            throw new HttpError(409, 'Chỉ booking COMPLETED mới có thể tạo đánh giá xác thực', 'REVIEW_BOOKING_NOT_COMPLETED');
          }
          if (booking.placeId !== targetId || booking.serviceId !== targetId || !['hotel', 'restaurant'].includes(booking.serviceType)) {
            throw new HttpError(409, 'Booking không thuộc đúng dịch vụ/địa điểm đang đánh giá', 'REVIEW_BOOKING_TARGET_MISMATCH');
          }
          if (await Review.findOne({ where: { bookingId: booking.id }, transaction })) {
            throw new HttpError(409, 'Booking này đã có đánh giá', 'REVIEW_ALREADY_EXISTS');
          }
          verificationStatus = 'VERIFIED';
          verifiedAt = new Date();
        }

        const consent = await TelemetryConsent.findByPk(userId, { transaction });
        const aiUsageAllowed = !!consent?.analyticsEnabled && !!consent?.personalizationEnabled;
        const flags = criteriaFlags(input.criteria);
        const review = await Review.create({
          targetType: 'place', targetId, userId, userName: user.fullName, userAvatar: user.avatarUrl,
          rating: input.rating,
          ratingService: input.criteria.service,
          ratingPrice: input.criteria.price,
          ratingLocation: input.criteria.location,
          ratingExperience: input.criteria.experience,
          criteriaProvided: flags,
          comment: input.comment,
          bookingId: input.bookingId,
          verificationStatus,
          verifiedAt,
          moderationStatus: 'PUBLISHED',
          source: 'CUSTOMER_SUBMISSION',
          environment: environment(),
          aiUsageAllowed,
          consentPolicyVersion: aiUsageAllowed ? TELEMETRY_POLICY_VERSION : undefined,
        }, { transaction });
        await updatePlaceRating(place, transaction);
        return serialize(review, true);
      });
    } catch (error) {
      if (error instanceof UniqueConstraintError && input.bookingId) {
        throw new HttpError(409, 'Booking này đã có đánh giá', 'REVIEW_ALREADY_EXISTS');
      }
      throw error;
    }
  }

  static async update(reviewId: string, userId: string, raw: unknown) {
    const input = validateInput(raw);
    if (input.bookingId !== undefined) {
      throw new HttpError(400, 'Không thể thay đổi booking provenance của đánh giá', 'SPOOFED_REVIEW_FIELD');
    }
    const snapshot = await Review.findByPk(reviewId);
    if (!snapshot || snapshot.userId !== userId) throw new HttpError(404, 'Không tìm thấy đánh giá của tài khoản', 'REVIEW_NOT_FOUND');
    return sequelize.transaction(async (transaction) => {
      const place = await lockPlace(snapshot.targetId, transaction);
      const review = await Review.findByPk(reviewId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!review || review.userId !== userId) throw new HttpError(404, 'Không tìm thấy đánh giá của tài khoản', 'REVIEW_NOT_FOUND');
      const consent = await TelemetryConsent.findByPk(userId, { transaction });
      const aiUsageAllowed = review.source === 'CUSTOMER_SUBMISSION' &&
        !!consent?.analyticsEnabled && !!consent?.personalizationEnabled;
      await review.update({
        rating: input.rating,
        ratingService: input.criteria.service,
        ratingPrice: input.criteria.price,
        ratingLocation: input.criteria.location,
        ratingExperience: input.criteria.experience,
        criteriaProvided: criteriaFlags(input.criteria),
        comment: input.comment,
        aiUsageAllowed,
        consentPolicyVersion: aiUsageAllowed ? TELEMETRY_POLICY_VERSION : undefined,
      }, { transaction });
      await updatePlaceRating(place, transaction);
      return serialize(review, true);
    });
  }

  static async remove(reviewId: string, userId: string) {
    const snapshot = await Review.findByPk(reviewId);
    if (!snapshot || snapshot.userId !== userId) throw new HttpError(404, 'Không tìm thấy đánh giá của tài khoản', 'REVIEW_NOT_FOUND');
    return sequelize.transaction(async (transaction) => {
      const place = await lockPlace(snapshot.targetId, transaction);
      const review = await Review.findByPk(reviewId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!review || review.userId !== userId) throw new HttpError(404, 'Không tìm thấy đánh giá của tài khoản', 'REVIEW_NOT_FOUND');
      await review.destroy({ transaction });
      await AuditLog.create({
        actorUserId: userId, action: 'REVIEW_DELETED', entityType: 'Review', entityId: reviewId,
        previousData: { targetType: review.targetType, targetId: review.targetId, verificationStatus: review.verificationStatus },
      }, { transaction });
      await updatePlaceRating(place, transaction);
      return { id: reviewId, deleted: true };
    });
  }

  static async moderate(reviewId: string, actorUserId: string, raw: unknown) {
    assertObject(raw);
    const unsupported = Object.keys(raw).filter((key) => !['status', 'reason'].includes(key));
    if (unsupported.length) throw new HttpError(400, 'Payload moderation không hợp lệ', 'INVALID_REVIEW_MODERATION');
    if (!['PUBLISHED', 'HIDDEN', 'REJECTED'].includes(String(raw.status))) {
      throw new HttpError(400, 'Trạng thái moderation không hợp lệ', 'INVALID_REVIEW_MODERATION');
    }
    const status = raw.status as ModerationStatus;
    const reason = typeof raw.reason === 'string' ? raw.reason.trim() : '';
    if (status !== 'PUBLISHED' && (reason.length < 3 || reason.length > 500)) {
      throw new HttpError(400, 'Cần lý do moderation từ 3 đến 500 ký tự', 'INVALID_REVIEW_MODERATION');
    }
    const snapshot = await Review.findByPk(reviewId);
    if (!snapshot) throw new HttpError(404, 'Không tìm thấy đánh giá', 'REVIEW_NOT_FOUND');
    return sequelize.transaction(async (transaction) => {
      const place = await lockPlace(snapshot.targetId, transaction);
      const review = await Review.findByPk(reviewId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!review) throw new HttpError(404, 'Không tìm thấy đánh giá', 'REVIEW_NOT_FOUND');
      const previous = review.moderationStatus;
      await review.update({
        moderationStatus: status, moderationReason: reason || undefined,
        moderatedBy: actorUserId, moderatedAt: new Date(),
      }, { transaction });
      await AuditLog.create({
        actorUserId, action: `REVIEW_${status}`, entityType: 'Review', entityId: reviewId,
        previousData: { moderationStatus: previous }, newData: { moderationStatus: status }, reason: reason || undefined,
      }, { transaction });
      await updatePlaceRating(place, transaction);
      return serialize(review, true);
    });
  }
}
