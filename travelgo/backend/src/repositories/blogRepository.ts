import { Op } from 'sequelize';
import { BlogPost, Business } from '../models/index.js';
import { idOrSlug, PageQuery, pageOptions, paged, searchLike } from './query.js';

export interface BlogListQuery extends PageQuery { tag?: string; }
export class BlogRepository {
  static async list(query: BlogListQuery, scope: { publicOnly?: boolean; businessIds?: string[]; authorId?: string } = {}) {
    const { page, limit, offset } = pageOptions(query); const where: any = {};
    if (scope.publicOnly) where.status = 'APPROVED';
    if (scope.businessIds) where.businessId = { [Op.in]: scope.businessIds };
    if (scope.authorId) where.authorId = scope.authorId;
    if (query.status) where.status = query.status;
    if (query.search) where[Op.or] = [{ title: searchLike(query.search) }, { excerpt: searchLike(query.search) }, { destinationName: searchLike(query.search) }];
    if (query.tag) where.tags = { [Op.contains]: [query.tag] };
    const result = await BlogPost.findAndCountAll({ where, include: [{ model: Business, as: 'business', attributes: ['id','name','type'], required: false }], order: [['createdAt','DESC']], limit, offset, distinct: true });
    return paged(result.rows, result.count, page, limit);
  }
  static find(value: string, publicOnly = false) { return BlogPost.findOne({ where: { ...idOrSlug(value), ...(publicOnly ? { status: 'APPROVED' } : {}) } }); }
}
