import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

interface BookingStatusHistoryAttributes { id: string; bookingId: string; oldStatus?: string; newStatus: string; actorUserId?: string; reason?: string; createdAt?: Date; }
type CreationAttributes = Optional<BookingStatusHistoryAttributes, 'id' | 'oldStatus' | 'actorUserId' | 'reason'>;
export class BookingStatusHistory extends Model<BookingStatusHistoryAttributes, CreationAttributes> implements BookingStatusHistoryAttributes {
  public id!: string; public bookingId!: string; public oldStatus?: string; public newStatus!: string; public actorUserId?: string; public reason?: string; public readonly createdAt!: Date;
}
BookingStatusHistory.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true }, bookingId: { type: DataTypes.UUID, allowNull: false },
  oldStatus: { type: DataTypes.STRING(30), allowNull: true }, newStatus: { type: DataTypes.STRING(30), allowNull: false },
  actorUserId: { type: DataTypes.UUID, allowNull: true }, reason: { type: DataTypes.TEXT, allowNull: true },
}, { sequelize, tableName: 'booking_status_history', timestamps: true, updatedAt: false, underscored: true });
