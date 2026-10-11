import { BusinessMember } from '../models/BusinessMember.js';
import { HttpError } from '../utils/httpError.js';

export class BusinessAccessService {
  static async businessIds(userId: string): Promise<string[]> {
    const memberships = await BusinessMember.findAll({ where: { userId }, attributes: ['businessId'] });
    return memberships.map((membership) => membership.businessId);
  }

  static async assert(userId: string, businessId: string, permission?: string): Promise<void> {
    const membership = await BusinessMember.findOne({ where: { userId, businessId } });
    if (!membership || (permission && !membership.permissions.includes(permission))) {
      throw new HttpError(403, 'Bạn không được cấp quyền với cơ sở kinh doanh này', 'BUSINESS_ACCESS_DENIED');
    }
  }
}
