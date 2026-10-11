import { Op } from 'sequelize';
import { Business, Tour } from '../models/index.js';
import { idOrSlug, PageQuery, pageOptions, paged, searchLike } from './query.js';

export interface TourListQuery extends PageQuery { city?: string; category?: string; maxPrice?: number; days?: number; }
export class TourRepository {
  static async list(query: TourListQuery, scope: { publicOnly?: boolean; businessIds?: string[] } = {}) {
    const { page, limit, offset } = pageOptions(query); const where: any = {};
    if (scope.publicOnly) where.status = 'APPROVED';
    if (scope.businessIds) where.businessId = { [Op.in]: scope.businessIds };
    if (query.status) where.status = query.status;
    if (query.city && query.city !== 'all') where[Op.or] = [{ destinationCity: searchLike(query.city) }, { departureCity: searchLike(query.city) }];
    if (query.search) where[Op.or] = [{ title: searchLike(query.search) }, { summary: searchLike(query.search) }];
    if (query.category && query.category !== 'all') where.category = query.category;
    if (query.maxPrice) where.priceVND = { [Op.lte]: query.maxPrice };
    if (query.days) where.durationDays = query.days;
    const order: any = query.sort === 'priceAsc' ? [['priceVND','ASC']] : query.sort === 'priceDesc' ? [['priceVND','DESC']] : [['rating','DESC'],['reviewCount','DESC']];
    const result = await Tour.findAndCountAll({ where, include: [{ model: Business, as: 'business', attributes: ['id','name','type'] }], order, limit, offset, distinct: true });
    return paged(result.rows, result.count, page, limit);
  }
  static find(value: string, publicOnly = false) { return Tour.findOne({ where: { ...idOrSlug(value), ...(publicOnly ? { status: 'APPROVED' } : {}) }, include: [{ model: Business, as: 'business', attributes: ['id','name','type'] }] }); }
}
