import { Op, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AuditLog } from '../models/AuditLog.js';
import { Business, BusinessType } from '../models/Business.js';
import { BusinessMember } from '../models/BusinessMember.js';
import { PartnerApplication, PartnerApplicationStatus } from '../models/PartnerApplication.js';
import { UserRole } from '../models/UserRole.js';
import { HttpError } from '../utils/httpError.js';

export interface PartnerApplicationInput {
  representativeName: string;
  businessName: string;
  businessType: BusinessType;
  email: string;
  phone: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  imageUrls?: string[];
  verificationDetails?: Record<string, unknown>;
}

export class PartnerApplicationService {
  static async submit(userId: string, input: PartnerApplicationInput) {
    const activeApplication = await PartnerApplication.findOne({
      where: { userId, status: { [Op.in]: ['PENDING', 'NEEDS_MORE_INFO'] } },
    });
    if (activeApplication) {
      throw new HttpError(409, 'Bạn đã có hồ sơ đối tác đang được xử lý', 'ACTIVE_APPLICATION_EXISTS');
    }
    return PartnerApplication.create({
      userId,
      representativeName: input.representativeName,
      businessName: input.businessName,
      businessType: input.businessType,
      email: input.email,
      phone: input.phone,
      address: input.address,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      imageUrls: input.imageUrls || [],
      verificationDetails: input.verificationDetails || {},
    });
  }

  static async getMine(userId: string) {
    return PartnerApplication.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
  }

  static async list(status: PartnerApplicationStatus | undefined, page: number, limit: number) {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safePage = Math.max(page, 1);
    const result = await PartnerApplication.findAndCountAll({
      where: status ? { status } : undefined,
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset: (safePage - 1) * safeLimit,
    });
    return { items: result.rows, total: result.count, page: safePage, limit: safeLimit, pages: Math.ceil(result.count / safeLimit) };
  }

  static async decide(
    applicationId: string,
    status: Extract<PartnerApplicationStatus, 'APPROVED' | 'REJECTED' | 'NEEDS_MORE_INFO'>,
    actorUserId: string,
    reason: string | undefined,
    ipAddress?: string
  ) {
    return sequelize.transaction(async (transaction: Transaction) => {
      const application = await PartnerApplication.findByPk(applicationId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!application) throw new HttpError(404, 'Không tìm thấy hồ sơ đối tác', 'APPLICATION_NOT_FOUND');
      if (application.status !== 'PENDING' && application.status !== 'NEEDS_MORE_INFO') {
        throw new HttpError(409, 'Hồ sơ này đã được xử lý', 'APPLICATION_ALREADY_DECIDED');
      }
      if (status !== 'APPROVED' && !reason?.trim()) {
        throw new HttpError(400, 'Cần nhập lý do cho quyết định này', 'REASON_REQUIRED');
      }

      const previousStatus = application.status;
      await application.update(
        { status, decisionReason: reason?.trim(), reviewedBy: actorUserId, reviewedAt: new Date() },
        { transaction }
      );

      let business: Business | null = null;
      if (status === 'APPROVED') {
        business = await Business.create(
          {
            name: application.businessName,
            type: application.businessType,
            email: application.email,
            phone: application.phone,
            address: application.address,
            city: application.city,
            latitude: application.latitude,
            longitude: application.longitude,
          },
          { transaction }
        );
        await BusinessMember.create(
          { businessId: business.id, userId: application.userId, permissions: ['MANAGE_BUSINESS', 'MANAGE_BOOKINGS'] },
          { transaction }
        );
        await UserRole.findOrCreate({
          where: { userId: application.userId, role: 'PARTNER' },
          defaults: { userId: application.userId, role: 'PARTNER', grantedBy: actorUserId },
          transaction,
        });
      }

      await AuditLog.create(
        {
          actorUserId,
          action: `PARTNER_APPLICATION_${status}`,
          entityType: 'PartnerApplication',
          entityId: application.id,
          previousData: { status: previousStatus },
          newData: { status, businessId: business?.id },
          reason,
          ipAddress,
        },
        { transaction }
      );
      return { application, business };
    });
  }
}
