import { TripSession } from '../models/TripSession.js';
export class TripRepository {
  static listByUser(userId: string) { return TripSession.findAll({ where: { userId }, order: [['createdAt','DESC']] }); }
  static findOwned(id: string, userId: string) { return TripSession.findOne({ where: { id, userId } }); }
}
