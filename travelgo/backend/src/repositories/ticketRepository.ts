import { Op } from 'sequelize';
import { Business, Ticket } from '../models/index.js';
import { PageQuery, pageOptions, paged, searchLike } from './query.js';

export interface TicketListQuery extends PageQuery { type?: string; fromCity?: string; toCity?: string; maxPrice?: number; }
export class TicketRepository {
  static async list(query: TicketListQuery, scope: { publicOnly?: boolean; businessIds?: string[] } = {}) {
    const { page, limit, offset } = pageOptions(query); const where: any = {};
    if (scope.publicOnly) { where.status = 'ACTIVE'; where.availableSeats = { [Op.gt]: 0 }; }
    if (scope.businessIds) where.businessId = { [Op.in]: scope.businessIds };
    if (query.status) where.status = query.status;
    if (query.type && query.type !== 'all') where.type = query.type;
    if (query.fromCity && query.fromCity !== 'all') where.departureCity = searchLike(query.fromCity);
    if (query.toCity && query.toCity !== 'all') where.arrivalCity = searchLike(query.toCity);
    if (query.maxPrice) where.price = { [Op.lte]: query.maxPrice };
    if (query.search) where.title = searchLike(query.search);
    const result = await Ticket.findAndCountAll({ where, include: [{ model: Business, as: 'business', attributes: ['id','name','type'] }], order: [['departureTime','ASC']], limit, offset, distinct: true });
    return paged(result.rows, result.count, page, limit);
  }
  static find(id: string, publicOnly = false) { return Ticket.findOne({ where: { id, ...(publicOnly ? { status: 'ACTIVE', availableSeats: { [Op.gt]: 0 } } : {}) }, include: [{ model: Business, as: 'business', attributes: ['id','name','type'] }] }); }
}
