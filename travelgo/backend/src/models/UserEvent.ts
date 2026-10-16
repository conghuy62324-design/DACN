import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';

export const AI_ITEM_TYPES = ['place', 'hotel', 'restaurant', 'tour', 'ticket', 'blog', 'booking', 'trip'] as const;
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
  contractVersion: '1.0';
  clientEventId?: string;
  sessionId: string;
  requestId?: string;
  itemId: string;
  itemType: AiItemType;
  eventType: AiEventType;
  source: string;
  environment: 'production' | 'development' | 'test';
  uiSurface: string;
  origin: 'CLIENT' | 'SERVER' | 'LEGACY';
  personalizationAllowed: boolean;
  context: Record<string, unknown>;
  occurredAt: Date;
  expiresAt?: Date;
  createdAt?: Date;
}

type UserEventCreationAttributes = Optional<UserEventAttributes, 'id' | 'userId' | 'clientEventId' | 'requestId' | 'source' | 'context' | 'occurredAt' | 'expiresAt'>;

export class UserEvent extends Model<UserEventAttributes, UserEventCreationAttributes> implements UserEventAttributes {
  public id!: string;
  public userId?: string;
  public contractVersion!: '1.0';
  public clientEventId?: string;
  public sessionId!: string;
  public requestId?: string;
  public itemId!: string;
  public itemType!: AiItemType;
  public eventType!: AiEventType;
  public source!: string;
  public environment!: 'production' | 'development' | 'test';
  public uiSurface!: string;
  public origin!: 'CLIENT' | 'SERVER' | 'LEGACY';
  public personalizationAllowed!: boolean;
  public context!: Record<string, unknown>;
  public occurredAt!: Date;
  public expiresAt?: Date;
  public readonly createdAt!: Date;
}

UserEvent.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: true },
  contractVersion: { type: DataTypes.STRING(10), allowNull: false, defaultValue: '1.0' },
  clientEventId: { type: DataTypes.UUID, allowNull: true },
  sessionId: { type: DataTypes.STRING(120), allowNull: false },
  requestId: { type: DataTypes.UUID, allowNull: true },
  itemId: { type: DataTypes.STRING(120), allowNull: false },
  itemType: { type: DataTypes.STRING(30), allowNull: false },
  eventType: { type: DataTypes.STRING(40), allowNull: false },
  source: { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'organic' },
  environment: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'development' },
  uiSurface: { type: DataTypes.STRING(60), allowNull: false, defaultValue: 'legacy' },
  origin: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'LEGACY' },
  personalizationAllowed: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  context: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  occurredAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  expiresAt: { type: DataTypes.DATE, allowNull: true },
}, { sequelize, tableName: 'user_events', timestamps: true, updatedAt: false, underscored: true });
