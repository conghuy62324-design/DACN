import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AiItemType } from './UserEvent.js';

interface RecommendationImpressionAttributes {
  id: string;
  requestId: string;
  userId?: string;
  sessionId: string;
  itemId: string;
  itemType: AiItemType;
  rankPosition: number;
  score: number;
  scoreBreakdown: Record<string, number>;
  reason?: string;
  modelVersion: string;
  context: Record<string, unknown>;
  createdAt?: Date;
}

type RecommendationImpressionCreationAttributes = Optional<RecommendationImpressionAttributes, 'id' | 'userId' | 'reason' | 'scoreBreakdown' | 'context'>;

export class RecommendationImpression extends Model<RecommendationImpressionAttributes, RecommendationImpressionCreationAttributes> implements RecommendationImpressionAttributes {
  public id!: string;
  public requestId!: string;
  public userId?: string;
  public sessionId!: string;
  public itemId!: string;
  public itemType!: AiItemType;
  public rankPosition!: number;
  public score!: number;
  public scoreBreakdown!: Record<string, number>;
  public reason?: string;
  public modelVersion!: string;
  public context!: Record<string, unknown>;
  public readonly createdAt!: Date;
}

RecommendationImpression.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  requestId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: true },
  sessionId: { type: DataTypes.STRING(120), allowNull: false },
  itemId: { type: DataTypes.STRING(120), allowNull: false },
  itemType: { type: DataTypes.STRING(30), allowNull: false },
  rankPosition: { type: DataTypes.INTEGER, allowNull: false },
  score: { type: DataTypes.DECIMAL(6, 5), allowNull: false },
  scoreBreakdown: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
  reason: { type: DataTypes.TEXT, allowNull: true },
  modelVersion: { type: DataTypes.STRING(100), allowNull: false },
  context: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
}, { sequelize, tableName: 'recommendation_impressions', timestamps: true, updatedAt: false, underscored: true });
