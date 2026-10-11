import { FindOptions, Op } from 'sequelize';
import { Business, Place } from '../models/index.js';
import { idOrSlug, PageQuery, pageOptions, paged, searchLike } from './query.js';

export interface PlaceListQuery extends PageQuery { category?: string; city?: string; minRating?: number; }
export class PlaceRepository {
  static async list(query: PlaceListQuery, scope: { publicOnly?: boolean; businessIds?: string[] } = {}) {
    const { page, limit, offset } = pageOptions(query);
    const where: any = {};
    if (scope.publicOnly) where.status = 'APPROVED';
    if (scope.businessIds) where.businessId = { [Op.in]: scope.businessIds };
    if (query.status) where.status = query.status;
    if (query.category && query.category !== 'all') where.category = query.category;
    if (query.city && query.city !== 'all') where[Op.or] = [{ city: searchLike(query.city) }, { province: searchLike(query.city) }];
    if (query.search) where[Op.or] = [{ name: searchLike(query.search) }, { summary: searchLike(query.search) }, { city: searchLike(query.search) }];
    if (query.minRating) where.rating = { [Op.gte]: query.minRating };
    const order: any = query.sort === 'priceAsc' ? [['priceFrom','ASC']] : query.sort === 'priceDesc' ? [['priceFrom','DESC']] : [['bayesianRating','DESC']];
    const result = await Place.findAndCountAll({ where, include: [{ model: Business, as: 'business', attributes: ['id','name','type'] }], order, limit, offset, distinct: true });
    return paged(result.rows, result.count, page, limit);
  }

  static find(value: string, publicOnly = false) {
    return Place.findOne({ where: { ...idOrSlug(value), ...(publicOnly ? { status: 'APPROVED' } : {}) }, include: [{ model: Business, as: 'business', attributes: ['id','name','type'] }] });
  }
  static create(values: Parameters<typeof Place.create>[0]) { return Place.create(values); }
}
