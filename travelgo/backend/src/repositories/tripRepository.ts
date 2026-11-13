import { TripSession } from '../models/TripSession.js';
import type { Transaction } from 'sequelize';
export class TripRepository {
  static listByUser(userId: string) { return TripSession.findAll({ where: { userId }, order: [['createdAt','DESC']] }); }
  static findOwned(id: string, userId: string, transaction?: Transaction) {
    return TripSession.findOne({ where: { id, userId }, transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) });
  }
}
