import { MOCK_TICKETS } from '../utils/mockData.js';

let ticketsDb = [...MOCK_TICKETS];

export class TicketService {
  public static async getAllTickets(params?: {
    type?: string;
    fromCity?: string;
    toCity?: string;
    maxPrice?: number;
  }) {
    let result = [...ticketsDb];

    if (params?.type && params.type !== 'all') {
      result = result.filter((t) => t.type === params.type);
    }
    if (params?.fromCity && params.fromCity !== 'all') {
      result = result.filter((t) => t.departureCity.toLowerCase().includes(params.fromCity!.toLowerCase()));
    }
    if (params?.toCity && params.toCity !== 'all') {
      result = result.filter((t) => t.arrivalCity.toLowerCase().includes(params.toCity!.toLowerCase()));
    }
    if (params?.maxPrice) {
      result = result.filter((t) => t.price <= params.maxPrice!);
    }

    return result;
  }

  public static async getTicketById(id: string) {
    return ticketsDb.find((t) => t.id === id) || null;
  }
}
