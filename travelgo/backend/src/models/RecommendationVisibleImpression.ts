import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AiItemType } from './UserEvent.js';

export interface RecommendationVisibleImpressionAttributes {
  id: string;
  clientAckId: string;
  requestId: string;
  candidateId: string;
  userId: string;
  sessionId: string;
  itemId: string;
  itemType: Exclude<AiItemType, 'booking' | 'trip'>;
  uiSurface: string;
  visibilityRuleVersion: string;
  visibleRatio: number;
  dwellMs: number;
  visibleAt: Date;
  acknowledgedAt?: Date;
  environment: 'production' | 'development' | 'test';
  personalizationAllowed: boolean;
  expiresAt: Date;
}

type RecommendationVisibleImpressionCreationAttributes = Optional<RecommendationVisibleImpressionAttributes, 'id' | 'acknowledgedAt'>;

export class RecommendationVisibleImpression extends Model<RecommendationVisibleImpressionAttributes, RecommendationVisibleImpressionCreationAttributes>
  implements RecommendationVisibleImpressionAttributes {
  public id!: string;
  public clientAckId!: string;
  public requestId!: string;
  public candidateId!: string;
  public userId!: string;
  public sessionId!: string;
  public itemId!: string;
  public itemType!: Exclude<AiItemType, 'booking' | 'trip'>;
  public uiSurface!: string;
  public visibilityRuleVersion!: string;
  public visibleRatio!: number;
  public dwellMs!: number;
  public visibleAt!: Date;
  public readonly acknowledgedAt!: Date;
  public environment!: 'production' | 'development' | 'test';
  public personalizationAllowed!: boolean;
  public expiresAt!: Date;
}

RecommendationVisibleImpression.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  clientAckId: { type: DataTypes.UUID, allowNull: false },
  requestId: { type: DataTypes.UUID, allowNull: false },
  candidateId: { type: DataTypes.UUID, allowNull: false },
  userId: { type: DataTypes.UUID, allowNull: false },
  sessionId: { type: DataTypes.STRING(120), allowNull: false },
  itemId: { type: DataTypes.STRING(120), allowNull: false },
  itemType: { type: DataTypes.STRING(30), allowNull: false },
  uiSurface: { type: DataTypes.STRING(60), allowNull: false },
  visibilityRuleVersion: { type: DataTypes.STRING(80), allowNull: false },
  visibleRatio: { type: DataTypes.DECIMAL(4, 3), allowNull: false },
  dwellMs: { type: DataTypes.INTEGER, allowNull: false },
  visibleAt: { type: DataTypes.DATE, allowNull: false },
  acknowledgedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  environment: { type: DataTypes.STRING(20), allowNull: false },
  personalizationAllowed: { type: DataTypes.BOOLEAN, allowNull: false },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
}, { sequelize, tableName: 'recommendation_visible_impressions', timestamps: true, createdAt: 'acknowledgedAt', updatedAt: false, underscored: true });

