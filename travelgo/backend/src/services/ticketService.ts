import { Ticket } from '../models/index.js';
import { TicketListQuery, TicketRepository } from '../repositories/ticketRepository.js';
import { HttpError } from '../utils/httpError.js';
import { BusinessAccessService } from './businessAccessService.js';

export interface TicketInput {
  title: string;
  type: 'flight' | 'bus' | 'train' | 'tour' | 'sightseeing';
  operator: string;
  departureCity: string;
  arrivalCity: string;
  departureTime: string | Date;
  arrivalTime?: string | Date;
  duration?: string;
  price: number;
  originalPrice?: number;
  capacity: number;
  features?: string[];
  imageUrl?: string;
  placeId?: string;
  tourId?: string;
  validFrom?: string | Date;
  validUntil?: string | Date;
  status?: 'ACTIVE' | 'INACTIVE';
}

const serialize = (model: any) => {
  const value = model.toJSON ? model.toJSON() : model;
  return {
    ...value,
    price: Number(value.price || 0),
    originalPrice: value.originalPrice ? Number(value.originalPrice) : undefined,
  };
};

export class TicketService {
  static async getAllTickets(query: TicketListQuery = {}) {
    const result = await TicketRepository.list({ ...query, page: query.page || 1, limit: query.limit || 100 }, { publicOnly: true });
    return result.items.map(serialize);
  }

  static async listPublic(query: TicketListQuery = {}) {
    const result = await TicketRepository.list(query, { publicOnly: true });
    return { ...result, items: result.items.map(serialize) };
  }

  static async getTicketById(id: string) {
    const ticket = await TicketRepository.find(id, true);
    return ticket ? serialize(ticket) : null;
  }

  static async partnerList(userId: string, query: TicketListQuery = {}) {
    const ids = await BusinessAccessService.businessIds(userId);
    const result = await TicketRepository.list(query, { businessIds: ids });
    return { ...result, items: result.items.map(serialize) };
  }

  static async getManaged(userId: string, id: string) {
    const ticket = await Ticket.findByPk(id);
    if (!ticket?.businessId) throw new HttpError(404, 'Không tìm thấy vé');
    await BusinessAccessService.assert(userId, ticket.businessId);
    return serialize(ticket);
  }

  static async createForPartner(userId: string, businessId: string, input: TicketInput) {
    await BusinessAccessService.assert(userId, businessId, 'MANAGE_BUSINESS');
    const capacity = Math.max(0, Number(input.capacity));
    return serialize(await Ticket.create({
      ...input,
      businessId,
      departureTime: new Date(input.departureTime),
      arrivalTime: input.arrivalTime ? new Date(input.arrivalTime) : undefined,
      validFrom: input.validFrom ? new Date(input.validFrom) : undefined,
      validUntil: input.validUntil ? new Date(input.validUntil) : undefined,
      capacity,
      availableSeats: capacity,
      features: input.features || [],
      status: input.status || 'ACTIVE',
    }));
  }

  static async updateForPartner(userId: string, id: string, input: Partial<TicketInput>) {
    const ticket = await Ticket.findByPk(id);
    if (!ticket?.businessId) throw new HttpError(404, 'Không tìm thấy vé');
    await BusinessAccessService.assert(userId, ticket.businessId, 'MANAGE_BUSINESS');
    const values: any = { ...input };
    for (const key of ['departureTime', 'arrivalTime', 'validFrom', 'validUntil'] as const) {
      if (input[key] !== undefined) values[key] = input[key] ? new Date(input[key] as string | Date) : null;
    }
    if (input.capacity !== undefined) {
      const sold = ticket.capacity - ticket.availableSeats;
      values.capacity = input.capacity;
      values.availableSeats = Math.max(0, input.capacity - sold);
    }
    await ticket.update(values);
    return serialize(ticket);
  }

  static async archiveForPartner(userId: string, id: string) {
    const ticket = await Ticket.findByPk(id);
    if (!ticket?.businessId) throw new HttpError(404, 'Không tìm thấy vé');
    await BusinessAccessService.assert(userId, ticket.businessId, 'MANAGE_BUSINESS');
    await ticket.update({ status: 'INACTIVE' });
    return serialize(ticket);
  }
}
