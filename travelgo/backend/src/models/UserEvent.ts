import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AI_ITEM_TYPES = ['place', 'hotel', 'restaurant', 'tour', 'ticket', 'blog'] as const;
export const AI_EVENT_TYPES = [
  'SEARCH', 'VIEW', 'CLICK', 'FAVORITE', 'UNFAVORITE', 'ADD_TO_TRIP', 'REMOVE_FROM_TRIP',
  'BOOKING_CREATED', 'BOOKING_CONFIRMED', 'BOOKING_COMPLETED', 'BOOKING_CANCELLED',
  'REVIEW_CREATED', 'MAP_OPENED', 'ROUTE_VIEWED',
] as const;

export type AiItemType = typeof AI_ITEM_TYPES[number];
export type AiEventType = typeof AI_EVENT_TYPES[number];

interface UserEventAttributes {
  id: string;
  userId?: string;
  sessionId: string;
  requestId?: string;
  itemId: string;
  itemType: AiItemType;
  eventType: AiEventType;
  source: string;
  context: Record<string, unknown>;
  occurredAt: Date;
  createdAt?: Date;
}

type UserEventCreationAttributes = Optional<UserEventAttributes, 'id' | 'userId' | 'requestId' | 'source' | 'context' | 'occurredAt'>;

export class UserEvent extends Model<UserEventAttributes, UserEventCreationAttributes> implements UserEventAttributes {
  public id!: string;
  public userId?: string;
  public sessionId!: string;
  public requestId?: string;
  public itemId!: string;
  public itemType!: AiItemType;
  public eventType!: AiEventType;
  public source!: string;
  public context!: Record<string, unknown>;
  public occurredAt!: Date;
  public readonly createdAt!: Date;
}

UserEvent.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  sessionId: { type: DataTypes.STRING(120), allowNull: false },
  requestId: { type: DataTypes.UUID, allowNull: true },
  itemId: { type: DataTypes.STRING(120), allowNull: false },
  itemType: { type: DataTypes.STRING(30), allowNull: false },
  eventType: { type: DataTypes.STRING(40), allowNull: false },
  source: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'organic' },
  context: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, { sequelize, tableName: 'user_events', timestamps: true, updatedAt: false, underscored: true });
